import React, { useState, useEffect } from 'react';
import {
  Upload,
  CheckCircle2,
  Clock,
  RefreshCw,
  Trash2,
  Cpu,
  Sparkles,
  FileVideo,
  AlertOctagon,
  Trash,
  Droplets,
  SunMedium,
  Signpost,
  Moon,
  Filter,
  AlertTriangle,
  Server,
  Radio
} from 'lucide-react';
import VideoPlayer from '../components/VideoPlayer';
import { VideosAPI, EventsAPI, CamerasAPI, DatasetsAPI } from '../services/api';

const DEFAULT_CAMERAS = [
  { camera_id: 'CAM-01', name: 'North Corridor Mile 14' },
  { camera_id: 'CAM-02', name: 'West Border Gate 4B' },
  { camera_id: 'CAM-03', name: 'Ring Road Expressway J3' },
  { camera_id: 'CAM-04', name: 'Coastal Tollway Segment A' },
  { camera_id: 'CAM-05', name: 'Eastern Freight Corridor Post 8' }
];

export default function Videos({ onSelectEvent, selectedVideoId }) {
  const [videos, setVideos] = useState([]);
  const [cameras, setCameras] = useState(DEFAULT_CAMERAS);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoEvents, setVideoEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [backendConnected, setBackendConnected] = useState(true);
  const [clearingSamples, setClearingSamples] = useState(false);
  const [processingJobs, setProcessingJobs] = useState({});
  const [selectedCameraId, setSelectedCameraId] = useState('CAM-01');
  const [filterSource, setFilterSource] = useState('ALL'); // 'ALL' | 'UPLOAD' | 'SYNTHETIC'

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const [vRes, cRes] = await Promise.all([
        VideosAPI.list(),
        CamerasAPI.list(),
      ]);
      setVideos(vRes.data || []);
      if (cRes.data && cRes.data.length > 0) {
        setCameras(cRes.data);
      }
      setBackendConnected(true);

      if (vRes.data && vRes.data.length > 0) {
        const target = selectedVideoId
          ? vRes.data.find((v) => v.video_id === selectedVideoId) || vRes.data[0]
          : selectedVideo || vRes.data[0];
        setSelectedVideo(target);
      }
    } catch (err) {
      console.warn('Backend connection notice:', err.message);
      setBackendConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [selectedVideoId]);

  useEffect(() => {
    if (selectedVideo?.video_id) {
      EventsAPI.list({ video_id: selectedVideo.video_id, limit: 100 })
        .then((res) => setVideoEvents(res.data || []))
        .catch((err) => console.debug('Error fetching video events:', err.message));
    }
  }, [selectedVideo]);

  useEffect(() => {
    const processingVideos = videos.filter((v) => v.status === 'PROCESSING');
    if (processingVideos.length === 0) return;

    const interval = setInterval(async () => {
      for (const v of processingVideos) {
        try {
          const res = await VideosAPI.progress(v.video_id);
          setProcessingJobs((prev) => ({ ...prev, [v.video_id]: res.data }));
          if (res.data.status === 'COMPLETED' || res.data.status === 'FAILED') {
            fetchVideos();
          }
        } catch (err) {
          console.debug('Polling error:', err.message);
        }
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [videos]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setUploadProgress(10);
      setUploadError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('camera_id', selectedCameraId || 'CAM-01');

      const res = await VideosAPI.upload(formData, (pct) => {
        setUploadProgress(Math.max(10, pct));
      });

      setUploadProgress(100);
      await fetchVideos();
      setSelectedVideo(res.data);
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError(
        err.response?.data?.detail ||
        err.message ||
        'Cannot connect to backend server. Please make sure python start_servers.py is running.'
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset input element value so user can re-upload if needed
      e.target.value = '';
    }
  };

  const handleStartProcessing = async (videoId) => {
    try {
      await VideosAPI.process(videoId, selectedCameraId);
      setVideos((prev) =>
        prev.map((v) => (v.video_id === videoId ? { ...v, status: 'PROCESSING' } : v))
      );
    } catch (err) {
      console.error('Processing trigger error:', err);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm('Delete this video recording and its detections?')) return;
    try {
      await VideosAPI.delete(videoId);
      fetchVideos();
      if (selectedVideo?.video_id === videoId) setSelectedVideo(null);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleClearAllSamples = async () => {
    if (!window.confirm('Are you sure you want to remove all sample test cases from the library? Real uploaded videos will be kept.')) return;
    try {
      setClearingSamples(true);
      await VideosAPI.clearSynthetic();
      await fetchVideos();
    } catch (err) {
      console.error('Error clearing sample videos:', err);
    } finally {
      setClearingSamples(false);
    }
  };

  const handleGenerateSynthetic = async (scenarioType) => {
    try {
      setLoading(true);
      const res = await DatasetsAPI.generateSynthetic(scenarioType, 8, selectedCameraId);
      await fetchVideos();
      setSelectedVideo(res.data);
      handleStartProcessing(res.data.video_id);
    } catch (err) {
      console.error('Synthetic generation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const syntheticCount = videos.filter((v) => v.source === 'synthetic' || v.video_id.startsWith('SYN-') || v.video_id.startsWith('TEST-')).length;
  const uploadCount = videos.filter((v) => v.source === 'upload' || v.video_id.startsWith('VID-')).length;

  const filteredVideos = videos.filter((v) => {
    const isSynthetic = v.source === 'synthetic' || v.video_id.startsWith('SYN-') || v.video_id.startsWith('TEST-');
    if (filterSource === 'UPLOAD') return !isSynthetic;
    if (filterSource === 'SYNTHETIC') return isSynthetic;
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Backend Offline Warning Banner if disconnected */}
      {!backendConnected && (
        <div className="p-4 rounded-3xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold">FastAPI Backend Server Offline (Port 8000)</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Start both servers by running <strong className="font-mono bg-white/80 px-1.5 py-0.5 rounded border border-amber-200">python start_servers.py</strong> or double clicking <strong className="font-mono bg-white/80 px-1.5 py-0.5 rounded border border-amber-200">start.bat</strong>
              </p>
            </div>
          </div>
          <button
            onClick={fetchVideos}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Video Analytics & Playback Studio</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Frame-by-frame YOLOv8 AI pipeline, live bounding boxes, defect detection, and forensic timeline
          </p>
        </div>

        {/* Quick Simulator Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleGenerateSynthetic('potholes')}
            className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-200 transition"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-amber-600" />
            <span>Pothole Demo</span>
          </button>
          <button
            onClick={() => handleGenerateSynthetic('garbage')}
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-200 transition"
          >
            <Trash className="w-3.5 h-3.5 text-emerald-600" />
            <span>Garbage Demo</span>
          </button>
          <button
            onClick={() => handleGenerateSynthetic('waterlogging')}
            className="flex items-center gap-1.5 bg-sky-50 hover:bg-sky-100 text-sky-900 px-3 py-1.5 rounded-xl text-xs font-bold border border-sky-200 transition"
          >
            <Droplets className="w-3.5 h-3.5 text-sky-600" />
            <span>Waterlogging Demo</span>
          </button>
          <button
            onClick={() => handleGenerateSynthetic('all_inclusive')}
            className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 px-3 py-1.5 rounded-xl text-xs font-bold border border-indigo-200 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>All Combined</span>
          </button>
        </div>
      </div>

      {/* Main Studio View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Video Player with Scrubber & Overlays (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <VideoPlayer
            video={selectedVideo}
            events={videoEvents}
            onSelectEvent={onSelectEvent}
          />

          {/* Selected Video Metadata & Actions */}
          {selectedVideo && (
            <div className="p-4 rounded-3xl bg-white border border-slate-200/80 flex items-center justify-between shadow-sm flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-800">{selectedVideo.filename}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${
                    selectedVideo.source === 'upload' || selectedVideo.video_id.startsWith('VID-')
                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {selectedVideo.source === 'upload' || selectedVideo.video_id.startsWith('VID-') ? 'Uploaded Video' : 'Sample Demo'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 font-mono">
                  <span>ID: {selectedVideo.video_id}</span>
                  <span>•</span>
                  <span>Duration: {selectedVideo.duration?.toFixed(1) || '0.0'}s</span>
                  <span>•</span>
                  <span>{selectedVideo.fps || 24} FPS</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {selectedVideo.status === 'PROCESSING' ? (
                  <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 text-sky-700 px-3 py-1.5 rounded-xl text-xs font-bold animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Frames...</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleStartProcessing(selectedVideo.video_id)}
                    className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition"
                  >
                    <Cpu className="w-4 h-4" />
                    <span>Run AI Analytics</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Upload & Recordings Library (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Upload Drop Zone */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-3">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
              <Upload className="w-4 h-4 text-sky-600" />
              Ingest Road / CCTV Footage
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1 font-semibold">Assign Surveillance Node</label>
                <select
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-sky-500"
                >
                  {cameras.map((c) => (
                    <option key={c.camera_id} value={c.camera_id}>
                      {c.camera_id} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload Drop Container */}
              <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-5 cursor-pointer transition group relative ${
                uploading
                  ? 'border-sky-400 bg-sky-50/50'
                  : uploadError
                  ? 'border-rose-300 bg-rose-50/40 hover:bg-rose-50/70'
                  : 'border-slate-200 hover:border-sky-400 bg-slate-50/60 hover:bg-sky-50/40'
              }`}>
                {uploading ? (
                  <div className="w-full text-center space-y-2 py-2">
                    <RefreshCw className="w-7 h-7 text-sky-600 animate-spin mx-auto" />
                    <span className="text-xs font-bold text-sky-800 block">
                      Uploading Video ({uploadProgress}%)...
                    </span>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${uploadProgress}%` }}
                        className="bg-sky-600 h-full rounded-full transition-all duration-200"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-7 h-7 text-slate-400 group-hover:text-sky-600 mb-1.5 transition" />
                    <span className="text-xs font-bold text-slate-700 group-hover:text-sky-700">
                      Select MP4 / AVI Video File
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Drag & drop smartphone or CCTV recordings</span>
                  </>
                )}

                <input
                  type="file"
                  accept="video/mp4,video/avi,video/mkv,video/mov"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>

              {/* Upload Error Banner if present */}
              {uploadError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Upload Error</span>
                  </div>
                  <p className="text-[11px] text-rose-700">{uploadError}</p>
                </div>
              )}
            </div>
          </div>

          {/* Recordings Queue List */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <FileVideo className="w-4 h-4 text-sky-600" />
                Footage Library ({videos.length})
              </h3>
              
              <div className="flex items-center gap-1.5">
                {syntheticCount > 0 && (
                  <button
                    onClick={handleClearAllSamples}
                    disabled={clearingSamples}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg border border-rose-200 transition flex items-center gap-1"
                    title="Remove all synthetic demo test cases"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear Demos ({syntheticCount})</span>
                  </button>
                )}

                <button
                  onClick={fetchVideos}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                  title="Refresh library"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Filter Tabs (All / Uploads / Demos) */}
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <button
                onClick={() => setFilterSource('ALL')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                  filterSource === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                All ({videos.length})
              </button>
              <button
                onClick={() => setFilterSource('UPLOAD')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                  filterSource === 'UPLOAD'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                User Uploads ({uploadCount})
              </button>
              {syntheticCount > 0 && (
                <button
                  onClick={() => setFilterSource('SYNTHETIC')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    filterSource === 'SYNTHETIC'
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Demos ({syntheticCount})
                </button>
              )}
            </div>

            {/* Video Items */}
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {filteredVideos.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  {backendConnected ? (
                    'No videos match this filter. Upload a video above to begin analytics.'
                  ) : (
                    'Backend is offline. Run python start_servers.py to load videos.'
                  )}
                </div>
              ) : (
                filteredVideos.map((v) => {
                  const isSelected = selectedVideo?.video_id === v.video_id;
                  const job = processingJobs[v.video_id];
                  const isUpload = v.source === 'upload' || v.video_id.startsWith('VID-');

                  return (
                    <div
                      key={v.video_id}
                      onClick={() => setSelectedVideo(v)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-sky-50/80 border-sky-300 shadow-xs'
                          : 'bg-slate-50/60 border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 max-w-[80%]">
                          <span className="font-bold text-xs text-slate-800 truncate">
                            {v.filename}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteVideo(v.video_id);
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 transition"
                          title="Delete video"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px]">{v.video_id}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase border ${
                            isUpload
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {isUpload ? 'Upload' : 'Demo'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {v.status === 'COMPLETED' ? (
                            <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {v.events_count || 0} Defects
                            </span>
                          ) : v.status === 'PROCESSING' ? (
                            <span className="text-sky-700 flex items-center gap-1 font-semibold">
                              <RefreshCw className="w-3 h-3 animate-spin text-sky-600" />
                              {job?.progress ? `${job.progress}%` : 'Processing'}
                            </span>
                          ) : (
                            <span className="text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Queued
                            </span>
                          )}
                        </div>
                      </div>

                      {v.status === 'PROCESSING' && job && (
                        <div className="mt-2 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${job.progress || 10}%` }}
                            className="h-full bg-sky-500 transition-all duration-300"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
