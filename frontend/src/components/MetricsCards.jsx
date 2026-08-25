import React from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Camera,
  Video,
  Radio,
  Sparkles,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';

export default function MetricsCards({ summary = {} }) {
  const totalEvents = summary.total_events || 0;
  const resolvedEvents = summary.resolved_events || 0;
  const criticalAlerts = summary.critical_alerts || 0;
  const highAlerts = summary.high_alerts || 0;
  const totalHighPriority = criticalAlerts + highAlerts;
  const activeCameras = summary.active_cameras || 0;
  const congestion = summary.avg_congestion_level || 'LOW';

  const resolutionRate = totalEvents > 0 ? Math.round((resolvedEvents / totalEvents) * 100) : 0;

  const cards = [
    {
      id: 'total-incidents',
      title: 'TOTAL INCIDENTS & DEFECTS',
      value: totalEvents,
      badge: 'Live Telemetry',
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200/70',
      subtext: `${resolvedEvents} resolved / audited`,
      icon: Activity,
      valueColor: 'text-slate-900',

      borderColor: 'border-sky-200/90 hover:border-sky-300',
      iconContainer: 'bg-sky-50 text-sky-600 border-sky-100/80',
      glowColor: 'bg-sky-500/10',
    },
    {
      id: 'high-priority',
      title: 'HIGH PRIORITY ALERTS',
      value: totalHighPriority,
      badge: criticalAlerts > 0 ? `${criticalAlerts} Critical` : 'Monitored',
      badgeClass: criticalAlerts > 0 ? 'bg-rose-50 text-rose-700 border-rose-200/70 animate-pulse' : 'bg-amber-50 text-amber-700 border-amber-200/70',
      subtext: 'Potholes, missing lights & hazards',
      icon: AlertTriangle,
      valueColor: totalHighPriority > 0 ? 'text-amber-600' : 'text-slate-900',

      borderColor: 'border-amber-200/90 hover:border-amber-300',
      iconContainer: 'bg-amber-50 text-amber-600 border-amber-100/80',
      glowColor: 'bg-amber-500/10',
      pulse: criticalAlerts > 0,
    },
    {
      id: 'resolved-audited',
      title: 'RESOLVED / AUDITED',
      value: resolvedEvents,
      badge: `${resolutionRate}% Fixed`,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
      subtext: 'Dispatched to civic maintenance',
      icon: CheckCircle2,
      valueColor: 'text-emerald-600',

      borderColor: 'border-emerald-200/90 hover:border-emerald-300',
      iconContainer: 'bg-emerald-50 text-emerald-600 border-emerald-100/80',
      glowColor: 'bg-emerald-500/10',
    },
    {
      id: 'active-cameras',
      title: 'ACTIVE CAMERAS',
      value: activeCameras,
      badge: 'All Online',
      badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200/70',
      subtext: 'Road & border surveillance nodes',
      icon: Camera,
      valueColor: 'text-slate-900',

      borderColor: 'border-cyan-200/90 hover:border-cyan-300',
      iconContainer: 'bg-cyan-50 text-cyan-600 border-cyan-100/80',
      glowColor: 'bg-cyan-500/10',
      liveDot: true,
    },
    {
      id: 'traffic-state',
      title: 'TRAFFIC CONGESTION',
      value: congestion,
      isTextValue: true,
      badge: 'AI Density',
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/70',
      subtext: 'Corridor vehicle density rating',
      icon: Video,
      valueColor:
        congestion === 'HEAVY'
          ? 'text-rose-600'
          : congestion === 'MODERATE'
          ? 'text-amber-600'
          : 'text-emerald-600',

      borderColor: 'border-indigo-200/90 hover:border-indigo-300',
      iconContainer: 'bg-indigo-50 text-indigo-600 border-indigo-100/80',
      glowColor: 'bg-indigo-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className={`relative overflow-hidden rounded-2xl border bg-white ${card.borderColor} p-4 sm:p-4.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md shadow-xs flex flex-col justify-between min-h-[148px] group`}
          >
            {/* Top background subtle radial aura */}
            <div
              className={`absolute -top-6 -right-6 w-24 h-24 rounded-full ${card.glowColor} blur-xl pointer-events-none transition-all group-hover:scale-125`}
            />

            {/* Top row: Category title + Icon pill */}
            <div className="flex items-start justify-between gap-2 relative z-10">
              <span
                className="text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-snug line-clamp-1"
                title={card.title}
              >
                {card.title}
              </span>
              <div
                className={`p-2 rounded-xl border shrink-0 ${card.iconContainer} shadow-xs transition-transform group-hover:scale-105`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>

            {/* Value row: Large number/status + Dynamic Badge */}
            <div className="mt-2.5 flex items-baseline justify-between gap-2 relative z-10">
              <div className="flex items-center gap-2">
                <span
                  className={`font-black tracking-tight ${
                    card.isTextValue ? 'text-xl sm:text-2xl font-black uppercase' : 'text-3xl'
                  } ${card.valueColor}`}
                >
                  {card.value}
                </span>
                {card.liveDot && (
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                )}
                {card.pulse && (
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </span>
                )}
              </div>

              {card.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs whitespace-nowrap ${card.badgeClass}`}
                >
                  {card.badge}
                </span>
              )}
            </div>

            {/* Bottom row: Subtext description */}
            <div className="mt-3 pt-2.5 border-t border-slate-100/90 flex items-center justify-between text-[11px] text-slate-500 font-medium relative z-10">
              <span className="truncate pr-1" title={card.subtext}>
                {card.subtext}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

