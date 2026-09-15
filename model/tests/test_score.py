"""tests/test_score.py — score.py (Model.md §6.6) and explain.py (§6.7).

Covers M8's three required assertions (contributions sum to raw, gate=0 ->
score 0, damp within [0.6, 1.0]), a full hand-computed value check, the
edge cases score.py documents (window_open==window_close, T==window_close,
lot.units==0, gap_units<=0), and explain()'s contract (reads only
factors.inputs, names a real number in each of its four sentences).
"""

import dataclasses
from datetime import date, timedelta

import pytest

from hemogrid_model.explain import explain
from hemogrid_model.score import score
from hemogrid_model.types import LotIn, LotRisk, PolicyIn, RouteIn, ShortageOut

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
    shortage_risk=0.6, tier="CRITICAL",
)
ROUTE = RouteIn(from_id="SRC", to_id="DST", transit_hours=24.0, cold_chain_capable=True)


def test_score_matches_hand_computed_value():
    """T=6, window_open=10, window_close=3, transit_hours=24, gap_units=12,
    qty=5, conf_source=0.7, conf_dest=0.5, gate=1.

    time_pressure = clamp((10-6)/(10-3), 0, 1) = 4/7 = 0.5714285714285714
    ER   = (8/10) * 0.5714285714285714           = 0.45714285714285713
    SR   = 0.6
    FEAS = clamp(1 - 24/((6-3)*24), 0, 1) = clamp(1 - 24/72, 0, 1) = 0.6666666666666667
    COV  = min(5/12, 1)                            = 0.4166666666666667

    raw  = 0.35*0.45714285714285713 + 0.30*0.6 + 0.15*0.6666666666666667 + 0.20*0.4166666666666667
         = 0.15999999999999998 + 0.18 + 0.1 + 0.08333333333333334
         = 0.5233333333333333
    damp = 0.6 + 0.4*min(0.7, 0.5) = 0.6 + 0.4*0.5 = 0.8

    rescue_score = round(100 * 0.5233333333333333 * 0.8 * 1) = round(41.86666...) = 42
    """
    rescue_score, factors = score(
        LOT, LOT_RISK, SHORTAGE, ROUTE, POLICY, qty=5,
        conf_source=0.7, conf_dest=0.5, gate=1,
    )
    assert factors.er == pytest.approx(0.45714285714285713)
    assert factors.sr == 0.6
    assert factors.feas == pytest.approx(0.6666666666666667)
    assert factors.cov == pytest.approx(0.4166666666666667)
    assert factors.raw == pytest.approx(0.5233333333333333)
    assert factors.damp == pytest.approx(0.8)
    assert rescue_score == 42


def test_four_contributions_sum_to_raw():
    _, factors = score(
        LOT, LOT_RISK, SHORTAGE, ROUTE, POLICY, qty=5,
        conf_source=0.7, conf_dest=0.5, gate=1,
    )
    total = factors.contrib_er + factors.contrib_sr + factors.contrib_feas + factors.contrib_cov
    assert total == pytest.approx(factors.raw)


def test_gate_zero_produces_score_zero():
    rescue_score, factors = score(
        LOT, LOT_RISK, SHORTAGE, ROUTE, POLICY, qty=5,
        conf_source=0.7, conf_dest=0.5, gate=0,
    )
    assert rescue_score == 0
    assert factors.gate == 0
    # raw/damp are still computed and recorded even though gate zeroes the score
    assert factors.raw > 0
    assert factors.damp > 0


@pytest.mark.parametrize("conf_source,conf_dest", [(0.15, 0.15), (0.95, 0.95), (0.15, 0.95), (0.6, 0.3)])
def test_damp_stays_within_0point6_and_1(conf_source, conf_dest):
    _, factors = score(
        LOT, LOT_RISK, SHORTAGE, ROUTE, POLICY, qty=5,
        conf_source=conf_source, conf_dest=conf_dest, gate=1,
    )
    assert 0.6 <= factors.damp <= 1.0


def test_inputs_carries_the_minimum_required_fields():
    _, factors = score(
        LOT, LOT_RISK, SHORTAGE, ROUTE, POLICY, qty=5,
        conf_source=0.7, conf_dest=0.5, gate=1,
    )
    for key in (
        "at_risk_units", "lot_units", "days_to_expiry", "window_open",
        "window_close", "transit_hours", "gap_units", "qty",
        "conf_source", "conf_dest",
    ):
        assert key in factors.inputs


# ---------------------------------------------------------------------------
# Edge cases score.py documents
# ---------------------------------------------------------------------------


def test_feas_is_zero_not_a_crash_when_t_equals_window_close():
    lot = dataclasses.replace(LOT, expires_at=AS_OF + timedelta(days=3))
    lot_risk = dataclasses.replace(LOT_RISK, days_to_expiry=3)  # T == window_close (3)
    _, factors = score(
        lot, lot_risk, SHORTAGE, ROUTE, POLICY, qty=5,
        conf_source=0.7, conf_dest=0.5, gate=1,
    )
    assert factors.feas == 0.0


def test_cov_is_one_when_gap_units_is_zero():
    shortage = dataclasses.replace(SHORTAGE, gap_units=0)
    _, factors = score(
        LOT, LOT_RISK, shortage, ROUTE, POLICY, qty=5,
        conf_source=0.7, conf_dest=0.5, gate=1,
    )
    assert factors.cov == 1.0


def test_er_is_zero_when_lot_units_is_zero():
    lot = dataclasses.replace(LOT, units=0)
    _, factors = score(
        lot, LOT_RISK, SHORTAGE, ROUTE, POLICY, qty=5,
        conf_source=0.7, conf_dest=0.5, gate=1,
    )
    assert factors.er == 0.0


def test_raises_when_window_open_does_not_exceed_window_close():
    bad_policy = dataclasses.replace(POLICY, window_open_days=3, window_close_days=3)
    with pytest.raises(ValueError):
        score(
            LOT, LOT_RISK, SHORTAGE, ROUTE, bad_policy, qty=5,
            conf_source=0.7, conf_dest=0.5, gate=1,
        )


# ---------------------------------------------------------------------------
# explain() (Model.md §6.7)
# ---------------------------------------------------------------------------


def test_explain_names_a_real_number_from_inputs_in_each_sentence():
    _, factors = score(
        LOT, LOT_RISK, SHORTAGE, ROUTE, POLICY, qty=5,
        conf_source=0.7, conf_dest=0.5, gate=1,
    )
    expl = explain(factors)

    assert str(factors.inputs["at_risk_units"]) in expl.why_source
    assert str(factors.inputs["lot_units"]) in expl.why_source
    assert str(factors.inputs["gap_units"]) in expl.why_destination
    assert str(factors.inputs["qty"]) in expl.why_quantity
    assert str(factors.inputs["window_close"]) in expl.why_now
    assert str(factors.inputs["days_to_expiry"]) in expl.why_now


def test_explain_has_no_em_dashes():
    _, factors = score(
        LOT, LOT_RISK, SHORTAGE, ROUTE, POLICY, qty=5,
        conf_source=0.7, conf_dest=0.5, gate=1,
    )
    expl = explain(factors)
    combined = expl.why_source + expl.why_destination + expl.why_quantity + expl.why_now
    assert "—" not in combined


def test_explain_does_not_accept_lot_or_destination():
    """explain()'s signature takes only ScoreFactors -- calling it with any
    extra positional argument must fail, confirming the contract holds."""
    _, factors = score(
        LOT, LOT_RISK, SHORTAGE, ROUTE, POLICY, qty=5,
        conf_source=0.7, conf_dest=0.5, gate=1,
    )
    with pytest.raises(TypeError):
        explain(factors, LOT)
