import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Radio,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Layers,
  Sparkles,
  AlertOctagon,
  Trash2,
  SunMedium,
  Signpost,
  Moon
} from 'lucide-react';
import MetricsCards from '../components/MetricsCards';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import LeafletMap from '../components/LeafletMap';
import { MetricsAPI, EventsAPI, CamerasAPI, DatasetsAPI } from '../services/api';

export default function Dashboard({ onSelectEvent, onViewAllEvents, onSelectVideo }) {
  const [summary, setSummary] = useState({});
  const [recentEvents, setRecentEvents] = useState([]);
  const [eventsByType, setEventsByType] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumRes, evtRes, typeRes, camRes] = await Promise.all([
        MetricsAPI.summary(),
        EventsAPI.list({ limit: 8 }),
        MetricsAPI.eventsByType(),
        CamerasAPI.list(),
      ]);
      setSummary(sumRes.data);
      setRecentEvents(evtRes.data);
      setEventsByType(typeRes.data);
      setCameras(camRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickDemo = async (type) => {
    try {
      setGenerating(true);
      const res = await DatasetsAPI.generateSynthetic(type, 8, 'CAM-01');
      await fetchData();
      if (onSelectVideo) onSelectVideo(res.data);
    } catch (err) {
      console.error('Demo generation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner with Quick Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Authority Command Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time civic defect detection & smart road surveillance monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 shadow-sm transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-600' : ''}`} />
            <span>Refresh Feed</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <MetricsCards summary={summary} />

      {/* Quick Test Demo Chips Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            Instant Defect Simulators (1-Click Test):
          </span>
          <span className="text-[11px] text-slate-400">Generates video & executes AI pipeline</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => handleQuickDemo('potholes')}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-amber-600" />
            <span>1. Pothole Detection</span>
          </button>
          <button
            onClick={() => handleQuickDemo('garbage')}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 transition"
          >
            <Trash2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>2. Garbage & Debris</span>
          </button>
          <button
            onClick={() => handleQuickDemo('missing_traffic_light')}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 transition"
          >
            <SunMedium className="w-3.5 h-3.5 text-rose-600" />
            <span>3. Missing Traffic Light</span>
          </button>
          <button
            onClick={() => handleQuickDemo('missing_sign_board')}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 transition"
          >
            <Signpost className="w-3.5 h-3.5 text-sky-600" />
            <span>4. Missing Sign Board</span>
          </button>
          <button
            onClick={() => handleQuickDemo('missing_street_light_night')}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 transition"
          >
            <Moon className="w-3.5 h-3.5 text-indigo-600" />
            <span>5. Night Streetlight Defect</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Real-time Live Alert Ticker (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
                </span>
                <h3 className="font-extrabold text-sm text-slate-800">Live Incident & Defect Stream</h3>
              </div>
              <button
                onClick={onViewAllEvents}
                className="text-xs text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1"
              >
                <span>View Full Log</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl">
                <Radio className="w-8 h-8 mx-auto mb-2 opacity-40 text-sky-500" />
                <p className="text-xs">No active alerts recorded. Run one of the simulators above to see live detections.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentEvents.map((evt) => (
                  <div
                    key={evt.event_id}
                    className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 transition flex items-center justify-between gap-4 group hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3.5">
                      {evt.evidence_path ? (
                        <img
                          src={`/${evt.evidence_path}`}
                          alt="Thumbnail"
                          className="w-14 h-11 object-cover rounded-xl border border-slate-200 group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-14 h-11 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400">
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">
                            {evt.event_type.replace(/_/g, ' ')}
                          </span>
                          <SeverityBadge severity={evt.severity} showIcon={false} />
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{evt.description}</p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1 font-mono">
                          <span>{evt.timestamp}</span>
                          <span>•</span>
                          <span>{evt.camera_id}</span>
                          <span>•</span>
                          <span>{evt.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={evt.status} />
                      <button
                        onClick={() => onSelectEvent(evt)}
                        className="p-2 rounded-xl bg-white hover:bg-sky-600 hover:text-white text-slate-600 border border-slate-200 transition shadow-xs"
                        title="Forensic Review"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: GIS Map & Defect Classification */}
        <div className="lg:col-span-5 space-y-6">
          {/* Mini Leaflet Map */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-600" />
                Corridor Sector Radar
              </h3>
              <span className="text-[11px] font-mono text-slate-500">{cameras.length} Active Nodes</span>
            </div>
            <LeafletMap
              events={recentEvents}
              cameras={cameras}
              onSelectEvent={onSelectEvent}
              height="260px"
              zoom={12}
            />
          </div>

          {/* Category Frequency */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-3">
            <h3 className="font-extrabold text-sm text-slate-800">Defect Category Breakdown</h3>
            {eventsByType.length === 0 ? (
              <p className="text-xs text-slate-400">No defect breakdown data available yet.</p>
            ) : (
              <div className="space-y-2">
                {eventsByType.slice(0, 5).map((type, i) => {
                  const maxCount = Math.max(...eventsByType.map((t) => t.count), 1);
                  const pct = Math.round((type.count / maxCount) * 100);
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-700">{type.event_type.replace(/_/g, ' ')}</span>
                        <span className="font-mono text-sky-600 font-bold">{type.count}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className={`h-full rounded-full ${
                            type.severity === 'CRITICAL'
                              ? 'bg-rose-500'
                              : type.severity === 'HIGH'
                              ? 'bg-amber-500'
                              : 'bg-sky-500'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
