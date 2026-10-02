import React from 'react';
import { 
  Building2, ShieldCheck, Search, Send, MapPin, 
  Sparkles, Eye, ArrowRight, CheckCircle2 
} from 'lucide-react';

export default function CitizenHome({ onNavigate }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Hero Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-8 sm:p-12 overflow-hidden shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Public Civic Intelligence Platform</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            From Individual Complaints to <span className="text-sky-400">Collective Civic Intelligence</span>
          </h1>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            CivicSignal connects citizens and municipal officers. Your individual grievance is cross-referenced
            with nearby reports using AI semantic clustering and geospatial intelligence—revealing systemic municipal issues that cannot be ignored.
          </p>
          <div className="pt-4 flex flex-wrap gap-4">
            <button
              onClick={() => onNavigate('submit_complaint')}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold shadow-lg hover:shadow-sky-500/25 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Report a Civic Issue</span>
            </button>
            <button
              onClick={() => onNavigate('tracking')}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition-all"
            >
              <Search className="w-4 h-4" />
              <span>Track Your Grievance</span>
            </button>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-12 translate-y-12">
          <Building2 className="w-96 h-96 text-white" />
        </div>
      </div>

      {/* Trust & Transparency Principles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
            1
          </div>
          <h3 className="text-lg font-bold text-slate-900">Privacy by Design</h3>
          <p className="text-sm text-slate-600">
            No personally identifiable information (PII) is mandatory to generate civic intelligence. You can report completely anonymously.
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            2
          </div>
          <h3 className="text-lg font-bold text-slate-900">Evidence Before Action</h3>
          <p className="text-sm text-slate-600">
            Our AI engine clusters similar reports across streets and time windows, backing every pattern with verifiable mathematical evidence.
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            3
          </div>
          <h3 className="text-lg font-bold text-slate-900">Human-in-the-Loop Oversight</h3>
          <p className="text-sm text-slate-600">
            AI identifies patterns, but human municipal engineers validate the findings before dispatching inspection and repair teams.
          </p>
        </div>
      </div>

      {/* Primary Active Pattern Showcase */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 mb-2">
              <Eye className="w-3.5 h-3.5" />
              <span>Active Investigation Spotlight</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Ward 12 Water Distribution Corridor</h2>
            <p className="text-sm text-slate-500 mt-1">
              43 citizen reports across 6 connected streets flagged persistent low pressure and supply interruption.
            </p>
          </div>
          <button
            onClick={() => onNavigate('patterns')}
            className="inline-flex items-center space-x-2 text-sm font-semibold text-sky-600 hover:text-sky-700"
          >
            <span>View Pattern Evidence</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 bg-slate-50 border-t border-slate-100 divide-x divide-slate-200 text-center">
          <div className="p-4">
            <span className="block text-2xl font-bold text-slate-900">43</span>
            <span className="text-xs text-slate-500">Related Complaints</span>
          </div>
          <div className="p-4">
            <span className="block text-2xl font-bold text-slate-900">6</span>
            <span className="text-xs text-slate-500">Affected Streets</span>
          </div>
          <div className="p-4">
            <span className="block text-2xl font-bold text-slate-900">10 Days</span>
            <span className="text-xs text-slate-500">Recurrence Window</span>
          </div>
          <div className="p-4">
            <span className="block text-2xl font-bold text-emerald-600">86%</span>
            <span className="text-xs text-slate-500">Pattern Strength</span>
          </div>
        </div>
      </div>
    </div>
  );
}
