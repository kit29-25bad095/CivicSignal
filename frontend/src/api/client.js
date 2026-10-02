const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://127.0.0.1:8000/api' 
  : '/api';

export const api = {
  // Dashboard
  getDashboardSummary: async () => {
    const res = await fetch(`${BASE_URL}/dashboard/summary`);
    if (!res.ok) throw new Error('Failed to load dashboard summary');
    return res.json();
  },

  // Complaints
  getComplaints: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${BASE_URL}/complaints?${query}`);
    if (!res.ok) throw new Error('Failed to load complaints');
    return res.json();
  },

  getComplaintDetail: async (id) => {
    const res = await fetch(`${BASE_URL}/complaints/${id}`);
    if (!res.ok) throw new Error('Failed to load complaint details');
    return res.json();
  },

  submitComplaint: async (data) => {
    const res = await fetch(`${BASE_URL}/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to submit complaint');
    return res.json();
  },

  analyzeText: async (text, locationHint) => {
    const query = new URLSearchParams({ text, location_hint: locationHint || '' }).toString();
    const res = await fetch(`${BASE_URL}/complaints/analyze/text?${query}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to analyze complaint text');
    return res.json();
  },

  // Patterns
  getPatterns: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${BASE_URL}/patterns?${query}`);
    if (!res.ok) throw new Error('Failed to load patterns');
    return res.json();
  },

  getPatternDetail: async (patternId) => {
    const res = await fetch(`${BASE_URL}/patterns/${patternId}`);
    if (!res.ok) throw new Error('Failed to load pattern details');
    return res.json();
  },

  getPatternComplaints: async (patternId) => {
    const res = await fetch(`${BASE_URL}/patterns/${patternId}/complaints`);
    if (!res.ok) throw new Error('Failed to load pattern complaints');
    return res.json();
  },

  triggerDiscovery: async () => {
    const res = await fetch(`${BASE_URL}/patterns/discover`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to run pattern discovery');
    return res.json();
  },

  validatePattern: async (patternId, validationData) => {
    const res = await fetch(`${BASE_URL}/patterns/${patternId}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validationData),
    });
    if (!res.ok) throw new Error('Failed to submit validation');
    return res.json();
  },

  searchSimilarity: async (queryText) => {
    const res = await fetch(`${BASE_URL}/patterns/similarity/search?query_text=${encodeURIComponent(queryText)}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to perform similarity search');
    return res.json();
  },

  // Investigations
  getInvestigations: async (patternId) => {
    const url = patternId ? `${BASE_URL}/investigations?pattern_id=${patternId}` : `${BASE_URL}/investigations`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load investigations');
    return res.json();
  },

  updateInvestigation: async (invId, data) => {
    const res = await fetch(`${BASE_URL}/investigations/${invId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update investigation');
    return res.json();
  },

  // Actions
  getActions: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${BASE_URL}/actions?${query}`);
    if (!res.ok) throw new Error('Failed to load actions');
    return res.json();
  },

  createAction: async (actionData) => {
    const res = await fetch(`${BASE_URL}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(actionData),
    });
    if (!res.ok) throw new Error('Failed to create action');
    return res.json();
  },

  updateAction: async (actionId, updateData) => {
    const res = await fetch(`${BASE_URL}/actions/${actionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    if (!res.ok) throw new Error('Failed to update action');
    return res.json();
  },

  // Outcomes
  getOutcomes: async (patternId) => {
    const url = patternId ? `${BASE_URL}/outcomes/${patternId}` : `${BASE_URL}/outcomes`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load outcomes');
    return res.json();
  },

  evaluateOutcome: async (patternId, actionId) => {
    const url = actionId ? `${BASE_URL}/outcomes/${patternId}/evaluate?action_id=${actionId}` : `${BASE_URL}/outcomes/${patternId}/evaluate`;
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to evaluate outcome');
    return res.json();
  },

  // Audit Logs
  getAuditLogs: async (limit = 100) => {
    const res = await fetch(`${BASE_URL}/audit?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to load audit logs');
    return res.json();
  },
};
