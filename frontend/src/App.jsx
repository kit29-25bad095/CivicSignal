import React, { useState } from 'react';
import Navbar from './components/Navbar';
import CitizenHome from './pages/CitizenHome';
import SubmitComplaint from './pages/SubmitComplaint';
import ComplaintTracking from './pages/ComplaintTracking';
import OfficerDashboard from './pages/OfficerDashboard';
import PatternDiscovery from './pages/PatternDiscovery';
import PatternDetail from './pages/PatternDetail';
import MapIntelligence from './pages/MapIntelligence';
import TimelineIntelligence from './pages/TimelineIntelligence';
import ActionTracking from './pages/ActionTracking';
import OutcomeMonitoring from './pages/OutcomeMonitoring';
import AuditLog from './pages/AuditLog';

export default function App() {
  const [activePage, setActivePage] = useState('officer_dashboard');
  const [selectedPatternId, setSelectedPatternId] = useState('PAT-001');
  const [userRole, setUserRole] = useState('officer'); // 'officer' or 'citizen'

  const handleSelectPattern = (patternId) => {
    setSelectedPatternId(patternId);
    setActivePage('pattern_detail');
  };

  const renderContent = () => {
    switch (activePage) {
      case 'citizen_home':
        return <CitizenHome onNavigate={setActivePage} />;
      case 'submit_complaint':
        return <SubmitComplaint onSubmitted={() => setActivePage('tracking')} />;
      case 'tracking':
        return <ComplaintTracking onSelectPattern={handleSelectPattern} />;
      case 'officer_dashboard':
        return (
          <OfficerDashboard
            onNavigate={setActivePage}
            onSelectPattern={handleSelectPattern}
          />
        );
      case 'patterns':
        return <PatternDiscovery onSelectPattern={handleSelectPattern} />;
      case 'pattern_detail':
        return (
          <PatternDetail
            patternId={selectedPatternId}
            onBack={() => setActivePage('patterns')}
            onNavigateAction={() => setActivePage('actions')}
          />
        );
      case 'map_intelligence':
        return <MapIntelligence onSelectPattern={handleSelectPattern} />;
      case 'timeline_intelligence':
        return <TimelineIntelligence />;
      case 'actions':
        return (
          <ActionTracking
            onSelectPattern={handleSelectPattern}
            onNavigateOutcomes={() => setActivePage('outcomes')}
          />
        );
      case 'outcomes':
        return <OutcomeMonitoring onSelectPattern={handleSelectPattern} />;
      case 'audit':
        return <AuditLog />;
      default:
        return (
          <OfficerDashboard
            onNavigate={setActivePage}
            onSelectPattern={handleSelectPattern}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar
        activePage={activePage}
        setActivePage={setActivePage}
        userRole={userRole}
        setUserRole={setUserRole}
      />

      <main className="flex-1">
        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-white">CivicSignal</span>
            <span>&bull;</span>
            <span>From Complaints to Collective Intelligence</span>
          </div>
          <div className="flex items-center space-x-4 text-slate-400">
            <span>Human-in-the-Loop AI</span>
            <span>&bull;</span>
            <span>DBSCAN + SentenceTransformers</span>
            <span>&bull;</span>
            <span>Ethical Non-Causal Standard</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
