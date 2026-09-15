import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Package,
  AlertTriangle,
  TrendingDown,
  ArrowRight,
  ShieldPlus,
  Sparkles,
  ArrowUpRight,
  Eye
} from 'lucide-react';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';
import { formatBloodGroup, formatComponent } from '../format';

export const CommandCenterPage: React.FC = () => {
  const {
    kpis,
    summary,
    expiryLots,
    shortages,
    recommendations,
    setSelectedRecommendation,
    setSelectedLot,
    setActiveRoute
  } = useApp();

  // Top ranked recommendation
  const topRec = recommendations[0];

  // Expiry risk items: lots with window_state RESCUE_WINDOW or WATCH, top 4
  const expiryRiskItems = expiryLots
    .filter((item) => item.window_state === 'RESCUE_WINDOW' || item.window_state === 'WATCH')
    .slice(0, 4);

  // Shortage risk items: shortages with gap_units > 0, top 4
  const shortageRiskItems = shortages
    .filter((f) => f.gap_units > 0)
    .slice(0, 4);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Command Center</h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            See what is at risk, what is needed, and where HemoGrid can intervene.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveRoute('/rescue')}
            className="px-4 py-2.5 bg-emerald-900 hover:bg-emerald-800 text-white rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <ShieldPlus className="w-4 h-4 text-emerald-300" />
            Launch Rescue Scan
          </button>
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 - Total Inventory (SPOTLIGHT GREEN GRADIENT ON HOVER) */}
        <div
          onClick={() => setActiveRoute('/inventory')}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
            e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
          }}
          className="bg-emerald-950 text-white rounded-3xl p-5 shadow-card relative overflow-hidden flex flex-col justify-between group cursor-pointer border border-emerald-800/40 hover:border-emerald-500/50 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:shadow-emerald-950/50 select-none"
        >
          {/* Green Gradient Spotlight - Illuminates strictly in the hovered area */}
          <div
            className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: `radial-gradient(300px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), rgba(16, 185, 129, 0.45), rgba(5, 150, 105, 0.15), transparent 75%)`
            }}
          />

          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs font-semibold text-emerald-200/90 group-hover:text-emerald-100 transition-colors">
              Total Inventory
            </span>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-emerald-400 group-hover:text-slate-950 group-hover:rotate-45 group-hover:scale-110 transition-all duration-300 shadow-sm">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>

          <div className="my-4 relative z-10">
            <span className="text-4xl font-black tracking-tight inline-block group-hover:text-emerald-50 transition-colors">
              {kpis.totalInventory}
            </span>
            <p className="text-xs text-emerald-200/80 group-hover:text-emerald-200 font-medium mt-1 transition-colors">
              Across {summary?.total_lots ?? 0} lots
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-emerald-200 text-[11px] font-medium w-fit relative z-10 group-hover:bg-white/20 group-hover:text-white transition-colors duration-300">
            <Package className="w-3.5 h-3.5 text-emerald-400" />
            Live Network Count
          </div>
        </div>

        {/* Metric 2 - Expiry Risk */}
        <div className="bg-white rounded-3xl p-5 shadow-card border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Expiry Risk</span>
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="my-4">
            <span className="text-4xl font-black text-amber-700 tracking-tight">{kpis.expiryRiskCount}</span>
            <p className="text-xs text-slate-500 font-medium mt-1">Units requiring attention</p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-semibold w-fit">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            At-risk inventory
          </div>
        </div>

        {/* Metric 3 - Shortage Risk */}
        <div className="bg-white rounded-3xl p-5 shadow-card border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Shortage Risk</span>
            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="my-4">
            <span className="text-4xl font-black text-rose-700 tracking-tight">{kpis.shortageRiskCount}</span>
            <p className="text-xs text-slate-500 font-medium mt-1">Facilities with gap</p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 text-[11px] font-semibold w-fit">
            <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
            {summary?.total_gap_units ?? 0} total gap units
          </div>
        </div>

        {/* Metric 4 - Rescue Opportunities */}
        <div className="bg-white rounded-3xl p-5 shadow-card border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Rescue Opportunities</span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="my-4">
            <span className="text-4xl font-black text-emerald-900 tracking-tight">{kpis.rescueOpportunitiesCount}</span>
            <p className="text-xs text-slate-500 font-medium mt-1">{summary?.addressable_units ?? 0} addressable units</p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-900 text-[11px] font-semibold w-fit">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Ready for review
          </div>
        </div>
      </div>

      {/* TOP RECOMMENDATION HERO CARD (SPOTLIGHT GREEN GRADIENT ON HOVER) */}
      {topRec && (
        <div
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
            e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
          }}
          className="bg-emerald-950 text-white rounded-3xl p-6 shadow-soft relative overflow-hidden group border border-emerald-800/40 hover:border-emerald-500/50 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-950/50 select-none"
        >
          {/* Green Gradient Spotlight - Illuminates strictly in the hovered area */}
          <div
            className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: `radial-gradient(400px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), rgba(16, 185, 129, 0.4), rgba(5, 150, 105, 0.12), transparent 75%)`
            }}
          />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-white/10 group-hover:bg-white/15 group-hover:border-emerald-400/40 transition-colors">
                <Sparkles className="w-3.5 h-3.5" />
                Highest-Ranked Opportunity Candidate
              </div>
              
              <div className="flex items-center gap-3 text-xl sm:text-2xl font-extrabold text-white">
                <span className="group-hover:text-emerald-50 transition-colors">{topRec.source_facility_name}</span>
                <ArrowRight className="w-6 h-6 text-emerald-400 shrink-0 group-hover:translate-x-2 group-hover:text-emerald-300 transition-all duration-300" />
                <span className="group-hover:text-emerald-50 transition-colors">{topRec.dest_facility_name}</span>
              </div>

              <p className="text-xs text-emerald-200/90 max-w-xl group-hover:text-emerald-100 transition-colors">
                Identify {topRec.units} units of <strong className="text-white font-bold">{formatBloodGroup(topRec.blood_group)} {formatComponent(topRec.component)}</strong> available for redistribution to mitigate predicted deficit.
              </p>
            </div>

            <div className="flex items-center gap-4 bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/15 shrink-0 group-hover:border-emerald-400/40 group-hover:bg-white/15 transition-all duration-300">
              <div className="text-center px-2">
                <span className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider">Rescue Score</span>
                <div className="text-3xl font-black text-emerald-300 mt-0.5 group-hover:scale-105 transition-transform duration-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">
                  {topRec.rescue_score}/100
                </div>
              </div>

              <button
                onClick={() => setSelectedRecommendation(topRec)}
                className="px-5 py-3 bg-white text-emerald-950 hover:bg-emerald-50 hover:scale-105 active:scale-95 text-xs font-black rounded-full transition-all shadow-md hover:shadow-xl hover:shadow-white/20 flex items-center gap-2 cursor-pointer"
              >
                <Eye className="w-4 h-4 text-emerald-900" />
                View Recommendation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NETWORK OVERVIEW & RISK TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* EXPIRY RISK SECTION */}
        <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Expiry Risk Overview</h3>
                <p className="text-xs text-slate-500">Inventory items nearing short expiration windows</p>
              </div>
              <button
                onClick={() => setActiveRoute('/inventory')}
                className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1"
              >
                View Inventory <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-2">Facility</th>
                    <th className="pb-2">Blood</th>
                    <th className="pb-2">Qty</th>
                    <th className="pb-2">Days Left</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expiryRiskItems.map((item) => (
                    <tr key={item.lot_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 font-semibold text-slate-800">{item.facility_name}</td>
                      <td className="py-3">
                        <span className="font-bold text-emerald-900">{formatBloodGroup(item.blood_group)}</span>{' '}
                        <span className="text-slate-500 font-medium">{formatComponent(item.component)}</span>
                      </td>
                      <td className="py-3 font-bold text-slate-800">{item.units}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold text-[11px]">
                          {item.days_to_expiry} days left
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setSelectedLot(item)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors"
                        >
                          Audit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SHORTAGE RISK SECTION */}
        <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Shortage Risk Overview</h3>
                <p className="text-xs text-slate-500">Predicted inventory deficits over forecast horizon</p>
              </div>
              <button
                onClick={() => setActiveRoute('/forecast')}
                className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1"
              >
                View Forecast <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-2">Facility</th>
                    <th className="pb-2">Blood</th>
                    <th className="pb-2">Stock</th>
                    <th className="pb-2">Forecast</th>
                    <th className="pb-2 text-right">Gap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shortageRiskItems.map((fc, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 font-semibold text-slate-800">{fc.facility_name}</td>
                      <td className="py-3">
                        <span className="font-bold text-emerald-900">{formatBloodGroup(fc.blood_group)}</span>{' '}
                        <span className="text-slate-500 font-medium">{formatComponent(fc.component)}</span>
                      </td>
                      <td className="py-3 font-bold text-slate-700">{fc.usable_units}</td>
                      <td className="py-3 font-bold text-slate-700">{fc.forecast_demand}</td>
                      <td className="py-3 text-right">
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 font-black text-[11px]">
                          {fc.gap_units} units
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      <DisclaimerFooter />
    </div>
  );
};
