"""tests/test_pipeline.py — run_pipeline() (Model.md §6, the integration
checkpoint) against fixture 6 and a richer end-to-end scenario.

Fixture 6 (Model.md §8 case 6) is a determinism check, not an arithmetic
one: its demand is tight enough that nothing ends up at_risk, so it never
exercises match.py's recommendation path. A second, locally-built scenario
below (mirroring the one used to hand-verify match.py/pipeline.py's wiring
before this file was written) is used to cover recommendations,
exclusions, and the summary contract end-to-end.
"""

import dataclasses
from datetime import date, timedelta

import pytest

from hemogrid_model import run_pipeline
from hemogrid_model.types import (
    FacilityIn,
    LotIn,
    NetworkSnapshot,
    PolicyIn,
    RouteIn,
    UsageIn,
)
from fixtures import AS_OF, fixture_6_pipeline_determinism_snapshot

REQUIRED_SUMMARY_KEYS = {
    "total_units", "total_lots", "at_risk_units", "rescuable_units",
    "facilities_with_gap", "total_gap_units", "recommendation_count",
    "exclusion_count", "addressable_units",
}


# ---------------------------------------------------------------------------
# Fixture 6 (Model.md §8 case 6): two runs, identical output, field by field
# ---------------------------------------------------------------------------


def test_fixture_6_two_runs_identical_field_by_field():
    snapshot = fixture_6_pipeline_determinism_snapshot()
    r1 = run_pipeline(snapshot)
    r2 = run_pipeline(snapshot)

    assert r1.as_of == r2.as_of
    assert r1.forecasts == r2.forecasts
    assert r1.lot_risks == r2.lot_risks
    assert r1.shortages == r2.shortages
    assert r1.recommendations == r2.recommendations
    assert r1.exclusions == r2.exclusions
    assert r1.summary == r2.summary
    # whole-object equality too, as a final cross-check
    assert r1 == r2


def test_fixture_6_summary_has_exactly_the_required_keys():
    snapshot = fixture_6_pipeline_determinism_snapshot()
    result = run_pipeline(snapshot)
    assert set(result.summary.keys()) == REQUIRED_SUMMARY_KEYS


def test_fixture_6_runs_without_error_and_reflects_no_at_risk_units():
    """Documents why fixture 6 alone cannot cover the recommendation path:
    its usage rate is high enough that FEFO claims every on-hand unit
    before it expires (see fixtures.py's own docstring)."""
    snapshot = fixture_6_pipeline_determinism_snapshot()
    result = run_pipeline(snapshot)
    assert result.summary["at_risk_units"] == 0
    assert result.summary["recommendation_count"] == 0


# ---------------------------------------------------------------------------
# End-to-end scenario with a genuine rescue opportunity
# ---------------------------------------------------------------------------


def _rescue_scenario_snapshot() -> NetworkSnapshot:
    """FAC-X: a large near-expiry lot with low local usage (surplus).
    FAC-Y: thin stock with high local usage (shortage). A cold-chain route
    connects them. No route exists from either facility to itself.
    """
    facilities = [
        FacilityIn(facility_id="FAC-X", code="X", name="Surplus", tier="HOSPITAL", lat=0.0, lng=0.0),
        FacilityIn(facility_id="FAC-Y", code="Y", name="Shortage", tier="HOSPITAL", lat=1.0, lng=1.0),
    ]
    lots = [
        LotIn(
            lot_id="LOT-X1", trace_id="TR-X1", facility_id="FAC-X", blood_group="O_POS",
            component="RBC", units=30, collected_at=AS_OF - timedelta(days=1),
            expires_at=AS_OF + timedelta(days=6), storage_status="OK",
        ),
        LotIn(
            lot_id="LOT-Y1", trace_id="TR-Y1", facility_id="FAC-Y", blood_group="O_POS",
            component="RBC", units=2, collected_at=AS_OF - timedelta(days=1),
            expires_at=AS_OF + timedelta(days=25), storage_status="OK",
        ),
    ]
    usage = []
    for d in range(1, 21):
        usage.append(UsageIn(
            facility_id="FAC-X", date=AS_OF - timedelta(days=d), blood_group="O_POS",
            component="RBC", units=1, kind="ROUTINE",
        ))
        usage.append(UsageIn(
            facility_id="FAC-Y", date=AS_OF - timedelta(days=d), blood_group="O_POS",
            component="RBC", units=6, kind="ROUTINE",
        ))
    routes = [RouteIn(from_id="FAC-X", to_id="FAC-Y", transit_hours=12.0, cold_chain_capable=True)]
    policies = [PolicyIn(
        component="RBC", shelf_life_days=42, window_open_days=10,
        window_close_days=3, forecast_horizon=14, reserve_days=1,
    )]
    return NetworkSnapshot(
        as_of=AS_OF, facilities=facilities, lots=lots, usage=usage,
        routes=routes, policies=policies,
    )


def test_rescue_scenario_produces_a_recommendation_with_full_detail():
    snapshot = _rescue_scenario_snapshot()
    result = run_pipeline(snapshot)

    assert len(result.recommendations) >= 1
    rec = result.recommendations[0]
    assert rec.source_lot_id == "LOT-X1"
    assert rec.dest_facility_id == "FAC-Y"
    assert rec.units >= 1
    assert 0 <= rec.rescue_score <= 100
    # Definition of Done: every recommendation carries full factors,
    # explanation and all 8 checks (all passed, since it was emitted).
    assert len(rec.checks) == 8
    assert all(c.passed for c in rec.checks)
    assert rec.factors is not None
    assert rec.explanation.why_source and rec.explanation.why_destination
    assert rec.explanation.why_quantity and rec.explanation.why_now


def test_rescue_scenario_self_facility_match_is_excluded_via_g6():
    """LOT-X1's own facility (FAC-X) also has a shortage line (its own
    usage draws down its own thin remaining stock), which would generate a
    same-facility candidate -- excluded because no FAC-X -> FAC-X route
    exists, exactly as match.py documents (no explicit self-match guard is
    needed; G6 handles it)."""
    snapshot = _rescue_scenario_snapshot()
    result = run_pipeline(snapshot)

    self_matches = [e for e in result.exclusions if e.dest_facility_id == "FAC-X"]
    assert len(self_matches) == 1
    assert self_matches[0].failed_codes == ["G6"]


def test_rescue_scenario_two_runs_identical():
    snapshot = _rescue_scenario_snapshot()
    r1 = run_pipeline(snapshot)
    r2 = run_pipeline(snapshot)
    assert r1 == r2


def test_rescue_scenario_order_independent():
    """Reversing the input lots/usage lists must not change the output --
    pipeline.py sorts lines internally rather than depending on input order."""
    snapshot = _rescue_scenario_snapshot()
    reordered = dataclasses.replace(
        snapshot, lots=list(reversed(snapshot.lots)), usage=list(reversed(snapshot.usage))
    )
    r1 = run_pipeline(snapshot)
    r2 = run_pipeline(reordered)
    assert r1 == r2


def test_summary_addressable_units_matches_recommendation_units_sum():
    snapshot = _rescue_scenario_snapshot()
    result = run_pipeline(snapshot)
    assert result.summary["addressable_units"] == sum(r.units for r in result.recommendations)
    assert result.summary["recommendation_count"] == len(result.recommendations)
    assert result.summary["exclusion_count"] == len(result.exclusions)


# ---------------------------------------------------------------------------
# matcher/forecaster flags
# ---------------------------------------------------------------------------


def test_unimplemented_matcher_and_forecaster_raise_not_implemented():
    """Phase 2 options (Model.md M11/M12) are not implemented at this point
    in the prompt sequence; they must fail loudly, not silently fall back."""
    snapshot = fixture_6_pipeline_determinism_snapshot()
    with pytest.raises(NotImplementedError):
        run_pipeline(snapshot, matcher="flow")
    with pytest.raises(NotImplementedError):
        run_pipeline(snapshot, forecaster="xgboost")


def test_unknown_matcher_and_forecaster_raise_value_error():
    snapshot = fixture_6_pipeline_determinism_snapshot()
    with pytest.raises(ValueError):
        run_pipeline(snapshot, matcher="nonexistent")
    with pytest.raises(ValueError):
        run_pipeline(snapshot, forecaster="nonexistent")
