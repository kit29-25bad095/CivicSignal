import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, Filter, Sparkles, RefreshCw, 
  MapPin, Calendar, Layers, ArrowRight, ShieldCheck, CheckCircle2 
} from 'lucide-react';
import { EvidenceScoreBadge, PatternStatusBadge } from '../components/EvidenceBadge';
import { api } from '../api/client';

export default function PatternDiscovery({ onSelectPattern }) {
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [discovering, setDiscovering] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    loadPatterns();
  }, [filterStatus]);

  const loadPatterns = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus !== 'ALL') params.status = filterStatus;
      const data = await api.getPatterns(params);
      setPatterns(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerDiscovery = async () => {
    try {
      setDiscovering(true);
      setStatusMsg(null);
      const res = await api.triggerDiscovery();
      setStatusMsg(`Discovery agent completed. Identified ${res.clusters_detected} clusters and ${res.patterns_generated} patterns.`);
      loadPatterns();
    } catch (err) {
      setStatusMsg(`Discovery failed: ${err.message}`);
    } finally {
      setDiscovering(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900">Pattern Discovery Engine</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
              DBSCAN + Multi-Signal Agent
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Synthesizes semantic similarity, spatial bounding, recurrence, and baseline deviation into explainable candidate patterns.
          </p>
        </div>

        <button
          onClick={handleTriggerDiscovery}
          disabled={discovering}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50"
        >
          {discovering ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing Clusters...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Run Discovery Agent</span>
            </>
          )}
        </button>
      </div>

      {statusMsg && (
        <div className="bg-sky-50 border border-sky-200 text-sky-800 p-4 rounded-xl text-sm">
          {statusMsg}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        {['ALL', 'PENDING_REVIEW', 'VALIDATED', 'NEEDS_INVESTIGATION', 'REJECTED'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              filterStatus === st
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {st === 'ALL' ? 'All Patterns' : st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Pattern Cards List */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-sky-500 mb-2" />
          <span>Scanning patterns...</span>
        </div>
      ) : patterns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">No Patterns Found in this Filter</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Click "Run Discovery Agent" to scan unclustered complaints and detect emerging civic patterns.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {patterns.map((pat) => (
            <div
              key={pat.pattern_id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-4"
              onClick={() => onSelectPattern(pat.pattern_id)}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-sm font-extrabold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200">
                    {pat.pattern_id}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 hover:text-sky-600 transition-colors">
                    {pat.title}
                  </h3>
                </div>
                <div className="flex items-center space-x-3">
                  <PatternStatusBadge status={pat.status} />
                  <EvidenceScoreBadge score={pat.pattern_strength} />
                </div>
              </div>

              {/* Summary */}
              <p className="text-sm text-slate-600 leading-relaxed">
                {pat.summary}
              </p>

              {/* Signals Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Complaints</span>
                  <span className="font-bold text-slate-900 text-sm">{pat.complaint_count} records</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Location Bounding</span>
                  <span className="font-bold text-slate-900 text-sm">{pat.ward}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Recurrence</span>
                  <span className="font-bold text-slate-900 text-sm">{pat.temporal_recurrence_days} days</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Spike Elevation</span>
                  <span className="font-bold text-amber-600 text-sm font-mono">{pat.spike_ratio}x Baseline</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Semantic Coherence</span>
                  <span className="font-bold text-indigo-600 text-sm font-mono">{pat.avg_semantic_similarity.toFixed(2)} Cosine</span>
                </div>
              </div>

              {/* Affected Streets Preview */}
              {pat.affected_streets_json && pat.affected_streets_json.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                  <span className="text-slate-400 font-medium mr-1">Corridor:</span>
                  {pat.affected_streets_json.map((st, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                      {st}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Link Footer */}
              <div className="pt-2 flex justify-between items-center text-xs text-slate-500 border-t border-slate-100">
                <span className="font-mono text-slate-400">Cluster Ref: {pat.cluster_id}</span>
                <span className="font-semibold text-sky-600 flex items-center space-x-1">
                  <span>Inspect Evidence & Validate</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
