import React from 'react';
import { useApp } from '../context/AppContext';
import { RotateCcw } from 'lucide-react';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, resetDemoData } = useApp();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Settings</h1>
        <p className="text-xs font-medium text-slate-500 mt-1">
          Configure local prototype parameters and operational risk thresholds.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-card border border-slate-100 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base">Operational Risk & Threshold Settings</h3>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            Prototype configuration
          </span>
        </div>

        <div className="space-y-6 max-w-2xl">
          
          {/* Expiry Risk Window */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl">
            <div>
              <label className="text-xs font-bold text-slate-800 block">Expiry Risk Window</label>
              <span className="text-[11px] text-slate-500">Days remaining to trigger expiry risk flag</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.expiryRiskWindowDays}
                onChange={(e) => updateSettings({ expiryRiskWindowDays: Number(e.target.value) })}
                className="w-20 py-1.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-center"
              />
              <span className="text-xs text-slate-500 font-semibold">Days</span>
            </div>
          </div>

          {/* Forecast Window */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl">
            <div>
              <label className="text-xs font-bold text-slate-800 block">Demand Forecast Window</label>
              <span className="text-[11px] text-slate-500">Predictive analysis horizon for facility consumption</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.forecastWindowDays}
                onChange={(e) => updateSettings({ forecastWindowDays: Number(e.target.value) })}
                className="w-20 py-1.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-center"
              />
              <span className="text-xs text-slate-500 font-semibold">Days</span>
            </div>
          </div>

          {/* Shortage Threshold */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl">
            <div>
              <label className="text-xs font-bold text-slate-800 block">Critical Deficit Threshold</label>
              <span className="text-[11px] text-slate-500">Deficit quantity required to flag critical shortage</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.shortageThresholdUnits}
                onChange={(e) => updateSettings({ shortageThresholdUnits: Number(e.target.value) })}
                className="w-20 py-1.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-center"
              />
              <span className="text-xs text-slate-500 font-semibold">Units</span>
            </div>
          </div>

          {/* Strict Protocol Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl">
            <div>
              <label className="text-xs font-bold text-slate-800 block">Enforce Strict Cold Chain Safety Gate</label>
              <span className="text-[11px] text-slate-500">Automatically exclude candidates with storage anomalies</span>
            </div>
            <input
              type="checkbox"
              checked={settings.safetyStrictProtocol}
              onChange={(e) => updateSettings({ safetyStrictProtocol: e.target.checked })}
              className="w-5 h-5 accent-emerald-800 rounded cursor-pointer"
            />
          </div>

          {/* Demo Reset Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Reset Prototype Environment</span>
              <span className="text-[11px] text-slate-500">Revert all mock inventory and recommendations to initial Golden Scenario</span>
            </div>
            <button
              onClick={resetDemoData}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-full transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-600" /> Reset Prototype
            </button>
          </div>

        </div>
      </div>

      <DisclaimerFooter />
    </div>
  );
};
