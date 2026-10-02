import React, { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Layers, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../api/client';

export default function ComplaintTracking({ onSelectPattern }) {
  const [searchQuery, setSearchQuery] = useState('CMP-W12-WAT-001');
  const [complaint, setComplaint] = useState(null);
  const [similarityResults, setSimilarityResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    handleSearch();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);

    try {
      if (searchQuery.startsWith('CMP-')) {
        const c = await api.getComplaintDetail(searchQuery.trim());
        setComplaint(c);
        // Also run similarity on its text
        const sim = await api.searchSimilarity(c.complaint_text);
        setSimilarityResults(sim);
      } else {
        // Free text search
        const sim = await api.searchSimilarity(searchQuery.trim());
        setSimilarityResults(sim);
        setComplaint(null);
      }
    } catch (err) {
      setError(err.message || 'Complaint not found');
      setComplaint(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Search Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Track Grievance & Semantic Connections</h1>
          <p className="text-sm text-slate-500 mt-1">
            Search by Ticket ID (e.g., <code className="bg-slate-100 text-sky-700 px-1 py-0.5 rounded font-mono">CMP-W12-WAT-001</code>) 
            or type any grievance text to discover semantically related complaints across the municipality.
          </p>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter Complaint ID or description to search similar issues..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all font-mono"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-all shadow-sm disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Complaint Detail Card */}
      {complaint && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-6">
          <div className="p-6 bg-slate-900 text-white flex flex-wrap justify-between items-center gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-lg font-bold text-sky-400">{complaint.complaint_id}</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 uppercase">
                  {complaint.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Logged on {new Date(complaint.created_at).toLocaleString()}</p>
            </div>
            {complaint.cluster_id && (
              <div className="bg-sky-950 border border-sky-800 px-3 py-1.5 rounded-lg flex items-center space-x-2 text-xs text-sky-300">
                <Layers className="w-4 h-4 text-sky-400" />
                <span>Associated Cluster: <b className="font-mono">{complaint.cluster_id}</b></span>
              </div>
            )}
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Reported Text</span>
              <p className="text-base text-slate-800 font-medium italic">"{complaint.complaint_text}"</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block mb-0.5">Category</span>
                <span className="font-bold text-slate-900 capitalize">{complaint.category.replace('_', ' ')}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block mb-0.5">Location</span>
                <span className="font-bold text-slate-900">{complaint.street}, {complaint.ward}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block mb-0.5">Department</span>
                <span className="font-bold text-slate-900">{complaint.department}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block mb-0.5">Severity</span>
                <span className="font-bold text-amber-600 uppercase">{complaint.severity}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Similarity Results Panel */}
      {similarityResults && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-sky-600" />
                <h3 className="text-lg font-bold text-slate-900">Semantic Similarity Matches</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated using cosine similarity thresholds (0.90+ Highly Similar, 0.75-0.89 Potentially Related).
              </p>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Found {similarityResults.matches_count} matches
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {similarityResults.top_matches.map((m, idx) => {
              const isHigh = m.classification === 'HIGHLY_SIMILAR';
              const isRelated = m.classification === 'POTENTIALLY_RELATED';

              return (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-bold text-slate-700">{m.complaint_id}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      isHigh ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                      isRelated ? 'bg-sky-50 text-sky-700 border-sky-200' :
                      'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {(m.similarity_score * 100).toFixed(1)}% &bull; {m.classification.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 line-clamp-2 italic">
                    "{m.complaint_text}"
                  </p>

                  <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                    <span>{m.street || 'Street'}, {m.ward || 'Ward'}</span>
                    <span className="font-mono">Cosine: {m.similarity_score}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
