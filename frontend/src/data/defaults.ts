import type {
  Facility,
  RecommendationItem,
  ExclusionItem,
  NetworkSummary,
  ShortageItem,
  LotRiskItem,
  AlertItem,
  PrototypeSettings
} from '../types';

import facilitiesData from '../../public/fixtures/facilities.json';
import recommendationsData from '../../public/fixtures/recommendations.json';
import summaryData from '../../public/fixtures/network/summary.json';
import shortageData from '../../public/fixtures/risk/shortage.json';
import expiryData from '../../public/fixtures/risk/expiry.json';

export const STATIC_FACILITIES: Facility[] = (facilitiesData as any).facilities || [];
export const STATIC_RECOMMENDATIONS: RecommendationItem[] = (recommendationsData as any).recommendations || [];
export const STATIC_EXCLUSIONS: ExclusionItem[] = (recommendationsData as any).exclusions || [];
export const STATIC_SUMMARY: NetworkSummary = summaryData as any;
export const STATIC_SHORTAGES: ShortageItem[] = (shortageData as any).shortages || [];
export const STATIC_EXPIRY_LOTS: LotRiskItem[] = (expiryData as any).lots || [];
export const STATIC_EXPIRY_BY_STATE: Record<string, number> = (expiryData as any).by_state || {};

export const DEFAULT_ALERTS: AlertItem[] = [
  {
    id: 'alt-001',
    category: 'EXPIRY',
    severity: 'HIGH',
    title: '12 Units O+ RBC Approaching Expiry Window',
    description: 'Greenfield Medical Center has 7 units expiring in 3 days. Total surplus available: 12 units.',
    hospitalName: 'Greenfield Medical Center',
    bloodGroup: 'O_POS',
    timestamp: '15 mins ago',
    targetRoute: '/recommendations',
    read: false
  },
  {
    id: 'alt-002',
    category: 'SHORTAGE',
    severity: 'CRITICAL',
    title: 'Predicted Deficit of 5 Units O+ RBC',
    description: 'City General Hospital current stock is 6 units against 11 units 7-day projected demand.',
    hospitalName: 'City General Hospital',
    bloodGroup: 'O_POS',
    timestamp: '25 mins ago',
    targetRoute: '/forecast',
    read: false
  },
  {
    id: 'alt-003',
    category: 'STORAGE_REVIEW',
    severity: 'HIGH',
    title: 'Storage Temperature Anomaly Detected',
    description: 'Central Trauma Centre Unit AB- (HG-ABN-RBC-00609) reported 6.8°C. Candidate candidate excluded.',
    hospitalName: 'Central Trauma Centre',
    bloodGroup: 'AB_NEG',
    timestamp: '1 hour ago',
    targetRoute: '/inventory',
    read: false
  },
  {
    id: 'alt-004',
    category: 'RECOMMENDATION',
    severity: 'MEDIUM',
    title: 'High-Priority Redistribution Candidate Available',
    description: 'Greenfield → City General (5 units O+ RBC). Score: 94/100.',
    hospitalName: 'Greenfield Medical Center',
    bloodGroup: 'O_POS',
    timestamp: '10 mins ago',
    targetRoute: '/recommendations',
    read: true
  }
];

export const DEFAULT_SETTINGS: PrototypeSettings = {
  expiryRiskWindowDays: 5,
  forecastWindowDays: 7,
  shortageThresholdUnits: 5,
  safetyStrictProtocol: true,
  autoMatchRadiusKm: 50,
  demoMode: true
};
