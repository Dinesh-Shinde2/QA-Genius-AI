'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import Sidebar from '@/components/sidebar';
import Copilot from '@/components/copilot';
import {
 Users, Plus, X, Search, Trash2, Edit3, CheckCircle,
 UserPlus, FolderOpen, Shield, Code2, Layers3, Briefcase,
 Crown, UserCheck, ChevronRight, AlertTriangle
} from 'lucide-react';

const TEAM_TYPE_OPTIONS = ['QA', 'DEVELOPER', 'MIXED'];

const ROLE_COLORS: Record<string, string> = {
 ADMIN: 'text-rose-400 bg-rose-950/30 border-rose-800/50',
 QA_LEAD: 'text-[#2F81F7] bg-blue-950/30 border-blue-800/50',
 QA_ENGINEER: 'text-slate-500 bg-slate-50/30 border-slate-200/50',
 DEVELOPER: 'text-emerald-400 bg-emerald-950/30 border-emerald-800/50',
 TECH_LEAD: 'text-slate-500 bg-slate-50/30 border-slate-200/50',
 PRODUCT_MANAGER: 'text-amber-400 bg-amber-950/30 border-amber-800/50',
 AUTOMATION_ENGINEER: 'text-orange-400 bg-orange-950/30 border-orange-800/50',
};

const ROLE_ICONS: Record<string, any> = {
 ADMIN: Crown,
 QA_LEAD: Shield,
 QA_ENGINEER: CheckCircle,
 DEVELOPER: Code2,
 TECH_LEAD: Layers3,
 PRODUCT_MANAGER: Briefcase,
 AUTOMATION_ENGINEER: Code2,
};

function TeamTypeTag({ type }: { type: string }) {
 const map: Record<string, string> = {
  QA: 'text-[#2F81F7] bg-blue-950/25 border-blue-700/30',
  DEVELOPER: 'text-emerald-400 bg-emerald-950/25 border-emerald-700/30',
  MIXED: 'text-slate-500 bg-slate-50/25 border-slate-700/30',
 };
 return (
  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${map[type] || 'text-slate-500 bg-white/40 border-slate-700/30'}`}>
   {type}
  </span>
 );
}

function Avatar({ name, role, size = 'sm' }: { name: string; role?: string; size?: 'sm' | 'md' | 'lg' }) {
 const sz = size === 'lg' ? 'w-10 h-10 text-sm' : size === 'md' ? 'w-8 h-8 text-xs' : 'w-6 h-6 text-[10px]';
 const colors = ['from-blue-500 to-slate-500', 'from-emerald-500 to-teal-500', 'from-rose-500 to-pink-500', 'from-amber-500 to-orange-500', 'from-slate-500 to-blue-500'];
 const color = colors[(name.charCodeAt(0) || 0) % colors.length];
 return (
  <div className={`${sz} rounded-full bg-gradient-to-tr ${color} flex items-center justify-center font-bold text-slate-900 shrink-0 border border-black/5`} title={name}>
   {name?.[0]?.toUpperCase() || '?'}
  </div>
 );
}

export default function TeamsPage() {
 const router = useRouter();
 const {
  token, activeProject, projects,
  teams, fetchTeams, createTeam, updateTeam, deleteTeam,
  addTeamMember, removeTeamMember, getTeam, searchUsers, assignTeamToProject
 } = useAppStore();

 const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
 const [teamDetail, setTeamDetail] = useState<any | null>(null);
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [showAddMemberModal, setShowAddMemberModal] = useState(false);
 const [showEditModal, setShowEditModal] = useState(false);
 const [showAssignProjectModal, setShowAssignProjectModal] = useState(false);
 const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
 const [selectedProjectId, setSelectedProjectId] = useState<string>('');

 const [newTeamName, setNewTeamName] = useState('');
 const [newTeamDesc, setNewTeamDesc] = useState('');
 const [newTeamType, setNewTeamType] = useState('MIXED');
 const [editName, setEditName] = useState('');
 const [editDesc, setEditDesc] = useState('');
 const [editType, setEditType] = useState('MIXED');

 const [userQuery, setUserQuery] = useState('');
 const [userResults, setUserResults] = useState<any[]>([]);
 const [searchingUsers, setSearchingUsers] = useState(false);
 const [savingMember, setSavingMember] = useState(false);
 const [saving, setSaving] = useState(false);

 useEffect(() => {
  if (!token) { router.push('/'); return; }
  fetchTeams();
 }, [token, router, fetchTeams]);

 const loadTeamDetail = useCallback(async (teamId: string) => {
  const detail = await getTeam(teamId);
  setTeamDetail(detail);
 }, [getTeam]);

 useEffect(() => {
  if (selectedTeam) loadTeamDetail(selectedTeam.id);
 }, [selectedTeam, loadTeamDetail]);

 const handleSearchUsers = async (q: string) => {
  setUserQuery(q);
  if (q.length < 2) { setUserResults([]); return; }
  setSearchingUsers(true);
  const results = await searchUsers(q);
  setUserResults(results);
  setSearchingUsers(false);
 };

 const handleCreateTeam = async () => {
  if (!newTeamName.trim()) return;
  setSaving(true);
  await createTeam({ name: newTeamName, description: newTeamDesc, team_type: newTeamType });
  setNewTeamName(''); setNewTeamDesc(''); setNewTeamType('MIXED');
  setShowCreateModal(false);
  setSaving(false);
 };

 const handleEditTeam = async () => {
  if (!selectedTeam) return;
  setSaving(true);
  await updateTeam(selectedTeam.id, { name: editName, description: editDesc, team_type: editType });
  setShowEditModal(false);
  await loadTeamDetail(selectedTeam.id);
  await fetchTeams();
  setSaving(false);
 };

 const handleDeleteTeam = async (id: string) => {
  await deleteTeam(id);
  setShowDeleteConfirm(null);
  setSelectedTeam(null);
  setTeamDetail(null);
 };

 const handleAddMember = async (user: any) => {
  if (!selectedTeam) return;
  setSavingMember(true);
  await addTeamMember(selectedTeam.id, user.id, user.role);
  await loadTeamDetail(selectedTeam.id);
  setUserQuery(''); setUserResults([]);
  setShowAddMemberModal(false);
  setSavingMember(false);
 };

 const handleRemoveMember = async (userId: string) => {
  if (!selectedTeam) return;
  await removeTeamMember(selectedTeam.id, userId);
  await loadTeamDetail(selectedTeam.id);
 };

 const handleAssignProject = async () => {
  if (!selectedTeam || !selectedProjectId) return;
  setSaving(true);
  await assignTeamToProject(selectedTeam.id, selectedProjectId);
  await loadTeamDetail(selectedTeam.id);
  setShowAssignProjectModal(false);
  setSelectedProjectId('');
  setSaving(false);
 };

 return (
  <div className="flex min-min-h-screen bg-slate-50">
   <Sidebar />
   <main className="flex-1 flex overflow-hidden">

    {/* ─── Teams List Panel ─────────────────────────────── */}
    <div className="w-80 border-r border-slate-200 flex flex-col shrink-0">
     <div className="p-4 border-b border-slate-200">
      <div className="flex items-center justify-between mb-3">
       <div>
        <h1 className="text-sm font-bold text-slate-900">Teams</h1>
        <p className="text-[10px] text-slate-500 mt-0.5">{teams.length} team{teams.length !== 1 ? 's' : ''} configured</p>
       </div>
       <button
        onClick={() => setShowCreateModal(true)}
        className="flex items-center gap-1.5 px-3 py-2 bg-[#2F81F7] hover:bg-[#2F81F7] text-slate-900 rounded-lg text-xs font-bold transition active:scale-95"
       >
        <Plus className="w-3.5 h-3.5" />
        New Team
       </button>
      </div>
     </div>

     <div className="flex-1 overflow-y-auto p-3 space-y-2">
      {teams.length === 0 ? (
       <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-14 h-14 rounded-2xl bg-blue-950/30 border border-blue-800/30 flex items-center justify-center">
         <Users className="w-6 h-6 text-[#2F81F7]" />
        </div>
        <p className="text-xs text-slate-500 text-center">No teams yet.<br />Create your first team.</p>
       </div>
      ) : (
       teams.map((team) => (
        <button
         key={team.id}
         onClick={() => setSelectedTeam(team)}
         className={`w-full text-left p-3.5 rounded-xl border transition-all duration-150 ${
          selectedTeam?.id === team.id
           ? 'bg-blue-950/20 border-blue-700/40 shadow-inner'
           : 'bg-white/60 border-slate-200/50 hover:border-slate-700/60 hover:bg-white/20'
         }`}
        >
         <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
           <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            team.team_type === 'QA' ? 'bg-blue-950/40 border border-blue-700/30' :
            team.team_type === 'DEVELOPER' ? 'bg-emerald-950/40 border border-emerald-700/30' :
            'bg-slate-50/40 border border-slate-700/30'
           }`}>
            <Users className={`w-4 h-4 ${
             team.team_type === 'QA' ? 'text-[#2F81F7]' :
             team.team_type === 'DEVELOPER' ? 'text-emerald-400' : 'text-slate-500'
            }`} />
           </div>
           <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">{team.name}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{team.member_count || 0} members</p>
           </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
           <TeamTypeTag type={team.team_type} />
           <ChevronRight className="w-3 h-3 text-slate-600" />
          </div>
         </div>
         {team.description && (
          <p className="text-[10px] text-slate-500 mt-2 line-clamp-1">{team.description}</p>
         )}
        </button>
       ))
      )}
     </div>
    </div>

    {/* ─── Team Detail Panel ───────────────────────────── */}
    <div className="flex-1 flex flex-col pt-14 md:pt-0 overflow-x-hidden overflow-hidden">
     {!selectedTeam ? (
      <div className="flex-1 flex items-center justify-center">
       <div className="text-center">
        <div className="w-20 h-20 rounded-3xl bg-blue-950/20 border border-blue-800/20 flex items-center justify-center mx-auto mb-4">
         <Users className="w-9 h-9 text-[#2F81F7]/50" />
        </div>
        <h3 className="text-sm font-bold text-slate-500">Select a team</h3>
        <p className="text-xs text-slate-600 mt-1">Choose a team from the left panel to view members and manage settings.</p>
       </div>
      </div>
     ) : (
      <>
       {/* Team Header */}
       <div className="p-6 border-b border-slate-200 bg-slate-50/50">
        <div className="flex items-start justify-between">
         <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
           teamDetail?.team_type === 'QA' ? 'bg-blue-950/50 border border-blue-700/40' :
           teamDetail?.team_type === 'DEVELOPER' ? 'bg-emerald-950/50 border border-emerald-700/40' :
           'bg-slate-50/50 border border-slate-700/40'
          }`}>
           <Users className={`w-6 h-6 ${
            teamDetail?.team_type === 'QA' ? 'text-[#2F81F7]' :
            teamDetail?.team_type === 'DEVELOPER' ? 'text-emerald-400' : 'text-slate-500'
           }`} />
          </div>
          <div>
           <h2 className="text-base font-black text-slate-900">{teamDetail?.name || selectedTeam.name}</h2>
           <div className="flex items-center gap-2 mt-1">
            <TeamTypeTag type={teamDetail?.team_type || selectedTeam.team_type} />
            <span className="text-[10px] text-slate-500">{teamDetail?.members?.length || 0} members</span>
            {activeProject && (
             <span className="text-[10px] text-slate-600">• {activeProject.name}</span>
            )}
           </div>
           {teamDetail?.description && (
            <p className="text-xs text-slate-500 mt-1.5">{teamDetail.description}</p>
           )}
          </div>
         </div>
         <div className="flex items-center gap-2">
          <button
           onClick={() => {
            setEditName(teamDetail?.name || '');
            setEditDesc(teamDetail?.description || '');
            setEditType(teamDetail?.team_type || 'MIXED');
            setShowEditModal(true);
           }}
           className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 text-slate-700 rounded-lg text-xs font-semibold transition"
          >
           <Edit3 className="w-3.5 h-3.5" />
           Edit
          </button>
          <button
           onClick={() => setShowAddMemberModal(true)}
           className="flex items-center gap-1.5 px-3 py-2 bg-[#2F81F7] hover:bg-[#2F81F7] text-slate-900 rounded-lg text-xs font-bold transition"
          >
           <UserPlus className="w-3.5 h-3.5" />
           Add Member
          </button>
          <button
           onClick={() => setShowDeleteConfirm(selectedTeam.id)}
           className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/30 hover:bg-rose-950/50 border border-rose-800/30 text-rose-400 rounded-lg text-xs font-semibold transition"
          >
           <Trash2 className="w-3.5 h-3.5" />
          </button>
         </div>
        </div>
       </div>

       {/* Members Grid */}
       <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
         <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Team Members</h3>
         <span className="text-xs text-slate-500">{teamDetail?.members?.length || 0} people</span>
        </div>

        {!teamDetail?.members?.length ? (
         <div className="flex flex-col items-center justify-center py-16 gap-3">
          <UserPlus className="w-10 h-10 text-slate-700" />
          <p className="text-xs text-slate-500">No members yet. Add team members to get started.</p>
         </div>
        ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {teamDetail.members.map((member: any) => {
           const RoleIcon = ROLE_ICONS[member.role_in_team || member.role] || UserCheck;
           const roleColor = ROLE_COLORS[member.role_in_team || member.role] || 'text-slate-500 bg-white/40 border-slate-700/30';
           return (
            <div key={member.id} className="bg-white/80 border border-slate-200/60 rounded-xl p-4 flex items-start gap-3 hover:border-slate-700/60 transition group">
             <Avatar name={member.name} role={member.role} size="lg" />
             <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{member.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{member.email}</p>
              <div className="mt-2">
               <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleColor}`}>
                <RoleIcon className="w-2.5 h-2.5" />
                {(member.role_in_team || member.role)?.replace(/_/g, ' ')}
               </span>
              </div>
             </div>
             <button
              onClick={() => handleRemoveMember(member.id)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-950/40 text-rose-500 transition"
              title="Remove member"
             >
              <X className="w-3.5 h-3.5" />
             </button>
            </div>
           );
          })}
         </div>
        )}

        {/* Linked Projects */}
        <div className="mt-8">
         <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Linked Projects</h3>
          <button
           onClick={() => setShowAssignProjectModal(true)}
           className="flex items-center gap-1.5 px-2 py-1 bg-[#2F81F7]/20 hover:bg-[#2F81F7]/40 text-blue-300 rounded-md text-[10px] font-bold border border-[#2F81F7]/30 transition"
          >
           <Plus className="w-3 h-3" />
           Assign Project
          </button>
         </div>
         {teamDetail?.projects?.length > 0 ? (
          <div className="flex flex-wrap gap-2">
           {teamDetail.projects.map((p: any) => (
            <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-white/40 border border-slate-200/60 rounded-lg text-xs text-slate-700">
             <FolderOpen className="w-3.5 h-3.5 text-[#2F81F7]" />
             {p.name}
            </div>
           ))}
          </div>
         ) : (
          <div className="text-xs text-slate-500 italic py-2">No projects assigned to this team.</div>
         )}
        </div>
       </div>
      </>
     )}
    </div>
   </main>

   {/* ─── Create Team Modal ─────────────────────────────────────────── */}
   {showCreateModal && (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
     <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between mb-5">
       <h2 className="text-base font-black text-slate-900">Create New Team</h2>
       <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-500"><X className="w-4 h-4" /></button>
      </div>
      <div className="space-y-4">
       <div>
        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Team Name *</label>
        <input type="text" placeholder="e.g. QA Alpha Squad" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)}
         className="w-full bg-white/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:border-[#2F81F7]/60" />
       </div>
       <div>
        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Description</label>
        <textarea placeholder="Team purpose and responsibilities..." value={newTeamDesc} onChange={(e) => setNewTeamDesc(e.target.value)}
         className="w-full bg-white/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:border-[#2F81F7]/60 h-20 resize-none" />
       </div>
       <div>
        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Team Type</label>
        <div className="flex gap-2">
         {TEAM_TYPE_OPTIONS.map((t) => (
          <button key={t} onClick={() => setNewTeamType(t)}
           className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${newTeamType === t ? 'bg-[#2F81F7] border-[#2F81F7] text-slate-900' : 'bg-white/40 border-slate-700/50 text-slate-500 hover:border-slate-600'}`}>
           {t}
          </button>
         ))}
        </div>
       </div>
      </div>
      <div className="flex justify-end gap-2 mt-6">
       <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900">Cancel</button>
       <button onClick={handleCreateTeam} disabled={saving || !newTeamName.trim()}
        className="px-5 py-2 bg-[#2F81F7] hover:bg-[#2F81F7] text-slate-900 rounded-lg text-xs font-bold disabled:opacity-50 transition">
        {saving ? 'Creating...' : 'Create Team'}
       </button>
      </div>
     </div>
    </div>
   )}

   {/* ─── Edit Team Modal ─────────────────────────────────────────────── */}
   {showEditModal && (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
     <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between mb-5">
       <h2 className="text-base font-black text-slate-900">Edit Team</h2>
       <button onClick={() => setShowEditModal(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-500"><X className="w-4 h-4" /></button>
      </div>
      <div className="space-y-4">
       <div>
        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Team Name</label>
        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
         className="w-full bg-white/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#2F81F7]/60" />
       </div>
       <div>
        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Description</label>
        <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
         className="w-full bg-white/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#2F81F7]/60 h-20 resize-none" />
       </div>
       <div>
        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Team Type</label>
        <div className="flex gap-2">
         {TEAM_TYPE_OPTIONS.map((t) => (
          <button key={t} onClick={() => setEditType(t)}
           className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${editType === t ? 'bg-[#2F81F7] border-[#2F81F7] text-slate-900' : 'bg-white/40 border-slate-700/50 text-slate-500 hover:border-slate-600'}`}>
           {t}
          </button>
         ))}
        </div>
       </div>
      </div>
      <div className="flex justify-end gap-2 mt-6">
       <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900">Cancel</button>
       <button onClick={handleEditTeam} disabled={saving}
        className="px-5 py-2 bg-[#2F81F7] hover:bg-[#2F81F7] text-slate-900 rounded-lg text-xs font-bold disabled:opacity-50 transition">
        {saving ? 'Saving...' : 'Save Changes'}
       </button>
      </div>
     </div>
    </div>
   )}

   {/* ─── Add Member Modal ─────────────────────────────────────────────── */}
   {showAddMemberModal && (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
     <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between mb-5">
       <h2 className="text-base font-black text-slate-900">Add Team Member</h2>
       <button onClick={() => { setShowAddMemberModal(false); setUserQuery(''); setUserResults([]); }} className="p-2 rounded-lg hover:bg-slate-800 text-slate-500"><X className="w-4 h-4" /></button>
      </div>
      <div className="relative">
       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
       <input
        type="text"
        placeholder="Search by name or email..."
        value={userQuery}
        onChange={(e) => handleSearchUsers(e.target.value)}
        className="w-full bg-white/60 border border-slate-700/60 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:border-[#2F81F7]/60"
       />
      </div>
      <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
       {searchingUsers && <p className="text-xs text-slate-500 text-center py-4">Searching...</p>}
       {!searchingUsers && userQuery.length >= 2 && userResults.length === 0 && (
        <p className="text-xs text-slate-500 text-center py-4">No users found for "{userQuery}"</p>
       )}
       {userResults.map((u) => {
        const isAlreadyMember = teamDetail?.members?.some((m: any) => m.id === u.id);
        return (
         <div key={u.id} className={`flex items-center gap-3 p-3 rounded-xl border transition ${isAlreadyMember ? 'border-slate-200/30 opacity-50' : 'border-slate-200/60 hover:border-blue-700/40 hover:bg-blue-950/10 cursor-pointer'}`}
          onClick={() => !isAlreadyMember && handleAddMember(u)}>
          <Avatar name={u.name} size="md" />
          <div className="flex-1 min-w-0">
           <p className="text-xs font-bold text-slate-800">{u.name}</p>
           <p className="text-[10px] text-slate-500">{u.email}</p>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ROLE_COLORS[u.role] || 'text-slate-500 bg-white/40 border-slate-700/30'}`}>
           {u.role?.replace(/_/g, ' ')}
          </span>
          {isAlreadyMember && <span className="text-[10px] text-slate-500">Added</span>}
         </div>
        );
       })}
      </div>
      <p className="text-[10px] text-slate-600 mt-3">Type at least 2 characters to search platform users</p>
     </div>
    </div>
   )}

   {/* ─── Delete Confirm ─────────────────────────────────────────────── */}
   {showDeleteConfirm && (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
     <div className="bg-white border border-rose-900/50 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center gap-3 mb-4">
       <div className="w-10 h-10 rounded-xl bg-rose-950/40 border border-rose-800/40 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 text-rose-400" />
       </div>
       <div>
        <h2 className="text-sm font-black text-slate-900">Delete Team?</h2>
        <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
       </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
       <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900">Cancel</button>
       <button onClick={() => handleDeleteTeam(showDeleteConfirm)}
        className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-slate-900 rounded-lg text-xs font-bold transition">
        Delete Team
       </button>
      </div>
     </div>
    </div>
   )}

   {/* ─── Assign Project Modal ─────────────────────────────────────────── */}
   {showAssignProjectModal && (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
     <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between mb-5">
       <h2 className="text-base font-black text-slate-900">Assign Team to Project</h2>
       <button onClick={() => setShowAssignProjectModal(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-500"><X className="w-4 h-4" /></button>
      </div>
      <div className="space-y-4">
       <div>
        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Select Project</label>
        <select
         value={selectedProjectId}
         onChange={(e) => setSelectedProjectId(e.target.value)}
         className="w-full bg-white/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#2F81F7]/60"
        >
         <option value="" disabled>Choose a project...</option>
         {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
         ))}
        </select>
       </div>
      </div>
      <div className="flex justify-end gap-2 mt-6">
       <button onClick={() => setShowAssignProjectModal(false)} className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900">Cancel</button>
       <button onClick={handleAssignProject} disabled={saving || !selectedProjectId}
        className="px-5 py-2 bg-[#2F81F7] hover:bg-[#2F81F7] text-slate-900 rounded-lg text-xs font-bold disabled:opacity-50 transition">
        {saving ? 'Assigning...' : 'Assign Project'}
       </button>
      </div>
     </div>
    </div>
   )}

   <Copilot />
  </div>
 );
}
