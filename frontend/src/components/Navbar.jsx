import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Sparkles,
  Bell,
  Activity,
  RefreshCw,
  ChevronDown,
  AlertOctagon,
  Trash2,
  Droplets,
  SunMedium,
  Signpost,
  Moon,
  Volume2,
  VolumeX,
  CheckCheck,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  Info,
  Laptop
} from 'lucide-react';
import { DatasetsAPI } from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import SeverityBadge from './SeverityBadge';

export default function Navbar({ onSyntheticGenerated, onSelectEvent }) {
  const [timeStr, setTimeStr] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
  const notifRef = useRef(null);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    soundEnabled,
    setSoundEnabled,
    desktopPermitted,
    requestDesktopPermission,
  } = useNotifications();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close drawer on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotificationDrawer(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const filteredNotifs = activeTab === 'unread'
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  return (
    <header className="bg-white border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      {/* Brand Identity */}
      <div className="flex items-center gap-3.5">
        <div className="h-10 w-10 rounded-xl bg-sky-600 flex items-center justify-center shadow-md shadow-sky-500/20 text-white">
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
      <div className="flex items-center gap-3 relative" ref={notifRef}>
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
                onClick={() => handleRunDemo('waterlogging')}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium transition"
              >
                <Droplets className="w-4 h-4 text-sky-500" />
                <div>
                  <div className="font-bold text-slate-800">3. Waterlogging & Flooding</div>
                  <div className="text-[10px] text-slate-500">Detect standing water puddles & ponding</div>
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

        {/* Interactive Alerts Bell Button */}
        <button
          onClick={() => setShowNotificationDrawer(!showNotificationDrawer)}
          className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          title="Notification Center"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black h-4.5 w-4.5 rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notification Center Dropdown Drawer */}
        {showNotificationDrawer && (
          <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 overflow-hidden text-xs animate-fade-in">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm text-slate-800">Alert Notifications</h4>
                {unreadCount > 0 && (
                  <span className="bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-full text-[10px] border border-rose-200">
                    {unreadCount} new
                  </span>
                )}
              </div>

              {/* Sound & Push Settings Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-1.5 rounded-xl border transition ${
                    soundEnabled
                      ? 'bg-sky-50 border-sky-200 text-sky-700'
                      : 'bg-slate-100 border-slate-200 text-slate-400'
                  }`}
                  title={soundEnabled ? 'Alert Audio Chime: ON' : 'Alert Audio Chime: MUTED'}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>

                {!desktopPermitted && (
                  <button
                    onClick={requestDesktopPermission}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition"
                    title="Enable Desktop Push Alerts"
                  >
                    <Laptop className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    activeTab === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  onClick={() => setActiveTab('unread')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    activeTab === 'unread'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {notifications.length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>

            {/* Notification Items List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {filteredNotifs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-1">
                  <Bell className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                  <p className="font-semibold text-xs text-slate-600">No notifications</p>
                  <p className="text-[10px]">New AI defect detections will appear here.</p>
                </div>
              ) : (
                filteredNotifs.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      markAsRead(n.id);
                      if (onSelectEvent && n.eventData) {
                        onSelectEvent(n.eventData);
                        setShowNotificationDrawer(false);
                      }
                    }}
                    className={`p-3.5 hover:bg-slate-50 transition cursor-pointer flex items-start gap-3 ${
                      !n.isRead ? 'bg-sky-50/30' : 'bg-white'
                    }`}
                  >
                    <div className="mt-0.5">
                      {n.severity === 'CRITICAL' ? (
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                      ) : n.severity === 'HIGH' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Info className="w-4 h-4 text-sky-600" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-bold text-xs ${!n.isRead ? 'text-slate-900 font-extrabold' : 'text-slate-700'}`}>
                          {n.title}
                        </span>
                        <SeverityBadge severity={n.severity} showIcon={false} />
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{n.description}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>{n.id}</span>
                        <span>{n.timeAgo}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <button
                  onClick={clearAll}
                  className="hover:text-rose-600 font-semibold px-2 py-1 rounded transition"
                >
                  Clear History
                </button>
                <span className="text-slate-400 font-mono text-[10px]">Real-Time Feed</span>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
