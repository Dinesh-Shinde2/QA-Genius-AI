'use client';

import Sidebar from '@/components/sidebar';
import { PlayCircle, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

export default function TestExecution() {
  const { activeProject, testExecutions, fetchTestExecutions, createTestExecution } = useAppStore();
  const [suiteName, setSuiteName] = useState('');

  useEffect(() => {
    if (activeProject) {
      fetchTestExecutions(activeProject.id);
    }
  }, [activeProject, fetchTestExecutions]);

  const handleCreate = async () => {
    if (!activeProject || !suiteName) return;
    await createTestExecution({
      project_id: activeProject.id,
      suite_name: suiteName,
      status: 'NOT_EXECUTED'
    });
    setSuiteName('');
  };

  const runs = testExecutions || [];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pt-16 md:pt-6 flex flex-col gap-6">
        
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Test Execution</h1>
            <p className="text-xs text-slate-500">Track real-time pass/fail metrics across active test runs.</p>
          </div>
          <div className="flex gap-2">
            <input 
              value={suiteName} 
              onChange={(e) => setSuiteName(e.target.value)}
              placeholder="Suite Name" 
              className="px-3 py-2 border rounded-lg text-sm bg-white text-slate-900"
            />
            <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition">
              + New Test Run
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
             <div className="p-3 bg-green-100 text-green-600 rounded-lg"><CheckCircle2 className="w-6 h-6" /></div>
             <div>
               <p className="text-xs text-slate-500 font-bold uppercase">Total Passed</p>
               <p className="text-2xl font-black text-slate-900">{runs.filter((r:any) => r.status === 'PASS').length}</p>
             </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
             <div className="p-3 bg-red-100 text-red-600 rounded-lg"><XCircle className="w-6 h-6" /></div>
             <div>
               <p className="text-xs text-slate-500 font-bold uppercase">Total Failed</p>
               <p className="text-2xl font-black text-slate-900">{runs.filter((r:any) => r.status === 'FAIL').length}</p>
             </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
             <div className="p-3 bg-orange-100 text-orange-600 rounded-lg"><AlertTriangle className="w-6 h-6" /></div>
             <div>
               <p className="text-xs text-slate-500 font-bold uppercase">Blocked</p>
               <p className="text-2xl font-black text-slate-900">{runs.filter((r:any) => r.status === 'BLOCKED').length}</p>
             </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
             <div className="p-3 bg-slate-100 text-slate-600 rounded-lg"><Clock className="w-6 h-6" /></div>
             <div>
               <p className="text-xs text-slate-500 font-bold uppercase">Not Executed</p>
               <p className="text-2xl font-black text-slate-900">{runs.filter((r:any) => r.status === 'NOT_EXECUTED').length}</p>
             </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex-1">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase font-bold">
              <tr>
                <th className="p-4">Run ID</th>
                <th className="p-4">Suite Name</th>
                <th className="p-4">Status</th>
                <th className="p-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {runs.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 font-mono font-semibold text-blue-600">{r.id.split('-')[0]}</td>
                  <td className="p-4 font-semibold">{r.suite_name}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100">
                      {r.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 text-xs font-semibold">{r.created_at?.split('T')[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
