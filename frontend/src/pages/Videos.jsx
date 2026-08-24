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
  SunMedium,
  Signpost,
  Moon
} from 'lucide-react';
import VideoPlayer from '../components/VideoPlayer';
import { VideosAPI, EventsAPI, CamerasAPI, DatasetsAPI } from '../services/api';

export default function Videos({ onSelectEvent, selectedVideoId }) {
  const [videos, setVideos] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoEvents, setVideoEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processingJobs, setProcessingJobs] = useState({});
  const [selectedCameraId, setSelectedCameraId] = useState('CAM-01');

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const [vRes, cRes] = await Promise.all([
        VideosAPI.list(),
        CamerasAPI.list(),
      ]);
      setVideos(vRes.data);
      setCameras(cRes.data);

      if (vRes.data.length > 0) {
        const target = selectedVideoId
          ? vRes.data.find((v) => v.video_id === selectedVideoId) || vRes.data[0]
          : selectedVideo || vRes.data[0];
        setSelectedVideo(target);
      }
    } catch (err) {
      console.error('Error fetching videos:', err);
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
        .then((res) => setVideoEvents(res.data))
        .catch((err) => console.error('Error fetching video events:', err));
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
          console.error('Error polling progress:', err);
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
      const formData = new FormData();
      formData.append('file', file);
      formData.append('camera_id', selectedCameraId);

      const res = await VideosAPI.upload(formData);
      await fetchVideos();
      setSelectedVideo(res.data);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Video Analytics & Playback Studio</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Frame-by-frame YOLOv8 AI pipeline, defect detection, and forensic timeline analysis
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
            onClick={() => handleGenerateSynthetic('missing_traffic_light')}
            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-900 px-3 py-1.5 rounded-xl text-xs font-bold border border-rose-200 transition"
          >
            <SunMedium className="w-3.5 h-3.5 text-rose-600" />
            <span>Missing Signal</span>
          </button>
          <button
            onClick={() => handleGenerateSynthetic('missing_street_light_night')}
            className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 px-3 py-1.5 rounded-xl text-xs font-bold border border-indigo-200 transition"
          >
            <Moon className="w-3.5 h-3.5 text-indigo-600" />
            <span>Night Blackout</span>
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
            <div className="p-4 rounded-3xl bg-white border border-slate-200/80 flex items-center justify-between shadow-sm">
              <div>
                <span className="font-extrabold text-sm text-slate-800 block">{selectedVideo.filename}</span>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 font-mono">
                  <span>ID: {selectedVideo.video_id}</span>
                  <span>•</span>
                  <span>Duration: {selectedVideo.duration?.toFixed(1)}s</span>
                  <span>•</span>
                  <span>{selectedVideo.fps} FPS</span>
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-sky-500"
                >
                  {cameras.map((c) => (
                    <option key={c.camera_id} value={c.camera_id}>
                      {c.camera_id} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-sky-400 rounded-2xl p-6 cursor-pointer bg-slate-50/60 hover:bg-sky-50/40 transition group">
                <Upload className="w-8 h-8 text-slate-400 group-hover:text-sky-600 mb-2 transition" />
                <span className="text-xs font-bold text-slate-700 group-hover:text-sky-700">
                  {uploading ? 'Uploading Video...' : 'Select MP4 / AVI Video File'}
                </span>
                <span className="text-[10px] text-slate-400 mt-1">Supports highway and road surveillance clips</span>
                <input
                  type="file"
                  accept="video/mp4,video/avi,video/mkv"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Recordings Queue List */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <FileVideo className="w-4 h-4 text-sky-600" />
                Footage Library ({videos.length})
              </h3>
              <button
                onClick={fetchVideos}
                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {videos.map((v) => {
                const isSelected = selectedVideo?.video_id === v.video_id;
                const job = processingJobs[v.video_id];

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
                      <span className="font-bold text-xs text-slate-800 line-clamp-1">
                        {v.filename}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteVideo(v.video_id);
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-mono">{v.video_id}</span>
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
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
