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
 ShieldAlert,
 Menu,
 X,
 PlayCircle
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
 const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const navGroups = [
   {
    title: 'PROJECT',
    items: [
     { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
     { name: 'Sprint Management', href: '/sprints', icon: Briefcase },
     { name: 'Teams', href: '/teams', icon: Users },
     { name: 'Requirement Analysis', href: '/requirements', icon: Layers },
    ]
   },
   {
    title: 'TESTING',
    items: [
     { name: 'Test Cases', href: '/testcases', icon: CheckSquare },
     { name: 'Test Execution', href: '/test-execution', icon: CheckSquare },
     { name: 'Bug Tracker', href: '/bugs', icon: Bug },
    ]
   },
   {
    title: 'DEVOPS & ANALYTICS',
    items: [
     { name: 'Release Readiness', href: '/releases', icon: Layers },
     { name: 'Coverage Matrix', href: '/coverage', icon: BarChart3 },
     { name: 'GitHub Sync', href: '/pipelines', icon: PlayCircle },
    ]
   }
  ];

  return (
   <>
    {/* Mobile Toggle Button */}
    <button 
     onClick={() => setMobileMenuOpen(true)}
     className="md:hidden fixed top-3 left-4 z-40 p-1.5 bg-white rounded-md border border-slate-200 text-slate-700 shadow-sm"
    >
     <Menu className="w-5 h-5" />
    </button>
    
    {/* Mobile Overlay */}
    {mobileMenuOpen && (
     <div className="md:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setMobileMenuOpen(false)} />
    )}

    <div className={`fixed md:sticky top-0 left-0 z-50 w-64 h-screen border-r border-[#E2E8F0] bg-[#FFFFFF] flex flex-col p-4 shrink-0 shadow-sm transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
     
     {/* Header: Title logo & Project Selector */}
     <div className="flex flex-col gap-5 mb-5 flex-shrink-0">
      {/* Close button for mobile */}
      {mobileMenuOpen && (
       <button onClick={() => setMobileMenuOpen(false)} className="md:hidden absolute top-4 right-4 text-slate-500 hover:text-slate-900">
        <X className="w-5 h-5" />
       </button>
      )}
      {/* Title logo */}
       <div className="flex items-center gap-2.5 px-2 py-1">
        <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center font-black text-white ">
         QG
        </div>
        <div>
         <h1 className="font-extrabold text-slate-900 tracking-tight text-sm">QA GENIUS</h1>
         <span className="text-[9px] text-[#64748B] font-mono tracking-widest uppercase font-semibold">Enterprise Test Mgmt</span>
        </div>
      </div>

      {/* Project Selector Dropdown */}
      <div className="relative">
        <button 
         onClick={() => setDropdownOpen(!dropdownOpen)}
         className="w-full bg-white border border-[#E2E8F0] shadow-sm px-3 py-2.5 rounded-xl flex items-center justify-between text-left text-xs hover:border-[#2563EB]/30 transition duration-200 group active:scale-98"
        >
         <div className="flex items-center gap-2 truncate">
          <Briefcase className="w-3.5 h-3.5 text-[#2563EB] shrink-0 group-hover:animate-pulse" />
          <span className="truncate text-[#64748B] font-semibold group-hover:text-slate-900 transition">
           {activeProject ? activeProject.name : 'Select Project...'}
          </span>
         </div>
         <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-700 transition shrink-0" />
        </button>

       {dropdownOpen && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200/85 rounded-xl z-50 py-1 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150">
         <div className="max-h-48 overflow-y-auto">
          {projects.map((p) => (
           <button
            key={p.id}
            onClick={() => {
             setActiveProject(p);
             setDropdownOpen(false);
            }}
             className={`w-full px-3.5 py-2.5 text-left text-xs hover:bg-[#EFF6FF] hover:text-[#2563EB] transition ${
              activeProject?.id === p.id ? 'bg-[#EFF6FF] text-[#2563EB] font-bold border-l-2 border-[#2563EB]' : 'text-[#64748B] font-medium'
             }`}
           >
            {p.name}
           </button>
          ))}
         </div>
         <div className="border-t border-slate-200/80 mt-1">
          <button
           onClick={() => {
            setShowNewProjectModal(true);
            setDropdownOpen(false);
           }}
           className="w-full px-3.5 py-2.5 text-left text-xs text-slate-500 hover:bg-slate-50/15 flex items-center gap-1.5 font-bold transition duration-200"
          >
           <Plus className="w-3.5 h-3.5" />
           Create Project...
          </button>
         </div>
        </div>
       )}
      </div>
     </div>

     {/* Nav Links - Scrollable */}
     <div className="flex-1 overflow-y-auto pr-1 -mr-1 flex flex-col gap-4 min-h-0 select-none [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded">
      {navGroups.map((group) => (
       <div key={group.title} className="flex flex-col gap-1.5">
        <span className="px-3.5 text-[9px] font-black text-[#94A3B8] tracking-widest uppercase font-mono">
         {group.title}
        </span>
        <div className="flex flex-col gap-1">
         {group.items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
           <Link
            key={item.name}
            href={item.href}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
             isActive 
              ? 'bg-[#EFF6FF] text-[#2563EB] border-l-2 border-[#2563EB]' 
              : 'text-[#64748B] hover:bg-[#F7F9FC] hover:text-[#0F172A]'
            }`}
           >
            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#2563EB]' : 'text-[#64748B]'}`} />
            <span>{item.name}</span>
           </Link>
          );
         })}
        </div>
       </div>
      ))}
     </div>

    {/* User profile & Log Out */}
    <div className="flex flex-col gap-3 pt-4 border-t border-slate-200">
     {/* Notification Bell */}
     <div className="relative">
      <button
       onClick={() => { setShowNotifPanel(!showNotifPanel); if (unreadNotificationCount > 0) markNotificationsRead(); }}
       className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-white/20 hover:text-slate-800 transition-all duration-200"
      >
       <div className="relative">
        <Bell className="w-4 h-4" />
        {unreadNotificationCount > 0 && (
         <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-[9px] font-black text-slate-900 animate-bounce">
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
       <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-xl z-50 shadow-2xl overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
         <span className="text-xs font-bold text-slate-700">Notifications</span>
         <button onClick={() => setShowNotifPanel(false)} className="text-xs text-slate-500 hover:text-slate-900">✕</button>
        </div>
        <div className="max-h-64 overflow-y-auto">
         {notifications.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-slate-500">No notifications yet</div>
         ) : (
          notifications.slice(0, 10).map((n) => (
           <div key={n.id} className={`px-3 py-2.5 border-b border-slate-200 text-xs ${!n.is_read ? 'bg-blue-950/10' : ''}`}>
            <div className="font-semibold text-slate-700 truncate">{n.bug_title || 'Bug Update'}</div>
            <div className="text-slate-500 mt-0.5 line-clamp-2">{n.message}</div>
            <div className="text-slate-600 text-[10px] mt-1">{new Date(n.created_at).toLocaleTimeString()}</div>
           </div>
          ))
         )}
        </div>
       </div>
      )}
     </div>

      <div className="flex items-center gap-2.5 px-2 bg-[#F7F9FC] p-2.5 rounded-xl border border-[#E2E8F0]">
       <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center text-xs font-bold text-white border border-[#2563EB]/30">
        {user?.name ? user.name[0].toUpperCase() : 'U'}
       </div>
      <div className="overflow-hidden">
       <p className="text-xs font-bold text-slate-800 truncate">{user?.name || 'QA Operator'}</p>
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
      <div className="bg-white border border-slate-200 shadow-sm w-full max-w-md p-6 rounded-xl flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
       <div>
        <h2 className="text-lg font-bold text-slate-900">Create New Project</h2>
        <p className="text-xs text-slate-500">Initialize a workspace with starter parameters or domain settings.</p>
       </div>
       
       <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
         <label className="text-xs font-semibold text-slate-700">Project Name *</label>
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
         <label className="text-xs font-semibold text-slate-700">Description</label>
         <textarea 
          placeholder="Summary of this project context..."
          value={newProjectDesc}
          onChange={(e) => setNewProjectDesc(e.target.value)}
          className="glass-input px-3 py-2 text-sm h-20 resize-none"
         />
        </div>

        <div className="flex flex-col gap-1.5">
         <label className="text-xs font-semibold text-slate-700">Tech Stack</label>
         <input 
          type="text" 
          placeholder="React, Python, AWS RDS"
          value={newProjectTech}
          onChange={(e) => setNewProjectTech(e.target.value)}
          className="glass-input px-3 py-2 text-sm"
         />
        </div>

        <div className="flex flex-col gap-1.5">
         <label className="text-xs font-semibold text-slate-700">Domain Template Presets</label>
          <select
           value={newProjectTemplate}
           onChange={(e) => setNewProjectTemplate(e.target.value)}
           className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm bg-white text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
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
          className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800"
         >
          Cancel
         </button>
          <button 
           type="submit"
           className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition shadow-sm"
          >
          Create Project
         </button>
        </div>
       </form>
      </div>
     </div>
    )}
   </div>
  </>
 );
}
