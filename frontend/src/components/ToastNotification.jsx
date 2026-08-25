import React from 'react';
import { ShieldAlert, AlertTriangle, Info, X, ExternalLink, Volume2 } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import SeverityBadge from './SeverityBadge';

export default function ToastNotification({ onSelectEvent }) {
  const { activeToast, dismissToast } = useNotifications();

  if (!activeToast) return null;

  const isCritical = activeToast.severity === 'CRITICAL';
  const isHigh = activeToast.severity === 'HIGH';

  const borderColor = isCritical
    ? 'border-rose-300 ring-4 ring-rose-100'
    : isHigh
    ? 'border-amber-300 ring-4 ring-amber-100'
    : 'border-sky-300 ring-4 ring-sky-100';

  return (
    <div className="fixed top-5 right-5 z-[10000] max-w-md w-full animate-slide-in-right pointer-events-auto">
      <div className={`bg-white/95 backdrop-blur-md rounded-3xl border shadow-2xl p-4 transition-all duration-300 ${borderColor}`}>
        <div className="flex items-start justify-between gap-3">
          {/* Severity Icon */}
          <div className="p-2 rounded-2xl bg-sky-50 text-sky-700 flex-shrink-0 border border-sky-100/90 shadow-2xs">
            {isCritical ? (
              <div className="relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <ShieldAlert className="w-5 h-5 text-rose-600 relative z-10 animate-pulse" />
              </div>
            ) : isHigh ? (
              <div className="relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
                <AlertTriangle className="w-5 h-5 text-amber-600 relative z-10" />
              </div>
            ) : (
              <Info className="w-5 h-5 text-sky-600" />
            )}
          </div>

          {/* Alert Content - Crisp & Concise */}
          <div className="flex-1 space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-black text-xs text-slate-900 tracking-tight block">
                {activeToast.title?.replace(/_/g, ' ')}
              </span>
              <SeverityBadge severity={activeToast.severity} showIcon={false} />
            </div>

            <p className="text-xs font-medium text-slate-600 line-clamp-1">
              {activeToast.description}
            </p>

            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono pt-0.5">
              <span>{activeToast.id}</span>
              <span>•</span>
              <span className="text-emerald-700 font-bold">{activeToast.timeAgo || 'Just now'}</span>
            </div>
          </div>


          {/* Dismiss Button */}
          <button
            onClick={dismissToast}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Button */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            Real-time AI Detection
          </span>

          <button
            onClick={() => {
              if (onSelectEvent && activeToast.eventData) {
                onSelectEvent(activeToast.eventData);
              }
              dismissToast();
            }}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Inspect Evidence</span>
          </button>
        </div>
      </div>
    </div>
  );
}
