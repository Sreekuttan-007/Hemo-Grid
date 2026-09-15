import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type {
  Facility,
  LotRiskItem,
  ShortageItem,
  RecommendationItem,
  ExclusionItem,
  NetworkSummary,
  AlertItem,
  PrototypeSettings,
  RecStatus
} from '../types';
import { useApi, postJSON } from '../api';
import {
  DEFAULT_ALERTS,
  DEFAULT_SETTINGS,
  STATIC_FACILITIES,
  STATIC_RECOMMENDATIONS,
  STATIC_EXCLUSIONS,
  STATIC_SUMMARY,
  STATIC_SHORTAGES,
  STATIC_EXPIRY_LOTS,
  STATIC_EXPIRY_BY_STATE
} from '../data/defaults';

interface SearchResult {
  id: string;
  type: 'facility' | 'lot' | 'recommendation';
  title: string;
  subtitle: string;
  route: string;
  payload?: unknown;
}

interface AppContextType {
  activeRoute: string;
  setActiveRoute: (route: string) => void;

  facilities: Facility[];
  recommendations: RecommendationItem[];
  exclusions: ExclusionItem[];
  summary: NetworkSummary;
  shortages: ShortageItem[];
  expiryLots: LotRiskItem[];
  expiryByState: Record<string, number>;

  alerts: AlertItem[];
  settings: PrototypeSettings;
  updateSettings: (newSettings: Partial<PrototypeSettings>) => void;

  selectedLot: LotRiskItem | null;
  setSelectedLot: (item: LotRiskItem | null) => void;
  selectedRecommendation: RecommendationItem | null;
  setSelectedRecommendation: (rec: RecommendationItem | null) => void;
  selectedFacility: Facility | null;
  setSelectedFacility: (fac: Facility | null) => void;

  demandIncreasePercent: number;
  setDemandIncreasePercent: (val: number) => void;

  updateRecommendationStatus: (id: string, status: RecStatus) => Promise<void>;
  refreshData: () => void;
  markAlertRead: (id: string) => void;
  resetDemoData: () => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResult[];

  kpis: {
    totalInventory: number;
    expiryRiskCount: number;
    shortageRiskCount: number;
    rescueOpportunitiesCount: number;
  };

  facilitiesLoading: boolean;
  facilitiesError: string | null;
  recommendationsLoading: boolean;
  recommendationsError: string | null;
  summaryLoading: boolean;
  summaryError: string | null;
  shortagesLoading: boolean;
  shortagesError: string | null;
  expiryLoading: boolean;
  expiryError: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeRoute, setActiveRoute] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#dashboard') {
      return '/dashboard';
    }
    return '/landing';
  });
  const [recRefreshKey, setRecRefreshKey] = useState(0);
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);

  const facilitiesRes = useApi<{ facilities: Facility[] }>('/facilities');
  const recommendationsRes = useApi<{ recommendations: RecommendationItem[]; exclusions: ExclusionItem[] }>(`/recommendations?_=${recRefreshKey}`);
  const summaryRes = useApi<NetworkSummary>(`/network/summary?_=${summaryRefreshKey}`);
  const shortagesRes = useApi<{ shortages: ShortageItem[] }>('/risk/shortage');
  const expiryRes = useApi<{ lots: LotRiskItem[]; by_state: Record<string, number> }>('/risk/expiry');

  const facilities = (facilitiesRes.data?.facilities && facilitiesRes.data.facilities.length > 0) ? facilitiesRes.data.facilities : STATIC_FACILITIES;
  const recommendations = (recommendationsRes.data?.recommendations && recommendationsRes.data.recommendations.length > 0) ? recommendationsRes.data.recommendations : STATIC_RECOMMENDATIONS;
  const exclusions = (recommendationsRes.data?.exclusions && recommendationsRes.data.exclusions.length > 0) ? recommendationsRes.data.exclusions : STATIC_EXCLUSIONS;
  const summary = summaryRes.data ?? STATIC_SUMMARY;
  const shortages = (shortagesRes.data?.shortages && shortagesRes.data.shortages.length > 0) ? shortagesRes.data.shortages : STATIC_SHORTAGES;
  const expiryLots = (expiryRes.data?.lots && expiryRes.data.lots.length > 0) ? expiryRes.data.lots : STATIC_EXPIRY_LOTS;
  const expiryByState = expiryRes.data?.by_state ?? STATIC_EXPIRY_BY_STATE;

  const [alerts, setAlerts] = useState<AlertItem[]>(DEFAULT_ALERTS);
  const [settings, setSettings] = useState<PrototypeSettings>(DEFAULT_SETTINGS);

  const [selectedLot, setSelectedLot] = useState<LotRiskItem | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<RecommendationItem | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);

  const [demandIncreasePercent, setDemandIncreasePercent] = useState<number>(40);

  const [searchQuery, setSearchQuery] = useState<string>('');

  const updateSettings = useCallback((newSettings: Partial<PrototypeSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const updateRecommendationStatus = useCallback(async (id: string, status: RecStatus) => {
    try {
      await postJSON(`/recommendations/${id}/review`, { status });
    } catch (e) {
      // Prototype fallback update in local state
    }
    setRecRefreshKey((k) => k + 1);
  }, []);

  const refreshData = useCallback(() => {
    setRecRefreshKey((k) => k + 1);
    setSummaryRefreshKey((k) => k + 1);
  }, []);

  const markAlertRead = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((alt) => (alt.id === id ? { ...alt, read: true } : alt))
    );
  }, []);

  const resetDemoData = useCallback(() => {
    setAlerts(DEFAULT_ALERTS);
    setSettings(DEFAULT_SETTINGS);
    setDemandIncreasePercent(40);
    setSelectedRecommendation(null);
    setSelectedLot(null);
    setSelectedFacility(null);
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const results: SearchResult[] = [];

    facilities.forEach((f) => {
      if (f.name.toLowerCase().includes(q) || f.code.toLowerCase().includes(q)) {
        results.push({
          id: `fac-${f.facility_id}`,
          type: 'facility',
          title: f.name,
          subtitle: `${f.tier} • ${f.code}`,
          route: '/network',
          payload: f
        });
      }
    });

    expiryLots.forEach((lot) => {
      if (
        lot.lot_id.toLowerCase().includes(q) ||
        lot.facility_name.toLowerCase().includes(q) ||
        lot.blood_group.toLowerCase().includes(q)
      ) {
        results.push({
          id: `lot-${lot.lot_id}`,
          type: 'lot',
          title: `${lot.lot_id} (${lot.blood_group} ${lot.component})`,
          subtitle: `${lot.facility_name} • ${lot.units} units • ${lot.days_to_expiry}d remaining`,
          route: '/inventory',
          payload: lot
        });
      }
    });

    recommendations.forEach((rec) => {
      if (
        rec.source_facility_name.toLowerCase().includes(q) ||
        rec.dest_facility_name.toLowerCase().includes(q) ||
        rec.blood_group.toLowerCase().includes(q)
      ) {
        results.push({
          id: `rec-${rec.id}`,
          type: 'recommendation',
          title: `Match: ${rec.source_facility_name} → ${rec.dest_facility_name}`,
          subtitle: `${rec.units} units ${rec.blood_group} ${rec.component} • Score ${rec.rescue_score}/100`,
          route: '/recommendations',
          payload: rec
        });
      }
    });

    return results.slice(0, 7);
  }, [searchQuery, facilities, expiryLots, recommendations]);

  const kpis = useMemo(() => {
    return {
      totalInventory: summary?.total_units ?? STATIC_SUMMARY.total_units,
      expiryRiskCount: summary?.at_risk_units ?? STATIC_SUMMARY.at_risk_units,
      shortageRiskCount: summary?.facilities_with_gap ?? STATIC_SUMMARY.facilities_with_gap,
      rescueOpportunitiesCount: summary?.recommendation_count ?? STATIC_SUMMARY.recommendation_count
    };
  }, [summary]);

  return (
    <AppContext.Provider
      value={{
        activeRoute,
        setActiveRoute,
        facilities,
        recommendations,
        exclusions,
        summary,
        shortages,
        expiryLots,
        expiryByState,
        alerts,
        settings,
        updateSettings,
        selectedLot,
        setSelectedLot,
        selectedRecommendation,
        setSelectedRecommendation,
        selectedFacility,
        setSelectedFacility,
        demandIncreasePercent,
        setDemandIncreasePercent,
        updateRecommendationStatus,
        refreshData,
        markAlertRead,
        resetDemoData,
        searchQuery,
        setSearchQuery,
        searchResults,
        kpis,
        facilitiesLoading: false,
        facilitiesError: null,
        recommendationsLoading: false,
        recommendationsError: null,
        summaryLoading: false,
        summaryError: null,
        shortagesLoading: false,
        shortagesError: null,
        expiryLoading: false,
        expiryError: null
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
