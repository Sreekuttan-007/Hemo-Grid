import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SlidersHorizontal, RefreshCw, ArrowRight, AlertTriangle } from 'lucide-react';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';
import { formatBloodGroup, formatComponent, priorityTier } from '../format';
import { postJSON } from '../api';
import type { ShockResult, RecommendationItem } from '../types';

const BLOOD_GROUPS = ['O_POS', 'O_NEG', 'A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG'] as const;
const COMPONENTS = ['RBC', 'PLATELETS', 'PLASMA'] as const;

export const SimulatorPage: React.FC = () => {
  const { facilities, setSelectedRecommendation, refreshData } = useApp();

  const [facilityId, setFacilityId] = useState('');
  const [bloodGroup, setBloodGroup] = useState<string>('O_POS');
  const [component, setComponent] = useState<string>('RBC');
  const [units, setUnits] = useState<number>(5);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShockResult | null>(null);

  const handleRunSimulation = async () => {
    if (!facilityId) return;
    setIsSimulating(true);
    setError(null);
    try {
      const shockResult = await postJSON<ShockResult>('/simulate/shock', {
        facility_id: facilityId,
        blood_group: bloodGroup,
        component,
        units
      });
      setResult(shockResult);
      refreshData();
    } catch (e) {
      setError(String(e));
    } finally {
      setIsSimulating(false);
    }
  };

  const renderRecRow = (rec: RecommendationItem) => {
    const tier = priorityTier(rec.rescue_score);
    return (
      <tr
        key={rec.id}
        onClick={() => setSelectedRecommendation(rec)}
        className="hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <td className="py-3 px-3">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
            tier === 'HIGH' ? 'bg-amber-100 text-amber-800' :
            tier === 'MEDIUM' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
          }`}>
            {tier}
          </span>
        </td>
        <td className="py-3 px-3 font-semibold text-slate-800 text-xs">{rec.source_facility_name}</td>
        <td className="py-3 px-3 font-semibold text-slate-800 text-xs flex items-center gap-1">
          <ArrowRight className="w-3 h-3 text-slate-400" />
          {rec.dest_facility_name}
        </td>
        <td className="py-3 px-3 text-xs">
          <span className="font-bold text-emerald-900">{formatBloodGroup(rec.blood_group)}</span>{' '}
          <span className="text-slate-500">{formatComponent(rec.component)}</span>
        </td>
        <td className="py-3 px-3 font-bold text-slate-900 text-xs">{rec.units}</td>
        <td className="py-3 px-3">
          <span className="text-sm font-black text-emerald-900">{rec.rescue_score}</span>
          <span className="text-[10px] text-slate-400">/100</span>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
          <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
          Counterfactual Analysis Engine
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">What-If Simulator</h1>
        <p className="text-xs font-medium text-slate-500 mt-1">
          Explore how changing demand scenarios alter network risk and redistribution priorities.
        </p>
      </div>

      {/* SIMULATOR CONTROL PANEL */}
      <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="font-bold text-slate-900 text-base">Stress-Test Scenario Parameters</h3>
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            Simulation only. Results are based on live data.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Target Facility */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
              Target Facility
            </label>
            <select
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none"
            >
              <option value="">Select facility...</option>
              {facilities.map((f) => (
                <option key={f.facility_id} value={f.facility_id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Blood Group */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
              Blood Group
            </label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none"
            >
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>{formatBloodGroup(bg)}</option>
              ))}
            </select>
          </div>

          {/* Component */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
              Component
            </label>
            <select
              value={component}
              onChange={(e) => setComponent(e.target.value)}
              className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none"
            >
              {COMPONENTS.map((c) => (
                <option key={c} value={c}>{formatComponent(c)}</option>
              ))}
            </select>
          </div>

          {/* Units */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
              Units to Shock
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={units}
              onChange={(e) => setUnits(Number(e.target.value))}
              className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none"
            />
          </div>

        </div>

        {error && (
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        <button
          onClick={handleRunSimulation}
          disabled={isSimulating || !facilityId}
          className="w-full py-3 bg-emerald-900 hover:bg-emerald-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-full text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
          {isSimulating ? 'Running Shock Simulation...' : 'Run Counterfactual Simulation'}
        </button>
      </div>

      {/* RESULTS */}
      {result && (
        <>
          {/* SIDE BY SIDE COMPARISON */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* BEFORE */}
            <div className="bg-white rounded-3xl shadow-card border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">Before Shock</h3>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[11px] font-bold rounded-full">
                  Baseline
                </span>
              </div>

              {/* Summary mini-cards */}
              <div className="p-4 grid grid-cols-3 gap-3 border-b border-slate-100">
                <div className="p-2 bg-slate-50 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 font-medium block">Total Units</span>
                  <span className="text-lg font-black text-slate-900">{result.before.summary.total_units}</span>
                </div>
                <div className="p-2 bg-amber-50 rounded-xl text-center">
                  <span className="text-[10px] text-amber-700 font-medium block">At Risk</span>
                  <span className="text-lg font-black text-amber-800">{result.before.summary.at_risk_units}</span>
                </div>
                <div className="p-2 bg-rose-50 rounded-xl text-center">
                  <span className="text-[10px] text-rose-700 font-medium block">Gap Units</span>
                  <span className="text-lg font-black text-rose-800">{result.before.summary.total_gap_units}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Priority</th>
                      <th className="py-2 px-3">Source</th>
                      <th className="py-2 px-3">Dest</th>
                      <th className="py-2 px-3">Match</th>
                      <th className="py-2 px-3">Qty</th>
                      <th className="py-2 px-3">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.before.top.map(renderRecRow)}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AFTER */}
            <div className="bg-white rounded-3xl shadow-card border border-emerald-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-emerald-900 text-sm">After Shock</h3>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 text-[11px] font-bold rounded-full">
                  Shocked State
                </span>
              </div>

              {/* Summary mini-cards */}
              <div className="p-4 grid grid-cols-3 gap-3 border-b border-slate-100">
                <div className="p-2 bg-slate-50 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 font-medium block">Total Units</span>
                  <span className="text-lg font-black text-slate-900">{result.after.summary.total_units}</span>
                </div>
                <div className="p-2 bg-amber-50 rounded-xl text-center">
                  <span className="text-[10px] text-amber-700 font-medium block">At Risk</span>
                  <span className="text-lg font-black text-amber-800">{result.after.summary.at_risk_units}</span>
                </div>
                <div className="p-2 bg-rose-50 rounded-xl text-center">
                  <span className="text-[10px] text-rose-700 font-medium block">Gap Units</span>
                  <span className="text-lg font-black text-rose-800">{result.after.summary.total_gap_units}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-emerald-50 border-b border-emerald-100 text-emerald-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Priority</th>
                      <th className="py-2 px-3">Source</th>
                      <th className="py-2 px-3">Dest</th>
                      <th className="py-2 px-3">Match</th>
                      <th className="py-2 px-3">Qty</th>
                      <th className="py-2 px-3">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.after.top.map(renderRecRow)}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* WITHDRAWN RECOMMENDATIONS */}
          {result.withdrawn.length > 0 && (
            <div className="bg-white rounded-3xl shadow-card border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">Withdrawn Recommendations</h3>
                <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-[11px] font-bold rounded-full">
                  {result.withdrawn.length} Withdrawn
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {result.withdrawn.map((w, idx) => (
                  <div key={idx} className="p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800">{w.recommendation_id}</span>
                      <p className="text-xs text-slate-500 mt-0.5">{w.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <DisclaimerFooter />
    </div>
  );
};
