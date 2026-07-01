'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { 
  LayoutDashboard, 
  FileText, 
  CheckSquare, 
  Bug, 
  BarChart3, 
  LogOut, 
  Briefcase,
  Layers,
  ChevronDown,
  Plus,
  Users,
  Bell,
  ShieldAlert
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const { 
    user, 
    logout, 
    projects, 
    activeProject, 
    setActiveProject, 
    fetchProjects,
    createProject,
    unreadNotificationCount,
    fetchNotifications,
    markNotificationsRead,
    notifications
  } = useAppStore();
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectTech, setNewProjectTech] = useState('');
  const [newProjectTemplate, setNewProjectTemplate] = useState('CONTACT_CENTER');

  useEffect(() => {
    fetchProjects();
    fetchNotifications();
    // Poll notifications every 30s
    const interval = setInterval(() => fetchNotifications(), 30000);
    return () => clearInterval(interval);
  }, [fetchProjects, fetchNotifications]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const success = await createProject({
      name: newProjectName,
      description: newProjectDesc,
      tech_stack: newProjectTech,
      domain_template: newProjectTemplate
    });
    if (success) {
      setNewProjectName('');
      setNewProjectDesc('');
      setNewProjectTech('');
      setShowNewProjectModal(false);
    }
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'QA Package Gen', href: '/requirements', icon: Layers },
    { name: 'Test Cases', href: '/testcases', icon: CheckSquare },
    { name: 'Bug Tracker', href: '/bugs', icon: ShieldAlert },
    { name: 'Coverage Matrix', href: '/coverage', icon: BarChart3 },
    { name: 'Teams', href: '/teams', icon: Users },
  ];

  return (
    <div className="w-64 h-screen border-r border-slate-900 bg-[#07050d]/80 backdrop-blur-xl flex flex-col justify-between p-4 shrink-0 shadow-xl shadow-black/45">
      <div className="flex flex-col gap-6">
        {/* Title logo */}
        <div className="flex items-center gap-2.5 px-2 py-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center font-black text-black shadow-lg shadow-violet-500/25">
            QG
          </div>
          <div>
            <h1 className="font-extrabold text-white tracking-tight text-sm">QA GENIUS AI</h1>
            <span className="text-[9px] text-violet-400 font-mono tracking-widest uppercase font-semibold">Enterprise Hub</span>
          </div>
        </div>

        {/* Project Selector Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full glass-panel px-3 py-2.5 rounded-xl flex items-center justify-between text-left text-xs hover:border-violet-500/30 transition duration-200 shadow-md shadow-black/10 group active:scale-98"
          >
            <div className="flex items-center gap-2 truncate">
              <Briefcase className="w-3.5 h-3.5 text-violet-400 shrink-0 group-hover:animate-pulse" />
              <span className="truncate text-slate-350 font-semibold group-hover:text-white transition">
                {activeProject ? activeProject.name : 'Select Project...'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition shrink-0" />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 right-0 mt-1.5 bg-[#0e0b16] border border-slate-800/85 rounded-xl z-50 py-1 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="max-h-48 overflow-y-auto">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActiveProject(p);
                      setDropdownOpen(false);
                    }}
                    className={`w-full px-3.5 py-2.5 text-left text-xs hover:bg-violet-950/20 hover:text-white transition ${
                      activeProject?.id === p.id ? 'bg-violet-950/40 text-violet-300 font-bold border-l-2 border-violet-500' : 'text-slate-400 font-medium'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-850/80 mt-1">
                <button
                  onClick={() => {
                    setShowNewProjectModal(true);
                    setDropdownOpen(false);
                  }}
                  className="w-full px-3.5 py-2.5 text-left text-xs text-cyan-400 hover:bg-cyan-950/15 flex items-center gap-1.5 font-bold transition duration-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Project...
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Nav Links */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-violet-950/30 to-indigo-950/20 text-violet-300 border-l-2 border-violet-500 shadow-inner' 
                    : 'text-slate-400 hover:bg-slate-900/10 hover:text-slate-200 hover:translate-x-0.5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-violet-400' : 'text-slate-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User profile & Log Out */}
      <div className="flex flex-col gap-3 pt-4 border-t border-slate-850">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifPanel(!showNotifPanel); if (unreadNotificationCount > 0) markNotificationsRead(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-900/20 hover:text-slate-200 transition-all duration-200"
          >
            <div className="relative">
              <Bell className="w-4 h-4" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-[9px] font-black text-white animate-bounce">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </div>
            Notifications
            {unreadNotificationCount > 0 && (
              <span className="ml-auto text-[9px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-full font-bold">{unreadNotificationCount} new</span>
            )}
          </button>

          {showNotifPanel && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#0e0b16] border border-slate-800 rounded-xl z-50 shadow-2xl overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Notifications</span>
                <button onClick={() => setShowNotifPanel(false)} className="text-xs text-slate-500 hover:text-white">✕</button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-slate-500">No notifications yet</div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div key={n.id} className={`px-3 py-2.5 border-b border-slate-900 text-xs ${!n.is_read ? 'bg-violet-950/10' : ''}`}>
                      <div className="font-semibold text-slate-300 truncate">{n.bug_title || 'Bug Update'}</div>
                      <div className="text-slate-500 mt-0.5 line-clamp-2">{n.message}</div>
                      <div className="text-slate-600 text-[10px] mt-1">{new Date(n.created_at).toLocaleTimeString()}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 px-2 bg-slate-950/10 p-2.5 rounded-xl border border-slate-850">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white border border-violet-500/30">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-200 truncate">{user?.name || 'QA Operator'}</p>
            <p className="text-[9px] text-slate-500 font-semibold truncate capitalize tracking-wider font-mono">{user?.role?.toLowerCase().replace('_', ' ') || 'QA Engineer'}</p>
          </div>
        </div>
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/10 hover:text-rose-350 transition-all duration-200"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>

      {/* New Project Dialog Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-xl flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-white">Create New Project</h2>
              <p className="text-xs text-slate-400">Initialize a workspace with starter parameters or domain settings.</p>
            </div>
            
            <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Project Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. CX Connect Mobile App"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="glass-input px-3 py-2 text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Description</label>
                <textarea 
                  placeholder="Summary of this project context..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="glass-input px-3 py-2 text-sm h-20 resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Tech Stack</label>
                <input 
                  type="text" 
                  placeholder="React, Python, AWS RDS"
                  value={newProjectTech}
                  onChange={(e) => setNewProjectTech(e.target.value)}
                  className="glass-input px-3 py-2 text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Domain Template Presets</label>
                <select
                  value={newProjectTemplate}
                  onChange={(e) => setNewProjectTemplate(e.target.value)}
                  className="glass-input px-3 py-2 text-sm bg-[#120e25] text-white"
                >
                  <option value="CONTACT_CENTER">Contact Center (IVR & Queues)</option>
                  <option value="CRM">CRM (Lead pipelines)</option>
                  <option value="BANKING">Banking (Transaction safeguards)</option>
                  <option value="SAAS">SaaS (Tenancy, Billing limits)</option>
                  <option value="ECOMMERCE">E-Commerce (Catalog, Coupons)</option>
                  <option value="">No Preset (Blank Workspace)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button 
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
