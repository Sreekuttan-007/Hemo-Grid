import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Search, QrCode, RotateCcw, Package } from 'lucide-react';
import { DisclaimerFooter } from '../components/common/DisclaimerFooter';
import {
  formatBloodGroup,
  formatComponent,
  formatStorageStatus,
  storageStatusBadgeStyle,
  formatWindowState,
  windowStateBadgeStyle
} from '../format';
import type { WindowState } from '../types';

const BLOOD_GROUPS = ['O_POS', 'O_NEG', 'A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG'] as const;
const COMPONENTS = ['RBC', 'PLATELETS', 'PLASMA'] as const;
const WINDOW_STATES: readonly WindowState[] = ['NORMAL', 'WATCH', 'RESCUE_WINDOW', 'UNRESCUABLE'];

export const InventoryPage: React.FC = () => {
  const { expiryLots, facilities, setSelectedLot } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFacility, setSelectedFacility] = useState('ALL');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('ALL');
  const [selectedComponent, setSelectedComponent] = useState('ALL');
  const [selectedWindowState, setSelectedWindowState] = useState('ALL');
  const [selectedStorage, setSelectedStorage] = useState('ALL');

  const filteredLots = useMemo(() => {
    return expiryLots.filter((item) => {
      if (searchTerm && !item.lot_id.toLowerCase().includes(searchTerm.toLowerCase()) && !item.facility_name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (selectedFacility !== 'ALL' && item.facility_id !== selectedFacility) return false;
      if (selectedBloodGroup !== 'ALL' && item.blood_group !== selectedBloodGroup) return false;
      if (selectedComponent !== 'ALL' && item.component !== selectedComponent) return false;
      if (selectedWindowState !== 'ALL' && item.window_state !== selectedWindowState) return false;
      if (selectedStorage !== 'ALL' && item.storage_status !== selectedStorage) return false;
      return true;
    });
  }, [expiryLots, searchTerm, selectedFacility, selectedBloodGroup, selectedComponent, selectedWindowState, selectedStorage]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedFacility('ALL');
    setSelectedBloodGroup('ALL');
    setSelectedComponent('ALL');
    setSelectedWindowState('ALL');
    setSelectedStorage('ALL');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Blood Inventory</h1>
        <p className="text-xs font-medium text-slate-500 mt-1">
          Track component-level inventory across the HemoGrid network.
        </p>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white rounded-3xl p-5 shadow-card border border-slate-100 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Lot ID or facility..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-800/20"
            />
          </div>

          {/* Facility Filter */}
          <select
            value={selectedFacility}
            onChange={(e) => setSelectedFacility(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Facilities</option>
            {facilities.map((f) => (
              <option key={f.facility_id} value={f.facility_id}>{f.name}</option>
            ))}
          </select>

          {/* Blood Group Filter */}
          <select
            value={selectedBloodGroup}
            onChange={(e) => setSelectedBloodGroup(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Blood Groups</option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>{formatBloodGroup(bg)}</option>
            ))}
          </select>

          {/* Component Filter */}
          <select
            value={selectedComponent}
            onChange={(e) => setSelectedComponent(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Components</option>
            {COMPONENTS.map((c) => (
              <option key={c} value={c}>{formatComponent(c)}</option>
            ))}
          </select>

          {/* Window State Filter */}
          <select
            value={selectedWindowState}
            onChange={(e) => setSelectedWindowState(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Window States</option>
            {WINDOW_STATES.map((ws) => (
              <option key={ws} value={ws}>{formatWindowState(ws)}</option>
            ))}
          </select>

          {/* Storage Status Filter */}
          <select
            value={selectedStorage}
            onChange={(e) => setSelectedStorage(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Storage Statuses</option>
            <option value="OK">OK</option>
            <option value="ANOMALY">Anomaly</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span>Showing <strong className="text-slate-800 font-bold">{filteredLots.length}</strong> lot records</span>
          <button
            onClick={resetFilters}
            className="font-bold text-emerald-800 hover:underline flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reset Filters
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-3xl shadow-card border border-slate-100 overflow-hidden">
        {filteredLots.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold">No matching inventory found.</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filter options.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] whitespace-nowrap">
                <tr>
                  <th className="py-3.5 px-4">Lot ID / Traceability</th>
                  <th className="py-3.5 px-4">Facility</th>
                  <th className="py-3.5 px-4">Blood & Component</th>
                  <th className="py-3.5 px-4">Quantity</th>
                  <th className="py-3.5 px-4">Days Left</th>
                  <th className="py-3.5 px-4">Storage</th>
                  <th className="py-3.5 px-4">Window State</th>
                  <th className="py-3.5 px-4 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLots.map((item) => (
                  <tr
                    key={item.lot_id}
                    onClick={() => setSelectedLot(item)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 font-mono font-bold text-emerald-900">
                        <QrCode className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        {item.lot_id}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-slate-800">{item.facility_name}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-emerald-900">{formatBloodGroup(item.blood_group)}</span>{' '}
                      <span className="text-slate-500">{formatComponent(item.component)}</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-900">{item.units} Units</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap inline-block ${
                        item.days_to_expiry <= 3 ? 'bg-amber-100 text-amber-800' :
                        item.days_to_expiry <= 7 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {item.days_to_expiry} days left
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase whitespace-nowrap inline-block ${storageStatusBadgeStyle(item.storage_status)}`}>
                        {formatStorageStatus(item.storage_status)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase whitespace-nowrap inline-block ${windowStateBadgeStyle(item.window_state)}`}>
                        {formatWindowState(item.window_state)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLot(item);
                        }}
                        className="px-3 py-1 bg-emerald-900 hover:bg-emerald-800 text-white text-[11px] font-bold rounded-lg transition-colors whitespace-nowrap"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DisclaimerFooter />
    </div>
  );
};
