import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Package,
  AlertTriangle,
  Network,
  ArrowLeftRight,
  TrendingUp,
  ShieldPlus,
  Leaf,
  Bell,
  Settings,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Globe
} from 'lucide-react';

interface NavItemProps {
  route: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  isCollapsed: boolean;
}

export const Sidebar: React.FC = () => {
  const { activeRoute, setActiveRoute, alerts, recommendations, resetDemoData } = useApp();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const unreadAlerts = alerts.filter((a) => !a.read).length;
  const activeRecs = recommendations.filter((r) => r.status !== 'REJECTED' && r.status !== 'CLOSED').length;

  const NavItem: React.FC<NavItemProps> = ({ route, label, icon: Icon, badge, isCollapsed }) => {
    const isActive = activeRoute === route;

    return (
      <button
        onClick={() => setActiveRoute(route)}
        title={isCollapsed ? label : undefined}
        className={`w-full flex items-center ${
          isCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-2.5'
        } rounded-2xl text-xs font-semibold transition-all duration-200 group relative ${
          isActive
            ? 'bg-emerald-900 text-white shadow-sm'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
        }`}
      >
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="relative">
            <Icon
              className={`w-4 h-4 transition-colors ${
                isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-800'
              }`}
            />
            {isCollapsed && badge !== undefined && badge > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            )}
          </div>
          {!isCollapsed && <span className="truncate">{label}</span>}
        </div>

        {!isCollapsed && badge !== undefined && badge > 0 && (
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
    <aside
      className={`${
        isCollapsed ? 'w-20 p-2.5' : 'w-64 p-4'
      } bg-slate-50/50 rounded-3xl border border-slate-200/60 flex flex-col justify-between shrink-0 h-full overflow-y-auto transition-all duration-300 ease-in-out select-none relative`}
    >
      <div>
        {/* Toggle Collapse Button */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center mb-3' : 'justify-end mb-1'}`}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-xl hover:bg-slate-200/70 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Brand Header */}
        <div className={`mb-4 flex items-center justify-center text-center w-full transition-all duration-300 ${isCollapsed ? 'px-1 py-1' : 'px-2 py-2'}`}>
          <img
            src="/logo.png"
            alt="HemoGrid Logo"
            className={`${isCollapsed ? 'h-10 w-10 object-contain' : 'h-20 max-w-full w-auto object-contain'} mx-auto transition-all duration-300`}
          />
        </div>

        {/* Navigation Groups */}
        <div className="space-y-4">
          {/* MAIN */}
          <div>
            {!isCollapsed ? (
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Main Operations
              </span>
            ) : (
              <div className="w-8 h-[1px] bg-slate-200 mx-auto my-2" />
            )}
            <div className="space-y-1">
              <NavItem route="/landing" label="Product Overview" icon={Globe} isCollapsed={isCollapsed} />
              <NavItem route="/dashboard" label="Command Center" icon={LayoutDashboard} isCollapsed={isCollapsed} />
              <NavItem route="/inventory" label="Inventory" icon={Package} isCollapsed={isCollapsed} />
              <NavItem route="/risks" label="Risk Monitor" icon={AlertTriangle} isCollapsed={isCollapsed} />
              <NavItem route="/network" label="Network" icon={Network} isCollapsed={isCollapsed} />
              <NavItem route="/recommendations" label="Recommendations" icon={ArrowLeftRight} badge={activeRecs} isCollapsed={isCollapsed} />
            </div>
          </div>

          {/* INTELLIGENCE */}
          <div>
            {!isCollapsed ? (
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Intelligence
              </span>
            ) : (
              <div className="w-8 h-[1px] bg-slate-200 mx-auto my-2" />
            )}
            <div className="space-y-1">
              <NavItem route="/forecast" label="Demand Forecast" icon={TrendingUp} isCollapsed={isCollapsed} />
              <NavItem route="/rescue" label="Rescue Mode" icon={ShieldPlus} isCollapsed={isCollapsed} />
            </div>
          </div>

          {/* IMPACT */}
          <div>
            {!isCollapsed ? (
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Impact & Sustainability
              </span>
            ) : (
              <div className="w-8 h-[1px] bg-slate-200 mx-auto my-2" />
            )}
            <div className="space-y-1">
              <NavItem route="/impact" label="Sustainability" icon={Leaf} isCollapsed={isCollapsed} />
            </div>
          </div>

          {/* SYSTEM */}
          <div>
            {!isCollapsed ? (
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                System
              </span>
            ) : (
              <div className="w-8 h-[1px] bg-slate-200 mx-auto my-2" />
            )}
            <div className="space-y-1">
              <NavItem route="/alerts" label="Alerts" icon={Bell} badge={unreadAlerts} isCollapsed={isCollapsed} />
              <NavItem route="/settings" label="Settings" icon={Settings} isCollapsed={isCollapsed} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Demo & Profile */}
      <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-2.5">
        {!isCollapsed ? (
          <>
            <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Demo Environment
                </span>
                <button
                  onClick={resetDemoData}
                  title="Reset Golden Scenario Mock State"
                  className="text-[10px] font-semibold text-slate-500 hover:text-emerald-900 flex items-center gap-1 transition-colors cursor-pointer"
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
              <div className="w-8 h-8 rounded-full bg-emerald-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                HG
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">Blood Bank Admin</p>
                <p className="text-[10px] text-slate-400 truncate">Regional Ops Lead</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={resetDemoData}
              title="Reset Demo Data"
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-emerald-800 hover:bg-slate-100 transition-colors shadow-sm cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div
              title="Blood Bank Admin (Regional Ops Lead)"
              className="w-8 h-8 rounded-full bg-emerald-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm cursor-pointer"
            >
              HG
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
