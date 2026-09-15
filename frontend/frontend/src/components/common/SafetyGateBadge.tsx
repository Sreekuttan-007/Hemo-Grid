import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface SafetyGateBadgeProps {
  status: 'PASS' | 'FAIL' | 'REVIEW_REQUIRED';
  label?: string;
  size?: 'sm' | 'md';
}

export const SafetyGateBadge: React.FC<SafetyGateBadgeProps> = ({ status, label, size = 'md' }) => {
  const isSm = size === 'sm';

  if (status === 'PASS') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/60 rounded-full ${isSm ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs'}`}>
        <CheckCircle2 className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-emerald-600`} />
        {label || 'PASS'}
      </span>
    );
  }

  if (status === 'FAIL') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-semibold text-rose-800 bg-rose-50 border border-rose-200/60 rounded-full ${isSm ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs'}`}>
        <XCircle className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-rose-600`} />
        {label || 'EXCLUDED (FAIL)'}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold text-amber-800 bg-amber-50 border border-amber-200/60 rounded-full ${isSm ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs'}`}>
      <AlertTriangle className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-amber-600`} />
      {label || 'REVIEW REQUIRED'}
    </span>
  );
};
