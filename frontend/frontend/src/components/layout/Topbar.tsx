import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, Bell, Shield, User, Command, ArrowRight } from 'lucide-react';
import { NotificationDropdown } from '../common/NotificationDropdown';

export const Topbar: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    alerts,
    setActiveRoute,
    setSelectedLot,
    setSelectedRecommendation
  } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const unreadAlertCount = alerts.filter((a) => !a.read).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSearchResult = (res: any) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    setActiveRoute(res.route);

    if (res.type === 'lot') {
      setSelectedLot(res.payload);
    } else if (res.type === 'recommendation') {
      setSelectedRecommendation(res.payload);
    }
  };

  return (
    <header className="flex items-center justify-between gap-4 mb-6 relative">
      {/* Search Field */}
      <div className="relative flex-1 max-w-md" ref={searchRef}>
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            onFocus={() => setShowSearchDropdown(true)}
            placeholder="Search hospitals, batch IDs, blood groups..."
            className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200/80 rounded-full text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800 transition-all shadow-sm"
          />
          <span className="absolute right-3 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-200/60 text-slate-500 text-[10px] font-mono font-medium">
            <Command className="w-2.5 h-2.5" /> F
          </span>
        </div>

        {/* Global Search Results Dropdown */}
        {showSearchDropdown && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-12 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-50 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-2 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Search Results ({searchResults.length})
            </div>
            {searchResults.map((res) => (
              <div
                key={res.id}
                onClick={() => handleSelectSearchResult(res)}
                className="px-4 py-3 hover:bg-emerald-50/50 cursor-pointer transition-colors flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800">{res.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{res.subtitle}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-700" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Topbar Right Controls */}
      <div className="flex items-center gap-3">
        {/* Environment Status Badge */}
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-900 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
          Demo Environment
        </span>

        {/* Alerts quick button */}
        <button
          onClick={() => setActiveRoute('/alerts')}
          className="p-2.5 rounded-full bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 transition-colors relative"
          title="Network Alerts"
        >
          <Shield className="w-4 h-4" />
        </button>

        {/* Notifications Button & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 rounded-full bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                {unreadAlertCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <NotificationDropdown onClose={() => setShowNotifications(false)} />
          )}
        </div>

        {/* User Profile Badge */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-800 to-emerald-900 text-white font-bold text-xs flex items-center justify-center shadow-sm">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-bold text-slate-800 leading-none">Blood Bank Operations</p>
            <p className="text-[10px] text-slate-400 mt-1 leading-none">Regional Command</p>
          </div>
        </div>
      </div>
    </header>
  );
};
