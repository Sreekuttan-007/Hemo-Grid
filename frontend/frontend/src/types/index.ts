export type BloodGroup = "O_POS" | "O_NEG" | "A_POS" | "A_NEG" | "B_POS" | "B_NEG" | "AB_POS" | "AB_NEG";
export type Component = "RBC" | "PLATELETS" | "PLASMA";
export type ShortageTier = "STABLE" | "WATCH" | "HIGH" | "CRITICAL";
export type WindowState = "NORMAL" | "WATCH" | "RESCUE_WINDOW" | "UNRESCUABLE";
export type RecStatus = "GENERATED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "CLOSED";

export interface Facility {
  facility_id: string;
  code: string;
  name: string;
  tier: "REGIONAL_CENTRE" | "HOSPITAL" | "DISTRICT";
  lat: number;
  lng: number;
  total_units: number;
  at_risk_units: number;
  gap_units: number;
  worst_tier: ShortageTier;
}

export interface LotRiskItem {
  lot_id: string;
  facility_id: string;
  facility_name: string;
  blood_group: BloodGroup;
  component: Component;
  units: number;
  at_risk_units: number;
  days_to_expiry: number;
  window_state: WindowState;
  storage_status: "OK" | "ANOMALY" | "UNKNOWN";
  trace_id: string;
}

export interface ShortageItem {
  facility_id: string;
  facility_name: string;
  blood_group: BloodGroup;
  component: Component;
  horizon_days: number;
  usable_units: number;
  forecast_demand: number;
  reserve_units: number;
  gap_units: number;
  shortage_risk: number;
  tier: ShortageTier;
  confidence: number;
}

export interface GateCheck {
  code: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface ScoreFactors {
  er: number;
  sr: number;
  feas: number;
  cov: number;
  damp: number;
  gate: number;
  contrib_er: number;
  contrib_sr: number;
  contrib_feas: number;
  contrib_cov: number;
  raw: number;
  inputs: Record<string, number | string>;
}

export interface Explanation {
  why_source: string;
  why_destination: string;
  why_quantity: string;
  why_now: string;
}

export interface RecommendationItem {
  id: string;
  status: RecStatus;
  source_lot_id: string;
  source_facility_id: string;
  source_facility_name: string;
  dest_facility_id: string;
  dest_facility_name: string;
  blood_group: BloodGroup;
  component: Component;
  units: number;
  rescue_score: number;
  transit_hours: number;
  factors: ScoreFactors;
  explanation: Explanation;
  checks: GateCheck[];
  created_at: string;
}

export interface ExclusionItem {
  source_lot_id: string;
  source_facility_id: string;
  source_facility_name: string;
  dest_facility_id: string;
  dest_facility_name: string;
  blood_group: BloodGroup;
  component: Component;
  failed_codes: string[];
  checks: GateCheck[];
}

export interface ReviewItem {
  actor: string;
  action: "OPENED" | "APPROVED" | "REJECTED" | "CLOSED";
  note: string | null;
  at: string;
}

export interface NetworkSummary {
  as_of: string;
  total_units: number;
  total_lots: number;
  at_risk_units: number;
  rescuable_units: number;
  facilities_with_gap: number;
  total_gap_units: number;
  recommendation_count: number;
  exclusion_count: number;
  addressable_units: number;
  by_component: { component: Component; units: number; at_risk_units: number }[];
  by_group: { blood_group: BloodGroup; units: number; at_risk_units: number }[];
}

export interface CounterfactualResult {
  horizon_days: number;
  do_nothing: { units_expired: number; unmet_demand_units: number; stockout_days: number };
  with_action: { units_expired: number; unmet_demand_units: number; stockout_days: number };
  delta_units_expired: number;
  delta_unmet_demand: number;
}

export interface ShockResult {
  before: { top: RecommendationItem[]; summary: NetworkSummary };
  after: { top: RecommendationItem[]; summary: NetworkSummary };
  withdrawn: { recommendation_id: string; reason: string }[];
}

export interface AlertItem {
  id: string;
  category: "EXPIRY" | "SHORTAGE" | "STORAGE_REVIEW" | "RECOMMENDATION";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";
  title: string;
  description: string;
  hospitalName: string;
  bloodGroup?: BloodGroup;
  timestamp: string;
  targetRoute: string;
  read: boolean;
}

export interface PrototypeSettings {
  expiryRiskWindowDays: number;
  forecastWindowDays: number;
  shortageThresholdUnits: number;
  safetyStrictProtocol: boolean;
  autoMatchRadiusKm: number;
  demoMode: boolean;
}
