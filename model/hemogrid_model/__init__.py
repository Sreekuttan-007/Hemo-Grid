"""hemogrid_model — HemoGrid computation engine.

Public interface: run_pipeline and simulate_counterfactual. Nothing else in
this package is meant to be imported directly by Backend.

simulate_counterfactual is not exported yet: counterfactual.py (Model.md
M10) is still an empty stub at this point in the prompt sequence. Exporting
a name that does not exist would break `import hemogrid_model` entirely, so
that export is added here once M10 implements it.
"""

from hemogrid_model.pipeline import run_pipeline

__all__ = ["run_pipeline"]
