"""match.py — greedy surplus-to-need matcher (default).

Implements Model.md §6.8 exactly:

    candidates = []
    for lot where window_state == RESCUE_WINDOW and at_risk_units > 0:
        for shortage line where gap_units > 0 and same blood_group and component:
            gate_result = eligibility(lot, line)
            if gate_result.ok: candidates.append(scored candidate)
            else:              exclusions.append(ExclusionOut)

    sort candidates by rescue_score DESC, then by source_lot_id ASC   # tie-break for determinism

    for c in candidates:
        q = min(remaining_at_risk[lot], remaining_gap[dest])
        if q >= 1:
            emit RecommendationOut(units=q)
            remaining_at_risk[lot] -= q
            remaining_gap[dest]    -= q

Returns BOTH the emitted recommendations AND the exclusions with their gate
reason codes -- the frontend displays exclusions as a first-class output,
not debug information.

Candidate scoring quantity note: a "scored candidate" is built once, before
the final greedy allocation loop even knows how much of a lot's
at_risk_units or a destination's gap_units will still be available once
higher-scored candidates have already claimed some of that same shared
pool. Each candidate is therefore gated and scored using a provisional
quantity -- the largest transfer this lot/destination pair could support in
isolation:

    qty_provisional = min(lot_risk.at_risk_units, shortage.gap_units)

rescue_score, factors, explanation and checks are all computed once, from
this provisional quantity, at candidate-generation time. The final greedy
loop only ever recomputes `q` (per Model.md's own pseudocode: "emit
RecommendationOut(units=q)"), which can end up smaller than qty_provisional
once shared pools have been partly claimed by earlier, higher-scored
candidates -- exactly as specified. A candidate is simply skipped (q < 1)
past this point; nothing is re-gated or re-scored against the smaller q.

Self-facility matches: Model.md's pseudocode does not exclude a lot whose
own facility is also the destination facility. That is not explicitly
guarded against here either, staying literal to the pseudocode; in
practice G6 (no route / not cold-chain-capable) fails such a pair whenever
the snapshot's routes do not include a self-to-self entry, which is the
expected shape of real route data.
"""

from datetime import date
from typing import NamedTuple, Optional

from hemogrid_model.eligibility import check
from hemogrid_model.explain import explain
from hemogrid_model.score import score
from hemogrid_model.types import (
    Explanation,
    ExclusionOut,
    ForecastOut,
    GateCheck,
    LotIn,
    LotRisk,
    PolicyIn,
    RecommendationOut,
    RouteIn,
    ScoreFactors,
    ShortageOut,
)


class _Candidate(NamedTuple):
    lot: LotIn
    lot_risk: LotRisk
    shortage: ShortageOut
    route: RouteIn
    qty_provisional: int
    rescue_score: int
    factors: ScoreFactors
    explanation: Explanation
    checks: list[GateCheck]


def match(
    lots: list[LotIn],
    lot_risks: list[LotRisk],
    shortages: list[ShortageOut],
    routes: list[RouteIn],
    policies: list[PolicyIn],
    forecasts: list[ForecastOut],
    as_of: date,
) -> tuple[list[RecommendationOut], list[ExclusionOut]]:
    """Model.md §6.8. Returns (recommendations, exclusions)."""
    lots_by_id = {lot.lot_id: lot for lot in lots}
    policies_by_component = {p.component: p for p in policies}
    routes_by_pair: dict[tuple[str, str], RouteIn] = {(r.from_id, r.to_id): r for r in routes}
    forecasts_by_line = {(f.facility_id, f.blood_group, f.component): f for f in forecasts}

    # Deterministic outer iteration order, independent of the caller's own
    # list ordering (Model.md §2's determinism requirement).
    rescue_window_lots = sorted(
        (lr for lr in lot_risks if lr.window_state == "RESCUE_WINDOW" and lr.at_risk_units > 0),
        key=lambda lr: lr.lot_id,
    )
    gap_shortages = sorted(
        (s for s in shortages if s.gap_units > 0),
        key=lambda s: (s.facility_id, s.blood_group, s.component),
    )

    candidates: list[_Candidate] = []
    exclusions: list[ExclusionOut] = []

    for lot_risk in rescue_window_lots:
        lot = lots_by_id[lot_risk.lot_id]
        policy = policies_by_component.get(lot_risk.component)
        if policy is None:
            raise ValueError(f"no PolicyIn for component {lot_risk.component!r}")

        for shortage in gap_shortages:
            if shortage.blood_group != lot_risk.blood_group or shortage.component != lot_risk.component:
                continue

            route: Optional[RouteIn] = routes_by_pair.get((lot.facility_id, shortage.facility_id))
            qty_provisional = min(lot_risk.at_risk_units, shortage.gap_units)

            ok, checks = check(lot, lot_risk, shortage, route, policy, qty_provisional, as_of)

            if not ok:
                exclusions.append(
                    ExclusionOut(
                        source_lot_id=lot.lot_id,
                        source_facility_id=lot.facility_id,
                        dest_facility_id=shortage.facility_id,
                        blood_group=lot.blood_group,
                        component=lot.component,
                        failed_codes=[c.code for c in checks if not c.passed],
                        checks=checks,
                    )
                )
                continue

            conf_source = forecasts_by_line[(lot.facility_id, lot.blood_group, lot.component)].confidence
            conf_dest = forecasts_by_line[
                (shortage.facility_id, shortage.blood_group, shortage.component)
            ].confidence

            rescue_score, factors = score(
                lot, lot_risk, shortage, route, policy, qty_provisional,
                conf_source, conf_dest, gate=1,
            )
            explanation = explain(factors)

            candidates.append(
                _Candidate(
                    lot=lot,
                    lot_risk=lot_risk,
                    shortage=shortage,
                    route=route,
                    qty_provisional=qty_provisional,
                    rescue_score=rescue_score,
                    factors=factors,
                    explanation=explanation,
                    checks=checks,
                )
            )

    # Required tie-break for determinism (Model.md §6.8): without it, equal
    # scores order non-deterministically and the rehearsed demo changes
    # between runs.
    candidates.sort(key=lambda c: (-c.rescue_score, c.lot.lot_id))

    remaining_at_risk = {lr.lot_id: lr.at_risk_units for lr in rescue_window_lots}
    remaining_gap = {(s.facility_id, s.blood_group, s.component): s.gap_units for s in gap_shortages}

    recommendations: list[RecommendationOut] = []
    for c in candidates:
        dest_key = (c.shortage.facility_id, c.shortage.blood_group, c.shortage.component)
        q = min(remaining_at_risk[c.lot.lot_id], remaining_gap[dest_key])
        if q >= 1:
            recommendations.append(
                RecommendationOut(
                    source_lot_id=c.lot.lot_id,
                    source_facility_id=c.lot.facility_id,
                    dest_facility_id=c.shortage.facility_id,
                    blood_group=c.lot.blood_group,
                    component=c.lot.component,
                    units=q,
                    rescue_score=c.rescue_score,
                    transit_hours=c.route.transit_hours,
                    factors=c.factors,
                    explanation=c.explanation,
                    checks=c.checks,
                )
            )
            remaining_at_risk[c.lot.lot_id] -= q
            remaining_gap[dest_key] -= q

    return recommendations, exclusions
