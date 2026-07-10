'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import Sidebar from '@/components/sidebar';
import QACopilot from '@/components/copilot';
import { 
 UploadCloud, 
 FileText, 
 HelpCircle, 
 Sparkles, 
 Check, 
 Copy, 
 Play, 
 AlertTriangle,
 BadgeAlert,
 Settings2,
 FileCheck,
 Activity,
 Maximize2
} from 'lucide-react';
import axios from 'axios';

export default function RequirementsPage() {
 const router = useRouter();
 const { 
  token, 
  initializeAuth, 
  activeProject, 
  uploadRequirement, 
  generateQAPackage,
  loading 
 } = useAppStore();

 const [mounted, setMounted] = useState(false);
 const [file, setFile] = useState<File | null>(null);
 const [pastedText, setPastedText] = useState('');
 const [moduleName, setModuleName] = useState('Authentication');
 const [isUploading, setIsUploading] = useState(false);
 
 // Smart AI Controls
 const [generatePositive, setGeneratePositive] = useState(true);
 const [generateNegative, setGenerateNegative] = useState(true);
 const [generateBoundary, setGenerateBoundary] = useState(true);
 const [generateEdge, setGenerateEdge] = useState(true);

 // Status logs
 const [statusMsg, setStatusMsg] = useState<string | null>(null);
 const [packageResult, setPackageResult] = useState<any | null>(null);
 const [activeTab, setActiveTab] = useState<'analysis' | 'testcases' | 'bugs'>('analysis');
 const [bugFormat, setBugFormat] = useState<'enterprise' | 'jira' | 'developer'>('enterprise');
 const [activeBugIndex, setActiveBugIndex] = useState(0);

 // Copy status
 const [copied, setCopied] = useState(false);

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

 const triggerCopy = (text: string) => {
  navigator.clipboard.writeText(text);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
 };

 const handleGenerate = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!activeProject) {
   alert('Please select a project first!');
   return;
  }

  let targetFile = file;

  // Convert pasted text to a virtual file if no physical file was dropped
  if (!targetFile && pastedText.trim()) {
   const blob = new Blob([pastedText], { type: 'text/plain' });
   targetFile = new File([blob], `${moduleName.replace(/\s+/g, '_')}_spec.txt`);
  }

  if (!targetFile) {
   alert('Please upload a file or paste requirement text.');
   return;
  }

  setIsUploading(true);
  setStatusMsg('Uploading and extracting file content...');
  setPackageResult(null);

  const uploadRes = await uploadRequirement(activeProject.id, moduleName, targetFile);
  if (!uploadRes) {
   setIsUploading(false);
   setStatusMsg(null);
   alert('Failed to upload requirement. Please verify backend state.');
   return;
  }

  const { requirement_id, extracted_features } = uploadRes;

  setStatusMsg('Running AI Requirement Analysiseration (Business Rules, Test Cases & Bugs)...');

  // Compile filter flags
  const selectedTypes: string[] = [];
  if (generatePositive) selectedTypes.push('Positive');
  if (generateNegative) selectedTypes.push('Negative');
  if (generateBoundary) selectedTypes.push('Boundary');
  if (generateEdge) selectedTypes.push('Edge Case');

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  try {
   const genRes = await axios.post(`${API_BASE_URL}/api/ai/generate-package`, {
    requirement_id,
    selected_types: selectedTypes
   }, {
    headers: { Authorization: `Bearer ${token}` }
   });

   if (genRes.data?.success) {
    // Fetch detailed generated objects
    const tcRes = await axios.get(`${API_BASE_URL}/api/ai/testcases?project_id=${activeProject.id}`, {
     headers: { Authorization: `Bearer ${token}` }
    });
    const bugsRes = await axios.get(`${API_BASE_URL}/api/ai/bugs?project_id=${activeProject.id}`, {
     headers: { Authorization: `Bearer ${token}` }
    });

    // Set local parsed results
    setPackageResult({
     analysis: extracted_features,
     testcases: tcRes.data.filter((tc: any) => tc.requirement_id === requirement_id),
     bugs: bugsRes.data.filter((b: any) => b.requirement_id === requirement_id)
    });

    setStatusMsg(null);
    setActiveTab('analysis');
   }
  } catch (err) {
   alert('AI Generation encountered an error.');
  } finally {
   setIsUploading(false);
  }
 };

 return (
  <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
   <Sidebar />

   <div className="flex-1 min-w-0 p-4 md:p-8 flex flex-col gap-6">
    
    {/* Header */}
    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
     <div>
      <h1 className="text-2xl font-bold text-slate-900">Requirement Analysiserator</h1>
      <p className="text-xs text-slate-500">
       One-click blueprint generation. Upload PRD → Receive analysis, test suite, and bug matrices.
      </p>
     </div>
    </div>

    {activeProject ? (
     <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
      
      {/* Input Config Box (2 Columns on large screens) */}
      <div className="xl:col-span-2 flex flex-col gap-5">
       <form onSubmit={handleGenerate} className="bg-white border border-slate-200 shadow-sm p-6 rounded-xl flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
         <Settings2 className="w-5 h-5 text-[#2F81F7]" />
         <h3 className="font-semibold text-slate-900 text-sm">Generator Configuration</h3>
        </div>

        <div className="flex flex-col gap-1.5">
         <label className="text-xs font-semibold text-slate-700">Target Module</label>
         <input 
          type="text" 
          required
          value={moduleName}
          onChange={(e) => setModuleName(e.target.value)}
          className="glass-input px-3 py-2 text-sm"
          placeholder="e.g. Authentication, Billing, IVR Queue"
         />
        </div>

        {/* Upload Field */}
        <div className="flex flex-col gap-1.5">
         <label className="text-xs font-semibold text-slate-700">System Spec File / Screenshot</label>
         <div className="border border-dashed border-slate-700 hover:border-[#2F81F7]/50 rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition bg-white/10">
          <input 
           type="file" 
           id="prd-upload"
           onChange={(e) => setFile(e.target.files?.[0] || null)}
           className="hidden" 
          />
          <label htmlFor="prd-upload" className="flex flex-col items-center gap-2 cursor-pointer w-full text-center">
           <UploadCloud className="w-8 h-8 text-slate-500" />
           <span className="text-xs text-slate-700 font-medium">
            {file ? file.name : 'Choose PDF, DOCX, TXT, or Screenshot'}
           </span>
           <span className="text-[10px] text-slate-500">Max size 10MB</span>
          </label>
         </div>
        </div>

        <div className="relative flex py-1 items-center">
         <div className="flex-grow border-t border-slate-200"></div>
         <span className="flex-shrink mx-3 text-[10px] font-mono text-slate-500 uppercase">OR PASTE DIRECTLY</span>
         <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* Pasted text */}
        <div className="flex flex-col gap-1.5">
         <label className="text-xs font-semibold text-slate-700">User Story Description</label>
         <textarea 
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder="Paste PRD details, acceptance criteria, or API schemas here..."
          className="glass-input px-3 py-2 text-sm h-28 resize-none"
         />
        </div>

        {/* Toggle Controls */}
        <div className="flex flex-col gap-2.5">
         <label className="text-xs font-semibold text-slate-700">Smart Test Case Filters</label>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-slate-700">
           <input 
            type="checkbox" 
            checked={generatePositive} 
            onChange={(e) => setGeneratePositive(e.target.checked)}
            className="rounded border-slate-700 text-[#2F81F7] focus:ring-blue-500" 
           />
           Positive Cases
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-700">
           <input 
            type="checkbox" 
            checked={generateNegative} 
            onChange={(e) => setGenerateNegative(e.target.checked)}
            className="rounded border-slate-700 text-[#2F81F7] focus:ring-blue-500" 
           />
           Negative Cases
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-700">
           <input 
            type="checkbox" 
            checked={generateBoundary} 
            onChange={(e) => setGenerateBoundary(e.target.checked)}
            className="rounded border-slate-700 text-[#2F81F7] focus:ring-blue-500" 
           />
           Boundary Cases
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-700">
           <input 
            type="checkbox" 
            checked={generateEdge} 
            onChange={(e) => setGenerateEdge(e.target.checked)}
            className="rounded border-slate-700 text-[#2F81F7] focus:ring-blue-500" 
           />
           Edge Cases
          </label>
         </div>
        </div>

        <button
         type="submit"
         disabled={isUploading}
         className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#2F81F7] hover:from-blue-500 hover:to-slate-500 text-slate-900 transition duration-200 disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
        >
         <Sparkles className="w-4 h-4 text-black font-bold" />
         Generate QA Package
        </button>
       </form>
      </div>

      {/* Generated Outputs Area (3 Columns on large screens) */}
      <div className="xl:col-span-3 flex flex-col gap-4 min-h-[500px]">
       
       {/* Logging or Status indicator */}
       {isUploading && (
        <div className="flex-1 bg-white border border-slate-200 shadow-sm rounded-xl flex flex-col items-center justify-center p-8 text-center gap-4">
         <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
         <div className="flex flex-col gap-1">
          <h3 className="text-sm font-bold text-slate-900">Processing Document</h3>
          <p className="text-xs text-slate-500 font-mono animate-pulse">{statusMsg}</p>
         </div>
        </div>
       )}

       {/* No output placeholder */}
       {!isUploading && !packageResult && (
        <div className="flex-1 bg-white border border-slate-200 shadow-sm rounded-xl flex flex-col items-center justify-center p-8 text-center gap-4">
         <FileText className="w-16 h-16 text-slate-700 animate-pulse" />
         <div>
          <h3 className="text-sm font-bold text-slate-900">No QA Package Loaded</h3>
          <p className="text-xs text-slate-500 max-w-xs mt-1">
           Configure your module and drop a file to start generating the QA assets.
          </p>
         </div>
        </div>
       )}

       {/* Package Display Result */}
       {!isUploading && packageResult && (
        <div className="flex-1 flex flex-col pt-14 md:pt-0 overflow-x-hidden gap-4 animate-in fade-in duration-200">
         
         {/* Tab Selectors */}
         <div className="flex border-b border-slate-200 gap-2">
          <button
           onClick={() => setActiveTab('analysis')}
           className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
            activeTab === 'analysis' ? 'border-[#2F81F7] text-[#2F81F7]' : 'border-transparent text-slate-500 hover:text-slate-800'
           }`}
          >
           1. Requirement Specs
          </button>
          <button
           onClick={() => setActiveTab('testcases')}
           className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
            activeTab === 'testcases' ? 'border-[#2F81F7] text-[#2F81F7]' : 'border-transparent text-slate-500 hover:text-slate-800'
           }`}
          >
           2. Generated Test Cases ({packageResult.testcases.length})
          </button>
          <button
           onClick={() => setActiveTab('bugs')}
           className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
            activeTab === 'bugs' ? 'border-[#2F81F7] text-[#2F81F7]' : 'border-transparent text-slate-500 hover:text-slate-800'
           }`}
          >
           3. Suggested Bug Templates ({packageResult.bugs.length})
          </button>
         </div>

         {/* Tab content 1: Requirement analysis */}
         {activeTab === 'analysis' && (
          <div className="flex flex-col gap-4">
           {/* Summary Block */}
           <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-xl flex flex-col gap-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Extracted Summary</h4>
            <p className="text-xs text-slate-700 leading-relaxed">
             {packageResult.analysis?.summary || 'No summary generated.'}
            </p>
           </div>

           {/* Split list views */}
           <div className="grid grid-cols-1 md:grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl flex flex-col gap-2">
             <h4 className="text-xs font-bold text-[#2F81F7] uppercase tracking-wide">Business Rules</h4>
             <ul className="list-disc list-inside text-xs text-slate-700 flex flex-col gap-1.5">
              {packageResult.analysis?.business_rules?.map((rule: string, i: number) => (
               <li key={i}>{rule}</li>
              )) || <li>No explicit rules detected.</li>}
             </ul>
            </div>
            <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl flex flex-col gap-2">
             <h4 className="text-xs font-bold text-pink-400 uppercase tracking-wide">Input Validations</h4>
             <ul className="list-disc list-inside text-xs text-slate-700 flex flex-col gap-1.5">
              {packageResult.analysis?.validations?.map((val: string, i: number) => (
               <li key={i}>{val}</li>
              )) || <li>No inputs detected.</li>}
             </ul>
            </div>
            <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl flex flex-col gap-2">
             <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wide">Extracted Workflows</h4>
             <ul className="list-decimal list-inside text-xs text-slate-700 flex flex-col gap-1.5">
              {packageResult.analysis?.workflows?.map((wf: string, i: number) => (
               <li key={i}>{wf}</li>
              )) || <li>No workflows detected.</li>}
             </ul>
            </div>
            <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl flex flex-col gap-2">
             <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wide">Potential Edge Cases</h4>
             <ul className="list-disc list-inside text-xs text-slate-700 flex flex-col gap-1.5">
              {packageResult.analysis?.edge_cases?.map((edge: string, i: number) => (
               <li key={i}>{edge}</li>
              )) || <li>No edge cases extracted.</li>}
             </ul>
            </div>
           </div>
          </div>
         )}

         {/* Tab content 2: Test Cases list */}
         {activeTab === 'testcases' && (
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden border border-slate-200">
           <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
             <thead>
              <tr className="border-b border-slate-200 bg-white/40 text-[10px] uppercase text-slate-500 tracking-wider">
               <th className="p-3">ID</th>
               <th className="p-3">Scenario</th>
               <th className="p-3">Type</th>
               <th className="p-3">Priority</th>
               <th className="p-3 text-right">Conf. Score</th>
              </tr>
             </thead>
             <tbody className="divide-y divide-slate-800 text-xs text-slate-700">
              {packageResult.testcases.map((tc: any) => {
               const conf = tc.confidence_score || 90;
               const confColor = conf >= 90 ? 'text-emerald-400 bg-emerald-950/30 border-emerald-800/40' : 'text-amber-400 bg-amber-950/30 border-amber-800/40';
               
               return (
                <tr key={tc.id} className="hover:bg-white/10">
                 <td className="p-3 font-mono font-bold text-[#2F81F7]">{tc.custom_id}</td>
                 <td className="p-3">
                  <div className="font-semibold text-slate-900">{tc.feature}</div>
                  <div className="text-slate-500 mt-0.5">{tc.scenario}</div>
                 </td>
                 <td className="p-3"><span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-500">{tc.case_type}</span></td>
                 <td className="p-3"><span className="px-2 py-0.5 rounded bg-amber-950/20 text-[10px] text-amber-500 font-bold">{tc.priority}</span></td>
                 <td className="p-3 text-right">
                  <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${confColor}`}>
                   {conf}%
                  </span>
                 </td>
                </tr>
               );
              })}
             </tbody>
            </table>
           </div>
          </div>
         )}

         {/* Tab content 3: suggested Bugs layout */}
         {activeTab === 'bugs' && packageResult.bugs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
           
           {/* Left: Bugs Index selector */}
           <div className="flex flex-col gap-1.5 border-r border-slate-200 pr-4">
            {packageResult.bugs.map((bug: any, idx: number) => (
             <button
              key={bug.id}
              onClick={() => setActiveBugIndex(idx)}
              className={`w-full text-left p-2.5 rounded-lg border text-xs transition duration-150 ${
               activeBugIndex === idx
                ? 'bg-rose-950/20 border-rose-800/50 text-rose-300'
                : 'bg-transparent border-slate-200 text-slate-500 hover:bg-white/20'
              }`}
             >
              <div className="font-mono font-bold text-[10px] text-rose-400">{bug.custom_id}</div>
              <div className="font-medium truncate mt-0.5 text-slate-800">{bug.title}</div>
             </button>
            ))}
           </div>

           {/* Right: Format visual selector and detail pane */}
           <div className="md:col-span-3 flex flex-col gap-4">
            
            {/* Format Switcher */}
            <div className="flex justify-between items-center bg-white/30 p-2 rounded-lg border border-slate-200">
             <span className="text-xs text-slate-500 font-medium">Export Formats:</span>
             <div className="flex gap-1.5">
              {(['enterprise', 'jira', 'developer'] as const).map((fmt) => (
               <button
                key={fmt}
                onClick={() => setBugFormat(fmt)}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition ${
                 bugFormat === fmt
                  ? 'bg-[#2F81F7] text-slate-900 shadow'
                  : 'bg-transparent text-slate-500 hover:text-slate-800'
                }`}
               >
                {fmt}
               </button>
              ))}
             </div>
            </div>

            {/* Detail layout renders based on choice */}
            {bugFormat === 'enterprise' && (
             <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-xl flex flex-col gap-4 text-xs text-slate-700">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
               <h3 className="font-bold text-slate-900 text-sm">{packageResult.bugs[activeBugIndex].title}</h3>
               <span className="px-2 py-0.5 rounded bg-rose-900/20 text-rose-500 font-bold">
                {packageResult.bugs[activeBugIndex].severity}
               </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono">Steps to Reproduce</span>
                <p className="mt-1 whitespace-pre-line bg-slate-50/20 p-2.5 rounded border border-slate-200 font-mono text-[11px]">
                 {packageResult.bugs[activeBugIndex].steps_to_reproduce}
                </p>
               </div>
               <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono">Expected Outcomes</span>
                <p className="mt-1 bg-slate-50/20 p-2.5 rounded border border-slate-200">
                 {packageResult.bugs[activeBugIndex].expected_result}
                </p>
               </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-3">
               <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono">Impact Analysis</span>
                <p className="mt-1 text-slate-700">{packageResult.bugs[activeBugIndex].impact_analysis}</p>
               </div>
               <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono">Suggested Fix (Dev)</span>
                <p className="mt-1 text-slate-700 font-mono text-[11px]">{packageResult.bugs[activeBugIndex].root_cause_suggestion}</p>
               </div>
              </div>
             </div>
            )}

            {bugFormat === 'jira' && (
             <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl flex flex-col gap-3">
              <div className="flex justify-between items-center">
               <span className="text-xs text-slate-500">Raw JIRA markdown:</span>
               <button
                onClick={() => triggerCopy(packageResult.bugs[activeBugIndex].jira_format?.markdown || '')}
                className="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-700 flex items-center gap-1.5 hover:bg-slate-700"
               >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
               </button>
              </div>
              <pre className="p-3 bg-slate-50/50 rounded-lg text-[11px] font-mono text-slate-700 overflow-x-auto whitespace-pre-wrap max-h-80 border border-slate-200">
               {packageResult.bugs[activeBugIndex].jira_format?.markdown}
              </pre>
             </div>
            )}

            {bugFormat === 'developer' && (
             <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl flex flex-col gap-3">
              <div className="flex justify-between items-center">
               <span className="text-xs text-slate-500">Developer JSON metadata:</span>
               <button
                onClick={() => triggerCopy(JSON.stringify(packageResult.bugs[activeBugIndex].dev_format, null, 2))}
                className="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-700 flex items-center gap-1.5 hover:bg-slate-700"
               >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
               </button>
              </div>
              <pre className="p-3 bg-slate-50/50 rounded-lg text-[11px] font-mono text-slate-500 overflow-x-auto border border-slate-200">
               {JSON.stringify(packageResult.bugs[activeBugIndex].dev_format, null, 2)}
              </pre>
             </div>
            )}

           </div>
          </div>
         )}

        </div>
       )}

      </div>

     </div>
    ) : (
     <div className="flex-1 bg-white border border-slate-200 shadow-sm rounded-2xl flex flex-col items-center justify-center p-12 text-center gap-4 border border-dashed border-slate-200">
      <Activity className="w-16 h-16 text-slate-600 animate-pulse" />
      <div>
       <h2 className="text-lg font-bold text-slate-900">No Project Loaded</h2>
       <p className="text-xs text-slate-500 max-w-sm mt-1">
        Configure or select a project in the sidebar dropdown to run requirement scans.
       </p>
      </div>
     </div>
    )}

   </div>
   <QACopilot />
  </div>
 );
}
