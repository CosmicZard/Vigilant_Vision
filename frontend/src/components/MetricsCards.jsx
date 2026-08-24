import React from 'react';
import { ShieldAlert, AlertTriangle, Video, Camera, Activity, CheckCircle2 } from 'lucide-react';

export default function MetricsCards({ summary = {} }) {
  const cards = [
    {
      title: 'Total Incidents & Defects',
      value: summary.total_events || 0,
      subtext: `${summary.resolved_events || 0} resolved / audited`,
      icon: Activity,
      textColor: 'text-sky-600',
      bgIcon: 'bg-sky-50 text-sky-600',
      borderColor: 'border-slate-200/80',
    },
    {
      title: 'High Priority Alerts',
      value: (summary.critical_alerts || 0) + (summary.high_alerts || 0),
      subtext: 'Potholes, missing lights & hazards',
      icon: AlertTriangle,
      textColor: 'text-amber-600',
      bgIcon: 'bg-amber-50 text-amber-600',
      borderColor: 'border-amber-200/80',
      pulse: (summary.critical_alerts || 0) > 0,
    },
    {
      title: 'Resolved / Audited',
      value: summary.resolved_events || 0,
      subtext: 'Dispatched to civic maintenance',
      icon: CheckCircle2,
      textColor: 'text-emerald-600',
      bgIcon: 'bg-emerald-50 text-emerald-600',
      borderColor: 'border-emerald-200/80',
    },
    {
      title: 'Active Cameras',
      value: summary.active_cameras || 0,
      subtext: 'Road & border surveillance nodes',
      icon: Camera,
      textColor: 'text-slate-700',
      bgIcon: 'bg-slate-100 text-slate-700',
      borderColor: 'border-slate-200/80',
    },
    {
      title: 'Traffic Congestion State',
      value: summary.avg_congestion_level || 'LOW',
      subtext: 'Corridor vehicle density rating',
      icon: Video,
      textColor: 'text-indigo-600',
      bgIcon: 'bg-indigo-50 text-indigo-600',
      borderColor: 'border-slate-200/80',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`bg-white rounded-2xl border ${card.borderColor} p-4.5 transition-all hover:shadow-md shadow-sm`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{card.title}</span>
              <div className={`p-2 rounded-xl ${card.bgIcon}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className={`text-2xl font-black tracking-tight ${card.textColor}`}>
                {card.value}
              </span>
              {card.pulse && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400">{card.subtext}</p>
          </div>
        );
      })}
    </div>
  );
}
