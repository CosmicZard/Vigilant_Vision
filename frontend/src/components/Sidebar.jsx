import React from 'react';
import {
  LayoutDashboard,
  AlertTriangle,
  Video,
  MapPin,
  BarChart3,
  Camera,
  FolderArchive,
  CheckCircle2
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, unreadEventsCount = 0 }) {
  const menuItems = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: 'events', label: 'Incidents & Defects', icon: AlertTriangle, badge: unreadEventsCount },
    { id: 'videos', label: 'Video Studio', icon: Video },
    { id: 'map', label: 'GIS Road Map', icon: MapPin },
    { id: 'analytics', label: 'Civic Analytics', icon: BarChart3 },
    { id: 'cameras', label: 'Surveillance Nodes', icon: Camera },
    { id: 'datasets', label: 'Scenario Simulator', icon: FolderArchive },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between p-4 min-h-[calc(100vh-61px)] shadow-sm">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Surveillance & Detection
          </p>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 border border-sky-200/80 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className="bg-sky-100 text-sky-700 border border-sky-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Civic AI Engines Status */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-2 text-xs">
          <div className="flex items-center justify-between text-emerald-800 font-bold">
            <span>Detection Suite</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">5/5 Active</span>
          </div>
          <div className="space-y-1 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Potholes & Surface Cracks</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Garbage & Debris Piles</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Missing Traffic Lights</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Missing Sign Boards</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Night Streetlight Blackouts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between px-1">
        <span>Vigilant Vision v1.1</span>
        <span className="text-emerald-600 font-semibold flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          Ready
        </span>
      </div>
    </aside>
  );
}
