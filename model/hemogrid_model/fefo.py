"""fefo.py — expiry-risk allocation (First-Expiry-First-Out demand claiming).

Implements Model.md §6.2 exactly:

    lots sorted ASCENDING by expires_at
    carried = 0

    for lot i:
        T_i       = (lot.expires_at - as_of).days
        claimable = max(0, D(T_i) - carried)
        used_i    = min(lot.units, claimable)
        at_risk_i = lot.units - used_i
        carried  += used_i

    reserve_units = ceil(reserve_days * level)

    # Reserve is withheld from the LONGEST-dated lots, walking DESCENDING by
    # expiry, converting at_risk -> reserved until reserve_units is
    # satisfied. Deliberate and counterintuitive: near-dated units are the
    # ones worth moving, fresh ones are the ones worth keeping.

D(T_i) note: allocate_at_risk() only receives a ForecastOut, not the raw
usage that produced it, so the per-weekday dow multiplier that Model.md §6.1
defines D(H) with is not available for an arbitrary T_i != fc.horizon_days.
D(T_i) is therefore computed here as `fc.level * T_i` -- a flat daily-rate
reading of "D", using exactly the field named `level` in the formula. This
matches D(H) exactly whenever a line's dow index is uniform (n < 28 days of
history, or a genuinely flat usage pattern -- true of every fixture in
tests/fixtures.py), and is recorded here as the deliberate interpretation for
every other case, since Model.md does not specify how to evaluate D at a
T_i != H without the dow table available.

Rounding note: claimable/used_i are computed from a float (fc.level), but
LotIn.units and LotRisk.at_risk_units are integers. used_i is floored to the
nearest whole unit before being subtracted from lot.units or added to
`carried` -- under-crediting demand's claim on a lot (rather than
over-crediting it) errs toward flagging more units as at-risk, matching this
package's purpose of surfacing redistribution opportunities rather than
hiding them.

Tie-break note: Model.md does not specify a tie-break for lots sharing an
expires_at date. Per Model.md §2's determinism requirement (the same
principle match.py applies via its documented source_lot_id tie-break),
lot_id ascending is used as the secondary sort key throughout this module.
"""

import dataclasses
import math
from datetime import date

from hemogrid_model.types import ForecastOut, LotIn, LotRisk, PolicyIn
from hemogrid_model.window import classify


def _ascending_by_expiry(lots: list[LotIn]) -> list[LotIn]:
    """FEFO claiming order: nearest-expiry first, lot_id ascending tie-break."""
    return sorted(lots, key=lambda lot: (lot.expires_at, lot.lot_id))


def _descending_by_expiry(lots: list[LotIn]) -> list[LotIn]:
    """Reserve-withholding order: longest-dated first, lot_id ascending
    tie-break (only the expiry key is reversed, not the tie-break -- ties
    are not simply the mirror image of _ascending_by_expiry's order)."""
    return sorted(lots, key=lambda lot: (lot.expires_at.toordinal() * -1, lot.lot_id))


def allocate_at_risk(
    lots: list[LotIn], fc: ForecastOut, policy: PolicyIn, as_of: date
) -> list[LotRisk]:
    """Model.md §6.2, for the lots of a single line (one facility_id /
    blood_group / component triple -- the caller is responsible for having
    already filtered `lots` to one line, same as forecast()'s `usage`).

    Returns one LotRisk per input lot, in the same order as `lots`, with
    window_state filled in by window.classify() (a lot's window state
    depends only on its own at_risk_units and days_to_expiry, both computed
    here first).
    """
    days_to_expiry: dict[str, int] = {}
    raw_at_risk: dict[str, int] = {}
    carried = 0.0

    for lot in _ascending_by_expiry(lots):
        T_i = (lot.expires_at - as_of).days
        demand_at_t = fc.level * T_i
        claimable = max(0.0, demand_at_t - carried)
        used_i = max(0, math.floor(min(lot.units, claimable)))
        raw_at_risk[lot.lot_id] = lot.units - used_i
        days_to_expiry[lot.lot_id] = T_i
        carried += used_i

    reserve_units = math.ceil(policy.reserve_days * fc.level)
    reserved: dict[str, int] = {lot.lot_id: 0 for lot in lots}
    remaining_reserve = reserve_units

    for lot in _descending_by_expiry(lots):
        if remaining_reserve <= 0:
            break
        available = raw_at_risk[lot.lot_id]
        take = min(available, remaining_reserve)
        if take > 0:
            raw_at_risk[lot.lot_id] -= take
            reserved[lot.lot_id] = take
            remaining_reserve -= take

    results = []
    for lot in lots:
        partial = LotRisk(
            lot_id=lot.lot_id,
            facility_id=lot.facility_id,
            blood_group=lot.blood_group,
            component=lot.component,
            units=lot.units,
            at_risk_units=raw_at_risk[lot.lot_id],
            reserved_units=reserved[lot.lot_id],
            days_to_expiry=days_to_expiry[lot.lot_id],
            window_state="NORMAL",  # placeholder; classify() recomputes it
        )
        results.append(dataclasses.replace(partial, window_state=classify(partial, policy)))
    return results
