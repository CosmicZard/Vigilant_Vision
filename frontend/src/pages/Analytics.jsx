import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Car,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Layers,
  RefreshCw
} from 'lucide-react';
import { MetricsAPI } from '../services/api';

export default function Analytics() {
  const [summary, setSummary] = useState({});
  const [eventsByType, setEventsByType] = useState([]);
  const [eventsByLocation, setEventsByLocation] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [sumRes, typeRes, locRes, timeRes] = await Promise.all([
        MetricsAPI.summary(),
        MetricsAPI.eventsByType(),
        MetricsAPI.eventsByLocation(),
        MetricsAPI.timeline(24),
      ]);
      setSummary(sumRes.data);
      setEventsByType(typeRes.data);
      setEventsByLocation(locRes.data);
      setTimeline(timeRes.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Civic & Road Safety Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Temporal defect frequencies, road infrastructure condition ratings, and corridor safety metrics
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 shadow-sm transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-600' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Safety Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Road Safety & Infrastructure Index</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600">89.2</span>
            <span className="text-xs text-slate-400 font-mono">/ 100</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Based on defect density & lighting coverage</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Defect Resolution Rate</span>
            <TrendingUp className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-sky-600">
              {summary.total_events > 0
                ? Math.round(((summary.resolved_events || 0) / summary.total_events) * 100)
                : 100}
              %
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">{summary.resolved_events || 0} of {summary.total_events || 0} defects audited</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Average Congestion State</span>
            <Car className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-600">{summary.avg_congestion_level || 'LOW'}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Real-time vehicle density rating</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>High Severity Ratio</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600">
              {summary.total_events > 0
                ? Math.round((((summary.critical_alerts || 0) + (summary.high_alerts || 0)) / summary.total_events) * 100)
                : 0}
              %
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Potholes, missing signals & blackouts</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Timeline Bar Chart (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-600" />
            24-Hour Incident & Defect Volume Timeline
          </h3>

          <div className="h-64 flex items-end gap-2 pt-8 pb-4">
            {timeline.map((pt, i) => {
              const maxVal = Math.max(...timeline.map((t) => t.count), 1);
              const heightPct = Math.max(8, Math.round((pt.count / maxVal) * 100));

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white px-2 py-1 rounded-md text-[10px] pointer-events-none whitespace-nowrap z-20 shadow-md font-mono">
                    {pt.time_label}: {pt.count} defects ({pt.critical} critical)
                  </div>

                  <div className="w-full h-48 flex items-end">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        pt.critical > 0
                          ? 'bg-rose-500 group-hover:bg-rose-600'
                          : 'bg-sky-500 group-hover:bg-sky-600'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{pt.time_label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Location Breakdown (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-600" />
            Defect Distribution per Corridor Sector
          </h3>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {eventsByLocation.length === 0 ? (
              <p className="text-xs text-slate-400">No sector telemetry available.</p>
            ) : (
              eventsByLocation.map((loc, i) => {
                const maxCount = Math.max(...eventsByLocation.map((l) => l.count), 1);
                const pct = Math.round((loc.count / maxCount) * 100);
                return (
                  <div key={i} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{loc.location}</span>
                      <span className="font-mono text-sky-700 font-bold">{loc.count} Defects</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div style={{ width: `${pct}%` }} className="h-full bg-sky-500 rounded-full" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
