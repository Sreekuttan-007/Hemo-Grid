"""tests/test_eligibility.py — eligibility.check() (Model.md §6.5) against
fixture 5 and a per-gate isolation battery.

G7/G8 relationship: fefo.py always builds LotRisk with
at_risk_units = units - used - reserved_units, so at_risk_units <=
units - reserved_units always holds. That means G8's bound (qty <=
at_risk_units) is always at least as tight as G7's (qty <= units -
reserved_units) whenever lot_risk came from allocate_at_risk() -- G7 cannot
fail on its own under correct upstream data. It is still independently
checked (and independently testable) as a defensive check against a
lot_risk that does not satisfy that invariant, e.g. stale or hand-built
data passed straight to check() outside the normal pipeline; that case is
exercised explicitly below.
"""

import dataclasses
from datetime import date, timedelta

import pytest

from hemogrid_model.eligibility import check
from hemogrid_model.types import LotIn, LotRisk, PolicyIn, RouteIn, ShortageOut
from fixtures import fixture_5_anomaly_lot_excluded

AS_OF = date(2026, 3, 1)

POLICY = PolicyIn(
    component="RBC", shelf_life_days=42, window_open_days=10,
    window_close_days=3, forecast_horizon=14, reserve_days=2,
)
LOT = LotIn(
    lot_id="L1", trace_id="TR-1", facility_id="SRC", blood_group="O_POS",
    component="RBC", units=10, collected_at=AS_OF - timedelta(days=1),
    expires_at=AS_OF + timedelta(days=6), storage_status="OK",
)
LOT_RISK = LotRisk(
    lot_id="L1", facility_id="SRC", blood_group="O_POS", component="RBC",
    units=10, at_risk_units=8, reserved_units=2, days_to_expiry=6,
    window_state="RESCUE_WINDOW",
)
SHORTAGE = ShortageOut(
    facility_id="DST", blood_group="O_POS", component="RBC", horizon_days=14,
    usable_units=2, forecast_demand=10.0, reserve_units=4, gap_units=12,
    shortage_risk=0.8, tier="CRITICAL",
)
ROUTE = RouteIn(from_id="SRC", to_id="DST", transit_hours=24.0, cold_chain_capable=True)
QTY = 5

EXPECTED_LABELS = {
    "G1": "Expiry window survives transit",
    "G2": "Storage condition acceptable",
    "G3": "Component match",
    "G4": "Blood group compatible",
    "G5": "Traceability available",
    "G6": "Cold-chain route available",
    "G7": "Source reserve preserved",
    "G8": "Quantity within available surplus",
}


# ---------------------------------------------------------------------------
# Fixture 5 (Model.md §8 case 5)
# ---------------------------------------------------------------------------


def test_fixture_5_anomaly_lot_fails_only_g2():
    case = fixture_5_anomaly_lot_excluded()
    ok, checks = check(case.lot, case.lot_risk, case.shortage, case.route, case.policy, case.qty, case.as_of)

    assert ok == case.expected_ok == False
    assert len(checks) == 8
    assert [c.code for c in checks] == ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8"]

    failed_codes = [c.code for c in checks if not c.passed]
    assert failed_codes == case.expected_failed_codes == ["G2"]

    passed_count = sum(1 for c in checks if c.passed)
    assert passed_count == 7


def test_labels_match_model_md_verbatim():
    """The label field is rendered verbatim by the frontend -- exact string
    match against Model.md §6.5's table for every one of the 8 checks."""
    case = fixture_5_anomaly_lot_excluded()
    _, checks = check(case.lot, case.lot_risk, case.shortage, case.route, case.policy, case.qty, case.as_of)
    for c in checks:
        assert c.label == EXPECTED_LABELS[c.code]


# ---------------------------------------------------------------------------
# Baseline: every gate passes
# ---------------------------------------------------------------------------


def test_baseline_all_eight_pass():
    ok, checks = check(LOT, LOT_RISK, SHORTAGE, ROUTE, POLICY, QTY, AS_OF)
    assert ok is True
    assert all(c.passed for c in checks)
    assert len(checks) == 8


# ---------------------------------------------------------------------------
# One gate at a time, isolated
# ---------------------------------------------------------------------------


def test_g1_fails_when_expiry_does_not_survive_transit():
    """T=3, transit_hours=24 -> transit_days=1: 3-1=2 < window_close_days(3)."""
    lot = dataclasses.replace(LOT, expires_at=AS_OF + timedelta(days=3))
    ok, checks = check(lot, LOT_RISK, SHORTAGE, ROUTE, POLICY, QTY, AS_OF)
    assert not ok
    assert [c.code for c in checks if not c.passed] == ["G1"]


def test_g2_fails_on_anomaly_storage():
    lot = dataclasses.replace(LOT, storage_status="ANOMALY")
    ok, checks = check(lot, LOT_RISK, SHORTAGE, ROUTE, POLICY, QTY, AS_OF)
    assert not ok
    assert [c.code for c in checks if not c.passed] == ["G2"]


def test_g3_fails_on_component_mismatch():
    shortage = dataclasses.replace(SHORTAGE, component="PLASMA")
    ok, checks = check(LOT, LOT_RISK, shortage, ROUTE, POLICY, QTY, AS_OF)
    assert not ok
    assert [c.code for c in checks if not c.passed] == ["G3"]


def test_g4_fails_on_blood_group_mismatch():
    shortage = dataclasses.replace(SHORTAGE, blood_group="A_POS")
    ok, checks = check(LOT, LOT_RISK, shortage, ROUTE, POLICY, QTY, AS_OF)
    assert not ok
    assert [c.code for c in checks if not c.passed] == ["G4"]


def test_g5_fails_on_empty_trace_id():
    lot = dataclasses.replace(LOT, trace_id="")
    ok, checks = check(lot, LOT_RISK, SHORTAGE, ROUTE, POLICY, QTY, AS_OF)
    assert not ok
    assert [c.code for c in checks if not c.passed] == ["G5"]


def test_g6_fails_when_no_route():
    ok, checks = check(LOT, LOT_RISK, SHORTAGE, None, POLICY, QTY, AS_OF)
    assert not ok
    assert [c.code for c in checks if not c.passed] == ["G6"]


def test_g6_fails_when_route_not_cold_chain_capable():
    route = dataclasses.replace(ROUTE, cold_chain_capable=False)
    ok, checks = check(LOT, LOT_RISK, SHORTAGE, route, POLICY, QTY, AS_OF)
    assert not ok
    assert [c.code for c in checks if not c.passed] == ["G6"]


def test_g7_fails_alone_on_a_lot_risk_that_violates_its_own_invariant():
    """Deliberately inconsistent lot_risk (at_risk_units=8, reserved_units=5,
    units=10 -- impossible from real fefo.py output, since 8+5=13 > 10, but
    check() must still validate defensively against whatever lot_risk it is
    given). qty=7: G8 passes (1<=7<=8); G7 fails (10-7=3 < reserved(5))."""
    bad_lot_risk = dataclasses.replace(LOT_RISK, at_risk_units=8, reserved_units=5)
    ok, checks = check(LOT, bad_lot_risk, SHORTAGE, ROUTE, POLICY, 7, AS_OF)
    assert not ok
    assert [c.code for c in checks if not c.passed] == ["G7"]


def test_g8_fails_alone_when_qty_exceeds_at_risk_but_reserve_still_holds():
    """lot_risk with used_i > 0 (units=10, at_risk=6, reserved=2, so 2 units
    were already claimed by demand): qty=7 exceeds at_risk_units(6) -> G8
    fails, but 10-7=3 >= reserved_units(2) -> G7 still passes."""
    lot_risk = dataclasses.replace(LOT_RISK, at_risk_units=6, reserved_units=2)
    ok, checks = check(LOT, lot_risk, SHORTAGE, ROUTE, POLICY, 7, AS_OF)
    assert not ok
    assert [c.code for c in checks if not c.passed] == ["G8"]


def test_g8_fails_on_zero_quantity():
    ok, checks = check(LOT, LOT_RISK, SHORTAGE, ROUTE, POLICY, 0, AS_OF)
    assert not ok
    assert [c.code for c in checks if not c.passed] == ["G8"]


def test_g8_fails_on_negative_quantity():
    ok, checks = check(LOT, LOT_RISK, SHORTAGE, ROUTE, POLICY, -1, AS_OF)
    assert not ok
    assert [c.code for c in checks if not c.passed] == ["G8"]
