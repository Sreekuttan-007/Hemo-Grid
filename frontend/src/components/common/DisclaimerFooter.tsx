import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const DisclaimerFooter: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200/80 ${
        compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-3 text-xs'
      } text-slate-500 font-medium`}
    >
      <ShieldAlert className="w-4 h-4 text-emerald-700 shrink-0" />
      <span>
        <strong className="text-slate-700 font-semibold">Operational Boundary:</strong> All recommendations are decision-support outputs and subject to authorized blood-bank review and applicable clinical protocols.
      </span>
    </div>
  );
};
