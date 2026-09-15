"""adapters.py — SQLModel rows <-> hemogrid_model dataclasses.

The only place a blood-group format conversion happens: rows store the
"O+"-style values seed.py writes; hemogrid_model (enums.py) uses "O_POS"-style
values. Model output is already in "O_POS"-style, which the frontend's own
types also expect, so no reverse mapping is needed on the way out.
"""

from datetime import date

from sqlmodel import Session, select

from api.models import Consumption, Facility, Lot, Policy, Route
from hemogrid_model.types import FacilityIn, LotIn, NetworkSnapshot, PolicyIn, RouteIn, UsageIn

_DB_TO_MODEL_GROUP = {
    "O+": "O_POS", "O-": "O_NEG",
    "A+": "A_POS", "A-": "A_NEG",
    "B+": "B_POS", "B-": "B_NEG",
    "AB+": "AB_POS", "AB-": "AB_NEG",
}


def _facility_to_in(row: Facility) -> FacilityIn:
    return FacilityIn(
        facility_id=row.id, code=row.code, name=row.name,
        tier=row.tier, lat=row.lat, lng=row.lng,
    )


def _lot_to_in(row: Lot) -> LotIn:
    return LotIn(
        lot_id=row.id,
        trace_id=row.trace_id,
        facility_id=row.facility_id,
        blood_group=_DB_TO_MODEL_GROUP[row.blood_group],
        component=row.component,
        units=row.units,
        collected_at=row.collected_at,
        expires_at=row.expires_at,
        storage_status=row.storage_status,
    )


def _consumption_to_in(row: Consumption) -> UsageIn:
    return UsageIn(
        facility_id=row.facility_id,
        date=row.date,
        blood_group=_DB_TO_MODEL_GROUP[row.blood_group],
        component=row.component,
        units=row.units,
        kind=row.kind,
    )


def _route_to_in(row: Route) -> RouteIn:
    return RouteIn(
        from_id=row.from_id, to_id=row.to_id,
        transit_hours=row.transit_hours, cold_chain_capable=row.cold_chain_capable,
    )


def _policy_to_in(row: Policy) -> PolicyIn:
    return PolicyIn(
        component=row.component,
        shelf_life_days=row.shelf_life_days,
        window_open_days=row.window_open_days,
        window_close_days=row.window_close_days,
        forecast_horizon=row.forecast_horizon,
        reserve_days=row.reserve_days,
    )


def load_snapshot(session: Session, as_of: date) -> NetworkSnapshot:
    """Reads every table and assembles the model's input snapshot."""
    facilities = [_facility_to_in(r) for r in session.exec(select(Facility)).all()]
    lots = [_lot_to_in(r) for r in session.exec(select(Lot)).all()]
    usage = [_consumption_to_in(r) for r in session.exec(select(Consumption)).all()]
    routes = [_route_to_in(r) for r in session.exec(select(Route)).all()]
    policies = [_policy_to_in(r) for r in session.exec(select(Policy)).all()]

    return NetworkSnapshot(
        as_of=as_of, facilities=facilities, lots=lots,
        usage=usage, routes=routes, policies=policies,
    )
