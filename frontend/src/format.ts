import type { BloodGroup, Component, ShortageTier, WindowState } from './types';

const BLOOD_GROUP_DISPLAY: Record<BloodGroup, string> = {
  O_POS: 'O+',
  O_NEG: 'O-',
  A_POS: 'A+',
  A_NEG: 'A-',
  B_POS: 'B+',
  B_NEG: 'B-',
  AB_POS: 'AB+',
  AB_NEG: 'AB-',
};

export function formatBloodGroup(bg: BloodGroup): string {
  return BLOOD_GROUP_DISPLAY[bg] ?? bg;
}

const COMPONENT_DISPLAY: Record<Component, string> = {
  RBC: 'RBC',
  PLATELETS: 'Platelets',
  PLASMA: 'Plasma',
};

export function formatComponent(comp: Component): string {
  return COMPONENT_DISPLAY[comp] ?? comp;
}

export function priorityTier(rescue_score: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (rescue_score >= 80) return 'HIGH';
  if (rescue_score >= 50) return 'MEDIUM';
  return 'LOW';
}

export function formatConfidence(confidence: number): 'High' | 'Medium' | 'Low' {
  if (confidence >= 0.7) return 'High';
  if (confidence >= 0.4) return 'Medium';
  return 'Low';
}

const FACILITY_TIER_DISPLAY: Record<string, string> = {
  REGIONAL_CENTRE: 'Regional Centre',
  HOSPITAL: 'Hospital',
  DISTRICT: 'District',
};

export function formatFacilityTier(tier: string): string {
  return FACILITY_TIER_DISPLAY[tier] ?? tier;
}

const STORAGE_STATUS_DISPLAY: Record<string, string> = {
  OK: 'OK',
  ANOMALY: 'Anomaly',
  UNKNOWN: 'Unknown',
};

export function formatStorageStatus(status: string): string {
  return STORAGE_STATUS_DISPLAY[status] ?? status;
}

export function storageStatusBadgeStyle(status: string): string {
  if (status === 'ANOMALY') return 'bg-rose-100 text-rose-800';
  if (status === 'UNKNOWN') return 'bg-amber-100 text-amber-800';
  return 'bg-emerald-100 text-emerald-800';
}

const WINDOW_STATE_DISPLAY: Record<WindowState, string> = {
  NORMAL: 'Normal',
  WATCH: 'Watch',
  RESCUE_WINDOW: 'Rescue Window',
  UNRESCUABLE: 'Unrescuable',
};

export function formatWindowState(state: WindowState): string {
  return WINDOW_STATE_DISPLAY[state] ?? state;
}

export function windowStateBadgeStyle(state: WindowState): string {
  if (state === 'RESCUE_WINDOW') return 'bg-emerald-600 text-white';
  if (state === 'WATCH') return 'bg-amber-100 text-amber-800';
  if (state === 'UNRESCUABLE') return 'bg-rose-100 text-rose-800';
  return 'bg-slate-100 text-slate-700';
}

const SHORTAGE_TIER_DISPLAY: Record<ShortageTier, string> = {
  STABLE: 'Stable',
  WATCH: 'Watch',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export function formatShortageTier(tier: ShortageTier): string {
  return SHORTAGE_TIER_DISPLAY[tier] ?? tier;
}

export function shortageTierBadgeStyle(tier: ShortageTier): string {
  if (tier === 'CRITICAL') return 'bg-rose-100 text-rose-800';
  if (tier === 'HIGH') return 'bg-amber-100 text-amber-800';
  if (tier === 'WATCH') return 'bg-blue-100 text-blue-800';
  return 'bg-emerald-100 text-emerald-800';
}
