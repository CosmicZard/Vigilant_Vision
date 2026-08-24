import React, { useState, useEffect } from 'react';
import {
  Search,
  Download,
  AlertTriangle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import { EventsAPI, CamerasAPI } from '../services/api';

export default function Events({ onSelectEvent }) {
  const [events, setEvents] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [cameraFilter, setCameraFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 15;

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = {
        skip: (page - 1) * limit,
        limit,
      };
      if (severityFilter) params.severity = severityFilter;
      if (statusFilter) params.status = statusFilter;
      if (eventTypeFilter) params.event_type = eventTypeFilter;
      if (cameraFilter) params.camera_id = cameraFilter;

      const [res, camRes] = await Promise.all([
        EventsAPI.list(params),
        CamerasAPI.list(),
      ]);
      setEvents(res.data);
      setCameras(camRes.data);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, severityFilter, statusFilter, eventTypeFilter, cameraFilter]);

  const filteredEvents = events.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.event_id.toLowerCase().includes(q) ||
      e.event_type.toLowerCase().includes(q) ||
      (e.description && e.description.toLowerCase().includes(q)) ||
      (e.location && e.location.toLowerCase().includes(q))
    );
  });

  const exportCSV = () => {
    const headers = ['Event ID', 'Type', 'Severity', 'Status', 'Timestamp', 'Camera ID', 'Location', 'Description'];
    const rows = filteredEvents.map((e) => [
      e.event_id,
      e.event_type,
      e.severity,
      e.status,
      e.timestamp,
      e.camera_id,
      `"${e.location || ''}"`,
      `"${e.description || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vigilant_vision_defects_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Incidents & Defects Registry</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified road surface defects, civic violations, and infrastructure non-compliance records
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={fetchEvents}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search event ID, road..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Severity Dropdown */}
          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Audit Statuses</option>
            <option value="NEW">New (Unreviewed)</option>
            <option value="IN_REVIEW">Under Review</option>
            <option value="CONFIRMED">Verified Defect</option>
            <option value="RESOLVED">Resolved</option>
            <option value="FALSE_POSITIVE">Dismissed</option>
          </select>

          {/* Event Type Dropdown */}
          <select
            value={eventTypeFilter}
            onChange={(e) => {
              setEventTypeFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Civic Defect Types</option>
            <option value="POTHOLE_DETECTED">Pothole Detected</option>
            <option value="GARBAGE_DETECTED">Garbage & Debris</option>
            <option value="MISSING_TRAFFIC_LIGHT">Missing Traffic Light</option>
            <option value="MISSING_SIGN_BOARD">Missing Sign Board</option>
            <option value="MISSING_STREET_LIGHT_NIGHT">Night Streetlight Defect</option>
            <option value="ROAD_DEFECT_DETECTED">Road Surface Defect</option>
            <option value="WRONG_WAY_DRIVING">Wrong-Way Driving</option>
            <option value="RASH_DRIVING">Rash Driving</option>
          </select>

          {/* Camera Dropdown */}
          <select
            value={cameraFilter}
            onChange={(e) => {
              setCameraFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Surveillance Nodes</option>
            {cameras.map((c) => (
              <option key={c.camera_id} value={c.camera_id}>
                {c.camera_id} - {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/80 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Evidence</th>
                <th className="py-3.5 px-4">Defect ID / Type</th>
                <th className="py-3.5 px-4">Severity</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Video Offset</th>
                <th className="py-3.5 px-4">Location Node</th>
                <th className="py-3.5 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-600" />
                    <span>Loading incidents & defects...</span>
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-500" />
                    <span>No defect incidents match the active filters.</span>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => (
                  <tr key={evt.event_id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      {evt.evidence_path ? (
                        <img
                          src={`/${evt.evidence_path}`}
                          alt="Thumbnail"
                          className="w-14 h-10 object-cover rounded-xl border border-slate-200 cursor-pointer hover:opacity-80 transition"
                          onClick={() => onSelectEvent(evt)}
                        />
                      ) : (
                        <div className="w-14 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                          -
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-sky-700">{evt.event_id}</div>
                      <div className="text-slate-900 font-bold mt-0.5">{evt.event_type.replace(/_/g, ' ')}</div>
                      <div className="text-slate-500 text-[11px] line-clamp-1">{evt.description}</div>
                    </td>
                    <td className="py-3 px-4">
                      <SeverityBadge severity={evt.severity} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={evt.status} />
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 font-medium">
                      {evt.timestamp}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{evt.camera_id || 'CAM-01'}</div>
                      <div className="text-[11px] text-slate-400">{evt.location}</div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => onSelectEvent(evt)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 transition font-bold shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Page <span className="font-bold text-slate-800">{page}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={filteredEvents.length < limit}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition shadow-xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
