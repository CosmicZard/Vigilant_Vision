import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  FolderArchive,
  Cpu,
  CheckCircle2,
  RefreshCw,
  AlertOctagon,
  Trash2,
  Droplets
} from 'lucide-react';
import { DatasetsAPI, VideosAPI } from '../services/api';

export default function Datasets({ onVideoGenerated }) {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Generator Options
  const [scenarioType, setScenarioType] = useState('potholes');
  const [durationSec, setDurationSec] = useState(8);
  const [cameraId, setCameraId] = useState('CAM-01');

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      const res = await DatasetsAPI.list();
      setDatasets(res.data);
    } catch (err) {
      console.error('Error fetching datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const res = await DatasetsAPI.generateSynthetic(scenarioType, durationSec, cameraId);
      await VideosAPI.process(res.data.video_id, cameraId);
      fetchDatasets();
      if (onVideoGenerated) onVideoGenerated(res.data);
    } catch (err) {
      console.error('Error generating synthetic video:', err);
    } finally {
      setGenerating(false);
    }
  };

  const scenarios = [
    {
      id: 'potholes',
      title: '1. Potholes & Surface Cracks',
      desc: 'Simulates asphalt surface deterioration, irregular dark depression contours, and depth contrast on road lanes.',
      badge: 'Infrastructure',
      icon: AlertOctagon,
      color: 'amber',
    },
    {
      id: 'garbage',
      title: '2. Garbage & Debris Piles',
      desc: 'Simulates roadside litter piles, discarded plastic bags, cardboard, and waste debris along road shoulders.',
      badge: 'Civic Sanitation',
      icon: Trash2,
      color: 'emerald',
    },
    {
      id: 'waterlogging',
      title: '3. Waterlogging & Flooding Detection',
      desc: 'Simulates standing road water puddles, surface ponding, and wet reflective road sectors creating hydroplaning hazards.',
      badge: 'Monsoon Safety',
      icon: Droplets,
      color: 'sky',
    },
    {
      id: 'all_inclusive',
      title: '4. All-Inclusive Multi-Hazard Scenario',
      desc: 'Comprehensive road footage combining traffic vehicles, potholes, garbage piles, and waterlogging defects.',
      badge: 'Combined Test',
      icon: Sparkles,
      color: 'blue',
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Civic Defect Simulators & Datasets</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Test and evaluate the core AI detection capabilities: Potholes, Garbage & Debris, and Waterlogging & Road Flooding
          </p>
        </div>
        <button
          onClick={fetchDatasets}
          disabled={loading}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 shadow-sm transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-600' : ''}`} />
          <span>Refresh Library</span>
        </button>
      </div>

      {/* Synthetic Scenario Generator Station */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-500 text-white shadow-md shadow-sky-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-800">Civic Defect & Smart Road Scenario Simulator</h3>
            <p className="text-xs text-slate-500">
              Select any scenario below to generate synthetic footage with ground-truth signatures and execute real-time AI validation
            </p>
          </div>
        </div>

        {/* Scenario Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((sc) => {
            const isSelected = scenarioType === sc.id;
            const Icon = sc.icon;
            return (
              <div
                key={sc.id}
                onClick={() => setScenarioType(sc.id)}
                className={`p-4.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'bg-sky-50/70 border-sky-400 shadow-sm ring-1 ring-sky-300'
                    : 'bg-slate-50/60 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white px-2.5 py-0.5 rounded-full text-slate-600 border border-slate-200">
                      {sc.badge}
                    </span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-600" />}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Icon className="w-4 h-4 text-sky-600" />
                    <h4 className="font-bold text-xs text-slate-900">{sc.title}</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{sc.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Configuration Sliders & Generator Button */}
        <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-700 w-full sm:w-auto">
            <div>
              <label className="block text-slate-500 text-[11px] mb-1 font-semibold">Duration: <strong className="text-slate-900">{durationSec}s</strong></label>
              <input
                type="range"
                min="4"
                max="20"
                value={durationSec}
                onChange={(e) => setDurationSec(parseInt(e.target.value))}
                className="w-36 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
              />
            </div>
            <div>
              <label className="block text-slate-500 text-[11px] mb-1 font-semibold">Assign Surveillance Node</label>
              <select
                value={cameraId}
                onChange={(e) => setCameraId(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-sky-500"
              >
                <option value="CAM-01">CAM-01 (NH-44 Corridor)</option>
                <option value="CAM-02">CAM-02 (Border Checkpoint)</option>
                <option value="CAM-03">CAM-03 (Expressway J3)</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-50"
          >
            {generating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Cpu className="w-4 h-4" />
            )}
            <span>{generating ? 'Simulating & Running Detection...' : 'Generate & Execute AI Detection'}</span>
          </button>
        </div>
      </div>

      {/* Dataset Footage Library */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
          <FolderArchive className="w-4 h-4 text-sky-600" />
          Footage Files on Disk ({datasets.length})
        </h3>

        {datasets.length === 0 ? (
          <p className="text-xs text-slate-400">No generated video files found in datasets directory.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {datasets.map((d, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <span className="font-bold text-slate-800 block truncate max-w-[200px]">{d.name}</span>
                  <span className="text-slate-400 font-mono">{d.size_mb} MB</span>
                </div>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  Ready
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
