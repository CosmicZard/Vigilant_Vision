import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Radio,
  Eye,
  EyeOff,
  Layers,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Cpu,
  CheckCircle2
} from 'lucide-react';
import SeverityBadge from './SeverityBadge';
import { VideosAPI } from '../services/api';

export default function VideoPlayer({ video, events = [], onSelectEvent }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [activeOverlayEvent, setActiveOverlayEvent] = useState(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [fallbackTriggered, setFallbackTriggered] = useState(false);

  // AI Detections Overlay State
  const [detections, setDetections] = useState([]);
  const [showAiBoxes, setShowAiBoxes] = useState(true);
  const [videoDimensions, setVideoDimensions] = useState({ width: 1280, height: 720 });

  // Reset player when video changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setVideoError(null);
    setIsBuffering(false);
    setFallbackTriggered(false);

    if (video?.video_id) {
      VideosAPI.detections(video.video_id)
        .then((res) => {
          setDetections(res.data || []);
        })
        .catch((err) => {
          console.error('Error fetching detections:', err);
          setDetections([]);
        });
    } else {
      setDetections([]);
    }
  }, [video?.video_id]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch((err) => {
              console.warn('Playback error (auto-muting):', err);
              if (videoRef.current) {
                videoRef.current.muted = true;
                setIsMuted(true);
                videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
              }
            });
        }
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const curr = videoRef.current.currentTime;
      setCurrentTime(curr);

      const matchingEvent = events.find(
        (e) => Math.abs((e.timestamp_seconds || 0) - curr) < 1.5
      );
      setActiveOverlayEvent(matchingEvent || null);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || video?.duration || 0);
      if (videoRef.current.videoWidth && videoRef.current.videoHeight) {
        setVideoDimensions({
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight,
        });
      }
      setIsBuffering(false);
    }
  };

  const seekTo = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Find active bounding boxes matching current time window
  const activeDetections = detections.filter(
    (d) => Math.abs((d.timestamp || 0) - currentTime) < 0.35
  );

  const getCategoryColor = (objectType) => {
    const type = (objectType || '').toLowerCase();
    if (type.includes('person') || type.includes('pedestrian')) {
      return { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.20)', text: '#fbbf24' }; // Amber
    }
    if (type.includes('water') || type.includes('puddle') || type.includes('flood')) {
      return { stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.25)', text: '#22d3ee' }; // Cyan for waterlogging
    }
    if (type.includes('pothole') || type.includes('garbage') || type.includes('hazard') || type.includes('debris')) {
      return { stroke: '#f43f5e', fill: 'rgba(244, 63, 94, 0.25)', text: '#fb7185' }; // Rose
    }
    return { stroke: '#0284c7', fill: 'rgba(2, 132, 199, 0.20)', text: '#38bdf8' }; // Sky blue for vehicles
  };

  if (!video) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm">
        <Radio className="w-12 h-12 mx-auto mb-2 opacity-40 text-sky-500" />
        <p className="text-sm font-medium">Select a video or upload CCTV footage to start playback</p>
      </div>
    );
  }

  const streamUrl = `/api/videos/${video.video_id}/stream`;
  const staticFallbackUrl = video.source === 'upload' ? `/uploads/${video.filename}` : `/datasets/${video.filename}`;

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-xs space-y-0 transition-all hover:shadow-md" ref={containerRef}>
      {/* Player Frame with Overlays */}
      <div className="relative bg-slate-950 aspect-video flex items-center justify-center group overflow-hidden">
        {/* HUD Corner Brackets */}
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        <video
          key={video.video_id}
          ref={videoRef}
          src={streamUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => { setIsBuffering(false); setIsPlaying(true); }}
          onPause={() => setIsPlaying(false)}
          onCanPlay={() => setIsBuffering(false)}
          onError={(e) => {
            if (!fallbackTriggered) {
              console.warn('Stream error, attempting static path fallback...');
              setFallbackTriggered(true);
              if (videoRef.current) {
                videoRef.current.src = staticFallbackUrl;
                videoRef.current.load();
              }
            } else {
              setVideoError('Unable to decode video codec. Ensure MP4/H.264 format.');
            }
          }}
          muted={isMuted}
          playsInline
          preload="auto"
          className="w-full h-full object-contain cursor-pointer"
          onClick={togglePlay}
        />

        {/* Buffering Spinner Overlay */}
        {isBuffering && (
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center pointer-events-none">
            <div className="bg-slate-900/90 text-white px-4 py-2 rounded-2xl flex items-center gap-2 border border-slate-700 text-xs font-bold shadow-lg">
              <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
              <span>Streaming Video...</span>
            </div>
          </div>
        )}

        {/* Video Error Banner */}
        {videoError && (
          <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center p-6 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-amber-400" />
            <p className="text-xs text-slate-200 font-bold max-w-xs">{videoError}</p>
            <button
              onClick={() => {
                setVideoError(null);
                if (videoRef.current) {
                  videoRef.current.src = staticFallbackUrl;
                  videoRef.current.load();
                }
              }}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              Retry Playback
            </button>
          </div>
        )}

        {/* Live SVG Bounding Box Canvas Overlay */}
        {showAiBoxes && activeDetections.length > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${videoDimensions.width} ${videoDimensions.height}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {activeDetections.map((d, idx) => {
              const [x1, y1, x2, y2] = d.bbox || [0, 0, 0, 0];
              const w = Math.max(0, x2 - x1);
              const h = Math.max(0, y2 - y1);
              const colors = getCategoryColor(d.object_type);

              return (
                <g key={idx}>
                  {/* Bounding Box Rectangle */}
                  <rect
                    x={x1}
                    y={y1}
                    width={w}
                    height={h}
                    stroke={colors.stroke}
                    strokeWidth="3.5"
                    fill={colors.fill}
                    rx="4"
                  />
                  {/* HUD Corner Accents */}
                  <line x1={x1} y1={y1} x2={x1 + 14} y2={y1} stroke="white" strokeWidth="3" />
                  <line x1={x1} y1={y1} x2={x1} y2={y1 + 14} stroke="white" strokeWidth="3" />
                  <line x1={x2} y1={y2} x2={x2 - 14} y2={y2} stroke="white" strokeWidth="3" />
                  <line x1={x2} y1={y2} x2={x2} y2={y2 - 14} stroke="white" strokeWidth="3" />

                  {/* Label Background Pill */}
                  <rect
                    x={x1}
                    y={Math.max(0, y1 - 24)}
                    width={Math.max(90, (d.object_type.length * 10) + 40)}
                    height="22"
                    fill="#0f172a"
                    opacity="0.9"
                    rx="4"
                  />
                  {/* Label Text */}
                  <text
                    x={x1 + 6}
                    y={Math.max(15, y1 - 8)}
                    fill={colors.text}
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {d.object_type} ({Math.round((d.confidence || 0) * 100)}%)
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {/* Live Active Incident Alert Overlay Banner */}
        {activeOverlayEvent && (
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between bg-slate-900/90 backdrop-blur-md border border-rose-500/80 rounded-2xl p-3 text-white shadow-xl animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs tracking-tight">
                    {activeOverlayEvent.event_type.replace(/_/g, ' ')}
                  </span>
                  <SeverityBadge severity={activeOverlayEvent.severity} showIcon={false} />
                </div>
                <p className="text-[11px] text-slate-300 line-clamp-1">{activeOverlayEvent.description}</p>
              </div>
            </div>

            {onSelectEvent && (
              <button
                onClick={() => onSelectEvent(activeOverlayEvent)}
                className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition shadow-xs"
              >
                Inspect
              </button>
            )}
          </div>
        )}

        {/* Big Center Play/Pause Button on Hover */}
        <button
          onClick={togglePlay}
          className="absolute p-4 rounded-full bg-slate-900/60 text-white border border-white/20 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg"
        >
          {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 translate-x-0.5" />}
        </button>
      </div>

      {/* Control Bar & Timeline */}
      <div className="p-4 bg-white border-t border-slate-100 space-y-3">
        {/* Scrubber Progress Bar with Defect Markers */}
        <div className="relative group/scrubber cursor-pointer">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.05"
            value={currentTime}
            onChange={(e) => seekTo(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600 relative z-10"
          />

          {/* Timeline Incident Markers */}
          {duration > 0 &&
            events.map((evt) => {
              const posPct = ((evt.timestamp_seconds || 0) / duration) * 100;
              if (posPct < 0 || posPct > 100) return null;

              return (
                <div
                  key={evt.event_id}
                  style={{ left: `${posPct}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    seekTo(evt.timestamp_seconds || 0);
                  }}
                  className={`absolute top-0 w-2.5 h-2 -translate-x-1/2 rounded-full cursor-pointer z-20 transition-transform hover:scale-150 ${
                    evt.severity === 'CRITICAL'
                      ? 'bg-rose-500 shadow-sm shadow-rose-300'
                      : evt.severity === 'HIGH'
                      ? 'bg-amber-500'
                      : 'bg-sky-500'
                  }`}
                  title={`${evt.event_type} (${evt.timestamp})`}
                />
              );
            })}
        </div>

        {/* Bottom Control Actions */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              onClick={() => seekTo(0)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="Restart"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !isMuted;
                  setIsMuted(!isMuted);
                }
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <span className="font-mono text-slate-600 font-semibold">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Live AI Overlay Toggle */}
            <button
              onClick={() => setShowAiBoxes(!showAiBoxes)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-xs ${
                showAiBoxes
                  ? 'bg-sky-50 border-sky-300 text-sky-700'
                  : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}
            >
              {showAiBoxes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>AI Bounding Boxes: {showAiBoxes ? 'ON' : 'OFF'}</span>
            </button>

            {/* Playback Speed */}
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              className="bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-bold focus:outline-none"
            >
              <option value="0.5">0.5x</option>
              <option value="1">1.0x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2.0x</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
