import React, { useState, useEffect } from 'react';
import {
  Camera,
  Plus,
  Trash2,
  MapPin,
  RefreshCw,
  Video
} from 'lucide-react';
import { CamerasAPI } from '../services/api';

export default function Cameras() {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [newCam, setNewCam] = useState({
    camera_id: '',
    name: '',
    location: '',
    latitude: 28.6139,
    longitude: 77.2090,
    stream_url: '',
    zone_type: 'HIGHWAY',
    status: 'ACTIVE',
  });

  const fetchCameras = async () => {
    try {
      setLoading(true);
      const res = await CamerasAPI.list();
      setCameras(res.data);
    } catch (err) {
      console.error('Error fetching cameras:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  const handleCreateCamera = async (e) => {
    e.preventDefault();
    try {
      await CamerasAPI.create(newCam);
      setShowAddModal(false);
      setNewCam({
        camera_id: '',
        name: '',
        location: '',
        latitude: 28.6139,
        longitude: 77.2090,
        stream_url: '',
        zone_type: 'HIGHWAY',
        status: 'ACTIVE',
      });
      fetchCameras();
    } catch (err) {
      console.error('Error creating camera:', err);
    }
  };

  const handleDeleteCamera = async (cameraId) => {
    if (!window.confirm(`Delete surveillance camera ${cameraId}?`)) return;
    try {
      await CamerasAPI.delete(cameraId);
      fetchCameras();
    } catch (err) {
      console.error('Error deleting camera:', err);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Surveillance Camera Infrastructure</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage highway CCTV nodes, border checkpoint feeds, and GPS coordinates
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register New Node</span>
          </button>
        </div>
      </div>

      {/* Camera Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cameras.map((cam) => (
          <div
            key={cam.camera_id}
            className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs hover:shadow-lg hover:border-sky-300 transition-all duration-300 hover:-translate-y-1 space-y-4 group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 shadow-2xs transition-transform duration-300 group-hover:scale-110">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800 group-hover:text-sky-950 transition-colors">{cam.name}</h4>
                  <span className="font-mono text-[11px] text-slate-400 font-bold">{cam.camera_id}</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDeleteCamera(cam.camera_id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-700 font-medium">{cam.location}</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px] pt-1 border-t border-slate-200 text-slate-500">
                <span>GPS: {cam.latitude?.toFixed(4)}, {cam.longitude?.toFixed(4)}</span>
                <span className="bg-white px-2 py-0.5 rounded-md text-sky-700 border border-slate-200 shadow-2xs font-bold">{cam.zone_type}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {cam.status}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {cam.stream_url || 'RTSP Live Stream'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Camera Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 relative z-10 animate-modal-pop">
            <h3 className="font-extrabold text-base text-slate-800">Register Surveillance Node</h3>
            <form onSubmit={handleCreateCamera} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Camera ID (e.g. CAM-06)</label>
                <input
                  type="text"
                  required
                  placeholder="CAM-06"
                  value={newCam.camera_id}
                  onChange={(e) => setNewCam({ ...newCam, camera_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Camera Node Name</label>
                <input
                  type="text"
                  required
                  placeholder="Border Patrol Outpost 9"
                  value={newCam.name}
                  onChange={(e) => setNewCam({ ...newCam, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Location / Road Sector</label>
                <input
                  type="text"
                  required
                  placeholder="NH-48 Sector 12 Flyover"
                  value={newCam.location}
                  onChange={(e) => setNewCam({ ...newCam, location: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newCam.latitude}
                    onChange={(e) => setNewCam({ ...newCam, latitude: parseFloat(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newCam.longitude}
                    onChange={(e) => setNewCam({ ...newCam, longitude: parseFloat(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Zone Type</label>
                  <select
                    value={newCam.zone_type}
                    onChange={(e) => setNewCam({ ...newCam, zone_type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-sky-500"
                  >
                    <option value="HIGHWAY">HIGHWAY</option>
                    <option value="BORDER_CHECKPOINT">BORDER CHECKPOINT</option>
                    <option value="URBAN_INTERSECTION">URBAN INTERSECTION</option>
                    <option value="TOLL_GATE">TOLL GATE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">RTSP Stream URL</label>
                  <input
                    type="text"
                    placeholder="rtsp://node/live"
                    value={newCam.stream_url}
                    onChange={(e) => setNewCam({ ...newCam, stream_url: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold transition shadow-sm"
                >
                  Register Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
