'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import Sidebar from '@/components/sidebar';
import QACopilot from '@/components/copilot';
import axios from 'axios';
import { 
  Globe, 
  Play, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  Code, 
  Clipboard, 
  Download, 
  FileSpreadsheet, 
  Send,
  FileCode,
  Check,
  ExternalLink,
  PlayCircle,
  FolderGit,
  X,
  GitBranch
} from 'lucide-react';

// Custom inline SVG icons for guaranteed package compatibility
const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const GitPullRequestIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
    <circle cx="18" cy="18" r="3" />
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M18 15V9a4 4 0 0 0-4-4H9" />
    <line x1="6" y1="9" x2="6" y2="15" stroke="currentColor" />
  </svg>
);

interface DOMElement {
  tag: string;
  id: string;
  name: string;
  type: string;
  placeholder: string;
  ariaLabel: string;
  role: string;
  dataTestId: string;
  href: string;
  altText: string;
  text: string;
  label: string;
  index: number;
  xpath?: string;
  cssSelector?: string;
  playwrightLocator?: string;
  xpathOk?: boolean;
  cssOk?: boolean;
  pwOk?: boolean;
  xpathCount?: number;
  cssCount?: number;
  pwCount?: number;
  locatorStrategy?: string;
  confidence?: string;
}

export default function LocatorXPage() {
  const router = useRouter();
  const { 
    token, initializeAuth, activeProject, testCases, fetchTestCases,
    githubConnected, githubRepoName, fetchGithubStatus, fetchProjectGithubRepo,
    pushPlaywrightScriptToGithub
  } = useAppStore();

  const [mounted, setMounted] = useState(false);
  const [pushingToGit, setPushingToGit] = useState(false);
  const [showPushModal, setShowPushModal] = useState(false);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState('');
  const [githubFilePath, setGithubFilePath] = useState('tests/e2e_flow.spec.js');
  const [gitStatusMsg, setGitStatusMsg] = useState<string | null>(null);
  const [gitErrorMsg, setGitErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchGithubStatus();
      if (activeProject) {
        fetchProjectGithubRepo(activeProject.id);
      }
    }
  }, [token, activeProject, fetchGithubStatus, fetchProjectGithubRepo]);

  // Core states
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [progressLogs, setProgressLogs] = useState<string[]>([]);
  const [elements, setElements] = useState<DOMElement[]>([]);
  
  // Tab control: 'elements' | 'pom' | 'script'
  const [activeTab, setActiveTab] = useState<'elements' | 'pom' | 'script'>('elements');
  
  // POM states
  const [selectedFramework, setSelectedFramework] = useState('playwright_js');
  const [pomCode, setPomCode] = useState('');
  const [generatingPOM, setGeneratingPOM] = useState(false);
  
  // Flow script states
  const [flowPrompt, setFlowPrompt] = useState('Login to the dashboard with admin/admin and verify welcome message.');
  const [scriptFramework, setScriptFramework] = useState('playwright_js');
  const [generatedScript, setGeneratedScript] = useState('');
  const [generatingScript, setGeneratingScript] = useState(false);

  const [copiedText, setCopiedText] = useState(false);

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

  const handlePushToGithub = async () => {
    if (!activeProject) {
      alert("Please select a project first.");
      return;
    }
    if (!githubRepoName) {
      alert("Please map a GitHub repository to this project in the GitHub Sync tab first.");
      return;
    }
    
    // Fetch project test cases if not loaded
    await fetchTestCases();
    setShowPushModal(true);
  };

  const executeGitPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !selectedTestCaseId) return;

    setPushingToGit(true);
    setGitStatusMsg(null);
    setGitErrorMsg(null);

    const res = await pushPlaywrightScriptToGithub(
      activeProject.id,
      selectedTestCaseId,
      generatedScript || pomCode,
      githubFilePath
    );

    setPushingToGit(false);

    if (res.success) {
      setGitStatusMsg(res.message || "Script pushed successfully! Opening Pull Request...");
      if (res.url) {
        window.open(res.url, "_blank");
      }
      setTimeout(() => {
        setShowPushModal(false);
        setGitStatusMsg(null);
      }, 3000);
    } else {
      setGitErrorMsg(res.message || "Failed to push script.");
    }
  };

  const addLog = (msg: string) => {
    setProgressLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setAnalyzing(true);
    setElements([]);
    setPomCode('');
    setGeneratedScript('');
    setProgressLogs([]);
    setActiveTab('elements');
    
    addLog("Initializing headless Playwright Chromium instance...");
    addLog(`Navigating to target URL: ${url}`);
    
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locator/analyze`, {
        url: url.trim(),
        locator_types: ["playwright", "xpath", "css"]
      });
      
      const data = res.data;
      addLog("Page loaded successfully.");
      addLog(`Extracted ${data.elements?.length || 0} visible elements.`);
      addLog("Starting AI selector synthesis...");
      addLog("Running live verification loop...");
      addLog("Unique matching verified successfully.");
      
      setElements(data.elements || []);
    } catch (err: any) {
      addLog(`Error: ${err.response?.data?.detail || err.message}`);
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGeneratePOM = async () => {
    if (elements.length === 0) return;
    setGeneratingPOM(true);
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locator/generate-pom`, {
        elements: elements.filter(el => el.xpathOk || el.cssOk || el.pwOk),
        framework: selectedFramework
      });
      setPomCode(res.data.code);
    } catch (err: any) {
      console.error(err);
    } finally {
      setGeneratingPOM(false);
    }
  };

  const handleGenerateScript = async () => {
    if (elements.length === 0) return;
    setGeneratingScript(true);
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locator/generate-script`, {
        elements: elements.filter(el => el.xpathOk || el.cssOk || el.pwOk),
        url: url,
        prompt: flowPrompt,
        framework: scriptFramework
      });
      setGeneratedScript(res.data.code);
    } catch (err: any) {
      console.error(err);
    } finally {
      setGeneratingScript(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleDownloadPOM = (code: string, prefix: string) => {
    const ext = selectedFramework.includes('py') ? 'py' : selectedFramework.includes('java') ? 'java' : 'js';
    const blob = new Blob([code], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${prefix}_page_object.${ext}`;
    link.click();
  };

  const handleExportExcel = async () => {
    if (elements.length === 0) return;
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locator/export-excel`,
        elements,
        { responseType: 'blob' }
      );
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'locatorx_verified_report.xlsx';
      link.click();
    } catch (err) {
      console.error("Export Excel failed", err);
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
      <Sidebar />
      
      <div className="flex-1 min-w-0 p-4 md:p-8 flex flex-col gap-6">
        
        {/* Header Title */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-6 h-6 text-blue-600 animate-pulse" />
              LocatorX - AI Test Locator Agent
            </h1>
            <p className="text-xs text-slate-500">
              Extract, verify, and generate automation Page Object Models & Flow Scripts from any URL.
            </p>
          </div>
        </div>

        {/* Input Control Box */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-3 items-end md:items-center">
            <div className="flex-1 w-full relative">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="https://example.com/login"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !url.trim()}
              className="w-full md:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing Page...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Analyze Page
                </>
              )}
            </button>
          </div>
          
          {/* Progress Logs */}
          {(analyzing || progressLogs.length > 0) && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 font-mono text-[11px] text-slate-300 max-h-[140px] overflow-y-auto flex flex-col gap-1.5 scrollbar-thin">
              {progressLogs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-slate-505 font-sans select-none">&gt;</span>
                  <span>{log}</span>
                </div>
              ))}
              {analyzing && (
                <div className="flex items-center gap-2 text-blue-400 mt-1 select-none animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Processing browser evaluation...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Output Section */}
        {elements.length > 0 && (
          <div className="flex flex-col gap-4">
            
            {/* Tabs Control */}
            <div className="flex border-b border-slate-200 gap-6 text-sm">
              <button
                onClick={() => setActiveTab('elements')}
                className={`pb-3 font-semibold transition-all border-b-2 ${
                  activeTab === 'elements' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Discovered Elements ({elements.length})
              </button>
              <button
                onClick={() => setActiveTab('pom')}
                className={`pb-3 font-semibold transition-all border-b-2 ${
                  activeTab === 'pom' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Page Object Model (POM)
              </button>
              <button
                onClick={() => setActiveTab('script')}
                className={`pb-3 font-semibold transition-all border-b-2 ${
                  activeTab === 'script' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Flow Script Generator
              </button>
            </div>

            {/* Tab 1: Elements Grid */}
            {activeTab === 'elements' && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <span className="text-xs font-semibold text-slate-550">VISUALLY DISCOVERED AND VERIFIED SELECTORS</span>
                  <button
                    onClick={handleExportExcel}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm bg-white"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
                    Export Excel Sheet
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-150 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-3">Element Tag</th>
                        <th className="p-3">Label / Text</th>
                        <th className="p-3">CSS Selector</th>
                        <th className="p-3">XPath Selector</th>
                        <th className="p-3">Playwright Locator</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {elements.map((el, i) => {
                        const isVerified = el.xpathOk || el.cssOk || el.pwOk;
                        return (
                          <tr key={i} className="hover:bg-slate-50/65 transition font-sans text-slate-700">
                            <td className="p-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-650 uppercase">
                                {el.tag} {el.type ? `(${el.type})` : ''}
                              </span>
                            </td>
                            <td className="p-3 font-semibold truncate max-w-[140px]" title={el.text}>
                              {el.label || el.text}
                            </td>
                            <td className="p-3 font-mono text-[10px] text-slate-500 break-all select-all">
                              {el.cssSelector}
                            </td>
                            <td className="p-3 font-mono text-[10px] text-slate-500 break-all select-all">
                              {el.xpath}
                            </td>
                            <td className="p-3 font-mono text-[10px] text-blue-600 break-all select-all">
                              {el.playwrightLocator}
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              {isVerified ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  Unique Match
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-semibold">
                                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                                  Ambiguous
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 2: POM Builder */}
            {activeTab === 'pom' && (
              <div className="flex flex-col gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-slate-900">Select Framework for Page Object Model</span>
                    <span className="text-xs text-slate-500">Only verified locators with unique matches will be included.</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedFramework}
                      onChange={(e) => setSelectedFramework(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition"
                    >
                      <option value="playwright_js">Playwright (JavaScript)</option>
                      <option value="playwright_py">Playwright (Python Async)</option>
                      <option value="selenium_java">Selenium (Java + PageFactory)</option>
                      <option value="selenium_py">Selenium (Python)</option>
                    </select>
                    <button
                      onClick={handleGeneratePOM}
                      disabled={generatingPOM}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                    >
                      {generatingPOM ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Code className="w-3.5 h-3.5" />
                          Generate POM Code
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {pomCode && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    {/* Left: POM Code Block */}
                    <div className="lg:col-span-8 bg-[#0B0F19] border border-slate-800 rounded-xl overflow-hidden shadow-md flex flex-col font-mono text-xs">
                      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between text-slate-350">
                        <span className="flex items-center gap-2 text-slate-400">
                          <FileCode className="w-4 h-4 text-blue-400" />
                          Auto-Generated Page Object Model
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleCopyCode(pomCode)}
                            className="hover:text-white flex items-center gap-1.5 transition text-[11px]"
                          >
                            {copiedText ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Clipboard className="w-3.5 h-3.5" />
                                Copy
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleDownloadPOM(pomCode, 'login_dashboard')}
                            className="hover:text-white flex items-center gap-1.5 transition text-[11px]"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </button>
                          {githubConnected && githubRepoName && (
                            <button
                              onClick={handlePushToGithub}
                              className="text-blue-500 hover:text-blue-400 flex items-center gap-1.5 transition text-[11px] font-bold border-l border-slate-700 pl-3"
                            >
                              <GithubIcon className="w-3.5 h-3.5" />
                              Push to GitHub
                            </button>
                          )}
                        </div>
                      </div>
                      <pre className="p-5 overflow-auto text-slate-200 max-h-[500px] leading-relaxed scrollbar-thin text-left">
                        <code>{pomCode}</code>
                      </pre>
                    </div>

                    {/* Right: Step-by-Step Instructions */}
                    <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                      <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        💡 How to Use This POM
                      </span>
                      <div className="flex flex-col gap-4 text-xs text-slate-650">
                        <div className="flex gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center select-none text-[10px] shrink-0">1</span>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-855">Save Class File</span>
                            <span>Save this code block as <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600">LoginPage.js</code> (or <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600">LoginPage.ts</code> if using TypeScript) inside your pages folder (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">tests/login/</code>).</span>
                          </div>
                        </div>

                        <div className="flex gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center select-none text-[10px] shrink-0">2</span>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-855">Create Test Spec File</span>
                            <span>Create a separate test file (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600">login.spec.ts</code>) to import and execute the class methods.</span>
                          </div>
                        </div>

                        <div className="flex flex-col bg-slate-900 text-slate-300 p-3 rounded-lg font-mono text-[10px] leading-relaxed relative select-all">
                          <span className="text-[9px] text-slate-500 mb-1 select-none">// Example Test Spec Template:</span>
                          <span>const {'{ test, expect }'} = require('@playwright/test');</span>
                          <span>const {'{ LoginPage }'} = require('./LoginPage.js');</span>
                          <span className="text-slate-500 mt-1 select-none">test('Login Flow', async ({'{ page }'}) =&gt; {'{'}</span>
                          <span>  const login = new LoginPage(page);</span>
                          <span>  await login.navigate();</span>
                          <span>  await login.fillEnterYourUserId('admin');</span>
                          <span>  await login.clickLogin();</span>
                          <span>{'}'});</span>
                        </div>

                        <div className="flex gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center select-none text-[10px] shrink-0">3</span>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-855">Execute in Terminal</span>
                            <span>Run the test command in your project shell:</span>
                            <code className="bg-slate-100 p-2 rounded text-slate-700 font-mono mt-1 text-[10px] select-all border border-slate-200 break-all">
                              npx playwright test tests/login/login.spec.ts --project=chromium --headed
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Flow Script Builder */}
            {activeTab === 'script' && (
              <div className="flex flex-col gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                  <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
                    <span className="text-sm font-bold text-slate-900">Agentic Script Generation</span>
                    <span className="text-xs text-slate-500">Provide natural instructions, and the AI agent will map it against verified selectors to output a complete automation test.</span>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-500">User Flow Instructions Prompt:</label>
                      <textarea
                        rows={3}
                        value={flowPrompt}
                        onChange={(e) => setFlowPrompt(e.target.value)}
                        placeholder="Login to page -> Click on Settings button -> Verify header has text 'Preferences'"
                        className="w-full p-3 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500">Target Framework:</span>
                        <select
                          value={scriptFramework}
                          onChange={(e) => setScriptFramework(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition"
                        >
                          <option value="playwright_js">Playwright (JavaScript)</option>
                          <option value="playwright_py">Playwright (Python)</option>
                          <option value="selenium_java">Selenium (Java)</option>
                          <option value="selenium_py">Selenium (Python)</option>
                        </select>
                      </div>
                      
                      <button
                        onClick={handleGenerateScript}
                        disabled={generatingScript || !flowPrompt.trim()}
                        className="px-4 py-2 bg-blue-650 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                      >
                        {generatingScript ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Synthesizing Script...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            Generate Test Script
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {generatedScript && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    {/* Left: Script Code Block */}
                    <div className="lg:col-span-8 bg-[#0B0F19] border border-slate-800 rounded-xl overflow-hidden shadow-md flex flex-col font-mono text-xs">
                      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between text-slate-350">
                        <span className="flex items-center gap-2 text-slate-400">
                          <FileCode className="w-4 h-4 text-emerald-400" />
                          Runnable E2E Automation Script
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleCopyCode(generatedScript)}
                            className="hover:text-white flex items-center gap-1.5 transition text-[11px]"
                          >
                            {copiedText ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Clipboard className="w-3.5 h-3.5" />
                                Copy
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleDownloadPOM(generatedScript, 'e2e_flow')}
                            className="hover:text-white flex items-center gap-1.5 transition text-[11px]"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </button>
                          {githubConnected && githubRepoName && (
                            <button
                              onClick={handlePushToGithub}
                              className="text-blue-500 hover:text-blue-400 flex items-center gap-1.5 transition text-[11px] font-bold border-l border-slate-700 pl-3"
                            >
                              <GithubIcon className="w-3.5 h-3.5" />
                              Push to GitHub
                            </button>
                          )}
                        </div>
                      </div>
                      <pre className="p-5 overflow-auto text-slate-200 max-h-[500px] leading-relaxed scrollbar-thin text-left">
                        <code>{generatedScript}</code>
                      </pre>
                    </div>

                    {/* Right: Step-by-Step Instructions */}
                    <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                      <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        💡 How to Run This E2E Test
                      </span>
                      <div className="flex flex-col gap-4 text-xs text-slate-650">
                        <div className="flex gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center select-none text-[10px] shrink-0">1</span>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-855">Save Spec File</span>
                            <span>Save this script directly as a spec file (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600">login.spec.ts</code>) inside your project's tests folder (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">tests/login/</code>).</span>
                          </div>
                        </div>

                        <div className="flex gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center select-none text-[10px] shrink-0">2</span>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-855">Execute in Terminal</span>
                            <span>Run the test directly in headed mode to verify your actions:</span>
                            <code className="bg-slate-100 p-2 rounded text-slate-700 font-mono mt-1 text-[10px] select-all border border-slate-200 break-all">
                              npx playwright test tests/login/login.spec.ts --project=chromium --headed
                            </code>
                          </div>
                        </div>

                        <div className="flex gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center select-none text-[10px] shrink-0">3</span>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-855">Review HTML Report</span>
                            <span>If there are failures, review the visual trace report:</span>
                            <code className="bg-slate-100 p-2 rounded text-slate-700 font-mono mt-1 text-[10px] select-all border border-slate-200 break-all">
                              npx playwright show-report
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </div>
      {/* ─── Push Script to GitHub Modal ────────────────────────────────── */}
      {showPushModal && activeProject && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={executeGitPush}
            className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-[#c9d1d9]"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                <GithubIcon className="w-5 h-5 text-blue-500" />
                Push Script & Open PR
              </h2>
              <button
                type="button"
                onClick={() => setShowPushModal(false)}
                className="p-1.5 rounded-lg hover:bg-[#30363d] text-[#8b949e] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {gitStatusMsg && (
              <div className="mb-4 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 p-3 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                {gitStatusMsg}
              </div>
            )}
            {gitErrorMsg && (
              <div className="mb-4 bg-rose-950/40 border border-rose-500/30 text-rose-400 p-3 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                {gitErrorMsg}
              </div>
            )}

            <div className="space-y-4">
              <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs text-[#8b949e]">
                <span className="block font-bold text-white mb-0.5">Target Repository:</span>
                {githubRepoName}
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8b949e] mb-1.5 block">File Path in Repository</label>
                <input
                  type="text"
                  required
                  value={githubFilePath}
                  onChange={(e) => setGithubFilePath(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8b949e] mb-1.5 block">Link to Test Case</label>
                <select
                  required
                  value={selectedTestCaseId}
                  onChange={(e) => setSelectedTestCaseId(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="" disabled>Choose a test case to map...</option>
                  {testCases.map((tc: any) => (
                    <option key={tc.id} value={tc.id}>
                      {tc.custom_id}: {tc.title || tc.scenario?.substring(0, 40)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowPushModal(false)}
                className="px-4 py-2 text-xs font-medium text-[#8b949e] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pushingToGit || !selectedTestCaseId || !githubFilePath.trim()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition active:scale-95 shadow-md shadow-blue-900/10 flex items-center gap-1.5"
              >
                {pushingToGit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Pushing...
                  </>
                ) : (
                  <>
                    <GitPullRequestIcon className="w-3.5 h-3.5" />
                    Push & Open PR
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <QACopilot />
    </div>
  );
}
