import React, { useState, useEffect } from 'react';
import { CheckSquare, Clock, CheckCircle2, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../api/client';

export default function ActionTracking({ onSelectPattern, onNavigateOutcomes }) {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActions();
  }, []);

  const loadActions = async () => {
    try {
      setLoading(true);
      const data = await api.getActions();
      setActions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (actionId, newStatus, patternId) => {
    try {
      await api.updateAction(actionId, {
        status: newStatus,
        notes: `Status changed to ${newStatus} by duty municipal officer.`
      });
      if (newStatus === 'COMPLETED') {
        await api.evaluateOutcome(patternId, actionId);
      }
      loadActions();
    } catch (err) {
      alert(`Error updating action: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex justify-between items-center border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900">Municipal Interventions & Action Tracking</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 font-semibold border border-sky-200">
              Step 12
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Track assigned engineering teams, priority levels, and physical repairs dispatched from validated patterns.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-sky-500 mb-2" />
          <span>Loading actions...</span>
        </div>
      ) : actions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <CheckSquare className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">No Interventions Dispatched Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Validate a candidate pattern in Pattern Discovery and dispatch an intervention action.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {actions.map((act) => (
            <div key={act.action_id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    {act.action_id}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{act.title}</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    act.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                    act.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {act.priority} Priority
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    act.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                    act.status === 'IN_PROGRESS' ? 'bg-sky-100 text-sky-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {act.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400 block mb-0.5">Department</span>
                  <span className="font-semibold text-slate-900">{act.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Assigned Team</span>
                  <span className="font-semibold text-slate-900">{act.assigned_team}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Associated Pattern</span>
                  <button
                    onClick={() => onSelectPattern(act.pattern_id)}
                    className="font-mono font-bold text-sky-600 hover:underline"
                  >
                    {act.pattern_id}
                  </button>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Target Due Date</span>
                  <span className="font-mono">{act.due_date ? new Date(act.due_date).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>

              {act.notes && (
                <div className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-700 font-mono">
                  {act.notes}
                </div>
              )}

              <div className="pt-2 flex flex-wrap gap-2 border-t border-slate-100">
                {act.status === 'PENDING' && (
                  <button
                    onClick={() => handleUpdateStatus(act.action_id, 'IN_PROGRESS', act.pattern_id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-colors"
                  >
                    Start Field Work (In Progress)
                  </button>
                )}
                {act.status !== 'COMPLETED' && (
                  <button
                    onClick={() => handleUpdateStatus(act.action_id, 'COMPLETED', act.pattern_id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
                  >
                    Mark Completed & Trigger Outcome Monitor
                  </button>
                )}
                {act.status === 'COMPLETED' && (
                  <button
                    onClick={onNavigateOutcomes}
                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold hover:bg-emerald-100 transition-colors"
                  >
                    View Post-Action Outcome Report &rarr;
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
