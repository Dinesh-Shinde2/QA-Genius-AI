import { create } from 'zustand';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Global response interceptor to handle 401 Unauthorized (token expired)
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('activeProject');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);


interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  tech_stack?: string;
}

interface TestCase {
  id: string;
  custom_id: string;
  module: string;
  feature: string;
  scenario: string;
  preconditions?: string;
  steps: string;
  test_data?: string;
  expected_result: string;
  priority: string;
  case_type: string;
  confidence_score: number;
  status?: string;
}

interface BugReport {
  id: string;
  custom_id: string;
  title: string;
  module: string;
  feature: string;
  summary: string;
  description: string;
  preconditions?: string;
  steps_to_reproduce: string;
  expected_result: string;
  actual_result: string;
  severity: string;
  priority: string;
  severity_reason?: string;
  environment: string;
  attachment_url?: string;
  impact_analysis?: string;
  root_cause_suggestion?: string;
  jira_format?: { markdown: string };
  dev_format?: any;
  status?: string;
}

interface EnterpriseBug {
  id: string;
  custom_id: string;
  project_id: string;
  title: string;
  module: string;
  feature: string;
  description: string;
  preconditions?: string;
  steps_to_reproduce: string;
  expected_result: string;
  actual_result: string;
  severity: string;
  priority: string;
  environment: string;
  build_version?: string;
  status: string;
  created_by?: string;
  created_by_name?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  assigned_to_role?: string;
  tags?: string[];
  root_cause_suggestion?: string;
  fix_details?: string;
  impact_analysis?: string;
  severity_reason?: string;
  created_at: string;
  updated_at: string;
  comments?: BugComment[];
  history?: BugHistoryItem[];
  assignment_history?: any[];
}

interface BugComment {
  id: string;
  bug_id: string;
  author_id: string;
  author_name: string;
  author_email: string;
  author_role: string;
  content: string;
  parent_comment_id?: string;
  created_at: string;
}

interface BugHistoryItem {
  id: string;
  bug_id: string;
  changed_by: string;
  changed_by_name: string;
  action: string;
  old_value?: string;
  new_value?: string;
  description?: string;
  created_at: string;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  team_type: string;
  created_by: string;
  created_at: string;
  member_count?: number;
  members?: any[];
  projects?: any[];
}

interface AppNotification {
  id: string;
  bug_id?: string;
  bug_title?: string;
  notification_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface CoverageItem {
  module: string;
  requirement_title: string;
  test_case_count: number;
  status: string;
}

interface AppState {
  token: string | null;
  user: User | null;
  projects: Project[];
  activeProject: Project | null;
  testCases: TestCase[];
  bugs: BugReport[];
  coverageMatrix: CoverageItem[];
  loading: boolean;
  error: string | null;

  // Enterprise Bug Module
  enterpriseBugs: EnterpriseBug[];
  activeBug: EnterpriseBug | null;
  bugDashboard: any | null;
  teams: Team[];
  notifications: AppNotification[];
  unreadNotificationCount: number;
  
  // Auth actions
  login: (credentials: any) => Promise<boolean>;
  registerUser: (userData: any) => Promise<boolean>;
  logout: () => void;
  initializeAuth: () => void;
  
  // Project actions
  fetchProjects: () => Promise<void>;
  createProject: (projectData: any) => Promise<boolean>;
  deleteProject: (projectId: string) => Promise<boolean>;
  setActiveProject: (project: Project | null) => void;
  
  // Resource actions
  fetchTestCases: (projectId: string, module?: string) => Promise<void>;
  fetchBugs: (projectId: string) => Promise<void>;
  fetchCoverageMatrix: (projectId: string) => Promise<void>;
  generateQAPackage: (requirementId: string, selectedTypes: string[]) => Promise<boolean>;
  uploadRequirement: (projectId: string, module: string, file: File) => Promise<any>;
  generateManualBug: (projectId: string, module: string, details?: string, file?: File) => Promise<boolean>;
  generateManualBugPreview: (projectId: string, module: string, details?: string, file?: File) => Promise<any>;
  saveManualBug: (bugData: any) => Promise<boolean>;
  updateBug: (bugId: string, bugData: any) => Promise<boolean>;
  updateTestCase: (caseId: string, caseData: any) => Promise<boolean>;
  generateManualTestCasesPreview: (projectId: string, module: string, requirementText: string, selectedTypes: string[]) => Promise<any[] | null>;
  saveManualTestCases: (projectId: string, testCases: any[]) => Promise<boolean>;
  saveADOSettings: (projectId: string, orgName: string, projectName: string, patToken: string) => Promise<boolean>;
  fetchADOSettings: (projectId: string) => Promise<any>;
  syncBugToADO: (bugId: string) => Promise<{ success: boolean; url?: string; error?: string; work_item_id?: number }>;
  syncTestCaseToADO: (caseId: string) => Promise<{ success: boolean; url?: string; error?: string; work_item_id?: number }>;
  sendCopilotMessage: (projectId: string, message: string, history: any[]) => Promise<string | null>;

  // Enterprise Bug actions
  fetchEnterpriseBugs: (projectId: string, filters?: any) => Promise<void>;
  createEnterpriseBug: (bugData: any) => Promise<EnterpriseBug | null>;
  getEnterpriseBug: (bugId: string) => Promise<EnterpriseBug | null>;
  updateEnterpriseBug: (bugId: string, bugData: any) => Promise<boolean>;
  deleteEnterpriseBug: (bugId: string) => Promise<boolean>;
  changeBugStatus: (bugId: string, newStatus: string, comment?: string) => Promise<boolean>;
  assignBug: (bugId: string, assignedTo: string, comment?: string) => Promise<boolean>;
  addBugComment: (bugId: string, content: string, parentId?: string) => Promise<boolean>;
  getBugHistory: (bugId: string) => Promise<any[]>;
  fetchBugDashboard: (projectId: string) => Promise<void>;
  generateAIBug: (projectId: string, description: string, module?: string) => Promise<any | null>;
  setActiveBug: (bug: EnterpriseBug | null) => void;

  // Team actions
  fetchTeams: () => Promise<void>;
  createTeam: (teamData: any) => Promise<boolean>;
  updateTeam: (teamId: string, teamData: any) => Promise<boolean>;
  deleteTeam: (teamId: string) => Promise<boolean>;
  addTeamMember: (teamId: string, userId: string, roleInTeam?: string) => Promise<boolean>;
  removeTeamMember: (teamId: string, userId: string) => Promise<boolean>;
  getTeam: (teamId: string) => Promise<Team | null>;
  searchUsers: (query: string) => Promise<any[]>;
  assignTeamToProject: (teamId: string, projectId: string) => Promise<boolean>;
  getProjectTeams: (projectId: string) => Promise<any[]>;

  // Notification actions
  fetchNotifications: () => Promise<void>;
  markNotificationsRead: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  token: null,
  user: null,
  projects: [],
  activeProject: null,
  testCases: [],
  bugs: [],
  coverageMatrix: [],
  loading: false,
  error: null,

  // Enterprise bug state
  enterpriseBugs: [],
  activeBug: null,
  bugDashboard: null,
  teams: [],
  notifications: [],
  unreadNotificationCount: 0,

  initializeAuth: () => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      const storedProject = localStorage.getItem('activeProject');
      
      if (storedToken && storedUser) {
        set({ 
          token: storedToken, 
          user: JSON.parse(storedUser),
          activeProject: storedProject ? JSON.parse(storedProject) : null
        });
      }
    }
  },

  login: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, credentials);
      const { access_token, user } = res.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      set({ token: access_token, user, loading: false });
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Authentication failed';
      set({ error: msg, loading: false });
      return false;
    }
  },

  registerUser: async (userData) => {
    set({ loading: true, error: null });
    try {
      await axios.post(`${API_BASE_URL}/api/auth/register`, userData);
      set({ loading: false });
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Registration failed';
      set({ error: msg, loading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeProject');
    set({ token: null, user: null, activeProject: null, projects: [], testCases: [], bugs: [], coverageMatrix: [] });
  },

  fetchProjects: async () => {
    const { token } = get();
    if (!token) return;
    set({ loading: true, error: null });
    try {
      const res = await axios.get(`${API_BASE_URL}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ projects: res.data, loading: false });
      
      // Auto-set first project as active if none is active
      const { activeProject } = get();
      if (res.data.length > 0 && !activeProject) {
        get().setActiveProject(res.data[0]);
      }
    } catch (err: any) {
      set({ error: 'Could not fetch projects', loading: false });
    }
  },

  createProject: async (projectData) => {
    const { token } = get();
    if (!token) return false;
    set({ loading: true, error: null });
    try {
      const res = await axios.post(`${API_BASE_URL}/api/projects`, projectData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await get().fetchProjects();
      set({ loading: false });
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to create project';
      set({ error: msg, loading: false });
      return false;
    }
  },

  deleteProject: async (projectId) => {
    const { token, activeProject } = get();
    if (!token) return false;
    set({ loading: true, error: null });
    try {
      await axios.delete(`${API_BASE_URL}/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (activeProject?.id === projectId) {
        localStorage.removeItem('activeProject');
        set({ activeProject: null });
      }
      await get().fetchProjects();
      set({ loading: false });
      return true;
    } catch (err: any) {
      set({ error: 'Failed to delete project', loading: false });
      return false;
    }
  },

  setActiveProject: (project) => {
    if (project) {
      localStorage.setItem('activeProject', JSON.stringify(project));
    } else {
      localStorage.remove('activeProject');
    }
    set({ activeProject: project, testCases: [], bugs: [], coverageMatrix: [] });
    if (project) {
      get().fetchTestCases(project.id);
      get().fetchBugs(project.id);
      get().fetchCoverageMatrix(project.id);
    }
  },

  fetchTestCases: async (projectId, module) => {
    const { token } = get();
    if (!token) return;
    try {
      const url = `${API_BASE_URL}/api/reports/export?project_id=${projectId}&format_type=CSV`;
      // Instead of downloading, we can fetch JSON cases. Let's make sure the direct TC fetch is called.
      // Wait, we need to list them. Let's query SQL directly via standard FastAPI endpoints if we add them,
      // or we can fetch them from SQL. Wait, let's write a simple helper endpoint on reports/projects to query test cases, 
      // or we can write a quick query directly. Let's check reports.py - wait! We wrote API Design table:
      // GET `/api/testcases` query: `projectId`, `module`
      // Let's verify: did we add that route in the backend? Let's check reports.py or generator.py.
      // Oh! In reports.py we have export, but we can also write a GET endpoint for direct listing of testcases and bugs!
      // Let's add standard GET endpoints for testcases and bugs in a quick edit to generator.py or reports.py, or write a dedicated router.
      // Wait, let's write a quick endpoint to retrieve them in JSON format instead of just CSV/Excel.
      // Let's query the API base:
      const res = await axios.get(`${API_BASE_URL}/api/ai/testcases?project_id=${projectId}${module ? `&module=${module}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ testCases: res.data });
    } catch (err) {
      console.error("Failed to fetch test cases", err);
    }
  },

  fetchBugs: async (projectId) => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/ai/bugs?project_id=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ bugs: res.data });
    } catch (err) {
      console.error("Failed to fetch bugs", err);
    }
  },

  fetchCoverageMatrix: async (projectId) => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/reports/coverage/matrix?project_id=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ coverageMatrix: res.data });
    } catch (err) {
      console.error("Failed to fetch coverage matrix", err);
    }
  },

  generateQAPackage: async (requirementId, selectedTypes) => {
    const { token, activeProject } = get();
    if (!token || !activeProject) return false;
    set({ loading: true, error: null });
    try {
      await axios.post(`${API_BASE_URL}/api/ai/generate-package`, {
        requirement_id: requirementId,
        selected_types: selectedTypes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh views
      await get().fetchTestCases(activeProject.id);
      await get().fetchBugs(activeProject.id);
      await get().fetchCoverageMatrix(activeProject.id);
      
      set({ loading: false });
      return true;
    } catch (err: any) {
      set({ error: 'AI Package generation failed', loading: false });
      return false;
    }
  },

  uploadRequirement: async (projectId, module, file) => {
    const { token } = get();
    if (!token) return null;
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('project_id', projectId);
      formData.append('module', module);
      formData.append('file', file);
      
      const res = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`
        }
      });
      set({ loading: false });
      return res.data; // contains requirement_id and extracted_features
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Upload failed';
      set({ error: msg, loading: false });
      return null;
    }
  },

  generateManualBug: async (projectId, module, details, file) => {
    const { token } = get();
    if (!token) return false;
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('project_id', projectId);
      formData.append('module', module);
      if (details) formData.append('details', details);
      if (file) formData.append('file', file);
      
      await axios.post(`${API_BASE_URL}/api/ai/generate-bug-manual`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`
        }
      });
      
      // Refresh bugs
      const activeProj = get().activeProject;
      if (activeProj) {
        await get().fetchBugs(activeProj.id);
      }
      
      set({ loading: false });
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Bug generation failed';
      set({ error: msg, loading: false });
      return false;
    }
  },

  generateManualBugPreview: async (projectId, module, details, file) => {
    const { token } = get();
    if (!token) return null;
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('project_id', projectId);
      formData.append('module', module);
      if (details) formData.append('details', details);
      if (file) formData.append('file', file);
      
      const res = await axios.post(`${API_BASE_URL}/api/ai/generate-bug-manual`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`
        }
      });
      set({ loading: false });
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Bug generation failed';
      set({ error: msg, loading: false });
      return null;
    }
  },

  saveManualBug: async (bugData) => {
    const { token } = get();
    if (!token) return false;
    set({ loading: true, error: null });
    try {
      await axios.post(`${API_BASE_URL}/api/ai/save-bug-manual`, bugData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Refresh bugs
      const activeProj = get().activeProject;
      if (activeProj) {
        await get().fetchBugs(activeProj.id);
      }
      
      set({ loading: false });
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to save bug';
      set({ error: msg, loading: false });
      return false;
    }
  },

  updateBug: async (bugId, bugData) => {
    const { token } = get();
    if (!token) return false;
    set({ loading: true, error: null });
    try {
      await axios.put(`${API_BASE_URL}/api/ai/bugs/${bugId}`, bugData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Refresh bugs
      const activeProj = get().activeProject;
      if (activeProj) {
        await get().fetchBugs(activeProj.id);
      }
      
      set({ loading: false });
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update bug';
      set({ error: msg, loading: false });
      return false;
    }
  },

  updateTestCase: async (caseId, caseData) => {
    const { token } = get();
    if (!token) return false;
    set({ loading: true, error: null });
    try {
      await axios.put(`${API_BASE_URL}/api/ai/test-cases/${caseId}`, caseData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Refresh test cases
      const activeProj = get().activeProject;
      if (activeProj) {
        await get().fetchTestCases(activeProj.id);
      }
      
      set({ loading: false });
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update test case';
      set({ error: msg, loading: false });
      return false;
    }
  },

  generateManualTestCasesPreview: async (projectId, module, requirementText, selectedTypes) => {
    const { token } = get();
    if (!token) return null;
    set({ loading: true, error: null });
    try {
      const res = await axios.post(`${API_BASE_URL}/api/ai/generate-testcases-manual`, {
        project_id: projectId,
        module,
        requirement_text: requirementText,
        selected_types: selectedTypes
      }, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      set({ loading: false });
      return res.data.test_cases;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Testcase generation failed';
      set({ error: msg, loading: false });
      return null;
    }
  },

  saveManualTestCases: async (projectId, testCases) => {
    const { token } = get();
    if (!token) return false;
    set({ loading: true, error: null });
    try {
      await axios.post(`${API_BASE_URL}/api/ai/save-testcases-manual`, {
        project_id: projectId,
        test_cases: testCases
      }, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const activeProj = get().activeProject;
      if (activeProj) {
        await get().fetchTestCases(activeProj.id);
      }
      
      set({ loading: false });
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to save test cases';
      set({ error: msg, loading: false });
      return false;
    }
  },

  saveADOSettings: async (projectId, orgName, projectName, patToken) => {
    const { token } = get();
    if (!token) return false;
    set({ loading: true, error: null });
    try {
      await axios.post(`${API_BASE_URL}/api/integrations/azure-devops/settings`, {
        project_id: projectId,
        org_name: orgName,
        project_name: projectName,
        pat_token: patToken
      }, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      set({ loading: false });
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to save Azure DevOps settings';
      set({ error: msg, loading: false });
      return false;
    }
  },

  fetchADOSettings: async (projectId) => {
    const { token } = get();
    if (!token) return null;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/integrations/azure-devops/settings?project_id=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    } catch (err: any) {
      return null;
    }
  },

  syncBugToADO: async (bugId) => {
    const { token } = get();
    if (!token) return { success: false, error: 'Unauthorized' };
    set({ loading: true, error: null });
    try {
      const res = await axios.post(`${API_BASE_URL}/api/integrations/azure-devops/sync-bug/${bugId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const activeProj = get().activeProject;
      if (activeProj) {
        await get().fetchBugs(activeProj.id);
      }
      
      set({ loading: false });
      return { success: true, url: res.data.url, work_item_id: res.data.work_item_id };
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to sync bug to Azure DevOps';
      set({ error: msg, loading: false });
      return { success: false, error: msg };
    }
  },

  syncTestCaseToADO: async (caseId) => {
    const { token } = get();
    if (!token) return { success: false, error: 'Unauthorized' };
    set({ loading: true, error: null });
    try {
      const res = await axios.post(`${API_BASE_URL}/api/integrations/azure-devops/sync-testcase/${caseId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const activeProj = get().activeProject;
      if (activeProj) {
        await get().fetchTestCases(activeProj.id);
      }
      
      set({ loading: false });
      return { success: true, url: res.data.url, work_item_id: res.data.work_item_id };
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to sync test case to Azure DevOps';
      set({ error: msg, loading: false });
      return { success: false, error: msg };
    }
  },

  sendCopilotMessage: async (projectId, message, history) => {
    const { token } = get();
    if (!token) return null;
    try {
      const res = await axios.post(`${API_BASE_URL}/api/ai/copilot-chat`, {
        project_id: projectId,
        message,
        history
      }, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return res.data.response;
    } catch (err: any) {
      return 'I encountered a connection error. Please verify your backend server state.';
    }
  },

  // ─── Enterprise Bug Actions ────────────────────────────────────────────

  fetchEnterpriseBugs: async (projectId, filters = {}) => {
    const { token } = get();
    if (!token) return;
    try {
      const params = new URLSearchParams({ project_id: projectId });
      if (filters.status) params.append('status', filters.status);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.module) params.append('module', filters.module);
      if (filters.search) params.append('search', filters.search);
      const res = await axios.get(`${API_BASE_URL}/api/bugs?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ enterpriseBugs: res.data.bugs || [] });
    } catch (err) {
      console.error('Failed to fetch enterprise bugs', err);
    }
  },

  createEnterpriseBug: async (bugData) => {
    const { token } = get();
    if (!token) return null;
    try {
      const res = await axios.post(`${API_BASE_URL}/api/bugs`, bugData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      await get().fetchEnterpriseBugs(bugData.project_id);
      return res.data;
    } catch (err: any) {
      console.error('Failed to create enterprise bug', err);
      return null;
    }
  },

  getEnterpriseBug: async (bugId) => {
    const { token } = get();
    if (!token) return null;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/bugs/${bugId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ activeBug: res.data });
      return res.data;
    } catch (err) {
      return null;
    }
  },

  updateEnterpriseBug: async (bugId, bugData) => {
    const { token, activeProject } = get();
    if (!token) return false;
    try {
      await axios.put(`${API_BASE_URL}/api/bugs/${bugId}`, bugData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (activeProject) await get().fetchEnterpriseBugs(activeProject.id);
      return true;
    } catch (err) {
      return false;
    }
  },

  deleteEnterpriseBug: async (bugId) => {
    const { token, activeProject } = get();
    if (!token) return false;
    try {
      await axios.delete(`${API_BASE_URL}/api/bugs/${bugId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (activeProject) await get().fetchEnterpriseBugs(activeProject.id);
      return true;
    } catch (err) {
      return false;
    }
  },

  changeBugStatus: async (bugId, newStatus, comment) => {
    const { token, activeProject } = get();
    if (!token) return false;
    try {
      await axios.post(`${API_BASE_URL}/api/bugs/${bugId}/status`, { status: newStatus, comment }, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (activeProject) await get().fetchEnterpriseBugs(activeProject.id);
      if (get().activeBug?.id === bugId) await get().getEnterpriseBug(bugId);
      return true;
    } catch (err) {
      return false;
    }
  },

  assignBug: async (bugId, assignedTo, comment) => {
    const { token, activeProject } = get();
    if (!token) return false;
    try {
      await axios.post(`${API_BASE_URL}/api/bugs/${bugId}/assign`, { assigned_to: assignedTo, comment }, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (activeProject) await get().fetchEnterpriseBugs(activeProject.id);
      if (get().activeBug?.id === bugId) await get().getEnterpriseBug(bugId);
      return true;
    } catch (err) {
      return false;
    }
  },

  addBugComment: async (bugId, content, parentId) => {
    const { token } = get();
    if (!token) return false;
    try {
      await axios.post(`${API_BASE_URL}/api/bugs/${bugId}/comments`, { content, parent_comment_id: parentId }, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      await get().getEnterpriseBug(bugId);
      return true;
    } catch (err) {
      return false;
    }
  },

  getBugHistory: async (bugId) => {
    const { token } = get();
    if (!token) return [];
    try {
      const res = await axios.get(`${API_BASE_URL}/api/bugs/${bugId}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data.history || [];
    } catch (err) {
      return [];
    }
  },

  fetchBugDashboard: async (projectId) => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/bugs/dashboard?project_id=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ bugDashboard: res.data });
    } catch (err) {
      console.error('Failed to fetch bug dashboard', err);
    }
  },

  generateAIBug: async (projectId, description, module) => {
    const { token } = get();
    if (!token) return null;
    try {
      const res = await axios.post(`${API_BASE_URL}/api/bugs/generate-ai`, {
        project_id: projectId,
        description,
        module
      }, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      return res.data;
    } catch (err: any) {
      console.error('AI bug generation failed', err);
      return null;
    }
  },

  setActiveBug: (bug) => set({ activeBug: bug }),

  // ─── Team Actions ──────────────────────────────────────────────────────

  fetchTeams: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/teams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ teams: res.data.teams || [] });
    } catch (err) {
      console.error('Failed to fetch teams', err);
    }
  },

  createTeam: async (teamData) => {
    const { token } = get();
    if (!token) return false;
    try {
      await axios.post(`${API_BASE_URL}/api/teams`, teamData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      await get().fetchTeams();
      return true;
    } catch (err) {
      return false;
    }
  },

  updateTeam: async (teamId, teamData) => {
    const { token } = get();
    if (!token) return false;
    try {
      await axios.put(`${API_BASE_URL}/api/teams/${teamId}`, teamData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      await get().fetchTeams();
      return true;
    } catch (err) {
      return false;
    }
  },

  deleteTeam: async (teamId) => {
    const { token } = get();
    if (!token) return false;
    try {
      await axios.delete(`${API_BASE_URL}/api/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await get().fetchTeams();
      return true;
    } catch (err) {
      return false;
    }
  },

  addTeamMember: async (teamId, userId, roleInTeam) => {
    const { token } = get();
    if (!token) return false;
    try {
      await axios.post(`${API_BASE_URL}/api/teams/${teamId}/members`, { user_id: userId, role_in_team: roleInTeam }, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      return true;
    } catch (err) {
      return false;
    }
  },

  removeTeamMember: async (teamId, userId) => {
    const { token } = get();
    if (!token) return false;
    try {
      await axios.delete(`${API_BASE_URL}/api/teams/${teamId}/members/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return true;
    } catch (err) {
      return false;
    }
  },

  getTeam: async (teamId) => {
    const { token } = get();
    if (!token) return null;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    } catch (err) {
      return null;
    }
  },

  searchUsers: async (query) => {
    const { token } = get();
    if (!token) return [];
    try {
      const res = await axios.get(`${API_BASE_URL}/api/teams/users/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data.users || [];
    } catch (err) {
      return [];
    }
  },

  assignTeamToProject: async (teamId, projectId) => {
    const { token } = get();
    if (!token) return false;
    try {
      await axios.post(`${API_BASE_URL}/api/teams/${teamId}/projects`, { project_id: projectId }, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      return true;
    } catch (err) {
      return false;
    }
  },

  getProjectTeams: async (projectId) => {
    const { token } = get();
    if (!token) return [];
    try {
      const res = await axios.get(`${API_BASE_URL}/api/teams/project/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data.teams || [];
    } catch (err) {
      return [];
    }
  },

  // ─── Notification Actions ──────────────────────────────────────────────

  fetchNotifications: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/bugs/notifications/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({
        notifications: res.data.notifications || [],
        unreadNotificationCount: res.data.unread_count || 0
      });
    } catch (err) {
      // silent fail
    }
  },

  markNotificationsRead: async () => {
    const { token } = get();
    if (!token) return;
    try {
      await axios.put(`${API_BASE_URL}/api/bugs/notifications/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ unreadNotificationCount: 0 });
    } catch (err) {
      // silent fail
    }
  }
}));
