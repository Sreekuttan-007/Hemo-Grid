import React from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';

export const AlertsPage: React.FC = () => {
  const { alerts, markAlertRead, setActiveRoute } = useApp();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Alerts</h1>
        <p className="text-xs font-medium text-slate-500 mt-1">
          Attention items requiring operational review across the network.
        </p>
      </div>

      {/* ALERT ITEMS LIST */}
      <div className="bg-white rounded-3xl shadow-card border border-slate-100 overflow-hidden divide-y divide-slate-100">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors ${
              !alert.read ? 'bg-emerald-50/30' : ''
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl shrink-0 ${
                alert.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700' :
                alert.severity === 'HIGH' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    alert.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                    alert.severity === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {alert.severity}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {alert.category.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] text-slate-400">• {alert.timestamp}</span>
                </div>

                <h3 className="font-extrabold text-sm text-slate-900">{alert.title}</h3>
                <p className="text-xs text-slate-600 max-w-2xl">{alert.description}</p>
                <p className="text-xs font-semibold text-emerald-900 mt-1">Facility: {alert.hospitalName}</p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2 sm:self-center">
              <button
                onClick={() => {
                  markAlertRead(alert.id);
                  setActiveRoute(alert.targetRoute);
                }}
                className="px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-white rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                Inspect <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <DisclaimerFooter />
    </div>
  );
};
