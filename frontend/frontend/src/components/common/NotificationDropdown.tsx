import React from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, AlertTriangle, ArrowRight } from 'lucide-react';

export const NotificationDropdown: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { alerts, markAlertRead, setActiveRoute } = useApp();

  const handleAlertClick = (alertId: string, route: string) => {
    markAlertRead(alertId);
    setActiveRoute(route);
    onClose();
  };

  return (
    <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-emerald-400" />
          <h4 className="font-bold text-sm">Network Notifications</h4>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-300 text-xs font-semibold">
          {alerts.filter((a) => !a.read).length} Unread
        </span>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            onClick={() => handleAlertClick(alert.id, alert.targetRoute)}
            className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 ${
              !alert.read ? 'bg-emerald-50/40' : ''
            }`}
          >
            <div className={`p-2 rounded-xl shrink-0 ${
              alert.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700' :
              alert.severity === 'HIGH' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 truncate">{alert.title}</span>
                <span className="text-[10px] text-slate-400 shrink-0">{alert.timestamp}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{alert.description}</p>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-emerald-900">{alert.hospitalName}</span>
                <span className="text-emerald-700 hover:underline flex items-center gap-1 font-semibold">
                  Action <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
        <button
          onClick={() => {
            setActiveRoute('/alerts');
            onClose();
          }}
          className="text-xs font-bold text-emerald-900 hover:text-emerald-800 hover:underline"
        >
          View All Network Alerts
        </button>
      </div>
    </div>
  );
};
