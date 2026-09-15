"""tests/test_fefo_window.py — fefo.py, window.py (Model.md §6.2/§6.3, M5) and
shortage.py (Model.md §6.4, M6) against fixtures 1-4 from tests/fixtures.py,
plus supplementary hand-computed cases for behavior those four fixtures don't
individually reach (the reserve-from-longest-dated rule with more than one
lot, and the WATCH/HIGH/STABLE shortage tiers -- fixture 3 only reaches
CRITICAL). Every supplementary expected value is derived in its test's
docstring against Model.md §6, the same rigor as fixtures.py.
"""

from datetime import date, timedelta

import pytest

from hemogrid_model.fefo import allocate_at_risk
from hemogrid_model.shortage import assess_shortage
from hemogrid_model.window import classify
from hemogrid_model.types import ForecastOut, LotIn, PolicyIn
from fixtures import (
    fixture_1_facility_20_units_demand_8,
    fixture_2_facility_10_units_demand_3,
    fixture_3_facility_5_units_demand_9,
    fixture_4_window_states,
)

AS_OF = date(2026, 3, 1)


# ---------------------------------------------------------------------------
# Fixture 1 & 2 — pure FEFO claiming (Model.md §8 cases 1 and 2)
# ---------------------------------------------------------------------------


def test_fixture_1_20_units_demand_8_yields_at_risk_12():
    case = fixture_1_facility_20_units_demand_8()
    result = allocate_at_risk(case.lots, case.forecast, case.policy, AS_OF)
    assert len(result) == 1
    assert result[0].at_risk_units == 12 == case.expected_at_risk_units
    assert result[0].reserved_units == 0 == case.expected_reserved_units


def test_fixture_2_10_units_demand_3_yields_at_risk_7():
    case = fixture_2_facility_10_units_demand_3()
    result = allocate_at_risk(case.lots, case.forecast, case.policy, AS_OF)
    assert len(result) == 1
    assert result[0].at_risk_units == 7 == case.expected_at_risk_units
    assert result[0].reserved_units == 0 == case.expected_reserved_units


# ---------------------------------------------------------------------------
# Fixture 3 — fefo + shortage together (Model.md §8 case 3)
# ---------------------------------------------------------------------------


def test_fixture_3_5_units_demand_9_yields_at_risk_0():
    case = fixture_3_facility_5_units_demand_9()
    result = allocate_at_risk(case.lots, case.forecast, case.policy, AS_OF)
    assert len(result) == 1
    assert result[0].at_risk_units == 0 == case.expected_at_risk_units
    assert result[0].reserved_units == 0 == case.expected_reserved_units
    assert result[0].window_state == "NORMAL"  # at_risk_units == 0 -> NORMAL


def test_fixture_3_gap_is_4_plus_reserve():
    case = fixture_3_facility_5_units_demand_9()
    result = assess_shortage(case.lots, case.forecast, case.policy, AS_OF)
    assert result.usable_units == case.expected_usable_units == 5
    assert result.reserve_units == case.expected_reserve_units == 2
    assert result.gap_units == case.expected_gap_units == 6 == 4 + result.reserve_units
    assert result.shortage_risk == pytest.approx(case.expected_shortage_risk)
    assert result.tier == case.expected_tier == "CRITICAL"


# ---------------------------------------------------------------------------
# Fixture 4 — window classification (Model.md §8 case 4)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("case", fixture_4_window_states())
def test_fixture_4_window_states(case):
    assert classify(case.lot_risk, case.policy) == case.expected_window_state


def test_fixture_4_all_three_states_present():
    """Guards against the parametrized test above silently collecting fewer
    than the three documented cases (15d/6d/1d) if fixtures.py ever changes."""
    cases = fixture_4_window_states()
    assert [c.expected_window_state for c in cases] == ["WATCH", "RESCUE_WINDOW", "UNRESCUABLE"]


# ---------------------------------------------------------------------------
# Supplementary: reserve is withheld from the LONGEST-dated lot, not the
# nearest-dated one (Model.md §6.2's explicitly counterintuitive rule) --
# none of fixtures 1-4 uses more than one lot, so this is not otherwise
# covered.
# ---------------------------------------------------------------------------


def test_reserve_is_withheld_from_longest_dated_lot_not_nearest():
    """Two lots on one line, level=1.0/day, reserve_days=1.

    FEFO (ascending by expiry): lot A (5 days out) is claimed first:
        D(5) = 5, claimable = 5, used = min(10, 5) = 5, at_risk_A = 5, carried = 5
    then lot B (10 days out):
        D(10) = 10, claimable = 10 - 5 = 5, used = min(10, 5) = 5, at_risk_B = 5

    reserve_units = ceil(1 * 1.0) = 1, withheld walking DESCENDING by expiry
    (longest-dated first) -- lot B is longer-dated than lot A, so B loses 1
    unit of at_risk to reserved, A is untouched:
        B: at_risk 5 -> 4, reserved 0 -> 1
        A: at_risk stays 5, reserved stays 0
    """
    policy = PolicyIn(
        component="RBC", shelf_life_days=42, window_open_days=10,
        window_close_days=3, forecast_horizon=10, reserve_days=1,
    )
    fc = ForecastOut(
        facility_id="FAC-M", blood_group="O_POS", component="RBC",
        horizon_days=10, demand=10.0, level=1.0, confidence=0.8,
        n_days=30, method="ewma",
    )
    lot_a = LotIn(
        lot_id="LOT-A", trace_id="TR-A", facility_id="FAC-M", blood_group="O_POS",
        component="RBC", units=10, collected_at=AS_OF - timedelta(days=5),
        expires_at=AS_OF + timedelta(days=5), storage_status="OK",
    )
    lot_b = LotIn(
        lot_id="LOT-B", trace_id="TR-B", facility_id="FAC-M", blood_group="O_POS",
        component="RBC", units=10, collected_at=AS_OF - timedelta(days=5),
        expires_at=AS_OF + timedelta(days=10), storage_status="OK",
    )

    result = {r.lot_id: r for r in allocate_at_risk([lot_a, lot_b], fc, policy, AS_OF)}

    assert result["LOT-A"].at_risk_units == 5
    assert result["LOT-A"].reserved_units == 0
    assert result["LOT-B"].at_risk_units == 4
    assert result["LOT-B"].reserved_units == 1


# ---------------------------------------------------------------------------
# Supplementary: shortage tiers not reached by fixture 3 (which only hits
# CRITICAL) -- STABLE, WATCH, HIGH.
# ---------------------------------------------------------------------------


def _line(policy_kwargs, fc_kwargs, lot_kwargs):
    policy = PolicyIn(
        component="RBC", shelf_life_days=60, window_open_days=10, window_close_days=3,
        **policy_kwargs,
    )
    fc = ForecastOut(
        facility_id="FAC-T", blood_group="O_POS", component="RBC",
        confidence=0.8, n_days=30, method="ewma", **fc_kwargs,
    )
    lot = LotIn(
        lot_id="LOT-T", trace_id="TR-T", facility_id="FAC-T", blood_group="O_POS",
        component="RBC", collected_at=AS_OF - timedelta(days=1), storage_status="OK",
        **lot_kwargs,
    )
    return [lot], fc, policy


def test_shortage_tier_stable_when_usable_covers_demand_and_1point5x_reserve():
    """H=10, level=1.0 -> D(H)=10.0, reserve_days=0 -> reserve_units=0.
    Single lot, units=20, expires beyond H (30 days out) so fully usable.
    gap = max(0, ceil(10 + 0 - 20)) = 0; usable(20) >= 1.5*reserve(0)=0 -> STABLE.
    """
    lots, fc, policy = _line(
        dict(forecast_horizon=10, reserve_days=0),
        dict(horizon_days=10, demand=10.0, level=1.0),
        dict(units=20, expires_at=AS_OF + timedelta(days=30)),
    )
    result = assess_shortage(lots, fc, policy, AS_OF)
    assert result.gap_units == 0
    assert result.tier == "STABLE"


def test_shortage_tier_watch_when_gap_zero_but_usable_below_1point5x_reserve():
    """H=2, level=1.0 -> D(H)=2.0. reserve_days=8 -> reserve_units=ceil(8*1.0)=8.
    Single lot, units=10, expires beyond H so fully usable (usable=10).
    gap = max(0, ceil(2 + 8 - 10)) = 0; usable(10) >= 1.5*reserve(8)=12? No -> WATCH.
    """
    lots, fc, policy = _line(
        dict(forecast_horizon=2, reserve_days=8),
        dict(horizon_days=2, demand=2.0, level=1.0),
        dict(units=10, expires_at=AS_OF + timedelta(days=30)),
    )
    result = assess_shortage(lots, fc, policy, AS_OF)
    assert result.gap_units == 0
    assert result.usable_units == 10
    assert result.reserve_units == 8
    assert result.tier == "WATCH"


def test_shortage_tier_high_when_risk_at_or_below_0point4():
    """H=10, level=1.0 -> D(H)=10.0. reserve_days=1 -> reserve_units=1.
    Single lot, units=10, expires beyond H so fully usable.
    gap = max(0, ceil(10 + 1 - 10)) = 1; risk = 1/11 = 0.0909... <= 0.4 -> HIGH.
    """
    lots, fc, policy = _line(
        dict(forecast_horizon=10, reserve_days=1),
        dict(horizon_days=10, demand=10.0, level=1.0),
        dict(units=10, expires_at=AS_OF + timedelta(days=30)),
    )
    result = assess_shortage(lots, fc, policy, AS_OF)
    assert result.gap_units == 1
    assert result.shortage_risk == pytest.approx(1 / 11)
    assert result.tier == "HIGH"


def test_shortage_lot_beyond_horizon_is_fully_usable_despite_its_own_far_future_risk():
    """A lot expiring well beyond H is usable for this function's purposes
    even when fefo.py's own (unbounded) at_risk computation would mark part
    of it at risk over its own much longer horizon -- that is a separate,
    longer-run concern this H-day shortage window does not count.

    H=10, level=1.0 -> D(H) = 10.0. Two lots:
      A: 5 days out, 10 units  -> at_risk_A = 5 (T=5 <= H, counted)
      B: 30 days out, 50 units -> raw fefo at_risk_B = 25, but T=30 > H, so
         all 50 of B's units count as usable here regardless.
    usable = (10 + 50) - 5 = 55. gap = max(0, ceil(10 + 0 - 55)) = 0 -> STABLE.
    """
    policy = PolicyIn(
        component="RBC", shelf_life_days=60, window_open_days=10,
        window_close_days=3, forecast_horizon=10, reserve_days=0,
    )
    fc = ForecastOut(
        facility_id="FAC-H", blood_group="O_POS", component="RBC",
        horizon_days=10, demand=10.0, level=1.0, confidence=0.8,
        n_days=30, method="ewma",
    )
    lot_a = LotIn(
        lot_id="LOT-A", trace_id="TR-A", facility_id="FAC-H", blood_group="O_POS",
        component="RBC", units=10, collected_at=AS_OF - timedelta(days=1),
        expires_at=AS_OF + timedelta(days=5), storage_status="OK",
    )
    lot_b = LotIn(
        lot_id="LOT-B", trace_id="TR-B", facility_id="FAC-H", blood_group="O_POS",
        component="RBC", units=50, collected_at=AS_OF - timedelta(days=1),
        expires_at=AS_OF + timedelta(days=30), storage_status="OK",
    )

    # sanity: raw (unbounded) fefo does mark part of B at risk
    raw = {r.lot_id: r for r in allocate_at_risk([lot_a, lot_b], fc, policy, AS_OF)}
    assert raw["LOT-B"].at_risk_units == 25

    result = assess_shortage([lot_a, lot_b], fc, policy, AS_OF)
    assert result.usable_units == 55
    assert result.gap_units == 0
    assert result.tier == "STABLE"
