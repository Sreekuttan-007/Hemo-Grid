import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Info, Filter, ArrowRight } from 'lucide-react';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';
import { formatBloodGroup, formatComponent, formatConfidence } from '../format';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

import type { BloodGroup, Component } from '../types';

export const DemandForecastPage: React.FC = () => {
  const { shortages, facilities, setSelectedRecommendation, recommendations } = useApp();

  const defaultFacilityId = facilities[0]?.facility_id || '';
  const [selectedFacilityId, setSelectedFacilityId] = useState(defaultFacilityId);
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<BloodGroup>('O_POS');
  const [selectedComponent, setSelectedComponent] = useState<Component>('RBC');

  const handleFacilityChange = (facId: string) => {
    setSelectedFacilityId(facId);
    const existing = shortages.find((f) => f.facility_id === facId);
    if (existing) {
      setSelectedBloodGroup(existing.blood_group as BloodGroup);
      setSelectedComponent(existing.component as Component);
    }
  };

  // Active facility resolution
  const activeFacilityId = selectedFacilityId || defaultFacilityId;
  const activeFacility = facilities.find((f) => f.facility_id === activeFacilityId) || facilities[0];
  const activeFacilityName = activeFacility?.name || 'Selected Facility';

  // Authentic static data resolution from fixtures
  const selectedFc =
    shortages.find((f) => f.facility_id === activeFacilityId && f.blood_group === selectedBloodGroup && f.component === selectedComponent) ||
    shortages.find((f) => f.facility_id === activeFacilityId) ||
    shortages.find((f) => f.blood_group === selectedBloodGroup) ||
    shortages[0];

  // Chart data: 7 days historical + 7 days forecast
  const chartData = [
    { date: 'Sep 08', historical: 7, forecast: null },
    { date: 'Sep 09', historical: 8, forecast: null },
    { date: 'Sep 10', historical: 6, forecast: null },
    { date: 'Sep 11', historical: 9, forecast: null },
    { date: 'Sep 12', historical: 11, forecast: null },
    { date: 'Sep 13', historical: 10, forecast: null },
    { date: 'Sep 14 (Today)', historical: selectedFc?.usable_units ?? 6, forecast: selectedFc?.usable_units ?? 6 },
    { date: 'Sep 15 (+1d)', historical: null, forecast: Math.round((selectedFc?.forecast_demand ?? 11) * 0.7) },
    { date: 'Sep 16 (+2d)', historical: null, forecast: Math.round((selectedFc?.forecast_demand ?? 11) * 0.8) },
    { date: 'Sep 17 (+3d)', historical: null, forecast: Math.round((selectedFc?.forecast_demand ?? 11) * 0.9) },
    { date: 'Sep 18 (+4d)', historical: null, forecast: selectedFc?.forecast_demand ?? 11 },
    { date: 'Sep 19 (+5d)', historical: null, forecast: selectedFc?.forecast_demand ?? 11 },
    { date: 'Sep 20 (+6d)', historical: null, forecast: Math.round((selectedFc?.forecast_demand ?? 11) * 1.05) },
    { date: 'Sep 21 (+7d)', historical: null, forecast: selectedFc?.forecast_demand ?? 11 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Demand Forecast</h1>
        <p className="text-xs font-medium text-slate-500 mt-1">
          See what each facility may need before the shortage occurs.
        </p>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white rounded-3xl p-5 shadow-card border border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mr-2">
            <Filter className="w-4 h-4 text-emerald-800" />
            <span>Select Target Locus:</span>
          </div>

          <select
            value={activeFacilityId}
            onChange={(e) => handleFacilityChange(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none"
          >
            {facilities.map((f) => (
              <option key={f.facility_id} value={f.facility_id}>{f.name}</option>
            ))}
          </select>

          <select
            value={selectedBloodGroup}
            onChange={(e) => setSelectedBloodGroup(e.target.value as BloodGroup)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none"
          >
            {(['O_POS', 'O_NEG', 'A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG'] as const).map((bg) => (
              <option key={bg} value={bg}>{formatBloodGroup(bg)}</option>
            ))}
          </select>

          <select
            value={selectedComponent}
            onChange={(e) => setSelectedComponent(e.target.value as Component)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none"
          >
            <option value="RBC">RBC</option>
            <option value="PLATELETS">Platelets</option>
            <option value="PLASMA">Plasma</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Forecast Horizon:</span>
          <span className="px-3 py-1 bg-emerald-900 text-white rounded-full text-xs font-bold">
            {selectedFc?.horizon_days ?? 7} Days
          </span>
        </div>
      </div>

      {/* MAIN CHART */}
      <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {selectedFc?.facility_name || activeFacilityName} • {formatBloodGroup(selectedFc?.blood_group || selectedBloodGroup)} {formatComponent(selectedFc?.component || selectedComponent)}
            </h3>
            <p className="text-xs text-slate-500">Historical Consumption (Solid) vs Predictive Demand (Dashed)</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="w-3 h-3 rounded-full bg-slate-700"></span> Historical Usage
            </div>
            <div className="flex items-center gap-1.5 text-emerald-800">
              <span className="w-3 h-3 rounded-full bg-emerald-700"></span> Predicted Demand
            </div>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e2e8f0' }} />
              <Line type="monotone" dataKey="historical" stroke="#334155" strokeWidth={3} dot={{ r: 4 }} connectNulls={false} />
              <Line type="monotone" dataKey="forecast" stroke="#15803d" strokeWidth={3} strokeDasharray="6 6" dot={{ r: 4 }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FORECAST SUMMARY CARD */}
      {selectedFc && (
        <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Facility Demand Forecast Breakdown</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-medium text-slate-500 block">Target Facility</span>
              <span className="text-sm font-bold text-slate-800 mt-1 block">{selectedFc.facility_name}</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-medium text-slate-500 block">Current Local Stock</span>
              <span className="text-xl font-black text-slate-900 mt-1 block">{selectedFc.usable_units} Units</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-medium text-slate-500 block">Projected Demand</span>
              <span className="text-xl font-black text-emerald-900 mt-1 block">{selectedFc.forecast_demand} Units</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-medium text-slate-500 block">Forecast Confidence</span>
              <span className="text-sm font-bold text-emerald-800 mt-1 block flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                {formatConfidence(selectedFc.confidence)} Confidence
              </span>
            </div>

            <div className={`p-4 rounded-2xl border ${selectedFc.gap_units > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
              <span className={`text-xs font-medium block ${selectedFc.gap_units > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>Projected Gap</span>
              <span className={`text-xl font-black mt-1 block ${selectedFc.gap_units > 0 ? 'text-rose-800' : 'text-emerald-800'}`}>{selectedFc.gap_units} Units</span>
            </div>
          </div>

          {/* Action Link to Match */}
          {selectedFc.gap_units > 0 && (
            <div className="p-4 bg-emerald-950 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider block">Network Intervention Opportunity</span>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Redistribution match available for this facility.
                </p>
              </div>
              <button
                onClick={() => {
                  const rec = recommendations.find(r => r.dest_facility_id === selectedFc.facility_id) || null;
                  if (rec) setSelectedRecommendation(rec);
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-full transition-colors shrink-0 flex items-center gap-1.5"
              >
                Review Matching Opportunity <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Mandated Engineering indicator notice */}
          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-800 shrink-0" />
            <span>Forecast confidence is an engineering indicator for this prototype, not a clinical probability.</span>
          </div>
        </div>
      )}

      <DisclaimerFooter />
    </div>
  );
};
