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
 PlayCircle,
 Palette
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

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
  notifications,
  theme,
  setTheme
 } = useAppStore();
 
 const [dropdownOpen, setDropdownOpen] = useState(false);
 const [showNotifPanel, setShowNotifPanel] = useState(false);
 const [showNewProjectModal, setShowNewProjectModal] = useState(false);
 const [newProjectName, setNewProjectName] = useState('');
 const [newProjectDesc, setNewProjectDesc] = useState('');
 const [newProjectTech, setNewProjectTech] = useState('');
 const [newProjectTemplate, setNewProjectTemplate] = useState('CONTACT_CENTER');
 const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
 const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);

 const themeRef = useRef<HTMLDivElement>(null);
 const projectRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
   function handleClickOutside(event: MouseEvent) {
     if (themeRef.current && !themeRef.current.contains(event.target as Node)) {
       setThemeDropdownOpen(false);
     }
     if (projectRef.current && !projectRef.current.contains(event.target as Node)) {
       setDropdownOpen(false);
     }
   }
   document.addEventListener('mousedown', handleClickOutside);
   return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

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
     { name: 'LocatorX', href: '/locator', icon: FileText },
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
     className="md:hidden fixed top-3 left-4 z-40 p-1.5 bg-card rounded-md border border-border-card text-foreground shadow-sm transition hover:scale-105"
    >
     <Menu className="w-5 h-5" />
    </button>
    
    {/* Mobile Overlay */}
    {mobileMenuOpen && (
     <div className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity duration-300" onClick={() => setMobileMenuOpen(false)} />
    )}

    <div className={`fixed md:sticky top-0 left-0 z-50 w-64 h-screen border-r border-border-sidebar bg-sidebar flex flex-col p-5 shrink-0 transition-all duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
     
     {/* Header: Title logo, Theme Switcher & Project Selector */}
     <div className="flex flex-col gap-5 mb-5 flex-shrink-0">
      {/* Close button for mobile */}
      {mobileMenuOpen && (
       <button onClick={() => setMobileMenuOpen(false)} className="md:hidden absolute top-4 right-4 text-foreground/60 hover:text-foreground transition">
        <X className="w-5 h-5" />
       </button>
      )}
      {/* Title logo */}
       <div className="flex items-center gap-3 px-1 py-1">
        <div className="w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center font-black text-sm select-none border border-foreground hover:scale-105 transition-transform duration-300">
         QG
        </div>
        <div>
         <h1 className="font-black text-foreground tracking-tight text-sm">QA GENIUS</h1>
         <span className="text-[9px] text-foreground/50 font-mono tracking-widest uppercase font-bold">Enterprise Test Mgmt</span>
        </div>
      </div>



      {/* Project Selector Dropdown */}
      <div className="relative" ref={projectRef}>
        <button 
         type="button"
         onClick={() => {
           setDropdownOpen(!dropdownOpen);
           setThemeDropdownOpen(false);
         }}
         className="w-full bg-card border border-border-card hover:border-foreground/30 shadow-sm px-3.5 py-3 rounded-xl flex items-center justify-between text-left text-xs transition-all duration-200 group active:scale-98"
        >
         <div className="flex items-center gap-2.5 truncate">
          <Briefcase className="w-4 h-4 text-foreground/60 shrink-0 group-hover:text-foreground transition-colors" />
          <span className="truncate text-foreground/80 font-semibold group-hover:text-foreground transition">
           {activeProject ? activeProject.name : 'Select Project...'}
          </span>
         </div>
         <ChevronDown className="w-3.5 h-3.5 text-foreground/45 group-hover:text-foreground transition shrink-0" />
        </button>

       {dropdownOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-card border border-border-card rounded-xl z-50 py-1.5 overflow-hidden shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
         <div className="max-h-48 overflow-y-auto scrollbar-thin">
          {projects.map((p) => (
           <button
            key={p.id}
            onClick={() => {
             setActiveProject(p);
             setDropdownOpen(false);
            }}
             className={`w-full px-4 py-2.5 text-left text-xs hover:bg-foreground/5 hover:text-foreground transition ${
              activeProject?.id === p.id ? 'bg-foreground/5 text-foreground font-bold border-l-2 border-foreground' : 'text-foreground/70 font-medium'
             }`}
           >
            {p.name}
           </button>
          ))}
         </div>
         <div className="border-t border-border-card mt-1.5 pt-1">
          <button
           onClick={() => {
            setShowNewProjectModal(true);
            setDropdownOpen(false);
           }}
           className="w-full px-4 py-2.5 text-left text-xs text-foreground/80 hover:bg-foreground/5 flex items-center gap-2 font-bold transition duration-200"
          >
           <Plus className="w-3.5 h-3.5 text-foreground/60" />
           Create Project...
          </button>
         </div>
        </div>
       )}
      </div>
     </div>

     {/* Nav Links - Scrollable */}
     <div className="flex-1 overflow-y-auto pr-1 -mr-1 flex flex-col gap-5 min-h-0 select-none [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-border-card [&::-webkit-scrollbar-thumb]:rounded">
      {navGroups.map((group) => (
       <div key={group.title} className="flex flex-col gap-2">
        <span className="px-4 text-[9px] font-bold text-foreground/50 tracking-widest uppercase font-mono">
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
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 group relative ${
             isActive 
              ? 'bg-foreground text-background shadow-md scale-[1.02]' 
              : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground'
            }`}
           >
            <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-background' : 'text-foreground/60 group-hover:text-foreground'}`} />
            <span>{item.name}</span>
           </Link>
          );
         })}
        </div>
       </div>
      ))}
     </div>

    {/* User profile & Log Out */}
    <div className="flex flex-col gap-3 pt-5 border-t border-border-sidebar">
      {/* Custom Theme Selector Dropdown */}
      <div className="relative" ref={themeRef}>
        <button 
         type="button"
         onClick={() => {
           setThemeDropdownOpen(!themeDropdownOpen);
           setDropdownOpen(false);
         }}
         className="w-full bg-card border border-border-card hover:border-foreground/30 shadow-sm px-3.5 py-2.5 rounded-xl flex items-center justify-between text-left text-xs transition-all duration-200 group active:scale-98"
        >
         <div className="flex items-center gap-2.5 truncate">
          <Palette className="w-4 h-4 text-foreground/60 shrink-0 group-hover:text-foreground transition-colors" />
          <div className="flex flex-col text-left">
            <span className="text-[9px] text-foreground/45 font-bold uppercase tracking-wider font-mono">Theme</span>
            <span className="truncate text-foreground/80 font-semibold group-hover:text-foreground transition mt-0.5">
             {theme === 'dark-monochrome' ? 'Monochrome' :
              theme === 'slate-dark' ? 'Slate Dark' :
              theme === 'cyberpunk' ? 'Cyberpunk' :
              theme === 'light-minimal' ? 'Light Minimal' : 'Theme'}
            </span>
          </div>
         </div>
         <ChevronDown className="w-3.5 h-3.5 text-foreground/45 group-hover:text-foreground transition shrink-0" />
        </button>

       {themeDropdownOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border-card rounded-xl z-50 py-1.5 overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
          {[
            { id: 'dark-monochrome', name: 'Monochrome' },
            { id: 'slate-dark', name: 'Slate Dark' },
            { id: 'cyberpunk', name: 'Cyberpunk' },
            { id: 'light-minimal', name: 'Light Minimal' }
          ].map((t) => (
           <button
            key={t.id}
            type="button"
            onClick={() => {
             setTheme(t.id);
             setThemeDropdownOpen(false);
            }}
             className={`w-full px-4 py-2.5 text-left text-xs hover:bg-foreground/5 hover:text-foreground transition ${
              theme === t.id ? 'bg-foreground/5 text-foreground font-bold border-l-2 border-foreground' : 'text-foreground/70 font-medium'
             }`}
           >
            {t.name}
           </button>
          ))}
        </div>
       )}
      </div>

     {/* Notification Bell */}
     <div className="relative">
      <button
       onClick={() => { setShowNotifPanel(!showNotifPanel); if (unreadNotificationCount > 0) markNotificationsRead(); }}
       className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-all duration-200"
      >
       <div className="relative">
        <Bell className="w-4 h-4" />
        {unreadNotificationCount > 0 && (
         <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-foreground text-background rounded-full flex items-center justify-center text-[8px] font-black animate-bounce border border-background">
          {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
         </span>
        )}
       </div>
       Notifications
       {unreadNotificationCount > 0 && (
        <span className="ml-auto text-[9px] bg-foreground/10 text-foreground px-2 py-0.5 rounded-full font-bold select-none">{unreadNotificationCount} new</span>
       )}
      </button>

      {showNotifPanel && (
       <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border-card rounded-xl z-50 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="px-4 py-3 border-b border-border-card flex items-center justify-between bg-foreground/5">
         <span className="text-xs font-bold text-foreground">Notifications</span>
         <button onClick={() => setShowNotifPanel(false)} className="text-foreground/60 hover:text-foreground transition text-[10px]">✕</button>
        </div>
        <div className="max-h-60 overflow-y-auto scrollbar-thin">
         {notifications.length === 0 ? (
          <div className="px-4 py-5 text-center text-xs text-foreground/50">No notifications yet</div>
         ) : (
          notifications.slice(0, 10).map((n) => (
           <div key={n.id} className={`px-4 py-3 border-b border-border-card text-xs transition hover:bg-foreground/5 ${!n.is_read ? 'bg-foreground/5' : ''}`}>
            <div className="font-bold text-foreground truncate">{n.bug_title || 'Bug Update'}</div>
            <div className="text-foreground/75 mt-1 line-clamp-2 leading-relaxed">{n.message}</div>
            <div className="text-foreground/45 text-[9px] mt-1.5 font-mono">{new Date(n.created_at).toLocaleTimeString()}</div>
           </div>
          ))
         )}
        </div>
       </div>
      )}
     </div>

      <div className="flex items-center gap-3 px-3 bg-card p-3 rounded-xl border border-border-card hover:border-foreground/30 transition duration-200">
       <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-black select-none shadow">
        {user?.name ? user.name[0].toUpperCase() : 'U'}
       </div>
      <div className="overflow-hidden flex-1">
       <p className="text-xs font-bold text-foreground truncate leading-snug">{user?.name || 'QA Operator'}</p>
       <p className="text-[9px] text-foreground/50 font-bold truncate capitalize tracking-wider font-mono mt-0.5">{user?.role?.toLowerCase().replace('_', ' ') || 'QA Engineer'}</p>
      </div>
     </div>
     <button 
      onClick={logout}
      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-foreground/50 hover:bg-foreground/5 hover:text-foreground transition-all duration-200"
     >
      <LogOut className="w-4 h-4 shrink-0 text-foreground/50" />
      Sign Out
     </button>
    </div>

    {/* New Project Dialog Modal */}
    {showNewProjectModal && (
     <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border-card shadow-xl w-full max-w-md p-6 rounded-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-250">
       <div>
        <h2 className="text-lg font-black text-foreground tracking-tight">Create New Project</h2>
        <p className="text-xs text-foreground/60 mt-1">Initialize a workspace with starter parameters or presets.</p>
       </div>
       
       <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
         <label className="text-xs font-bold text-foreground/60">Project Name *</label>
         <input 
          type="text" 
          required
          placeholder="e.g. CX Connect Mobile App"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          className="bg-background border border-border-card hover:border-foreground/30 focus:border-foreground px-3 py-2 text-sm rounded-lg outline-none text-foreground placeholder-foreground/30 transition duration-200"
         />
        </div>

        <div className="flex flex-col gap-1.5">
         <label className="text-xs font-bold text-foreground/60">Description</label>
         <textarea 
          placeholder="Summary of this project context..."
          value={newProjectDesc}
          onChange={(e) => setNewProjectDesc(e.target.value)}
          className="bg-background border border-border-card hover:border-foreground/30 focus:border-foreground px-3 py-2 text-sm rounded-lg outline-none text-foreground placeholder-foreground/30 transition duration-200 h-20 resize-none"
         />
        </div>

        <div className="flex flex-col gap-1.5">
         <label className="text-xs font-bold text-foreground/60">Tech Stack</label>
         <input 
          type="text" 
          placeholder="React, Python, AWS RDS"
          value={newProjectTech}
          onChange={(e) => setNewProjectTech(e.target.value)}
          className="bg-background border border-border-card hover:border-foreground/30 focus:border-foreground px-3 py-2 text-sm rounded-lg outline-none text-foreground placeholder-foreground/30 transition duration-200"
         />
        </div>

        <div className="flex flex-col gap-1.5">
         <label className="text-xs font-bold text-foreground/60">Domain Template Presets</label>
          <select
           value={newProjectTemplate}
           onChange={(e) => setNewProjectTemplate(e.target.value)}
           className="w-full px-3 py-2 border border-border-card rounded-lg text-sm bg-background hover:border-foreground/30 text-foreground focus:outline-none focus:border-foreground transition cursor-pointer"
          >
          <option value="CONTACT_CENTER">Contact Center (IVR & Queues)</option>
          <option value="CRM">CRM (Lead pipelines)</option>
          <option value="BANKING">Banking (Transaction safeguards)</option>
          <option value="SAAS">SaaS (Tenancy, Billing limits)</option>
          <option value="ECOMMERCE">E-Commerce (Catalog, Coupons)</option>
          <option value="">No Preset (Blank Workspace)</option>
         </select>
        </div>

        <div className="flex justify-end gap-2.5 mt-3 border-t border-border-card pt-4">
         <button 
          type="button"
          onClick={() => setShowNewProjectModal(false)}
          className="px-4 py-2 text-xs font-bold text-foreground/60 hover:text-foreground transition"
         >
          Cancel
         </button>
          <button 
           type="submit"
           className="px-4 py-2 text-xs font-bold rounded-lg bg-foreground hover:bg-foreground/90 text-background transition shadow-md active:scale-98"
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
