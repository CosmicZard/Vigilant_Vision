import React, { useState, useEffect } from 'react';
import {
  Shield,
  Sparkles,
  Bell,
  Activity,
  RefreshCw,
  ChevronDown,
  AlertOctagon,
  Trash2,
  SunMedium,
  Signpost,
  Moon
} from 'lucide-react';
import { DatasetsAPI } from '../services/api';

export default function Navbar({ onSyntheticGenerated, criticalAlertsCount = 0 }) {
  const [timeStr, setTimeStr] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRunDemo = async (scenarioType) => {
    try {
      setIsGenerating(true);
      setShowDemoMenu(false);
      const res = await DatasetsAPI.generateSynthetic(scenarioType, 8, 'CAM-01');
      if (onSyntheticGenerated) {
        onSyntheticGenerated(res.data);
      }
    } catch (err) {
      console.error('Error generating demo video:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      {/* Brand Identity */}
      <div className="flex items-center gap-3.5">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-500 flex items-center justify-center shadow-md shadow-sky-500/20 text-white">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg tracking-tight text-slate-800">Vigilant Vision</span>
            <span className="text-[11px] font-bold bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full border border-sky-200">
              Smart Road & Civic AI
            </span>
          </div>
          <p className="text-xs text-slate-500 font-normal">Automated Road Defect & Border Surveillance Platform</p>
        </div>
      </div>

      {/* Center Operational Status */}
      <div className="hidden lg:flex items-center gap-5 bg-slate-50 border border-slate-200/80 px-4 py-1.5 rounded-full text-xs">
        <div className="flex items-center gap-2 text-emerald-700 font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          AI Vision Engine Active
        </div>
        <div className="h-3 w-px bg-slate-200"></div>
        <div className="text-slate-600 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-sky-500" />
          YOLOv8 + Civic Defect Analyzer
        </div>
        <div className="h-3 w-px bg-slate-200"></div>
        <div className="font-mono text-slate-600 font-medium">
          {timeStr || '00:00:00'}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 relative">
        {/* Quick Demo Selector */}
        <div className="relative">
          <button
            onClick={() => setShowDemoMenu(!showDemoMenu)}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm disabled:opacity-50"
          >
            {isGenerating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{isGenerating ? 'Running AI Detection...' : 'Run Test Scenario'}</span>
            <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
          </button>

          {/* Dropdown Menu */}
          {showDemoMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 text-xs space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Select Civic Defect Test
              </div>
              <button
                onClick={() => handleRunDemo('potholes')}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium transition"
              >
                <AlertOctagon className="w-4 h-4 text-amber-500" />
                <div>
                  <div className="font-bold text-slate-800">1. Pothole Detection</div>
                  <div className="text-[10px] text-slate-500">Detect surface craters & asphalt defects</div>
                </div>
              </button>

              <button
                onClick={() => handleRunDemo('garbage')}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium transition"
              >
                <Trash2 className="w-4 h-4 text-emerald-500" />
                <div>
                  <div className="font-bold text-slate-800">2. Garbage & Debris</div>
                  <div className="text-[10px] text-slate-500">Detect roadside waste & litter piles</div>
                </div>
              </button>

              <button
                onClick={() => handleRunDemo('missing_traffic_light')}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium transition"
              >
                <SunMedium className="w-4 h-4 text-rose-500" />
                <div>
                  <div className="font-bold text-slate-800">3. Missing Traffic Light</div>
                  <div className="text-[10px] text-slate-500">Signal junction without active lights</div>
                </div>
              </button>

              <button
                onClick={() => handleRunDemo('missing_sign_board')}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium transition"
              >
                <Signpost className="w-4 h-4 text-sky-500" />
                <div>
                  <div className="font-bold text-slate-800">4. Missing Sign Board</div>
                  <div className="text-[10px] text-slate-500">Speed / regulatory signpost absent</div>
                </div>
              </button>

              <button
                onClick={() => handleRunDemo('missing_street_light_night')}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium transition"
              >
                <Moon className="w-4 h-4 text-indigo-500" />
                <div>
                  <div className="font-bold text-slate-800">5. Night Streetlight Defect</div>
                  <div className="text-[10px] text-slate-500">Dark blackout sector on night road</div>
                </div>
              </button>

              <div className="border-t border-slate-100 my-1"></div>

              <button
                onClick={() => handleRunDemo('all_inclusive')}
                className="w-full text-left px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 flex items-center gap-2.5 text-sky-900 font-semibold transition"
              >
                <Sparkles className="w-4 h-4 text-sky-600" />
                <div>
                  <div>All Scenarios Combined</div>
                  <div className="text-[10px] text-sky-700">Multi-hazard road evaluation</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Alerts Badge */}
        <div className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer">
          <Bell className="w-4 h-4" />
          {criticalAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black h-4 w-4 rounded-full flex items-center justify-center ring-2 ring-white">
              {criticalAlertsCount}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
