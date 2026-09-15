"""pipeline.py — run_pipeline, the single entry point Backend calls.

Orchestrates, per Model.md §6: forecast every line, allocate at-risk,
classify windows (inside fefo.allocate_at_risk, via window.classify),
assess shortages, generate candidates, gate, score, match, assemble the
summary. Model.md §5's summary dict keys are used exactly, no more, no
fewer.

Line derivation: a "line" is one (facility_id, blood_group, component)
triple. The set of lines processed is every triple with at least one LotIn
or UsageIn record in the snapshot -- Model.md does not require universal
coverage of every blood_group/component at every facility, only what the
snapshot's actual data supports. Lines are sorted before processing so
forecasts/lot_risks/shortages are always emitted in the same order for the
same snapshot, independent of any input list's own ordering (Model.md §2's
determinism requirement, and Model_Prompt.md's fixture 6: two consecutive
runs on the same snapshot must produce identical output, field by field).

matcher="flow" and forecaster="xgboost" raise NotImplementedError: they are
Phase 2 (Model.md M11/M12) and are not implemented yet. matcher="greedy"
and forecaster="ewma" are the only working options at this point in the
prompt sequence.
"""

from hemogrid_model.fefo import allocate_at_risk
from hemogrid_model.forecast import forecast as forecast_line
from hemogrid_model.match import match as match_greedy
from hemogrid_model.shortage import assess_shortage
from hemogrid_model.types import ForecastOut, LotRisk, NetworkSnapshot, PipelineResult, ShortageOut


def run_pipeline(
    snapshot: NetworkSnapshot,
    matcher: str = "greedy",
    forecaster: str = "ewma",
) -> PipelineResult:
    as_of = snapshot.as_of
    policies_by_component = {p.component: p for p in snapshot.policies}

    lines = sorted(
        {(lot.facility_id, lot.blood_group, lot.component) for lot in snapshot.lots}
        | {(u.facility_id, u.blood_group, u.component) for u in snapshot.usage}
    )

    forecasts: list[ForecastOut] = []
    lot_risks: list[LotRisk] = []
    shortages: list[ShortageOut] = []

    for facility_id, blood_group, component in lines:
        policy = policies_by_component.get(component)
        if policy is None:
            raise ValueError(f"no PolicyIn for component {component!r}")

        line_usage = [
            u for u in snapshot.usage
            if u.facility_id == facility_id and u.blood_group == blood_group and u.component == component
        ]
        line_lots = [
            lot for lot in snapshot.lots
            if lot.facility_id == facility_id and lot.blood_group == blood_group and lot.component == component
        ]

        if forecaster == "ewma":
            fc = forecast_line(
                facility_id, blood_group, component, line_usage, as_of,
                policy.forecast_horizon, network_usage=snapshot.usage,
            )
        elif forecaster == "xgboost":
            raise NotImplementedError(
                "forecaster='xgboost' is Phase 2 (Model.md M12) and is not implemented yet"
            )
        else:
            raise ValueError(f"unknown forecaster: {forecaster!r}")

        forecasts.append(fc)

        line_lot_risks = allocate_at_risk(line_lots, fc, policy, as_of)
        lot_risks.extend(line_lot_risks)

        shortages.append(assess_shortage(line_lots, fc, policy, as_of))

    if matcher == "greedy":
        recommendations, exclusions = match_greedy(
            snapshot.lots, lot_risks, shortages, snapshot.routes,
            snapshot.policies, forecasts, as_of,
        )
    elif matcher == "flow":
        raise NotImplementedError(
            "matcher='flow' is Phase 2 (Model.md M11) and is not implemented yet"
        )
    else:
        raise ValueError(f"unknown matcher: {matcher!r}")

    summary = {
        "total_units": sum(lot.units for lot in snapshot.lots),
        "total_lots": len(snapshot.lots),
        "at_risk_units": sum(lr.at_risk_units for lr in lot_risks),
        "rescuable_units": sum(
            lr.at_risk_units for lr in lot_risks if lr.window_state == "RESCUE_WINDOW"
        ),
        "facilities_with_gap": len({s.facility_id for s in shortages if s.gap_units > 0}),
        "total_gap_units": sum(s.gap_units for s in shortages),
        "recommendation_count": len(recommendations),
        "exclusion_count": len(exclusions),
        "addressable_units": sum(r.units for r in recommendations),
    }

    return PipelineResult(
        as_of=as_of,
        forecasts=forecasts,
        lot_risks=lot_risks,
        shortages=shortages,
        recommendations=recommendations,
        exclusions=exclusions,
        summary=summary,
    )
