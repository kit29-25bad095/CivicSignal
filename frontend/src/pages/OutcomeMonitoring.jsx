import React, { useState, useEffect } from 'react';
import { ShieldCheck, TrendingDown, Clock, Activity, ArrowRight, RefreshCw } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { api } from '../api/client';

export default function OutcomeMonitoring({ onSelectPattern }) {
  const [outcomes, setOutcomes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOutcomes();
  }, []);

  const loadOutcomes = async () => {
    try {
      setLoading(true);
      const data = await api.getOutcomes();
      setOutcomes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-extrabold text-slate-900">Outcome Monitoring & Post-Action Impact</h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
            Step 13
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Compares complaint frequency across pre- and post-intervention observation windows. Strictly adheres to non-causal reporting standards.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-sky-500 mb-2" />
          <span>Loading outcome evaluations...</span>
        </div>
      ) : outcomes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <Activity className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">No Post-Intervention Outcomes Logged Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Once a municipal action is marked "COMPLETED", the system monitors subsequent complaint frequency and generates a comparative trend report.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {outcomes.map((out) => {
            const chartData = [
              { period: `Pre-Action (${out.pre_action_window_days}d)`, count: out.pre_action_complaint_count },
              { period: `Post-Action (${out.post_action_window_days}d)`, count: out.post_action_complaint_count },
            ];

            return (
              <div key={out.outcome_id} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                      {out.outcome_id}
                    </span>
                    <button
                      onClick={() => onSelectPattern(out.pattern_id)}
                      className="text-base font-bold text-slate-900 hover:text-sky-600 transition-colors flex items-center space-x-1"
                    >
                      <span>Pattern Ref: {out.pattern_id}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Monitored on {new Date(out.monitored_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-7 space-y-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">
                        AI Empirical Observation Report
                      </span>
                      <p className="text-base text-slate-800 font-medium leading-relaxed">
                        "{out.observation_report}"
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-xs text-slate-500 block mb-0.5">Pre-Action Window</span>
                        <span className="text-2xl font-bold text-slate-900">{out.pre_action_complaint_count}</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">complaints logged</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-xs text-slate-500 block mb-0.5">Post-Action Window</span>
                        <span className="text-2xl font-bold text-emerald-600">{out.post_action_complaint_count}</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">complaints logged</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      * <b>Ethical Non-Causal Standard:</b> {out.disclaimer}
                    </div>
                  </div>

                  <div className="lg:col-span-5 h-56 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                        <Bar dataKey="count" fill="#0284c7" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
