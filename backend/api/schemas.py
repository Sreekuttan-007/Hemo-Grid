"""API response and request shapes. FROZEN — see Backend.md §7.

The frontend codes against these shapes and the committed fixtures. A field
may only be added, removed, or renamed by explicit agreement with the
frontend team.
"""

from typing import Any

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Shared item shapes
# ---------------------------------------------------------------------------

class CheckItem(BaseModel):
    code: str
    label: str
    passed: bool
    detail: str


class Factors(BaseModel):
    er: float
    sr: float
    feas: float
    cov: float
    damp: float
    gate: float
    contrib_er: float
    contrib_sr: float
    contrib_feas: float
    contrib_cov: float
    raw: float
    inputs: dict[str, Any]


class Explanation(BaseModel):
    why_source: str
    why_destination: str
    why_quantity: str
    why_now: str


class RecommendationItem(BaseModel):
    id: str
    status: str
    source_lot_id: str
    source_facility_id: str
    source_facility_name: str
    dest_facility_id: str
    dest_facility_name: str
    blood_group: str
    component: str
    units: int
    rescue_score: int
    transit_hours: float
    factors: Factors
    explanation: Explanation
    checks: list[CheckItem]
    created_at: str


class ExclusionItem(BaseModel):
    source_lot_id: str
    source_facility_id: str
    source_facility_name: str
    dest_facility_id: str
    dest_facility_name: str
    blood_group: str
    component: str
    failed_codes: list[str]
    checks: list[CheckItem]


class ShortageItem(BaseModel):
    facility_id: str
    facility_name: str
    blood_group: str
    component: str
    horizon_days: int
    usable_units: int
    forecast_demand: float
    reserve_units: int
    gap_units: int
    shortage_risk: float
    tier: str
    confidence: float


class ReviewItem(BaseModel):
    actor: str
    action: str
    note: str | None = None
    at: str


# ---------------------------------------------------------------------------
# GET /api/health
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    ok: bool
    as_of: str


# ---------------------------------------------------------------------------
# GET /api/network/summary
# ---------------------------------------------------------------------------

class ComponentSummary(BaseModel):
    component: str
    units: int
    at_risk_units: int


class GroupSummary(BaseModel):
    blood_group: str
    units: int
    at_risk_units: int


class NetworkSummary(BaseModel):
    as_of: str
    total_units: int
    total_lots: int
    at_risk_units: int
    rescuable_units: int
    facilities_with_gap: int
    total_gap_units: int
    recommendation_count: int
    exclusion_count: int
    addressable_units: int
    by_component: list[ComponentSummary]
    by_group: list[GroupSummary]


# ---------------------------------------------------------------------------
# GET /api/facilities, GET /api/facilities/{id}
# ---------------------------------------------------------------------------

class FacilitySummary(BaseModel):
    facility_id: str
    code: str
    name: str
    tier: str
    lat: float
    lng: float
    total_units: int
    at_risk_units: int
    gap_units: int
    worst_tier: str


class FacilitiesResponse(BaseModel):
    facilities: list[FacilitySummary]


class FacilityLot(BaseModel):
    lot_id: str
    trace_id: str
    blood_group: str
    component: str
    units: int
    collected_at: str
    expires_at: str
    storage_status: str
    days_to_expiry: int
    at_risk_units: int
    window_state: str


class FacilityDetailResponse(BaseModel):
    facility: FacilitySummary
    lots: list[FacilityLot]
    shortages: list[ShortageItem]


# ---------------------------------------------------------------------------
# GET /api/risk/expiry
# ---------------------------------------------------------------------------

class ExpiryLot(BaseModel):
    lot_id: str
    facility_id: str
    facility_name: str
    blood_group: str
    component: str
    units: int
    at_risk_units: int
    days_to_expiry: int
    window_state: str


class ExpiryByState(BaseModel):
    NORMAL: int
    WATCH: int
    RESCUE_WINDOW: int
    UNRESCUABLE: int


class RiskExpiryResponse(BaseModel):
    lots: list[ExpiryLot]
    by_state: ExpiryByState


# ---------------------------------------------------------------------------
# GET /api/risk/shortage
# ---------------------------------------------------------------------------

class RiskShortageResponse(BaseModel):
    shortages: list[ShortageItem]


# ---------------------------------------------------------------------------
# GET /api/recommendations, GET /api/recommendations/{id},
# POST /api/recommendations/{id}/review
# ---------------------------------------------------------------------------

class RecommendationsResponse(BaseModel):
    recommendations: list[RecommendationItem]
    exclusions: list[ExclusionItem]


class RecommendationDetailResponse(BaseModel):
    recommendation: RecommendationItem
    reviews: list[ReviewItem]


class ReviewRequest(BaseModel):
    actor: str
    action: str
    note: str | None = None


class ReviewResponse(BaseModel):
    recommendation: RecommendationItem
    reviews: list[ReviewItem]


# ---------------------------------------------------------------------------
# POST /api/counterfactual/{id}
# ---------------------------------------------------------------------------

class CounterfactualOutcome(BaseModel):
    units_expired: int
    unmet_demand_units: int
    stockout_days: int


class CounterfactualResponse(BaseModel):
    horizon_days: int
    do_nothing: CounterfactualOutcome
    with_action: CounterfactualOutcome
    delta_units_expired: int
    delta_unmet_demand: int


# ---------------------------------------------------------------------------
# POST /api/simulate/shock
# ---------------------------------------------------------------------------

class ShockRequest(BaseModel):
    facility_id: str
    blood_group: str
    component: str
    units: int


class ShockSnapshot(BaseModel):
    top: list[RecommendationItem]
    summary: NetworkSummary


class WithdrawnRecommendation(BaseModel):
    recommendation_id: str
    reason: str


class ShockResponse(BaseModel):
    before: ShockSnapshot
    after: ShockSnapshot
    withdrawn: list[WithdrawnRecommendation]


# ---------------------------------------------------------------------------
# POST /api/demo/reset
# ---------------------------------------------------------------------------

class DemoResetSeeded(BaseModel):
    facilities: int
    lots: int
    consumption: int


class DemoResetResponse(BaseModel):
    ok: bool
    seeded: DemoResetSeeded
