import React from 'react';

interface ScoreBarProps {
  label: string;
  value: number;
  max?: number;
}

export const ScoreBar: React.FC<ScoreBarProps> = ({ label, value, max }) => {
  const effectiveMax = max ?? 1;
  const pct = Math.min(100, Math.max(0, (value / effectiveMax) * 100));

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold text-slate-700 w-36 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-600 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold text-slate-800 w-10 text-right shrink-0">{value.toFixed(2)}</span>
    </div>
  );
};
