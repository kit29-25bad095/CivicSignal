import React, { useState } from 'react';
import { Send, MapPin, Sparkles, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import LeafletMap from '../components/LeafletMap';
import { api } from '../api/client';

const WARDS = ["Ward 12", "Ward 3", "Ward 5", "Ward 7", "Ward 8", "Ward 15"];

export default function SubmitComplaint({ onSubmitted }) {
  const [formData, setFormData] = useState({
    complaint_text: '',
    ward: 'Ward 12',
    street: '1st Main Road',
    latitude: 12.9716,
    longitude: 77.5946,
    reporter_type: 'anonymous',
    language: 'en'
  });

  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedComplaint, setSubmittedComplaint] = useState(null);
  const [error, setError] = useState(null);

  const handleTextChange = async (e) => {
    const text = e.target.value;
    setFormData(prev => ({ ...prev, complaint_text: text }));

    // Trigger debounced analysis if text length > 15
    if (text.length > 15 && text.length % 15 === 0) {
      try {
        setAnalyzing(true);
        const res = await api.analyzeText(text, `${formData.street}, ${formData.ward}`);
        setAiAnalysis(res);
      } catch (err) {
        console.error(err);
      } finally {
        setAnalyzing(false);
      }
    }
  };

  const runManualAnalysis = async () => {
    if (!formData.complaint_text.trim()) return;
    try {
      setAnalyzing(true);
      const res = await api.analyzeText(formData.complaint_text, `${formData.street}, ${formData.ward}`);
      setAiAnalysis(res);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLocationSelect = (loc) => {
    setFormData(prev => ({
      ...prev,
      latitude: parseFloat(loc.lat.toFixed(6)),
      longitude: parseFloat(loc.lon.toFixed(6))
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.complaint_text.trim()) {
      setError('Please provide a description of the civic problem.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const payload = {
        ...formData,
        category: aiAnalysis?.category,
        sub_issue: aiAnalysis?.issue,
        severity: aiAnalysis?.severity,
        department: aiAnalysis?.department
      };
      const result = await api.submitComplaint(payload);
      setSubmittedComplaint(result);
      if (onSubmitted) onSubmitted(result);
    } catch (err) {
      setError(err.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedComplaint) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-emerald-200 p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Grievance Registered Successfully</h2>
            <p className="text-sm text-slate-500 mt-1">Your complaint has entered the CivicSignal Intake & Pattern Discovery Pipeline.</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-left font-mono text-sm space-y-2">
            <div><span className="text-slate-500">Complaint ID:</span> <span className="font-bold text-sky-600">{submittedComplaint.complaint_id}</span></div>
            <div><span className="text-slate-500">Category:</span> <span className="capitalize">{submittedComplaint.category.replace('_', ' ')}</span></div>
            <div><span className="text-slate-500">Department:</span> <span>{submittedComplaint.department}</span></div>
            <div><span className="text-slate-500">Location:</span> <span>{submittedComplaint.street}, {submittedComplaint.ward}</span></div>
            <div><span className="text-slate-500">Severity Assessment:</span> <span className="uppercase text-amber-600 font-semibold">{submittedComplaint.severity}</span></div>
            <div><span className="text-slate-500">Status:</span> <span className="uppercase font-semibold">{submittedComplaint.status}</span></div>
          </div>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => {
                setSubmittedComplaint(null);
                setFormData({
                  complaint_text: '',
                  ward: 'Ward 12',
                  street: '1st Main Road',
                  latitude: 12.9716,
                  longitude: 77.5946,
                  reporter_type: 'anonymous',
                  language: 'en'
                });
                setAiAnalysis(null);
              }}
              className="px-6 py-2.5 rounded-lg bg-sky-500 text-white font-semibold hover:bg-sky-600 transition-colors"
            >
              Submit Another Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-extrabold text-slate-900">Register a Civic Complaint</h1>
        <p className="text-sm text-slate-500 mt-1">
          Our Intake Intelligence module analyzes text in real time to categorize urgency, duration, and municipal routing.
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form Column */}
        <div className="lg:col-span-7 space-y-5">
          {/* Complaint Text */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-semibold text-slate-700">Complaint Description</label>
              <button
                type="button"
                onClick={runManualAnalysis}
                className="inline-flex items-center space-x-1 text-xs text-sky-600 hover:text-sky-700 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run Intake AI</span>
              </button>
            </div>
            <textarea
              rows={4}
              required
              value={formData.complaint_text}
              onChange={handleTextChange}
              placeholder="e.g. No water has come to our street for three days and water pressure is very low..."
              className="w-full rounded-xl border border-slate-300 p-3.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:text-slate-400"
            />
            <p className="text-xs text-slate-500 mt-1">
              Sample test phrases: <i>"No water in our street"</i>, <i>"Water hasn't come for 2 days"</i>, <i>"Deep dangerous pothole near junction"</i>.
            </p>
          </div>

          {/* Ward & Street */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Ward / Zone</label>
              <select
                value={formData.ward}
                onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm bg-white focus:ring-2 focus:ring-sky-500"
              >
                {WARDS.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Street / Landmark</label>
              <input
                type="text"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                placeholder="e.g. 1st Main Road"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Interactive Geo-Pin Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-semibold text-slate-700">Geospatial Coordinates</label>
              <span className="text-xs text-slate-500 font-mono">
                Lat: {formData.latitude}, Lon: {formData.longitude}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-2">Click on the map below or drag the pin to set the exact issue location.</p>
            <LeafletMap
              center={[formData.latitude, formData.longitude]}
              zoom={15}
              interactive={true}
              selectedLocation={{ lat: formData.latitude, lon: formData.longitude }}
              onLocationSelect={handleLocationSelect}
              height="260px"
            />
          </div>

          {/* Reporter Mode */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Reporter Privacy</label>
              <select
                value={formData.reporter_type}
                onChange={(e) => setFormData({ ...formData, reporter_type: e.target.value })}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
              >
                <option value="anonymous">Anonymous Citizen (Zero PII)</option>
                <option value="verified_citizen">Verified Resident</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Language</label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="kn">Kannada</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-6 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Processing Intake...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Submit Grievance</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Real-Time Intake Intelligence Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Intake Intelligence</span>
              </div>
              {analyzing && <span className="text-xs text-slate-400 animate-pulse">Analyzing...</span>}
            </div>

            {aiAnalysis ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Identified Category:</span>
                  <span className="px-2 py-1 rounded bg-sky-950 text-sky-300 border border-sky-800 font-semibold uppercase text-xs inline-block">
                    {aiAnalysis.category.replace('_', ' ')}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Detected Sub-Issue:</span>
                  <span className="font-mono text-slate-200">{aiAnalysis.issue}</span>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Extracted Duration:</span>
                  <span className="text-slate-200 font-semibold">{aiAnalysis.duration || 'Not explicitly mentioned'}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Severity:</span>
                    <span className={`font-bold uppercase ${
                      aiAnalysis.severity === 'critical' ? 'text-rose-400' :
                      aiAnalysis.severity === 'high' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {aiAnalysis.severity}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Urgency Score:</span>
                    <span className="font-mono text-slate-200">{aiAnalysis.urgency_score.toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Assigned Municipal Dept:</span>
                  <span className="text-slate-200 font-medium">{aiAnalysis.department}</span>
                </div>

                {aiAnalysis.entities && aiAnalysis.entities.length > 0 && (
                  <div>
                    <span className="text-slate-400 block mb-0.5">Extracted Entities:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {aiAnalysis.entities.map((ent, idx) => (
                        <span key={idx} className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px]">
                          {ent}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                <Sparkles className="w-8 h-8 mx-auto text-slate-700" />
                <p>Type your complaint on the left to see live NLP entity and category extraction.</p>
              </div>
            )}
          </div>

          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 text-xs text-amber-800 space-y-1.5">
            <div className="font-bold flex items-center space-x-1.5">
              <span>Deterministic Calculation Principle</span>
            </div>
            <p>
              LLMs are used only for natural language entity extraction. All spatial bounding, rolling moving averages, cosine similarity, and clustering are computed deterministically.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
