import React, { useState, useEffect } from 'react';
import { ShieldAlert, Layers, RefreshCw, AlertTriangle, Radio } from 'lucide-react';
import LeafletMap from '../components/LeafletMap';
import SeverityBadge from '../components/SeverityBadge';
import { MapAPI, CamerasAPI, EventsAPI } from '../services/api';

export default function MapView({ onSelectEvent }) {
  const [events, setEvents] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHotspot, setSelectedHotspot] = useState(null);

  const fetchMapData = async () => {
    try {
      setLoading(true);
      const [evtRes, camRes, hotRes] = await Promise.all([
        EventsAPI.list({ limit: 200 }),
        CamerasAPI.list(),
        MapAPI.hotspots(),
      ]);
      setEvents(evtRes.data);
      setCameras(camRes.data);
      setHotspots(hotRes.data);
    } catch (err) {
      console.error('Error fetching map telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">GIS Spatial Hotspot & Corridor Map</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Geographic defect clustering, camera surveillance radars, and dynamic road danger hotspots
          </p>
        </div>
        <button
          onClick={fetchMapData}
          disabled={loading}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 shadow-sm transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-600' : ''}`} />
          <span>Sync GIS Nodes</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Hotspots Risk Index (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3 parallax-card">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 animate-pulse" />
                High-Risk Corridors
              </span>
              <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200 shadow-2xs">
                {hotspots.length} Clusters
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Corridor clusters classified by weighted incident severity & hazard telemetry.
            </p>

            {hotspots.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                <Radio className="w-8 h-8 mx-auto mb-2 opacity-40 text-sky-500" />
                <p className="text-xs font-bold text-slate-700">No active danger clusters</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {hotspots.map((hs, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedHotspot(hs)}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-sky-400 hover:shadow-md transition-all duration-200 cursor-pointer space-y-2 group hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900 group-hover:text-sky-800 transition-colors">{hs.location}</span>
                      <SeverityBadge severity={hs.risk_level === 'SEVERE' ? 'CRITICAL' : hs.risk_level} size="sm" showIcon={false} />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>Defects: <strong className="text-slate-800 font-mono font-bold">{hs.event_count}</strong></span>
                      <span>Danger: <strong className="text-amber-600 font-mono font-bold">{hs.severity_score}</strong></span>
                    </div>

                    {hs.primary_event_types && hs.primary_event_types.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {hs.primary_event_types.map((type, tIdx) => (
                          <span
                            key={tIdx}
                            className="bg-slate-50 px-2 py-0.5 rounded-md text-[9px] text-slate-600 border border-slate-200 font-bold"
                          >
                            {type.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Full Interactive Leaflet Map (8 Cols) */}
        <div className="lg:col-span-8">
          <div className="bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-3xl p-4 shadow-xs space-y-3 parallax-card">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1 font-medium">
                  <span className="h-2 w-2 rounded-full bg-sky-500"></span> Surveillance Nodes
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <span className="h-2 w-2 rounded-full bg-rose-500"></span> High Priority Defects
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span> Potholes & Garbage
                </span>
              </div>
              <span className="text-xs font-mono text-slate-400">CartoDB Voyager Clean Map</span>
            </div>

            <LeafletMap
              events={events}
              cameras={cameras}
              hotspots={hotspots}
              onSelectEvent={onSelectEvent}
              center={selectedHotspot ? [selectedHotspot.latitude, selectedHotspot.longitude] : [28.6139, 77.2090]}
              zoom={selectedHotspot ? 14 : 13}
              height="580px"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
