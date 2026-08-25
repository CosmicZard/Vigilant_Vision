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
  Droplets,
  SunMedium,
  Signpost,
  Moon,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Server
} from 'lucide-react';
import MetricsCards from '../components/MetricsCards';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import LeafletMap from '../components/LeafletMap';
import { MetricsAPI, EventsAPI, CamerasAPI, DatasetsAPI, VideosAPI } from '../services/api';

export default function Dashboard({ onSelectEvent, onViewAllEvents, onSelectVideo }) {
  const [summary, setSummary] = useState({});
  const [recentEvents, setRecentEvents] = useState([]);
  const [eventsByType, setEventsByType] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'CRITICAL' | 'HIGH' | 'POTHOLE' | 'GARBAGE'
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumRes, evtRes, typeRes, camRes] = await Promise.all([
        MetricsAPI.summary(),
        EventsAPI.list({ limit: 12 }),
        MetricsAPI.eventsByType(),
        CamerasAPI.list(),
      ]);
      setSummary(sumRes.data);
      setRecentEvents(evtRes.data);
      setEventsByType(typeRes.data);
      setCameras(camRes.data);
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
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
      await VideosAPI.process(res.data.video_id, 'CAM-01');
      await fetchData();
      if (onSelectVideo) onSelectVideo(res.data);
    } catch (err) {
      console.error('Demo generation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Filtered incidents in live stream
  const filteredEvents = recentEvents.filter((evt) => {
    if (activeFilter === 'CRITICAL' && evt.severity !== 'CRITICAL') return false;
    if (activeFilter === 'HIGH' && evt.severity !== 'HIGH') return false;
    if (activeFilter === 'POTHOLE' && !evt.event_type.includes('POTHOLE')) return false;
    if (activeFilter === 'GARBAGE' && !evt.event_type.includes('GARBAGE')) return false;
    if (activeFilter === 'WATERLOGGING' && !evt.event_type.includes('WATER')) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        evt.event_id.toLowerCase().includes(q) ||
        evt.event_type.toLowerCase().includes(q) ||
        (evt.description && evt.description.toLowerCase().includes(q)) ||
        (evt.location && evt.location.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner with Quick Refresh & Live State + Animated Wave SVG */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-3xl p-6 shadow-xs relative overflow-hidden group parallax-card">
        {/* Subtle background SVG soundwave / radar morphing pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-72 pointer-events-none opacity-20 flex items-center justify-end pr-4">
          <svg className="w-full h-24 text-sky-500 animate-pulse" viewBox="0 0 200 40" fill="none" stroke="currentColor">
            <path d="M 0 20 Q 25 5, 50 20 T 100 20 T 150 20 T 200 20" strokeWidth="2" strokeLinecap="round" />
            <path d="M 0 20 Q 25 35, 50 20 T 100 20 T 150 20 T 200 20" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Authority Command Center</h1>
            <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Monitoring
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time civic defect detection, smart road surveillance, and automated hazard dispatch
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          {lastSyncTime && (
            <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
              Updated: <strong className="text-slate-600 font-bold">{lastSyncTime}</strong>
            </div>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-2xl text-xs font-bold border border-slate-200 shadow-2xs transition-all duration-200 active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-600' : ''}`} />
            <span>Sync Live Feed</span>
          </button>
        </div>
      </div>

      {/* KPI Cards with Parallax Depth */}
      <MetricsCards summary={summary} />

      {/* Horizontal Scrolling Real-Time Alert Telemetry Ribbon */}
      {recentEvents.length > 0 && (
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl p-4 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
              Live Telemetry Ticker
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Scroll horizontally →</span>
          </div>

          {/* Horizontal Snap Scroll Carousel */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar horizontal-scroll-snap pb-1.5 pt-0.5">
            {recentEvents.map((evt) => (
              <div
                key={evt.event_id}
                onClick={() => onSelectEvent(evt)}
                className="min-w-[280px] max-w-[280px] p-3 rounded-2xl bg-slate-50/90 hover:bg-white border border-slate-200/80 hover:border-sky-300 hover:shadow-md transition-all duration-200 cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-slate-400 group-hover:text-sky-700 transition-colors">
                    {evt.event_id}
                  </span>
                  <SeverityBadge severity={evt.severity} size="sm" showIcon={false} />
                </div>
                <div className="font-extrabold text-xs text-slate-900 line-clamp-1">
                  {evt.event_type.replace(/_/g, ' ')}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pt-1 border-t border-slate-200/60">
                  <span>{evt.camera_id || 'CAM-01'}</span>
                  <span>{evt.timestamp || '00:00.000'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Test Demo Chips Bar */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-600" />
            1-Click Civic Defect Simulators
          </span>
          <span className="text-[11px] text-slate-400">Instantly synthesizes video & executes AI detection</span>
        </div>


        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <button
            onClick={() => handleQuickDemo('potholes')}
            disabled={generating}
            className="p-3.5 rounded-2xl bg-amber-50/70 hover:bg-amber-100/90 text-amber-900 border border-amber-200/90 transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:scale-95 text-left space-y-1 group"
          >
            <div className="flex items-center justify-between">
              <AlertOctagon className="w-4 h-4 text-amber-600 transition-transform duration-200 group-hover:scale-125 group-hover:rotate-6" />
              <span className="text-[10px] font-extrabold uppercase bg-white/90 px-2 py-0.5 rounded-full text-amber-700 border border-amber-200 shadow-2xs">Test 1</span>
            </div>
            <div className="font-extrabold text-xs text-slate-900 group-hover:text-amber-950">Potholes</div>
            <div className="text-[10px] text-slate-500 leading-tight">Asphalt craters & depth</div>
          </button>

          <button
            onClick={() => handleQuickDemo('garbage')}
            disabled={generating}
            className="p-3.5 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100/90 text-emerald-900 border border-emerald-200/90 transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:scale-95 text-left space-y-1 group"
          >
            <div className="flex items-center justify-between">
              <Trash2 className="w-4 h-4 text-emerald-600 transition-transform duration-200 group-hover:scale-125 group-hover:-rotate-6" />
              <span className="text-[10px] font-extrabold uppercase bg-white/90 px-2 py-0.5 rounded-full text-emerald-700 border border-emerald-200 shadow-2xs">Test 2</span>
            </div>
            <div className="font-extrabold text-xs text-slate-900 group-hover:text-emerald-950">Garbage & Litter</div>
            <div className="text-[10px] text-slate-500 leading-tight">Roadside waste piles</div>
          </button>

          <button
            onClick={() => handleQuickDemo('waterlogging')}
            disabled={generating}
            className="p-3.5 rounded-2xl bg-sky-50/70 hover:bg-sky-100/90 text-sky-900 border border-sky-200/90 transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:scale-95 text-left space-y-1 group"
          >
            <div className="flex items-center justify-between">
              <Droplets className="w-4 h-4 text-sky-600 transition-transform duration-200 group-hover:scale-125 group-hover:translate-y-[-2px]" />
              <span className="text-[10px] font-extrabold uppercase bg-white/90 px-2 py-0.5 rounded-full text-sky-700 border border-sky-200 shadow-2xs">Test 3</span>
            </div>
            <div className="font-extrabold text-xs text-slate-900 group-hover:text-sky-950">Waterlogging</div>
            <div className="text-[10px] text-slate-500 leading-tight">Standing water & puddles</div>
          </button>

          <button
            onClick={() => handleQuickDemo('all_inclusive')}
            disabled={generating}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50/70 hover:from-sky-100 hover:to-indigo-100 text-slate-900 border border-sky-200/90 transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:scale-95 text-left space-y-1 group"
          >
            <div className="flex items-center justify-between">
              <Sparkles className="w-4 h-4 text-sky-600 transition-transform duration-200 group-hover:scale-125 group-hover:rotate-12" />
              <span className="text-[10px] font-extrabold uppercase bg-white/90 px-2 py-0.5 rounded-full text-sky-700 border border-sky-200 shadow-2xs">Combined</span>
            </div>
            <div className="font-extrabold text-xs text-slate-900 group-hover:text-indigo-950">All Scenarios</div>
            <div className="text-[10px] text-slate-500 leading-tight">Full civic defect suite</div>
          </button>
        </div>
      </div>


      {/* Main Command Center Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Real-time Live Incident & Defect Stream (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
            {/* Header + Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                </span>
                <div>
                  <h3 className="font-extrabold text-base text-slate-800">Live Incident & Defect Stream</h3>
                  <p className="text-[11px] text-slate-400">Chronological detection feed with forensic evidence</p>
                </div>
              </div>

              <button
                onClick={onViewAllEvents}
                className="text-xs text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1 self-start sm:self-center"
              >
                <span>View Full Registry</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Search & Filter Chips Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by defect type, camera, road..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {['ALL', 'CRITICAL', 'HIGH', 'POTHOLE', 'GARBAGE', 'WATERLOGGING'].map((filterKey) => (
                  <button
                    key={filterKey}
                    onClick={() => setActiveFilter(filterKey)}
                    className={`px-3 py-1 rounded-xl text-[11px] font-bold transition ${
                      activeFilter === filterKey
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filterKey}
                  </button>
                ))}
              </div>
            </div>

            {/* Incidents Stream List */}
            {filteredEvents.length === 0 ? (
              <div className="p-10 text-center text-slate-400 bg-slate-50/70 rounded-2xl border border-slate-200/60 space-y-2">
                <Radio className="w-10 h-10 mx-auto text-sky-400 opacity-60" />
                <p className="font-bold text-xs text-slate-700">No active incidents matching criteria</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Run any defect simulator above or upload real road CCTV video in Video Studio.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {filteredEvents.map((evt) => (
                  <div
                    key={evt.event_id}
                    className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-sky-300 hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      {/* Evidence Thumbnail */}
                      {evt.evidence_path ? (
                        <div className="relative flex-shrink-0">
                          <img
                            src={`/${evt.evidence_path}`}
                            alt="Snapshot"
                            className="w-16 h-12 object-cover rounded-xl border border-slate-200 group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute bottom-0.5 right-0.5 bg-slate-900/80 text-[8px] text-white px-1 rounded font-mono">
                            {evt.timestamp}
                          </span>
                        </div>
                      ) : (
                        <div className="w-16 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 flex-shrink-0">
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                        </div>
                      )}

                      {/* Event Details */}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-xs text-slate-900">
                            {evt.event_type.replace(/_/g, ' ')}
                          </span>
                          <SeverityBadge severity={evt.severity} showIcon={false} />
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-1">{evt.description}</p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                          <span>{evt.event_id}</span>
                          <span>•</span>
                          <span>{evt.camera_id || 'CAM-01'}</span>
                          <span>•</span>
                          <span>{evt.location}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <StatusBadge status={evt.status} />
                      <button
                        onClick={() => onSelectEvent(evt)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white border border-sky-200 hover:border-sky-600 transition text-xs font-bold shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: GIS Map & Defect Classification (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Mini Leaflet Map */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-600" />
                Corridor Sector GIS Radar
              </h3>
              <span className="text-[11px] font-bold bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full border border-sky-200">
                {cameras.length} Active Nodes
              </span>
            </div>
            <LeafletMap
              events={recentEvents}
              cameras={cameras}
              onSelectEvent={onSelectEvent}
              height="260px"
              zoom={12}
            />
          </div>

          {/* Category Frequency Breakdown */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-800">Defect Category Breakdown</h3>
              <span className="text-[11px] text-slate-400 font-mono">{eventsByType.length} Types</span>
            </div>

            {eventsByType.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">No defect breakdown data available yet.</p>
            ) : (
              <div className="space-y-3">
                {eventsByType.slice(0, 5).map((type, i) => {
                  const maxCount = Math.max(...eventsByType.map((t) => t.count), 1);
                  const pct = Math.round((type.count / maxCount) * 100);
                  const isHigh = type.severity === 'CRITICAL' || type.severity === 'HIGH';

                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-700 flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${isHigh ? 'bg-amber-500' : 'bg-sky-500'}`}></span>
                          {type.event_type.replace(/_/g, ' ')}
                        </span>
                        <span className="font-mono text-slate-800 font-bold">{type.count} defects</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
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

          {/* Infrastructure Health Status Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Platform Infrastructure Health
            </h3>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Cameras</span>
                <span className="font-bold text-emerald-700">{cameras.length} / {cameras.length} Online</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">AI Engine</span>
                <span className="font-bold text-sky-700">YOLOv8 + CUDA</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Database</span>
                <span className="font-bold text-emerald-700">Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
