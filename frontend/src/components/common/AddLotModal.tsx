import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, PackagePlus, Loader2 } from 'lucide-react';
import { formatBloodGroup, formatComponent } from '../../format';
import type { BloodGroup, Component } from '../../types';

const BLOOD_GROUPS: BloodGroup[] = ['O_POS', 'O_NEG', 'A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG'];
const COMPONENTS: Component[] = ['RBC', 'PLATELETS', 'PLASMA'];

interface AddLotModalProps {
  open: boolean;
  onClose: () => void;
}

export const AddLotModal: React.FC<AddLotModalProps> = ({ open, onClose }) => {
  const { facilities, addLot } = useApp();

  const [facilityId, setFacilityId] = useState('');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O_POS');
  const [component, setComponent] = useState<Component>('RBC');
  const [units, setUnits] = useState('1');
  const [collectedAt, setCollectedAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [storageStatus, setStorageStatus] = useState<'OK' | 'ANOMALY' | 'UNKNOWN'>('OK');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const resetForm = () => {
    setFacilityId('');
    setBloodGroup('O_POS');
    setComponent('RBC');
    setUnits('1');
    setCollectedAt('');
    setExpiresAt('');
    setStorageStatus('OK');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!facilityId) {
      setError('Select a facility.');
      return;
    }
    const unitsNum = Number(units);
    if (!Number.isFinite(unitsNum) || unitsNum <= 0) {
      setError('Units must be a positive number.');
      return;
    }
    if (!collectedAt || !expiresAt) {
      setError('Both collected and expiry dates are required.');
      return;
    }
    if (expiresAt <= collectedAt) {
      setError('Expiry date must be after the collected date.');
      return;
    }

    setSubmitting(true);
    try {
      await addLot(facilityId, {
        blood_group: bloodGroup,
        component,
        units: unitsNum,
        collected_at: collectedAt,
        expires_at: expiresAt,
        storage_status: storageStatus,
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add inventory.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-900 to-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
              <PackagePlus className="w-5 h-5 text-emerald-300" />
            </div>
            <h3 className="font-bold text-lg text-white">Add Inventory</h3>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">Facility</label>
            <select
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800/20"
            >
              <option value="">Select a facility...</option>
              {facilities.map((f) => (
                <option key={f.facility_id} value={f.facility_id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-700 focus:outline-none"
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>{formatBloodGroup(bg)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">Component</label>
              <select
                value={component}
                onChange={(e) => setComponent(e.target.value as Component)}
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-700 focus:outline-none"
              >
                {COMPONENTS.map((c) => (
                  <option key={c} value={c}>{formatComponent(c)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">Units</label>
              <input
                type="number"
                min={1}
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800/20"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">Storage Status</label>
              <select
                value={storageStatus}
                onChange={(e) => setStorageStatus(e.target.value as 'OK' | 'ANOMALY' | 'UNKNOWN')}
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="OK">OK</option>
                <option value="ANOMALY">Anomaly</option>
                <option value="UNKNOWN">Unknown</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">Collected Date</label>
              <input
                type="date"
                value={collectedAt}
                onChange={(e) => setCollectedAt(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800/20"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">Expiry Date</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800/20"
              />
            </div>
          </div>

          {error && (
            <div className="px-3.5 py-2.5 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-full hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-900 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold rounded-full transition-colors flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Add Lot
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
