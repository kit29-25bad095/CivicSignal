import React, { useEffect, useState } from 'react';
import { 
  FileText, Layers, AlertTriangle, CheckCircle2, 
  CheckSquare, Activity, Sparkles, RefreshCw, ArrowRight 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import StatCard from '../components/StatCard';
import { api } from '../api/client';

const COLORS = ['#0284c7', '#d97706', '#059669', '#7c3aed', '#e11d48', '#64748b'];

export default function OfficerDashboard({ onNavigate, onSelectPattern }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryMsg, setDiscoveryMsg] = useState(null);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunDiscovery = async () => {
    try {
      setDiscovering(true);
      setDiscoveryMsg(null);
      const res = await api.triggerDiscovery();
      setDiscoveryMsg(`Clustering Complete: ${res.clusters_detected} clusters identified, ${res.patterns_generated} candidate patterns generated.`);
      loadSummary();
    } catch (err) {
      setDiscoveryMsg(`Error during pattern discovery: ${err.message}`);
    } finally {
      setDiscovering(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center space-x-2 text-slate-500 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-sky-500" />
          <span>Loading Municipal Dashboard...</span>
        </div>
      </div>
    );
  }

  // Prep chart data
  const categoryData = summary?.categories_breakdown 
    ? Object.entries(summary.categories_breakdown).map(([name, count]) => ({
        name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count
      }))
    : [];

  const wardData = summary?.wards_breakdown
    ? Object.entries(summary.wards_breakdown).map(([name, count]) => ({
        name,
        count
      }))
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900">Officer Intelligence Console</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-900 text-sky-400 font-semibold">
              Live Feed
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Aggregated municipal telemetry across all wards, clustering signals, and pending human validations.
          </p>
        </div>

        <button
          onClick={handleRunDiscovery}
          disabled={discovering}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-md transition-all disabled:opacity-50"
        >
          {discovering ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Synthesizing Signals...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Trigger Pattern Discovery</span>
            </>
          )}
        </button>
      </div>

      {discoveryMsg && (
        <div className="bg-sky-50 border border-sky-200 text-sky-800 p-4 rounded-xl text-sm flex justify-between items-center">
          <span>{discoveryMsg}</span>
          <button 
            onClick={() => onNavigate('patterns')}
            className="text-xs font-bold text-sky-700 underline hover:text-sky-900 ml-4"
          >
            Go to Patterns &rarr;
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Reports"
          value={summary?.total_complaints || 0}
          subtitle="Processed in database"
          icon={FileText}
          color="sky"
        />
        <StatCard
          title="DBSCAN Clusters"
          value={summary?.active_clusters || 0}
          subtitle="Coherent groupings"
          icon={Layers}
          color="purple"
        />
        <StatCard
          title="Pending Review"
          value={summary?.potential_patterns || 0}
          subtitle="Requires validation"
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          title="Validated"
          value={summary?.validated_patterns || 0}
          subtitle="By municipal officer"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Open Actions"
          value={summary?.open_actions || 0}
          subtitle="Interventions active"
          icon={CheckSquare}
          color="sky"
        />
        <StatCard
          title="Outcomes"
          value={summary?.monitored_outcomes || 0}
          subtitle="Before/After trends"
          icon={Activity}
          color="emerald"
        />
      </div>

      {/* Primary Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Ward Breakdown Bar Chart */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900">Complaints Volume by Ward</h2>
              <p className="text-xs text-slate-500">Distribution across administrative municipal divisions</p>
            </div>
            <button 
              onClick={() => onNavigate('map_intelligence')}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center space-x-1"
            >
              <span>Explore Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wardData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#0284c7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Pie Chart */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Category Breakdown</h2>
            <p className="text-xs text-slate-500">Dominant municipal domains</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent System Activity / Audit Log Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent System Activity & AI Event Stream</h2>
            <p className="text-xs text-slate-500">Immutable trace of human-in-the-loop decisions and algorithmic pattern updates</p>
          </div>
          <button 
            onClick={() => onNavigate('audit')}
            className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center space-x-1"
          >
            <span>View Full Audit Log</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {summary?.recent_activity?.slice(0, 5).map((act) => (
            <div key={act.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50/80 transition-colors">
              <div className="flex items-center space-x-3">
                <span className={`px-2 py-0.5 rounded font-mono font-semibold text-[10px] ${
                  act.actor_role === 'AI_AGENT' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                  act.actor_role === 'OFFICER' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {act.actor_role}
                </span>
                <div>
                  <span className="font-semibold text-slate-900">{act.action_type.replace('_', ' ')}</span>
                  <span className="text-slate-400 mx-1.5">&bull;</span>
                  <span className="text-slate-600 font-mono">{act.entity_type}: {act.entity_id}</span>
                </div>
              </div>
              <span className="text-slate-400 font-mono">
                {act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
