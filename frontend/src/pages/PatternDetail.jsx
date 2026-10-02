import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, CheckCircle2, ShieldAlert, HelpCircle, 
  MapPin, Calendar, Layers, Activity, Users, Send, CheckSquare, 
  FileText, Clock, AlertTriangle, RefreshCw 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line 
} from 'recharts';
import LeafletMap from '../components/LeafletMap';
import { EvidenceScoreBadge, PatternStatusBadge } from '../components/EvidenceBadge';
import { api } from '../api/client';

export default function PatternDetail({ patternId, onBack, onNavigateAction }) {
  const [pattern, setPattern] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [investigations, setInvestigations] = useState([]);
  const [actions, setActions] = useState([]);
  const [outcomes, setOutcomes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Officer Validation form state
  const [officerNotes, setOfficerNotes] = useState('');
  const [validating, setValidating] = useState(false);

  // New Action form state
  const [actionTitle, setActionTitle] = useState('');
  const [assignedTeam, setAssignedTeam] = useState('Zone 4 Emergency Pipeline Crew');
  const [actionPriority, setActionPriority] = useState('HIGH');
  const [creatingAction, setCreatingAction] = useState(false);

  useEffect(() => {
    loadPatternData();
  }, [patternId]);

  const loadPatternData = async () => {
    try {
      setLoading(true);
      const [pat, cmps, invs, acts, outs] = await Promise.all([
        api.getPatternDetail(patternId),
        api.getPatternComplaints(patternId),
        api.getInvestigations(patternId),
        api.getActions({ pattern_id: patternId }),
        api.getOutcomes(patternId)
      ]);
      setPattern(pat);
      setComplaints(cmps);
      setInvestigations(invs);
      setActions(acts);
      setOutcomes(outs);
      if (pat) {
        setActionTitle(`Field Inspection: Rectify ${pat.category.replace('_', ' ')} disruption in ${pat.ward}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = async (decision) => {
    try {
      setValidating(true);
      await api.validatePattern(patternId, {
        officer_id: 'OFF-402',
        officer_name: 'Rajesh Sharma (Executive Engineer)',
        decision: decision,
        officer_notes: officerNotes || `Pattern ${decision.toLowerCase()} after review of ${complaints.length} citizen complaints and spatial evidence.`
      });
      loadPatternData();
      setOfficerNotes('');
    } catch (err) {
      alert(`Validation error: ${err.message}`);
    } finally {
      setValidating(false);
    }
  };

  const handleCreateAction = async (e) => {
    e.preventDefault();
    if (!actionTitle.trim()) return;

    try {
      setCreatingAction(true);
      await api.createAction({
        pattern_id: patternId,
        investigation_id: investigations[0]?.investigation_id,
        title: actionTitle,
        department: pattern.category === 'water_supply' ? 'Water Supply & Sewerage Board' : 'Civil Engineering Dept',
        assigned_team: assignedTeam,
        priority: actionPriority,
        notes: `Intervention initiated to resolve validated pattern ${patternId}.`
      });
      loadPatternData();
      setActionTitle('');
    } catch (err) {
      alert(`Action error: ${err.message}`);
    } finally {
      setCreatingAction(false);
    }
  };

  const handleToggleChecklist = async (invId, checklist, itemIndex) => {
    const updated = [...checklist];
    const curr = updated[itemIndex].status;
    updated[itemIndex].status = curr === 'VERIFIED' ? 'PENDING' : 'VERIFIED';
    try {
      await api.updateInvestigation(invId, { checklist_updates: updated });
      loadPatternData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteAction = async (actId) => {
    try {
      await api.updateAction(actId, {
        status: 'COMPLETED',
        notes: 'Intervention completed on-site. Valve repaired and normal distribution pressure restored.'
      });
      // Automatically triggers outcome evaluation
      await api.evaluateOutcome(patternId, actId);
      loadPatternData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !pattern) {
    return (
      <div className="py-24 text-center text-slate-500 text-sm">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-sky-500 mb-2" />
        <span>Loading Evidence Trail for {patternId}...</span>
      </div>
    );
  }

  // Build timeline aggregated data from complaints
  const dateCounts = {};
  complaints.forEach((c) => {
    const d = c.created_at ? c.created_at.slice(0, 10) : '2026-09-25';
    dateCounts[d] = (dateCounts[d] || 0) + 1;
  });
  const timelineData = Object.entries(dateCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({
      date: date.slice(5), // MM-DD
      count,
      baseline: pattern?.baseline_frequency || 1.1
    }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Pattern Discovery</span>
      </button>

      {/* Pattern Master Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-extrabold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200">
                {pattern.pattern_id}
              </span>
              <PatternStatusBadge status={pattern.status} />
              <EvidenceScoreBadge score={pattern.pattern_strength} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {pattern.title}
            </h1>
            <p className="text-sm text-slate-600 max-w-4xl leading-relaxed">
              {pattern.summary}
            </p>
          </div>
        </div>

        {/* Key Signals Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">Related Complaints</span>
            <span className="text-2xl font-black text-slate-900">{pattern.complaint_count}</span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">Affected Streets</span>
            <span className="text-2xl font-black text-slate-900">{pattern.affected_streets_json?.length || 6}</span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">Recurrence Span</span>
            <span className="text-2xl font-black text-slate-900">{pattern.temporal_recurrence_days} Days</span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">Spike Ratio</span>
            <span className="text-2xl font-black text-amber-600 font-mono">{pattern.spike_ratio}x</span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">Semantic Similarity</span>
            <span className="text-2xl font-black text-indigo-600 font-mono">{pattern.avg_semantic_similarity.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Step 9 — Evidence & Explainability Trail */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-2.5 py-1 rounded-md mb-1">
            <Activity className="w-3.5 h-3.5" />
            <span>Evidentiary Audit Trail</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Why was this Pattern Detected?</h2>
          <p className="text-xs text-slate-500">
            Step 9: Every detected pattern provides an explainable evidence trail derived from measurable signals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pattern.evidence_items?.map((ev, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-xs text-slate-900">{ev.title}</span>
                {ev.metric_value !== null && (
                  <span className="font-mono text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    {ev.metric_value} {ev.metric_label}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {ev.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Step 7 & Step 6 — Geospatial & Temporal Intelligence Views */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Map View */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-900">Geospatial Cluster Bounding</h3>
              <p className="text-xs text-slate-500">Concentration across {pattern.affected_streets_json?.length || 6} connected streets in {pattern.ward}</p>
            </div>
            <span className="text-xs font-mono text-slate-500">Center: 12.9716, 77.5946</span>
          </div>

          <LeafletMap
            center={[12.9716, 77.5946]}
            zoom={15}
            complaints={complaints}
            clusters={[{
              cluster_id: pattern.cluster_id,
              geo_center_lat: 12.9716,
              geo_center_lon: 77.5946,
              geo_radius_km: 0.64,
              dominant_category: pattern.category,
              complaint_count: pattern.complaint_count,
              avg_similarity: pattern.avg_semantic_similarity
            }]}
            height="340px"
          />

          <div className="flex flex-wrap gap-1.5 pt-2">
            <span className="text-xs font-semibold text-slate-600 mr-1">Corridor Streets:</span>
            {pattern.affected_streets_json?.map((st, i) => (
              <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium">
                {st}
              </span>
            ))}
          </div>
        </div>

        {/* Temporal Timeline Chart */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Temporal Frequency & Spike</h3>
            <p className="text-xs text-slate-500">Daily complaint counts vs 1.1 complaints/day baseline</p>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                <Bar dataKey="count" fill="#0284c7" name="Complaints/Day" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
            <span>Observed Peak Frequency: <b>4.4 / day</b></span>
            <span className="font-mono font-bold">Spike: {pattern.spike_ratio}x Baseline</span>
          </div>
        </div>
      </div>

      {/* Step 10 — Human Validation Action Panel */}
      <div className="bg-gradient-to-r from-slate-900 to-sky-950 text-white rounded-2xl p-6 sm:p-8 shadow-lg border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-bold">Step 10 — Human-in-the-Loop Validation</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              AI discoveries remain candidate patterns until confirmed by an authorized municipal engineer.
            </p>
          </div>
          <div className="text-xs bg-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
            Duty Officer: <b className="text-white">Rajesh Sharma (BWSSB)</b>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Officer Verification Notes & Rationale
          </label>
          <textarea
            rows={2}
            value={officerNotes}
            onChange={(e) => setOfficerNotes(e.target.value)}
            placeholder="Add officer notes regarding site verification, pressure gauge readings, or crew dispatch instructions..."
            className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-sky-500"
          />

          <div className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={() => handleValidation('VALIDATED')}
              disabled={validating}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Validate Pattern</span>
            </button>
            <button
              onClick={() => handleValidation('NEEDS_INVESTIGATION')}
              disabled={validating}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Request Technical Field Investigation</span>
            </button>
            <button
              onClick={() => handleValidation('REJECTED')}
              disabled={validating}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Reject (False Signal)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Step 11 — Investigation Checklist */}
      {investigations.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md mb-1">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Step 11 — Field Investigation Checklist</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {investigations[0].title}
            </h2>
            <p className="text-xs text-slate-500">
              Generated actionable verification steps. Officers click items to mark verified upon physical inspection.
            </p>
          </div>

          <div className="space-y-3">
            {investigations[0].checklist_json?.map((item, idx) => {
              const isVerified = item.status === 'VERIFIED';
              return (
                <div
                  key={idx}
                  onClick={() => handleToggleChecklist(investigations[0].investigation_id, investigations[0].checklist_json, idx)}
                  className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isVerified ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isVerified ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isVerified ? 'line-through text-emerald-800' : 'text-slate-800'}`}>
                        {item.item}
                      </p>
                      <span className="text-[11px] text-slate-400 font-mono">Ref: {item.id}</span>
                    </div>
                  </div>

                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    isVerified ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {item.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 12 & Step 13 — Action Management & Outcome Monitoring */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Actions Form & List */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-lg font-bold text-slate-900">Step 12 — Action Management</h3>
            <p className="text-xs text-slate-500">Assign maintenance crew and track intervention status</p>
          </div>

          <form onSubmit={handleCreateAction} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Intervention Title</label>
              <input
                type="text"
                value={actionTitle}
                onChange={(e) => setActionTitle(e.target.value)}
                placeholder="e.g. Inspect Ward 12 main water distribution valves"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Team</label>
                <input
                  type="text"
                  value={assignedTeam}
                  onChange={(e) => setAssignedTeam(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                <select
                  value={actionPriority}
                  onChange={(e) => setActionPriority(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingAction}
              className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-sm transition-all"
            >
              {creatingAction ? 'Creating...' : 'Dispatch Intervention Action'}
            </button>
          </form>

          {/* Existing Actions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Active Municipal Interventions</h4>
            {actions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No interventions created yet. Use form above to dispatch crew.</p>
            ) : (
              actions.map((act) => (
                <div key={act.action_id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-bold text-sky-600">{act.action_id}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      act.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                      act.status === 'IN_PROGRESS' ? 'bg-sky-100 text-sky-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {act.status}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{act.title}</p>
                  <div className="text-xs text-slate-500 flex justify-between">
                    <span>Team: {act.assigned_team}</span>
                    <span>Priority: {act.priority}</span>
                  </div>

                  {act.status !== 'COMPLETED' && (
                    <div className="pt-2">
                      <button
                        onClick={() => handleCompleteAction(act.action_id)}
                        className="text-xs px-3 py-1.5 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-colors"
                      >
                        Mark Action Completed & Evaluate Outcome
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Step 13 — Outcome Monitoring */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Step 13 — Outcome Monitoring</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Post-Action Impact Analysis</h3>
            <p className="text-xs text-slate-500">Compares pre- vs post-intervention complaint frequency</p>
          </div>

          {outcomes.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <Clock className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">Awaiting Intervention Completion</p>
              <p className="text-[11px] text-slate-500">
                Mark an action as completed to trigger temporal before/after comparison across observation windows.
              </p>
            </div>
          ) : (
            outcomes.map((out) => (
              <div key={out.outcome_id} className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono font-bold text-emerald-800">{out.outcome_id}</span>
                  <span className="text-slate-500">{new Date(out.monitored_at).toLocaleDateString()}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Pre-Intervention</span>
                    <span className="text-xl font-bold text-slate-900">{out.pre_action_complaint_count}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Post-Intervention</span>
                    <span className="text-xl font-bold text-emerald-600">{out.post_action_complaint_count}</span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium">
                  "{out.observation_report}"
                </div>

                <div className="text-[10px] text-slate-400 italic">
                  * {out.disclaimer}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Underlying Citizen Complaints Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Underlying Citizen Grievances ({complaints.length} Records)
            </h3>
            <p className="text-xs text-slate-500">Inspect the original citizen complaints supporting this pattern</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Street / Ward</th>
                <th className="py-3 px-4">Citizen Description</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Logged Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {complaints.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-sky-600">{c.complaint_id}</td>
                  <td className="py-3 px-4 font-medium text-slate-900">{c.street}, {c.ward}</td>
                  <td className="py-3 px-4 max-w-md italic text-slate-800">"{c.text}"</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      c.severity === 'high' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {c.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
