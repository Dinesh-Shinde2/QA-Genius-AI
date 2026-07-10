'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import Copilot from '@/components/copilot';
import { useAppStore } from '@/store/useAppStore';
import {
  PlayCircle, CheckCircle, XCircle, Key, GitBranch, GitPullRequest,
  Link, Link2Off, Loader2, Info, ArrowRight, Settings, AlertCircle
} from 'lucide-react';

export default function VersionControl() {
  const router = useRouter();
  const {
    token, activeProject, projects, setActiveProject,
    githubConnected, githubUsername, githubRepoName,
    fetchGithubStatus, connectGithub, disconnectGithub,
    fetchProjectGithubRepo, saveProjectGithubRepo
  } = useAppStore();

  const [patToken, setPatToken] = useState('');
  const [repoName, setRepoName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load GitHub connection status
  useEffect(() => {
    if (!token) {
      router.push('/');
      return;
    }
    fetchGithubStatus();
  }, [token, fetchGithubStatus, router]);

  // Load project repo mapping if project is active
  useEffect(() => {
    if (activeProject) {
      fetchProjectGithubRepo(activeProject.id);
    }
  }, [activeProject, fetchProjectGithubRepo]);

  // Sync repo name input with store value
  useEffect(() => {
    setRepoName(githubRepoName || '');
  }, [githubRepoName]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patToken.trim()) return;

    setLoading(true);
    setStatusMsg(null);
    setErrorMsg(null);

    const success = await connectGithub(patToken.trim());
    setLoading(false);

    if (success) {
      setStatusMsg('Successfully linked GitHub account!');
      setPatToken('');
    } else {
      setErrorMsg('Failed to connect GitHub. Please verify that the Personal Access Token is valid and has permissions.');
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your GitHub account? All script syncs will be disabled.')) return;

    setLoading(true);
    const success = await disconnectGithub();
    setLoading(false);

    if (success) {
      setStatusMsg('GitHub account disconnected.');
    } else {
      setErrorMsg('Failed to disconnect GitHub account.');
    }
  };

  const handleSaveRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !repoName.trim()) return;

    setLoading(true);
    setStatusMsg(null);
    setErrorMsg(null);

    const success = await saveProjectGithubRepo(activeProject.id, repoName.trim());
    setLoading(false);

    if (success) {
      setStatusMsg(`Successfully mapped project to repository: ${repoName.trim()}`);
    } else {
      setErrorMsg('Failed to save repository mapping. Ensure format is owner/repo (e.g. dinesh-shinde2/QA-Genius-AI).');
    }
  };

  return (
    <div className="flex h-screen bg-[#0d1117] text-[#c9d1d9] overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-y-auto">
        <header className="border-b border-[#30363d] px-6 py-4 flex items-center justify-between bg-[#161b22] shrink-0">
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-blue-500" />
              GitHub Sync Dashboard
            </h1>
            <p className="text-xs text-[#8b949e]">Configure optional Git integrations to sync generated Playwright scripts directly to your repositories.</p>
          </div>
        </header>

        <main className="p-6 max-w-4xl w-full mx-auto space-y-6 flex-1">
          {/* Status Messages */}
          {statusMsg && (
            <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-xl text-xs flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              {statusMsg}
            </div>
          )}
          {errorMsg && (
            <div className="bg-rose-950/40 border border-rose-500/30 text-rose-400 p-3.5 rounded-xl text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* LEFT 2 COLUMNS: Connection and Mappings */}
            <div className="md:col-span-2 space-y-6">
              
              {/* CARD 1: Link Account */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-lg space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white">GitHub Connection Status</h2>
                    <p className="text-[11px] text-[#8b949e] mt-0.5">Securely link your personal GitHub profile to push scripts.</p>
                  </div>
                </div>

                {githubConnected ? (
                  /* Connected State Display */
                  <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center font-bold text-slate-900 shrink-0">
                        {githubUsername?.[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          @{githubUsername}
                          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Linked</span>
                        </p>
                        <p className="text-[10px] text-[#8b949e]">Access Token synced successfully.</p>
                      </div>
                    </div>

                    <button
                      onClick={handleDisconnect}
                      disabled={loading}
                      className="text-xs font-bold text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                    >
                      <Link2Off className="w-3.5 h-3.5" />
                      Disconnect
                    </button>
                  </div>
                ) : (
                  /* Disconnected Token Entry Form */
                  <form onSubmit={handleConnect} className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-[#8b949e] mb-1.5 block">GitHub Personal Access Token (Classic / Fine-Grained)</label>
                      <input
                        type="password"
                        required
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        value={patToken}
                        onChange={(e) => setPatToken(e.target.value)}
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading || !patToken.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link className="w-3.5 h-3.5" />}
                      Connect GitHub Account
                    </button>
                  </form>
                )}
              </div>

              {/* CARD 2: Project Repo Mapping */}
              {activeProject && (
                <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-lg space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                      <GitBranch className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-white">Repository Mapping</h2>
                      <p className="text-[11px] text-[#8b949e] mt-0.5">Map active project to a target GitHub repository.</p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveRepo} className="space-y-4">
                    <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl flex items-center justify-between text-xs text-[#8b949e]">
                      <div>
                        <span className="block font-bold text-white mb-0.5">Project Context:</span>
                        {activeProject.name}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#8b949e] mb-1.5 block">Target Repository Name (owner/repo)</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. facebook/react, Dinesh-Shinde2/QA-Genius-AI"
                        value={repoName}
                        onChange={(e) => setRepoName(e.target.value)}
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-[#8b949e] focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !repoName.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Settings className="w-3.5 h-3.5" />}
                      Save Repository Mapping
                    </button>
                  </form>
                </div>
              )}

              {/* Mapped projects list dropdown if no active project */}
              {!activeProject && (
                <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-lg text-center flex flex-col items-center justify-center gap-3">
                  <Info className="w-6 h-6 text-blue-500" />
                  <p className="text-xs text-[#8b949e]">Please select a project to configure its repository mapping.</p>
                  <select
                    onChange={(e) => {
                      const proj = projects.find(p => p.id === e.target.value);
                      if (proj) setActiveProject(proj);
                    }}
                    className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="" disabled selected>Choose a project...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Guide */}
            <div className="space-y-6">
              <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-lg space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-500" />
                  Setup Instructions
                </h3>
                <p className="text-[11px] text-[#8b949e] leading-relaxed">
                  How to generate a Personal Access Token (PAT) on GitHub:
                </p>
                <ol className="text-[11px] text-[#8b949e] space-y-3 list-decimal pl-4.5">
                  <li>Go to your GitHub account ➔ <strong>Settings</strong>.</li>
                  <li>Click on <strong>Developer settings</strong> on the bottom left.</li>
                  <li>Select <strong>Personal access tokens</strong> ➔ <strong>Tokens (classic)</strong>.</li>
                  <li>Click <strong>Generate new token</strong> (classic).</li>
                  <li>Enter a description (e.g. <code>QA Genius AI Sync</code>).</li>
                  <li>Select the <strong>repo</strong> scope checkbox (required to push files and open PRs).</li>
                  <li>Click <strong>Generate token</strong> at the bottom.</li>
                  <li>Copy and paste the generated token into the connection card.</li>
                </ol>
              </div>
            </div>
          </div>
        </main>
      </div>

      <Copilot />
    </div>
  );
}
