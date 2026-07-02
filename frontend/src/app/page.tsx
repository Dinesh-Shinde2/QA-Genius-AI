'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { ShieldCheck, Mail, Lock, User, Briefcase, KeyRound } from 'lucide-react';

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

 useEffect(() => {
  initializeAuth();
 }, [initializeAuth]);

 useEffect(() => {
  if (token) {
   router.push('/dashboard');
  }
 }, [token, router]);

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
  <div className="flex-1 flex flex-col pt-14 md:pt-0 overflow-x-hidden items-center justify-center p-4 bg-gradient-to-tr from-[#08060f] via-[#0d0924] to-[#08060f] relative overflow-hidden">
   {/* Background radial neon blobs */}
   <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#2F81F7]/10 blur-[120px] pointer-events-none" />
   <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-slate-600/10 blur-[120px] pointer-events-none" />

   {/* Main Container */}
   <div className="w-full max-w-md flex flex-col gap-6 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
    
    {/* Logo block */}
    <div className="flex flex-col items-center gap-2 text-center">
     <div className="w-12 h-12 rounded-xl bg-[#2F81F7] flex items-center justify-center font-bold text-black text-xl ">
      QG
     </div>
     <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mt-2">
      QA <span className="gradient-text">Genius AI</span>
     </h1>
     <p className="text-sm text-slate-500 max-w-xs">
      Generate Complete QA Packages from System Specifications in Seconds.
     </p>
    </div>

    {/* Card */}
    <div className="bg-white border border-slate-200 shadow-sm p-8 rounded-2xl flex flex-col gap-5">
     <div>
      <h2 className="text-lg font-bold text-slate-900">
       {isLogin ? 'Welcome Back' : 'Get Started'}
      </h2>
      <p className="text-xs text-slate-500">
       {isLogin ? 'Enter your credentials to enter the workspace.' : 'Create your credentials to launch.'}
      </p>
     </div>

     {/* Messages */}
     {error && (
      <div className="bg-rose-950/30 border border-rose-800/50 text-rose-300 text-xs px-3 py-2 rounded-lg">
       {error}
      </div>
     )}
     {statusMsg && (
      <div className="bg-slate-50/30 border border-slate-200/50 text-slate-700 text-xs px-3 py-2 rounded-lg">
       {statusMsg}
      </div>
     )}

     {isLogin ? (
      /* Login Form */
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
       <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-700 font-medium">Email Address</label>
        <div className="relative">
         <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
         <input
          type="email"
          required
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full glass-input pl-10 pr-3 py-2 text-sm"
         />
        </div>
       </div>

       <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-700 font-medium">Password</label>
        <div className="relative">
         <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
         <input
          type="password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full glass-input pl-10 pr-3 py-2 text-sm"
         />
        </div>
       </div>

       <button
        type="submit"
        disabled={loadingLocal}
        className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#2F81F7] hover:bg-[#2F81F7] text-slate-900 transition duration-200 disabled:opacity-50 mt-2"
       >
        {loadingLocal ? 'Signing In...' : 'Sign In'}
       </button>
      </form>
     ) : (
      /* Register Form */
      <form onSubmit={handleRegister} className="flex flex-col gap-4">
       <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-700 font-medium">Full Name</label>
        <div className="relative">
         <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
         <input
          type="text"
          required
          placeholder="John Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full glass-input pl-10 pr-3 py-2 text-sm"
         />
        </div>
       </div>

       <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-700 font-medium">Email Address</label>
        <div className="relative">
         <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
         <input
          type="email"
          required
          placeholder="name@company.com"
          value={regEmail}
          onChange={(e) => setRegEmail(e.target.value)}
          className="w-full glass-input pl-10 pr-3 py-2 text-sm"
         />
        </div>
       </div>

       <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-700 font-medium">Password</label>
        <div className="relative">
         <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
         <input
          type="password"
          required
          placeholder="Min 6 characters"
          value={regPassword}
          onChange={(e) => setRegPassword(e.target.value)}
          className="w-full glass-input pl-10 pr-3 py-2 text-sm"
         />
        </div>
       </div>

       <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-700 font-medium">Role</label>
        <div className="relative">
         <Briefcase className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
         <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full glass-input pl-10 pr-3 py-2 text-sm bg-[#120e25] text-slate-900"
         >
          <option value="QA_ENGINEER">QA Engineer</option>
          <option value="QA_LEAD">QA Lead</option>
          <option value="AUTOMATION_ENGINEER">Automation Engineer</option>
          <option value="DEVELOPER">Developer</option>
          <option value="PRODUCT_MANAGER">Product Manager</option>
         </select>
        </div>
       </div>

       <button
        type="submit"
        disabled={loadingLocal}
        className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#2F81F7] hover:bg-[#2F81F7] text-slate-900 transition duration-200 disabled:opacity-50 mt-2"
       >
        {loadingLocal ? 'Creating Account...' : 'Create Account'}
       </button>
      </form>
     )}

     {/* Toggle Switch */}
     <div className="border-t border-slate-200 pt-4 text-center">
      <button
       onClick={() => {
        setIsLogin(!isLogin);
        setStatusMsg(null);
       }}
       className="text-xs text-slate-500 hover:text-slate-700 font-medium"
      >
       {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
      </button>
     </div>
    </div>
   </div>
  </div>
 );
}
