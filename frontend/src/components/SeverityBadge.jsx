import React from 'react';
import { AlertTriangle, ShieldAlert, AlertCircle, Info } from 'lucide-react';

const severityConfig = {
  CRITICAL: {
    bg: 'bg-rose-50 border-rose-200 text-rose-700',
    dot: 'bg-rose-500',
    pulse: true,
    icon: ShieldAlert,
  },
  HIGH: {
    bg: 'bg-amber-50 border-amber-200 text-amber-800',
    dot: 'bg-amber-500',
    pulse: false,
    icon: AlertTriangle,
  },
  MEDIUM: {
    bg: 'bg-sky-50 border-sky-200 text-sky-800',
    dot: 'bg-sky-500',
    pulse: false,
    icon: AlertCircle,
  },
  LOW: {
    bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    dot: 'bg-emerald-500',
    pulse: false,
    icon: Info,
  },
};

export default function SeverityBadge({ severity = 'MEDIUM', showIcon = true, size = 'sm' }) {
  const sevKey = (severity || 'MEDIUM').toUpperCase();
  const config = severityConfig[sevKey] || severityConfig.MEDIUM;
  const Icon = config.icon;

  const sizeClasses = size === 'lg' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[11px]';

  return (
    <span className={`inline-flex items-center gap-1.5 font-bold rounded-lg border ${config.bg} ${sizeClasses}`}>
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.dot} opacity-75`}></span>
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`}></span>
      </span>
      {showIcon && <Icon className={size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />}
      <span>{sevKey}</span>
    </span>
  );
}
