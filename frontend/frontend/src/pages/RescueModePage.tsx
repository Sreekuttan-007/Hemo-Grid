import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldPlus,
  Sparkles,
  ArrowRight,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';

export const RescueModePage: React.FC = () => {
  const { setSelectedRecommendation, recommendations } = useApp();

  const [scanState, setScanState] = useState<'IDLE' | 'SCANNING' | 'COMPLETE'>('IDLE');
  const [scanStep, setScanStep] = useState<number>(0);

  const steps = [
    'Scanning facility inventory databases...',
    'Analyzing 7-day predictive demand curves...',
    'Searching 10 connected regional network nodes...',
    'Applying mandatory cold-chain & safety gates...',
    'Ranking optimal rescue candidates by score...'
  ];

  const handleActivateScan = () => {
    setScanState('SCANNING');
    setScanStep(0);

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setScanStep(currentStep);
      } else {
        clearInterval(interval);
        setScanState('COMPLETE');
      }
    }, 600);
  };

  const topRec = recommendations.find(r => r.id === 'HG-REC-001') || recommendations[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
          <ShieldPlus className="w-4 h-4 text-emerald-600" />
          Intelligence Module
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Rescue Mode</h1>
        <p className="text-xs font-medium text-slate-500 mt-1">
          Find inventory that can still be rescued before potential expiry.
        </p>
      </div>

      {/* HERO CARD */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 rounded-3xl p-6 text-white shadow-soft relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-400/30">
              Active Rescue Window Alert
            </span>

            <h2 className="text-2xl font-black text-white">
              12 O+ RBC Units at Greenfield Medical Center
            </h2>

            <p className="text-xs text-emerald-200/90 max-w-xl">
              7 units are entering critical expiration window in 3 days. Local consumption will only utilize 8 units before expiration, creating 12 potential surplus units available for network rescue.
            </p>

            {/* EXPIRY TIMELINE VISUALIZATION */}
            <div className="pt-2 space-y-2">
              <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
                Unit Lifecycle & Rescue Window Trajectory
              </span>
              <div className="grid grid-cols-5 gap-2 text-center">
                <div className="p-2 rounded-xl bg-white/10 text-emerald-100 text-xs font-semibold">
                  <span className="block text-[9px] text-emerald-300 font-bold uppercase">Day 1</span>
                  Stable
                </div>
                <div className="p-2 rounded-xl bg-white/10 text-emerald-100 text-xs font-semibold">
                  <span className="block text-[9px] text-emerald-300 font-bold uppercase">Day 2</span>
                  Stable
                </div>
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-200 text-xs font-semibold border border-amber-400/30">
                  <span className="block text-[9px] text-amber-300 font-bold uppercase">Day 3</span>
                  Watch
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-extrabold shadow-lg scale-105 border-2 border-white">
                  <span className="block text-[9px] text-slate-900 font-black uppercase">Day 4</span>
                  RESCUE WINDOW
                </div>
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-200 text-xs font-semibold border border-rose-400/30">
                  <span className="block text-[9px] text-rose-300 font-bold uppercase">Day 5</span>
                  Expiry Risk
                </div>
              </div>
            </div>
          </div>

          {/* MAIN SCAN BUTTON */}
          <div className="shrink-0 flex flex-col items-center justify-center p-4 bg-white/10 backdrop-blur rounded-2xl border border-white/15">
            <button
              onClick={handleActivateScan}
              disabled={scanState === 'SCANNING'}
              className="px-6 py-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-sm rounded-full transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2.5"
            >
              {scanState === 'SCANNING' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                  Scanning Network...
                </>
              ) : (
                <>
                  <ShieldPlus className="w-5 h-5 text-slate-950" />
                  Activate Rescue Scan
                </>
              )}
            </button>
            <span className="text-[10px] text-emerald-200 mt-2">Trigger real-time network optimization</span>
          </div>
        </div>
      </div>

      {/* STAGED ANIMATION DISPLAY */}
      {scanState === 'SCANNING' && (
        <div className="bg-white rounded-3xl p-8 shadow-card border border-slate-100 text-center space-y-4 animate-in zoom-in-95 duration-200">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto animate-bounce">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-800" />
          </div>
          <div>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Step {scanStep + 1} of 5</span>
            <h3 className="text-lg font-bold text-slate-800 mt-1">{steps[scanStep]}</h3>
          </div>
          <div className="max-w-md mx-auto h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-800 transition-all duration-300"
              style={{ width: `${((scanStep + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* REVEAL RESULT WHEN COMPLETE */}
      {scanState === 'COMPLETE' && (
        <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
          <div className="bg-white rounded-3xl p-6 shadow-card border border-emerald-200 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-lg">
                <Sparkles className="w-6 h-6 text-emerald-600" />
                OPTIMAL RESCUE MATCH FOUND
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-black text-xs rounded-full">
                Rescue Score: 94/100
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-emerald-50/60 rounded-2xl border border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-900 text-white flex items-center justify-center font-bold text-xs">
                  GMC
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium">Source Facility</span>
                  <h4 className="font-bold text-sm text-slate-900">Greenfield Medical Center</h4>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-emerald-900">5 Units O+ RBC</span>
                <ArrowRight className="w-5 h-5 text-emerald-700" />
                <span className="text-[10px] text-slate-400">Estimated Transit: 24 mins</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  CGH
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium">Destination Need</span>
                  <h4 className="font-bold text-sm text-slate-900">City General Hospital</h4>
                </div>
              </div>
            </div>

            {/* SIMULATED PROTOTYPE IMPACT CARDS */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Potential Rescue Impact Metrics
                </h4>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                  Simulated prototype impact
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-900 font-black text-xl flex items-center justify-center">
                    5
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Potential Units Rescued</span>
                    <span className="text-xs text-slate-500">Prevented expiry at source facility</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-900 font-black text-xl flex items-center justify-center">
                    1
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Predicted Shortage Mitigated</span>
                    <span className="text-xs text-slate-500">Averted acute deficit at City General Hospital</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedRecommendation(topRec)}
              className="w-full py-3 bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-xs rounded-full transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Open Recommendation for Authorized Review
            </button>
          </div>
        </div>
      )}

      <DisclaimerFooter />
    </div>
  );
};
