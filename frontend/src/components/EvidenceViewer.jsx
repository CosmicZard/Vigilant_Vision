import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Download,
  Info,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Camera
} from 'lucide-react';
import SeverityBadge from './SeverityBadge';
import StatusBadge from './StatusBadge';
import { EventsAPI } from '../services/api';

export default function EvidenceViewer({ event, onClose, onReviewSubmitted }) {
  const [detailedEvent, setDetailedEvent] = useState(event);
  const [reviewerName, setReviewerName] = useState('Senior Road Safety Inspector');
  const [reviewAction, setReviewAction] = useState('CONFIRM');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (event?.event_id) {
      EventsAPI.get(event.event_id)
        .then((res) => setDetailedEvent(res.data))
        .catch((err) => console.error('Error fetching event details:', err));
    }
  }, [event]);

  if (!detailedEvent) return null;

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await EventsAPI.addReview(detailedEvent.event_id, {
        action: reviewAction,
        reviewer: reviewerName,
        remarks: remarks || `Action ${reviewAction} applied by ${reviewerName}`,
      });
      const updated = await EventsAPI.get(detailedEvent.event_id);
      setDetailedEvent(updated.data);
      if (onReviewSubmitted) onReviewSubmitted(updated.data);
      setRemarks('');
    } catch (err) {
      console.error('Error submitting review:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setIsSubmitting(true);
      const res = await EventsAPI.generateReport(detailedEvent.event_id);
      const reportUrl = res.data.pdf_url || `/${res.data.report_url}`;

      // Automatically trigger PDF download
      const link = document.createElement('a');
      link.href = reportUrl;
      link.download = res.data.filename || `${detailedEvent.event_id}_Authority_Report.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error generating PDF report:', err);
      alert('Failed to generate PDF report.');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] relative z-10 animate-modal-pop">
        {/* Modal Header */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-gradient-to-tr from-sky-600 to-sky-500 text-white shadow-md shadow-sky-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-slate-900 tracking-tight">Forensic Defect Evidence</h3>
                <span className="font-mono text-xs bg-sky-100/70 text-sky-800 px-2 py-0.5 rounded-md font-extrabold border border-sky-200">
                  {detailedEvent.event_id}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-600 line-clamp-1 mt-0.5">
                {detailedEvent.event_type?.replace(/_/g, ' ')} • {detailedEvent.location || 'NH-44 Sector'} • {detailedEvent.timestamp || '00:00.000'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <SeverityBadge severity={detailedEvent.severity} size="lg" />
            <StatusBadge status={detailedEvent.status} />
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition active:scale-95 shadow-2xs"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-y-auto">
          {/* Left: Annotated Evidence Frame with High-Tech HUD Reticle */}
          <div className="lg:col-span-7 space-y-2.5">
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center shadow-inner group">
              {/* HUD Corner Brackets */}
              <div className="hud-corner-tl" />
              <div className="hud-corner-tr" />
              <div className="hud-corner-bl" />
              <div className="hud-corner-br" />
              <div className="animate-scanline" />

              {/* SVG Holographic Targeting Crosshair */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30 group-hover:opacity-70 transition-opacity">
                <svg className="w-24 h-24 text-sky-400 animate-pulse-ring" viewBox="0 0 100 100" fill="none" stroke="currentColor">
                  <circle cx="50" cy="50" r="40" strokeWidth="1.5" strokeDasharray="6 4" />
                  <circle cx="50" cy="50" r="20" strokeWidth="1" />
                  <path d="M 50 0 L 50 25 M 50 75 L 50 100 M 0 50 L 25 50 M 75 50 L 100 50" strokeWidth="1.5" />
                </svg>
              </div>

              {/* Timestamp & Coordinate HUD Overlay Tag */}
              <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-[10px] font-mono text-sky-300 px-2 py-0.5 rounded border border-sky-500/30">
                REC: {detailedEvent.timestamp || '00:00.000'} | FRM #{detailedEvent.frame_number || 0}
              </div>

              {detailedEvent.evidence_path ? (
                <img
                  src={`/${detailedEvent.evidence_path}`}
                  alt={`Evidence for ${detailedEvent.event_id}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-6 text-slate-400">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No visual snapshot recorded</p>
                </div>
              )}
            </div>

            {detailedEvent.evidence_path && (
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span className="font-mono text-[11px]">Snapshot: <strong className="text-slate-700 font-bold">{detailedEvent.evidence_path}</strong></span>
                <a
                  href={`/${detailedEvent.evidence_path}`}
                  download={`${detailedEvent.event_id}.jpg`}
                  className="flex items-center gap-1.5 text-sky-600 hover:text-sky-700 font-bold transition hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Snapshot
                </a>
              </div>
            )}
          </div>

          {/* Right: Concise Technical Telemetry & Review Console */}
          <div className="lg:col-span-5 space-y-3.5">
            {/* Concise Telemetry Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2.5 text-xs">
              <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-sky-600" />
                  Defect Signature
                </span>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                  Verified Match
                </span>
              </h4>

              {/* Concise Telemetry Grid */}
              <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Defect Type</span>
                  <span className="font-black text-xs text-slate-900">{detailedEvent.event_type?.replace(/_/g, ' ')}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Camera Node</span>
                  <span className="font-black text-xs text-slate-900">{detailedEvent.camera_id || 'CAM-01'}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Location</span>
                  <span className="font-semibold text-xs text-slate-800 truncate block">{detailedEvent.location || 'NH-44 Sector'}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">GPS Coordinates</span>
                  <span className="font-mono text-xs text-slate-800 font-bold">
                    {detailedEvent.latitude ? `${detailedEvent.latitude.toFixed(3)}, ${detailedEvent.longitude.toFixed(3)}` : '28.613, 77.209'}
                  </span>
                </div>
              </div>

              {/* Concise Description Box */}
              <div className="bg-sky-50/60 p-2.5 rounded-xl border border-sky-100 text-[11px] text-slate-700 leading-snug">
                <strong>Forensic Note:</strong> {detailedEvent.description}
              </div>
            </div>


            {/* Audit Actions Console */}
            <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-200/80 space-y-3">
              <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Civic Authority Action & Dispatch
              </h4>
              <form onSubmit={handleReviewSubmit} className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1 font-semibold">Action Decision</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewAction('CONFIRM')}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition ${
                        reviewAction === 'CONFIRM'
                          ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verify Defect
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewAction('RESOLVE')}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition ${
                        reviewAction === 'RESOLVE'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Resolved
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewAction('ESCALATE')}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition ${
                        reviewAction === 'ESCALATE'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Escalate Priority
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewAction('FALSE_POSITIVE')}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition ${
                        reviewAction === 'FALSE_POSITIVE'
                          ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Dismiss
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 block mb-1 font-semibold">Inspector Remarks</label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter dispatch notes, repair work order number, or verification notes..."
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                    rows={2}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Recording Audit...' : 'Submit Authority Decision'}</span>
                </button>
              </form>

              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={isSubmitting}
                className="w-full mt-3 bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Generate Report & Send to Authorities</span>
              </button>

              {detailedEvent.reviews && detailedEvent.reviews.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-200 space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    Audit Log History ({detailedEvent.reviews.length})
                  </span>
                  <div className="space-y-1.5 max-h-24 overflow-y-auto">
                    {detailedEvent.reviews.map((rev) => (
                      <div key={rev.review_id} className="p-2 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-700">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-sky-700">{rev.action}</span>
                          <span className="text-slate-400 font-normal">{new Date(rev.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-500 mt-0.5">{rev.remarks}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
