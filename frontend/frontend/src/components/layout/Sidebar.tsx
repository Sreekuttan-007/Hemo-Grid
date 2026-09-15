import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Package,
  AlertTriangle,
  Network,
  ArrowLeftRight,
  TrendingUp,
  ShieldPlus,
  SlidersHorizontal,
  Leaf,
  Bell,
  Settings,
  RotateCcw,
  Droplet
} from 'lucide-react';

interface NavItemProps {
  route: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export const Sidebar: React.FC = () => {
  const { activeRoute, setActiveRoute, alerts, recommendations, resetDemoData } = useApp();

  const unreadAlerts = alerts.filter((a) => !a.read).length;
  const activeRecs = recommendations.filter((r) => r.status !== 'REJECTED' && r.status !== 'CLOSED').length;

  const NavItem: React.FC<NavItemProps> = ({ route, label, icon: Icon, badge }) => {
    const isActive = activeRoute === route;

    return (
      <button
        onClick={() => setActiveRoute(route)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-150 group ${
          isActive
            ? 'bg-emerald-900 text-white shadow-sm'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 transition-colors ${
            isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-800'
          }`} />
          <span>{label}</span>
        </div>
        {badge !== undefined && badge > 0 && (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isActive
                ? 'bg-white/20 text-white'
                : 'bg-emerald-100 text-emerald-900'
            }`}
          >
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="w-64 bg-slate-50/50 rounded-3xl border border-slate-200/60 p-4 flex flex-col justify-between shrink-0 h-full overflow-y-auto">
      <div>
        {/* Brand Header */}
        <div className="px-3 py-3 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 flex items-center justify-center text-white shadow-md shadow-emerald-900/10">
            <Droplet className="w-5 h-5 fill-white text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-1">
              HEMOGRID
            </h1>
            <p className="text-[11px] font-medium text-emerald-800 tracking-tight">
              Predict. Connect. Rescue.
            </p>
          </div>
        </div>

        {/* Navigation Groups */}
        <div className="space-y-5">
          {/* MAIN */}
          <div>
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Main Operations
            </span>
            <div className="space-y-1">
              <NavItem route="/dashboard" label="Command Center" icon={LayoutDashboard} />
              <NavItem route="/inventory" label="Inventory" icon={Package} />
              <NavItem route="/risks" label="Risk Monitor" icon={AlertTriangle} />
              <NavItem route="/network" label="Network" icon={Network} />
              <NavItem route="/recommendations" label="Recommendations" icon={ArrowLeftRight} badge={activeRecs} />
            </div>
          </div>

          {/* INTELLIGENCE */}
          <div>
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Intelligence
            </span>
            <div className="space-y-1">
              <NavItem route="/forecast" label="Demand Forecast" icon={TrendingUp} />
              <NavItem route="/rescue" label="Rescue Mode" icon={ShieldPlus} />
              <NavItem route="/simulator" label="What-If Simulator" icon={SlidersHorizontal} />
            </div>
          </div>

          {/* IMPACT */}
          <div>
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Impact & Sustainability
            </span>
            <div className="space-y-1">
              <NavItem route="/impact" label="Sustainability" icon={Leaf} />
            </div>
          </div>

          {/* SYSTEM */}
          <div>
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              System
            </span>
            <div className="space-y-1">
              <NavItem route="/alerts" label="Alerts" icon={Bell} badge={unreadAlerts} />
              <NavItem route="/settings" label="Settings" icon={Settings} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Demo Card */}
      <div className="mt-6 pt-4 border-t border-slate-200/60 space-y-3">
        <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Demo Environment
            </span>
            <button
              onClick={resetDemoData}
              title="Reset Golden Scenario Mock State"
              className="text-[10px] font-semibold text-slate-500 hover:text-emerald-900 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Golden Scenario prototype state active.
          </p>
        </div>

        {/* User profile info */}
        <div className="flex items-center gap-2.5 px-2 py-1">
          <div className="w-8 h-8 rounded-full bg-emerald-900 text-white font-bold text-xs flex items-center justify-center">
            HG
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">Blood Bank Admin</p>
            <p className="text-[10px] text-slate-400 truncate">Regional Ops Lead</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
