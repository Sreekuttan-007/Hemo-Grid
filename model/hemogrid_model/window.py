"""window.py — rescue-window state classification.

Implements Model.md §6.3's per-lot classification exactly:

    T = (lot.expires_at - as_of).days

    at_risk_units == 0                          -> NORMAL
    T >  window_open_days                       -> WATCH
    window_close_days <= T <= window_open_days   -> RESCUE_WINDOW
    T <  window_close_days                       -> UNRESCUABLE

The per-destination "does the window survive the trip" check --
`T - ceil(transit_hours / 24) >= window_close_days` -- needs a RouteIn and is
not part of this per-lot classification; it belongs to eligibility.py's G1
gate (Model.md §6.5), which has access to a route.
"""

from hemogrid_model.enums import NORMAL, RESCUE_WINDOW, UNRESCUABLE, WATCH
from hemogrid_model.types import LotRisk, PolicyIn


def classify(lot_risk: LotRisk, policy: PolicyIn) -> str:
    """Model.md §6.3. Reads only days_to_expiry and at_risk_units off
    lot_risk; any existing lot_risk.window_state value is ignored, never
    read (fefo.py passes in a placeholder before calling this)."""
    if lot_risk.at_risk_units == 0:
        return NORMAL

    T = lot_risk.days_to_expiry
    if T > policy.window_open_days:
        return WATCH
    if policy.window_close_days <= T <= policy.window_open_days:
        return RESCUE_WINDOW
    if T < policy.window_close_days:
        return UNRESCUABLE

    # Unreachable when window_close_days <= window_open_days (assumed of
    # every PolicyIn); guarded rather than silently mis-scoring a lot.
    raise ValueError(
        f"window classification is undefined for T={T} with "
        f"window_open_days={policy.window_open_days}, "
        f"window_close_days={policy.window_close_days} "
        "(requires window_close_days <= window_open_days)"
    )
