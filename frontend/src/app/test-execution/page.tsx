'use client';

import Sidebar from '@/components/sidebar';
import { CheckCircle2, XCircle, AlertTriangle, Clock, PlayCircle, Bug, ChevronLeft, Calendar, Layout, MapPin, MessageSquare, Plus, Check, X, Sparkles, Loader2, FileEdit, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useRouter } from 'next/navigation';

export default function TestExecution() {
  const router = useRouter();
  const { activeProject, testCycles, testExecutions, fetchTestCycles, fetchTestExecutions, createTestCycle, updateExecutionStatus, getExecutionComments, testCases, fetchTestCases, generateAIBugFromTestCase, createEnterpriseBug } = useAppStore();
  
  // ── Create Cycle State ──────────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cycleName, setCycleName] = useState('');
  const [cycleDesc, setCycleDesc] = useState('');
  const [cycleEnv, setCycleEnv] = useState('QA');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  
  const uniqueModules = Array.from(new Set((testCases || []).map((t: any) => t.module).filter(Boolean))) as string[];
  const allModulesSelected = selectedModules.length === uniqueModules.length && uniqueModules.length > 0;

  const toggleModule = (mod: string) => {
    setSelectedModules(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);
  };

  const handleSelectAllModules = () => {
    setSelectedModules(allModulesSelected ? [] : [...uniqueModules]);
  };

  const [activeCycle, setActiveCycle] = useState<any | null>(null);

  // ── Execution State ─────────────────────────────────────────────────────────
  const [activeExec, setActiveExec] = useState<any | null>(null);
  const [execComments, setExecComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  // ── Log Bug State ───────────────────────────────────────────────────────────
  const [showLogBugModal, setShowLogBugModal] = useState(false);
  const [logBugMode, setLogBugMode] = useState<'choose' | 'ai-loading' | 'form'>('choose');
  const [bugForm, setBugForm] = useState<any>(null);
  const [bugFormSaving, setBugFormSaving] = useState(false);
  const [bugSeverityOpen, setBugSeverityOpen] = useState(false);
  const [bugPriorityOpen, setBugPriorityOpen] = useState(false);
  const [cycleEnvOpen, setCycleEnvOpen] = useState(false);

  useEffect(() => {
    if (activeProject) {
      fetchTestCycles();
      fetchTestCases();
    }
  }, [activeProject, fetchTestCycles, fetchTestCases]);

  // ── Create Cycle Handlers ───────────────────────────────────────────────────
  const handleCreateConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !cycleName) return;
    await createTestCycle({
      project_id: activeProject.id,
      name: cycleName,
      description: cycleDesc,
      environment: cycleEnv,
      status: 'PLANNING',
      target_modules: selectedModules.length > 0 ? selectedModules : undefined
    });
    setShowCreateModal(false);
    setCycleName('');
    setCycleDesc('');
    setSelectedModules([]);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setCycleName('');
    setCycleDesc('');
    setSelectedModules([]);
  };

  // ── Cycle Navigation ────────────────────────────────────────────────────────
  const openCycle = (cycle: any) => {
    if (!activeProject) return;
    setActiveCycle(cycle);
    fetchTestExecutions(cycle.id);
  };

  const closeCycle = () => {
    setActiveCycle(null);
    if (activeProject) fetchTestCycles();
  };

  // ── Execution Handlers ──────────────────────────────────────────────────────
  const openExecution = async (exec: any) => {
    setActiveExec(exec);
    const comments = await getExecutionComments(exec.execution_id);
    setExecComments(comments);
  };
  
  const handleAddComment = async () => {
    if (!newComment.trim() || !activeExec) return;
    await updateExecutionStatus(activeExec.execution_id, { status: activeExec.status, comments: newComment });
    const comments = await getExecutionComments(activeExec.execution_id);
    setExecComments(comments);
    setNewComment('');
  };

  const updateStatus = async (status: string) => {
    if (!activeExec) return;
    await updateExecutionStatus(activeExec.execution_id, { status });
    setActiveExec({ ...activeExec, status });
    if (activeCycle) fetchTestExecutions(activeCycle.id);
  };

  // ── Log Bug Handlers ────────────────────────────────────────────────────────
  const openLogBug = () => {
    setLogBugMode('choose');
    setBugForm(null);
    setShowLogBugModal(true);
  };

  const handleGenerateAIBug = async () => {
    if (!activeExec || !activeProject) return;
    setLogBugMode('ai-loading');
    const result = await generateAIBugFromTestCase({
      project_id: activeProject.id,
      test_case_id: activeExec.test_case_id,
      execution_id: activeExec.execution_id,
      title: activeExec.title || activeExec.scenario,
      module: activeExec.module,
      feature: activeExec.feature,
      scenario: activeExec.scenario,
      expected_result: activeExec.expected_result,
      priority: activeExec.priority,
    });
    setBugForm(result ? {
      ...result, linked_test_case_id: activeExec.test_case_id || ''
    } : {
      title: `Test Failure: ${activeExec.title || activeExec.scenario}`,
      module: activeExec.module || '', feature: activeExec.feature || '',
      description: '', preconditions: '', steps_to_reproduce: '',
      expected_result: activeExec.expected_result || '', actual_result: '',
      severity: 'HIGH', priority: activeExec.priority || 'P2',
      environment: 'QA', root_cause_suggestion: '', tags: ['test-failure'],
      linked_test_case_id: activeExec.test_case_id || '',
    });
    setLogBugMode('form');
  };

  const handleManualBug = () => {
    if (!activeExec) return;
    setBugForm({
      title: `Test Failure: ${activeExec.title || activeExec.scenario}`,
      module: activeExec.module || '', feature: activeExec.feature || '',
      description: '', preconditions: '', steps_to_reproduce: '',
      expected_result: activeExec.expected_result || '', actual_result: '',
      severity: 'HIGH', priority: activeExec.priority || 'P2',
      environment: 'QA', root_cause_suggestion: '', tags: ['test-failure'],
      linked_test_case_id: activeExec.test_case_id || '',
    });
    setLogBugMode('form');
  };

  const handleSubmitBug = async () => {
    if (!activeProject || !bugForm || !bugForm.title || !bugForm.steps_to_reproduce) return;
    setBugFormSaving(true);
    await createEnterpriseBug({ ...bugForm, project_id: activeProject.id });
    setShowLogBugModal(false);
    setBugForm(null);
    setBugFormSaving(false);
  };

  const BF = (key: string) => ({
    value: bugForm?.[key] ?? '',
    onChange: (e: any) => setBugForm((f: any) => ({ ...f, [key]: e.target.value }))
  });

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50 text-slate-800 placeholder-slate-400';

  const cycleModules = Array.from(new Set((testExecutions || []).map((t: any) => t.module).filter(Boolean))).sort() as string[];
  const executionsByModule = (testExecutions || []).reduce((acc: any, exec: any) => {
    const mod = exec.module || 'Unassigned';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(exec);
    return acc;
  }, {});

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 min-w-0 p-4 md:p-6 pt-16 md:pt-6 flex flex-col gap-6">
        
        {!activeCycle ? (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Test Cycles</h1>
                <p className="text-xs text-slate-500">Manage testing cycles, sprints, and release readiness.</p>
              </div>
              <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-sm">
                <Plus className="w-4 h-4" /> New Test Cycle
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(testCycles || []).map((cycle: any) => (
                <div key={cycle.id} onClick={() => openCycle(cycle)} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition cursor-pointer group flex flex-col gap-4">
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 group-hover:text-[#2563EB] transition line-clamp-1">{cycle.name}</h3>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{cycle.description || 'No description'}</p>
                    </div>
                    <span className={`px-2 py-1 text-[9px] font-black rounded uppercase border ${
                      cycle.status === 'ACTIVE' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                      cycle.status === 'COMPLETED' ? 'bg-green-50 text-green-600 border-green-200' :
                      'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {cycle.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-500">
                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded"><MapPin className="w-3 h-3" /> {cycle.environment}</span>
                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded"><Calendar className="w-3 h-3" /> {new Date(cycle.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 mt-auto">
                    <div className="flex flex-col items-center p-2 bg-slate-50 rounded-lg">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Total</span>
                      <span className="font-black text-slate-700">{cycle.total_cases || 0}</span>
                    </div>
                    <div className="flex flex-col items-center p-2 bg-green-50 rounded-lg">
                      <span className="text-[9px] font-bold text-green-600/70 uppercase">Pass</span>
                      <span className="font-black text-green-600">{cycle.passed_cases || 0}</span>
                    </div>
                    <div className="flex flex-col items-center p-2 bg-red-50 rounded-lg">
                      <span className="text-[9px] font-bold text-red-600/70 uppercase">Fail</span>
                      <span className="font-black text-red-600">{cycle.failed_cases || 0}</span>
                    </div>
                    <div className="flex flex-col items-center p-2 bg-orange-50 rounded-lg">
                      <span className="text-[9px] font-bold text-orange-600/70 uppercase">Skip</span>
                      <span className="font-black text-orange-600">{cycle.skipped_cases || 0}</span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
                    {cycle.total_cases > 0 ? (
                      <>
                        <div style={{ width: `${(cycle.passed_cases / cycle.total_cases) * 100}%` }} className="bg-green-500 h-full"></div>
                        <div style={{ width: `${(cycle.failed_cases / cycle.total_cases) * 100}%` }} className="bg-red-500 h-full"></div>
                        <div style={{ width: `${(cycle.skipped_cases / cycle.total_cases) * 100}%` }} className="bg-orange-400 h-full"></div>
                      </>
                    ) : <div className="w-full bg-slate-200"></div>}
                  </div>
                </div>
              ))}
              {(!testCycles || testCycles.length === 0) && (
                 <div className="col-span-full py-12 text-center text-slate-500 text-sm">No test cycles found. Create one to get started!</div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-6">
              <button onClick={closeCycle} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 w-fit transition">
                <ChevronLeft className="w-4 h-4" /> Back to Cycles
              </button>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-5 gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <PlayCircle className="w-7 h-7 text-[#2563EB]" />
                    {activeCycle.name}
                  </h1>
                  <p className="text-sm text-slate-500 mt-1.5">{activeCycle.description || 'No description provided'}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-600">
                  <span className="flex items-center gap-1 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full"><MapPin className="w-3 h-3 text-[#2563EB]" /> {activeCycle.environment}</span>
                  <span className="flex items-center gap-1 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full"><Calendar className="w-3 h-3 text-[#2563EB]" /> {new Date(activeCycle.created_at).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1 bg-blue-50 border border-blue-200 text-[#2563EB] px-2.5 py-1 rounded-full">
                    <Layout className="w-3 h-3" /> {Object.keys(executionsByModule).length} Modules Included
                  </span>
                </div>
              </div>

              {Object.keys(executionsByModule).length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-sm shadow-sm">
                  No executions found in this cycle. Add test cases to get started.
                </div>
              ) : (
                <div className="flex flex-col gap-8">
                  {Object.keys(executionsByModule).map((moduleName) => {
                    const moduleExecs = executionsByModule[moduleName] || [];
                    const passedCount = moduleExecs.filter((r: any) => r.status === 'PASS').length;
                    const totalCount = moduleExecs.length;
                    const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

                    return (
                      <div key={moduleName} className="flex flex-col gap-3">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-sm text-slate-800 tracking-wide uppercase">
                              Module: {moduleName}
                            </h3>
                            <span className="text-xs text-slate-500 font-medium">
                              ({totalCount} {totalCount === 1 ? 'case' : 'cases'})
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden flex shadow-inner">
                              <div style={{ width: `${passRate}%` }} className="bg-green-500 h-full"></div>
                            </div>
                            <span className="text-xs font-bold text-slate-600">
                              {passedCount}/{totalCount} Passed ({passRate}%)
                            </span>
                          </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                              <tr>
                                <th className="p-4 w-28">TC ID</th>
                                <th className="p-4 w-1/3">Title / Scenario</th>
                                <th className="p-4">Priority</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Tester</th>
                                <th className="p-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                              {moduleExecs.map((exec: any) => (
                                <tr key={exec.execution_id} className="hover:bg-slate-50/50 transition cursor-pointer" onClick={() => openExecution(exec)}>
                                  <td className="p-4 font-mono font-bold text-xs text-slate-600">{exec.custom_id}</td>
                                  <td className="p-4">
                                    <div className="font-semibold text-slate-800 line-clamp-1">{exec.title || exec.scenario}</div>
                                    {exec.feature && (
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{exec.feature}</div>
                                    )}
                                  </td>
                                  <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase ${
                                      exec.priority === 'P1' || exec.priority === 'CRITICAL' ? 'bg-rose-50 text-rose-600 border-rose-200' : 
                                      exec.priority === 'P2' || exec.priority === 'HIGH' ? 'bg-orange-50 text-orange-600 border-orange-200' : 
                                      'bg-slate-50 text-slate-600 border-slate-200'
                                    }`}>
                                      {exec.priority}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                     <span className={`px-2.5 py-1 rounded-full text-[9px] border font-bold uppercase tracking-wider flex w-fit items-center gap-1 ${
                                       exec.status === 'PASS' ? 'bg-green-50 text-green-700 border-green-200' : 
                                       exec.status === 'FAIL' ? 'bg-red-50 text-red-700 border-red-200' : 
                                       exec.status === 'SKIP' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                                       exec.status === 'BLOCKED' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                                       'bg-slate-100 text-slate-600 border-slate-200'
                                     }`}>
                                       {exec.status === 'NOT_EXECUTED' ? 'Not Run' : exec.status}
                                     </span>
                                  </td>
                                  <td className="p-4 text-xs font-semibold text-slate-500">
                                    {exec.executed_by_name || '-'}
                                  </td>
                                  <td className="p-4 text-right">
                                    <button className="px-3 py-1.5 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-white rounded transition shadow-sm">
                                      Execute
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* ── Create Cycle Modal ─────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateConfirm} className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">Create Test Cycle</h2>
              <p className="text-xs text-slate-500 mt-1">Group test cases for a specific release or sprint.</p>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Cycle Name *</label>
                <input required value={cycleName} onChange={e => setCycleName(e.target.value)} placeholder="e.g. Sprint 12 Regression" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Description</label>
                <textarea value={cycleDesc} onChange={e => setCycleDesc(e.target.value)} placeholder="Testing goals..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50 resize-none h-16" />
              </div>
              <div className="relative">
                <label className="text-xs font-bold text-slate-700 mb-1 block">Environment</label>
                <button
                  type="button"
                  onClick={() => setCycleEnvOpen(!cycleEnvOpen)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50 flex items-center justify-between text-slate-800 font-semibold hover:bg-slate-100/50 transition"
                >
                  <span>{cycleEnv}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
                {cycleEnvOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 font-semibold text-slate-700">
                    {['QA', 'STAGING', 'UAT', 'PROD'].map(env => (
                      <button
                        type="button"
                        key={env}
                        onClick={() => {
                          setCycleEnv(env);
                          setCycleEnvOpen(false);
                        }}
                        className={`w-full px-3.5 py-2 text-left text-xs hover:bg-slate-50 transition ${cycleEnv === env ? 'bg-blue-50/50 text-[#2563EB]' : ''}`}
                      >
                        {env}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Target Modules</label>
                  <button type="button" onClick={handleSelectAllModules} className="text-[10px] font-bold text-[#2563EB] hover:text-blue-700 transition">
                    {allModulesSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                {uniqueModules.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No modules found. Create test cases first.</p>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-y-auto max-h-44 divide-y divide-slate-100">
                    {uniqueModules.map(mod => {
                      const isChecked = selectedModules.includes(mod);
                      return (
                        <label key={mod} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer text-sm transition select-none ${isChecked ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition ${isChecked ? 'bg-[#2563EB] border-[#2563EB]' : 'border-slate-300 bg-white'}`}
                            onClick={() => toggleModule(mod)}
                          >
                            {isChecked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                          </div>
                          <span onClick={() => toggleModule(mod)} className={`font-medium ${isChecked ? 'text-blue-700' : 'text-slate-700'}`}>{mod}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                <p className="text-[10px] text-slate-400 mt-1.5">
                  {selectedModules.length === 0 ? 'No modules selected — all test cases will be included.' : `${selectedModules.length} module${selectedModules.length > 1 ? 's' : ''} selected`}
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button type="button" onClick={handleCloseCreateModal} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition">Cancel</button>
              <button type="submit" className="px-4 py-2 text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg transition shadow-sm">Create Cycle</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Execute Test Drawer ────────────────────────────────────────────────── */}
      {activeExec && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-[#2563EB] text-sm">{activeExec.custom_id}</span>
                <span className={`px-2.5 py-1 rounded-full text-[9px] border font-black uppercase tracking-wider flex w-fit items-center gap-1 ${
                  activeExec.status === 'PASS' ? 'bg-green-50 text-green-700 border-green-200' : 
                  activeExec.status === 'FAIL' ? 'bg-red-50 text-red-700 border-red-200' : 
                  activeExec.status === 'SKIP' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                  activeExec.status === 'BLOCKED' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                  'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {activeExec.status === 'NOT_EXECUTED' ? 'Not Run' : activeExec.status}
                </span>
              </div>
              <button onClick={() => setActiveExec(null)} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-900 rounded-full transition"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
              
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">{activeExec.title || activeExec.scenario}</h2>
                <div className="flex gap-4 text-xs font-bold text-slate-500 mb-6 border-b border-slate-100 pb-4">
                  <span>Module: <span className="text-slate-900">{activeExec.module}</span></span>
                  <span>Feature: <span className="text-slate-900">{activeExec.feature}</span></span>
                  <span>Priority: <span className="text-slate-900">{activeExec.priority}</span></span>
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Expected Result</h3>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 mb-6">
                  {activeExec.expected_result}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Record Execution</h3>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => updateStatus('PASS')} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-green-200 hover:border-green-500 hover:bg-green-50 rounded-xl text-green-700 font-bold text-sm transition">
                    <CheckCircle2 className="w-5 h-5" /> Pass
                  </button>
                  <button onClick={() => updateStatus('FAIL')} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-red-200 hover:border-red-500 hover:bg-red-50 rounded-xl text-red-700 font-bold text-sm transition">
                    <XCircle className="w-5 h-5" /> Fail
                  </button>
                  <button onClick={() => updateStatus('BLOCKED')} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-rose-200 hover:border-rose-500 hover:bg-rose-50 rounded-xl text-rose-700 font-bold text-sm transition">
                    <AlertTriangle className="w-5 h-5" /> Block
                  </button>
                  <button onClick={() => updateStatus('SKIP')} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-orange-200 hover:border-orange-500 hover:bg-orange-50 rounded-xl text-orange-700 font-bold text-sm transition">
                    <Clock className="w-5 h-5" /> Skip
                  </button>
                </div>
              </div>

              {activeExec.status === 'FAIL' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-red-600 shadow-sm"><Bug className="w-5 h-5" /></div>
                    <div>
                      <h4 className="font-bold text-red-900 text-sm">Test Failed</h4>
                      <p className="text-xs text-red-700">Log a bug for this failure to track its resolution.</p>
                    </div>
                  </div>
                  <button onClick={openLogBug} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-sm transition">
                    Log Bug
                  </button>
                </div>
              )}

              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  Execution Comments
                </h3>
                <div className="flex flex-col gap-4 mb-4">
                  {execComments.map(c => (
                    <div key={c.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-800">{c.author_name}</span>
                        <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-600">{c.content}</p>
                    </div>
                  ))}
                  {execComments.length === 0 && <p className="text-xs text-slate-500 italic">No comments on this execution yet.</p>}
                </div>
                <div className="flex gap-2">
                  <input 
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                    placeholder="Add a comment or actual result..."
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50"
                  />
                  <button onClick={handleAddComment} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg transition">Post</button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Log Bug Modal ──────────────────────────────────────────────────────── */}
      {showLogBugModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50 rounded-t-2xl flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                  <Bug className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Log Bug</h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {activeExec ? `From: ${activeExec.custom_id} — ${activeExec.title || activeExec.scenario}` : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowLogBugModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-900 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Choose Mode */}
            {logBugMode === 'choose' && (
              <div className="p-8 flex flex-col items-center gap-6">
                <p className="text-sm text-slate-500 text-center max-w-sm">
                  How would you like to create the bug report for this test failure?
                </p>
                <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                  <button
                    onClick={handleGenerateAIBug}
                    className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-[#2563EB] to-blue-600 text-white rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 group"
                  >
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-sm">Generate with AI</p>
                      <p className="text-[10px] text-blue-100 mt-0.5">Auto-fill all fields from test case context</p>
                    </div>
                  </button>
                  <button
                    onClick={handleManualBug}
                    className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl hover:border-slate-400 hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-slate-200 transition">
                      <FileEdit className="w-6 h-6 text-slate-600" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-sm">Fill Manually</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Start with basic info pre-filled</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* AI Loading */}
            {logBugMode === 'ai-loading' && (
              <div className="p-12 flex flex-col items-center gap-4">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <Loader2 className="w-7 h-7 text-[#2563EB] animate-spin" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-900">AI is analyzing the test failure...</p>
                  <p className="text-sm text-slate-500 mt-1">Generating a structured bug report from the test case context</p>
                </div>
              </div>
            )}

            {/* Bug Form */}
            {logBugMode === 'form' && bugForm && (
              <>
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                  {bugForm.root_cause_suggestion && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-semibold">
                      <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                      AI-generated — all fields are editable before submitting.
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Bug Title *</label>
                    <input {...BF('title')} className={inputCls} placeholder="Concise description of the bug" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Module</label>
                      <input {...BF('module')} className={inputCls} placeholder="e.g. Authentication" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Feature</label>
                      <input {...BF('feature')} className={inputCls} placeholder="e.g. Login Form" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Severity</label>
                      <button
                        type="button"
                        onClick={() => {
                          setBugSeverityOpen(!bugSeverityOpen);
                          setBugPriorityOpen(false);
                        }}
                        className={`${inputCls} flex items-center justify-between`}
                      >
                        <span>{bugForm.severity || 'HIGH'}</span>
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      </button>
                      {bugSeverityOpen && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 font-semibold text-slate-700">
                          {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => (
                            <button
                              type="button"
                              key={s}
                              onClick={() => {
                                setBugForm({ ...bugForm, severity: s });
                                setBugSeverityOpen(false);
                              }}
                              className={`w-full px-3.5 py-2 text-left text-xs hover:bg-slate-50 transition ${bugForm.severity === s ? 'bg-blue-50/55 text-[#2563EB]' : ''}`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Priority</label>
                      <button
                        type="button"
                        onClick={() => {
                          setBugPriorityOpen(!bugPriorityOpen);
                          setBugSeverityOpen(false);
                        }}
                        className={`${inputCls} flex items-center justify-between`}
                      >
                        <span>{bugForm.priority === 'P1' ? 'P1 — Critical' : bugForm.priority === 'P2' ? 'P2 — High' : bugForm.priority === 'P3' ? 'P3 — Medium' : bugForm.priority === 'P4' ? 'P4 — Low' : bugForm.priority || 'P2'}</span>
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      </button>
                      {bugPriorityOpen && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 font-semibold text-slate-700">
                          {[
                            { value: 'P1', label: 'P1 — Critical' },
                            { value: 'P2', label: 'P2 — High' },
                            { value: 'P3', label: 'P3 — Medium' },
                            { value: 'P4', label: 'P4 — Low' }
                          ].map(p => (
                            <button
                              type="button"
                              key={p.value}
                              onClick={() => {
                                setBugForm({ ...bugForm, priority: p.value });
                                setBugPriorityOpen(false);
                              }}
                              className={`w-full px-3.5 py-2 text-left text-xs hover:bg-slate-50 transition ${bugForm.priority === p.value ? 'bg-blue-50/55 text-[#2563EB]' : ''}`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Description</label>
                    <textarea {...BF('description')} rows={3} className={`${inputCls} resize-none`} placeholder="Full bug description..." />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Steps to Reproduce *</label>
                    <textarea {...BF('steps_to_reproduce')} rows={4} className={`${inputCls} resize-none font-mono text-xs`} placeholder={"1. Step one\n2. Step two\n3. Step three"} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Expected Result</label>
                      <textarea {...BF('expected_result')} rows={2} className={`${inputCls} resize-none`} placeholder="What should happen..." />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Actual Result</label>
                      <textarea {...BF('actual_result')} rows={2} className={`${inputCls} resize-none`} placeholder="What actually happened..." />
                    </div>
                  </div>
                  {bugForm.root_cause_suggestion && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Root Cause (AI Suggestion)</label>
                      <textarea {...BF('root_cause_suggestion')} rows={2} className={`${inputCls} resize-none`} />
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-slate-50 rounded-b-2xl flex-shrink-0">
                  <button onClick={() => setLogBugMode('choose')} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition">
                    ← Back
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => setShowLogBugModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition">Cancel</button>
                    <button
                      onClick={handleSubmitBug}
                      disabled={bugFormSaving || !bugForm.title || !bugForm.steps_to_reproduce}
                      className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition flex items-center gap-2 shadow-sm"
                    >
                      {bugFormSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bug className="w-3.5 h-3.5" />}
                      {bugFormSaving ? 'Logging...' : 'Log Bug'}
                    </button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
