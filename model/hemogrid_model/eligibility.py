"""eligibility.py — the 8 eligibility gates.

Implements Model.md §6.5's table exactly, including its Label column
(rendered verbatim by the frontend):

    Code | Check                                                            | Label
    G1   | expires_at present and T - transit_days >= window_close_days    | Expiry window survives transit
    G2   | storage_status == "OK"                                          | Storage condition acceptable
    G3   | component matches exactly                                      | Component match
    G4   | blood group identical (this build)                             | Blood group compatible
    G5   | trace_id present and non-empty                                 | Traceability available
    G6   | a RouteIn exists and cold_chain_capable                        | Cold-chain route available
    G7   | source still meets its own reserve after transfer              | Source reserve preserved
    G8   | 1 <= qty <= at_risk_units                                       | Quantity within available surplus

Any failure -> ExclusionOut, never a score (enforced by match.py, which only
scores candidates whose check() returns ok=True). Every call here returns
all eight GateCheck objects, passed or failed, in G1..G8 order -- the
frontend renders all eight as a checklist, not just the failures.

G1 note: T is recomputed here as (lot.expires_at - as_of).days rather than
trusting a passed-in LotRisk.days_to_expiry, since as_of is a parameter of
this function and G1's own formula is defined directly in terms of it. When
no route is available (route=None), transit_days is treated as 0 (no known
transit delay), so G1 independently reflects only the lot's own
expiry-vs-window survivability -- G6 is the gate responsible for failing on
a missing route.

G7 note ("source still meets its own reserve after transfer"): check() does
not receive the source facility's own ShortageOut, only `lot_risk` (whose
reserved_units already records what fefo.py carved out to protect the
source's reserve). The most literal, self-contained reading of the check
given that signature is: after removing qty units from the lot, the lot
must still hold at least its reserved_units:

    lot.units - qty >= lot_risk.reserved_units
"""

import math
from datetime import date

from hemogrid_model.enums import OK
from hemogrid_model.types import GateCheck, LotIn, LotRisk, PolicyIn, RouteIn, ShortageOut

_LABELS = {
    "G1": "Expiry window survives transit",
    "G2": "Storage condition acceptable",
    "G3": "Component match",
    "G4": "Blood group compatible",
    "G5": "Traceability available",
    "G6": "Cold-chain route available",
    "G7": "Source reserve preserved",
    "G8": "Quantity within available surplus",
}


def _check_g1(lot: LotIn, route: RouteIn | None, policy: PolicyIn, as_of: date) -> GateCheck:
    if lot.expires_at is None:
        return GateCheck(code="G1", label=_LABELS["G1"], passed=False, detail="expires_at is missing")
    T = (lot.expires_at - as_of).days
    transit_days = math.ceil(route.transit_hours / 24) if route is not None else 0
    passed = (T - transit_days) >= policy.window_close_days
    detail = (
        f"T={T} - transit_days={transit_days} = {T - transit_days} "
        f"{'>=' if passed else '<'} window_close_days={policy.window_close_days}"
    )
    return GateCheck(code="G1", label=_LABELS["G1"], passed=passed, detail=detail)


def _check_g2(lot: LotIn) -> GateCheck:
    passed = lot.storage_status == OK
    return GateCheck(code="G2", label=_LABELS["G2"], passed=passed, detail=f"storage_status={lot.storage_status!r}")


def _check_g3(lot: LotIn, shortage: ShortageOut) -> GateCheck:
    passed = lot.component == shortage.component
    detail = f"lot.component={lot.component!r}, shortage.component={shortage.component!r}"
    return GateCheck(code="G3", label=_LABELS["G3"], passed=passed, detail=detail)


def _check_g4(lot: LotIn, shortage: ShortageOut) -> GateCheck:
    passed = lot.blood_group == shortage.blood_group
    detail = f"lot.blood_group={lot.blood_group!r}, shortage.blood_group={shortage.blood_group!r}"
    return GateCheck(code="G4", label=_LABELS["G4"], passed=passed, detail=detail)


def _check_g5(lot: LotIn) -> GateCheck:
    passed = bool(lot.trace_id and lot.trace_id.strip())
    return GateCheck(code="G5", label=_LABELS["G5"], passed=passed, detail=f"trace_id={lot.trace_id!r}")


def _check_g6(route: RouteIn | None) -> GateCheck:
    passed = route is not None and route.cold_chain_capable
    detail = "no route available" if route is None else f"cold_chain_capable={route.cold_chain_capable}"
    return GateCheck(code="G6", label=_LABELS["G6"], passed=passed, detail=detail)


def _check_g7(lot: LotIn, lot_risk: LotRisk, qty: int) -> GateCheck:
    remaining = lot.units - qty
    passed = remaining >= lot_risk.reserved_units
    detail = f"units({lot.units}) - qty({qty}) = {remaining} vs reserved_units={lot_risk.reserved_units}"
    return GateCheck(code="G7", label=_LABELS["G7"], passed=passed, detail=detail)


def _check_g8(lot_risk: LotRisk, qty: int) -> GateCheck:
    passed = 1 <= qty <= lot_risk.at_risk_units
    detail = f"qty={qty}, at_risk_units={lot_risk.at_risk_units}"
    return GateCheck(code="G8", label=_LABELS["G8"], passed=passed, detail=detail)


def check(
    lot: LotIn,
    lot_risk: LotRisk,
    shortage: ShortageOut,
    route: RouteIn | None,
    policy: PolicyIn,
    qty: int,
    as_of: date,
) -> tuple[bool, list[GateCheck]]:
    """Model.md §6.5. Always returns all eight GateCheck objects, passed or
    failed, in G1..G8 order."""
    checks = [
        _check_g1(lot, route, policy, as_of),
        _check_g2(lot),
        _check_g3(lot, shortage),
        _check_g4(lot, shortage),
        _check_g5(lot),
        _check_g6(route),
        _check_g7(lot, lot_risk, qty),
        _check_g8(lot_risk, qty),
    ]
    ok = all(c.passed for c in checks)
    return ok, checks
