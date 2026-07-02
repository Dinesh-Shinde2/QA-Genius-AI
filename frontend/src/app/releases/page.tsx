'use client';

import Sidebar from '@/components/sidebar';
import { Layers, CheckCircle2, ShieldAlert, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

export default function ReleaseReadiness() {
  const { activeProject, releases, fetchReleases, createRelease } = useAppStore();
  const [releaseName, setReleaseName] = useState('');

  useEffect(() => {
    if (activeProject) fetchReleases(activeProject.id);
  }, [activeProject, fetchReleases]);

  const handleCreate = async () => {
    if (!activeProject || !releaseName) return;
    await createRelease({
      project_id: activeProject.id,
      version_name: releaseName
    });
    setReleaseName('');
  };

  const activeRelease = releases && releases.length > 0 ? releases[0] : null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pt-16 md:pt-6 flex flex-col gap-6">
        
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Release Readiness</h1>
            <p className="text-xs text-slate-500">Go / No-Go metrics for upcoming product releases.</p>
          </div>
          <div className="flex gap-2">
            <input 
              value={releaseName} 
              onChange={(e) => setReleaseName(e.target.value)}
              placeholder="v1.0.0" 
              className="px-3 py-2 border rounded-lg text-sm bg-white text-slate-900"
            />
            <button onClick={handleCreate} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold transition">
              Create Release
            </button>
          </div>
        </div>

        {activeRelease ? (
          <div className="bg-white border border-green-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <span className="px-3 py-1 bg-green-100 text-green-700 font-black text-xs rounded-full uppercase tracking-wider">{activeRelease.status}</span>
            </div>
            
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-2">
              <Layers className="w-6 h-6 text-blue-600" /> Release {activeRelease.version_name}
            </h2>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-6 font-semibold">
              <Calendar className="w-4 h-4" /> Targeted for: {activeRelease.target_date || 'TBD'}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <div className="border border-slate-100 bg-slate-50 p-4 rounded-lg flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="w-8 h-8 text-green-500 mb-2" />
                <p className="text-xs font-bold text-slate-500 uppercase">Test Pass Rate</p>
                <p className="text-3xl font-black text-slate-900">--</p>
                <p className="text-xs text-slate-500 mt-1">Waiting for executions</p>
              </div>

              <div className="border border-slate-100 bg-slate-50 p-4 rounded-lg flex flex-col items-center justify-center text-center">
                <ShieldAlert className="w-8 h-8 text-blue-500 mb-2" />
                <p className="text-xs font-bold text-slate-500 uppercase">Critical Open Bugs</p>
                <p className="text-3xl font-black text-slate-900">--</p>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <button className="px-10 py-3 bg-green-600 hover:bg-green-700 text-white font-black rounded-lg shadow-md transition transform hover:-translate-y-0.5">
                SIGN OFF RELEASE
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-10 shadow-sm text-center">
            <h2 className="text-lg font-bold text-slate-800 mb-2">No Upcoming Releases</h2>
            <p className="text-sm text-slate-500">Create a release version to track readiness.</p>
          </div>
        )}

      </main>
    </div>
  );
}
