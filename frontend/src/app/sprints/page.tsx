'use client';

import Sidebar from '@/components/sidebar';
import { Briefcase, Bug, CheckSquare, Target, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

export default function SprintManagement() {
  const { activeProject, sprints, fetchSprints, createSprint } = useAppStore();
  const [sprintName, setSprintName] = useState('');

  useEffect(() => {
    if (activeProject) fetchSprints(activeProject.id);
  }, [activeProject, fetchSprints]);

  const handleCreate = async () => {
    if (!activeProject || !sprintName) return;
    await createSprint({
      project_id: activeProject.id,
      name: sprintName,
      goal: 'Deliver core features'
    });
    setSprintName('');
  };

  const activeSprint = sprints && sprints.length > 0 ? sprints[0] : null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pt-16 md:pt-6 flex flex-col gap-6">
        
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Sprint Management</h1>
            <p className="text-xs text-slate-500">Track testing efforts within your Agile iterations.</p>
          </div>
          <div className="flex gap-2">
            <input 
              value={sprintName} 
              onChange={(e) => setSprintName(e.target.value)}
              placeholder="Sprint Name" 
              className="px-3 py-2 border rounded-lg text-sm bg-white text-slate-900"
            />
            <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2">
              <Zap className="w-4 h-4" /> Create Sprint
            </button>
          </div>
        </div>

        {activeSprint ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" /> {activeSprint.name}
                </h2>
                <p className="text-sm text-slate-500 mt-1">Status: {activeSprint.status}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-500 uppercase">Sprint Goal</p>
                <p className="text-sm font-semibold text-slate-700 max-w-xs">{activeSprint.goal}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-xs font-bold text-slate-500 uppercase">Total Items</p>
                <p className="text-2xl font-black text-slate-900 mt-1">0</p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Sprint Backlog Items</h3>
              <p className="text-sm text-slate-500">No items assigned to this sprint yet.</p>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-10 shadow-sm text-center">
            <h2 className="text-lg font-bold text-slate-800 mb-2">No Active Sprints</h2>
            <p className="text-sm text-slate-500">Create a sprint to start tracking your agile efforts.</p>
          </div>
        )}

      </main>
    </div>
  );
}
