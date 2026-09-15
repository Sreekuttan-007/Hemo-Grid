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
        {/* Metric 1 - Total Inventory */}
        <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 text-white rounded-3xl p-5 shadow-card relative overflow-hidden flex flex-col justify-between group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-200">Total Inventory</span>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="my-4">
            <span className="text-4xl font-black tracking-tight">{kpis.totalInventory}</span>
            <p className="text-xs text-emerald-200/80 font-medium mt-1">Across {summary?.total_lots ?? 0} lots</p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-emerald-200 text-[11px] font-medium w-fit">
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

      {/* TOP RECOMMENDATION HERO CARD */}
      {topRec && (
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 rounded-3xl p-6 text-white shadow-soft relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-white/10">
                <Sparkles className="w-3.5 h-3.5" />
                Highest-Ranked Opportunity Candidate
              </div>
              
              <div className="flex items-center gap-3 text-xl sm:text-2xl font-extrabold text-white">
                <span>{topRec.source_facility_name}</span>
                <ArrowRight className="w-6 h-6 text-emerald-400 shrink-0" />
                <span>{topRec.dest_facility_name}</span>
              </div>

              <p className="text-xs text-emerald-200/90 max-w-xl">
                Identify {topRec.units} units of <strong className="text-white font-bold">{formatBloodGroup(topRec.blood_group)} {formatComponent(topRec.component)}</strong> available for redistribution to mitigate predicted deficit.
              </p>
            </div>

            <div className="flex items-center gap-4 bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/15 shrink-0">
              <div className="text-center px-2">
                <span className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider">Rescue Score</span>
                <div className="text-3xl font-black text-emerald-300 mt-0.5">{topRec.rescue_score}/100</div>
              </div>

              <button
                onClick={() => setSelectedRecommendation(topRec)}
                className="px-5 py-3 bg-white text-emerald-950 hover:bg-emerald-50 text-xs font-black rounded-full transition-all shadow-md flex items-center gap-2"
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
