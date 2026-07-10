'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import Sidebar from '@/components/sidebar';
import QACopilot from '@/components/copilot';
import { 
 Search, Filter, Download, Check, AlertTriangle, Eye, X, Plus, Loader2,
 Settings2, Edit2, Trash2, History, ChevronLeft, ChevronRight, Tags,
 CheckSquare, Square, Sparkles, FileEdit, Bug, Tag, Bot, ChevronDown
} from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';

const EMPTY_FORM = {
  title: '',
  module: '',
  feature: '',
  scenario: '',
  preconditions: '',
  steps: '',
  test_data: '',
  expected_result: '',
  priority: 'P2',
  case_type: 'Functional',
  status: 'DRAFT',
  tags: [] as string[]
};

export default function TestCasesPage() {
  const router = useRouter();
  const { 
   activeProject, testCases, fetchTestCases, deleteTestCase, bulkDeleteTestCases,
   generateManualTestCasesPreview, saveManualTestCases, updateTestCase, createTestCase,
   generateAIBugFromTestCase, createEnterpriseBug
  } = useAppStore();

  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [bulkStatusVal, setBulkStatusVal] = useState('APPROVED');

  // Modal states
  const [activeTC, setActiveTC] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [tagInput, setTagInput] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // Custom Dropdown States
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [caseTypeOpen, setCaseTypeOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const handleSelectPriority = (val: string) => {
    setForm(f => ({ ...f, priority: val }));
    setPriorityOpen(false);
  };
  const handleSelectCaseType = (val: string) => {
    setForm(f => ({ ...f, case_type: val }));
    setCaseTypeOpen(false);
  };
  const handleSelectStatus = (val: string) => {
    setForm(f => ({ ...f, status: val }));
    setStatusOpen(false);
  };

  const [filterModuleOpen, setFilterModuleOpen] = useState(false);
  const [filterPriorityOpen, setFilterPriorityOpen] = useState(false);
  const [filterStatusOpen, setFilterStatusOpen] = useState(false);
  const [bugSeverityOpen, setBugSeverityOpen] = useState(false);
  const [bugPriorityOpen, setBugPriorityOpen] = useState(false);

  // AI Generator Modal
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiModule, setAiModule] = useState('');
  const [aiRequirement, setAiRequirement] = useState('');
  const [selectedAIParams, setSelectedAIParams] = useState<string[]>(['Positive', 'Negative', 'Boundary', 'Edge Case']);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGeneratedCases, setAiGeneratedCases] = useState<any[] | null>(null);
  const [selectedAiCaseIndices, setSelectedAiCaseIndices] = useState<number[]>([]);
  const [editingAiCaseIndex, setEditingAiCaseIndex] = useState<number | null>(null);
  const [editingAiCaseForm, setEditingAiCaseForm] = useState<any>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Log Bug from Test Case Modal (inline)
  const [showLogBugModal, setShowLogBugModal] = useState(false);
  const [logBugMode, setLogBugMode] = useState<'choose' | 'ai-loading' | 'form'>('choose');
  const [bugForm, setBugForm] = useState<any>(null);
  const [bugFormSaving, setBugFormSaving] = useState(false);

  // History Modal
  const [historyTCId, setHistoryTCId] = useState<string | null>(null);
  const [tcHistory, setTcHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Delete Confirm
  const [tcToDelete, setTcToDelete] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  useEffect(() => {
   setMounted(true);
   if (activeProject) {
     fetchTestCases();
   }
  }, [fetchTestCases, activeProject]);

  if (!mounted) return null;

  const filteredCases = testCases.filter(tc => {
   if (moduleFilter !== 'ALL' && tc.module !== moduleFilter) return false;
   if (priorityFilter !== 'ALL' && tc.priority !== priorityFilter) return false;
   if (typeFilter !== 'ALL' && tc.case_type !== typeFilter) return false;
   if (statusFilter !== 'ALL' && tc.status !== statusFilter) return false;
   if (searchTerm) {
    const lower = searchTerm.toLowerCase();
    return (
     tc.title?.toLowerCase().includes(lower) ||
     tc.scenario?.toLowerCase().includes(lower) ||
     tc.custom_id.toLowerCase().includes(lower)
    );
   }
   return true;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredCases.length / itemsPerPage);
  const currentCases = filteredCases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAll = () => {
   if (selectedIds.length === currentCases.length) {
    setSelectedIds([]);
   } else {
    setSelectedIds(currentCases.map(tc => tc.id));
   }
  };

  const handleSelectOne = (id: string) => {
   if (selectedIds.includes(id)) {
    setSelectedIds(selectedIds.filter(i => i !== id));
   } else {
    setSelectedIds([...selectedIds, id]);
   }
  };

  const handleDeleteSingle = async () => {
   if (tcToDelete) {
    await deleteTestCase(tcToDelete);
    setTcToDelete(null);
    setSelectedIds(selectedIds.filter(id => id !== tcToDelete));
   }
  };

  const handleBulkDelete = async () => {
   if (selectedIds.length > 0) {
    await bulkDeleteTestCases(selectedIds);
    setSelectedIds([]);
    setBulkDeleteConfirm(false);
   }
  };
  
  const fetchHistory = async (id: string) => {
   setHistoryTCId(id);
   setLoadingHistory(true);
   try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/test-cases/${id}/history`);
    if (res.ok) {
     const data = await res.json();
     setTcHistory(data);
    }
   } catch (e) {
    console.error(e);
   }
   setLoadingHistory(false);
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setForm({ ...EMPTY_FORM });
    setTagInput('');
    setShowCreateModal(true);
  };

  const handleOpenEdit = (tc: any) => {
    setIsEditing(true);
    setForm({
      title: tc.title || '',
      module: tc.module || '',
      feature: tc.feature || '',
      scenario: tc.scenario || '',
      preconditions: tc.preconditions || '',
      steps: tc.steps || '',
      test_data: tc.test_data || '',
      expected_result: tc.expected_result || '',
      priority: tc.priority || 'P2',
      case_type: tc.case_type || 'Functional',
      status: tc.status || 'DRAFT',
      tags: tc.tags || []
    });
    setTagInput('');
    setActiveTC(null); // Close detail view if open
    setShowCreateModal(true);
  };

  const handleSaveTestCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !form.title || !form.module || !form.steps || !form.expected_result) return;
    setFormSaving(true);

    if (isEditing && activeTC) {
      await updateTestCase(activeTC.id, form);
    } else {
      await createTestCase({ ...form, project_id: activeProject.id });
    }

    setShowCreateModal(false);
    setForm({ ...EMPTY_FORM });
    setFormSaving(false);
  };

  // AI Generation Handlers
  const handleGenerateAI = async () => {
    if (!activeProject || !aiRequirement.trim() || !aiModule.trim()) return;
    setAiLoading(true);
    setAiError(null);
    const result = await generateManualTestCasesPreview(activeProject.id, aiModule, aiRequirement, selectedAIParams);
    if (result === null) {
      const storeError = useAppStore.getState().error || "AI Testcase generation failed.";
      setAiError(storeError);
      setAiGeneratedCases(null);
      setSelectedAiCaseIndices([]);
    } else {
      setAiGeneratedCases(result);
      if (result && Array.isArray(result)) {
        setSelectedAiCaseIndices(result.map((_, idx) => idx));
      } else {
        setSelectedAiCaseIndices([]);
      }
    }
    setAiLoading(false);
  };

  const handleSaveAITestCases = async () => {
    if (!activeProject || !aiGeneratedCases) return;
    const casesToSave = aiGeneratedCases.filter((_, idx) => selectedAiCaseIndices.includes(idx));
    if (casesToSave.length === 0) {
      alert("Please select at least one test case to save.");
      return;
    }
    setFormSaving(true);
    setAiError(null);
    const success = await saveManualTestCases(activeProject.id, casesToSave);
    if (!success) {
      const storeError = useAppStore.getState().error || "Failed to save test cases.";
      setAiError(storeError);
    } else {
      setShowAIModal(false);
      setAiRequirement('');
      setAiModule('');
      setAiGeneratedCases(null);
      setSelectedAiCaseIndices([]);
      setEditingAiCaseIndex(null);
      setEditingAiCaseForm(null);
    }
    setFormSaving(false);
  };

  // Log Bug inline logic
  const handleOpenLogBug = (tc: any) => {
    setLogBugMode('choose');
    setBugForm(null);
    setShowLogBugModal(true);
  };

  const handleGenerateAIBug = async () => {
    if (!activeTC || !activeProject) return;
    setLogBugMode('ai-loading');
    const result = await generateAIBugFromTestCase({
      project_id: activeProject.id,
      test_case_id: activeTC.id,
      title: activeTC.title,
      module: activeTC.module,
      feature: activeTC.feature,
      scenario: activeTC.scenario,
      expected_result: activeTC.expected_result,
      priority: activeTC.priority,
      steps: activeTC.steps,
      preconditions: activeTC.preconditions,
      actual_result: 'Failed during execution verification.',
    });
    setBugForm(result ? {
      ...result, linked_test_case_id: activeTC.id
    } : {
      title: `Test Failure: ${activeTC.title}`,
      module: activeTC.module || '', feature: activeTC.feature || '',
      description: `Test case failed during execution.\n\nExpected Result: ${activeTC.expected_result || 'N/A'}`,
      preconditions: activeTC.preconditions || '',
      steps_to_reproduce: activeTC.steps || '',
      expected_result: activeTC.expected_result || '',
      actual_result: '',
      severity: 'HIGH', priority: activeTC.priority || 'P2',
      environment: 'QA', root_cause_suggestion: '', tags: ['test-failure'],
      linked_test_case_id: activeTC.id,
    });
    setLogBugMode('form');
  };

  const handleManualBug = () => {
    if (!activeTC) return;
    setBugForm({
      title: `Test Failure: ${activeTC.title}`,
      module: activeTC.module || '', feature: activeTC.feature || '',
      description: `Test case failed during execution.\n\nExpected Result: ${activeTC.expected_result || 'N/A'}`,
      preconditions: activeTC.preconditions || '',
      steps_to_reproduce: activeTC.steps || '',
      expected_result: activeTC.expected_result || '',
      actual_result: '',
      severity: 'HIGH', priority: activeTC.priority || 'P2',
      environment: 'QA', root_cause_suggestion: '', tags: ['test-failure'],
      linked_test_case_id: activeTC.id,
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
    setActiveTC(null); // Close detail view
  };

  const handleSelectBugSeverity = (val: string) => {
    setBugForm((f: any) => ({ ...f, severity: val }));
    setBugSeverityOpen(false);
  };

  const handleSelectBugPriority = (val: string) => {
    setBugForm((f: any) => ({ ...f, priority: val }));
    setBugPriorityOpen(false);
  };

  const F = (key: string) => ({
    value: (form as any)[key],
    onChange: (e: any) => setForm(f => ({ ...f, [key]: e.target.value }))
  });

  const BF = (key: string) => ({
    value: bugForm?.[key] ?? '',
    onChange: (e: any) => setBugForm((f: any) => ({ ...f, [key]: e.target.value }))
  });

  const getPriorityBadgeClass = (priority: string) => {
   switch (priority?.toUpperCase()) {
    case 'P1': case 'CRITICAL': return 'bg-rose-500/10 text-rose-600 border border-rose-500/20';
    case 'P2': case 'HIGH': return 'bg-orange-500/10 text-orange-600 border border-orange-500/20';
    case 'P3': case 'MEDIUM': return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
    default: return 'bg-slate-500/10 text-slate-600 border border-slate-500/20';
   }
  };

  const getStatusBadgeClass = (status: string) => {
   switch (status?.toUpperCase()) {
    case 'DRAFT': return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'REVIEW': return 'bg-amber-50 text-amber-600 border-amber-200';
    case 'APPROVED': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    case 'DEPRECATED': return 'bg-rose-50 text-rose-600 border-rose-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
   }
  };

   const inputCls = 'w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:border-[#2F81F7] focus:ring-4 focus:ring-blue-100 text-slate-800 placeholder-slate-400 transition-all duration-200 shadow-sm';
   const labelCls = 'text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block';

  return (
   <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
    <Sidebar />
    
    <main className="flex-1 min-w-0 p-4 md:p-6 pt-16 md:pt-6 flex flex-col gap-6 relative">
     
     <div className="flex items-center justify-between border-b border-slate-200 pb-4">
      <div>
       <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
        Test Case Repository
       </h1>
       <p className="text-xs text-slate-500">Manage and execute test cases with AI generation</p>
      </div>
      <div className="flex gap-2">
       <button onClick={() => setShowAIModal(true)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-sm">
        <Settings2 className="w-4 h-4" />
        AI Generator
       </button>
       <button onClick={handleOpenCreate} className="px-4 py-2 bg-[#2F81F7] hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-sm">
        <Plus className="w-4 h-4" />
        New Test Case
       </button>
      </div>
     </div>

     {activeProject ? (
      <div className="flex flex-col gap-4">
       {/* Filters & Actions Bar */}
       <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
         <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
           type="text"
           placeholder="Search test cases..."
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
           className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium w-64 focus:outline-none focus:ring-2 focus:ring-[#2F81F7]/50"
          />
         </div>
         
          {/* Module Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setFilterModuleOpen(!filterModuleOpen);
                setFilterPriorityOpen(false);
                setFilterStatusOpen(false);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:outline-none flex items-center gap-1.5 min-w-[120px] justify-between"
            >
              <span>{moduleFilter === 'ALL' ? 'All Modules' : moduleFilter}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>
            {filterModuleOpen && (
              <div className="absolute left-0 mt-1 min-w-[180px] bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 max-h-60 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => { setModuleFilter('ALL'); setFilterModuleOpen(false); }}
                  className={`w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 transition text-slate-700 font-bold ${moduleFilter === 'ALL' ? 'bg-blue-50/50 text-[#2F81F7]' : ''}`}
                >
                  All Modules
                </button>
                {Array.from(new Set(testCases.map(tc => tc.module))).map(m => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => { setModuleFilter(m); setFilterModuleOpen(false); }}
                    className={`w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 transition text-slate-700 font-bold ${moduleFilter === m ? 'bg-blue-50/50 text-[#2F81F7]' : ''}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setFilterPriorityOpen(!filterPriorityOpen);
                setFilterModuleOpen(false);
                setFilterStatusOpen(false);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:outline-none flex items-center gap-1.5 min-w-[120px] justify-between"
            >
              <span>{priorityFilter === 'ALL' ? 'All Priorities' : priorityFilter}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>
            {filterPriorityOpen && (
              <div className="absolute left-0 mt-1 min-w-[140px] bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
                {['ALL', 'P1', 'P2', 'P3'].map(p => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => { setPriorityFilter(p); setFilterPriorityOpen(false); }}
                    className={`w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 transition text-slate-700 font-bold ${priorityFilter === p ? 'bg-blue-50/50 text-[#2F81F7]' : ''}`}
                  >
                    {p === 'ALL' ? 'All Priorities' : p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setFilterStatusOpen(!filterStatusOpen);
                setFilterModuleOpen(false);
                setFilterPriorityOpen(false);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:outline-none flex items-center gap-1.5 min-w-[120px] justify-between"
            >
              <span>{statusFilter === 'ALL' ? 'All Statuses' : statusFilter}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>
            {filterStatusOpen && (
              <div className="absolute left-0 mt-1 min-w-[140px] bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
                {['ALL', 'DRAFT', 'REVIEW', 'APPROVED', 'DEPRECATED'].map(s => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => { setStatusFilter(s); setFilterStatusOpen(false); }}
                    className={`w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 transition text-slate-700 font-bold ${statusFilter === s ? 'bg-blue-50/50 text-[#2F81F7]' : ''}`}
                  >
                    {s === 'ALL' ? 'All Statuses' : s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {selectedIds.length > 0 && (
         <div className="flex items-center gap-2 animate-in fade-in duration-200">
          <span className="text-xs font-bold text-slate-600 mr-2">{selectedIds.length} Selected</span>
          <button onClick={() => setBulkDeleteConfirm(true)} className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded text-xs font-bold transition">Bulk Delete</button>
         </div>
        )}
       </div>

       {/* Table */}
       <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
         <thead>
          <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
           <th className="p-3 w-10 text-center">
            <button onClick={handleSelectAll} className="text-slate-400 hover:text-slate-700">
             {selectedIds.length === currentCases.length && currentCases.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            </button>
           </th>
           <th className="p-3">ID</th>
           <th className="p-3 w-1/3">Title / Scenario</th>
           <th className="p-3">Module</th>
           <th className="p-3">Priority</th>
           <th className="p-3">Type</th>
           <th className="p-3">Status</th>
           <th className="p-3 text-right">Actions</th>
          </tr>
         </thead>
         <tbody className="divide-y divide-slate-100">
          {currentCases.length > 0 ? (
           currentCases.map(tc => (
            <tr key={tc.id} className={`hover:bg-slate-50/80 transition-colors ${selectedIds.includes(tc.id) ? 'bg-blue-50/30' : ''}`} onClick={() => setActiveTC(tc)}>
             <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
              <button onClick={() => handleSelectOne(tc.id)} className={`transition-colors ${selectedIds.includes(tc.id) ? 'text-[#2F81F7]' : 'text-slate-300 hover:text-slate-400'}`}>
               {selectedIds.includes(tc.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              </button>
             </td>
             <td className="p-3">
              <span className="font-mono text-xs font-bold text-slate-700">{tc.custom_id}</span>
             </td>
             <td className="p-3">
              <p className="text-xs font-bold text-slate-900 line-clamp-1">{tc.title || tc.scenario}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{tc.feature}</p>
             </td>
             <td className="p-3 text-xs font-semibold text-slate-600">{tc.module}</td>
             <td className="p-3">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${getPriorityBadgeClass(tc.priority)}`}>
               {tc.priority}
              </span>
             </td>
             <td className="p-3 text-xs font-semibold text-slate-600">{tc.case_type}</td>
             <td className="p-3">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getStatusBadgeClass(tc.status || 'DRAFT')}`}>
               {tc.status || 'DRAFT'}
              </span>
             </td>
             <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-end gap-1">
               <button onClick={() => setActiveTC(tc)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="View Details">
                <Eye className="w-3.5 h-3.5" />
               </button>
               <button onClick={() => fetchHistory(tc.id)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition" title="View History">
                <History className="w-3.5 h-3.5" />
               </button>
               <button onClick={() => setTcToDelete(tc.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition" title="Delete">
                <Trash2 className="w-3.5 h-3.5" />
               </button>
              </div>
             </td>
            </tr>
           ))
          ) : (
           <tr>
            <td colSpan={8} className="p-12 text-center text-slate-500 font-mono text-sm">
             No test cases match your filters.
            </td>
           </tr>
          )}
         </tbody>
        </table>
        
        {/* Pagination Footer */}
        {totalPages > 1 && (
         <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-semibold">
           Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredCases.length)} of {filteredCases.length}
          </span>
          <div className="flex gap-1">
           <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(c => c - 1)}
            className="p-1 rounded text-slate-600 hover:bg-slate-200 disabled:opacity-30"
           >
            <ChevronLeft className="w-4 h-4" />
           </button>
           <span className="text-xs font-bold px-3 py-1">{currentPage} / {totalPages}</span>
           <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(c => c + 1)}
            className="p-1 rounded text-slate-600 hover:bg-slate-200 disabled:opacity-30"
           >
            <ChevronRight className="w-4 h-4" />
           </button>
          </div>
         </div>
        )}
       </div>
      </div>
     ) : (
      <div className="flex-grow bg-white border border-slate-200 shadow-sm rounded-2xl flex flex-col items-center justify-center p-12 text-center gap-4">
       <AlertTriangle className="w-16 h-16 text-slate-400" />
       <div>
        <h2 className="text-lg font-bold text-slate-900">No Active Project</h2>
        <p className="text-xs text-slate-500 mt-1">Please select a project from the sidebar to manage test cases.</p>
       </div>
      </div>
     )}
    </main>

    {/* ── View Test Case Detail Modal ─────────────────────────────────────────── */}
    {activeTC && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-[#2F81F7]">{activeTC.custom_id}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] border font-black uppercase tracking-wider ${getStatusBadgeClass(activeTC.status)}`}>
                {activeTC.status}
              </span>
            </div>
            <button onClick={() => setActiveTC(null)} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-900 rounded-full transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">{activeTC.title}</h2>
              <div className="flex gap-4 text-xs font-bold text-slate-500 border-b border-slate-100 pb-4">
                <span>Module: <span className="text-slate-900">{activeTC.module}</span></span>
                {activeTC.feature && <span>Feature: <span className="text-slate-900">{activeTC.feature}</span></span>}
                <span>Priority: <span className="text-slate-900">{activeTC.priority}</span></span>
                <span>Type: <span className="text-slate-900">{activeTC.case_type}</span></span>
              </div>
            </div>

            {activeTC.scenario && (
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Scenario / Description</h3>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 whitespace-pre-wrap">{activeTC.scenario}</div>
              </div>
            )}

            {activeTC.preconditions && (
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Preconditions</h3>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 whitespace-pre-wrap">{activeTC.preconditions}</div>
              </div>
            )}

            {activeTC.steps && (
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Steps</h3>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 whitespace-pre-wrap font-mono text-xs">{activeTC.steps}</div>
              </div>
            )}

            {activeTC.expected_result && (
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Expected Result</h3>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 whitespace-pre-wrap">{activeTC.expected_result}</div>
              </div>
            )}

            {activeTC.test_data && (
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Test Data</h3>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 whitespace-pre-wrap font-mono text-xs">{activeTC.test_data}</div>
              </div>
            )}
          </div>

          <div className="shrink-0 p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center rounded-b-2xl">
            <button
              onClick={() => handleOpenLogBug(activeTC)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Bug className="w-4 h-4" />
              Log Bug
            </button>
            <div className="flex gap-2">
              <button onClick={() => setActiveTC(null)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition">Close</button>
              <button onClick={() => handleOpenEdit(activeTC)} className="px-4 py-2 bg-[#2F81F7] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ── Create / Edit Test Case Modal ────────────────────────────────────────── */}
    {showCreateModal && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <form onSubmit={handleSaveTestCase} className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#2F81F7]" />
              <h2 className="text-sm font-black text-slate-900">{isEditing ? 'Edit Test Case' : 'Create New Test Case'}</h2>
            </div>
            <button type="button" onClick={() => setShowCreateModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition"><X className="w-5 h-5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            <div>
              <label className={labelCls}>Test Case Title *</label>
              <input required {...F('title')} className={inputCls} placeholder="Concise title for the test case" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Module *</label>
                <input required {...F('module')} className={inputCls} placeholder="e.g. Authentication" />
              </div>
              <div>
                <label className={labelCls}>Feature</label>
                <input {...F('feature')} className={inputCls} placeholder="e.g. Login Verification" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Priority */}
              <div className="relative">
                <label className={labelCls}>Priority</label>
                <button
                  type="button"
                  onClick={() => {
                    setPriorityOpen(!priorityOpen);
                    setCaseTypeOpen(false);
                    setStatusOpen(false);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left flex items-center justify-between focus:outline-none focus:border-[#2F81F7] focus:ring-4 focus:ring-blue-100 text-slate-800 font-bold transition-all duration-200"
                >
                  <span>{form.priority}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
                {priorityOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-100 max-h-48 overflow-y-auto">
                    {['P1', 'P2', 'P3', 'P4'].map(p => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => handleSelectPriority(p)}
                        className={`w-full px-3.5 py-2 text-left text-xs hover:bg-slate-50 transition text-slate-700 font-bold ${form.priority === p ? 'bg-blue-50/50 text-[#2F81F7]' : ''}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Case Type */}
              <div className="relative">
                <label className={labelCls}>Case Type</label>
                <button
                  type="button"
                  onClick={() => {
                    setCaseTypeOpen(!caseTypeOpen);
                    setPriorityOpen(false);
                    setStatusOpen(false);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left flex items-center justify-between focus:outline-none focus:border-[#2F81F7] focus:ring-4 focus:ring-blue-100 text-slate-800 font-bold transition-all duration-200"
                >
                  <span>{form.case_type}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
                {caseTypeOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-100 max-h-48 overflow-y-auto">
                    {['Functional', 'UI', 'API', 'Database', 'Security', 'Performance', 'Regression', 'Smoke'].map(t => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => handleSelectCaseType(t)}
                        className={`w-full px-3.5 py-2 text-left text-xs hover:bg-slate-50 transition text-slate-700 font-bold ${form.case_type === t ? 'bg-blue-50/50 text-[#2F81F7]' : ''}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="relative">
                <label className={labelCls}>Status</label>
                <button
                  type="button"
                  onClick={() => {
                    setStatusOpen(!statusOpen);
                    setPriorityOpen(false);
                    setCaseTypeOpen(false);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left flex items-center justify-between focus:outline-none focus:border-[#2F81F7] focus:ring-4 focus:ring-blue-100 text-slate-800 font-bold transition-all duration-200"
                >
                  <span>{form.status}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
                {statusOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-100 max-h-48 overflow-y-auto">
                    {['DRAFT', 'REVIEW', 'APPROVED', 'DEPRECATED'].map(s => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => handleSelectStatus(s)}
                        className={`w-full px-3.5 py-2 text-left text-xs hover:bg-slate-50 transition text-slate-700 font-bold ${form.status === s ? 'bg-blue-50/50 text-[#2F81F7]' : ''}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className={labelCls}>Scenario / Objective</label>
              <textarea {...F('scenario')} rows={2} className={`${inputCls} resize-none`} placeholder="Objective of the test case..." />
            </div>

            <div>
              <label className={labelCls}>Preconditions</label>
              <textarea {...F('preconditions')} rows={2} className={`${inputCls} resize-none`} placeholder="Any preconditions..." />
            </div>

            <div>
              <label className={labelCls}>Test Steps *</label>
              <textarea required {...F('steps')} rows={4} className={`${inputCls} resize-none font-mono text-xs`} placeholder={"1. Open login page\n2. Enter credentials\n3. Click Login"} />
            </div>

            <div>
              <label className={labelCls}>Expected Result *</label>
              <textarea required {...F('expected_result')} rows={2} className={`${inputCls} resize-none`} placeholder="User is successfully logged in." />
            </div>

            <div>
              <label className={labelCls}>Test Data</label>
              <textarea {...F('test_data')} rows={2} className={`${inputCls} resize-none font-mono text-xs`} placeholder="username=admin, password=secret" />
            </div>
          </div>

          <div className="shrink-0 flex justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
            <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition">Cancel</button>
            <button type="submit" disabled={formSaving} className="px-5 py-2 bg-[#2F81F7] hover:bg-blue-600 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition shadow-sm flex items-center gap-1.5">
              {formSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Case'}
            </button>
          </div>
        </form>
      </div>
    )}

    {/* ── AI Test Case Generator Modal ─────────────────────────────────────────── */}
    {showAIModal && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#2F81F7]" />
              <h2 className="text-sm font-black text-slate-900">AI Test Case Generator</h2>
              <span className="text-[10px] bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full font-bold">Powered by AI</span>
            </div>
            <button onClick={() => { setShowAIModal(false); setAiGeneratedCases(null); setAiRequirement(''); setSelectedAiCaseIndices([]); setEditingAiCaseIndex(null); setAiError(null); }} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition"><X className="w-5 h-5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {aiError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-start gap-3 animate-in fade-in duration-200">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold">Operation Failed</p>
                  <p className="text-[11px] mt-0.5 text-rose-600/90 leading-relaxed font-semibold">{aiError}</p>
                </div>
                <button type="button" onClick={() => setAiError(null)} className="text-rose-500 hover:text-rose-700 text-xs font-bold self-start">Dismiss</button>
              </div>
            )}
            {!aiGeneratedCases ? (
              <>
                <div>
                  <label className={labelCls}>Target Module *</label>
                  <input value={aiModule} onChange={e => setAiModule(e.target.value)} placeholder="e.g. Authentication, Shopping Cart" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Requirements Description / Prompt *</label>
                  <textarea value={aiRequirement} onChange={e => setAiRequirement(e.target.value)} rows={6}
                    placeholder={"Describe the feature or business rules to write test cases for...\n\nExample: Admin user should be able to create a new user profile by providing name, email, and role. Email validation rules must block duplicate emails."}
                    className={`${inputCls} resize-none`} />
                </div>
                <div>
                  <label className={labelCls}>Generate Case Types</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { id: 'Positive', label: 'Positive', desc: 'Happy path scenarios', activeCls: 'border-emerald-500 bg-emerald-50/30 text-emerald-900', checkCls: 'bg-emerald-500 border-emerald-500' },
                      { id: 'Negative', label: 'Negative', desc: 'Error path scenarios', activeCls: 'border-rose-500 bg-rose-50/30 text-rose-900', checkCls: 'bg-rose-500 border-rose-500' },
                      { id: 'Boundary', label: 'Boundary', desc: 'Limit & range limits', activeCls: 'border-amber-500 bg-amber-50/30 text-amber-900', checkCls: 'bg-amber-500 border-amber-500' },
                      { id: 'Edge Case', label: 'Edge Case', desc: 'Complex conditions', activeCls: 'border-violet-500 bg-violet-50/30 text-violet-900', checkCls: 'bg-violet-500 border-violet-500' },
                    ].map(t => {
                      const isChecked = selectedAIParams.includes(t.id);
                      return (
                        <div 
                          key={t.id}
                          onClick={() => {
                            setSelectedAIParams(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id]);
                          }}
                          className={`p-3 border rounded-xl flex flex-col gap-1 cursor-pointer transition select-none ${
                            isChecked 
                              ? `${t.activeCls} shadow-sm`
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{t.label}</span>
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition shrink-0 ${
                              isChecked ? t.checkCls : 'border-slate-300 bg-white'
                            }`}>
                              {isChecked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />}
                            </div>
                          </div>
                          <span className="text-[9px] text-slate-500 leading-normal">{t.desc}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <button onClick={handleGenerateAI} disabled={aiLoading || !aiRequirement.trim() || !aiModule.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#2F81F7] to-blue-600 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl font-bold text-sm disabled:opacity-50 hover:shadow-lg hover:shadow-blue-500/20 hover:scale-[1.01] transition-all duration-200">
                  {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Generating Test Cases...</> : <><Sparkles className="w-4 h-4" />Generate Test Cases</>}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3 bg-slate-50 border border-slate-200/60 p-3 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" strokeWidth={3} />
                    <span className="text-xs font-bold text-slate-750">AI generated {aiGeneratedCases.length} test cases ({selectedAiCaseIndices.length} selected)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => {
                        if (selectedAiCaseIndices.length === aiGeneratedCases.length) {
                          setSelectedAiCaseIndices([]);
                        } else {
                          setSelectedAiCaseIndices(aiGeneratedCases.map((_, i) => i));
                        }
                      }}
                      className="text-xs font-bold text-[#2F81F7] hover:text-blue-600 transition flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm"
                    >
                      {selectedAiCaseIndices.length === aiGeneratedCases.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <button onClick={() => { setAiGeneratedCases(null); setSelectedAiCaseIndices([]); setEditingAiCaseIndex(null); setAiError(null); }} className="text-xs font-bold text-[#2F81F7] hover:underline">
                      ← Regenerate / Modify Prompt
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {aiGeneratedCases.map((tc, idx) => {
                    const isSelected = selectedAiCaseIndices.includes(idx);
                    const isEditingThis = editingAiCaseIndex === idx;

                    return (
                      <div 
                        key={idx} 
                        className={`border rounded-xl p-4 space-y-3 transition-all duration-200 ${
                          isSelected 
                            ? 'bg-blue-50/10 border-blue-200 shadow-sm ring-1 ring-blue-100' 
                            : 'bg-slate-50/50 border-slate-200/70 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 border-b border-slate-105 pb-2">
                          <div className="flex items-center gap-2.5">
                            {/* Selection Checkbox */}
                            <button
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedAiCaseIndices(prev => prev.filter(x => x !== idx));
                                } else {
                                  setSelectedAiCaseIndices(prev => [...prev, idx]);
                                }
                              }}
                              className={`w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${
                                isSelected
                                  ? 'bg-[#2F81F7] border-[#2F81F7] text-white'
                                  : 'border-slate-300 bg-white text-transparent hover:border-slate-400'
                              }`}
                            >
                              <Check className="w-2.5 h-2.5" strokeWidth={4} />
                            </button>

                            {!isEditingThis && (
                              <span className="text-[10px] px-2 py-0.5 rounded border border-blue-200 bg-blue-50/50 text-blue-700 font-bold uppercase">
                                {tc.case_type || 'Functional'}
                              </span>
                            )}

                            <span className="font-mono text-xs font-bold text-slate-500">
                              {tc.custom_id || `TC-${String(idx + 1).padStart(3, '0')}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5">
                            {!isEditingThis && (
                              <>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${getPriorityBadgeClass(tc.priority || 'P2')}`}>
                                  {tc.priority || 'P2'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingAiCaseIndex(idx);
                                    setEditingAiCaseForm({ ...tc });
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-[#2F81F7] hover:bg-slate-100 rounded-lg transition"
                                  title="Edit Test Case"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {isEditingThis ? (
                          <div className="space-y-3 pt-1">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Case Type</label>
                                <select
                                  value={editingAiCaseForm.case_type || 'Functional'}
                                  onChange={e => setEditingAiCaseForm((f: any) => ({ ...f, case_type: e.target.value }))}
                                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:border-[#2F81F7]"
                                >
                                  {['Functional', 'UI', 'API', 'Database', 'Security', 'Performance', 'Regression', 'Smoke'].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Priority</label>
                                <select
                                  value={editingAiCaseForm.priority || 'P2'}
                                  onChange={e => setEditingAiCaseForm((f: any) => ({ ...f, priority: e.target.value }))}
                                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:border-[#2F81F7]"
                                >
                                  {['P1', 'P2', 'P3', 'P4'].map(p => (
                                    <option key={p} value={p}>{p}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Scenario / Objective *</label>
                              <input
                                type="text"
                                value={editingAiCaseForm.scenario || ''}
                                onChange={e => setEditingAiCaseForm((f: any) => ({ ...f, scenario: e.target.value }))}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:border-[#2F81F7]"
                                placeholder="Scenario description..."
                              />
                            </div>

                            <div>
                              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Steps *</label>
                              <textarea
                                rows={3}
                                value={editingAiCaseForm.steps || ''}
                                onChange={e => setEditingAiCaseForm((f: any) => ({ ...f, steps: e.target.value }))}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono bg-white text-slate-800 focus:outline-none focus:border-[#2F81F7] resize-none"
                                placeholder="1. Step one..."
                              />
                            </div>

                            <div>
                              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Expected Result *</label>
                              <textarea
                                rows={2}
                                value={editingAiCaseForm.expected_result || ''}
                                onChange={e => setEditingAiCaseForm((f: any) => ({ ...f, expected_result: e.target.value }))}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:border-[#2F81F7] resize-none"
                                placeholder="Expected result description..."
                              />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => setEditingAiCaseIndex(null)}
                                className="px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!editingAiCaseForm.scenario?.trim() || !editingAiCaseForm.steps?.trim() || !editingAiCaseForm.expected_result?.trim()) {
                                    alert("Scenario, Steps, and Expected Result are required.");
                                    return;
                                  }
                                  setAiGeneratedCases(prev => {
                                    if (!prev) return null;
                                    const updated = [...prev];
                                    updated[idx] = { ...editingAiCaseForm };
                                    return updated;
                                  });
                                  setEditingAiCaseIndex(null);
                                }}
                                className="px-3 py-1.5 bg-[#2F81F7] hover:bg-blue-600 text-white text-[10px] font-bold rounded-lg transition shadow-sm"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {tc.scenario && (
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-bold">Scenario</p>
                                <p className="text-xs text-slate-700 font-semibold mt-0.5">{tc.scenario}</p>
                              </div>
                            )}
                            {tc.steps && (
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-bold">Steps</p>
                                <p className="text-xs text-slate-700 whitespace-pre-wrap font-mono text-[10px] bg-slate-50 p-2 rounded-lg border border-slate-100 mt-0.5">{tc.steps}</p>
                              </div>
                            )}
                            {tc.expected_result && (
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-bold">Expected Result</p>
                                <p className="text-xs text-slate-700 font-semibold mt-0.5">{tc.expected_result}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          {aiGeneratedCases && (
            <div className="shrink-0 flex justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <button onClick={() => { setAiGeneratedCases(null); setSelectedAiCaseIndices([]); setEditingAiCaseIndex(null); setAiError(null); }} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition">Regenerate</button>
              <button onClick={handleSaveAITestCases} disabled={formSaving} className="px-5 py-2 bg-[#2F81F7] hover:bg-blue-600 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition shadow-sm">
                {formSaving ? 'Saving...' : 'Save Test Cases'}
              </button>
            </div>
          )}
        </div>
      </div>
    )}

    {/* ── Log Bug inline modal (inside detail view) ────────────────────────────── */}
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
                  {activeTC ? `From: ${activeTC.custom_id} — ${activeTC.title}` : ''}
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
                How would you like to create the bug report for this test case?
              </p>
              <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                <button
                  onClick={handleGenerateAIBug}
                  className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-[#2F81F7] to-blue-600 text-white rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 group"
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
                <Loader2 className="w-7 h-7 text-[#2F81F7] animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-900">AI is analyzing the test case...</p>
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
                  {/* Severity */}
                  <div className="relative">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Severity</label>
                    <button
                      type="button"
                      onClick={() => {
                        setBugSeverityOpen(!bugSeverityOpen);
                        setBugPriorityOpen(false);
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left flex items-center justify-between focus:outline-none focus:border-[#2F81F7] focus:ring-4 focus:ring-blue-100 text-slate-800 font-bold transition-all duration-200 shadow-sm"
                    >
                      <span>{bugForm.severity || 'HIGH'}</span>
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                    {bugSeverityOpen && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-100 max-h-48 overflow-y-auto">
                        {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => (
                          <button
                            type="button"
                            key={s}
                            onClick={() => handleSelectBugSeverity(s)}
                            className={`w-full px-3.5 py-2 text-left text-xs hover:bg-slate-50 transition text-slate-700 font-bold ${bugForm.severity === s ? 'bg-blue-50/50 text-[#2F81F7]' : ''}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Priority */}
                  <div className="relative">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Priority</label>
                    <button
                      type="button"
                      onClick={() => {
                        setBugPriorityOpen(!bugPriorityOpen);
                        setBugSeverityOpen(false);
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left flex items-center justify-between focus:outline-none focus:border-[#2F81F7] focus:ring-4 focus:ring-blue-100 text-slate-800 font-bold transition-all duration-200 shadow-sm"
                    >
                      <span>{bugForm.priority || 'P2'}</span>
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                    {bugPriorityOpen && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-100 max-h-48 overflow-y-auto">
                        {['P1', 'P2', 'P3', 'P4'].map(p => (
                          <button
                            type="button"
                            key={p}
                            onClick={() => handleSelectBugPriority(p)}
                            className={`w-full px-3.5 py-2 text-left text-xs hover:bg-slate-50 transition text-slate-700 font-bold ${bugForm.priority === p ? 'bg-blue-50/50 text-[#2F81F7]' : ''}`}
                          >
                            {p}
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

    {/* History Modal */}
    {historyTCId && (
     <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl flex flex-col max-h-[80vh] overflow-hidden">
       <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <h3 className="font-bold text-slate-800 flex items-center gap-2"><History className="w-4 h-4" /> Version History</h3>
        <button onClick={() => setHistoryTCId(null)} className="text-slate-400 hover:text-slate-900"><X className="w-4 h-4"/></button>
       </div>
       <div className="p-5 overflow-y-auto flex-1">
        {loadingHistory ? (
         <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-[#2F81F7]" /></div>
        ) : tcHistory.length === 0 ? (
         <p className="text-center text-slate-500 text-sm">No history records found.</p>
        ) : (
         <div className="flex flex-col gap-4">
          {tcHistory.map((h, i) => (
           <div key={i} className="flex gap-4 p-4 border border-slate-200 rounded-lg bg-slate-50 relative">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">v{h.version_number}</div>
            <div>
             <p className="text-sm font-bold text-slate-800">{h.changed_by_name || 'System'}</p>
             <p className="text-xs text-slate-500 mt-0.5">{new Date(h.created_at).toLocaleString()}</p>
             {h.changes_made && (
              <div className="mt-2 p-2 bg-white border border-slate-200 rounded text-xs font-mono text-slate-600">
               {JSON.stringify(h.changes_made)}
              </div>
             )}
            </div>
           </div>
          ))}
         </div>
        )}
       </div>
      </div>
     </div>
    )}

    {tcToDelete !== null && (
     <ConfirmModal 
      title="Delete Test Case"
      message="Are you sure you want to delete this test case? This action cannot be undone."
      confirmText="Delete"
      onConfirm={handleDeleteSingle}
      onCancel={() => setTcToDelete(null)}
      danger={true}
     />
    )}

    {bulkDeleteConfirm && (
     <ConfirmModal 
      title="Bulk Delete Test Cases"
      message={`Are you sure you want to delete ${selectedIds.length} test cases? This action cannot be undone.`}
      confirmText="Delete All"
      onConfirm={handleBulkDelete}
      onCancel={() => setBulkDeleteConfirm(false)}
      danger={true}
     />
    )}

    <QACopilot />
   </div>
  );
}
