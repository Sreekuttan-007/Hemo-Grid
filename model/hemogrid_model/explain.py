"""explain.py — plain-English rescue-recommendation explanations.

Implements Model.md §6.7: explain(factors) takes only the ScoreFactors
object already built by score.py, reads exclusively from factors.inputs,
and does not recompute anything or receive the lot or destination directly.
Four plain sentences, each naming a real number from factors.inputs, no
jargon, no em-dashes, no hedging language.
"""

from hemogrid_model.types import Explanation, ScoreFactors


def explain(factors: ScoreFactors) -> Explanation:
    """Model.md §6.7."""
    i = factors.inputs

    why_source = (
        f"This lot has {i['at_risk_units']} of its {i['lot_units']} units "
        f"at risk of expiring in {i['days_to_expiry']} days."
    )
    why_destination = f"The destination site is short by {i['gap_units']} units."
    why_quantity = (
        f"Sending {i['qty']} units stays within the {i['at_risk_units']} units "
        f"this lot can spare and helps cover the {i['gap_units']}-unit shortfall "
        f"at the destination."
    )
    why_now = (
        f"The trip takes about {i['transit_hours']:g} hours, and with only "
        f"{i['days_to_expiry']} days left before this lot expires, it needs to "
        f"ship before day {i['window_close']} to arrive in time."
    )

    return Explanation(
        why_source=why_source,
        why_destination=why_destination,
        why_quantity=why_quantity,
        why_now=why_now,
    )
