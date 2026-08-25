import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Cpu,
  Zap,
  CheckCircle2,
  RefreshCw,
  Play,
  Layers,
  Sparkles,
  TrendingUp,
  Target,
  FileCode,
  ShieldCheck,
  Flame,
  AlertCircle
} from 'lucide-react';
import { TrainingAPI } from '../services/api';

export default function TrainAI() {
  const [baseModel, setBaseModel] = useState('yolov8n.pt');
  const [epochs, setEpochs] = useState(10);
  const [batchSize, setBatchSize] = useState(8);
  const [trainingState, setTrainingState] = useState({
    status: 'IDLE',
    current_epoch: 0,
    total_epochs: 10,
    progress_pct: 0,
    mAP50: 0,
    box_loss: 0,
    cls_loss: 0,
    message: 'Ready to train AI model',
    active_model: 'yolov8n.pt',
    history: []
  });
  const [modelsList, setModelsList] = useState([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [activationMsg, setActivationMsg] = useState('');

  const fetchStatus = async () => {
    try {
      const [stRes, modRes] = await Promise.all([
        TrainingAPI.status(),
        TrainingAPI.models()
      ]);
      setTrainingState(stRes.data);
      setModelsList(modRes.data || []);
    } catch (err) {
      console.error('Error fetching training status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleStartTraining = async () => {
    try {
      setIsStarting(true);
      setActivationMsg('');
      await TrainingAPI.start({
        base_model: baseModel,
        epochs: parseInt(epochs),
        batch_size: parseInt(batchSize),
      });
      fetchStatus();
    } catch (err) {
      console.error('Failed to start training:', err);
    } finally {
      setIsStarting(false);
    }
  };

  const handleActivateModel = async (modelFilename) => {
    try {
      setIsActivating(true);
      const res = await TrainingAPI.activate(modelFilename);
      setActivationMsg(res.data.message || 'Model activated successfully!');
      fetchStatus();
    } catch (err) {
      console.error('Failed to activate model:', err);
      setActivationMsg('Failed to activate model.');
    } finally {
      setIsActivating(false);
    }
  };

  const isTraining = trainingState.status === 'TRAINING' || trainingState.status === 'PREPARING_DATA';
  const isCompleted = trainingState.status === 'COMPLETED';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">AI Model Training & Fine-Tuning Hub</h1>
            <span className="bg-sky-50 text-sky-700 text-xs font-bold px-3 py-1 rounded-full border border-sky-200 flex items-center gap-1.5">
              <BrainCircuit className="w-3.5 h-3.5" />
              YOLOv8 Neural Network
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Train and fine-tune custom AI defect detection models on road surface, potholes, garbage, and infrastructure datasets
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Active Vision Engine</span>
            <span className="font-mono font-bold text-sky-700">{trainingState.active_model || 'yolov8n.pt'}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Training Setup + Live Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Configuration Station (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">Training Parameters</h3>
                <p className="text-[11px] text-slate-400">Configure transfer learning hyperparameters</p>
              </div>
            </div>

            {/* Architecture Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Base Architecture</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isTraining}
                  onClick={() => setBaseModel('yolov8n.pt')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    baseModel === 'yolov8n.pt'
                      ? 'bg-sky-50 border-sky-400 text-sky-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold text-xs">YOLOv8 Nano</div>
                  <div className="text-[10px] text-slate-500">Fastest (Edge/CPU)</div>
                </button>

                <button
                  type="button"
                  disabled={isTraining}
                  onClick={() => setBaseModel('yolov8s.pt')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    baseModel === 'yolov8s.pt'
                      ? 'bg-sky-50 border-sky-400 text-sky-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold text-xs">YOLOv8 Small</div>
                  <div className="text-[10px] text-slate-500">Higher Precision</div>
                </button>
              </div>
            </div>

            {/* Epochs Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700">Training Epochs:</span>
                <span className="font-mono bg-sky-100 text-sky-800 px-2.5 py-0.5 rounded-lg">{epochs} Epochs</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                value={epochs}
                disabled={isTraining}
                onChange={(e) => setEpochs(e.target.value)}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>5 (Fast Prototype)</span>
                <span>15 (Balanced)</span>
                <span>30 (Production)</span>
              </div>
            </div>

            {/* Batch Size */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Batch Size</label>
              <select
                value={batchSize}
                disabled={isTraining}
                onChange={(e) => setBatchSize(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-sky-500"
              >
                <option value="4">4 Frames (Low Memory)</option>
                <option value="8">8 Frames (Standard)</option>
                <option value="16">16 Frames (CUDA GPU)</option>
              </select>
            </div>

            {/* Target Defect Classes Included */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                Defect Target Classes (5 Classes):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Potholes',
                  'Garbage & Debris',
                  'Waterlogging & Flooding',
                  'Vehicles',
                  'Pedestrians'
                ].map((cls, i) => (
                  <span key={i} className="text-[10px] font-bold bg-white text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                    {cls}
                  </span>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartTraining}
              disabled={isTraining || isStarting}
              className="w-full py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isTraining || isStarting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Flame className="w-4 h-4" />
              )}
              <span>{isTraining ? 'Fine-Tuning YOLOv8 Neural Network...' : 'Start AI Model Training'}</span>
            </button>
          </div>
        </div>

        {/* Right: Live Training Telemetry & Model Activation (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Training Progress Dashboard */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl border ${isTraining ? 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse' : isCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">Training Telemetry & Metrics</h3>
                  <p className="text-[11px] text-slate-400">{trainingState.message}</p>
                </div>
              </div>

              <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase border ${
                isTraining
                  ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                  : isCompleted
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {trainingState.status}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">Overall Progress</span>
                <span className="font-mono text-sky-600">{trainingState.progress_pct || 0}%</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.round(trainingState.progress_pct || 0)}%` }}
                />
              </div>
            </div>

            {/* KPI Metric Scorecards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Epoch</span>
                <span className="text-lg font-black text-slate-800 font-mono">
                  {trainingState.current_epoch} / {trainingState.total_epochs || epochs}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">mAP50 Accuracy</span>
                <span className="text-lg font-black text-emerald-600 font-mono">
                  {trainingState.mAP50 ? `${(trainingState.mAP50 * 100).toFixed(1)}%` : '--'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Box Loss</span>
                <span className="text-lg font-black text-sky-600 font-mono">
                  {trainingState.box_loss || '--'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Class Loss</span>
                <span className="text-lg font-black text-indigo-600 font-mono">
                  {trainingState.cls_loss || '--'}
                </span>
              </div>
            </div>

            {/* Epoch History Table / Console */}
            {trainingState.history && trainingState.history.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Epoch Epoch Loss & Accuracy Logs ({trainingState.history.length})
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono text-[11px] bg-slate-900 text-slate-200 p-3 rounded-2xl">
                  {trainingState.history.map((h, i) => (
                    <div key={i} className="flex items-center justify-between text-slate-300">
                      <span>Epoch {String(h.epoch).padStart(2, '0')}:</span>
                      <span className="text-sky-400">box_loss: {h.box_loss}</span>
                      <span className="text-amber-400">cls_loss: {h.cls_loss}</span>
                      <span className="text-emerald-400">mAP50: {(h.mAP50 * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Model Weights & Production Activation */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Available Models & Hot-Reload
              </h3>
              {activationMsg && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {activationMsg}
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {modelsList.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border flex items-center justify-between transition ${
                    m.is_active
                      ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-200'
                      : 'bg-slate-50/60 border-slate-200'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{m.name}</span>
                      {m.is_active && (
                        <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase">
                          Active In Production
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">File: {m.filename} • {m.size_mb} MB</span>
                  </div>

                  {!m.is_active && (
                    <button
                      onClick={() => handleActivateModel(m.filename)}
                      disabled={isActivating}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                    >
                      <Play className="w-3 h-3 text-sky-600" />
                      <span>Activate Model</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
