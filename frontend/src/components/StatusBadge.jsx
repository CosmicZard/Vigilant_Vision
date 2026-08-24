import React from 'react';
import { CheckCircle2, Clock, Eye, AlertOctagon, XCircle } from 'lucide-react';

const statusConfig = {
  NEW: {
    bg: 'bg-sky-50 border-sky-200 text-sky-700',
    icon: Clock,
    label: 'New Alert',
  },
  IN_REVIEW: {
    bg: 'bg-purple-50 border-purple-200 text-purple-700',
    icon: Eye,
    label: 'Under Review',
  },
  CONFIRMED: {
    bg: 'bg-rose-50 border-rose-200 text-rose-700',
    icon: AlertOctagon,
    label: 'Verified Defect',
  },
  RESOLVED: {
    bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    icon: CheckCircle2,
    label: 'Resolved',
  },
  FALSE_POSITIVE: {
    bg: 'bg-slate-100 border-slate-200 text-slate-600',
    icon: XCircle,
    label: 'Dismissed',
  },
};

export default function StatusBadge({ status = 'NEW' }) {
  const statKey = (status || 'NEW').toUpperCase();
  const config = statusConfig[statKey] || statusConfig.NEW;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${config.bg}`}>
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </span>
  );
}
