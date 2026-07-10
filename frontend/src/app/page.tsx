'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { Mail, Lock, User, Briefcase, ChevronDown } from 'lucide-react';

const roles = [
  { id: 'QA_ENGINEER', name: 'QA Engineer' },
  { id: 'QA_LEAD', name: 'QA Lead' },
  { id: 'AUTOMATION_ENGINEER', name: 'Automation Engineer' },
  { id: 'DEVELOPER', name: 'Developer' },
  { id: 'PRODUCT_MANAGER', name: 'Product Manager' }
];

export default function LandingPage() {
 const router = useRouter();
 const { token, login, registerUser, error, initializeAuth } = useAppStore();
 const [isLogin, setIsLogin] = useState(true);
 
 // Login fields
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 
 // Register fields
 const [name, setName] = useState('');
 const [regEmail, setRegEmail] = useState('');
 const [regPassword, setRegPassword] = useState('');
 const [role, setRole] = useState('QA_ENGINEER');

 const [loadingLocal, setLoadingLocal] = useState(false);
 const [statusMsg, setStatusMsg] = useState<string | null>(null);

 const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
 const roleRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
  initializeAuth();
 }, [initializeAuth]);

 useEffect(() => {
  if (token) {
   router.push('/dashboard');
  }
 }, [token, router]);

 useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (roleRef.current && !roleRef.current.contains(event.target as Node)) {
      setRoleDropdownOpen(false);
    }
  }
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!email || !password) return;
  setLoadingLocal(true);
  setStatusMsg(null);
  const success = await login({ email, password });
  setLoadingLocal(false);
  if (success) {
   router.push('/dashboard');
  }
 };

 const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!name || !regEmail || !regPassword) return;
  setLoadingLocal(true);
  setStatusMsg(null);
  const success = await registerUser({
   name,
   email: regEmail,
   password: regPassword,
   role
  });
  setLoadingLocal(false);
  if (success) {
   setStatusMsg('Account created successfully! Switching to login...');
   setTimeout(() => {
    setIsLogin(true);
    setEmail(regEmail);
    setStatusMsg(null);
   }, 1500);
  }
 };

  return (
   <div className="flex-1 flex flex-col pt-14 md:pt-0 overflow-x-hidden items-center justify-center p-4 bg-gradient-to-tr from-[#f1f5f9] via-[#f8fafc] to-[#f1f5f9] relative overflow-hidden">
    {/* Background radial neon blobs */}
    <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-300/15 blur-[120px] pointer-events-none" />
    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-200/20 blur-[140px] pointer-events-none" />
 
    {/* Main Container */}
    <div className="w-full max-w-md flex flex-col gap-6 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
     
     {/* Logo block */}
     <div className="flex flex-col items-center gap-2 text-center">
      <div className="w-12 h-12 rounded-xl bg-[#2F81F7] flex items-center justify-center font-bold text-white text-xl shadow-md shadow-blue-500/20">
       QG
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mt-2">
       QA <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-700 bg-clip-text text-transparent">Genius AI</span>
      </h1>
      <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
       Generate Complete QA Packages from System Specifications in Seconds.
      </p>
     </div>
 
     {/* Card */}
     <div className="bg-white/85 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.03)] backdrop-blur-md p-8 rounded-2xl flex flex-col gap-5">
      <div>
       <h2 className="text-lg font-bold text-slate-900">
        {isLogin ? 'Welcome Back' : 'Get Started'}
       </h2>
       <p className="text-xs text-slate-500 mt-0.5">
        {isLogin ? 'Enter your credentials to enter the workspace.' : 'Create your credentials to launch.'}
       </p>
      </div>
 
      {/* Messages */}
      {error && (
       <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs px-3 py-2 rounded-lg">
        {error}
       </div>
      )}
      {statusMsg && (
       <div className="bg-blue-50 border border-blue-200 text-blue-600 text-xs px-3 py-2 rounded-lg">
        {statusMsg}
       </div>
      )}
 
      {isLogin ? (
       /* Login Form */
       <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
         <label className="text-xs text-slate-700 font-semibold">Email Address</label>
         <div className="relative">
          <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
           type="email"
           required
           placeholder="Enter your email address"
           value={email}
           onChange={(e) => setEmail(e.target.value)}
           className="w-full bg-white border border-slate-200 hover:border-slate-350 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-all duration-200"
          />
         </div>
        </div>
 
        <div className="flex flex-col gap-1.5">
         <label className="text-xs text-slate-700 font-semibold">Password</label>
         <div className="relative">
          <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
           type="password"
           required
           placeholder="Enter your password"
           value={password}
           onChange={(e) => setPassword(e.target.value)}
           className="w-full bg-white border border-slate-200 hover:border-slate-350 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-all duration-200"
          />
         </div>
        </div>
 
        <button
         type="submit"
         disabled={loadingLocal}
         className="w-full py-2.5 rounded-xl text-sm font-bold bg-[#2F81F7] hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20 active:scale-[0.98] transition duration-200 disabled:opacity-50 mt-2 cursor-pointer"
        >
         {loadingLocal ? 'Signing In...' : 'Sign In'}
        </button>
       </form>
      ) : (
       /* Register Form */
       <form onSubmit={handleRegister} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
         <label className="text-xs text-slate-700 font-semibold">Full Name</label>
         <div className="relative">
          <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
           type="text"
           required
           placeholder="Enter your name"
           value={name}
           onChange={(e) => setName(e.target.value)}
           className="w-full bg-white border border-slate-200 hover:border-slate-350 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-all duration-200"
          />
         </div>
        </div>
 
        <div className="flex flex-col gap-1.5">
         <label className="text-xs text-slate-700 font-semibold">Email Address</label>
         <div className="relative">
          <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
           type="email"
           required
           placeholder="Enter your email address"
           value={regEmail}
           onChange={(e) => setRegEmail(e.target.value)}
           className="w-full bg-white border border-slate-200 hover:border-slate-350 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-all duration-200"
          />
         </div>
        </div>
 
        <div className="flex flex-col gap-1.5">
         <label className="text-xs text-slate-700 font-semibold">Password</label>
         <div className="relative">
          <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
           type="password"
           required
           placeholder="Enter your password (Min 6 characters)"
           value={regPassword}
           onChange={(e) => setRegPassword(e.target.value)}
           className="w-full bg-white border border-slate-200 hover:border-slate-355 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-all duration-200"
          />
         </div>
        </div>
 
        <div className="flex flex-col gap-1.5" ref={roleRef}>
         <label className="text-xs text-slate-700 font-semibold">Role</label>
         <div className="relative">
          <button
           type="button"
           onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
           className="w-full bg-white border border-slate-200 hover:border-slate-350 focus:border-blue-500 rounded-xl pl-10 pr-8 py-2.5 text-sm text-slate-800 text-left flex items-center justify-between focus:outline-none transition-all duration-200 cursor-pointer shadow-sm"
          >
           <div className="flex items-center gap-2">
            <Briefcase className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <span className="truncate">
             {roles.find((r) => r.id === role)?.name || 'Select Role'}
            </span>
           </div>
           <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
 
          {roleDropdownOpen && (
           <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200/80 rounded-xl z-50 py-1.5 overflow-hidden shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
            {roles.map((r) => (
             <button
              key={r.id}
              type="button"
              onClick={() => {
               setRole(r.id);
               setRoleDropdownOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-xs hover:bg-slate-50 hover:text-slate-900 transition ${
               role === r.id ? 'bg-slate-50 text-slate-900 font-bold border-l-2 border-blue-500' : 'text-slate-700 font-medium'
              }`}
             >
              {r.name}
             </button>
            ))}
           </div>
          )}
         </div>
        </div>
 
        <button
         type="submit"
         disabled={loadingLocal}
         className="w-full py-2.5 rounded-xl text-sm font-bold bg-[#2F81F7] hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20 active:scale-[0.98] transition duration-200 disabled:opacity-50 mt-2 cursor-pointer"
        >
         {loadingLocal ? 'Creating Account...' : 'Create Account'}
        </button>
       </form>
      )}
 
      {/* Toggle Switch */}
      <div className="border-t border-slate-100 pt-4 text-center">
       <button
        onClick={() => {
         setIsLogin(!isLogin);
         setStatusMsg(null);
        }}
        className="text-xs text-slate-500 hover:text-slate-800 font-semibold transition"
       >
        {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
       </button>
      </div>
     </div>
    </div>
   </div>
 );
}
