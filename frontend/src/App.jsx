import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import EvidenceViewer from './components/EvidenceViewer';
import ToastNotification from './components/ToastNotification';
import { NotificationProvider } from './context/NotificationContext';

// Pages
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Videos from './pages/Videos';
import MapView from './pages/MapView';
import Analytics from './pages/Analytics';
import Cameras from './pages/Cameras';
import Datasets from './pages/Datasets';
import TrainAI from './pages/TrainAI';

import { MetricsAPI } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [summary, setSummary] = useState({});

  const refreshSystemSummary = async () => {
    try {
      const res = await MetricsAPI.summary();
      setSummary(res.data);
    } catch (err) {
      console.error('Error polling metrics:', err);
    }
  };

  useEffect(() => {
    refreshSystemSummary();
    const interval = setInterval(refreshSystemSummary, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectEvent = (evt) => {
    setSelectedEvent(evt);
  };

  const handleSelectVideo = (video) => {
    setSelectedVideoId(video.video_id);
    setActiveTab('videos');
  };

  return (
    <NotificationProvider onSelectEvent={handleSelectEvent}>
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-sky-500 selection:text-white font-sans relative">
        {/* Floating Real-time Toast Notifications */}
        <ToastNotification onSelectEvent={handleSelectEvent} />

        {/* Top Navbar */}
        <Navbar
          onSyntheticGenerated={(video) => {
            setSelectedVideoId(video.video_id);
            setActiveTab('videos');
            refreshSystemSummary();
          }}
          onSelectEvent={handleSelectEvent}
        />

        {/* Main Workspace */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            unreadEventsCount={summary.total_events || 0}
          />

          {/* Dynamic Center Page */}
          <main className="flex-1 overflow-y-auto min-h-[calc(100vh-61px)]">
            {activeTab === 'dashboard' && (
              <Dashboard
                onSelectEvent={handleSelectEvent}
                onViewAllEvents={() => setActiveTab('events')}
                onSelectVideo={handleSelectVideo}
              />
            )}

            {activeTab === 'events' && (
              <Events onSelectEvent={handleSelectEvent} />
            )}

            {activeTab === 'videos' && (
              <Videos
                onSelectEvent={handleSelectEvent}
                selectedVideoId={selectedVideoId}
              />
            )}

            {activeTab === 'map' && (
              <MapView onSelectEvent={handleSelectEvent} />
            )}

            {activeTab === 'analytics' && (
              <Analytics />
            )}

            {activeTab === 'train' && (
              <TrainAI />
            )}

            {activeTab === 'cameras' && (
              <Cameras />
            )}

            {activeTab === 'datasets' && (
              <Datasets
                onVideoGenerated={(video) => {
                  setSelectedVideoId(video.video_id);
                  setActiveTab('videos');
                  refreshSystemSummary();
                }}
              />
            )}
          </main>
        </div>

        {/* Forensic Evidence Record Modal */}
        {selectedEvent && (
          <EvidenceViewer
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onReviewSubmitted={() => {
              refreshSystemSummary();
            }}
          />
        )}
      </div>
    </NotificationProvider>
  );
}
