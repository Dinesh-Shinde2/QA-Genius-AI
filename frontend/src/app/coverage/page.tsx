'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import Sidebar from '@/components/sidebar';
import { 
 BarChart3, 
 Search, 
 Download, 
 CheckCircle2, 
 XCircle, 
 AlertTriangle,
 Layers
} from 'lucide-react';

export default function CoverageMatrixPage() {
 const router = useRouter();
 const { 
  token, 
  initializeAuth, 
  activeProject, 
  coverageMatrix, 
  fetchCoverageMatrix 
 } = useAppStore();

 const [mounted, setMounted] = useState(false);
 const [searchTerm, setSearchTerm] = useState('');
 const [statusFilter, setStatusFilter] = useState('ALL');

 useEffect(() => {
  setMounted(true);
  initializeAuth();
 }, [initializeAuth]);

 useEffect(() => {
  if (mounted && !token) {
   router.push('/');
  }
 }, [token, mounted, router]);

 if (!mounted || !token) return null;

 // Filter matrix items
 const filteredMatrix = coverageMatrix.filter((item) => {
  const matchesSearch = 
   item.requirement_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
   item.module.toLowerCase().includes(searchTerm.toLowerCase());
   
  const matchesStatus = 
   statusFilter === 'ALL' || 
   item.status === statusFilter;
   
  return matchesSearch && matchesStatus;
 });

 // Calculate percentages
 const total = coverageMatrix.length;
 const covered = coverageMatrix.filter(c => c.test_case_count > 0).length;
 const coveragePercent = total > 0 ? Math.round((covered / total) * 100) : 0;

 const handleExportMatrix = () => {
  if (!filteredMatrix.length) return;
  
  // Generate CSV in browser client-side
  const headers = ['Module', 'Requirement', 'Test Cases Count', 'Coverage Status'];
  const rows = filteredMatrix.map(item => [
   item.module,
   `"${item.requirement_title.replace(/"/g, '""')}"`,
   item.test_case_count,
   item.status
  ]);
  
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${activeProject?.name || 'project'}_coverage_matrix.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
 };

 return (
  <div className="flex min-min-h-screen bg-slate-50">
   <Sidebar />

   <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
    
    {/* Header */}
    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
     <div>
      <h1 className="text-2xl font-bold text-slate-900">Requirement Coverage Matrix</h1>
      <p className="text-xs text-slate-500">
       {activeProject ? `RTM tracking sheet for ${activeProject.name}` : 'Select a project to review trace links.'}
      </p>
     </div>
     {activeProject && (
      <button
       onClick={handleExportMatrix}
       className="px-3 py-1.5 rounded-lg bg-[#2F81F7] hover:bg-[#2F81F7] text-xs font-semibold text-slate-900 flex items-center gap-1.5 transition"
      >
       <Download className="w-3.5 h-3.5" />
       Export RTM to CSV
      </button>
     )}
    </div>

    {/* Global Summary Badge Card */}
    {activeProject && total > 0 && (
     <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-xl flex items-center justify-between">
      <div className="flex flex-col gap-1">
       <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Overall Coverage Index</span>
       <span className="text-2xl font-extrabold text-slate-900">
        {coveragePercent}% <span className="text-xs text-slate-500 font-normal">({covered} of {total} requirements mapped)</span>
       </span>
      </div>

      {/* Visual Bar progress */}
      <div className="w-64 h-3 bg-white rounded-full overflow-hidden border border-slate-200">
       <div 
        className="h-full bg-[#2F81F7] rounded-full" 
        style={{ width: `${coveragePercent}%` }}
       />
      </div>
     </div>
    )}

    {/* Filter controls panel */}
    {activeProject && (
     <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
      <div className="relative w-full md:w-80">
       <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
       <input 
        type="text" 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full glass-input pl-10 pr-3 py-2 text-xs"
        placeholder="Search modules or requirements..."
       />
      </div>

      <div className="flex items-center gap-2 text-xs">
       <span className="text-slate-500 font-medium">Filter Status:</span>
       <div className="flex gap-1">
        {(['ALL', 'COVERED', 'MISSING'] as const).map((status) => (
         <button
          key={status}
          onClick={() => setStatusFilter(status)}
          className={`px-2.5 py-1 rounded border transition ${
           statusFilter === status
            ? 'bg-blue-950/40 border-[#2F81F7] text-blue-300 font-semibold'
            : 'bg-transparent border-slate-200 text-slate-500 hover:text-slate-800'
          }`}
         >
          {status}
         </button>
        ))}
       </div>
      </div>
     </div>
    )}

    {/* Spreadsheet matrix */}
    {activeProject ? (
     <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden border border-slate-200">
      <div className="overflow-x-auto">
       <table className="w-full text-left border-collapse">
        <thead>
         <tr className="border-b border-slate-200 bg-white/40 text-[10px] uppercase text-slate-500 tracking-wider">
          <th className="p-3">Module</th>
          <th className="p-3">Requirement Document Scope</th>
          <th className="p-3 text-center">Test Cases Count</th>
          <th className="p-3 text-right">Coverage Status</th>
         </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 text-xs text-slate-700">
         {filteredMatrix.length > 0 ? (
          filteredMatrix.map((item, idx) => {
           const isCovered = item.test_case_count > 0;
           return (
            <tr key={idx} className="hover:bg-white/10">
             <td className="p-3 font-semibold text-slate-900">{item.module}</td>
             <td className="p-3">{item.requirement_title}</td>
             <td className="p-3 text-center font-mono font-bold">{item.test_case_count}</td>
             <td className="p-3 text-right">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${
               isCovered
                ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400'
                : 'bg-rose-950/20 border-rose-900/40 text-rose-400'
              }`}>
               {isCovered ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
               {item.status}
              </span>
             </td>
            </tr>
           );
          })
         ) : (
          <tr>
           <td colSpan={4} className="p-8 text-center text-slate-500 font-mono">
            No coverage mapping exists. Create a requirement module.
           </td>
          </tr>
         )}
        </tbody>
       </table>
      </div>
     </div>
    ) : (
     <div className="flex-grow bg-white border border-slate-200 shadow-sm rounded-2xl flex flex-col items-center justify-center p-12 text-center gap-4 border border-dashed border-slate-200">
      <Layers className="w-16 h-16 text-slate-600" />
      <div>
       <h2 className="text-lg font-bold text-slate-900">No Project Active</h2>
       <p className="text-xs text-slate-500 max-w-sm mt-1">
        Please select or initialize a project in the sidebar layout to compile the trace link mapping.
       </p>
      </div>
     </div>
    )}

   </div>
  </div>
 );
}
