'use client';

import Sidebar from '@/components/sidebar';
import { PlayCircle, CheckCircle2, GitBranch, GitCommit, Play, Loader2, Server, XCircle, Github, ArrowUpCircle, FilePlus, Database } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function VersionControl() {
  const [pipelineState, setPipelineState] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [successDetails, setSuccessDetails] = useState('');
  
  // Stages: 0=idle, 1=add, 2=commit, 3=push, 4=done
  const [activeStage, setActiveStage] = useState(0);

  const pushToGithub = async () => {
    if (pipelineState === 'running') return;
    
    setPipelineState('running');
    setActiveStage(1); // Staging (git add)
    setErrorMsg('');
    setSuccessDetails('');
    
    try {
      // Simulate staging time
      await new Promise(r => setTimeout(r, 800));
      setActiveStage(2); // Committing (git commit)
      
      // Simulate commit time
      await new Promise(r => setTimeout(r, 800));
      setActiveStage(3); // Pushing (git push)
      
      // Actually push code to GitHub!
      const res = await axios.post(`${API_BASE_URL}/api/pipelines/trigger`);
      
      setActiveStage(4); // Done
      setPipelineState('success');
      
      if (res.data && res.data.message) {
         setSuccessDetails(res.data.message);
      }
      
    } catch (err: any) {
      console.error(err);
      setPipelineState('error');
      setErrorMsg(err.response?.data?.detail || 'Failed to push to GitHub. Check terminal logs.');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pt-16 md:pt-6 flex flex-col gap-6">
        
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
               Version Control
            </h1>
            <p className="text-xs text-slate-500">One-click Git sync to push your local QA Genius AI code to GitHub.</p>
          </div>
          <button 
            onClick={pushToGithub} 
            disabled={pipelineState === 'running'}
            className={`px-4 py-2 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 ${pipelineState === 'running' ? 'bg-slate-800 cursor-not-allowed' : 'bg-slate-900 hover:bg-black'}`}
          >
            {pipelineState === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpCircle className="w-4 h-4" />}
            Push to GitHub
          </button>
        </div>
        
        {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm">
                <XCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-mono text-xs break-all">{errorMsg}</span>
            </div>
        )}

        {successDetails && pipelineState === 'success' && (
            <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>{successDetails}</span>
            </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mt-4">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg border border-slate-200">
                <GitBranch className="w-6 h-6 text-slate-700" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800">GitHub Sync Workflow</h2>
                <p className="text-sm text-slate-500 flex items-center gap-1 font-mono">origin/main</p>
              </div>
            </div>
            <div className="text-right">
               {pipelineState === 'success' && <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Synced Successfully</span>}
               {pipelineState === 'error' && <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">Sync Failed</span>}
               {pipelineState === 'running' && <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full animate-pulse">Syncing to GitHub...</span>}
            </div>
          </div>

          <div className="relative max-w-3xl mx-auto">
            <div className="absolute top-8 left-10 right-10 h-1 bg-slate-100 -z-10"></div>
            
            {/* Dynamic Progress Line */}
            <div 
              className="absolute top-8 left-10 h-1 bg-blue-500 transition-all duration-500 ease-in-out -z-10"
              style={{ width: activeStage === 0 ? '0%' : activeStage === 1 ? '0%' : activeStage === 2 ? '50%' : activeStage >= 3 ? '100%' : '0%' }}
            ></div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              
              {/* Step 1: Git Add */}
              <div className="flex flex-col items-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 border-white shadow-md transition-colors ${activeStage === 1 ? 'bg-blue-100 text-blue-600' : activeStage > 1 ? 'bg-green-100 text-green-600' : pipelineState === 'error' && activeStage === 1 ? 'bg-red-100 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                  {activeStage === 1 ? <Loader2 className="w-6 h-6 animate-spin" /> : activeStage > 1 ? <CheckCircle2 className="w-6 h-6" /> : pipelineState === 'error' && activeStage === 1 ? <XCircle className="w-6 h-6" /> : <FilePlus className="w-6 h-6" />}
                </div>
                <p className="mt-3 font-bold text-slate-800 text-sm">Staging Changes</p>
                <p className="text-[10px] font-mono font-semibold text-slate-400 mt-1 bg-slate-100 px-2 py-0.5 rounded">git add .</p>
              </div>

              {/* Step 2: Git Commit */}
              <div className="flex flex-col items-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 border-white shadow-md transition-colors ${activeStage === 2 ? 'bg-blue-100 text-blue-600' : activeStage > 2 ? 'bg-green-100 text-green-600' : pipelineState === 'error' && activeStage === 2 ? 'bg-red-100 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                   {activeStage === 2 ? <Loader2 className="w-6 h-6 animate-spin" /> : activeStage > 2 ? <CheckCircle2 className="w-6 h-6" /> : pipelineState === 'error' && activeStage === 2 ? <XCircle className="w-6 h-6" /> : <GitCommit className="w-6 h-6" />}
                </div>
                <p className="mt-3 font-bold text-slate-800 text-sm">Committing</p>
                <p className="text-[10px] font-mono font-semibold text-slate-400 mt-1 bg-slate-100 px-2 py-0.5 rounded">git commit -m "..."</p>
              </div>

              {/* Step 3: Git Push */}
              <div className="flex flex-col items-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 border-white shadow-md transition-colors ${activeStage === 3 ? 'bg-blue-100 text-blue-600' : activeStage > 3 ? 'bg-green-100 text-green-600' : pipelineState === 'error' && activeStage === 3 ? 'bg-red-100 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                   {activeStage === 3 ? <Loader2 className="w-6 h-6 animate-spin" /> : activeStage > 3 ? <CheckCircle2 className="w-6 h-6" /> : pipelineState === 'error' && activeStage === 3 ? <XCircle className="w-6 h-6" /> : <ArrowUpCircle className="w-6 h-6" />}
                </div>
                <p className="mt-3 font-bold text-slate-800 text-sm">Pushing to GitHub</p>
                <p className="text-[10px] font-mono font-semibold text-slate-400 mt-1 bg-slate-100 px-2 py-0.5 rounded">git push origin main</p>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
