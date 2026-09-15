from dataclasses import dataclass, field
from datetime import date
from typing import Optional

# ---------- INPUTS ----------

@dataclass(frozen=True)
class FacilityIn:
    facility_id: str
    code: str
    name: str
    tier: str              # REGIONAL_CENTRE | HOSPITAL | DISTRICT
    lat: float
    lng: float

@dataclass(frozen=True)
class LotIn:
    lot_id: str
    trace_id: str
    facility_id: str
    blood_group: str       # O_POS | O_NEG | A_POS | A_NEG | B_POS | B_NEG | AB_POS | AB_NEG
    component: str         # RBC | PLATELETS | PLASMA
    units: int
    collected_at: date
    expires_at: date
    storage_status: str    # OK | ANOMALY | UNKNOWN

@dataclass(frozen=True)
class UsageIn:
    facility_id: str
    date: date
    blood_group: str
    component: str
    units: int
    kind: str              # ROUTINE | EMERGENCY

@dataclass(frozen=True)
class RouteIn:
    from_id: str
    to_id: str
    transit_hours: float
    cold_chain_capable: bool

@dataclass(frozen=True)
class PolicyIn:
    component: str
    shelf_life_days: int
    window_open_days: int
    window_close_days: int
    forecast_horizon: int
    reserve_days: int

@dataclass(frozen=True)
class NetworkSnapshot:
    as_of: date
    facilities: list[FacilityIn]
    lots: list[LotIn]
    usage: list[UsageIn]
    routes: list[RouteIn]
    policies: list[PolicyIn]

# ---------- OUTPUTS ----------

@dataclass(frozen=True)
class ForecastOut:
    facility_id: str
    blood_group: str
    component: str
    horizon_days: int
    demand: float              # total predicted units over the horizon
    level: float               # EWMA daily level
    confidence: float          # 0..1
    n_days: int                # days of history used
    method: str                # "ewma" | "network_fallback" | "xgboost"

@dataclass(frozen=True)
class LotRisk:
    lot_id: str
    facility_id: str
    blood_group: str
    component: str
    units: int
    at_risk_units: int
    reserved_units: int
    days_to_expiry: int
    window_state: str          # NORMAL | WATCH | RESCUE_WINDOW | UNRESCUABLE

@dataclass(frozen=True)
class ShortageOut:
    facility_id: str
    blood_group: str
    component: str
    horizon_days: int
    usable_units: int
    forecast_demand: float
    reserve_units: int
    gap_units: int
    shortage_risk: float       # 0..1
    tier: str                  # STABLE | WATCH | HIGH | CRITICAL

@dataclass(frozen=True)
class GateCheck:
    code: str                  # G1..G8
    label: str                 # human-readable, rendered verbatim by the frontend
    passed: bool
    detail: str

@dataclass(frozen=True)
class ScoreFactors:
    er: float
    sr: float
    feas: float
    cov: float
    damp: float
    gate: int                  # 0 or 1
    contrib_er: float          # 0.35 * er
    contrib_sr: float          # 0.30 * sr
    contrib_feas: float        # 0.15 * feas
    contrib_cov: float         # 0.20 * cov
    raw: float
    inputs: dict               # every raw number behind the terms above

@dataclass(frozen=True)
class Explanation:
    why_source: str
    why_destination: str
    why_quantity: str
    why_now: str

@dataclass(frozen=True)
class RecommendationOut:
    source_lot_id: str
    source_facility_id: str
    dest_facility_id: str
    blood_group: str
    component: str
    units: int
    rescue_score: int          # 0..100
    transit_hours: float
    factors: ScoreFactors
    explanation: Explanation
    checks: list[GateCheck]    # all 8, passed

@dataclass(frozen=True)
class ExclusionOut:
    source_lot_id: str
    source_facility_id: str
    dest_facility_id: str
    blood_group: str
    component: str
    failed_codes: list[str]
    checks: list[GateCheck]    # all 8, with failures marked

@dataclass(frozen=True)
class BranchMetrics:
    units_expired: int
    unmet_demand_units: int
    stockout_days: int

@dataclass(frozen=True)
class CounterfactualOut:
    horizon_days: int
    do_nothing: BranchMetrics
    with_action: BranchMetrics
    delta_units_expired: int
    delta_unmet_demand: int

@dataclass(frozen=True)
class PipelineResult:
    as_of: date
    forecasts: list[ForecastOut]
    lot_risks: list[LotRisk]
    shortages: list[ShortageOut]
    recommendations: list[RecommendationOut]   # sorted by rescue_score desc
    exclusions: list[ExclusionOut]
    summary: dict
