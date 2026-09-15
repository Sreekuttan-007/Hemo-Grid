import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, ArrowRight, ShieldCheck, CheckCircle2, Sparkles, Building2, Package, Eye } from 'lucide-react';
import { SafetyGateBadge } from './SafetyGateBadge';
import { DisclaimerFooter } from './DisclaimerFooter';
import { formatBloodGroup, formatComponent, priorityTier } from '../../format';

export const RecommendationDrawer: React.FC = () => {
  const {
    selectedRecommendation,
    setSelectedRecommendation,
    updateRecommendationStatus,
    setActiveRoute
  } = useApp();

  if (!selectedRecommendation) return null;

  const rec = selectedRecommendation;
  const tier = priorityTier(rec.rescue_score);

  const handleMarkUnderReview = () => {
    updateRecommendationStatus(rec.id, 'UNDER_REVIEW');
  };

  const handleViewSourceInventory = () => {
    setSelectedRecommendation(null);
    setActiveRoute('/inventory');
  };

  const handleViewDestinationNeed = () => {
    setSelectedRecommendation(null);
    setActiveRoute('/forecast');
  };

  const statusText =
    rec.status === 'GENERATED' ? 'New Match Identified' :
    rec.status === 'UNDER_REVIEW' ? 'Under Active Blood Bank Review' :
    rec.status === 'APPROVED' ? 'Approved for Redistribution' :
    rec.status === 'REJECTED' ? 'Candidate Rejected' :
    rec.status === 'CLOSED' ? 'Redistribution Logged' : rec.status;

  const statusBadgeStyle =
    rec.status === 'REJECTED' || rec.status === 'CLOSED' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-900 text-white';

  const disabledStatus = rec.status === 'UNDER_REVIEW' || rec.status === 'REJECTED' || rec.status === 'CLOSED';

  const explanationItems = [
    { label: 'Why this source?', text: rec.explanation.why_source },
    { label: 'Why this destination?', text: rec.explanation.why_destination },
    { label: 'Why this quantity?', text: rec.explanation.why_quantity },
    { label: 'Why now?', text: rec.explanation.why_now },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-slate-100 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 text-white relative">
          <button
            onClick={() => setSelectedRecommendation(null)}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Redistribution Opportunity Details
          </div>

          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {rec.source_facility_name}
            <ArrowRight className="w-5 h-5 text-emerald-400 shrink-0" />
            {rec.dest_facility_name}
          </h2>

          <div className="mt-4 flex items-center justify-between bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/15">
            <div>
              <span className="text-xs text-emerald-200 block">Candidate Quantity</span>
              <span className="text-2xl font-black text-white mt-0.5 block">
                {rec.units} <span className="text-lg font-bold text-emerald-300">{formatBloodGroup(rec.blood_group)} {formatComponent(rec.component)}</span>
              </span>
            </div>

            <div className="text-right">
              <span className="text-xs text-emerald-200 block">Rescue Score</span>
              <div className="flex items-baseline gap-1 mt-0.5 justify-end">
                <span className="text-3xl font-black text-emerald-300">{rec.rescue_score}</span>
                <span className="text-xs text-emerald-200 font-semibold">/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Status Banner */}
          <div className="flex items-center justify-between p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100">
            <div>
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wide block">Current Operational Status</span>
              <span className="text-sm font-bold text-emerald-950 mt-0.5 block">
                {statusText}
              </span>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadgeStyle}`}>
              {tier} PRIORITY
            </span>
          </div>

          {/* WHY THIS MATCH? */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-700" />
              Why This Match? (Predictive Logic)
            </h3>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5">
              {explanationItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SAFETY GATE */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Safety Gate Verification
              </h3>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                Mandatory Safety Verification
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {rec.checks.map((check, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/80 shadow-card">
                  <div className="pr-2">
                    <span className="text-xs font-semibold text-slate-800 block">{check.label}</span>
                    <span className="text-[11px] text-slate-500 block">{check.detail}</span>
                  </div>
                  <SafetyGateBadge status={check.passed ? 'PASS' : 'FAIL'} />
                </div>
              ))}
            </div>
          </div>

          <DisclaimerFooter compact />
        </div>

        {/* Actions Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleViewSourceInventory}
              className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
            >
              <Package className="w-4 h-4 text-slate-500" />
              View Source Inventory
            </button>
            <button
              onClick={handleViewDestinationNeed}
              className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
            >
              <Eye className="w-4 h-4 text-slate-500" />
              View Destination Need
            </button>
          </div>

          <button
            onClick={handleMarkUnderReview}
            disabled={disabledStatus}
            className={`w-full py-3 rounded-full text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm ${
              rec.status === 'UNDER_REVIEW'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 cursor-default'
                : disabledStatus
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-900 hover:bg-emerald-800 text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {rec.status === 'UNDER_REVIEW' ? 'Currently Under Authorized Review' : 'Mark Under Review'}
          </button>
        </div>
      </div>
    </div>
  );
};
