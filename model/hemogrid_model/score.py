"""score.py — rescue score and its full factor breakdown.

Implements Model.md §6.6 exactly:

    time_pressure = clamp((window_open - T) / (window_open - window_close), 0, 1)
    ER   = (at_risk_units / lot.units) * time_pressure
    SR   = destination shortage_risk
    FEAS = clamp(1 - transit_hours / ((T - window_close) * 24), 0, 1)
    COV  = min(qty / gap_units, 1)

    raw  = 0.35*ER + 0.30*SR + 0.15*FEAS + 0.20*COV
    damp = 0.6 + 0.4 * min(conf_source, conf_dest)

    rescue_score = round(100 * raw * damp * gate)

Every term, every weighted contribution and every raw input behind the
formula is recorded on the returned ScoreFactors -- score() and explain()
(explain.py) both read from that same object, neither recomputes.

Signature note: Model.md's M8 prompt does not name an explicit public
signature for score() (unlike forecast()/allocate_at_risk()/check()). This
mirrors eligibility.check()'s parameter shape (lot, lot_risk, shortage,
route, policy, qty) plus the three additional scalars the formula needs
that check() does not use: conf_source, conf_dest (each line's forecast
confidence) and gate (0 or 1 -- eligibility.check()'s ok result as an int,
passed in by the caller rather than recomputed here, so the gate decision
that produced an ExclusionOut vs. a scored candidate is made exactly once).
`as_of` is dropped: every value the formula needs is already present on
lot_risk/policy/route/shortage without being recomputed from a date.

Edge cases Model.md does not address, handled defensively and documented at
each site below: window_open_days == window_close_days (division by zero in
time_pressure -- raised, since this is a policy misconfiguration), T ==
window_close_days (division by zero in FEAS -- the lot is at the very edge
of its rescue window with zero transit buffer left, treated as infeasible),
lot.units == 0, and gap_units <= 0.
"""

from hemogrid_model.types import LotIn, LotRisk, PolicyIn, RouteIn, ScoreFactors, ShortageOut

WEIGHT_ER = 0.35
WEIGHT_SR = 0.30
WEIGHT_FEAS = 0.15
WEIGHT_COV = 0.20


def _clamp(x: float, lo: float, hi: float) -> float:
    return min(max(x, lo), hi)


def score(
    lot: LotIn,
    lot_risk: LotRisk,
    shortage: ShortageOut,
    route: RouteIn,
    policy: PolicyIn,
    qty: int,
    conf_source: float,
    conf_dest: float,
    gate: int,
) -> tuple[int, ScoreFactors]:
    """Model.md §6.6. Returns (rescue_score, factors); factors carries every
    number the formula used, for explain() to read from afterward."""
    T = lot_risk.days_to_expiry
    window_open = policy.window_open_days
    window_close = policy.window_close_days
    at_risk_units = lot_risk.at_risk_units
    lot_units = lot.units
    transit_hours = route.transit_hours
    gap_units = shortage.gap_units

    open_close_span = window_open - window_close
    if open_close_span <= 0:
        raise ValueError(
            f"score() requires window_open_days ({window_open}) > "
            f"window_close_days ({window_close})"
        )
    time_pressure = _clamp((window_open - T) / open_close_span, 0.0, 1.0)

    er = (at_risk_units / lot_units) * time_pressure if lot_units > 0 else 0.0

    sr = shortage.shortage_risk

    feas_denom = (T - window_close) * 24
    if feas_denom <= 0:
        # T == window_close_days: the lot is on the very last day of its
        # rescue window, so no transit buffer remains at all -- treated as
        # infeasible rather than dividing by zero.
        feas = 0.0
    else:
        feas = _clamp(1 - transit_hours / feas_denom, 0.0, 1.0)

    cov = 1.0 if gap_units <= 0 else min(qty / gap_units, 1.0)

    contrib_er = WEIGHT_ER * er
    contrib_sr = WEIGHT_SR * sr
    contrib_feas = WEIGHT_FEAS * feas
    contrib_cov = WEIGHT_COV * cov
    raw = contrib_er + contrib_sr + contrib_feas + contrib_cov

    damp = 0.6 + 0.4 * min(conf_source, conf_dest)

    rescue_score = round(100 * raw * damp * gate)

    factors = ScoreFactors(
        er=er,
        sr=sr,
        feas=feas,
        cov=cov,
        damp=damp,
        gate=gate,
        contrib_er=contrib_er,
        contrib_sr=contrib_sr,
        contrib_feas=contrib_feas,
        contrib_cov=contrib_cov,
        raw=raw,
        inputs={
            "at_risk_units": at_risk_units,
            "lot_units": lot_units,
            "days_to_expiry": T,
            "window_open": window_open,
            "window_close": window_close,
            "transit_hours": transit_hours,
            "gap_units": gap_units,
            "qty": qty,
            "conf_source": conf_source,
            "conf_dest": conf_dest,
            "time_pressure": time_pressure,
        },
    )
    return rescue_score, factors
