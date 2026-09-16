"""service.py — snapshot loading, pipeline invocation, caching, persistence.

Per Backend.md §10: the only place pipeline results get turned into
API-shaped data, and the only place Recommendation rows are written.
Caching is a plain dict keyed by an integer version bumped by invalidate().
"""

import os
import uuid
from dataclasses import asdict
from datetime import date, datetime, timezone

from dotenv import load_dotenv
from sqlalchemy import func
from sqlmodel import Session, select

from api import adapters
from api.models import Facility, Lot, Recommendation, Review
from api.routes.health import AS_OF
from hemogrid_model.pipeline import run_pipeline
from hemogrid_model.types import PipelineResult

load_dotenv()

MATCHER = os.environ.get("MATCHER", "greedy")
FORECASTER = os.environ.get("FORECASTER", "ewma")

_TIER_RANK = {"STABLE": 0, "WATCH": 1, "HIGH": 2, "CRITICAL": 3}
_WINDOW_STATES = ("NORMAL", "WATCH", "RESCUE_WINDOW", "UNRESCUABLE")
_ACTION_TO_STATUS = {
    "OPENED": "UNDER_REVIEW",
    "APPROVED": "APPROVED",
    "REJECTED": "REJECTED",
    "CLOSED": "CLOSED",
}

_cache: dict[int, PipelineResult] = {}
_version = 0


def invalidate() -> None:
    """Bumps the data version, forcing the next get_pipeline() to recompute."""
    global _version
    _version += 1
    _cache.clear()


def load_snapshot(session: Session):
    return adapters.load_snapshot(session, AS_OF)


def get_pipeline(session: Session) -> PipelineResult:
    if _version not in _cache:
        snapshot = load_snapshot(session)
        result = run_pipeline(snapshot, matcher=MATCHER, forecaster=FORECASTER)
        _sync_recommendations(session, result)
        _cache[_version] = result
    return _cache[_version]


def _sync_recommendations(session: Session, result: PipelineResult) -> None:
    """Upserts Recommendation rows so they carry stable IDs across recomputes.
    Rows that no longer appear are closed, never deleted (Backend.md §10)."""
    existing = {
        (r.source_lot_id, r.dest_facility_id, r.blood_group, r.component): r
        for r in session.exec(select(Recommendation)).all()
    }
    seen_keys = set()
    next_seq = len(existing) + 1
    now = datetime.now(timezone.utc)

    for rec in result.recommendations:
        key = (rec.source_lot_id, rec.dest_facility_id, rec.blood_group, rec.component)
        seen_keys.add(key)
        row = existing.get(key)
        factors = asdict(rec.factors)
        explanation = asdict(rec.explanation)
        checks = [asdict(c) for c in rec.checks]

        if row is None:
            row = Recommendation(
                id=f"REC-{next_seq:05d}",
                status="GENERATED",
                source_lot_id=rec.source_lot_id,
                source_facility_id=rec.source_facility_id,
                dest_facility_id=rec.dest_facility_id,
                blood_group=rec.blood_group,
                component=rec.component,
                units=rec.units,
                rescue_score=rec.rescue_score,
                transit_hours=rec.transit_hours,
                factors=factors,
                explanation=explanation,
                checks=checks,
                created_at=now,
            )
            next_seq += 1
        else:
            row.units = rec.units
            row.rescue_score = rec.rescue_score
            row.transit_hours = rec.transit_hours
            row.factors = factors
            row.explanation = explanation
            row.checks = checks
            if row.status == "CLOSED":
                row.status = "GENERATED"
                row.withdrawn_reason = None
        session.add(row)

    for key, row in existing.items():
        if key not in seen_keys and row.status != "CLOSED":
            row.status = "CLOSED"
            row.withdrawn_reason = "no longer recommended"
            session.add(row)

    session.commit()


def facility_names(session: Session) -> dict[str, str]:
    return {f.id: f.name for f in session.exec(select(Facility)).all()}


def _forecasts_by_line(result: PipelineResult) -> dict[tuple[str, str, str], object]:
    return {(f.facility_id, f.blood_group, f.component): f for f in result.forecasts}


def recommendation_item(row: Recommendation, names: dict[str, str]) -> dict:
    return {
        "id": row.id,
        "status": row.status,
        "source_lot_id": row.source_lot_id,
        "source_facility_id": row.source_facility_id,
        "source_facility_name": names.get(row.source_facility_id, row.source_facility_id),
        "dest_facility_id": row.dest_facility_id,
        "dest_facility_name": names.get(row.dest_facility_id, row.dest_facility_id),
        "blood_group": row.blood_group,
        "component": row.component,
        "units": row.units,
        "rescue_score": row.rescue_score,
        "transit_hours": row.transit_hours,
        "factors": row.factors,
        "explanation": row.explanation,
        "checks": row.checks,
        "created_at": row.created_at.isoformat(),
    }


def _exclusion_item(exc, names: dict[str, str]) -> dict:
    return {
        "source_lot_id": exc.source_lot_id,
        "source_facility_id": exc.source_facility_id,
        "source_facility_name": names.get(exc.source_facility_id, exc.source_facility_id),
        "dest_facility_id": exc.dest_facility_id,
        "dest_facility_name": names.get(exc.dest_facility_id, exc.dest_facility_id),
        "blood_group": exc.blood_group,
        "component": exc.component,
        "failed_codes": exc.failed_codes,
        "checks": [asdict(c) for c in exc.checks],
    }


def recommendations_and_exclusions(session: Session, result: PipelineResult) -> tuple[list[dict], list[dict]]:
    names = facility_names(session)
    rows = session.exec(select(Recommendation).order_by(Recommendation.rescue_score.desc())).all()
    recommendations = [recommendation_item(r, names) for r in rows]
    exclusions = [_exclusion_item(e, names) for e in result.exclusions]
    return recommendations, exclusions


def get_recommendation(session: Session, recommendation_id: str) -> Recommendation | None:
    return session.get(Recommendation, recommendation_id)


def reviews_for(session: Session, recommendation_id: str) -> list[dict]:
    rows = session.exec(
        select(Review).where(Review.recommendation_id == recommendation_id).order_by(Review.at)
    ).all()
    return [
        {"actor": r.actor, "action": r.action, "note": r.note, "at": r.at.isoformat()}
        for r in rows
    ]


def apply_review(
    session: Session, recommendation_id: str, actor: str, action: str, note: str | None
) -> Recommendation | None:
    if action not in _ACTION_TO_STATUS:
        raise ValueError(f"unknown review action: {action!r}")

    row = session.get(Recommendation, recommendation_id)
    if row is None:
        return None

    review = Review(
        id=f"REV-{uuid.uuid4().hex[:12]}",
        recommendation_id=recommendation_id,
        actor=actor,
        action=action,
        note=note,
        at=datetime.now(timezone.utc),
    )
    session.add(review)
    row.status = _ACTION_TO_STATUS[action]
    session.add(row)
    session.commit()
    return row


def _shortage_item(shortage, names: dict[str, str], forecasts_by_line: dict) -> dict:
    fc = forecasts_by_line[(shortage.facility_id, shortage.blood_group, shortage.component)]
    return {
        "facility_id": shortage.facility_id,
        "facility_name": names.get(shortage.facility_id, shortage.facility_id),
        "blood_group": shortage.blood_group,
        "component": shortage.component,
        "horizon_days": shortage.horizon_days,
        "usable_units": shortage.usable_units,
        "forecast_demand": shortage.forecast_demand,
        "reserve_units": shortage.reserve_units,
        "gap_units": shortage.gap_units,
        "shortage_risk": shortage.shortage_risk,
        "tier": shortage.tier,
        "confidence": fc.confidence,
    }


def shortages(session: Session, result: PipelineResult) -> list[dict]:
    names = facility_names(session)
    forecasts_by_line = _forecasts_by_line(result)
    return [_shortage_item(s, names, forecasts_by_line) for s in result.shortages]


def _expiry_lot_item(lot_risk, names: dict[str, str], lot_rows: dict[str, Lot]) -> dict:
    lot_row = lot_rows[lot_risk.lot_id]
    return {
        "lot_id": lot_risk.lot_id,
        "facility_id": lot_risk.facility_id,
        "facility_name": names.get(lot_risk.facility_id, lot_risk.facility_id),
        "blood_group": lot_risk.blood_group,
        "component": lot_risk.component,
        "units": lot_risk.units,
        "at_risk_units": lot_risk.at_risk_units,
        "days_to_expiry": lot_risk.days_to_expiry,
        "window_state": lot_risk.window_state,
        "storage_status": lot_row.storage_status,
        "trace_id": lot_row.trace_id,
    }


def expiry(session: Session, result: PipelineResult) -> tuple[list[dict], dict[str, int]]:
    names = facility_names(session)
    lot_rows = {row.id: row for row in session.exec(select(Lot)).all()}
    lots = [_expiry_lot_item(lr, names, lot_rows) for lr in result.lot_risks]
    by_state = {state: 0 for state in _WINDOW_STATES}
    for lr in result.lot_risks:
        by_state[lr.window_state] += 1
    return lots, by_state


def network_summary(result: PipelineResult) -> dict:
    by_component: dict[str, dict] = {}
    by_group: dict[str, dict] = {}
    for lr in result.lot_risks:
        c = by_component.setdefault(lr.component, {"component": lr.component, "units": 0, "at_risk_units": 0})
        c["units"] += lr.units
        c["at_risk_units"] += lr.at_risk_units

        g = by_group.setdefault(lr.blood_group, {"blood_group": lr.blood_group, "units": 0, "at_risk_units": 0})
        g["units"] += lr.units
        g["at_risk_units"] += lr.at_risk_units

    return {
        "as_of": result.as_of.isoformat(),
        **result.summary,
        "by_component": sorted(by_component.values(), key=lambda x: x["component"]),
        "by_group": sorted(by_group.values(), key=lambda x: x["blood_group"]),
    }


def _facility_aggregates(result: PipelineResult) -> tuple[dict, dict, dict, dict]:
    total_units: dict[str, int] = {}
    at_risk: dict[str, int] = {}
    for lr in result.lot_risks:
        total_units[lr.facility_id] = total_units.get(lr.facility_id, 0) + lr.units
        at_risk[lr.facility_id] = at_risk.get(lr.facility_id, 0) + lr.at_risk_units

    gap: dict[str, int] = {}
    worst_tier: dict[str, str] = {}
    for s in result.shortages:
        gap[s.facility_id] = gap.get(s.facility_id, 0) + s.gap_units
        current = worst_tier.get(s.facility_id, "STABLE")
        if _TIER_RANK[s.tier] > _TIER_RANK[current]:
            worst_tier[s.facility_id] = s.tier

    return total_units, at_risk, gap, worst_tier


def facility_summaries(session: Session, result: PipelineResult) -> list[dict]:
    facilities = session.exec(select(Facility)).all()
    total_units, at_risk, gap, worst_tier = _facility_aggregates(result)

    return [
        {
            "facility_id": f.id,
            "code": f.code,
            "name": f.name,
            "tier": f.tier,
            "lat": f.lat,
            "lng": f.lng,
            "total_units": total_units.get(f.id, 0),
            "at_risk_units": at_risk.get(f.id, 0),
            "gap_units": gap.get(f.id, 0),
            "worst_tier": worst_tier.get(f.id, "STABLE"),
        }
        for f in facilities
    ]


def facility_detail(session: Session, result: PipelineResult, facility_id: str) -> dict | None:
    facility_row = session.get(Facility, facility_id)
    if facility_row is None:
        return None

    summary = next(
        (s for s in facility_summaries(session, result) if s["facility_id"] == facility_id), None
    )

    names = facility_names(session)
    lot_risks_by_id = {lr.lot_id: lr for lr in result.lot_risks if lr.facility_id == facility_id}
    lot_rows = session.exec(select(Lot).where(Lot.facility_id == facility_id)).all()

    lots = []
    for lot in lot_rows:
        lr = lot_risks_by_id[lot.id]
        lots.append({
            "lot_id": lot.id,
            "trace_id": lot.trace_id,
            "blood_group": lr.blood_group,
            "component": lr.component,
            "units": lot.units,
            "collected_at": lot.collected_at.isoformat(),
            "expires_at": lot.expires_at.isoformat(),
            "storage_status": lot.storage_status,
            "days_to_expiry": lr.days_to_expiry,
            "at_risk_units": lr.at_risk_units,
            "window_state": lr.window_state,
        })

    forecasts_by_line = _forecasts_by_line(result)
    facility_shortages = [
        _shortage_item(s, names, forecasts_by_line) for s in result.shortages if s.facility_id == facility_id
    ]

    return {"facility": summary, "lots": lots, "shortages": facility_shortages}


def create_lot(
    session: Session,
    facility_id: str,
    blood_group: str,
    component: str,
    units: int,
    collected_at: date,
    expires_at: date,
    storage_status: str,
) -> dict | None:
    """Inserts a new Lot row and bumps the pipeline cache version so the next
    read picks it up. Returns None if facility_id doesn't exist (404 in the
    route); raises ValueError on a bad date order (400 in the route)."""
    facility = session.get(Facility, facility_id)
    if facility is None:
        return None

    if expires_at <= collected_at:
        raise ValueError("expires_at must be after collected_at")

    next_seq = session.exec(select(func.count()).select_from(Lot)).one() + 1
    lot_id = f"LOT-{next_seq:05d}"
    trace_id = f"TRC-{facility_id}-{next_seq:05d}"

    row = Lot(
        id=lot_id,
        trace_id=trace_id,
        facility_id=facility_id,
        blood_group=adapters.MODEL_TO_DB_GROUP[blood_group],
        component=component,
        units=units,
        collected_at=collected_at,
        expires_at=expires_at,
        storage_status=storage_status,
    )
    session.add(row)
    session.commit()
    invalidate()

    return {
        "lot_id": lot_id,
        "trace_id": trace_id,
        "facility_id": facility_id,
        "facility_name": facility.name,
        "blood_group": blood_group,
        "component": component,
        "units": units,
        "collected_at": collected_at.isoformat(),
        "expires_at": expires_at.isoformat(),
        "storage_status": storage_status,
        "days_to_expiry": (expires_at - AS_OF).days,
    }
