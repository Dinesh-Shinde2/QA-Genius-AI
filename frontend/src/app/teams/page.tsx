'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import Sidebar from '@/components/sidebar';
import Copilot from '@/components/copilot';
import {
  Users, Plus, X, Search, Trash2, Edit3, CheckCircle,
  UserPlus, Shield, Code2, Layers3, Briefcase,
  Crown, UserCheck, Mail, ShieldAlert, AlertCircle
} from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  ADMIN: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  QA_LEAD: 'text-[#2F81F7] bg-blue-500/10 border-blue-500/20',
  QA_ENGINEER: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  DEVELOPER: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

const ROLE_ICONS: Record<string, any> = {
  OWNER: Crown,
  ADMIN: ShieldAlert,
  QA_LEAD: Shield,
  QA_ENGINEER: CheckCircle,
  DEVELOPER: Code2,
};

const ROLE_OPTIONS = [
  { value: 'QA_ENGINEER', label: 'QA Engineer' },
  { value: 'QA_LEAD', label: 'QA Lead' },
  { value: 'DEVELOPER', label: 'Developer' },
  { value: 'ADMIN', label: 'Admin / Manager' }
];

function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
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
    token, activeProject, projects, setActiveProject,
    projectMembers, fetchProjectMembers, addProjectMember,
    updateProjectMemberRole, removeProjectMember, user: currentUser
  } = useAppStore();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('QA_ENGINEER');
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [editRole, setEditRole] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load project members on mount or active project change
  useEffect(() => {
    if (!token) {
      router.push('/');
      return;
    }
    if (activeProject) {
      setLoading(true);
      fetchProjectMembers(activeProject.id).then(() => setLoading(false));
    }
  }, [token, activeProject, fetchProjectMembers, router]);

  // Determine if the current user is authorized to perform admin actions (is project owner or has ADMIN/QA_LEAD role)
  const isUserAdmin = () => {
    if (!activeProject || !currentUser) return false;
    if (activeProject.user_id === currentUser.id) return true;
    
    const memberRecord = projectMembers.find(m => m.id === currentUser.id);
    return memberRecord && (memberRecord.role === 'ADMIN' || memberRecord.role === 'QA_LEAD');
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeProject) return;

    setLoading(true);
    setStatusMsg(null);
    setErrorMsg(null);

    const success = await addProjectMember(activeProject.id, inviteEmail.trim(), inviteRole);
    setLoading(false);

    if (success) {
      setStatusMsg(`Successfully added user to project!`);
      setInviteEmail('');
      setInviteRole('QA_ENGINEER');
      setShowInviteModal(false);
      setTimeout(() => setStatusMsg(null), 4000);
    } else {
      setErrorMsg('Failed to invite member. Make sure the email is registered on the platform.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingMember || !activeProject) return;

    setLoading(true);
    const success = await updateProjectMemberRole(activeProject.id, editingMember.id, editRole);
    setLoading(false);

    if (success) {
      setEditingMember(null);
      setStatusMsg('Member role updated successfully.');
      setTimeout(() => setStatusMsg(null), 4000);
    } else {
      setErrorMsg('Failed to update member role.');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeProject) return;
    if (!confirm('Are you sure you want to remove this member from the project?')) return;

    setLoading(true);
    const success = await removeProjectMember(activeProject.id, userId);
    setLoading(false);

    if (success) {
      setStatusMsg('Member removed from project.');
      setTimeout(() => setStatusMsg(null), 4000);
    } else {
      setErrorMsg('Failed to remove member.');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  return (
    <div className="flex h-screen bg-[#0d1117] text-[#c9d1d9] overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-y-auto">
        <header className="border-b border-[#30363d] px-6 py-4 flex items-center justify-between bg-[#161b22]">
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Project Teams
            </h1>
            <p className="text-xs text-[#8b949e]">Invite collaborators and manage roles for your active project.</p>
          </div>

          {activeProject && isUserAdmin() && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-blue-900/10"
            >
              <UserPlus className="w-4 h-4" />
              Invite Member
            </button>
          )}
        </header>

        <main className="p-6 max-w-6xl w-full mx-auto flex-1">
          {/* Status Messages */}
          {statusMsg && (
            <div className="mb-4 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-xl text-xs flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              {statusMsg}
            </div>
          )}
          {errorMsg && (
            <div className="mb-4 bg-rose-950/40 border border-rose-500/30 text-rose-400 p-3.5 rounded-xl text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* If No Project Selected */}
          {!activeProject ? (
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4 max-w-xl mx-auto mt-12 shadow-xl">
              <div className="w-16 h-16 bg-blue-950/40 border border-blue-500/30 text-blue-400 rounded-full flex items-center justify-center mb-2">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-base font-black text-white">No Active Project Selected</h2>
                <p className="text-xs text-[#8b949e] mt-1.5">
                  Select a project from the list below to manage its team members and invite collaborators.
                </p>
              </div>
              <div className="w-full max-w-xs mt-2">
                <select
                  value={activeProject?.id || ''}
                  onChange={(e) => {
                    const proj = projects.find(p => p.id === e.target.value);
                    if (proj) setActiveProject(proj);
                  }}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-xs text-[#c9d1d9] focus:outline-none focus:border-blue-500"
                >
                  <option value="" disabled>Choose a project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Project summary card */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block mb-1">Active Project</span>
                  <h2 className="text-base font-black text-white">{activeProject.name}</h2>
                  <p className="text-xs text-[#8b949e] mt-1 line-clamp-2">{activeProject.description || 'No description provided.'}</p>
                </div>
                <div className="shrink-0 flex items-center gap-3 text-xs bg-[#0d1117] border border-[#30363d] rounded-xl px-4 py-3">
                  <div className="text-right">
                    <span className="text-[10px] text-[#8b949e] uppercase font-bold block">Total Members</span>
                    <span className="text-sm font-black text-white">{projectMembers.length}</span>
                  </div>
                </div>
              </div>

              {/* Members List Table */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-lg">
                <div className="px-5 py-4 border-b border-[#30363d] bg-[#1f242c] flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Project Collaborators</h3>
                </div>

                {loading && projectMembers.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#8b949e]">Loading project members...</div>
                ) : projectMembers.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#8b949e]">No members in this project.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#30363d] text-[#8b949e] uppercase font-bold text-[10px] bg-[#161b22]">
                          <th className="px-6 py-3.5">Name</th>
                          <th className="px-6 py-3.5">Email</th>
                          <th className="px-6 py-3.5">Project Role</th>
                          <th className="px-6 py-3.5">Joined Date</th>
                          {isUserAdmin() && <th className="px-6 py-3.5 text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#30363d]/50">
                        {projectMembers.map((m) => {
                          const IconComp = ROLE_ICONS[m.role] || CheckCircle;
                          return (
                            <tr key={m.id} className="hover:bg-[#30363d]/10 transition">
                              <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
                                <Avatar name={m.name} size="md" />
                                {m.name}
                              </td>
                              <td className="px-6 py-4 text-[#8b949e]">{m.email}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${ROLE_COLORS[m.role] || 'text-[#8b949e] bg-[#30363d]/30 border-[#30363d]'}`}>
                                  <IconComp className="w-3 h-3 shrink-0" />
                                  {m.role?.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-[#8b949e]">
                                {m.joined_at ? new Date(m.joined_at).toLocaleDateString() : 'Project Creator (Owner)'}
                              </td>
                              {isUserAdmin() && (
                                <td className="px-6 py-4 text-right">
                                  {m.role !== 'OWNER' && m.id !== currentUser?.id && (
                                    <div className="flex items-center justify-end gap-2.5">
                                      <button
                                        onClick={() => {
                                          setEditingMember(m);
                                          setEditRole(m.role);
                                        }}
                                        className="p-1.5 hover:bg-[#30363d] rounded-lg text-[#8b949e] hover:text-white transition"
                                        title="Change member role"
                                      >
                                        <Edit3 className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleRemoveMember(m.id)}
                                        className="p-1.5 hover:bg-rose-950/40 rounded-lg text-[#8b949e] hover:text-rose-400 transition"
                                        title="Remove member"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ─── Invite Member Modal ────────────────────────────────────────── */}
      {showInviteModal && activeProject && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleInvite}
            className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-500" />
                Invite Member
              </h2>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="p-1.5 rounded-lg hover:bg-[#30363d] text-[#8b949e] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#8b949e] mb-1.5 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" />
                  <input
                    type="email"
                    required
                    placeholder="member@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-10 pr-3 py-2.5 text-xs text-[#c9d1d9] placeholder-[#8b949e] focus:outline-none focus:border-blue-500"
                  />
                </div>
                <p className="text-[10px] text-[#8b949e] mt-1.5">Note: The invited user must already have a registered account on the platform.</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8b949e] mb-1.5 block">Project Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-xs text-[#c9d1d9] focus:outline-none focus:border-blue-500"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-xs font-medium text-[#8b949e] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !inviteEmail.trim()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition active:scale-95 shadow-md shadow-blue-900/10"
              >
                {loading ? 'Inviting...' : 'Invite'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Edit Member Role Modal ─────────────────────────────────────── */}
      {editingMember && activeProject && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-500" />
                Change Project Role
              </h2>
              <button
                onClick={() => setEditingMember(null)}
                className="p-1.5 rounded-lg hover:bg-[#30363d] text-[#8b949e] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-[#0d1117] border border-[#30363d] rounded-xl">
                <Avatar name={editingMember.name} size="md" />
                <div>
                  <p className="text-xs font-bold text-white">{editingMember.name}</p>
                  <p className="text-[10px] text-[#8b949e]">{editingMember.email}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8b949e] mb-1.5 block">Select New Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-xs text-[#c9d1d9] focus:outline-none focus:border-blue-500"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 text-xs font-medium text-[#8b949e] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRole}
                disabled={loading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition active:scale-95 shadow-md shadow-blue-900/10"
              >
                {loading ? 'Saving...' : 'Save Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Copilot />
    </div>
  );
}
