import React from 'react';
import { ShieldAlert, CheckCircle2, Clock, HelpCircle, Layers } from 'lucide-react';

export function EvidenceScoreBadge({ score = 0.85, requiresValidation = true }) {
  const percent = Math.round(score * 100);
  
  let colorClass = 'bg-sky-50 text-sky-700 border-sky-200';
  let rating = 'Developing Signal';
  if (score >= 0.80) {
    colorClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    rating = 'Strong Evidence Pattern';
  } else if (score >= 0.65) {
    colorClass = 'bg-sky-50 text-sky-700 border-sky-200';
    rating = 'Moderate Pattern';
  }

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold border ${colorClass}`}>
      <Layers className="w-3.5 h-3.5" />
      <span>Pattern Strength: {score.toFixed(2)} ({percent}%)</span>
      <span className="text-slate-400">&bull;</span>
      <span>{rating}</span>
    </div>
  );
}

export function PatternStatusBadge({ status = 'PENDING_REVIEW' }) {
  const map = {
    PENDING_REVIEW: {
      label: 'Pending Human Validation',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Clock
    },
    VALIDATED: {
      label: 'Officer Validated',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2
    },
    REJECTED: {
      label: 'Officer Rejected',
      color: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: ShieldAlert
    },
    NEEDS_INVESTIGATION: {
      label: 'Investigation Requested',
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: HelpCircle
    }
  };

  const current = map[status] || map.PENDING_REVIEW;
  const Icon = current.icon;

  return (
    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${current.color}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{current.label}</span>
    </span>
  );
}
