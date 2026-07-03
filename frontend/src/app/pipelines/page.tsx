'use client';

import Sidebar from '@/components/sidebar';
import { PlayCircle, CheckCircle2, GitBranch, GitCommit, Play, Loader2, Server, XCircle, ArrowUpCircle, FilePlus, Database, History, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function VersionControl() {
  const [pipelineState, setPipelineState] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [successDetails, setSuccessDetails] = useState('');
  
  // Commit Modal
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  
  // Git History
  const [commitHistory, setCommitHistory] = useState<any[]>([]);
  
  // Stages: 0=idle, 1=add, 2=commit, 3=push, 4=done
  const [activeStage, setActiveStage] = useState(0);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/pipelines/history`);
      if (res.data && res.data.history) {
        setCommitHistory(res.data.history);
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const initiatePush = () => {
    if (pipelineState === 'running') return;
    setCommitMessage('Update: ' + new Date().toLocaleString());
    setShowCommitModal(true);
  };

  const executePushToGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowCommitModal(false);
    
    setPipelineState('running');
    setActiveStage(1); // Staging (git add)
    setErrorMsg('');
    setSuccessDetails('');
    
    try {
      await new Promise(r => setTimeout(r, 600));
      setActiveStage(2); // Committing (git commit)
      await new Promise(r => setTimeout(r, 600));
      setActiveStage(3); // Pushing (git push)
      
      const res = await axios.post(`${API_BASE_URL}/api/pipelines/trigger`, { commit_message: commitMessage });
      
      setActiveStage(4); // Done
      setPipelineState('success');
      
      if (res.data && res.data.message) {
         setSuccessDetails(res.data.message);
      }
      fetchHistory(); // Refresh history
      
    } catch (err: any) {
      console.error(err);
      setPipelineState('error');
      setErrorMsg(err.response?.data?.detail || 'Failed to push to GitHub. Check terminal logs.');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 min-w-0 p-4 md:p-6 pt-16 md:pt-6 flex flex-col gap-6">
        
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
               Version Control
            </h1>
            <p className="text-xs text-slate-500">One-click Git sync to push your local QA Genius AI code to GitHub.</p>
          </div>
          <button 
            onClick={initiatePush} 
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

        {/* Real Git History */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mt-4">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-black text-slate-800">Recent Commits</h2>
          </div>
          
          <div className="flex flex-col gap-4">
            {commitHistory.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No commits found yet.</p>
            ) : (
              commitHistory.map((commit, idx) => (
                <div key={idx} className="flex gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">
                      {commit.author.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{commit.message}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 font-medium">
                      <span className="bg-slate-200/50 px-2 py-0.5 rounded text-slate-700 font-mono">{commit.hash}</span>
                      <span>•</span>
                      <span>{commit.author}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {commit.time_ago}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
      </main>

      {/* Commit Message Modal */}
      {showCommitModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-xl w-full max-w-md p-6 rounded-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-black text-slate-900 mb-2">Push to GitHub</h2>
            <p className="text-sm text-slate-500 mb-6">Enter a commit message describing your changes.</p>
            
            <form onSubmit={executePushToGithub}>
              <textarea
                autoFocus
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2F81F7]/50 resize-none h-24"
                placeholder="e.g. Added new dashboard UI..."
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                required
              />
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowCommitModal(false)} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 text-sm font-bold text-white bg-[#2F81F7] hover:bg-blue-600 rounded-xl transition flex items-center gap-2 shadow-sm">
                  <ArrowUpCircle className="w-4 h-4" />
                  Confirm & Push
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
