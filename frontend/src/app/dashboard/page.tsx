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
  Layers 
} from 'lucide-react';

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

  useEffect(() => {
    setMounted(true);
    initializeAuth();
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
    CRITICAL: '#ef4444', // Red
    HIGH: '#f97316',     // Orange
    MEDIUM: '#eab308',   // Yellow
    LOW: '#3b82f6'       // Blue
  };

  const statCards = [
    { name: 'Total Projects', value: projects.length, icon: FolderRoot, color: 'text-violet-400' },
    { name: 'Requirements', value: totalReqs, icon: FileSpreadsheet, color: 'text-cyan-400' },
    { name: 'Test Cases', value: testCases.length, icon: BadgeCheck, color: 'text-emerald-400' },
    { name: 'Bugs Identified', value: bugs.length, icon: Bug, color: 'text-rose-400' },
    { name: 'Coverage Score', value: `${coveragePercent}%`, icon: TrendingUp, color: 'text-pink-400' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#08060f]">
      <Sidebar />
      
      <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
        
        {/* Header Dashboard Banner */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">System Analytics</h1>
            <p className="text-xs text-slate-400">
              {activeProject ? `Metrics dashboard for ${activeProject.name}` : 'Create a project to load parameters.'}
            </p>
          </div>
          {activeProject && (
            <div className="px-3 py-1.5 rounded-lg glass-panel text-xs text-cyan-400 font-mono">
              ACTIVE STACK: {activeProject.tech_stack || 'Standard QA Framework'}
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.name} className="glass-panel p-5 rounded-2xl flex items-center justify-between border border-slate-900 hover:border-violet-500/20 hover:shadow-lg hover:shadow-violet-500/5 group hover:-translate-y-0.5 transition-all duration-300">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{card.name}</span>
                  <span className="text-2xl font-extrabold text-white tracking-tight">{card.value}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/45 border border-slate-900 group-hover:border-slate-850 transition duration-300">
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Workspace Panels split */}
        {activeProject ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Module Coverage Graph */}
            <div className="lg:col-span-2 glass-panel p-5 rounded-xl flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Test Case Distribution by Module</h3>
                <p className="text-[11px] text-slate-400">Volume of generated validation scenarios across components.</p>
              </div>
              <div className="h-64 w-full">
                {moduleChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={moduleChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip 
                        contentStyle={{ background: '#100c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        labelStyle={{ color: 'white', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="Test Cases" fill="url(#violetGradient)" radius={[4, 4, 0, 0]} />
                      
                      {/* Gradients */}
                      <defs>
                        <linearGradient id="violetGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#5b21b6" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                    No data to load. Go to QA Package Gen.
                  </div>
                )}
              </div>
            </div>

            {/* Severity Distribution Pie Chart */}
            <div className="glass-panel p-5 rounded-xl flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Bug Severity Summary</h3>
                <p className="text-[11px] text-slate-400">Proportions of suggested failure vectors.</p>
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
                            fill={COLORS[entry.name as keyof typeof COLORS] || '#8b5cf6'} 
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#100c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="circle" 
                        formatter={(value) => <span className="text-[10px] font-semibold text-slate-300">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono gap-1 text-center">
                    <ShieldAlert className="w-8 h-8 text-slate-600" />
                    <span>No bugs generated. <br/> Upload a requirement.</span>
                  </div>
                )}
              </div>
            </div>
            
          </div>
        ) : (
          <div className="flex-1 glass-panel rounded-2xl flex flex-col items-center justify-center p-12 text-center gap-4 border border-dashed border-slate-800">
            <Layers className="w-16 h-16 text-slate-600 animate-pulse" />
            <div>
              <h2 className="text-lg font-bold text-white">No Active Projects</h2>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Please select an existing project from the sidebar dropdown, or create a new one to initialize the QA parameters.
              </p>
            </div>
          </div>
        )}
        
      </div>
      <QACopilot />
    </div>
  );
}
