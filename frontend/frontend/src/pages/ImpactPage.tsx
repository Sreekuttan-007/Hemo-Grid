import React from 'react';
import { Leaf, Award } from 'lucide-react';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export const ImpactPage: React.FC = () => {
  // Chart 1: Expiry risk identified over time
  const expiryOverTime = [
    { week: 'Wk 1', units: 12 },
    { week: 'Wk 2', units: 18 },
    { week: 'Wk 3', units: 24 },
    { week: 'Wk 4', units: 31 },
  ];

  // Chart 2: Rescue opportunities by component
  const rescueByComponent = [
    { component: 'RBC', rescued: 11 },
    { component: 'Platelets', rescued: 4 },
    { component: 'Plasma', rescued: 3 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
            <Leaf className="w-4 h-4 text-emerald-600" />
            Sustainability & Efficiency Intelligence
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Rescue Impact</h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Measure the potential biological resources HemoGrid could help preserve.
          </p>
        </div>

        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200/80 w-fit">
          Simulated prototype metrics
        </span>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 text-white rounded-3xl p-5 shadow-card">
          <span className="text-xs font-semibold text-emerald-200 block">Potential Units Rescued</span>
          <span className="text-4xl font-black mt-2 block">18</span>
          <p className="text-xs text-emerald-200/80 font-medium mt-1">Preserved via network reallocation</p>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-card border border-slate-100">
          <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Expiry-Risk Units Flagged</span>
          <span className="text-4xl font-black text-slate-900 mt-2 block">31</span>
          <p className="text-xs text-slate-500 font-medium mt-1">Tracked across 10 facilities</p>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-card border border-slate-100">
          <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Potential Wastage Avoided</span>
          <span className="text-4xl font-black text-emerald-900 mt-2 block">18</span>
          <p className="text-xs text-slate-500 font-medium mt-1">Biological units saved from expiration</p>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-card border border-slate-100">
          <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Shortage Scenarios Mitigated</span>
          <span className="text-4xl font-black text-slate-900 mt-2 block">6</span>
          <p className="text-xs text-slate-500 font-medium mt-1">Hospital deficit states averted</p>
        </div>
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Expiry risk identified over time */}
        <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900">Expiry Risk Units Flagged Over Time</h3>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full">Cumulative</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={expiryOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="units" stroke="#15803d" fill="#dcfce7" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Potential rescue opportunities by component */}
        <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900">Potential Rescue Opportunities by Component</h3>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">Units</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rescueByComponent} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="component" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="rescued" fill="#14532d" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* SUSTAINABILITY STATEMENT */}
      <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 space-y-3">
        <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
          <Award className="w-5 h-5 text-emerald-700" />
          Biological Resource Preservation Principle
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
          Blood products represent a critical, non-synthesizable donor resource with tight temporal expiry windows (e.g. 5 days for platelets, 35–42 days for red blood cells). By predicting localized demand deficits and connecting surplus units across regional facilities, HemoGrid aims to minimize biological wastage while enhancing healthcare system resilience.
        </p>
      </div>

      <DisclaimerFooter />
    </div>
  );
};
