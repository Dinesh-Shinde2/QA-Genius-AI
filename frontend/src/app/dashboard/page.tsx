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
  enterpriseBugs,
  coverageMatrix, 
  projects,
  loading,
  theme,
  testRuns,
  fetchTestRuns,
  fetchTestCases,
  fetchBugs,
  fetchEnterpriseBugs,
  fetchCoverageMatrix
 } = useAppStore();

 const [mounted, setMounted] = useState(false);
 const [showWidgetModal, setShowWidgetModal] = useState(false);
 const [visibleWidgets, setVisibleWidgets] = useState<string[]>([
   'totalProjects', 'openBugs', 'testCases', 'bugsIdentified', 'testExecution',
   'executionChart', 'severityChart'
 ]);

 useEffect(() => {
   if (activeProject && token) {
     fetchTestRuns(activeProject.id);
     fetchTestCases();
     fetchBugs(activeProject.id);
     fetchEnterpriseBugs(activeProject.id);
     fetchCoverageMatrix(activeProject.id);
   }
 }, [activeProject, token, fetchTestRuns, fetchTestCases, fetchBugs, fetchEnterpriseBugs, fetchCoverageMatrix]);

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

  // Calculate live test execution success rate
  let totalExecuted = 0;
  let totalPassed = 0;
  testRuns.forEach(run => {
    totalExecuted += Number(run.executed_cases || 0);
    totalPassed += Number(run.passed_cases || 0);
  });
  const executionSuccessRate = totalExecuted > 0 ? `${Math.round((totalPassed / totalExecuted) * 100)}%` : '0%';

  // Chart 1: Module-wise test case distribution & Bug count
  const moduleDataMap: Record<string, number> = {};
  const moduleBugMap: Record<string, number> = {};

  testCases.forEach(tc => {
    moduleDataMap[tc.module] = (moduleDataMap[tc.module] || 0) + 1;
  });
  
  enterpriseBugs.forEach(bug => {
    if (bug.module) {
      moduleBugMap[bug.module] = (moduleBugMap[bug.module] || 0) + 1;
    }
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
    "Bugs": moduleBugMap[m] || 0
  }));

 // Chart 2: Bug Severity distribution
 const severityCount: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  enterpriseBugs.forEach(bug => {
   const sev = bug.severity?.toUpperCase() || 'HIGH';
   severityCount[sev] = (severityCount[sev] || 0) + 1;
  });

 // If no bugs, add mock structure for visual representation
 const bugChartData = Object.keys(severityCount).map(k => ({
  name: k,
  value: severityCount[k] || 0
 })).filter(item => item.value > 0);

  // Dynamic Chart styling based on theme
  let barColor = "#ffffff";
  let chartGridColor = "rgba(255,255,255,0.02)";
  let chartStrokeColor = "#52525b";
  let tooltipBg = "#09090b";
  let tooltipBorder = "#27272a";
  let tooltipTextColor = "#ffffff";

  let COLORS = {
   CRITICAL: '#FFFFFF', // Pure White
   HIGH: '#E4E4E7',   // Zinc-200
   MEDIUM: '#A1A1AA',  // Zinc-400
   LOW: '#52525B'    // Zinc-600
  };

  if (theme === 'slate-dark') {
    barColor = "#3b82f6";
    chartGridColor = "rgba(255,255,255,0.04)";
    chartStrokeColor = "#94a3b8";
    tooltipBg = "#1e293b";
    tooltipBorder = "#334155";
    tooltipTextColor = "#f8fafc";
    COLORS = {
      CRITICAL: '#ef4444',
      HIGH: '#f97316',
      MEDIUM: '#eab308',
      LOW: '#3b82f6'
    };
  } else if (theme === 'cyberpunk') {
    barColor = "#ff00ff";
    chartGridColor = "rgba(255,0,255,0.08)";
    chartStrokeColor = "#00ffff";
    tooltipBg = "#16002c";
    tooltipBorder = "#ff00ff";
    tooltipTextColor = "#00ffff";
    COLORS = {
      CRITICAL: '#ff00ff',
      HIGH: '#00ffff',
      MEDIUM: '#00ff00',
      LOW: '#9d00ff'
    };
  } else if (theme === 'light-minimal') {
    barColor = "#2563eb";
    chartGridColor = "rgba(0,0,0,0.04)";
    chartStrokeColor = "#78716c";
    tooltipBg = "#ffffff";
    tooltipBorder = "#e7e5e4";
    tooltipTextColor = "#1c1917";
    COLORS = {
      CRITICAL: '#dc2626',
      HIGH: '#ea580c',
      MEDIUM: '#eab308',
      LOW: '#2563eb'
    };
  }

  const statCards = [
   { id: 'totalProjects', name: 'Total Projects', value: projects.length, icon: FolderRoot, color: 'text-foreground' },
   { id: 'openBugs', name: 'Open Bugs', value: enterpriseBugs.filter(b => b.status !== 'RESOLVED' && b.status !== 'CLOSED').length, icon: FileSpreadsheet, color: 'text-foreground' },
   { id: 'testCases', name: 'Test Cases', value: testCases.length, icon: BadgeCheck, color: 'text-foreground' },
   { id: 'bugsIdentified', name: 'Bugs Identified', value: enterpriseBugs.length, icon: Bug, color: 'text-foreground' },
   { id: 'testExecution', name: 'Test Execution Success', value: executionSuccessRate, icon: TrendingUp, color: 'text-foreground' },
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
   <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
    <Sidebar />
    
    <div className="flex-1 min-w-0 p-5 md:p-8 flex flex-col gap-6">
     
     {/* Header Dashboard Banner */}
     <div className="flex items-center justify-between border-b border-border-card pb-5">
      <div>
       <h1 className="text-2xl font-black text-foreground tracking-tight">System Analytics</h1>
       <p className="text-xs text-foreground opacity-80 mt-1">
        {activeProject ? `Metrics dashboard for ${activeProject.name}` : 'Create a project to load parameters.'}
       </p>
      </div>
      <div className="flex items-center gap-3">
       {activeProject && (
        <div className="px-3.5 py-1.5 rounded-lg bg-card border border-border-card text-xs text-foreground opacity-85 font-mono tracking-wider">
         ACTIVE STACK: {activeProject.tech_stack || 'Standard QA Framework'}
        </div>
       )}
       <button 
         onClick={() => setShowWidgetModal(true)}
         className="px-4 py-2 bg-card border border-border-card hover:bg-foreground/5 text-foreground rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-md active:scale-98 cursor-pointer"
       >
         <Sliders className="w-3.5 h-3.5" />
         Configure Widgets
       </button>
      </div>
     </div>

     {/* Stats Grid */}
     {activeStatCards.length > 0 && (
       <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {activeStatCards.map((card) => {
         const Icon = card.icon;
         return (
          <div key={card.name} className="bg-card border border-border-card p-5 rounded-2xl flex items-center justify-between transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/35 hover:shadow-xl group">
           <div className="flex flex-col gap-2">
            <span className="text-[9px] text-foreground opacity-70 font-bold uppercase tracking-widest">{card.name}</span>
            <span className="text-2xl font-black text-foreground tracking-tight leading-none">{card.value}</span>
           </div>
           <div className="p-2.5 rounded-xl bg-background border border-border-card group-hover:border-foreground/20 transition duration-300">
            <Icon className={`w-4 h-4 ${card.color} group-hover:scale-105 transition-transform duration-300`} />
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
         <div className="bg-card border border-border-card p-5 rounded-2xl flex flex-col gap-5 hover:border-foreground/20 transition duration-300 shadow-md">
          <div>
           <h3 className="text-sm font-bold text-foreground tracking-tight">Test Execution Summary</h3>
           <p className="text-[10px] text-foreground opacity-70 mt-0.5 leading-relaxed">Pass / Fail / Blocked metrics across modules.</p>
          </div>
          <div className="h-64 w-full">
           {moduleChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
             <BarChart data={moduleChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis dataKey="name" stroke={chartStrokeColor} fontSize={10} />
              <YAxis stroke={chartStrokeColor} fontSize={10} />
              <Tooltip 
               contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '12px', color: tooltipTextColor }}
               labelStyle={{ color: tooltipTextColor, fontWeight: 'bold' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" formatter={(value) => <span className="text-[10px] font-bold text-foreground opacity-80">{value}</span>} />
              <Bar dataKey="Test Cases" fill={barColor} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Bugs" fill="#f43f5e" radius={[4, 4, 0, 0]} />
             </BarChart>
            </ResponsiveContainer>
           ) : (
            <div className="h-full flex items-center justify-center text-foreground opacity-70 text-xs font-mono">
             No data to load. Go to Requirement Analysis.
            </div>
           )}
          </div>
         </div>
       )}

       {/* Severity Distribution Pie Chart */}
       {visibleWidgets.includes('severityChart') && (
         <div className="bg-card border border-border-card p-5 rounded-2xl flex flex-col gap-5 hover:border-foreground/20 transition duration-300 shadow-md">
          <div>
           <h3 className="text-sm font-bold text-foreground tracking-tight">Bug Severity Summary</h3>
           <p className="text-[10px] text-foreground opacity-70 mt-0.5 leading-relaxed">Proportions of suggested failure vectors.</p>
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
                 fill={COLORS[entry.name as keyof typeof COLORS] || barColor} 
                />
               ))}
              </Pie>
              <Tooltip
               contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '12px', color: tooltipTextColor }}
              />
              <Legend 
               verticalAlign="bottom" 
               height={36} 
               iconType="circle" 
               formatter={(value) => <span className="text-[10px] font-bold text-foreground opacity-80">{value}</span>}
              />
             </PieChart>
            </ResponsiveContainer>
           ) : (
            <div className="h-full flex flex-col items-center justify-center text-foreground opacity-70 text-xs font-mono gap-2.5 text-center">
             <ShieldAlert className="w-8 h-8 text-foreground opacity-40" />
             <span>No bugs generated. <br/> Upload a requirement.</span>
            </div>
           )}
          </div>
         </div>
       )}
       
      </div>
     ) : (
      <div className="flex-1 bg-card border border-border-card border-dashed rounded-2xl flex flex-col items-center justify-center p-12 text-center gap-4">
       <Layers className="w-12 h-12 text-foreground opacity-40 animate-pulse" />
       <div>
        <h2 className="text-base font-bold text-foreground tracking-tight">No Active Projects</h2>
        <p className="text-xs text-foreground opacity-70 max-w-sm mt-1 leading-relaxed">
         Please select an existing project from the sidebar dropdown, or create a new one to initialize the QA parameters.
        </p>
       </div>
      </div>
     )}
     
    </div>

     {/* ── Configure Widgets Modal ────────────────────────────────────────────── */}
     {showWidgetModal && (
       <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
         <div className="bg-card border border-border-card rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
           <div className="flex items-center justify-between px-6 py-4 border-b border-border-card bg-foreground/5">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-background border border-border-card flex items-center justify-center">
                 <Sliders className="w-4 h-4 text-foreground" />
               </div>
               <div>
                 <h2 className="text-sm font-black text-foreground">Configure Dashboard Widgets</h2>
                 <p className="text-[10px] text-foreground opacity-70 mt-0.5">Toggle active components on System Analytics page</p>
               </div>
             </div>
             <button onClick={() => setShowWidgetModal(false)} className="p-2 text-foreground opacity-70 hover:text-foreground rounded-full transition cursor-pointer"><X className="w-5 h-5" /></button>
           </div>
           <div className="p-6 flex flex-col gap-6 max-h-[70vh] overflow-y-auto scrollbar-thin">
             
             <div className="flex flex-col gap-6">
               {['KPI Cards', 'Charts'].map(category => (
                 <div key={category} className="flex flex-col gap-3">
                   <h3 className="text-[9px] font-bold text-foreground opacity-70 uppercase tracking-widest border-b border-border-card pb-2">{category}</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {WIDGETS_CONFIG.filter(w => w.category === category).map(w => {
                      const isChecked = visibleWidgets.includes(w.id);
                      const Icon = w.icon;
                      return (
                        <div 
                          key={w.id} 
                          onClick={() => handleToggleWidget(w.id)}
                          className={`p-4 border rounded-xl flex items-center justify-between gap-4 cursor-pointer transition select-none group ${
                            isChecked 
                              ? 'bg-foreground/5 border-foreground shadow-sm' 
                              : 'bg-background border-border-card hover:border-foreground/20 hover:bg-foreground/5'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2.5 rounded-lg border shrink-0 transition ${isChecked ? 'bg-foreground border-foreground text-background' : 'bg-background border-border-card text-foreground opacity-70 group-hover:text-foreground/80'}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className={`text-xs font-bold transition ${isChecked ? 'text-foreground' : 'text-foreground/80'}`}>{w.label}</p>
                              <p className="text-[10px] text-foreground opacity-70 mt-1 leading-relaxed">{w.desc}</p>
                            </div>
                          </div>
                          
                          {/* Switch Toggle */}
                          <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors shrink-0 ${isChecked ? 'bg-foreground' : 'bg-foreground/20'}`}>
                            <div className={`w-3.5 h-3.5 rounded-full transition-transform ${isChecked ? 'translate-x-3.5 bg-background' : 'translate-x-0 bg-foreground/45'}`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                 </div>
               ))}
             </div>
           </div>
           <div className="p-4 border-t border-border-card bg-foreground/5 flex justify-end">
             <button onClick={() => setShowWidgetModal(false)} className="px-5 py-2 bg-foreground hover:bg-foreground/90 text-background rounded-lg text-xs font-bold transition shadow-md active:scale-98 cursor-pointer">
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
