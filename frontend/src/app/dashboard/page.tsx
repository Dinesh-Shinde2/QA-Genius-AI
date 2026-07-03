'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import Sidebar from '@/components/sidebar';
import QACopilot from '@/components/copilot';
import { 
 BarChart, 
 Bar, 
 XAxis, 
 YAxis, 
 CartesianGrid, 
 Tooltip, 
 ResponsiveContainer,
 PieChart,
 Pie,
 Cell,
 Legend
} from 'recharts';
import { 
 FolderRoot, 
 FileSpreadsheet, 
 BadgeCheck, 
 Bug, 
 TrendingUp, 
 ShieldAlert, 
 Layers,
 Sliders,
 Check,
 X
} from 'lucide-react';

const WIDGETS_CONFIG = [
  { id: 'totalProjects', label: 'Total Projects', desc: 'Active workspace projects count.', icon: FolderRoot, category: 'KPI Cards' },
  { id: 'openBugs', label: 'Open Bugs', desc: 'Current active and unresolved bug reports.', icon: FileSpreadsheet, category: 'KPI Cards' },
  { id: 'testCases', label: 'Test Cases', desc: 'Total test cases defined in repository.', icon: BadgeCheck, category: 'KPI Cards' },
  { id: 'bugsIdentified', label: 'Bugs Identified', desc: 'All defects identified in execution.', icon: Bug, category: 'KPI Cards' },
  { id: 'testExecution', label: 'Test Execution', desc: 'Current test cycle success rates.', icon: TrendingUp, category: 'KPI Cards' },
  { id: 'executionChart', label: 'Execution Summary', desc: 'Pass/Fail breakdown by module.', icon: Layers, category: 'Charts' },
  { id: 'severityChart', label: 'Bug Severity distribution', desc: 'Severity proportions pie chart.', icon: ShieldAlert, category: 'Charts' },
];


export default function Dashboard() {
 const router = useRouter();
 const { 
  token, 
  initializeAuth, 
  activeProject, 
  testCases, 
  bugs, 
  coverageMatrix, 
  projects,
  loading 
 } = useAppStore();

 const [mounted, setMounted] = useState(false);
 const [showWidgetModal, setShowWidgetModal] = useState(false);
 const [visibleWidgets, setVisibleWidgets] = useState<string[]>([
   'totalProjects', 'openBugs', 'testCases', 'bugsIdentified', 'testExecution',
   'executionChart', 'severityChart'
 ]);

 useEffect(() => {
  setMounted(true);
  initializeAuth();
  
  // Load widget configuration from localStorage
  const saved = localStorage.getItem('dashboard_widgets');
  if (saved) {
    try {
      setVisibleWidgets(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to parse saved widgets settings', e);
    }
  }
 }, [initializeAuth]);

 useEffect(() => {
  if (mounted && !token) {
   router.push('/');
  }
 }, [token, mounted, router]);

 if (!mounted || !token) return null;

 // Compute coverage score (percentage of requirements with at least 1 test case)
 const totalReqs = coverageMatrix.length;
 const coveredReqs = coverageMatrix.filter(c => c.test_case_count > 0).length;
 const coveragePercent = totalReqs > 0 ? Math.round((coveredReqs / totalReqs) * 100) : 0;

 // Chart 1: Module-wise test case distribution
 const moduleDataMap: Record<string, number> = {};
 testCases.forEach(tc => {
  moduleDataMap[tc.module] = (moduleDataMap[tc.module] || 0) + 1;
 });
 
 // Make sure template modules are shown even if 0 test cases
 coverageMatrix.forEach(item => {
  if (!(item.module in moduleDataMap)) {
   moduleDataMap[item.module] = 0;
  }
 });

 const moduleChartData = Object.keys(moduleDataMap).map(m => ({
  name: m,
  "Test Cases": moduleDataMap[m],
  "Coverage %": coverageMatrix.find(c => c.module === m)?.status === "COVERED" ? 100 : 0
 }));

 // Chart 2: Bug Severity distribution
 const severityCount: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
 bugs.forEach(bug => {
  const sev = bug.severity?.toUpperCase() || 'HIGH';
  severityCount[sev] = (severityCount[sev] || 0) + 1;
 });

 // If no bugs, add mock structure for visual representation
 const bugChartData = Object.keys(severityCount).map(k => ({
  name: k,
  value: severityCount[k] || 0
 })).filter(item => item.value > 0);

 const COLORS = {
  CRITICAL: '#DC2626', // Danger
  HIGH: '#EA580C',   // Orange/Dark-warning
  MEDIUM: '#F59E0B',  // Warning
  LOW: '#2563EB'    // Primary Brand
 };

 const statCards = [
  { id: 'totalProjects', name: 'Total Projects', value: projects.length, icon: FolderRoot, color: 'text-[#2563EB]' },
  { id: 'openBugs', name: 'Open Bugs', value: bugs.filter(b => b.status === 'OPEN').length, icon: FileSpreadsheet, color: 'text-[#F59E0B]' },
  { id: 'testCases', name: 'Test Cases', value: testCases.length, icon: BadgeCheck, color: 'text-[#2563EB]' },
  { id: 'bugsIdentified', name: 'Bugs Identified', value: bugs.length, icon: Bug, color: 'text-[#DC2626]' },
  { id: 'testExecution', name: 'Test Execution', value: '82%', icon: TrendingUp, color: 'text-[#16A34A]' },
 ];

 const activeStatCards = statCards.filter(c => visibleWidgets.includes(c.id));

 const handleToggleWidget = (id: string) => {
   const updated = visibleWidgets.includes(id)
     ? visibleWidgets.filter(w => w !== id)
     : [...visibleWidgets, id];
   setVisibleWidgets(updated);
   localStorage.setItem('dashboard_widgets', JSON.stringify(updated));
 };

 return (
  <div className="flex min-h-screen bg-[#F7F9FC]">
   <Sidebar />
   
   <div className="flex-1 min-w-0 p-4 md:p-8 flex flex-col gap-6">
    
    {/* Header Dashboard Banner */}
    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
     <div>
      <h1 className="text-2xl font-bold text-slate-900">System Analytics</h1>
      <p className="text-xs text-slate-500">
       {activeProject ? `Metrics dashboard for ${activeProject.name}` : 'Create a project to load parameters.'}
      </p>
     </div>
     <div className="flex items-center gap-3">
      {activeProject && (
       <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm text-xs text-slate-500 font-mono">
        ACTIVE STACK: {activeProject.tech_stack || 'Standard QA Framework'}
       </div>
      )}
      <button 
        onClick={() => setShowWidgetModal(true)}
        className="px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#0F172A] rounded-lg text-xs font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition flex items-center gap-1.5"
      >
        <Sliders className="w-3.5 h-3.5" />
        Configure Widgets
      </button>
     </div>
    </div>

    {/* Stats Grid */}
    {activeStatCards.length > 0 && (
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4`}>
       {activeStatCards.map((card) => {
        const Icon = card.icon;
        return (
         <div key={card.name} className="bg-white border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 rounded-2xl flex items-center justify-between transition-all duration-200">
          <div className="flex flex-col gap-1.5">
           <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{card.name}</span>
           <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{card.value}</span>
          </div>
          <div className="p-2 rounded-lg bg-[#F7F9FC] border border-[#E2E8F0] transition duration-350">
           <Icon className={`w-4 h-4 ${card.color}`} />
          </div>
         </div>
        );
       })}
      </div>
    )}

    {/* Workspace Panels split */}
    {activeProject ? (
     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Module Coverage Graph */}
      {visibleWidgets.includes('executionChart') && (
        <div className="bg-white border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 rounded-2xl flex flex-col gap-4">
         <div>
          <h3 className="text-sm font-semibold text-slate-900">Test Execution Summary</h3>
          <p className="text-[11px] text-[#64748B]">Pass / Fail / Blocked metrics across modules.</p>
         </div>
         <div className="h-64 w-full">
          {moduleChartData.length > 0 ? (
           <ResponsiveContainer width="100%" height="100%">
            <BarChart data={moduleChartData}>
             <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
             <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
             <YAxis stroke="#64748b" fontSize={11} />
             <Tooltip 
              contentStyle={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px' }}
              labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
             />
             <Bar dataKey="Test Cases" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
           </ResponsiveContainer>
          ) : (
           <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
            No data to load. Go to Requirement Analysis.
           </div>
          )}
         </div>
        </div>
      )}

      {/* Severity Distribution Pie Chart */}
      {visibleWidgets.includes('severityChart') && (
        <div className="bg-white border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 rounded-2xl flex flex-col gap-4">
         <div>
          <h3 className="text-sm font-semibold text-slate-900">Bug Severity Summary</h3>
          <p className="text-[11px] text-[#64748B]">Proportions of suggested failure vectors.</p>
         </div>
         <div className="h-64 w-full flex items-center justify-center">
          {bugChartData.length > 0 ? (
           <ResponsiveContainer width="100%" height="100%">
            <PieChart>
             <Pie
              data={bugChartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
             >
              {bugChartData.map((entry, index) => (
               <Cell 
                key={`cell-${index}`} 
                fill={COLORS[entry.name as keyof typeof COLORS] || '#2563EB'} 
               />
              ))}
             </Pie>
             <Tooltip
              contentStyle={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px' }}
             />
             <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle" 
              formatter={(value) => <span className="text-[10px] font-semibold text-slate-700">{value}</span>}
             />
            </PieChart>
           </ResponsiveContainer>
          ) : (
           <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono gap-1 text-center">
            <ShieldAlert className="w-8 h-8 text-slate-400" />
            <span>No bugs generated. <br/> Upload a requirement.</span>
           </div>
          )}
         </div>
        </div>
      )}
      
     </div>
    ) : (
     <div className="flex-1 bg-white border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-2xl flex flex-col items-center justify-center p-12 text-center gap-4 border border-dashed">
      <Layers className="w-16 h-16 text-[#64748B] animate-pulse" />
      <div>
       <h2 className="text-lg font-bold text-slate-900">No Active Projects</h2>
       <p className="text-xs text-[#64748B] max-w-sm mt-1">
        Please select an existing project from the sidebar dropdown, or create a new one to initialize the QA parameters.
       </p>
      </div>
     </div>
    )}
    
   </div>

    {/* ── Configure Widgets Modal ────────────────────────────────────────────── */}
    {showWidgetModal && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl w-full max-w-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#F7F9FC]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-blue-200 flex items-center justify-center">
                <Sliders className="w-4 h-4 text-[#2563EB]" />
              </div>
              <div>
                <h2 className="text-sm font-black text-[#0F172A]">Configure Dashboard Widgets</h2>
                <p className="text-[10px] text-[#64748B] mt-0.5">Toggle active components on System Analytics page</p>
              </div>
            </div>
            <button onClick={() => setShowWidgetModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-6 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
            
            <div className="flex flex-col gap-5">
              {['KPI Cards', 'Charts'].map(category => (
                <div key={category}>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1.5">{category}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {WIDGETS_CONFIG.filter(w => w.category === category).map(w => {
                      const isChecked = visibleWidgets.includes(w.id);
                      const Icon = w.icon;
                      return (
                        <div 
                          key={w.id} 
                          onClick={() => handleToggleWidget(w.id)}
                          className={`p-4 border rounded-xl flex items-center justify-between gap-4 cursor-pointer transition select-none group ${
                            isChecked 
                              ? 'bg-[#EFF6FF]/40 border-[#2563EB] shadow-sm' 
                              : 'bg-white border-[#E2E8F0] hover:border-slate-350 hover:bg-[#F7F9FC]'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg border shrink-0 transition ${isChecked ? 'bg-[#EFF6FF] border-[#2563EB]/30 text-[#2563EB]' : 'bg-[#F7F9FC] border-[#E2E8F0] text-slate-400'}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className={`text-xs font-bold transition ${isChecked ? 'text-slate-900' : 'text-slate-700'}`}>{w.label}</p>
                              <p className="text-[10px] text-[#64748B] mt-0.5 leading-relaxed">{w.desc}</p>
                            </div>
                          </div>
                          
                          {/* Switch Toggle */}
                          <div className={`w-8 h-4 rounded-full p-0.5 transition-colors shrink-0 ${isChecked ? 'bg-[#2563EB]' : 'bg-slate-300'}`}>
                            <div className={`w-3 h-3 rounded-full bg-white transition-transform ${isChecked ? 'translate-x-4' : 'translate-x-0'}`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
            <button onClick={() => setShowWidgetModal(false)} className="px-5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-bold transition shadow-sm">
              Done
            </button>
          </div>
        </div>
      </div>
    )}

   <QACopilot />
  </div>
 );
}
