'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import Sidebar from '@/components/sidebar';
import Copilot from '@/components/copilot';
import { BarChart, Bar, PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Bug, Plus, Search, Filter, X, ChevronDown, RefreshCw,
  List, LayoutGrid, Clock, User, Tag, AlertTriangle, CheckCircle2,
  ArrowRightLeft, MessageSquare, History, Send, Trash2, Edit3,
  Sparkles, CircleDot, Loader2, TrendingUp, ShieldX, RotateCcw,
  ClipboardCheck, Lock, SkipForward, Copy, Eye, XCircle,
  GitBranch, Zap, Activity, BarChart2, ChevronRight, Bot,
  Calendar, Clock3, UserCircle, MoreHorizontal
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_STATUSES = [
  'NEW', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'FIXED',
  'READY_FOR_RETEST', 'RETESTING', 'REOPENED',
  'DEFERRED', 'REJECTED', 'DUPLICATE', 'CANNOT_REPRODUCE', 'CLOSED'
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any; dot: string }> = {
  NEW:               { label: 'New',              color: 'text-slate-300',  bg: 'bg-slate-800/60',      border: 'border-slate-600/40',  icon: CircleDot,     dot: 'bg-slate-400' },
  OPEN:              { label: 'Open',             color: 'text-blue-300',   bg: 'bg-blue-950/40',       border: 'border-blue-700/40',   icon: Bug,           dot: 'bg-blue-400' },
  ASSIGNED:          { label: 'Assigned',         color: 'text-indigo-300', bg: 'bg-indigo-950/40',     border: 'border-indigo-700/40', icon: User,          dot: 'bg-indigo-400' },
  IN_PROGRESS:       { label: 'In Progress',      color: 'text-amber-300',  bg: 'bg-amber-950/30',      border: 'border-amber-700/40',  icon: Loader2,       dot: 'bg-amber-400' },
  FIXED:             { label: 'Fixed',            color: 'text-emerald-300',bg: 'bg-emerald-950/30',    border: 'border-emerald-700/40',icon: CheckCircle2,  dot: 'bg-emerald-400' },
  READY_FOR_RETEST:  { label: 'Ready for Retest', color: 'text-cyan-300',   bg: 'bg-cyan-950/30',       border: 'border-cyan-700/40',   icon: ClipboardCheck,dot: 'bg-cyan-400' },
  RETESTING:         { label: 'Retesting',        color: 'text-purple-300', bg: 'bg-purple-950/30',     border: 'border-purple-700/40', icon: RotateCcw,     dot: 'bg-purple-400' },
  REOPENED:          { label: 'Reopened',         color: 'text-rose-300',   bg: 'bg-rose-950/30',       border: 'border-rose-700/40',   icon: GitBranch,     dot: 'bg-rose-400' },
  DEFERRED:          { label: 'Deferred',         color: 'text-orange-300', bg: 'bg-orange-950/30',     border: 'border-orange-700/40', icon: SkipForward,   dot: 'bg-orange-400' },
  REJECTED:          { label: 'Rejected',         color: 'text-red-300',    bg: 'bg-red-950/30',        border: 'border-red-700/40',    icon: XCircle,       dot: 'bg-red-400' },
  DUPLICATE:         { label: 'Duplicate',        color: 'text-gray-400',   bg: 'bg-gray-900/40',       border: 'border-gray-700/40',   icon: Copy,          dot: 'bg-gray-500' },
  CANNOT_REPRODUCE:  { label: 'Cannot Reproduce', color: 'text-yellow-300', bg: 'bg-yellow-950/30',     border: 'border-yellow-700/40', icon: ShieldX,       dot: 'bg-yellow-400' },
  CLOSED:            { label: 'Closed',           color: 'text-green-300',  bg: 'bg-green-950/30',      border: 'border-green-700/40',  icon: Lock,          dot: 'bg-green-400' },
};

const SEV_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  CRITICAL: { color: 'text-rose-300',   bg: 'bg-rose-950/40',   border: 'border-rose-700/40' },
  HIGH:     { color: 'text-orange-300', bg: 'bg-orange-950/40', border: 'border-orange-700/40' },
  MEDIUM:   { color: 'text-amber-300',  bg: 'bg-amber-950/40',  border: 'border-amber-700/40' },
  LOW:      { color: 'text-teal-300',   bg: 'bg-teal-950/40',   border: 'border-teal-700/40' },
};

const PRI_CONFIG: Record<string, { color: string; dot: string }> = {
  P1: { color: 'text-rose-400',   dot: 'bg-rose-500' },
  P2: { color: 'text-orange-400', dot: 'bg-orange-500' },
  P3: { color: 'text-amber-400',  dot: 'bg-amber-500' },
  P4: { color: 'text-teal-400',   dot: 'bg-teal-500' },
};

const KANBAN_COLS = [
  ['NEW', 'OPEN'],
  ['ASSIGNED', 'IN_PROGRESS'],
  ['FIXED', 'READY_FOR_RETEST', 'RETESTING'],
  ['REOPENED', 'CLOSED'],
  ['DEFERRED', 'REJECTED', 'DUPLICATE', 'CANNOT_REPRODUCE'],
];
const KANBAN_COL_LABELS = ['Backlog', 'In Development', 'Testing', 'Resolution', 'Other'];

const SEVERITY_PIE_COLORS = ['#f43f5e', '#f97316', '#f59e0b', '#14b8a6'];
const STATUS_CHART_COLORS: Record<string, string> = {
  NEW: '#64748b', OPEN: '#3b82f6', ASSIGNED: '#6366f1', IN_PROGRESS: '#f59e0b',
  FIXED: '#10b981', READY_FOR_RETEST: '#06b6d4', RETESTING: '#a855f7',
  REOPENED: '#f43f5e', CLOSED: '#22c55e',
};

// ─── Small components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['NEW'];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const cfg = SEV_CONFIG[severity] || SEV_CONFIG['MEDIUM'];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {severity}
    </span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const cfg = PRI_CONFIG[priority] || PRI_CONFIG['P3'];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${cfg.color}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
      {priority}
    </span>
  );
}

function Avatar({ name, size = 'sm' }: { name?: string; size?: 'sm' | 'md' }) {
  if (!name) return null;
  const sz = size === 'md' ? 'w-7 h-7 text-[11px]' : 'w-5 h-5 text-[9px]';
  const colors = ['from-violet-500 to-indigo-500', 'from-emerald-500 to-teal-500', 'from-rose-500 to-pink-500', 'from-amber-500 to-orange-500', 'from-cyan-500 to-blue-500'];
  const color = colors[(name.charCodeAt(0) || 0) % colors.length];
  return (
    <div className={`${sz} rounded-full bg-gradient-to-tr ${color} flex items-center justify-center font-bold text-white shrink-0 border border-white/10`} title={name}>
      {name[0].toUpperCase()}
    </div>
  );
}

function AgeBadge({ createdAt }: { createdAt: string }) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const h = Math.floor(ms / 3600000);
  const d = Math.floor(h / 24);
  const label = d > 0 ? `${d}d` : `${h}h`;
  const color = d > 7 ? 'text-rose-400' : d > 3 ? 'text-amber-400' : 'text-slate-500';
  return <span className={`text-[10px] font-semibold ${color}`}>{label} ago</span>;
}

// ─── Bug Card (used in Kanban) ────────────────────────────────────────────────

function BugCard({ bug, onClick }: { bug: any; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-[#0e0b16]/90 border border-slate-800/60 rounded-xl p-3.5 cursor-pointer hover:border-violet-700/40 transition-all duration-150 group active:scale-98 shadow-sm"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] font-mono text-slate-500 font-bold">{bug.custom_id}</span>
        <SeverityBadge severity={bug.severity} />
      </div>
      <p className="text-xs font-semibold text-slate-200 line-clamp-2 leading-relaxed mb-2 group-hover:text-white">{bug.title}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PriorityDot priority={bug.priority} />
          <span className="text-[10px] text-slate-600">{bug.module}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {bug.assigned_to_name && <Avatar name={bug.assigned_to_name} />}
          <AgeBadge createdAt={bug.created_at} />
        </div>
      </div>
    </div>
  );
}

// ─── Bug Row (used in List view) ─────────────────────────────────────────────

function BugRow({ bug, onClick }: { bug: any; onClick: () => void }) {
  return (
    <tr onClick={onClick} className="border-b border-slate-900/60 hover:bg-slate-900/20 cursor-pointer transition group">
      <td className="px-4 py-3 text-[10px] font-mono text-slate-500 font-bold whitespace-nowrap">{bug.custom_id}</td>
      <td className="px-4 py-3 max-w-xs">
        <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-white">{bug.title}</p>
        <p className="text-[10px] text-slate-500 truncate mt-0.5">{bug.module} · {bug.feature}</p>
      </td>
      <td className="px-4 py-3"><StatusBadge status={bug.status} /></td>
      <td className="px-4 py-3"><SeverityBadge severity={bug.severity} /></td>
      <td className="px-4 py-3"><PriorityDot priority={bug.priority} /></td>
      <td className="px-4 py-3">
        {bug.assigned_to_name ? (
          <div className="flex items-center gap-1.5">
            <Avatar name={bug.assigned_to_name} />
            <span className="text-[10px] text-slate-400 truncate max-w-[80px]">{bug.assigned_to_name}</span>
          </div>
        ) : <span className="text-[10px] text-slate-600">Unassigned</span>}
      </td>
      <td className="px-4 py-3"><AgeBadge createdAt={bug.created_at} /></td>
    </tr>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  title: '', module: '', feature: '', description: '', preconditions: '',
  steps_to_reproduce: '', expected_result: '', actual_result: '',
  severity: 'HIGH', priority: 'P2', environment: 'QA', build_version: '',
  root_cause_suggestion: '', fix_details: '', impact_analysis: '', severity_reason: '',
  tags: [] as string[],
  assigned_to: '',
};

type ViewMode = 'kanban' | 'list' | 'dashboard';

export default function BugsPage() {
  const router = useRouter();
  const {
    token, activeProject, user,
    enterpriseBugs, fetchEnterpriseBugs, createEnterpriseBug, updateEnterpriseBug,
    deleteEnterpriseBug, changeBugStatus, assignBug, addBugComment,
    getEnterpriseBug, activeBug, setActiveBug, bugDashboard, fetchBugDashboard,
    generateAIBug, searchUsers
  } = useAppStore();

  const [view, setView] = useState<ViewMode>('kanban');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history'>('details');

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // Form state
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [tagInput, setTagInput] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Status change
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [statusComment, setStatusComment] = useState('');

  // Assign
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [assignQuery, setAssignQuery] = useState('');
  const [assignResults, setAssignResults] = useState<any[]>([]);

  // Comment
  const [commentText, setCommentText] = useState('');
  const [commentSending, setCommentSending] = useState(false);

  // AI Generate
  const [aiDesc, setAiDesc] = useState('');
  const [aiModule, setAiModule] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const commentsEndRef = useRef<HTMLDivElement>(null);

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { router.push('/'); return; }
    if (activeProject) {
      fetchEnterpriseBugs(activeProject.id, {
        status: filterStatus || undefined,
        severity: filterSeverity || undefined,
        priority: filterPriority || undefined,
        search: filterSearch || undefined,
      });
      if (view === 'dashboard') fetchBugDashboard(activeProject.id);
    }
  }, [token, activeProject, filterStatus, filterSeverity, filterPriority, filterSearch, view]);

  const openBugDrawer = useCallback(async (bug: any) => {
    await getEnterpriseBug(bug.id);
    setDrawerOpen(true);
    setActiveTab('details');
    setEditMode(false);
    setShowStatusMenu(false);
    setShowAssignPanel(false);
  }, [getEnterpriseBug]);

  useEffect(() => {
    if (activeBug && drawerOpen) {
      setForm({
        title: activeBug.title || '',
        module: activeBug.module || '',
        feature: activeBug.feature || '',
        description: activeBug.description || '',
        preconditions: activeBug.preconditions || '',
        steps_to_reproduce: activeBug.steps_to_reproduce || '',
        expected_result: activeBug.expected_result || '',
        actual_result: activeBug.actual_result || '',
        severity: activeBug.severity || 'HIGH',
        priority: activeBug.priority || 'P2',
        environment: activeBug.environment || 'QA',
        build_version: activeBug.build_version || '',
        root_cause_suggestion: activeBug.root_cause_suggestion || '',
        fix_details: activeBug.fix_details || '',
        impact_analysis: activeBug.impact_analysis || '',
        severity_reason: activeBug.severity_reason || '',
        tags: activeBug.tags || [],
        assigned_to: activeBug.assigned_to || '',
      });
    }
  }, [activeBug, drawerOpen]);

  const closeDrawer = () => { setDrawerOpen(false); setActiveBug(null); setEditMode(false); };

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleCreateBug = async () => {
    if (!activeProject || !form.title || !form.module || !form.steps_to_reproduce) return;
    setFormSaving(true);
    await createEnterpriseBug({ ...form, project_id: activeProject.id });
    setShowCreateModal(false);
    setForm({ ...EMPTY_FORM });
    setFormSaving(false);
  };

  const handleUpdateBug = async () => {
    if (!activeBug) return;
    setFormSaving(true);
    await updateEnterpriseBug(activeBug.id, form);
    await getEnterpriseBug(activeBug.id);
    setEditMode(false);
    setFormSaving(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!activeBug) return;
    await changeBugStatus(activeBug.id, newStatus, statusComment);
    await getEnterpriseBug(activeBug.id);
    setShowStatusMenu(false);
    setStatusComment('');
    if (activeProject) fetchEnterpriseBugs(activeProject.id);
  };

  const handleAssignSearch = async (q: string) => {
    setAssignQuery(q);
    if (q.length < 2) { setAssignResults([]); return; }
    const results = await searchUsers(q);
    setAssignResults(results);
  };

  const handleAssign = async (user: any) => {
    if (!activeBug) return;
    await assignBug(activeBug.id, user.id, `Assigned to ${user.name}`);
    await getEnterpriseBug(activeBug.id);
    setShowAssignPanel(false);
    setAssignQuery('');
    setAssignResults([]);
  };

  const handleSendComment = async () => {
    if (!activeBug || !commentText.trim()) return;
    setCommentSending(true);
    await addBugComment(activeBug.id, commentText.trim());
    setCommentText('');
    setCommentSending(false);
    setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleGenerateAI = async () => {
    if (!activeProject || !aiDesc.trim()) return;
    setAiLoading(true);
    const result = await generateAIBug(activeProject.id, aiDesc, aiModule);
    setAiResult(result);
    setAiLoading(false);
  };

  const handleSaveAIBug = async () => {
    if (!activeProject || !aiResult) return;
    setFormSaving(true);
    await createEnterpriseBug({ ...aiResult, project_id: activeProject.id });
    setShowAIModal(false);
    setAiDesc('');
    setAiModule('');
    setAiResult(null);
    setFormSaving(false);
  };

  const handleDeleteBug = async () => {
    if (!activeBug) return;
    await deleteEnterpriseBug(activeBug.id);
    closeDrawer();
    setShowDeleteConfirm(false);
  };

  // ── Kanban groups ─────────────────────────────────────────────────────────

  const bugsByStatus = useCallback((statuses: string[]) =>
    enterpriseBugs.filter(b => statuses.includes(b.status)), [enterpriseBugs]);

  // ── Form field helper ─────────────────────────────────────────────────────

  const F = (key: string) => ({
    value: (form as any)[key],
    onChange: (e: any) => setForm(f => ({ ...f, [key]: e.target.value }))
  });

  const inputCls = 'w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition';
  const labelCls = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block';

  // ── Bug Form (shared between Create & Edit) ───────────────────────────────
  const BugFormFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Bug Title *</label>
          <input {...F('title')} placeholder="Concise description of the bug" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Module *</label>
          <input {...F('module')} placeholder="e.g. Authentication" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Feature</label>
          <input {...F('feature')} placeholder="e.g. Login Form" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Severity</label>
          <select {...F('severity')} className={`${inputCls} bg-[#0e0b16]`}>
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Priority</label>
          <select {...F('priority')} className={`${inputCls} bg-[#0e0b16]`}>
            {['P1', 'P2', 'P3', 'P4'].map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Environment</label>
          <input {...F('environment')} placeholder="e.g. QA / Staging / Prod" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Build Version</label>
          <input {...F('build_version')} placeholder="e.g. v2.3.1" className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Description</label>
          <textarea {...F('description')} rows={3} placeholder="Full bug description..." className={`${inputCls} resize-none`} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Preconditions</label>
          <textarea {...F('preconditions')} rows={2} placeholder="What must be true before reproducing..." className={`${inputCls} resize-none`} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Steps to Reproduce *</label>
          <textarea {...F('steps_to_reproduce')} rows={4} placeholder="1. Navigate to...\n2. Click on...\n3. Observe..." className={`${inputCls} resize-none`} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Expected Result</label>
          <textarea {...F('expected_result')} rows={2} placeholder="What should happen..." className={`${inputCls} resize-none`} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Actual Result</label>
          <textarea {...F('actual_result')} rows={2} placeholder="What actually happens..." className={`${inputCls} resize-none`} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Root Cause Suggestion</label>
          <textarea {...F('root_cause_suggestion')} rows={2} placeholder="Possible technical root cause..." className={`${inputCls} resize-none`} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Impact Analysis</label>
          <textarea {...F('impact_analysis')} rows={2} placeholder="User and business impact..." className={`${inputCls} resize-none`} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Tags</label>
          <div className="flex gap-2">
            <input value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) { setForm(f => ({ ...f, tags: [...f.tags, tagInput.trim()] })); setTagInput(''); e.preventDefault(); } }}
              placeholder="Type tag and press Enter" className={inputCls} />
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.tags.map((tag, i) => (
                <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-violet-950/40 border border-violet-700/40 text-violet-300 text-[10px] rounded-full font-semibold">
                  <Tag className="w-2.5 h-2.5" />{tag}
                  <button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter((_, j) => j !== i) }))}><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── Timeline item ──────────────────────────────────────────────────────────

  const TimelineItem = ({ item }: { item: any }) => {
    const actionColors: Record<string, string> = {
      CREATED: 'bg-violet-500', ASSIGNED: 'bg-indigo-500', STATUS_CHANGED: 'bg-amber-500',
      UPDATED: 'bg-slate-500', COMMENT_ADDED: 'bg-blue-500', REOPENED: 'bg-rose-500', CLOSED: 'bg-green-500',
    };
    return (
      <div className="flex gap-3 relative">
        <div className="flex flex-col items-center">
          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${actionColors[item.action] || 'bg-slate-500'}`} />
          <div className="w-px flex-1 bg-slate-800/60 mt-1" />
        </div>
        <div className="pb-4 flex-1 min-w-0">
          <p className="text-xs text-slate-300 leading-relaxed">{item.description || `${item.action?.replace(/_/g, ' ')}`}</p>
          {item.old_value && item.new_value && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-600 line-through">{item.old_value}</span>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="text-[10px] text-slate-400 font-semibold">{item.new_value}</span>
            </div>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Avatar name={item.changed_by_name} size="sm" />
            <span className="text-[10px] text-slate-500">{item.changed_by_name}</span>
            <span className="text-[10px] text-slate-600">· {new Date(item.created_at).toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  };

  // ── Dashboard ─────────────────────────────────────────────────────────────
  const renderDashboard = () => {
    const d = bugDashboard;
    if (!d) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-violet-400 animate-spin" /></div>;
    const statsCards = [
      { label: 'Total Bugs', value: d.total, icon: Bug, color: 'text-violet-400', bg: 'from-violet-950/40 to-indigo-950/30' },
      { label: 'Open', value: d.open, icon: CircleDot, color: 'text-blue-400', bg: 'from-blue-950/40 to-blue-950/20' },
      { label: 'In Progress', value: d.in_progress, icon: Loader2, color: 'text-amber-400', bg: 'from-amber-950/40 to-amber-950/20' },
      { label: 'Ready for Retest', value: d.ready_for_retest, icon: ClipboardCheck, color: 'text-cyan-400', bg: 'from-cyan-950/40 to-cyan-950/20' },
      { label: 'Reopened', value: d.reopened, icon: RotateCcw, color: 'text-rose-400', bg: 'from-rose-950/40 to-rose-950/20' },
      { label: 'Closed', value: d.closed, icon: Lock, color: 'text-green-400', bg: 'from-green-950/40 to-green-950/20' },
      { label: 'Critical', value: d.critical, icon: AlertTriangle, color: 'text-rose-300', bg: 'from-rose-950/50 to-red-950/30' },
      { label: 'Avg Resolution', value: `${d.avg_resolution_hours}h`, icon: Clock3, color: 'text-purple-400', bg: 'from-purple-950/40 to-purple-950/20' },
    ];
    return (
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statsCards.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={`bg-gradient-to-br ${s.bg} border border-slate-800/60 rounded-2xl p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{s.label}</span>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              </div>
            );
          })}
        </div>
        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Severity Distribution Pie */}
          <div className="bg-[#0e0b16]/80 border border-slate-800/60 rounded-2xl p-5">
            <h3 className="text-xs font-bold text-slate-300 mb-4 uppercase tracking-widest">Severity Distribution</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={d.severity_distribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value" nameKey="name">
                  {d.severity_distribution.map((_: any, i: number) => (
                    <Cell key={i} fill={SEVERITY_PIE_COLORS[i % SEVERITY_PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0e0b16', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {d.severity_distribution.map((s: any, i: number) => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: SEVERITY_PIE_COLORS[i] }} />
                  <span className="text-[10px] text-slate-400">{s.name} ({s.value})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Module Distribution Bar */}
          <div className="bg-[#0e0b16]/80 border border-slate-800/60 rounded-2xl p-5">
            <h3 className="text-xs font-bold text-slate-300 mb-4 uppercase tracking-widest">Module-wise Defects</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={d.module_distribution.slice(0, 6)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                <Tooltip contentStyle={{ background: '#0e0b16', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Developer Performance */}
        {d.developer_performance?.length > 0 && (
          <div className="bg-[#0e0b16]/80 border border-slate-800/60 rounded-2xl p-5">
            <h3 className="text-xs font-bold text-slate-300 mb-4 uppercase tracking-widest">Developer Performance</h3>
            <div className="space-y-3">
              {d.developer_performance.map((dev: any) => (
                <div key={dev.name} className="flex items-center gap-4">
                  <Avatar name={dev.name} size="md" />
                  <span className="text-xs text-slate-300 w-24 truncate">{dev.name}</span>
                  <div className="flex-1 bg-slate-900/60 rounded-full h-1.5">
                    <div className="bg-violet-500 h-1.5 rounded-full transition-all" style={{ width: `${dev.total_assigned ? (dev.resolved / dev.total_assigned) * 100 : 0}%` }} />
                  </div>
                  <div className="flex gap-3 text-[10px] shrink-0">
                    <span className="text-slate-400">{dev.total_assigned} assigned</span>
                    <span className="text-emerald-400">{dev.resolved} resolved</span>
                    {dev.reopened > 0 && <span className="text-rose-400">{dev.reopened} reopened</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#07050d] overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* ── Top Bar ─────────────────────────────────────────────────────── */}
        <div className="shrink-0 border-b border-slate-900 bg-[#0a0812]/50 px-5 py-3 flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-slate-900/60 border border-slate-800/60 rounded-xl p-0.5 gap-0.5">
            {[['kanban', LayoutGrid], ['list', List], ['dashboard', BarChart2]].map(([v, Icon]) => (
              <button key={v as string} onClick={() => setView(v as ViewMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${view === v ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
                <Icon className="w-3.5 h-3.5" />
                {(v as string)[0].toUpperCase() + (v as string).slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input value={filterSearch} onChange={e => setFilterSearch(e.target.value)} placeholder="Search bugs..."
              className="w-full bg-slate-900/60 border border-slate-800/60 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition" />
          </div>

          {/* Filters */}
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-slate-900/60 border border-slate-800/60 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-violet-500/60">
            <option value="">All Status</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>)}
          </select>
          <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} className="bg-slate-900/60 border border-slate-800/60 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-violet-500/60">
            <option value="">All Severity</option>
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="bg-slate-900/60 border border-slate-800/60 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-violet-500/60">
            <option value="">All Priority</option>
            {['P1', 'P2', 'P3', 'P4'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {(filterStatus || filterSeverity || filterPriority || filterSearch) && (
            <button onClick={() => { setFilterStatus(''); setFilterSeverity(''); setFilterPriority(''); setFilterSearch(''); }} className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition">
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-500">{enterpriseBugs.length} bugs</span>
            <button onClick={() => setShowAIModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-violet-500/25 transition active:scale-95">
              <Bot className="w-3.5 h-3.5" />
              AI Generate
            </button>
            <button onClick={() => { setForm({ ...EMPTY_FORM }); setShowCreateModal(true); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-violet-500/20 transition active:scale-95">
              <Plus className="w-3.5 h-3.5" />
              New Bug
            </button>
          </div>
        </div>

        {/* ── Content Area ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Dashboard View ──────────────────────────────────────────────── */}
          {view === 'dashboard' && renderDashboard()}

          {/* ── Kanban View ─────────────────────────────────────────────────── */}
          {view === 'kanban' && (
            <div className="p-4 h-full overflow-x-auto">
              <div className="flex gap-4 h-full" style={{ minWidth: `${KANBAN_COLS.length * 280}px` }}>
                {KANBAN_COLS.map((col, ci) => {
                  const bugs = bugsByStatus(col);
                  return (
                    <div key={ci} className="flex-1 min-w-[260px] max-w-[300px] flex flex-col">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <div>
                          <h3 className="text-xs font-black text-slate-300">{KANBAN_COL_LABELS[ci]}</h3>
                          <div className="flex gap-1 mt-1">
                            {col.map(s => (
                              <span key={s} className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s]?.dot || 'bg-slate-500'}`} title={STATUS_CONFIG[s]?.label} />
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-slate-600 font-bold">{bugs.length}</span>
                      </div>
                      <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
                        {bugs.length === 0 ? (
                          <div className="py-8 text-center border-2 border-dashed border-slate-900 rounded-xl">
                            <p className="text-[10px] text-slate-700">No bugs here</p>
                          </div>
                        ) : (
                          bugs.map(bug => <BugCard key={bug.id} bug={bug} onClick={() => openBugDrawer(bug)} />)
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── List View ───────────────────────────────────────────────────── */}
          {view === 'list' && (
            <div className="overflow-x-auto">
              {enterpriseBugs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Bug className="w-12 h-12 text-slate-700" />
                  <p className="text-sm text-slate-500">No bugs found</p>
                  <p className="text-xs text-slate-600">Create a bug or adjust your filters</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-900">
                      {['ID', 'Bug', 'Status', 'Severity', 'Priority', 'Assigned To', 'Age'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {enterpriseBugs.map(bug => <BugRow key={bug.id} bug={bug} onClick={() => openBugDrawer(bug)} />)}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════════
          BUG DETAIL DRAWER
      ═══════════════════════════════════════════════════════════════════════ */}
      {drawerOpen && activeBug && (
        <div className="fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={closeDrawer} />

          {/* Drawer Panel */}
          <div className="w-[840px] max-w-[90vw] h-full bg-[#0a0812] border-l border-slate-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-250">

            {/* Drawer Header */}
            <div className="shrink-0 border-b border-slate-900 px-5 py-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono text-slate-500 font-bold">{activeBug.custom_id}</span>
                  <StatusBadge status={activeBug.status} />
                  <SeverityBadge severity={activeBug.severity} />
                  <PriorityDot priority={activeBug.priority} />
                </div>
                <h2 className="text-sm font-black text-white line-clamp-1">{activeBug.title}</h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Status Change */}
                <div className="relative">
                  <button onClick={() => setShowStatusMenu(s => !s)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 text-slate-300 rounded-lg text-xs font-semibold transition">
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    Status
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showStatusMenu && (
                    <div className="absolute right-0 top-full mt-1.5 bg-[#0e0b16] border border-slate-800 rounded-xl z-50 shadow-2xl py-1 w-52 animate-in fade-in slide-in-from-top-1 duration-100">
                      <div className="px-3 pb-2 pt-1">
                        <input placeholder="Optional comment..." value={statusComment} onChange={e => setStatusComment(e.target.value)}
                          className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-2 py-1.5 text-[10px] text-white placeholder-slate-600 focus:outline-none" />
                      </div>
                      {ALL_STATUSES.map(s => (
                        <button key={s} onClick={() => handleStatusChange(s)}
                          className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-slate-800/50 transition ${activeBug.status === s ? 'opacity-50 cursor-default' : ''}`}>
                          <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s]?.dot || 'bg-slate-500'}`} />
                          <span className={STATUS_CONFIG[s]?.color}>{STATUS_CONFIG[s]?.label || s}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Assign */}
                <div className="relative">
                  <button onClick={() => setShowAssignPanel(p => !p)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 text-slate-300 rounded-lg text-xs font-semibold transition">
                    <User className="w-3.5 h-3.5" />
                    Assign
                  </button>
                  {showAssignPanel && (
                    <div className="absolute right-0 top-full mt-1.5 bg-[#0e0b16] border border-slate-800 rounded-xl z-50 shadow-2xl w-64 animate-in fade-in slide-in-from-top-1 duration-100">
                      <div className="p-3 border-b border-slate-800">
                        <input value={assignQuery} onChange={e => handleAssignSearch(e.target.value)} placeholder="Search user..."
                          className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none" />
                      </div>
                      <div className="max-h-48 overflow-y-auto py-1">
                        {assignResults.map(u => (
                          <button key={u.id} onClick={() => handleAssign(u)} className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-800/50 transition text-left">
                            <Avatar name={u.name} />
                            <div>
                              <p className="text-xs text-slate-300 font-semibold">{u.name}</p>
                              <p className="text-[10px] text-slate-600">{u.role?.replace(/_/g, ' ')}</p>
                            </div>
                          </button>
                        ))}
                        {assignQuery.length >= 2 && assignResults.length === 0 && <p className="text-xs text-slate-600 px-3 py-2 text-center">No users found</p>}
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={() => { setEditMode(e => !e); }} className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-semibold transition ${editMode ? 'bg-violet-600 border-violet-500 text-white' : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600'}`}>
                  <Edit3 className="w-3.5 h-3.5" />
                  {editMode ? 'Editing' : 'Edit'}
                </button>
                <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-lg bg-rose-950/30 border border-rose-800/30 text-rose-400 hover:bg-rose-950/50 transition">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={closeDrawer} className="p-2 rounded-lg hover:bg-slate-800/60 text-slate-400 transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Drawer Tabs */}
            <div className="shrink-0 border-b border-slate-900 flex gap-0 px-5">
              {[
                { id: 'details', label: 'Details', icon: Eye },
                { id: 'comments', label: `Comments (${activeBug.comments?.length || 0})`, icon: MessageSquare },
                { id: 'history', label: 'Timeline', icon: History },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition ${activeTab === tab.id ? 'border-violet-500 text-violet-300' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto">

              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="p-5">
                  {/* Meta info row */}
                  <div className="grid grid-cols-2 gap-4 mb-5 p-4 bg-slate-900/30 rounded-xl border border-slate-800/50">
                    <div>
                      <p className={labelCls}>Created by</p>
                      <div className="flex items-center gap-1.5">
                        <Avatar name={activeBug.created_by_name} size="md" />
                        <span className="text-xs text-slate-300">{activeBug.created_by_name || '—'}</span>
                      </div>
                    </div>
                    <div>
                      <p className={labelCls}>Assigned to</p>
                      {activeBug.assigned_to_name ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar name={activeBug.assigned_to_name} size="md" />
                          <div>
                            <span className="text-xs text-slate-300">{activeBug.assigned_to_name}</span>
                            {activeBug.assigned_to_role && <p className="text-[10px] text-slate-600">{activeBug.assigned_to_role.replace(/_/g, ' ')}</p>}
                          </div>
                        </div>
                      ) : <span className="text-xs text-slate-600">Unassigned</span>}
                    </div>
                    <div>
                      <p className={labelCls}>Created</p>
                      <span className="text-xs text-slate-400">{new Date(activeBug.created_at).toLocaleString()}</span>
                    </div>
                    <div>
                      <p className={labelCls}>Updated</p>
                      <span className="text-xs text-slate-400">{new Date(activeBug.updated_at).toLocaleString()}</span>
                    </div>
                    {activeBug.tags && activeBug.tags.length > 0 && (
                      <div className="col-span-2">
                        <p className={labelCls}>Tags</p>
                        <div className="flex flex-wrap gap-1.5">
                          {activeBug.tags.map((t: string, i: number) => (
                            <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-violet-950/40 border border-violet-700/40 text-violet-300 text-[10px] rounded-full font-semibold">
                              <Tag className="w-2.5 h-2.5" />{t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {editMode ? (
                    <div>
                      <BugFormFields />
                      <div className="flex justify-end gap-2 mt-4">
                        <button onClick={() => setEditMode(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-white">Cancel</button>
                        <button onClick={handleUpdateBug} disabled={formSaving}
                          className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold disabled:opacity-50 shadow-lg shadow-violet-500/20 transition">
                          {formSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {[
                        { label: 'Description', val: activeBug.description },
                        { label: 'Preconditions', val: activeBug.preconditions },
                        { label: 'Steps to Reproduce', val: activeBug.steps_to_reproduce },
                        { label: 'Expected Result', val: activeBug.expected_result },
                        { label: 'Actual Result', val: activeBug.actual_result },
                        { label: 'Root Cause Suggestion', val: activeBug.root_cause_suggestion },
                        { label: 'Fix Details', val: activeBug.fix_details },
                        { label: 'Impact Analysis', val: activeBug.impact_analysis },
                        { label: 'Severity Reason', val: activeBug.severity_reason },
                        { label: 'Environment', val: activeBug.environment },
                        { label: 'Build Version', val: activeBug.build_version },
                      ].filter(f => f.val).map(f => (
                        <div key={f.label}>
                          <p className={labelCls}>{f.label}</p>
                          <div className="bg-slate-900/40 rounded-lg px-3 py-2.5 border border-slate-800/50">
                            <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{f.val}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Comments Tab */}
              {activeTab === 'comments' && (
                <div className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {(activeBug.comments || []).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-2">
                        <MessageSquare className="w-8 h-8 text-slate-700" />
                        <p className="text-xs text-slate-600">No comments yet. Start the discussion.</p>
                      </div>
                    ) : (
                      activeBug.comments!.map((c: any) => {
                        const isOwn = c.author_id === user?.id;
                        const roleColors: Record<string, string> = {
                          DEVELOPER: 'text-emerald-400', QA_ENGINEER: 'text-violet-400',
                          QA_LEAD: 'text-indigo-400', ADMIN: 'text-rose-400',
                        };
                        return (
                          <div key={c.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                            <Avatar name={c.author_name} size="md" />
                            <div className={`max-w-[80%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold ${roleColors[c.author_role] || 'text-slate-400'}`}>{c.author_name}</span>
                                <span className="text-[10px] text-slate-600">{new Date(c.created_at).toLocaleTimeString()}</span>
                              </div>
                              <div className={`px-3.5 py-2.5 rounded-2xl text-xs text-slate-200 leading-relaxed ${isOwn ? 'bg-violet-950/50 border border-violet-700/30 rounded-tr-sm' : 'bg-slate-900/60 border border-slate-800/60 rounded-tl-sm'}`}>
                                {c.content}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={commentsEndRef} />
                  </div>
                  {/* Comment Input */}
                  <div className="shrink-0 border-t border-slate-900 p-4 flex gap-3 items-end">
                    <Avatar name={user?.name} size="md" />
                    <div className="flex-1 flex gap-2">
                      <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                        placeholder="Add a comment... (Enter to send, Shift+Enter for new line)"
                        className="flex-1 bg-slate-900/60 border border-slate-700/60 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 resize-none h-[64px] transition" />
                      <button onClick={handleSendComment} disabled={!commentText.trim() || commentSending}
                        className="self-end px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl flex items-center gap-1.5 text-xs font-bold disabled:opacity-40 shadow-lg shadow-violet-500/20 transition">
                        {commentSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* History / Timeline Tab */}
              {activeTab === 'history' && (
                <div className="p-5">
                  {(activeBug.history || []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                      <History className="w-8 h-8 text-slate-700" />
                      <p className="text-xs text-slate-600">No history recorded yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-0">
                      {activeBug.history!.map((item: any) => <TimelineItem key={item.id} item={item} />)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          CREATE BUG MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0b16] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-900">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-violet-400" />
                <h2 className="text-sm font-black text-white">Create New Bug</h2>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <BugFormFields />
            </div>
            <div className="shrink-0 flex justify-end gap-2 px-6 py-4 border-t border-slate-900">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white">Cancel</button>
              <button onClick={handleCreateBug} disabled={formSaving || !form.title || !form.module}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-violet-500/20 disabled:opacity-50 transition">
                {formSaving ? 'Creating...' : 'Create Bug'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          AI GENERATE MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0b16] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-900">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-violet-400" />
                <h2 className="text-sm font-black text-white">AI Bug Generator</h2>
                <span className="text-[10px] bg-violet-950/40 border border-violet-700/40 text-violet-300 px-2 py-0.5 rounded-full font-bold">Powered by AI</span>
              </div>
              <button onClick={() => { setShowAIModal(false); setAiResult(null); setAiDesc(''); }} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {!aiResult ? (
                <>
                  <div>
                    <label className={labelCls}>Module (optional)</label>
                    <input value={aiModule} onChange={e => setAiModule(e.target.value)} placeholder="e.g. Login, Payment, Dashboard"
                      className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60" />
                  </div>
                  <div>
                    <label className={labelCls}>Problem Description *</label>
                    <textarea value={aiDesc} onChange={e => setAiDesc(e.target.value)} rows={8}
                      placeholder="Describe the bug or problem in natural language...\n\nExample: When a user logs in with valid credentials on the mobile app, the session expires after 30 seconds instead of the expected 30 minutes, forcing the user to login again repeatedly."
                      className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 resize-none" />
                  </div>
                  <button onClick={handleGenerateAI} disabled={aiLoading || !aiDesc.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-violet-500/25 disabled:opacity-50 transition">
                    {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4" />Generate Bug Report</>}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-400">AI generated bug report ready</span>
                    </div>
                    <button onClick={() => setAiResult(null)} className="text-xs text-slate-500 hover:text-slate-300">← Try again</button>
                  </div>
                  {/* Preview cards */}
                  <div className="space-y-3 bg-slate-900/30 rounded-xl p-4 border border-slate-800/50">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SeverityBadge severity={aiResult.severity} />
                      <PriorityDot priority={aiResult.priority} />
                      <span className="text-xs text-slate-400">{aiResult.module}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{aiResult.title}</h3>
                    {[
                      { label: 'Description', val: aiResult.description },
                      { label: 'Steps to Reproduce', val: aiResult.steps_to_reproduce },
                      { label: 'Expected', val: aiResult.expected_result },
                      { label: 'Actual', val: aiResult.actual_result },
                      { label: 'Root Cause', val: aiResult.root_cause_suggestion },
                    ].filter(f => f.val).map(f => (
                      <div key={f.label}>
                        <p className={labelCls}>{f.label}</p>
                        <p className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed">{f.val}</p>
                      </div>
                    ))}
                    {aiResult.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {aiResult.tags.map((t: string, i: number) => (
                          <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-violet-950/40 border border-violet-700/40 text-violet-300 text-[10px] rounded-full font-semibold">
                            <Tag className="w-2.5 h-2.5" />{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            {aiResult && (
              <div className="shrink-0 flex justify-end gap-2 px-6 py-4 border-t border-slate-900">
                <button onClick={() => setAiResult(null)} className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white">Regenerate</button>
                <button onClick={handleSaveAIBug} disabled={formSaving}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-violet-500/20 disabled:opacity-50 transition">
                  {formSaving ? 'Saving...' : 'Save Bug Report'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0b16] border border-rose-900/50 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-950/40 border border-rose-800/40 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white">Delete Bug?</h2>
                <p className="text-xs text-slate-400 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white">Cancel</button>
              <button onClick={handleDeleteBug} className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition">Delete</button>
            </div>
          </div>
        </div>
      )}

      <Copilot />
    </div>
  );
}
