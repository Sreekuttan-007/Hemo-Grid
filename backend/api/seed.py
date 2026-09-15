"""Deterministic demo-data generator. See Backend.md §9.

Seed data is a demo asset, not test fixtures and not real clinical data. It uses
random.Random(42) exclusively (never the global `random` module) and a fixed
AS_OF date (never date.today()) so that `python -m api.seed` is idempotent:
truncate every table, then insert, and the row counts and planted scenario are
identical on every run.

This module writes only raw rows to Facility / Lot / Consumption / Route /
Policy (and clears Recommendation / Review, which are owned by api.service).
It never computes a window state, an at-risk aggregate, a forecast, or a gap —
those are hemogrid_model's job (Backend.md §2). Where this generator needs to
land lot expiries across a spread of near/far dates, it uses the *published*
Policy thresholds only to pick date ranges for synthetic data, never to label
or count a row's risk state.
"""

import math
import random
import time
from datetime import date, timedelta

from sqlalchemy import delete, func, insert, select
from sqlmodel import Session

from api.db import create_all, engine
from api.models import Consumption, Facility, Lot, Policy, Recommendation, Review, Route

AS_OF = date(2026, 3, 1)

FACILITIES = [
    # id,      code,        name,                                  tier,             lat,      lng
    ("FAC01", "MUM-RC",  "Mumbai Regional Blood Centre",            "REGIONAL_CENTRE", 19.0760, 72.8777),
    ("FAC02", "PUN-HOS", "Pune City Hospital",                      "HOSPITAL",         18.5204, 73.8567),
    ("FAC03", "NAG-HOS", "Nagpur General Hospital",                 "HOSPITAL",         21.1458, 79.0882),
    ("FAC04", "NAS-HOS", "Nashik Civil Hospital",                   "HOSPITAL",         19.9975, 73.7898),
    ("FAC05", "SAM-HOS", "Chhatrapati Sambhajinagar Hospital",      "HOSPITAL",         19.8762, 75.3433),
    ("FAC06", "SAT-DIS", "Satara District Health Unit",             "DISTRICT",         17.6805, 74.0183),
]
FACILITY_LOT_TARGET = {
    "FAC01": 100,
    "FAC02": 54,
    "FAC03": 54,
    "FAC04": 54,
    "FAC05": 54,
    "FAC06": 62,
}

# The planted scenario (Backend.md §9): Facility A holds ~12 at-risk O+ RBC
# units; Facility B has a supply/demand imbalance in O+ RBC. Dates and supply
# mix are tuned below so the story emerges from generated data, never from a
# hard-coded rank or a special-cased lot.
PLANTED_SOURCE_ID = "FAC02"   # Facility A
PLANTED_DEST_ID = "FAC03"     # Facility B

NO_COLD_CHAIN_LANE = ("FAC06", "FAC02")  # deliberately fails gate G6

COMPONENTS = ["RBC", "PLATELETS", "PLASMA"]
COMPONENT_WEIGHTS = {"RBC": 0.55, "PLATELETS": 0.20, "PLASMA": 0.25}

BLOOD_GROUPS = ["O+", "A+", "B+", "AB+", "O-", "A-", "B-", "AB-"]
BLOOD_GROUP_WEIGHTS = {
    "O+": 0.35, "A+": 0.29, "B+": 0.19, "AB+": 0.04,
    "O-": 0.07, "A-": 0.05, "B-": 0.015, "AB-": 0.005,
}

TIER_CONSUMPTION_FACTOR = {"REGIONAL_CENTRE": 3.0, "HOSPITAL": 1.6, "DISTRICT": 0.7}
COMPONENT_CONSUMPTION_FACTOR = {"RBC": 1.0, "PLATELETS": 0.35, "PLASMA": 0.5}
CONSUMPTION_DAYS = 90
CONSUMPTION_SCALE = 6.0

EMERGENCY_SPIKE_DAY = 62         # index into the 90-day history, per §9
EMERGENCY_SPIKE_SPAN = 3
EMERGENCY_SPIKE_COMBOS = [
    ("FAC01", "O+", "RBC"),
    ("FAC03", "O+", "RBC"),   # reinforces Facility B's demand pressure
    ("FAC02", "A+", "PLATELETS"),
]

POLICIES = [
    dict(component="RBC", shelf_life_days=35, window_open_days=10, window_close_days=2, forecast_horizon=7, reserve_days=3),
    dict(component="PLATELETS", shelf_life_days=5, window_open_days=3, window_close_days=1, forecast_horizon=3, reserve_days=1),
    dict(component="PLASMA", shelf_life_days=365, window_open_days=30, window_close_days=3, forecast_horizon=14, reserve_days=7),
]

# Generation-only date buckets, named for what they target during data
# generation — not the model's window_state values, which are computed
# exclusively by hemogrid_model from these dates at query time.
LOT_BUCKETS = ["far_horizon", "mid_horizon", "near_expiry", "already_past"]


def _great_circle_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius_km = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * radius_km * math.asin(math.sqrt(a))


def _poisson(rng: random.Random, lam: float) -> int:
    """Knuth's algorithm — stdlib-only Poisson sampling for synthetic noise."""
    if lam <= 0:
        return 0
    threshold = math.exp(-lam)
    k, p = 0, 1.0
    while True:
        k += 1
        p *= rng.random()
        if p <= threshold:
            return k - 1


def _weighted_choice(rng: random.Random, weights: dict) -> str:
    keys = list(weights.keys())
    return rng.choices(keys, weights=[weights[k] for k in keys], k=1)[0]


def _bucket_offset_range(policy: dict, bucket: str) -> tuple[int, int]:
    shelf, wopen, wclose = policy["shelf_life_days"], policy["window_open_days"], policy["window_close_days"]
    if bucket == "far_horizon":
        lo, hi = wopen + 1, shelf - 1
    elif bucket == "mid_horizon":
        lo, hi = wclose + 1, wopen
    elif bucket == "near_expiry":
        lo, hi = 1, wclose
    else:  # already_past
        return -3, 0
    lo, hi = min(lo, hi), max(lo, hi)
    return max(lo, 1), max(hi, 1)


def _truncate_all(session: Session) -> None:
    for model in (Review, Recommendation, Consumption, Lot, Route, Policy, Facility):
        session.execute(delete(model))
    session.commit()


def _seed_facilities(session: Session) -> None:
    rows = [
        dict(id=fid, code=code, name=name, tier=tier, lat=lat, lng=lng)
        for fid, code, name, tier, lat, lng in FACILITIES
    ]
    session.execute(insert(Facility), rows)
    session.commit()


def _seed_policies(session: Session) -> None:
    session.execute(insert(Policy), POLICIES)
    session.commit()


def _seed_routes(session: Session) -> None:
    rows = []
    for from_id, from_code, _, _, from_lat, from_lng in FACILITIES:
        for to_id, to_code, _, _, to_lat, to_lng in FACILITIES:
            if from_id == to_id:
                continue
            km = _great_circle_km(from_lat, from_lng, to_lat, to_lng)
            rows.append(dict(
                id=f"RT-{from_code}-{to_code}",
                from_id=from_id,
                to_id=to_id,
                transit_hours=round(km / 50.0, 2),
                cold_chain_capable=(from_id, to_id) != NO_COLD_CHAIN_LANE,
            ))
    session.execute(insert(Route), rows)
    session.commit()


def _seed_consumption(rng: random.Random, session: Session) -> int:
    facility_by_id = {fid: tier for fid, _, _, tier, _, _ in FACILITIES}
    counter = 0
    rows = []
    for day_index in range(CONSUMPTION_DAYS):
        the_date = AS_OF - timedelta(days=CONSUMPTION_DAYS - 1 - day_index)
        weekday_factor = 1.25 if the_date.weekday() < 5 else 0.6
        for facility_id, tier in facility_by_id.items():
            for component in COMPONENTS:
                for blood_group in BLOOD_GROUPS:
                    lam = (
                        TIER_CONSUMPTION_FACTOR[tier]
                        * COMPONENT_CONSUMPTION_FACTOR[component]
                        * BLOOD_GROUP_WEIGHTS[blood_group]
                        * CONSUMPTION_SCALE
                        * weekday_factor
                    )
                    if (facility_id, blood_group, component) == (PLANTED_DEST_ID, "O+", "RBC"):
                        lam *= 1.6  # tuned demand pressure for the planted gap
                    units = _poisson(rng, lam)
                    if units > 0:
                        counter += 1
                        rows.append(dict(
                            id=f"CONS-{counter:06d}",
                            facility_id=facility_id,
                            date=the_date,
                            blood_group=blood_group,
                            component=component,
                            units=units,
                            kind="ROUTINE",
                        ))

                    if (
                        facility_id, blood_group, component
                    ) in EMERGENCY_SPIKE_COMBOS and EMERGENCY_SPIKE_DAY <= day_index < EMERGENCY_SPIKE_DAY + EMERGENCY_SPIKE_SPAN:
                        spike_units = _poisson(rng, lam * 4.0)
                        if spike_units > 0:
                            counter += 1
                            rows.append(dict(
                                id=f"CONS-{counter:06d}",
                                facility_id=facility_id,
                                date=the_date,
                                blood_group=blood_group,
                                component=component,
                                units=spike_units,
                                kind="EMERGENCY",
                            ))
    session.execute(insert(Consumption), rows)
    session.commit()
    return len(rows)


def _seed_lots(rng: random.Random, session: Session) -> tuple[int, dict, int]:
    policy_by_component = {p["component"]: p for p in POLICIES}
    bucket_counts = {b: 0 for b in LOT_BUCKETS}
    rows = []
    counter = 0

    for facility_id, target_count in FACILITY_LOT_TARGET.items():
        for i in range(target_count):
            component = _weighted_choice(rng, COMPONENT_WEIGHTS)
            blood_group = _weighted_choice(rng, BLOOD_GROUP_WEIGHTS)

            # Bias Facility B away from O+ RBC supply so its planted gap
            # comes from a genuine, generated shortfall rather than a
            # special-cased row.
            if facility_id == PLANTED_DEST_ID and component == "RBC" and blood_group == "O+" and rng.random() < 0.75:
                blood_group = _weighted_choice(rng, {k: v for k, v in BLOOD_GROUP_WEIGHTS.items() if k != "O+"})

            bucket = LOT_BUCKETS[i % len(LOT_BUCKETS)]
            bucket_counts[bucket] += 1
            policy = policy_by_component[component]
            lo, hi = _bucket_offset_range(policy, bucket)
            offset_days = rng.randint(lo, hi)
            expires_at = AS_OF + timedelta(days=offset_days)
            collected_at = expires_at - timedelta(days=policy["shelf_life_days"])

            counter += 1
            rows.append(dict(
                id=f"LOT-{counter:05d}",
                trace_id=f"TRC-{facility_id}-{counter:05d}",
                facility_id=facility_id,
                blood_group=blood_group,
                component=component,
                units=rng.randint(1, 8),
                collected_at=collected_at,
                expires_at=expires_at,
                storage_status="OK",
            ))

    # Planted scenario: Facility A holds ~12 at-risk O+ RBC units, close
    # enough to expiry to sit in the tightest generation bucket.
    rbc_policy = policy_by_component["RBC"]
    planted_units = [6, 6]
    planted_total = 0
    for units in planted_units:
        lo, hi = _bucket_offset_range(rbc_policy, "near_expiry")
        offset_days = rng.randint(lo, hi)
        expires_at = AS_OF + timedelta(days=offset_days)
        collected_at = expires_at - timedelta(days=rbc_policy["shelf_life_days"])
        counter += 1
        rows.append(dict(
            id=f"LOT-{counter:05d}",
            trace_id=f"TRC-{PLANTED_SOURCE_ID}-{counter:05d}",
            facility_id=PLANTED_SOURCE_ID,
            blood_group="O+",
            component="RBC",
            units=units,
            collected_at=collected_at,
            expires_at=expires_at,
            storage_status="OK",
        ))
        planted_total += units

    # 2-3 lots that would otherwise score highly (fresh, generous, common
    # group) are flagged ANOMALY so the storage-integrity gate has something
    # real to exclude.
    candidates = [
        idx for idx, row in enumerate(rows)
        if row["units"] >= 5
        and row["blood_group"] in ("O+", "A+")
        and (row["expires_at"] - AS_OF).days > 5
    ]
    for idx in rng.sample(candidates, k=min(3, len(candidates))):
        rows[idx]["storage_status"] = "ANOMALY"

    session.execute(insert(Lot), rows)
    session.commit()
    return len(rows), bucket_counts, planted_total


def _print_summary(session: Session, bucket_counts: dict, planted_units: int, elapsed_s: float) -> None:
    counts = {
        model.__name__: session.execute(select(func.count()).select_from(model)).scalar_one()
        for model in (Facility, Route, Policy, Lot, Consumption, Recommendation, Review)
    }

    print("\n=== HemoGrid seed summary ===")
    print(f"as_of: {AS_OF.isoformat()}  elapsed: {elapsed_s:.2f}s")
    print("\nrow counts:")
    for name, count in counts.items():
        print(f"  {name:<14} {count}")

    print("\nlot generation buckets (targets used to spread dates — not a")
    print("model classification; see GET /api/risk/expiry for that):")
    for bucket in LOT_BUCKETS:
        print(f"  {bucket:<14} {bucket_counts[bucket]}")

    print(
        f"\nplanted scenario: {PLANTED_SOURCE_ID} holds {planted_units} "
        f"near-expiry O+ RBC units (source); {PLANTED_DEST_ID} is tuned "
        f"toward an O+ RBC supply/demand gap (destination)."
    )
    print("=" * 30 + "\n")


def main() -> None:
    started = time.monotonic()
    rng = random.Random(42)

    create_all()
    with Session(engine) as session:
        _truncate_all(session)
        _seed_facilities(session)
        _seed_policies(session)
        _seed_routes(session)
        _seed_consumption(rng, session)
        _, bucket_counts, planted_units = _seed_lots(rng, session)

        elapsed_s = time.monotonic() - started
        _print_summary(session, bucket_counts, planted_units, elapsed_s)


if __name__ == "__main__":
    main()
