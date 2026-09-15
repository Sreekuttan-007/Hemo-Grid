# hemogrid-model

Pure-Python computation engine for HemoGrid. Turns a snapshot of a blood network
into ranked, explained redistribution recommendations: demand forecasting,
expiry-risk allocation, rescue-window classification, shortage-risk calculation,
eligibility checks, rescue scoring, explanation generation, surplus-to-need
matching, and counterfactual simulation.

See `Model.md` (the package constitution, kept outside this directory) for the
full specification. Backend calls `run_pipeline` and `simulate_counterfactual`
from `hemogrid_model`; nothing else in this package is part of the public
interface.
