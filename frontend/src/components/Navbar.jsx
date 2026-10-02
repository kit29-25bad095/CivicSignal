import React from 'react';
import { 
  Building2, ShieldCheck, UserCheck, AlertTriangle, Compass, 
  MapPin, Activity, CheckSquare, BarChart3, History, FileText
} from 'lucide-react';

export default function Navbar({ activePage, setActivePage, userRole, setUserRole }) {
  const navItems = [
    { id: 'citizen_home', label: 'Citizen Portal', icon: Building2, role: 'all' },
    { id: 'submit_complaint', label: 'Report Grievance', icon: FileText, role: 'all' },
    { id: 'tracking', label: 'Track Issue', icon: Compass, role: 'all' },
    { id: 'officer_dashboard', label: 'Officer Dashboard', icon: Activity, role: 'officer' },
    { id: 'patterns', label: 'Pattern Discovery', icon: AlertTriangle, role: 'officer' },
    { id: 'map_intelligence', label: 'Map Intelligence', icon: MapPin, role: 'officer' },
    { id: 'timeline_intelligence', label: 'Timeline Intelligence', icon: BarChart3, role: 'officer' },
    { id: 'actions', label: 'Actions & Interventions', icon: CheckSquare, role: 'officer' },
    { id: 'outcomes', label: 'Outcome Monitor', icon: ShieldCheck, role: 'officer' },
    { id: 'audit', label: 'Audit Trail', icon: History, role: 'officer' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900 text-white shadow-md border-b border-slate-800">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Tagline */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActivePage('officer_dashboard')}>
            <div className="bg-sky-500 text-white p-2 rounded-lg shadow-sm">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-white">Civic<span className="text-sky-400">Signal</span></span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">Intelligence Agent</span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">From Complaints to Collective Intelligence</p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => {
                  setUserRole('citizen');
                  if (['officer_dashboard', 'patterns', 'map_intelligence', 'timeline_intelligence', 'actions', 'outcomes', 'audit'].includes(activePage)) {
                    setActivePage('citizen_home');
                  }
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  userRole === 'citizen' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Citizen View</span>
              </button>
              <button
                onClick={() => {
                  setUserRole('officer');
                  setActivePage('officer_dashboard');
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  userRole === 'officer' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Officer Console</span>
              </button>
            </div>

            <div className="hidden md:flex items-center space-x-1.5 bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 px-2.5 py-1 rounded text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-medium">Orchestrator Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="bg-slate-950 border-t border-slate-800/70 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 py-1.5">
            {navItems
              .filter(item => item.role === 'all' || userRole === 'officer')
              .map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActivePage(item.id)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-sky-600/30 text-sky-300 border border-sky-500/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
          </nav>
        </div>
      </div>
    </header>
  );
}
