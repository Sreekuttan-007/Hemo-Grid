"""Hand-computed fixtures for hemogrid_model, per Model.md §8.

Every number here is typed in by hand and checked against the formulas in
Model.md §6 in each fixture's docstring — nothing in this file calls into the
engine. `AS_OF` is fixed; nothing here ever calls `date.today()`.

Fixtures 1-3 sidestep the (unspecified) question of how fefo.py would recompute
D(T) for a lot whose days-to-expiry differs from the forecast horizon: each
single-lot fixture sets the lot's `days_to_expiry` equal to `policy.forecast_horizon`
and equal to `forecast.horizon_days`, so `D(T_i) == forecast.demand` unambiguously,
whichever interpretation fefo.py ends up using for other T values.
"""

import dataclasses
from datetime import date, timedelta
from typing import NamedTuple, Optional

from hemogrid_model.enums import CRITICAL, O_POS, OK, RBC, RESCUE_WINDOW, UNRESCUABLE, WATCH
from hemogrid_model.types import (
    ForecastOut,
    LotIn,
    LotRisk,
    NetworkSnapshot,
    FacilityIn,
    PolicyIn,
    RouteIn,
    ShortageOut,
    UsageIn,
)

# Fixed "today" for every fixture. Never date.today() — the engine is deterministic
# and the demo is rehearsed against this exact date.
AS_OF = date(2026, 3, 1)

# Shared baseline policy for RBC. window_open_days=10, window_close_days=3 is the
# pair that makes fixture 4's three day-counts (15 / 6 / 1) land in WATCH /
# RESCUE_WINDOW / UNRESCUABLE respectively — see that fixture's docstring.
RBC_POLICY = PolicyIn(
    component=RBC,
    shelf_life_days=42,
    window_open_days=10,
    window_close_days=3,
    forecast_horizon=14,
    reserve_days=2,
)


# ---------------------------------------------------------------------------
# Fixtures 1 & 2 — pure FEFO claiming, no reserve interference
# ---------------------------------------------------------------------------

class FefoCase(NamedTuple):
    lots: list[LotIn]
    forecast: ForecastOut
    policy: PolicyIn
    expected_at_risk_units: int
    expected_reserved_units: int


def fixture_1_facility_20_units_demand_8() -> FefoCase:
    """Model.md §8 case 1: 20 units on hand, forecast consumption 8 -> at_risk = 12.

    Single lot, single line. reserve_days=0 so reserve withholding never engages
    (isolates the raw FEFO claim from the reserve step tested in fixture 3).

    Arithmetic (Model.md §6.2), lot's days_to_expiry T = 8 = forecast.horizon_days,
    so D(T) == forecast.demand == 8.0 exactly:
        carried   = 0
        claimable = max(0, D(T) - carried) = max(0, 8 - 0)  = 8
        used      = min(units, claimable)  = min(20, 8)     = 8
        at_risk   = units - used           = 20 - 8         = 12
        reserve_units = ceil(reserve_days * level) = ceil(0 * 1.0) = 0
    Expected: at_risk_units = 12, reserved_units = 0.
    """
    lot = LotIn(
        lot_id="LOT-1",
        trace_id="TR-1",
        facility_id="FAC-1",
        blood_group=O_POS,
        component=RBC,
        units=20,
        collected_at=date(2026, 2, 25),
        expires_at=AS_OF + timedelta(days=8),
        storage_status=OK,
    )
    policy = dataclasses.replace(RBC_POLICY, forecast_horizon=8, reserve_days=0)
    forecast = ForecastOut(
        facility_id="FAC-1",
        blood_group=O_POS,
        component=RBC,
        horizon_days=8,
        demand=8.0,
        level=1.0,
        confidence=0.8,
        n_days=30,
        method="ewma",
    )
    return FefoCase(
        lots=[lot],
        forecast=forecast,
        policy=policy,
        expected_at_risk_units=12,
        expected_reserved_units=0,
    )


def fixture_2_facility_10_units_demand_3() -> FefoCase:
    """Model.md §8 case 2: 10 units on hand, forecast consumption 3 -> at_risk = 7.

    Same construction as fixture 1, reserve_days=0.

    Arithmetic, T = 3 = forecast.horizon_days, so D(T) == forecast.demand == 3.0:
        claimable = max(0, 3 - 0)  = 3
        used      = min(10, 3)    = 3
        at_risk   = 10 - 3         = 7
        reserve_units = ceil(0 * 1.0) = 0
    Expected: at_risk_units = 7, reserved_units = 0.
    """
    lot = LotIn(
        lot_id="LOT-2",
        trace_id="TR-2",
        facility_id="FAC-2",
        blood_group=O_POS,
        component=RBC,
        units=10,
        collected_at=date(2026, 2, 27),
        expires_at=AS_OF + timedelta(days=3),
        storage_status=OK,
    )
    policy = dataclasses.replace(RBC_POLICY, forecast_horizon=3, reserve_days=0)
    forecast = ForecastOut(
        facility_id="FAC-2",
        blood_group=O_POS,
        component=RBC,
        horizon_days=3,
        demand=3.0,
        level=1.0,
        confidence=0.8,
        n_days=30,
        method="ewma",
    )
    return FefoCase(
        lots=[lot],
        forecast=forecast,
        policy=policy,
        expected_at_risk_units=7,
        expected_reserved_units=0,
    )


# ---------------------------------------------------------------------------
# Fixture 3 — FEFO fully claims the lot, and reserve now drives the gap
# ---------------------------------------------------------------------------

class ShortageCase(NamedTuple):
    lots: list[LotIn]
    forecast: ForecastOut
    policy: PolicyIn
    expected_at_risk_units: int
    expected_reserved_units: int
    expected_reserve_units: int   # ShortageOut.reserve_units (the policy target)
    expected_usable_units: int
    expected_gap_units: int
    expected_shortage_risk: float
    expected_tier: str


def fixture_3_facility_5_units_demand_9() -> ShortageCase:
    """Model.md §8 case 3: 5 units on hand, forecast consumption 9
    -> at_risk = 0, gap = 4 + reserve.

    FEFO (Model.md §6.2), T = 9 = forecast.horizon_days, D(T) == demand == 9.0:
        claimable = max(0, 9 - 0) = 9
        used      = min(5, 9)     = 5
        at_risk   = 5 - 5          = 0
    Nothing is at risk, so nothing can be converted to reserved for this lot:
        reserved_units (LotRisk) = 0

    Shortage (Model.md §6.4), level=1.0, reserve_days=2:
        reserve_units (target) = ceil(2 * 1.0) = 2
        usable_units = 5   (none of the 5 units is at risk, all usable within H)
        gap_units = max(0, D(H) + reserve_units - usable_units)
                  = max(0, 9 + 2 - 5) = 6   = 4 + reserve(2)   <- matches §8
        shortage_risk = clamp(gap_units / (D(H) + reserve_units), 0, 1)
                       = 6 / (9 + 2) = 6/11 ≈ 0.545454...
        tier: gap != 0 and shortage_risk (0.5455) > 0.4 -> CRITICAL
    """
    lot = LotIn(
        lot_id="LOT-3",
        trace_id="TR-3",
        facility_id="FAC-3",
        blood_group=O_POS,
        component=RBC,
        units=5,
        collected_at=date(2026, 2, 22),
        expires_at=AS_OF + timedelta(days=9),
        storage_status=OK,
    )
    policy = dataclasses.replace(RBC_POLICY, forecast_horizon=9, reserve_days=2)
    forecast = ForecastOut(
        facility_id="FAC-3",
        blood_group=O_POS,
        component=RBC,
        horizon_days=9,
        demand=9.0,
        level=1.0,
        confidence=0.8,
        n_days=30,
        method="ewma",
    )
    return ShortageCase(
        lots=[lot],
        forecast=forecast,
        policy=policy,
        expected_at_risk_units=0,
        expected_reserved_units=0,
        expected_reserve_units=2,
        expected_usable_units=5,
        expected_gap_units=6,
        expected_shortage_risk=6 / 11,
        expected_tier=CRITICAL,
    )


# ---------------------------------------------------------------------------
# Fixture 4 — rescue-window classification
# ---------------------------------------------------------------------------

class WindowCase(NamedTuple):
    lot_risk: LotRisk
    policy: PolicyIn
    expected_window_state: str


def fixture_4_window_states() -> list[WindowCase]:
    """Model.md §8 case 4: RBC lot at 15 days out -> WATCH; 6 days out ->
    RESCUE_WINDOW; 1 day out -> UNRESCUABLE.

    Uses RBC_POLICY: window_open_days=10, window_close_days=3.
    Each lot_risk has at_risk_units=10 > 0, so the at_risk_units==0 -> NORMAL
    branch of Model.md §6.3 never applies here; only T decides the outcome.
    `window_state` on each input LotRisk is an unused placeholder — classify()
    recomputes the state from days_to_expiry/at_risk_units, it does not read
    the field back.

        T=15: T > window_open_days (10)                    -> WATCH
        T=6:  window_close_days (3) <= T <= window_open_days (10) -> RESCUE_WINDOW
        T=1:  T < window_close_days (3)                     -> UNRESCUABLE
    """
    def lot_risk(lot_id: str, days_to_expiry: int) -> LotRisk:
        return LotRisk(
            lot_id=lot_id,
            facility_id="FAC-4",
            blood_group=O_POS,
            component=RBC,
            units=10,
            at_risk_units=10,
            reserved_units=0,
            days_to_expiry=days_to_expiry,
            window_state="NORMAL",  # placeholder; classify() recomputes it
        )

    return [
        WindowCase(lot_risk("LOT-4-WATCH", 15), RBC_POLICY, WATCH),
        WindowCase(lot_risk("LOT-4-RESCUE", 6), RBC_POLICY, RESCUE_WINDOW),
        WindowCase(lot_risk("LOT-4-UNRESCUABLE", 1), RBC_POLICY, UNRESCUABLE),
    ]


# ---------------------------------------------------------------------------
# Fixture 5 — eligibility gate: ANOMALY storage excludes on G2 alone
# ---------------------------------------------------------------------------

class EligibilityCase(NamedTuple):
    lot: LotIn
    lot_risk: LotRisk
    shortage: ShortageOut
    route: Optional[RouteIn]
    policy: PolicyIn
    qty: int
    as_of: date
    expected_ok: bool
    expected_failed_codes: list[str]


def fixture_5_anomaly_lot_excluded() -> EligibilityCase:
    """Model.md §8 case 5: storage_status = "ANOMALY" -> excluded,
    failed_codes == ["G2"], the other seven checks pass.

    Lot: expires_at = AS_OF + 6 days -> T = 6, inside RESCUE_WINDOW (see fixture 4).
    Route: transit_hours=24.0 -> transit_days = ceil(24/24) = 1.

        G1 expiry survives transit: T - transit_days >= window_close_days
                                     6 - 1 = 5 >= 3                -> PASS
        G2 storage_status == "OK":  "ANOMALY" != "OK"              -> FAIL (only failure)
        G3 component match:         lot RBC == shortage RBC        -> PASS
        G4 blood group match:       lot O_POS == shortage O_POS    -> PASS
        G5 trace_id present:        "TR-5-ANOMALY" non-empty       -> PASS
        G6 route + cold-chain:      route exists, cold_chain=True  -> PASS
        G7 source reserve preserved: qty=5 drawn only from
           at_risk_units=10 (reserved_units=0 untouched)           -> PASS
        G8 qty within at_risk_units: 1 <= 5 <= 10                  -> PASS
    """
    lot = LotIn(
        lot_id="LOT-ANOMALY-1",
        trace_id="TR-5-ANOMALY",
        facility_id="FAC-SRC",
        blood_group=O_POS,
        component=RBC,
        units=10,
        collected_at=date(2026, 2, 20),
        expires_at=AS_OF + timedelta(days=6),
        storage_status="ANOMALY",
    )
    lot_risk = LotRisk(
        lot_id="LOT-ANOMALY-1",
        facility_id="FAC-SRC",
        blood_group=O_POS,
        component=RBC,
        units=10,
        at_risk_units=10,
        reserved_units=0,
        days_to_expiry=6,
        window_state=RESCUE_WINDOW,
    )
    shortage = ShortageOut(
        facility_id="FAC-DST",
        blood_group=O_POS,
        component=RBC,
        horizon_days=14,
        usable_units=2,
        forecast_demand=10.0,
        reserve_units=4,
        gap_units=12,
        shortage_risk=12 / 14,
        tier=CRITICAL,
    )
    route = RouteIn(
        from_id="FAC-SRC",
        to_id="FAC-DST",
        transit_hours=24.0,
        cold_chain_capable=True,
    )
    return EligibilityCase(
        lot=lot,
        lot_risk=lot_risk,
        shortage=shortage,
        route=route,
        policy=RBC_POLICY,
        qty=5,
        as_of=AS_OF,
        expected_ok=False,
        expected_failed_codes=["G2"],
    )


# ---------------------------------------------------------------------------
# Fixture 6 — full-pipeline determinism
# ---------------------------------------------------------------------------

def fixture_6_pipeline_determinism_snapshot() -> NetworkSnapshot:
    """Model.md §8 case 6: run_pipeline on the same snapshot twice must produce
    identical output, field for field.

    This fixture is a determinism check, not an arithmetic one — Model.md §8
    itself only specifies the equality requirement, not target numbers. The
    scenario is built to be realistic (a near-expiry surplus at FAC-A, a thin
    line at FAC-B, a cold-chain route between them) so the pipeline has real
    work to do, but no output value here is hand-verified; the test asserts
    run_pipeline(snapshot) == run_pipeline(snapshot) field by field.

    20 days of usage history (2026-02-09 .. 2026-02-28, ending the day before
    AS_OF) keeps every line's forecast on the "ewma" path (n=20, i.e. >= 14) and
    under 28 days so the weekday index defaults to 1.0 uniformly (Model.md §6.1).
    """
    facilities = [
        FacilityIn(
            facility_id="FAC-A",
            code="A",
            name="Facility A",
            tier="REGIONAL_CENTRE",
            lat=12.9716,
            lng=77.5946,
        ),
        FacilityIn(
            facility_id="FAC-B",
            code="B",
            name="Facility B",
            tier="HOSPITAL",
            lat=13.0827,
            lng=80.2707,
        ),
    ]

    lots = [
        LotIn(
            lot_id="LOT-6-A1",
            trace_id="TR-6-A1",
            facility_id="FAC-A",
            blood_group=O_POS,
            component=RBC,
            units=15,
            collected_at=date(2026, 2, 20),
            expires_at=AS_OF + timedelta(days=6),
            storage_status=OK,
        ),
        LotIn(
            lot_id="LOT-6-A2",
            trace_id="TR-6-A2",
            facility_id="FAC-A",
            blood_group=O_POS,
            component=RBC,
            units=10,
            collected_at=date(2026, 2, 15),
            expires_at=AS_OF + timedelta(days=30),
            storage_status=OK,
        ),
        LotIn(
            lot_id="LOT-6-B1",
            trace_id="TR-6-B1",
            facility_id="FAC-B",
            blood_group=O_POS,
            component=RBC,
            units=3,
            collected_at=date(2026, 2, 24),
            expires_at=AS_OF + timedelta(days=20),
            storage_status=OK,
        ),
    ]

    usage = []
    history_start = AS_OF - timedelta(days=20)  # 2026-02-09 .. 2026-02-28
    for day_offset in range(20):
        day = history_start + timedelta(days=day_offset)
        usage.append(
            UsageIn(
                facility_id="FAC-A",
                date=day,
                blood_group=O_POS,
                component=RBC,
                units=5,
                kind="ROUTINE",
            )
        )
        usage.append(
            UsageIn(
                facility_id="FAC-B",
                date=day,
                blood_group=O_POS,
                component=RBC,
                units=3,
                kind="ROUTINE",
            )
        )

    routes = [
        RouteIn(
            from_id="FAC-A",
            to_id="FAC-B",
            transit_hours=12.0,
            cold_chain_capable=True,
        ),
    ]

    policies = [RBC_POLICY]

    return NetworkSnapshot(
        as_of=AS_OF,
        facilities=facilities,
        lots=lots,
        usage=usage,
        routes=routes,
        policies=policies,
    )
