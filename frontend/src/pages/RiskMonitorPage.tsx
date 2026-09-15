import React from 'react';
import { useApp } from '../context/AppContext';
import {
  TrendingDown,
  Clock
} from 'lucide-react';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';

export const RiskMonitorPage: React.FC = () => {
  const { expiryLots, shortages, summary } = useApp();

  const highExpiryUnits = expiryLots
    .filter((i) => i.days_to_expiry <= 3)
    .reduce((acc, i) => acc + i.units, 0);
  const watchExpiryUnits = expiryLots
    .filter((i) => i.days_to_expiry > 3 && i.days_to_expiry <= 7)
    .reduce((acc, i) => acc + i.units, 0);
  const stableUnits = (summary?.total_units ?? 0) - highExpiryUnits - watchExpiryUnits;

  const criticalShortageFacilities = shortages.filter((f) => f.gap_units >= 5).length;
  const watchShortageFacilities = shortages.filter((f) => f.gap_units > 0 && f.gap_units < 5).length;
  const sufficientFacilities = (summary?.facilities_with_gap !== undefined)
    ? (10 - summary.facilities_with_gap)
    : 0;

  const expiryByComponentData = [
    { component: 'RBC', units: expiryLots.filter(i => i.component === 'RBC' && i.days_to_expiry <= 7).reduce((a, b) => a + b.units, 0) },
    { component: 'Platelets', units: expiryLots.filter(i => i.component === 'PLATELETS' && i.days_to_expiry <= 7).reduce((a, b) => a + b.units, 0) },
    { component: 'Plasma', units: expiryLots.filter(i => i.component === 'PLASMA' && i.days_to_expiry <= 7).reduce((a, b) => a + b.units, 0) },
  ];

  const shortageByFacilityData = shortages
    .filter(f => f.gap_units > 0)
    .map(f => ({
      facility: f.facility_name.replace('Hospital', '').replace('Medical Center', '').trim(),
      shortage: f.gap_units
    }));

  const riskTrendData = [
    { day: 'Day 1', expiryRisk: Math.round(highExpiryUnits * 0.35), shortageRisk: Math.round(criticalShortageFacilities + watchShortageFacilities * 0.4) },
    { day: 'Day 2', expiryRisk: Math.round(highExpiryUnits * 0.55), shortageRisk: Math.round(criticalShortageFacilities + watchShortageFacilities * 0.5) },
    { day: 'Day 3', expiryRisk: Math.round(highExpiryUnits * 0.75), shortageRisk: Math.round(criticalShortageFacilities + watchShortageFacilities * 0.65) },
    { day: 'Day 4', expiryRisk: highExpiryUnits, shortageRisk: Math.round(criticalShortageFacilities + watchShortageFacilities * 0.8) },
    { day: 'Day 5', expiryRisk: highExpiryUnits + Math.round(watchExpiryUnits * 0.3), shortageRisk: criticalShortageFacilities + watchShortageFacilities },
    { day: 'Day 6', expiryRisk: highExpiryUnits + Math.round(watchExpiryUnits * 0.6), shortageRisk: criticalShortageFacilities + watchShortageFacilities },
    { day: 'Day 7', expiryRisk: highExpiryUnits + watchExpiryUnits, shortageRisk: criticalShortageFacilities + watchShortageFacilities },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Risk Monitor</h1>
        <p className="text-xs font-medium text-slate-500 mt-1">
          Identify inventory that may expire and facilities that may face shortage.
        </p>
      </div>

      {/* TWO MAJOR SECTIONS: EXPIRY vs SHORTAGE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT: EXPIRY RISK SUMMARY */}
        <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
            <Clock className="w-5 h-5 text-amber-600" />
            <h3>Expiry Risk Vector</h3>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-100 text-center">
              <span className="text-[10px] font-bold uppercase text-amber-800 block">High (≤3d)</span>
              <span className="text-2xl font-black text-amber-900 mt-0.5 block">{highExpiryUnits}</span>
              <span className="text-[10px] text-amber-700">Units</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Watch (4-7d)</span>
              <span className="text-2xl font-bold text-slate-800 mt-0.5 block">{watchExpiryUnits}</span>
              <span className="text-[10px] text-slate-400">Units</span>
            </div>
            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
              <span className="text-[10px] font-bold uppercase text-emerald-800 block">Stable (&gt;7d)</span>
              <span className="text-2xl font-bold text-emerald-900 mt-0.5 block">{stableUnits}</span>
              <span className="text-[10px] text-emerald-700">Units</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-700 mb-3">Expiry Risk by Blood Component</h4>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expiryByComponentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="component" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="units" fill="#d97706" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* RIGHT: SHORTAGE RISK SUMMARY */}
        <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
            <TrendingDown className="w-5 h-5 text-rose-600" />
            <h3>Shortage Risk Vector</h3>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-100 text-center">
              <span className="text-[10px] font-bold uppercase text-rose-800 block">Critical Deficit</span>
              <span className="text-2xl font-black text-rose-900 mt-0.5 block">{criticalShortageFacilities}</span>
              <span className="text-[10px] text-rose-700">Facilities</span>
            </div>
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-100 text-center">
              <span className="text-[10px] font-bold uppercase text-amber-800 block">Watch Deficit</span>
              <span className="text-2xl font-bold text-amber-900 mt-0.5 block">{watchShortageFacilities}</span>
              <span className="text-[10px] text-amber-700">Facilities</span>
            </div>
            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
              <span className="text-[10px] font-bold uppercase text-emerald-800 block">Sufficient</span>
              <span className="text-2xl font-bold text-emerald-900 mt-0.5 block">{sufficientFacilities}</span>
              <span className="text-[10px] text-emerald-700">Facilities</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-700 mb-3">Projected Shortage by Facility (Units Deficit)</h4>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shortageByFacilityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="facility" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="shortage" fill="#be123c" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>

      {/* TREND CHART: 7-DAY PROJECTED RISK TREND */}
      <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">7-Day Projected Risk Trajectory</h3>
            <p className="text-xs text-slate-500">Predicted progression of expiry-risk units vs shortage-risk states over time</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-amber-700">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span> Expiry Risk Units
            </div>
            <div className="flex items-center gap-1.5 text-rose-700">
              <span className="w-3 h-3 rounded-full bg-rose-600"></span> Shortage Risk States
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={riskTrendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e2e8f0' }} />
              <Line type="monotone" dataKey="expiryRisk" stroke="#d97706" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="shortageRisk" stroke="#be123c" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <DisclaimerFooter />
    </div>
  );
};
