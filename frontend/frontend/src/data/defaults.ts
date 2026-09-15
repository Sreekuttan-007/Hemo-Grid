import type { AlertItem, PrototypeSettings } from '../types';

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
