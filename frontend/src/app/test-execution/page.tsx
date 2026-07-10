'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import Copilot from '@/components/copilot';
import { useAppStore } from '@/store/useAppStore';
import {
  PlayCircle, CheckCircle, XCircle, AlertTriangle, ChevronLeft,
  Plus, X, Check, ArrowRight, Bug, Clock, User, Layers,
  ExternalLink, Loader2, ClipboardList, Info
} from 'lucide-react';

const SEVERITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH'];

export default function TestExecutionPage() {
  const router = useRouter();
  const {
    token, activeProject, projects, setActiveProject,
    testRuns, fetchTestRuns, startTestRun, activeTestRun,
    fetchTestRunDetails, logTestCaseResult, completeTestRun,
    createEnterpriseBug
  } = useAppStore();

  // Navigation / UI View States
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRunName, setNewRunName] = useState('');
  
  // Bug creation state (Auto-Bug Flow)
  const [showBugModal, setShowBugModal] = useState(false);
  const [bugTitle, setBugTitle] = useState('');
  const [bugSeverity, setBugSeverity] = useState('HIGH');
  const [bugPriority, setBugPriority] = useState('HIGH');
  const [bugEnvironment, setBugEnvironment] = useState('QA');
  const [bugBuildVersion, setBugBuildVersion] = useState('1.0.0');

  // Runner input states
  const [actualResult, setActualResult] = useState('');
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [submittingResult, setSubmittingResult] = useState(false);

  // Load runs on mount or active project change
  useEffect(() => {
    if (!token) {
      router.push('/');
      return;
    }
    if (activeProject) {
      fetchTestRuns(activeProject.id);
    }
  }, [token, activeProject, fetchTestRuns, router]);

  // Load specific run details when a run is selected
  useEffect(() => {
    if (activeRunId) {
      setLoading(true);
      fetchTestRunDetails(activeRunId).then((data) => {
        setLoading(false);
        if (data && data.results && data.results.length > 0) {
          setSelectedCaseId(data.results[0].id);
        }
      });
    } else {
      setSelectedCaseId(null);
    }
  }, [activeRunId, fetchTestRunDetails]);

  // Reset checkboxes when selected test case changes
  useEffect(() => {
    setCheckedSteps({});
    setActualResult('');
  }, [selectedCaseId]);

  const selectedCase = activeTestRun?.results?.find((c: any) => c.id === selectedCaseId);

  const handleStartRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRunName.trim() || !activeProject) return;

    setLoading(true);
    const runId = await startTestRun(activeProject.id, newRunName.trim());
    setLoading(false);

    if (runId) {
      setNewRunName('');
      setShowCreateModal(false);
      setActiveRunId(runId);
    }
  };

  const handleLogResult = async (status: 'PASSED' | 'FAILED' | 'BLOCKED', linkedBugId?: string) => {
    if (!activeRunId || !selectedCaseId) return;

    setSubmittingResult(true);
    const success = await logTestCaseResult(
      activeRunId,
      selectedCaseId,
      status,
      actualResult.trim() || undefined,
      linkedBugId
    );
    setSubmittingResult(false);

    if (success) {
      // Find the index of the current case to auto-advance
      const currentIndex = activeTestRun.results.findIndex((c: any) => c.id === selectedCaseId);
      if (currentIndex !== -1 && currentIndex < activeTestRun.results.length - 1) {
        setSelectedCaseId(activeTestRun.results[currentIndex + 1].id);
      }
    }
  };

  const handleFailClick = () => {
    if (!selectedCase) return;
    
    // Prefill bug details
    setBugTitle(`[BUG] - Failed: ${selectedCase.title || selectedCase.scenario || 'Test Case'}`);
    setBugSeverity('HIGH');
    setBugPriority('HIGH');
    setBugEnvironment('QA');
    setBugBuildVersion('1.0.0');
    setShowBugModal(true);
  };

  const handleCreateBugAndFail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !activeProject) return;

    setSubmittingResult(true);
    const bugData = {
      project_id: activeProject.id,
      title: bugTitle.trim(),
      module: selectedCase.module || 'General',
      feature: selectedCase.feature || 'General',
      description: `Manual test case run failed during execution run.\n\nScenario: ${selectedCase.scenario}`,
      preconditions: selectedCase.preconditions || '',
      steps_to_reproduce: selectedCase.steps || '',
      expected_result: selectedCase.expected_result || '',
      actual_result: actualResult.trim() || 'Test case step failure observed.',
      severity: bugSeverity,
      priority: bugPriority,
      environment: bugEnvironment,
      build_version: bugBuildVersion,
      linked_test_case_id: selectedCase.id,
      linked_requirement_id: selectedCase.requirement_id
    };

    const createdBug = await createEnterpriseBug(bugData);
    if (createdBug) {
      // Log test case run result with the created bug's id
      await logTestCaseResult(
        activeRunId!,
        selectedCase.id,
        'FAILED',
        actualResult.trim() || 'Observed mismatch against expected results.',
        createdBug.id
      );
      setShowBugModal(false);
    }
    setSubmittingResult(false);
  };

  const handleCompleteRun = async () => {
    if (!activeRunId) return;
    if (!confirm('Are you sure you want to complete this execution run? No more results can be logged.')) return;

    setLoading(true);
    await completeTestRun(activeRunId);
    setLoading(false);
  };

  // Helper step parser
  const getStepsArray = (stepsText: string): string[] => {
    if (!stepsText) return [];
    return stepsText
      .split('\n')
      .map(s => s.replace(/^\d+[\.\-\s]*/, '').trim())
      .filter(Boolean);
  };

  return (
    <div className="flex h-screen bg-[#0d1117] text-[#c9d1d9] overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="border-b border-[#30363d] px-6 py-4 flex items-center justify-between bg-[#161b22] shrink-0">
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-blue-500" />
              Live Test Runner
            </h1>
            <p className="text-xs text-[#8b949e]">Execute your manual tests, record actual results, and auto-report bugs.</p>
          </div>

          {activeProject && !activeRunId && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-blue-900/10"
            >
              <Plus className="w-4 h-4" />
              New Test Run
            </button>
          )}

          {activeRunId && activeTestRun && activeTestRun.status === 'IN_PROGRESS' && (
            <button
              onClick={handleCompleteRun}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-emerald-900/10"
            >
              <Check className="w-4 h-4" />
              Complete Run
            </button>
          )}
        </header>

        {/* MAIN BODY AREA */}
        <div className="flex-1 overflow-hidden relative">
          {!activeProject ? (
            /* No Project State */
            <div className="p-12 max-w-xl mx-auto mt-12 bg-[#161b22] border border-[#30363d] rounded-2xl text-center flex flex-col items-center justify-center gap-4 shadow-xl">
              <div className="w-16 h-16 bg-blue-950/40 border border-blue-500/30 text-blue-400 rounded-full flex items-center justify-center mb-2">
                <PlayCircle className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-base font-black text-white">No Active Project Selected</h2>
                <p className="text-xs text-[#8b949e] mt-1.5">
                  Choose a project from the selector below to view test runs or start executing tests.
                </p>
              </div>
              <div className="w-full max-w-xs mt-2">
                <select
                  value=""
                  onChange={(e) => {
                    const proj = (projects as any[]).find((p: any) => p.id === e.target.value);
                    if (proj) setActiveProject(proj);
                  }}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-xs text-[#c9d1d9] focus:outline-none focus:border-blue-500"
                >
                  <option value="" disabled>Choose a project...</option>
                  {(projects as any[]).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : !activeRunId ? (
            /* 1. RUN LIST VIEW */
            <div className="p-6 overflow-y-auto h-full max-w-6xl mx-auto w-full">
              {loading ? (
                <div className="flex items-center justify-center h-64 text-xs text-[#8b949e]">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
                  Loading test runs...
                </div>
              ) : testRuns.length === 0 ? (
                <div className="p-12 border border-dashed border-[#30363d] rounded-2xl text-center flex flex-col items-center justify-center gap-3">
                  <ClipboardList className="w-10 h-10 text-[#8b949e]" />
                  <p className="text-sm font-bold text-white">No Test Runs Executed Yet</p>
                  <p className="text-xs text-[#8b949e] max-w-sm">Create a new test run to start checking your test cases and logging quality assurance reports.</p>
                  <button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg mt-1 transition active:scale-95">
                    Start Your First Run
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {testRuns.map((run) => {
                    const total = run.stats.total || 0;
                    const executed = run.stats.executed || 0;
                    const passed = run.stats.passed || 0;
                    const failed = run.stats.failed || 0;
                    const percent = total > 0 ? Math.round((executed / total) * 100) : 0;
                    
                    return (
                      <div
                        key={run.id}
                        onClick={() => setActiveRunId(run.id)}
                        className="bg-[#161b22] border border-[#30363d] hover:border-blue-500/50 rounded-2xl p-5 shadow-lg hover:shadow-xl transition duration-200 cursor-pointer flex flex-col justify-between h-48"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${run.status === 'COMPLETED' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-blue-400 bg-blue-500/10 border-blue-500/20'}`}>
                              {run.status}
                            </span>
                            <span className="text-[10px] text-[#8b949e]">{new Date(run.created_at).toLocaleDateString()}</span>
                          </div>
                          <h3 className="text-sm font-black text-white line-clamp-1">{run.name}</h3>
                          <div className="text-[10px] text-[#8b949e] flex items-center gap-1 mt-1">
                            <User className="w-3.5 h-3.5" />
                            {run.tester_name}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[10px] text-[#8b949e]">
                            <span>Progress ({percent}%)</span>
                            <span>{executed}/{total} Executed</span>
                          </div>
                          <div className="w-full h-2 bg-[#0d1117] border border-[#30363d] rounded-full overflow-hidden flex">
                            <div className="h-full bg-emerald-500" style={{ width: `${total > 0 ? (passed / total) * 100 : 0}%` }} title={`Passed: ${passed}`} />
                            <div className="h-full bg-rose-500" style={{ width: `${total > 0 ? (failed / total) * 100 : 0}%` }} title={`Failed: ${failed}`} />
                            <div className="h-full bg-orange-400" style={{ width: `${total > 0 ? ((executed - passed - failed) / total) * 100 : 0}%` }} title="Blocked/Other" />
                          </div>
                          <div className="flex items-center justify-between text-[9px] font-bold">
                            <span className="text-emerald-400">Passed: {passed}</span>
                            <span className="text-rose-400">Failed: {failed}</span>
                            <span className="text-[#8b949e]">Unexecuted: {total - executed}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* 2. ACTIVE RUNNER VIEW (Split Screen Workspace) */
            <div className="flex h-full overflow-hidden">
              {/* LEFT PANE: Case List */}
              <div className="w-80 border-r border-[#30363d] bg-[#161b22] flex flex-col shrink-0">
                <div className="p-3 border-b border-[#30363d] flex items-center gap-2">
                  <button
                    onClick={() => setActiveRunId(null)}
                    className="p-1.5 hover:bg-[#30363d] rounded-lg text-[#8b949e] hover:text-white transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-white line-clamp-1">{activeTestRun?.name}</h3>
                    <p className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider">{activeTestRun?.status}</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {loading ? (
                    <div className="text-center text-xs text-[#8b949e] py-8">Loading...</div>
                  ) : activeTestRun?.results?.length === 0 ? (
                    <div className="text-center text-xs text-[#8b949e] py-8">No test cases found in this project.</div>
                  ) : (
                    activeTestRun?.results?.map((c: any) => {
                      const isSelected = c.id === selectedCaseId;
                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedCaseId(c.id)}
                          className={`p-3 rounded-xl border transition cursor-pointer flex items-center gap-3 ${isSelected ? 'bg-blue-950/20 border-blue-500 text-white' : 'bg-[#0d1117]/40 border-[#30363d] hover:border-[#8b949e]/50'}`}
                        >
                          <div className="shrink-0">
                            {c.status === 'PASSED' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                            {c.status === 'FAILED' && <XCircle className="w-4 h-4 text-rose-500" />}
                            {c.status === 'BLOCKED' && <AlertTriangle className="w-4 h-4 text-orange-400" />}
                            {c.status === 'UNEXECUTED' && <Clock className="w-4 h-4 text-[#8b949e]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[9px] font-bold text-blue-500">{c.custom_id}</span>
                              <span className="text-[9px] text-[#8b949e] uppercase tracking-wider font-extrabold">{c.priority}</span>
                            </div>
                            <h4 className="text-xs font-semibold line-clamp-2">{c.title || c.scenario}</h4>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT PANE: Case Details & Runner Actions */}
              <div className="flex-1 flex flex-col bg-[#0d1117] overflow-hidden">
                {selectedCase ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Test Case Header info */}
                    <div className="p-5 border-b border-[#30363d] bg-[#161b22] shrink-0">
                      <div className="flex items-center gap-2 text-[10px] text-[#8b949e] uppercase font-bold tracking-wider mb-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-500" />
                        <span>{selectedCase.module || 'Core Module'}</span>
                        <span>•</span>
                        <span>{selectedCase.feature || 'General Feature'}</span>
                      </div>
                      <h2 className="text-base font-black text-white">{selectedCase.custom_id}: {selectedCase.title || selectedCase.scenario}</h2>
                    </div>

                    {/* Test Case Details Workspace */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                      {/* Scenario Summary */}
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-[#8b949e] tracking-wider block mb-1.5">Scenario / Objective</span>
                        <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-xl text-xs text-[#c9d1d9] leading-relaxed">
                          {selectedCase.scenario}
                        </div>
                      </div>

                      {/* Preconditions */}
                      {selectedCase.preconditions && (
                        <div>
                          <span className="text-[10px] font-extrabold uppercase text-[#8b949e] tracking-wider block mb-1.5">Preconditions</span>
                          <div className="bg-amber-950/10 border border-amber-500/20 p-3 rounded-xl text-xs text-amber-200/90 leading-relaxed flex items-start gap-2">
                            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <span>{selectedCase.preconditions}</span>
                          </div>
                        </div>
                      )}

                      {/* Steps Checklist */}
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-[#8b949e] tracking-wider block mb-1.5">Execution Steps</span>
                        <div className="space-y-2">
                          {getStepsArray(selectedCase.steps).map((step, idx) => {
                            const isChecked = checkedSteps[idx] || false;
                            return (
                              <div
                                key={idx}
                                onClick={() => setCheckedSteps(prev => ({ ...prev, [idx]: !isChecked }))}
                                className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${isChecked ? 'bg-[#30363d]/15 border-blue-500/40 text-[#8b949e]' : 'bg-[#161b22] border-[#30363d] hover:border-[#8b949e]/30'}`}
                              >
                                <div className="mt-0.5 shrink-0">
                                  <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition ${isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-[#30363d] bg-[#0d1117]'}`}>
                                    {isChecked && <Check className="w-3 h-3" />}
                                  </div>
                                </div>
                                <div className="text-xs leading-relaxed">
                                  <span className="font-extrabold text-blue-500 mr-1.5">{idx + 1}.</span>
                                  {step}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Expected Result */}
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-[#8b949e] tracking-wider block mb-1.5">Expected Result</span>
                        <div className="bg-blue-950/10 border border-blue-500/20 p-3 rounded-xl text-xs text-blue-200/90 leading-relaxed">
                          {selectedCase.expected_result}
                        </div>
                      </div>

                      {/* Execution Details (if previously run) */}
                      {selectedCase.status !== 'UNEXECUTED' && (
                        <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-2xl space-y-2.5">
                          <span className="text-[10px] font-extrabold uppercase text-[#8b949e] tracking-wider block">Execution Log</span>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-[#8b949e] block">Status:</span>
                              <span className={`font-bold ${selectedCase.status === 'PASSED' ? 'text-emerald-400' : selectedCase.status === 'FAILED' ? 'text-rose-400' : 'text-orange-400'}`}>
                                {selectedCase.status}
                              </span>
                            </div>
                            <div>
                              <span className="text-[#8b949e] block">Tester:</span>
                              <span className="text-white">{selectedCase.executed_by || 'Unknown'}</span>
                            </div>
                            {selectedCase.actual_result && (
                              <div className="col-span-2">
                                <span className="text-[#8b949e] block">Actual Result Details:</span>
                                <p className="text-white mt-1 bg-[#0d1117] p-2 rounded border border-[#30363d] text-[11px] leading-relaxed">{selectedCase.actual_result}</p>
                              </div>
                            )}
                            {selectedCase.bug_id && (
                              <div className="col-span-2">
                                <span className="text-[#8b949e] block">Linked Issue:</span>
                                <button
                                  onClick={() => router.push(`/bugs?id=${selectedCase.bug_id}`)}
                                  className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-bold mt-1"
                                >
                                  <Bug className="w-3.5 h-3.5 text-rose-400" />
                                  View Linked Bug
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Input for Actual Result */}
                      {activeTestRun?.status === 'IN_PROGRESS' && (
                        <div>
                          <label className="text-[10px] font-extrabold uppercase text-[#8b949e] tracking-wider block mb-1.5">Actual Result (Observed / Notes)</label>
                          <textarea
                            placeholder="Enter test execution observations, log mismatch, or pass notes here..."
                            value={actualResult}
                            onChange={(e) => setActualResult(e.target.value)}
                            className="w-full bg-[#161b22] border border-[#30363d] rounded-xl px-3.5 py-3 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-blue-500 h-24 resize-none leading-relaxed"
                          />
                        </div>
                      )}
                    </div>

                    {/* RUNNER CONTROL ACTIONS FOOTER */}
                    {activeTestRun?.status === 'IN_PROGRESS' && (
                      <div className="border-t border-[#30363d] p-4 bg-[#161b22] flex items-center justify-between shrink-0">
                        <div className="text-[10px] text-[#8b949e]">
                          {Object.keys(checkedSteps).filter(k => checkedSteps[parseInt(k)]).length} of {getStepsArray(selectedCase.steps).length} steps checked
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleLogResult('BLOCKED')}
                            disabled={submittingResult}
                            className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            Block
                          </button>
                          
                          <button
                            onClick={handleFailClick}
                            disabled={submittingResult}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
                          >
                            <Bug className="w-4 h-4" />
                            Fail & Create Bug
                          </button>

                          <button
                            onClick={() => handleLogResult('PASSED')}
                            disabled={submittingResult}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2 rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
                          >
                            {submittingResult ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            Pass Test
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 text-xs text-[#8b949e]">
                    <ClipboardList className="w-8 h-8 text-[#30363d]" />
                    Select a test case from the left panel to begin.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Create Run Modal ───────────────────────────────────────────── */}
      {showCreateModal && activeProject && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleStartRun}
            className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                <PlayCircle className="w-5 h-5 text-blue-500" />
                Start Test Run
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg hover:bg-[#30363d] text-[#8b949e] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#8b949e] mb-1.5 block">Test Run Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sprint 4 Regression, Release 1.2.0 Cycle"
                  value={newRunName}
                  onChange={(e) => setNewRunName(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-xs text-[#c9d1d9] placeholder-[#8b949e] focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-medium text-[#8b949e] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !newRunName.trim()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition active:scale-95 shadow-md shadow-blue-900/10"
              >
                {loading ? 'Starting...' : 'Start Execution'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Auto Bug Creation Modal ────────────────────────────────────── */}
      {showBugModal && selectedCase && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateBugAndFail}
            className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Bug className="w-5 h-5 text-rose-500 animate-pulse" />
                Report Case Failure & Log Bug
              </h2>
              <button
                type="button"
                onClick={() => setShowBugModal(false)}
                className="p-1.5 rounded-lg hover:bg-[#30363d] text-[#8b949e] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-semibold text-[#8b949e] mb-1.5 block">Bug Title</label>
                <input
                  type="text"
                  required
                  value={bugTitle}
                  onChange={(e) => setBugTitle(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#8b949e] mb-1.5 block">Severity</label>
                  <select
                    value={bugSeverity}
                    onChange={(e) => setBugSeverity(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {SEVERITY_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#8b949e] mb-1.5 block">Priority</label>
                  <select
                    value={bugPriority}
                    onChange={(e) => setBugPriority(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {PRIORITY_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#8b949e] mb-1.5 block">Environment</label>
                  <input
                    type="text"
                    required
                    value={bugEnvironment}
                    onChange={(e) => setBugEnvironment(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#8b949e] mb-1.5 block">Build / Release Version</label>
                  <input
                    type="text"
                    required
                    value={bugBuildVersion}
                    onChange={(e) => setBugBuildVersion(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Readonly Prefilled Data display */}
              <div className="bg-[#0d1117] border border-[#30363d] p-3 rounded-xl text-[11px] space-y-2 text-[#8b949e]">
                <p><strong className="text-white">Steps to Reproduce (Auto-imported):</strong></p>
                <p className="whitespace-pre-wrap leading-relaxed">{selectedCase.steps}</p>
                <p><strong className="text-white">Expected Result (Auto-imported):</strong></p>
                <p className="leading-relaxed">{selectedCase.expected_result}</p>
                <p><strong className="text-white">Actual Result (Your observations):</strong></p>
                <p className="italic text-rose-300 leading-relaxed">{actualResult.trim() || 'Observed failure mismatch.'}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowBugModal(false)}
                className="px-4 py-2 text-xs font-medium text-[#8b949e] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingResult}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition active:scale-95 shadow-md shadow-rose-900/10 flex items-center gap-1.5"
              >
                {submittingResult && <Loader2 className="w-4 h-4 animate-spin" />}
                Log Bug & Fail Case
              </button>
            </div>
          </form>
        </div>
      )}

      <Copilot />
    </div>
  );
}
