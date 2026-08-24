import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Radio
} from 'lucide-react';
import SeverityBadge from './SeverityBadge';

export default function VideoPlayer({ video, events = [], onSelectEvent }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [activeOverlayEvent, setActiveOverlayEvent] = useState(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
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

  if (!video) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm">
        <Radio className="w-12 h-12 mx-auto mb-2 opacity-40 text-sky-500" />
        <p className="text-sm font-medium">Select a video or run a test scenario to start playback</p>
      </div>
    );
  }

  const streamUrl = `/api/videos/${video.video_id}/stream`;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm space-y-0">
      {/* Player Frame with Overlays */}
      <div className="relative bg-slate-950 aspect-video flex items-center justify-center group overflow-hidden">
        <video
          ref={videoRef}
          src={streamUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          muted={isMuted}
          playsInline
          className="w-full h-full object-contain"
          onClick={togglePlay}
        />

        {/* Live HUD Overlay at top */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs font-mono text-white">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>FEED: {video.video_id}</span>
            <span className="text-slate-400">| {video.filename}</span>
          </div>

          {activeOverlayEvent && (
            <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200 p-2.5 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in text-slate-800">
              <SeverityBadge severity={activeOverlayEvent.severity} />
              <div>
                <span className="font-bold text-xs text-slate-900 block">
                  {activeOverlayEvent.event_type.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] text-slate-600 line-clamp-1">
                  {activeOverlayEvent.description}
                </span>
              </div>
              {onSelectEvent && (
                <button
                  onClick={() => onSelectEvent(activeOverlayEvent)}
                  className="bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg transition"
                >
                  Inspect
                </button>
              )}
            </div>
          )}
        </div>

        {/* Center Play Button Overlay on Pause */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 m-auto h-16 w-16 rounded-full bg-sky-600/90 hover:bg-sky-600 text-white flex items-center justify-center backdrop-blur-xs transition-all transform hover:scale-105 shadow-xl"
          >
            <Play className="w-8 h-8 ml-1" />
          </button>
        )}
      </div>

      {/* Timeline with Incident Markers */}
      <div className="p-4 bg-slate-50/80 border-t border-slate-100 space-y-3">
        {/* Scrubber Bar */}
        <div className="relative pt-2 pb-1">
          {/* Incident Markers on Timeline */}
          {duration > 0 &&
            events.map((evt) => {
              const posPercent = Math.min(100, Math.max(0, ((evt.timestamp_seconds || 0) / duration) * 100));
              let markerColor = 'bg-sky-500';
              if (evt.severity === 'CRITICAL') markerColor = 'bg-rose-500 animate-pulse';
              if (evt.severity === 'HIGH') markerColor = 'bg-amber-500';
              if (evt.severity === 'LOW') markerColor = 'bg-emerald-500';

              return (
                <button
                  key={evt.event_id}
                  onClick={() => {
                    seekTo(evt.timestamp_seconds || 0);
                    if (onSelectEvent) onSelectEvent(evt);
                  }}
                  title={`${evt.event_type} (${evt.timestamp})`}
                  style={{ left: `${posPercent}%` }}
                  className={`absolute top-0 -ml-1.5 h-5 w-3 rounded-sm ${markerColor} z-20 hover:scale-125 transition-transform cursor-pointer border border-white shadow`}
                />
              );
            })}

          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={(e) => seekTo(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600 z-10 relative"
          />
        </div>

        {/* Player Controls Bar */}
        <div className="flex items-center justify-between text-xs text-slate-700">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 transition"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => seekTo(0)}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="font-mono text-slate-600 text-xs font-semibold">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Incident Count Badge */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-semibold">Detected Defects:</span>
            <span className="font-bold font-mono bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full border border-sky-200">
              {events.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-700 focus:outline-none"
            >
              <option value="0.5">0.5x</option>
              <option value="1">1.0x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2.0x</option>
            </select>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
