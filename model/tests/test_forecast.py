"""tests/test_forecast.py — forecast() against hand-computed cases.

Model.md §8 does not name a forecast-specific case among its six numbered
fixtures (all six are about fefo/window/eligibility/pipeline), so this file
draws on two sources: fixture 6's usage history (tests/fixtures.py), whose
constant per-facility daily rate makes an exact EWMA hand-computation
possible, and two small usage series built locally to exercise the n < 14
network-fallback branch and the empty-history branch that Model_Prompt.md's
M4 calls out by name.

Every expected number is computed by hand in the docstring next to its
assertion, against Model.md §6.1.
"""

from datetime import timedelta

import pytest

from hemogrid_model.forecast import forecast
from hemogrid_model.types import UsageIn
from fixtures import AS_OF, fixture_6_pipeline_determinism_snapshot


def _line_usage(snapshot_usage, facility_id, blood_group, component):
    return [
        u
        for u in snapshot_usage
        if u.facility_id == facility_id and u.blood_group == blood_group and u.component == component
    ]


def _daily_usage(facility_id, blood_group, component, rate, n_days, end_before=AS_OF):
    return [
        UsageIn(
            facility_id=facility_id,
            date=end_before - timedelta(days=d),
            blood_group=blood_group,
            component=component,
            units=rate,
            kind="ROUTINE",
        )
        for d in range(n_days, 0, -1)
    ]


# ---------------------------------------------------------------------------
# Full EWMA path (n >= 14): fixture 6's usage, a constant daily rate per line
# ---------------------------------------------------------------------------


def test_forecast_fac_a_full_ewma_constant_rate():
    """FAC-A in fixture 6 has 20 days of usage at a constant 5 units/day.

    level: seed = mean(first 7 days) = 5.0; every later EWMA update is
           0.3*5 + 0.7*5 = 5.0 (constant input never moves a level already
           equal to it), so level stays exactly 5.0.
    dow:   n=20 < 28 -> dow[w] = 1.0 for every weekday.
    D(7):  sum of 7 days at level*1.0 = 7 * 5.0 = 35.0.
    cv:    stdev(usage) = 0 (no variation) -> cv = 0 / 5 = 0.
    conf:  clamp(1 - 0/3, 0.15, 0.95) * min(20/28, 1) = 0.95 * (20/28)
         = 0.95 * 0.7142857142857143 = 0.6785714285714286
    n:     20 >= 14, so method stays "ewma" (no fallback).
    """
    snapshot = fixture_6_pipeline_determinism_snapshot()
    usage = _line_usage(snapshot.usage, "FAC-A", "O_POS", "RBC")
    assert len(usage) == 20

    result = forecast("FAC-A", "O_POS", "RBC", usage, AS_OF, horizon=7)

    assert result.n_days == 20
    assert result.method == "ewma"
    assert result.level == pytest.approx(5.0)
    assert result.demand == pytest.approx(35.0)
    assert result.confidence == pytest.approx(0.6785714285714286)


def test_forecast_fac_b_full_ewma_constant_rate():
    """FAC-B in fixture 6 has 20 days of usage at a constant 3 units/day.

    Same reasoning as FAC-A: level stays exactly 3.0, dow uniform 1.0 (n<28),
    D(7) = 7 * 3.0 = 21.0, cv = 0, conf = 0.95 * (20/28) = 0.6785714285714286.
    """
    snapshot = fixture_6_pipeline_determinism_snapshot()
    usage = _line_usage(snapshot.usage, "FAC-B", "O_POS", "RBC")
    assert len(usage) == 20

    result = forecast("FAC-B", "O_POS", "RBC", usage, AS_OF, horizon=7)

    assert result.n_days == 20
    assert result.method == "ewma"
    assert result.level == pytest.approx(3.0)
    assert result.demand == pytest.approx(21.0)
    assert result.confidence == pytest.approx(0.6785714285714286)


def test_forecast_confidence_bounds_hold_on_full_history():
    """conf = clamp(1 - cv/3, 0.15, 0.95) * min(n/28, 1) is always within
    [0.0, 0.95]: the 0.15 clamp only bounds the un-scaled (1 - cv/3) term,
    so the min(n/28, 1) factor can still pull the product below 0.15 when
    n < 28 -- as it does here (0.95 * 20/28 = 0.6786) without tripping any
    clamp a second time, and the product can never go negative."""
    snapshot = fixture_6_pipeline_determinism_snapshot()
    usage = _line_usage(snapshot.usage, "FAC-A", "O_POS", "RBC")
    result = forecast("FAC-A", "O_POS", "RBC", usage, AS_OF, horizon=7)
    assert 0.0 <= result.confidence <= 0.95


# ---------------------------------------------------------------------------
# n < 14 fallback path
# ---------------------------------------------------------------------------


def test_forecast_n_below_14_without_network_usage_falls_back_to_zero():
    """5 days of history (n=5 < 14), no network_usage supplied.

    level = network mean daily rate for (blood_group, component); with no
    network_usage at all, that rate is 0.0 (Model.md does not pin down a
    value for this sub-case; forecast.py documents this as the most
    conservative choice -- see forecast.py's _network_mean_daily_rate).
    method = "network_fallback". demand = level * horizon = 0.0.

    conf: the local 5-day series is a constant 4/day, so cv=0, base=0.95;
    conf = 0.95 * min(5/28, 1) = 0.95 * 5/28 = 0.16964285714285715, then
    capped at 0.35 -- already below the cap, so the cap does not bind here.
    """
    usage = _daily_usage("FAC-X", "O_POS", "RBC", rate=4, n_days=5)
    result = forecast("FAC-X", "O_POS", "RBC", usage, AS_OF, horizon=7)

    assert result.n_days == 5
    assert result.method == "network_fallback"
    assert result.level == 0.0
    assert result.demand == 0.0
    assert result.confidence == pytest.approx(0.16964285714285715)


def test_forecast_n_below_14_with_network_usage_uses_network_rate():
    """5 days of local history (n=5 < 14); network_usage carries 10 days at a
    constant 6 units/day for the same (blood_group, component) at another
    facility.

    network mean daily rate = total_units / span_days = 60 / 10 = 6.0
    (forecast.py's documented reading of "network mean daily rate").
    method = "network_fallback", level = 6.0, demand = level * 7 = 42.0.
    conf: same local-series base as the case above, still under the cap:
        conf = min(0.16964285714285715, 0.35) = 0.16964285714285715
    """
    usage = _daily_usage("FAC-X", "O_POS", "RBC", rate=4, n_days=5)
    network_usage = _daily_usage("FAC-Y", "O_POS", "RBC", rate=6, n_days=10)

    result = forecast(
        "FAC-X", "O_POS", "RBC", usage, AS_OF, horizon=7, network_usage=network_usage
    )

    assert result.n_days == 5
    assert result.method == "network_fallback"
    assert result.level == pytest.approx(6.0)
    assert result.demand == pytest.approx(42.0)
    assert result.confidence == pytest.approx(0.16964285714285715)
    assert result.confidence <= 0.35


# ---------------------------------------------------------------------------
# Empty-history path
# ---------------------------------------------------------------------------


def test_forecast_empty_history():
    """Model_Prompt.md M3: "Handle the empty-history case: level = 0.0,
    confidence = 0.15, method = 'network_fallback'." usage=[]."""
    result = forecast("FAC-X", "O_POS", "RBC", [], AS_OF, horizon=7)

    assert result.n_days == 0
    assert result.method == "network_fallback"
    assert result.level == 0.0
    assert result.confidence == 0.15
    assert result.demand == 0.0


def test_forecast_empty_history_ignores_network_usage():
    """Even with network_usage supplied, an empty local `usage` list still
    takes the fixed empty-history result, not the n<14 network-rate path."""
    network_usage = _daily_usage("FAC-Y", "O_POS", "RBC", rate=6, n_days=10)
    result = forecast(
        "FAC-X", "O_POS", "RBC", [], AS_OF, horizon=7, network_usage=network_usage
    )

    assert result.level == 0.0
    assert result.confidence == 0.15
    assert result.method == "network_fallback"
