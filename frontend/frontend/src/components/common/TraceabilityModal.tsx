import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, Thermometer, ShieldCheck, QrCode } from 'lucide-react';
import { DisclaimerFooter } from './DisclaimerFooter';

export const TraceabilityModal: React.FC = () => {
  const { selectedLot, setSelectedLot, setActiveRoute } = useApp();

  if (!selectedLot) return null;

  const item = selectedLot;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-900 to-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
              <QrCode className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">Unit Traceability Audit</h3>
                <span className="px-2 py-0.5 rounded-md bg-emerald-800 text-emerald-200 text-xs font-mono font-medium">
                  {item.trace_id}
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                Lot ID: {item.lot_id} • {item.blood_group} {item.component}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedLot(null)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-medium text-slate-500 block">Facility</span>
              <span className="text-sm font-semibold text-slate-800 truncate block mt-0.5">{item.facility_name}</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-medium text-slate-500 block">Blood Group</span>
              <span className="text-sm font-bold text-emerald-900 block mt-0.5">{item.blood_group} {item.component}</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-medium text-slate-500 block">Quantity</span>
              <span className="text-sm font-semibold text-slate-800 block mt-0.5">{item.units} Units</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-xs font-medium text-slate-500 block">Cold Storage</span>
              <span className="text-sm font-semibold text-slate-800 block mt-0.5 flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-emerald-600" />
                4.2°C
              </span>
            </div>
          </div>

          {/* Traceability Timeline */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              Traceability & Chain of Custody Timeline
            </h4>
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              
              {/* Step 1 */}
              <div className="relative flex items-start gap-4">
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  1
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-800">Collected & Testing Verified</span>
                    <span className="text-xs text-slate-400">Sep 08, 2026</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Donor batch reference BATCH-2026-X90. Infectious disease screening completed & cleared.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative flex items-start gap-4">
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  2
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-800">Stored in Temperature-Controlled Bay</span>
                    <span className="text-xs text-slate-400">Cold Chain Verified</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Storage status: <span className="font-semibold text-slate-700">{item.storage_status}</span> at 4.2°C continuous telemetric monitoring.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative flex items-start gap-4">
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  3
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-800">Currently Tracked by HemoGrid</span>
                    <span className="text-xs text-slate-400">Real-time Node</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Active location: {item.facility_name}. Days remaining to expiry: <span className="font-bold text-amber-700">{item.days_to_expiry} days</span>.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="relative flex items-start gap-4">
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  4
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-800">Potential Expiry Risk Identified</span>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-md uppercase">
                      {item.window_state === 'RESCUE_WINDOW' ? 'HIGH' : item.window_state === 'WATCH' ? 'MEDIUM' : 'LOW'} Risk
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    HemoGrid predictive model flagged potential unit wastage before expiration at local facility.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="relative flex items-start gap-4">
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-900 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  5
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-emerald-900">Recommendation Engine Evaluation</span>
                    <span className="text-xs text-emerald-700 font-medium">Eligible Match</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Candidate redistribution opportunity available for authorized blood-bank review.
                  </p>
                </div>
              </div>

            </div>
          </div>

          <DisclaimerFooter compact />
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => {
              setSelectedLot(null);
              setActiveRoute('/recommendations');
            }}
            className="px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold rounded-full transition-colors flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            View Network Recommendations
          </button>
          <button
            onClick={() => setSelectedLot(null)}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-full hover:bg-slate-100 transition-colors"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
