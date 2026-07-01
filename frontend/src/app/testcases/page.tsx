'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import Sidebar from '@/components/sidebar';
import QACopilot from '@/components/copilot';
import { 
  Search, 
  Filter, 
  Download, 
  Check, 
  AlertTriangle,
  BadgeAlert,
  Eye,
  X,
  FileSpreadsheet,
  Plus,
  Loader2,
  Settings2
} from 'lucide-react';

export default function TestCasesPage() {
  const router = useRouter();
  const { 
    token, 
    initializeAuth, 
    activeProject, 
    testCases, 
    fetchTestCases,
    updateTestCase,
    generateManualTestCasesPreview,
    saveManualTestCases,
    saveADOSettings,
    fetchADOSettings,
    syncTestCaseToADO
  } = useAppStore();

  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  
  // Modal for detail view
  const [activeTC, setActiveTC] = useState<any | null>(null);

  // Edit states
  const [editingTC, setEditingTC] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Azure DevOps Configuration states
  const [showADOSettings, setShowADOSettings] = useState(false);
  const [adoOrg, setAdoOrg] = useState('');
  const [adoProj, setAdoProj] = useState('');
  const [adoPAT, setAdoPAT] = useState('');
  const [adoConfigured, setAdoConfigured] = useState(false);
  const [syncingCaseId, setSyncingCaseId] = useState<string | null>(null);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // Manual text-based generation states
  const [showGenModal, setShowGenModal] = useState(false);
  const [genModule, setGenModule] = useState('');
  const [genText, setGenText] = useState('');
  const [genTypes, setGenTypes] = useState<string[]>(['Positive', 'Negative', 'Boundary', 'Edge Case']);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  
  // Triage state variables
  const [previewCases, setPreviewCases] = useState<any[]>([]);
  const [selectedCaseIndexes, setSelectedCaseIndexes] = useState<number[]>([]);
  const [triageActiveIndex, setTriageActiveIndex] = useState<number>(0);
  const [savingBulk, setSavingBulk] = useState(false);
  const [bulkSaveStatus, setBulkSaveStatus] = useState<string>('DONE');

  const handleGenerateManualTestCases = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    if (!genText.trim()) {
      setGenError("Please provide some user story text or requirement parameters.");
      return;
    }
    if (genTypes.length === 0) {
      setGenError("Please select at least one validation type.");
      return;
    }
    
    setGenerating(true);
    setGenError(null);
    try {
      const generated = await generateManualTestCasesPreview(
        activeProject.id,
        genModule.trim() || 'General',
        genText,
        genTypes
      );
      if (generated && generated.length > 0) {
        setPreviewCases(generated);
        setSelectedCaseIndexes(generated.map((_, idx) => idx));
        setTriageActiveIndex(0);
      } else {
        setGenError("Could not generate test cases from raw details. Please inspect API keys/Ollama logs.");
      }
    } catch (err: any) {
      setGenError(err.message || "An error occurred during draft creation.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveBulkTestCases = async () => {
    if (!activeProject || selectedCaseIndexes.length === 0) return;
    setSavingBulk(true);
    setGenError(null);
    try {
      const casesToCommit = previewCases
        .filter((_, idx) => selectedCaseIndexes.includes(idx))
        .map(tc => ({
          ...tc,
          status: bulkSaveStatus
        }));
      
      const success = await saveManualTestCases(activeProject.id, casesToCommit);
      if (success) {
        setGenModule('');
        setGenText('');
        setPreviewCases([]);
        setSelectedCaseIndexes([]);
        setShowGenModal(false);
      } else {
        setGenError("Failed to bulk save test cases. Please verify credentials.");
      }
    } catch (err: any) {
      setGenError(err.message || "An error occurred during commit.");
    } finally {
      setSavingBulk(false);
    }
  };
  const getPriorityBadgeClass = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'P1': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'P2': return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'P3': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  const getCaseTypeBadgeClass = (caseType: string) => {
    switch (caseType?.toLowerCase()) {
      case 'positive': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'negative': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'boundary': return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
      case 'edge case': return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };


  const handleSaveEditTC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTC || !activeProject) return;
    setSaving(true);
    setEditError(null);
    try {
      const { id, ...caseData } = editingTC;
      const success = await updateTestCase(id, caseData);
      if (success) {
        const updatedList = useAppStore.getState().testCases;
        const matched = updatedList.find(tc => tc.id === id);
        if (matched) {
          setActiveTC(matched);
        }
        setEditingTC(null);
      } else {
        setEditError("Failed to update testcase. Please try again.");
      }
    } catch (err: any) {
      setEditError(err.message || "An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (mounted && !token) {
      router.push('/');
    }
  }, [token, mounted, router]);

  useEffect(() => {
    if (activeProject) {
      fetchADOSettings(activeProject.id).then((res: any) => {
        if (res && res.configured) {
          setAdoOrg(res.org_name);
          setAdoProj(res.project_name);
          setAdoPAT(res.pat_token);
          setAdoConfigured(true);
        } else {
          setAdoOrg('');
          setAdoProj('');
          setAdoPAT('');
          setAdoConfigured(false);
        }
      });
    }
  }, [activeProject, fetchADOSettings]);

  const handleSaveADOSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    const success = await saveADOSettings(activeProject.id, adoOrg, adoProj, adoPAT);
    if (success) {
      setAdoConfigured(true);
      setShowADOSettings(false);
      setSyncSuccessMsg("Azure DevOps settings saved successfully!");
      setTimeout(() => setSyncSuccessMsg(null), 3000);
    } else {
      alert("Failed to save Azure DevOps settings.");
    }
  };

  const handleSyncTestCaseToADO = async (caseId: string) => {
    setSyncingCaseId(caseId);
    setSyncSuccessMsg(null);
    try {
      const res = await syncTestCaseToADO(caseId);
      if (res.success) {
        setSyncSuccessMsg(`Successfully synced to Azure DevOps!`);
        if (activeTC && activeTC.id === caseId) {
          setActiveTC({
            ...activeTC,
            test_data: `Synced to ADO #${res.work_item_id}`
          });
        }
        setTimeout(() => setSyncSuccessMsg(null), 5000);
      } else {
        alert(`Sync failed: ${res.error}`);
      }
    } catch (err: any) {
      alert("Failed to sync. Please verify connection configurations.");
    } finally {
      setSyncingCaseId(null);
    }
  };

  if (!mounted || !token) return null;

  // Compute unique modules for selector filter dropdown
  const uniqueModules = Array.from(new Set(testCases.map(tc => tc.module)));

  // Filter list
  const filteredCases = testCases.filter((tc) => {
    const matchSearch = 
      tc.scenario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tc.custom_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tc.feature.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchModule = moduleFilter === 'ALL' || tc.module === moduleFilter;
    const matchPriority = priorityFilter === 'ALL' || tc.priority === priorityFilter;
    const matchType = typeFilter === 'ALL' || tc.case_type === typeFilter;
    
    return matchSearch && matchModule && matchPriority && matchType;
  });

  const handleExport = (format: 'CSV' | 'EXCEL' | 'PDF') => {
    if (!activeProject) return;
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    window.open(`${API_BASE_URL}/api/reports/export?project_id=${activeProject.id}&format_type=${format}`);
  };

  const getStepsArray = (stepsRaw: string): string[] => {
    try {
      const parsed = JSON.parse(stepsRaw);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {}
    return stepsRaw.split('\n').map(s => s.replace(/^\d+\.\s*/, ''));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#08060f]">
      <Sidebar />

      <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Manual Test Cases</h1>
            <p className="text-xs text-slate-400">
              {activeProject ? `Listing generated validation cases for ${activeProject.name}` : 'Select a project to load test scripts.'}
            </p>
          </div>
          {activeProject && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPreviewCases([]);
                  setSelectedCaseIndexes([]);
                  setGenError(null);
                  setShowGenModal(true);
                }}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-violet-500/20 transition duration-200 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Agile AI Builder
              </button>
              <button
                onClick={() => {
                  setGenError(null);
                  setShowADOSettings(true);
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition duration-200 shrink-0 ${
                  adoConfigured 
                    ? 'bg-blue-600/10 border-blue-500/35 text-blue-300 hover:bg-blue-600/20' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750 hover:text-slate-200'
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                ADO Connect
              </button>
              <button
                onClick={() => handleExport('CSV')}
                className="px-3 py-1.5 rounded-lg glass-panel text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                CSV
              </button>
              <button
                onClick={() => handleExport('EXCEL')}
                className="px-3 py-1.5 rounded-lg glass-panel text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 border-emerald-950/20 transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Excel
              </button>
              <button
                onClick={() => handleExport('PDF')}
                className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white flex items-center gap-1.5 transition"
              >
                Print HTML Document
              </button>
            </div>
          )}
        </div>

        {/* Filter controls panel */}
        {activeProject && (
          <div className="glass-panel p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full glass-input pl-10 pr-3 py-2 text-xs"
                placeholder="Search scenario or testcase ID..."
              />
            </div>

            <div className="flex gap-3 w-full md:w-auto justify-end text-xs">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Module</span>
                <select
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                  className="glass-input px-2.5 py-1.5 bg-[#120e25] text-white"
                >
                  <option value="ALL">All Modules</option>
                  {uniqueModules.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Priority</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="glass-input px-2.5 py-1.5 bg-[#120e25] text-white"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="P1">P1 (Critical)</option>
                  <option value="P2">P2 (High)</option>
                  <option value="P3">P3 (Medium)</option>
                  <option value="P4">P4 (Low)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Type</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="glass-input px-2.5 py-1.5 bg-[#120e25] text-white"
                >
                  <option value="ALL">All Types</option>
                  <option value="Positive">Positive</option>
                  <option value="Negative">Negative</option>
                  <option value="Boundary">Boundary</option>
                  <option value="Edge Case">Edge Case</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Data Grid table */}
        {activeProject ? (
          <div className="glass-panel rounded-xl overflow-hidden border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/40 text-[10px] uppercase text-slate-400 tracking-wider">
                    <th className="p-3">ID</th>
                    <th className="p-3">Module</th>
                    <th className="p-3">Feature</th>
                    <th className="p-3">Scenario</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Confidence</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs text-slate-300">
                  {filteredCases.length > 0 ? (
                    filteredCases.map((tc) => {
                      const conf = tc.confidence_score || 90;
                      const confColor = conf >= 90 ? 'text-emerald-400 bg-emerald-950/30 border-emerald-800/40' : 'text-amber-400 bg-amber-950/30 border-amber-800/40';
                      
                      return (
                        <tr key={tc.id} className="hover:bg-slate-900/15 transition-colors border-b border-slate-900/50">
                          <td className="p-3 font-mono font-bold text-violet-400">{tc.custom_id}</td>
                          <td className="p-3 font-medium text-slate-400">{tc.module}</td>
                          <td className="p-3 font-semibold text-slate-200">{tc.feature}</td>
                          <td className="p-3 max-w-xs truncate text-slate-300 font-medium">{tc.scenario}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${getPriorityBadgeClass(tc.priority)}`}>
                              {tc.priority}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getCaseTypeBadgeClass(tc.case_type)}`}>
                              {tc.case_type}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              tc.status === 'DRAFT' 
                                ? 'bg-amber-950/60 text-amber-400 border border-amber-900/50' 
                                : 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/50'
                            }`}>
                              {tc.status || 'DONE'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${confColor}`}>
                              {conf}%
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                setEditingTC(null);
                                setActiveTC(tc);
                              }}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 transition"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 font-mono">
                        No matching test cases found in this project.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex-grow glass-panel rounded-2xl flex flex-col items-center justify-center p-12 text-center gap-4 border border-dashed border-slate-800">
            <AlertTriangle className="w-16 h-16 text-slate-600" />
            <div>
              <h2 className="text-lg font-bold text-white">No Project Active</h2>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Please select or initialize a project in the sidebar layout to view the manual verification matrix.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Detail Drawer Modal overlay */}
      {activeTC && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-2xl p-6 rounded-xl flex flex-col gap-4 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-violet-400 text-sm">{activeTC.custom_id}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-semibold font-mono">
                  {activeTC.case_type} Validation
                </span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                  activeTC.status === 'DRAFT' 
                    ? 'bg-amber-950/60 text-amber-400 border border-amber-900/50' 
                    : 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/50'
                }`}>
                  {activeTC.status || 'DONE'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!editingTC && (
                  <>
                    {adoConfigured ? (
                      <button
                        onClick={() => handleSyncTestCaseToADO(activeTC.id)}
                        disabled={syncingCaseId === activeTC.id}
                        className="px-2.5 py-1 rounded bg-blue-600/30 hover:bg-blue-600/80 border border-blue-500/30 text-blue-300 hover:text-white text-[10px] font-bold uppercase tracking-wider transition flex items-center gap-1 disabled:opacity-50"
                      >
                        {syncingCaseId === activeTC.id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Syncing...
                          </>
                        ) : activeTC.test_data?.startsWith('Synced to ADO') ? (
                          'Re-sync ADO'
                        ) : (
                          'Push to ADO'
                        )}
                      </button>
                    ) : (
                      <span className="text-[9px] text-slate-500 font-mono italic">
                        No ADO Connection
                      </span>
                    )}

                    <button
                      onClick={() => {
                        setEditingTC({
                          id: activeTC.id,
                          module: activeTC.module,
                          feature: activeTC.feature,
                          scenario: activeTC.scenario,
                          preconditions: activeTC.preconditions || '',
                          steps: getStepsArray(activeTC.steps).join('\n'),
                          test_data: activeTC.test_data || '',
                          expected_result: activeTC.expected_result,
                          priority: activeTC.priority,
                          case_type: activeTC.case_type,
                          status: activeTC.status || 'DONE'
                        });
                        setEditError(null);
                      }}
                      className="px-2.5 py-1 rounded bg-[#1f163b] hover:bg-[#2d2153] border border-slate-800 text-violet-400 text-[10px] font-bold uppercase transition"
                    >
                      Edit Fields
                    </button>
                  </>
                )}
                <button 
                  onClick={() => {
                    setActiveTC(null);
                    setEditingTC(null);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {editingTC ? (
              <form onSubmit={handleSaveEditTC} className="flex flex-col gap-4 text-xs text-slate-300">
                {editError && (
                  <div className="bg-rose-950/20 border border-rose-800/50 p-2.5 rounded-lg text-[11px] text-rose-400">
                    {editError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Module *</label>
                    <input 
                      type="text" 
                      required
                      value={editingTC.module}
                      onChange={(e) => setEditingTC({ ...editingTC, module: e.target.value })}
                      className="w-full glass-input px-3 py-2 text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Feature Scope *</label>
                    <input 
                      type="text" 
                      required
                      value={editingTC.feature}
                      onChange={(e) => setEditingTC({ ...editingTC, feature: e.target.value })}
                      className="w-full glass-input px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Scenario Summary *</label>
                  <input 
                    type="text" 
                    required
                    value={editingTC.scenario}
                    onChange={(e) => setEditingTC({ ...editingTC, scenario: e.target.value })}
                    className="w-full glass-input px-3 py-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Priority</label>
                    <select
                      value={editingTC.priority}
                      onChange={(e) => setEditingTC({ ...editingTC, priority: e.target.value })}
                      className="w-full glass-input px-3 py-2 text-xs bg-[#120e25] text-white"
                    >
                      <option value="P1">P1</option>
                      <option value="P2">P2</option>
                      <option value="P3">P3</option>
                      <option value="P4">P4</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Case Type</label>
                    <select
                      value={editingTC.case_type}
                      onChange={(e) => setEditingTC({ ...editingTC, case_type: e.target.value })}
                      className="w-full glass-input px-3 py-2 text-xs bg-[#120e25] text-white"
                    >
                      <option value="FUNCTIONAL">FUNCTIONAL</option>
                      <option value="INTEGRATION">INTEGRATION</option>
                      <option value="UI">UI</option>
                      <option value="PERFORMANCE">PERFORMANCE</option>
                      <option value="SECURITY">SECURITY</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Preconditions</label>
                  <textarea 
                    value={editingTC.preconditions}
                    onChange={(e) => setEditingTC({ ...editingTC, preconditions: e.target.value })}
                    className="w-full glass-input px-3 py-2 text-xs h-16 resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Steps (One per line) *</label>
                  <textarea 
                    required
                    value={editingTC.steps}
                    onChange={(e) => setEditingTC({ ...editingTC, steps: e.target.value })}
                    className="w-full glass-input px-3 py-2 text-xs h-24 font-mono leading-relaxed"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Required Test Data</label>
                  <input 
                    type="text" 
                    value={editingTC.test_data}
                    onChange={(e) => setEditingTC({ ...editingTC, test_data: e.target.value })}
                    className="w-full glass-input px-3 py-2 text-xs font-mono text-cyan-400"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 font-bold">Expected Outcome *</label>
                  <textarea 
                    required
                    value={editingTC.expected_result}
                    onChange={(e) => setEditingTC({ ...editingTC, expected_result: e.target.value })}
                    className="w-full glass-input px-3 py-2 text-xs h-16 resize-none border-emerald-950/50 focus:border-emerald-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5 border-t border-slate-800/80 pt-4 mt-2">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-300 font-bold">Select Publication State Preset</label>
                  <div className="flex gap-4 mt-1">
                    <button
                      type="button"
                      onClick={() => setEditingTC({ ...editingTC, status: 'DRAFT' })}
                      className={`flex-1 p-2.5 rounded-lg border text-left transition ${
                        editingTC.status === 'DRAFT'
                          ? 'bg-amber-950/20 border-amber-500/80 text-amber-300 shadow'
                          : 'bg-transparent border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <div className="font-bold text-xs">Save as Draft</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingTC({ ...editingTC, status: 'DONE' })}
                      className={`flex-1 p-2.5 rounded-lg border text-left transition ${
                        editingTC.status === 'DONE'
                          ? 'bg-emerald-950/20 border-emerald-500/80 text-emerald-300 shadow'
                          : 'bg-transparent border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <div className="font-bold text-xs">Save as Done (Active)</div>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-4 border-t border-slate-800 pt-4 font-semibold">
                  <button 
                    type="button"
                    onClick={() => setEditingTC(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Case'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-4 overflow-y-auto max-h-[450px] pr-2 text-xs text-slate-300">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Feature Scope</span>
                  <p className="font-semibold text-white mt-0.5">{activeTC.feature}</p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Scenario Summary</span>
                  <p className="mt-0.5">{activeTC.scenario}</p>
                </div>

                {activeTC.preconditions && (
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">Preconditions</span>
                    <p className="bg-slate-950/20 p-2 rounded border border-slate-800/60 mt-0.5">{activeTC.preconditions}</p>
                  </div>
                )}

                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Reproduction Verification Steps</span>
                  <ol className="list-decimal list-inside flex flex-col gap-1.5 mt-1 bg-slate-950/30 p-3 rounded-lg border border-slate-800/80 font-mono text-[11px] text-slate-200">
                    {getStepsArray(activeTC.steps).map((step, idx) => (
                      <li key={idx} className="pl-1 leading-relaxed">{step}</li>
                    ))}
                  </ol>
                </div>

                {activeTC.test_data && (
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">Required Test Data</span>
                    {activeTC.test_data.startsWith('Synced to ADO') ? (
                      <div className="bg-blue-950/10 border border-blue-900/30 p-2.5 rounded-lg text-blue-300 font-mono text-[10px] flex items-center justify-between mt-0.5 animate-pulse">
                        <span>{activeTC.test_data}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 uppercase font-bold border border-blue-500/20">
                          Linked Board Work Item
                        </span>
                      </div>
                    ) : (
                      <p className="font-mono bg-slate-950/20 p-2 rounded border border-slate-800/60 mt-0.5 text-cyan-400">{activeTC.test_data}</p>
                    )}
                  </div>
                )}

                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Expected Outcome</span>
                  <p className="bg-emerald-950/10 border border-emerald-900/40 text-emerald-300 p-2.5 rounded-lg mt-0.5">
                    {activeTC.expected_result}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showGenModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          {previewCases.length === 0 ? (
            /* INITIAL INPUT FORM SCREEN */
            <div className="glass-panel w-full max-w-lg p-6 rounded-xl flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Plus className="w-5 h-5 text-violet-500 animate-pulse" /> Agile AI Test Case Builder
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Describe requirements or paste user stories to generate detailed manual test cases.
                  </p>
                </div>
                <button 
                  onClick={() => setShowGenModal(false)}
                  className="text-slate-400 hover:text-slate-200 p-1 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGenerateManualTestCases} className="flex flex-col gap-4 mt-1">
                {genError && (
                  <div className="bg-rose-950/20 border border-rose-800/50 p-2.5 rounded-lg text-[11px] text-rose-400">
                    {genError}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Module / Epic Scope</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Authentication Gateway"
                    required
                    value={genModule}
                    onChange={(e) => setGenModule(e.target.value)}
                    className="glass-input px-3 py-2 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">User Story Description / Acceptance Criteria</label>
                  <textarea 
                    placeholder="As a user, I want to authenticate so that I can access my secure panel..."
                    required
                    value={genText}
                    onChange={(e) => setGenText(e.target.value)}
                    className="glass-input px-3 py-2 text-xs h-36 resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Case Types to Generate</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {['Positive', 'Negative', 'Boundary', 'Edge Case'].map(type => (
                      <label key={type} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={genTypes.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setGenTypes([...genTypes, type]);
                            } else {
                              setGenTypes(genTypes.filter(t => t !== type));
                            }
                          }}
                          className="rounded border-slate-800 bg-slate-950/40 text-violet-500"
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-800">
                  <button 
                    type="button"
                    onClick={() => setShowGenModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
                    disabled={generating}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/20 flex items-center gap-1.5 disabled:opacity-50"
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Generating Drafts...
                      </>
                    ) : (
                      'Generate AI Drafts'
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* INTERACTIVE TRIAGE VIEW SCREEN */
            <div className="glass-panel w-full max-w-5xl p-6 rounded-xl flex flex-col gap-4 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Plus className="w-5 h-5 text-emerald-500" /> Triage AI Generated Test Cases
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Agile board containing drafted verification matrices. Select/deselect cases and commit.
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setPreviewCases([]);
                    setSelectedCaseIndexes([]);
                  }}
                  className="text-slate-400 hover:text-slate-200 p-1 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {genError && (
                <div className="bg-rose-950/20 border border-rose-800/50 p-2.5 rounded-lg text-[11px] text-rose-400">
                  {genError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-1 items-start min-h-[400px]">
                {/* Left side list containing checkboxes */}
                <div className="md:col-span-2 flex flex-col gap-3 max-h-[450px] overflow-y-auto pr-2 border-r border-slate-800/80">
                  <div className="flex justify-between items-center bg-slate-950/20 p-2 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-bold">
                      Drafted Items ({previewCases.length})
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCaseIndexes(previewCases.map((_, i) => i))}
                        className="text-[9px] text-violet-400 font-bold hover:text-violet-300"
                      >
                        All
                      </button>
                      <span className="text-[9px] text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedCaseIndexes([])}
                        className="text-[9px] text-slate-400 font-bold hover:text-slate-300"
                      >
                        None
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {previewCases.map((tc, idx) => (
                      <div 
                        key={idx}
                        onClick={() => setTriageActiveIndex(idx)}
                        className={`flex items-start gap-2.5 p-3.5 rounded-lg border text-left cursor-pointer transition-all duration-200 ${
                          triageActiveIndex === idx
                            ? 'bg-gradient-to-br from-violet-950/30 to-indigo-950/20 border-violet-500/40 text-violet-300 shadow-lg shadow-violet-950/25 translate-x-1'
                            : 'bg-transparent border-slate-850 hover:bg-slate-900/10 hover:border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCaseIndexes.includes(idx)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCaseIndexes([...selectedCaseIndexes, idx]);
                            } else {
                              setSelectedCaseIndexes(selectedCaseIndexes.filter(i => i !== idx));
                            }
                          }}
                          className="mt-0.5 rounded border-slate-800 bg-slate-950/40 text-violet-500"
                        />
                        <div className="flex-grow min-w-0">
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="font-mono text-violet-400 uppercase font-bold">{tc.case_type}</span>
                            <span className="text-slate-500">{tc.priority}</span>
                          </div>
                          <div className="text-[11px] font-semibold text-slate-200 mt-1 truncate">{tc.scenario}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right side detail preview */}
                <div className="md:col-span-3 flex flex-col gap-4 max-h-[450px] overflow-y-auto pr-2 bg-slate-950/15 p-4 rounded-xl border border-slate-850">
                  {previewCases[triageActiveIndex] ? (
                    <div className="flex flex-col gap-4 text-xs text-slate-300 animate-in fade-in duration-200">
                      <div className="border-b border-slate-850 pb-2">
                        <span className="text-[10px] text-slate-500 uppercase font-mono">Case Target</span>
                        <h4 className="text-sm font-bold text-white mt-0.5">
                          {previewCases[triageActiveIndex].scenario}
                        </h4>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-mono">Feature</span>
                          <p className="font-semibold text-white mt-0.5">{previewCases[triageActiveIndex].feature}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-mono">Validation Type</span>
                          <p className="font-semibold text-violet-400 mt-0.5 font-mono">{previewCases[triageActiveIndex].case_type}</p>
                        </div>
                      </div>

                      {previewCases[triageActiveIndex].preconditions && (
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-mono">Preconditions</span>
                          <p className="bg-slate-950/20 p-2 rounded border border-slate-800/60 mt-0.5">
                            {previewCases[triageActiveIndex].preconditions}
                          </p>
                        </div>
                      )}

                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-mono">Steps to Reproduce</span>
                        <pre className="mt-1 whitespace-pre-line bg-slate-950/20 p-3 rounded border border-slate-800/80 font-mono text-[10px] leading-relaxed text-slate-300">
                          {previewCases[triageActiveIndex].steps}
                        </pre>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-mono">Expected Result</span>
                        <p className="bg-emerald-950/10 border border-emerald-900/40 text-emerald-300 p-2.5 rounded mt-0.5">
                          {previewCases[triageActiveIndex].expected_result}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-500 p-8">
                      Select a test case on the left to preview details.
                    </div>
                  )}
                </div>
              </div>

              {/* Publication status & Save buttons */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-slate-800 pt-4 mt-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-semibold font-mono uppercase">Publication Preset:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBulkSaveStatus('DRAFT')}
                      className={`px-3 py-1 rounded text-[10px] font-bold transition ${
                        bulkSaveStatus === 'DRAFT'
                          ? 'bg-amber-600 text-white shadow shadow-amber-500/20'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      DRAFT
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkSaveStatus('DONE')}
                      className={`px-3 py-1 rounded text-[10px] font-bold transition ${
                        bulkSaveStatus === 'DONE'
                          ? 'bg-emerald-600 text-white shadow shadow-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      DONE (ACTIVE)
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setPreviewCases([]);
                      setSelectedCaseIndexes([]);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                    disabled={savingBulk}
                  >
                    Back to Form
                  </button>
                  <button 
                    type="button"
                    onClick={handleSaveBulkTestCases}
                    className="px-5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 disabled:opacity-50"
                    disabled={savingBulk || selectedCaseIndexes.length === 0}
                  >
                    {savingBulk ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Saving Cases...
                      </>
                    ) : (
                      `Commit ${selectedCaseIndexes.length} Selected Test Cases`
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {showADOSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-xl flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
                  <Settings2 className="w-5 h-5 text-blue-500" /> Azure DevOps Connect
                </h2>
                <p className="text-xs text-slate-400 mt-1">Configure Azure DevOps board mappings for this project.</p>
              </div>
              <button 
                onClick={() => setShowADOSettings(false)}
                className="text-slate-400 hover:text-slate-200 p-1 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveADOSettings} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Organization Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. MyOrganization"
                  value={adoOrg}
                  onChange={(e) => setAdoOrg(e.target.value)}
                  className="glass-input px-3 py-2 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Project Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. MyProject"
                  value={adoProj}
                  onChange={(e) => setAdoProj(e.target.value)}
                  className="glass-input px-3 py-2 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Personal Access Token (PAT) *</label>
                <input 
                  type="password" 
                  required
                  placeholder="Paste Azure DevOps PAT token"
                  value={adoPAT}
                  onChange={(e) => setAdoPAT(e.target.value)}
                  className="glass-input px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-800">
                <button 
                  type="button"
                  onClick={() => setShowADOSettings(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20"
                >
                  Save Connection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <QACopilot />
    </div>
  );
}
