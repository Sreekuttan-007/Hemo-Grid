"""shortage.py — destination shortage risk and tier.

Implements Model.md §6.4 exactly:

    H             = policy.forecast_horizon
    usable_units  = on-hand units that will not expire before they'd be
                    needed within H
    reserve_units = ceil(reserve_days * level)
    gap_units     = max(0, D(H) + reserve_units - usable_units)
    shortage_risk = clamp(gap_units / (D(H) + reserve_units), 0, 1)

    tier:
      gap == 0 and usable >= 1.5 * reserve   -> STABLE
      gap == 0                                -> WATCH
      shortage_risk <= 0.4                    -> HIGH
      shortage_risk >  0.4                    -> CRITICAL

usable_units note: a lot expiring AFTER the horizon H is unconditionally
usable (it cannot be wasted within the H-day window this function cares
about, whatever its own longer-run expiry risk). A lot expiring WITHIN H is
usable only for the units FEFO demand reaches before it expires -- exactly
fefo.allocate_at_risk()'s at_risk_units concept, ascending by expiry, so
that computation is reused here rather than re-derived: excluding lots with
days_to_expiry > H from the "at risk" tally does not change any other lot's
at_risk_units, because ascending order always processes shorter-dated lots
first regardless of what comes after them in the queue.

    usable_units = total_units - sum(at_risk_units for lots with T_i <= H)

D(H) note: like fefo.py, this function only receives a ForecastOut, not the
raw usage/dow table needed to recompute D at an arbitrary horizon. Unlike
fefo.py's per-lot T_i (which rarely equals fc.horizon_days), D(H) here is
exact rather than approximated: assess_shortage requires fc.horizon_days to
already equal H (=policy.forecast_horizon), i.e. the caller must have built
fc via forecast(..., horizon=policy.forecast_horizon, ...) -- pipeline.py's
calling convention, enforced in M9. Under that precondition fc.demand IS
D(H) exactly (forecast.py computed it with the real dow table), so it is
used directly instead of a flat-rate approximation. A mismatch raises rather
than silently producing a wrong gap.
"""

import math
from datetime import date

from hemogrid_model.enums import CRITICAL, HIGH, STABLE
from hemogrid_model.enums import WATCH as SHORTAGE_WATCH
from hemogrid_model.fefo import allocate_at_risk
from hemogrid_model.types import ForecastOut, LotIn, PolicyIn, ShortageOut


def assess_shortage(
    lots: list[LotIn], fc: ForecastOut, policy: PolicyIn, as_of: date
) -> ShortageOut:
    """Model.md §6.4, for the lots of a single line (one facility_id /
    blood_group / component triple, matching `fc`)."""
    H = policy.forecast_horizon
    if fc.horizon_days != H:
        raise ValueError(
            f"assess_shortage requires fc.horizon_days ({fc.horizon_days}) == "
            f"policy.forecast_horizon ({H}); D(H) is read directly off fc.demand "
            "and is only exact when the two agree."
        )
    demand_h = fc.demand  # D(H), exact under the precondition above

    lot_risks = allocate_at_risk(lots, fc, policy, as_of)
    total_units = sum(lot.units for lot in lots)
    unusable_within_h = sum(lr.at_risk_units for lr in lot_risks if lr.days_to_expiry <= H)
    usable_units = total_units - unusable_within_h

    reserve_units = math.ceil(policy.reserve_days * fc.level)
    # gap_units is a count of units; demand_h is a float forecast, so round up
    # to the nearest whole unit rather than truncating a partial unit of gap
    # away (under-reporting a shortage is the wrong direction to round in).
    gap_units = max(0, math.ceil(demand_h + reserve_units - usable_units))

    denom = demand_h + reserve_units
    if denom > 0:
        shortage_risk = min(max(gap_units / denom, 0.0), 1.0)
    else:
        # No demand and no reserve target: gap_units is necessarily 0 here
        # (usable_units >= 0 always), so this is a 0/0 case -- no risk.
        shortage_risk = 0.0

    if gap_units == 0 and usable_units >= 1.5 * reserve_units:
        tier = STABLE
    elif gap_units == 0:
        tier = SHORTAGE_WATCH
    elif shortage_risk <= 0.4:
        tier = HIGH
    else:
        tier = CRITICAL

    return ShortageOut(
        facility_id=fc.facility_id,
        blood_group=fc.blood_group,
        component=fc.component,
        horizon_days=H,
        usable_units=usable_units,
        forecast_demand=demand_h,
        reserve_units=reserve_units,
        gap_units=gap_units,
        shortage_risk=shortage_risk,
        tier=tier,
    )
