import React, { useState, useEffect, useCallback, useMemo } from 'react';
import JSZip from 'jszip';
import { 
  ProjectData, ProjectMetadata, User, ViewType, Note, 
  AppPrompts, AppSettings, ToolboxLink, Artifact, LoreEntry, Idea, ChangeLogEntry, Relationship, SemanticDocument, ProseDocument, Chapter
} from './types';
import { 
  getAllProjectsMetadata, loadProjectById, saveProjectData, 
  deleteProject, getAllGlobalNotes, saveGlobalNote, 
  deleteGlobalNote, clearDatabase, clearAllGlobalNotes,
  getAllGlobalResources, saveGlobalResource, deleteGlobalResource,
  exportFullArchive,
  getAppPrompts,
  saveAppPrompts,
  getAppSettings,
  saveAppSettings,
  generateId,
  exportProjectPlothole,
  exportVaultAsZip,
  importVaultFromZip,
  unpackProject,
  generateSHA256,
  setCloudStorageEnabled,
  isCloudStorageActive,
  setServerHealth
  } from './services/storageService';
  import { 
  analyzeStoryText, generateBookCover, doubleProcessNote, extractThemesFromNotes, extractSoftAnchors, auditPlotThreads,
  DEFAULT_PROMPTS, initializeApiKey, isApiKeyValid, analyzeRelationships, unifiedAnalysisSchema, detectManuscriptStructure
  } from './services/geminiService';
import { initGitForProject, commitToGit, getGitLog, updateIntegrityHash } from './services/versioningService';
import { Commit, BackupStatus } from './types';

// Components
import { Sidebar } from './components/Layout/Sidebar';
import { BottomNav } from './components/Layout/BottomNav';
import { AiAssistant } from './components/ui/AiAssistant';
import { BookshelfView } from './components/Views/BookshelfView';
import { DashboardView } from './components/Views/DashboardView';
import { ResearchSystemView } from './components/Views/ResearchSystemView';
import { CharacterView } from './components/Views/CharacterView';
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import { WorldSystemView } from './components/Views/WorldSystemView';
import { PlotSystemView } from './components/Views/PlotSystemView';
import { SettingsView } from './components/Views/SettingsView';
import { AdminView } from './components/Views/AdminView';
import { ToolboxView } from './components/Views/ToolboxView';
import ResearchView from './components/Views/ResearchView';
import { SemanticEditorView } from './components/Views/SemanticEditorView';
import { CodexView } from './components/Views/CodexView';
import { WikiPageView } from './components/Views/WikiPageView';
import { PublicProfileView } from './components/Views/PublicProfileView';
// import { StoryArchitectView } from './components/Views/StoryArchitectView';
import { ActiveArchitect } from './components/ui/ActiveArchitect';
import { Modal } from './components/ui/Modal';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X, Sparkles, Menu, LogOut, Shield, FileText, Database, PenTool, Trash2, Loader2 } from 'lucide-react';
import { SignedIn, SignedOut, useUser, useAuth } from '@clerk/clerk-react';
import { SignInPage } from './components/Auth/SignInPage';

const DEMO_USER: User = {
  id: 'user-1',
  name: 'Guest Architect',
  email: 'writer@plothole.ai',
  role: 'admin',
  lastActive: Date.now(),
  themeColor: '59 130 246',
  preferences: { themeMode: 'light', fontSize: 'md', fontFamily: 'sans', landingPage: ViewType.BOOKSHELF, aiVerbosity: 'detailed', colorfulIcons: true, semanticSearchEnabled: false }
};



const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const { isSignedIn, getToken } = useAuth();

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    try {
      const token = await getToken();
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`
        }
      });
      return response;
    } catch (err) {
      console.error(`[Auth] Error fetching token for ${url}:`, err);
      throw err;
    }
  }, [getToken]);

  const [projectsMetadata, setProjectsMetadata] = useState<ProjectMetadata[]>([]);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [globalNotes, setGlobalNotes] = useState<Note[]>([]);
  const [globalResources, setGlobalResources] = useState<ToolboxLink[]>([]);
  const [appPrompts, setAppPromptsState] = useState<AppPrompts>(DEFAULT_PROMPTS);
  const [appSettings, setAppSettings] = useState<AppSettings>({ 
    appName: 'Plothole — Your Story, Decoded',
    adminEmails: ['alittler86@gmail.com']
  });
  
  const [currentUser, setCurrentUser] = useState<User>(DEMO_USER);
  const [isServerConnected, setIsServerConnected] = useState(true);
  
  // Sync Clerk user with app user
  useEffect(() => {
    if (isClerkLoaded && clerkUser) {
      const email = clerkUser.primaryEmailAddress?.emailAddress || '';
      const isAdmin = (clerkUser.publicMetadata?.role === 'admin') || 
                      (appSettings.adminEmails?.includes(email)) ||
                      (import.meta.env.MODE === 'development' && email.endsWith('@plothole.ai'));

      setCurrentUser(prev => ({
        ...prev,
        id: clerkUser.id,
        name: clerkUser.fullName || clerkUser.username || 'Writer',
        email: email,
        role: isAdmin ? 'admin' : 'editor',
      }));
    }
  }, [isClerkLoaded, clerkUser, appSettings.adminEmails]);

  const currentView = (decodeURIComponent(location.pathname.slice(1)) as ViewType) || DEMO_USER.preferences?.landingPage || ViewType.BOOKSHELF;
  const setCurrentView = (view: ViewType) => navigate(`/${view}`);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isAdminNoteOpen, setIsAdminNoteOpen] = useState(false);

  useEffect(() => {
    if (!isAdminNoteOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAdminNoteOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isAdminNoteOpen]);

  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);
  const [isLicensesOpen, setIsLicensesOpen] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [activeTasks, setActiveTasks] = useState<string[]>([]);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [isUpdatingProcessed, setIsUpdatingProcessed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const addTask = (id: string) => setActiveTasks(prev => [...prev, id]);
  const removeTask = (id: string) => setActiveTasks(prev => prev.filter(t => t !== id));

  const refreshMetadata = useCallback(async () => {
    console.log('[App] Refreshing metadata...');
    // Ensure storage is configured correctly based on current state
    setCloudStorageEnabled(isSignedIn === true, fetchWithAuth);
    const meta = await getAllProjectsMetadata();
    console.log(`[App] Received ${meta.length} projects from storage`);
    setProjectsMetadata(meta);
  }, [isSignedIn, fetchWithAuth]);

  const handleManualSave = useCallback(async () => {
    if (!projectData) return;
    await saveProjectData(projectData);
    await refreshMetadata();
  }, [projectData, refreshMetadata]);

  const handleDeleteProject = useCallback(async (id: string) => {
    console.log(`[App] Requesting deletion of project: ${id}`);
    try {
      await deleteProject(id);
      console.log(`[App] storageService.deleteProject(${id}) resolved`);
      await refreshMetadata();
      console.log('[App] refreshMetadata() resolved');

      if (projectData?.id === id) {
        console.log(`[App] Deleting active project, clearing projectData`);
        setProjectData(null);
      }
      console.log(`[App] Deletion of project ${id} complete. Current projectData.id: ${projectData?.id}`);
    } catch (err: any) {
      console.error(`[App] Failed to delete project ${id}:`, err);
      alert(`Failed to delete project: ${err.message || String(err)}`);
    }
  }, [projectData?.id, refreshMetadata]);

  const handleEditProject = useCallback(async (id: string, title: string, author: string, shortName: string) => {
    console.log(`[App] Requesting edit of project: ${id}`);
    try {
      // If editing the active project, update it and save
      if (projectData?.id === id) {
        const updated = {...projectData, title, author, shortName};
        setProjectData(updated);
        await saveProjectData(updated);
      }
      // Always refresh metadata to sync changes
      await refreshMetadata();
      console.log(`[App] Edit of project ${id} complete`);
    } catch (err: any) {
      console.error(`[App] Failed to edit project ${id}:`, err);
      alert(`Failed to edit project: ${err.message || String(err)}`);
    }
  }, [projectData, refreshMetadata]);

  const performImageCleanup = useCallback(async () => {
    // Collect all active image URLs across all projects
    const allProjectsMeta = await getAllProjectsMetadata();
    const activeUrls = new Set<string>();

    // 1. Current Project (most detailed)
    if (projectData) {
      if (projectData.rootMapImage?.startsWith('/uploads/')) activeUrls.add(projectData.rootMapImage);
      if (projectData.coverImage?.startsWith('/uploads/')) activeUrls.add(projectData.coverImage);
      projectData.characters?.forEach(c => c.images?.forEach(img => { if (img.url?.startsWith('/uploads/')) activeUrls.add(img.url); }));
      projectData.locations?.forEach(l => { if (l.mapImage?.startsWith('/uploads/')) activeUrls.add(l.mapImage); });
      projectData.artifacts?.forEach(a => { if (a.imageUrl?.startsWith('/uploads/')) activeUrls.add(a.imageUrl); });
    }

    // 2. Scan other projects (less detailed metadata but covers basic fields)
    allProjectsMeta.forEach(p => {
      if (p.coverImage?.startsWith('/uploads/')) activeUrls.add(p.coverImage);
    });

    try {
      await fetch('/api/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeImageUrls: Array.from(activeUrls) })
      });
    } catch (err) {
      console.warn("Cleanup call failed", err);
    }
  }, [projectData]);

  const updateProjectData = useCallback(async (updatesOrFn: Partial<ProjectData> | ((prev: ProjectData) => Partial<ProjectData>)) => {
    if (!projectData) return;
    
    try {
      // 1. Calculate updates
      const prev = projectData;
      const updates = typeof updatesOrFn === 'function' ? updatesOrFn(prev) : updatesOrFn;
      console.log("[App] Project update requested:", Object.keys(updates));

      // 2. Auto-generate change log entry for notable entities
      let newLog: ChangeLogEntry | null = null;
      if (updates.characters && updates.characters.length !== prev.characters?.length) {
        const added = updates.characters.find(c => !prev.characters?.some(pc => pc.id === c.id));
        if (added) newLog = { id: generateId(), timestamp: Date.now(), entityType: 'Character', entityName: added.name, entityId: added.id, action: 'Created' };
      } else if (updates.locations && updates.locations.length !== prev.locations?.length) {
        const added = updates.locations.find(l => !prev.locations?.some(pl => pl.id === l.id));
        if (added) newLog = { id: generateId(), timestamp: Date.now(), entityType: 'Location', entityName: added.name, entityId: added.id, action: 'Created' };
      } else if (updates.timeline && updates.timeline.length !== prev.timeline?.length) {
        const added = updates.timeline.find(e => !prev.timeline?.some(pe => pe.id === e.id));
        if (added) newLog = { id: generateId(), timestamp: Date.now(), entityType: 'Timeline', entityName: added.title, entityId: added.id, action: 'Created' };
      }

      const baseUpdated: ProjectData = {
        ...prev,
        ...updates,
        changeLog: newLog ? [...(prev.changeLog || []), newLog] : prev.changeLog,
        lastModified: Date.now()
      };

      // 3. Update local state immediately for UI responsiveness
      setProjectData(baseUpdated);

      // 4. Persist to storage (Cloud/Local) and wait for confirmation
      await saveProjectData(baseUpdated);
      console.log("[App] Project data persisted successfully");

      // 5. Refresh project list metadata
      await refreshMetadata();
    } catch (err) {
      console.error("[App] FAILED to update project data:", err);
      // We could add a global notification here
    }
  }, [projectData, refreshMetadata]);

  const handleUpdateProcessedFiles = async () => {
    if (!projectData) return;
    setIsUpdatingProcessed(true);
    addTask('Syncing Processor');
    try {
      const manuscriptText = projectData.latestManuscriptText || '';
      const promptText = JSON.stringify(appPrompts) + JSON.stringify(unifiedAnalysisSchema);
      
      const [currentManuscriptSha, currentPromptSha] = await Promise.all([
        generateSHA256(manuscriptText),
        generateSHA256(promptText)
      ]);

      const manuscriptChanged = currentManuscriptSha !== projectData.lastProcessedManuscriptSha;
      const promptsChanged = currentPromptSha !== projectData.lastProcessedPromptSha;

      if (!manuscriptChanged && !promptsChanged) {
        alert("Manuscript and Blueprint schemas are already up to date.");
        return;
      }

      console.log(`Smart Sync: Manuscript changed: ${manuscriptChanged}, Prompts changed: ${promptsChanged}`);

      // Perform re-scan
      setProcessingStatus("Initializing Blueprint Scan...");
      const analysis = await analyzeStoryText(manuscriptText, projectData.aiContextLimit, undefined, (msg) => {
        setProcessingStatus(msg);
      });
      
      setProcessingStatus("Merging Data Fragments...");
      // Smart Merge logic
      const updates: Partial<ProjectData> = {
        lastProcessedManuscriptSha: currentManuscriptSha,
        lastProcessedPromptSha: currentPromptSha,
        summary: analysis.summary,
        themes: Array.from(new Set([...projectData.themes, ...analysis.themes])),
        wordCount: manuscriptText.trim().split(/\s+/).filter(w => w.length > 0).length,
        charCount: manuscriptText.length
      };

      if (analysis.characters.length > 0) {
        const existingChars = [...projectData.characters];
        analysis.characters.forEach(nc => {
          const idx = existingChars.findIndex(ec => ec.name.toLowerCase() === nc.name.toLowerCase());
          if (idx >= 0) {
            // Update existing character: prefer new data for job/role if current is empty
            existingChars[idx] = { 
              ...existingChars[idx], 
              job: existingChars[idx].job || nc.job || '',
              role: (existingChars[idx].role === 'Supporting' || existingChars[idx].role === 'Minor') ? (nc.role || existingChars[idx].role) : existingChars[idx].role,
              description: existingChars[idx].description.length < 10 ? (nc.description || existingChars[idx].description) : existingChars[idx].description
            };
          } else {
            existingChars.push(nc);
          }
        });
        updates.characters = existingChars;
      }

      // Add new timeline events if manuscript changed
      if (manuscriptChanged && analysis.timeline.length > 0) {
        updates.timeline = [...projectData.timeline, ...analysis.timeline.filter(ne => !projectData.timeline.some(ee => ee.title === ne.title))];
      }

      await updateProjectData(updates);
      alert("Processor synced successfully.");
    } catch (err) {
      handleError(err);
    } finally {
      setIsUpdatingProcessed(false);
      setProcessingStatus(null);
      removeTask('Syncing Processor');
    }
  };

  const [currentMapParentId, setCurrentMapParentId] = useState<string | null>(null);
  const [adminTargetId, setAdminTargetId] = useState<string | null>(null);

  const handleLinkClick = useCallback((type: string, id: string) => {
    if (type === 'admin') {
      setAdminTargetId(id);
      setCurrentView(ViewType.ADMIN);
    } else if (type === 'character') {
      setCurrentView(ViewType.CHARACTERS);
    } else if (type === 'location') {
      setCurrentMapParentId(id);
      setCurrentView(ViewType.MAP);
    } else if (type === 'dashboard') {
      setCurrentView(ViewType.DASHBOARD);
    }
  }, []);
  const [isLoaded, setIsLoaded] = useState(false);

  const [aiError, setAiError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);
  const [lastBackupMilestone, setLastBackupMilestone] = useState<{ words: number, commits: number }>({ words: 0, commits: 0 });

  // Listen for Escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMapFullscreen) {
        setIsMapFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMapFullscreen]);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [isExtractingThemes, setIsExtractingThemes] = useState(false);
  const [isExtractingRelationships, setIsExtractingRelationships] = useState(false);

  const handleExtractRelationships = async () => {
    if (!projectData) return;
    setIsExtractingRelationships(true);
    addTask('Analyzing Relationships');
    try {
      const text = (projectData.chapters || []).map(c => c.content).join('\n\n') + '\n\n' + projectData.notes.map(n => n.content).join('\n\n');
      const rels = await analyzeRelationships(text, projectData.characters);
      if (rels.length > 0) {
        // Merge unique relationships
        const existing = projectData.relationships || [];
        const newRels = rels.filter(nr => !existing.some(er => er.sourceId === nr.sourceId && er.targetId === nr.targetId && er.type === nr.type));
        if (newRels.length > 0) {
          await updateProjectData({ relationships: [...existing, ...newRels] });
        }
      }
    } catch (e) { handleError(e); } finally { 
      setIsExtractingRelationships(false); 
      removeTask('Analyzing Relationships');
    }
  };

  const handleDeleteNote = useCallback(async (id: string) => {
    // 1. Delete from Global Notes (Notepad)
    if (globalNotes.some(n => n.id === id)) {
      setGlobalNotes(prev => prev.filter(n => n.id !== id));
      await deleteGlobalNote(id);
    }

    // 2. Delete from Project Notes and Ideas
    if (projectData) {
      updateProjectData(prev => {
        const updates: Partial<ProjectData> = {};
        if (prev.notes?.some(n => n.id === id)) {
          updates.notes = prev.notes.filter(n => n.id !== id);
        }
        if (prev.ideas?.some(n => n.id === id)) {
          updates.ideas = prev.ideas.filter(n => n.id !== id);
        }
        return updates;
      });
    }
  }, [globalNotes, projectData, updateProjectData]);

  const handleQuickUpdate = useCallback((type: string, id: string, key: string, value: any) => {
    if (!projectData) return;

    const mapTypeToKey: Record<string, string> = {
      'Character': 'characters', 'Location': 'locations', 'Timeline': 'timeline',
      'Source': 'sources', 'Artifact': 'artifacts', 'Lore': 'lore'
    };

    const projectKey = mapTypeToKey[type];
    if (!projectKey) return;

    setProjectData(prev => {
      if (!prev) return null;
      const list = [...(prev as any)[projectKey] || []];
      const index = list.findIndex((item: any) => item.id === id);
      if (index !== -1) {
        list[index] = { ...list[index], [key]: value };
        const updated = { ...prev, [projectKey]: list, lastModified: Date.now() };
        // Save to IndexedDB immediately, but skip full commit generation for speed
        saveProjectData(updated); 
        return updated;
      }
      return prev;
    });
  }, [projectData]);

  const checkApiKey = useCallback(async () => {
    await initializeApiKey();
    const hasKey = isApiKeyValid();
    setHasApiKey(hasKey);
    return hasKey;
  }, []);

  const handleOpenKeySelection = async () => {
    alert("Please ensure GEMINI_API_KEY is set in your environment secrets.");
  };

  const handleError = useCallback((err: any) => {
      console.error("App Error:", err);
      const msg = err.message || String(err);
      if (msg.includes("AI_CONFIG_ERROR") || msg.includes("API Key")) {
          setAiError("AI services are unavailable: Please check your environment configuration.");
      } else if (msg.includes("quota") || msg.includes("limit")) {
          setAiError("AI Rate Limit reached. Please wait a moment and try again.");
      } else {
          setAiError(`An unexpected error occurred: ${msg.substring(0, 100)}`);
      }
      setTimeout(() => setAiError(null), 8000);
  }, []);

  useEffect(() => {
    document.title = appSettings.appName;
  }, [appSettings.appName]);

  useEffect(() => {
    // Wait for Clerk to determine auth status
    if (!isClerkLoaded) return;

    const init = async () => {
      try {
        console.log(`[Init] Clerk loaded: ${isClerkLoaded}, SignedIn: ${isSignedIn}, UserId: ${clerkUser?.id}`);
        
        // Configure storage first
        console.log(`[Init] Configuring storage. Cloud enabled: ${isSignedIn === true}`);
        setCloudStorageEnabled(isSignedIn === true, fetchWithAuth);

        console.log(`[Init] Fetching metadata...`);
        const [meta, notes, resources, prompts, settings] = await Promise.all([
          getAllProjectsMetadata(),
          getAllGlobalNotes(),
          getAllGlobalResources(),
          getAppPrompts(),
          getAppSettings()
        ]);
        
        console.log(`[Init] Received ${meta?.length || 0} projects`);
        setProjectsMetadata(meta || []);
        setGlobalNotes(notes);
        setGlobalResources(resources);
        if (prompts) setAppPromptsState(prev => ({ ...prev, ...prompts }));
        if (settings) {
          const finalSettings = { ...settings };
          if (!finalSettings.appName || finalSettings.appName.includes('Steno') || finalSettings.appName === 'Plothole AI') {
            finalSettings.appName = 'Plothole — Your Story, Decoded';
            await saveAppSettings(finalSettings as AppSettings);
          }
          setAppSettings(prev => ({ ...prev, ...finalSettings }));
        }

        await checkApiKey();

        // Auto-load last edited project
        if (meta && meta.length > 0 && !projectData) {
          const sortedMeta = [...meta].sort((a, b) => b.lastModified - a.lastModified);
          const lastProject = await loadProjectById(sortedMeta[0].id);
          if (lastProject) {
            setProjectData(lastProject);
            if (currentView === ViewType.BOOKSHELF || !location.pathname || location.pathname === '/') {
              setCurrentView(ViewType.DASHBOARD);
            }
          }
        }

        setIsLoaded(true);
      } catch (err) {
        console.error("Initialization failed", err);
        setIsLoaded(true);
      }
    };
    init();
  }, [checkApiKey, isSignedIn, isClerkLoaded, fetchWithAuth]); // Re-run when auth state or Clerk status changes


  useEffect(() => {
    if (!projectData) return;
    const totalWords = (projectData.chapters || []).reduce((acc, c) => acc + (c.wordCount || 0), 0);
    const commitCount = projectData.commits?.length || 0;

    const wordMilestone = Math.floor(totalWords / 5000) * 5000;
    const commitMilestone = Math.floor(commitCount / 10) * 10;

    const shouldBackup = (wordMilestone > 0 && wordMilestone > lastBackupMilestone.words) || 
                       (commitMilestone > 0 && commitMilestone > lastBackupMilestone.commits);

    if (shouldBackup) {
      console.log(`Milestone reached. Triggering backup...`);
      setLastBackupMilestone({ words: wordMilestone, commits: commitMilestone });

      const backupId = generateId();
      const newBackup: BackupStatus = {
        id: backupId,
        timestamp: Date.now(),
        wordCount: totalWords,
        hash: projectData.integrityHash || '',
        status: 'pending'
      };

      // Pessimistic update to project data to show "pending"
      const updatedBackups = [...(projectData.backups || []), newBackup];
      // We don't want to trigger ANOTHER commit here, so we bypass updateProjectData
      const directUpdate = { ...projectData, backups: updatedBackups };
      setProjectData(directUpdate);
      saveProjectData(directUpdate);

      // Automated backup logic
      fetch('/api/backup-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectTitle: projectData.title, 
          wordCount: totalWords,
          hash: projectData.integrityHash,
          backupData: projectData 
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Poll for verification
          setTimeout(() => {
            fetch(`/api/verify-backup/${data.resendId}`)
            .then(res => res.json())
            .then(verifyData => {
              if (verifyData.status === 'delivered') {
                setProjectData(prev => {
                  if (!prev) return null;
                  const updated: ProjectData = {
                    ...prev,
                    backups: prev.backups?.map(b => b.id === backupId ? { ...b, status: 'delivered' as const, resendId: data.resendId } : b)
                  };
                  saveProjectData(updated);
                  return updated;
                });
              }
            });
          }, 5000);
        }
      })
      .catch(err => console.error("Backup failed", err));
    }
  }, [projectData, lastBackupMilestone]);
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', currentUser.themeColor);
    root.classList.toggle('dark', currentUser.preferences?.themeMode === 'dark');
  }, [currentUser]);

  const handleAuditThreads = async () => {
    if (!projectData) return;
    setIsAnalyzing(true);
    addTask('Auditing Plot Threads');
    try {
      const threads = await auditPlotThreads(projectData.chapters || [], projectData.timeline);
      await updateProjectData({ aiDeadThreads: threads });
    } catch (e) {
      handleError(e);
    } finally {
      setIsAnalyzing(false);
      removeTask('Auditing Plot Threads');
    }
  };

  // Server Health Heartbeat
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/config');
        const healthy = res.ok;
        if (!healthy) console.warn("[Heartbeat] Server returned non-OK status:", res.status);
        setServerHealth(healthy);
        setIsServerConnected(healthy);
      } catch (e) {
        console.error("[Heartbeat] Failed to reach server:", e);
        setServerHealth(false);
        setIsServerConnected(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

const createCommit = async (project: ProjectData, message: string): Promise<Commit> => {
    const files = [
      { path: 'manuscript.md', content: project.chapters?.map(c => c.content).join('\n\n') || '' }
    ];
    const res = await commitToGit(project.id, message, files);
    return {
      id: generateId(),
      timestamp: Date.now(),
      hash: res.hash || 'manual-' + generateId(),
      message: message,
      snapshot: project.chapters
    };
  };

const handleRestoreCommit = async (commit: Commit) => {
    if (!projectData || !commit.snapshot) return;
    if (confirm(`Are you sure you want to restore the manuscript to the state of commit [${commit.hash.slice(0, 8)}]? Current unsaved changes (if any) will be lost.`)) {
      // Create a NEW commit for the restoration action itself
      const restorationCommit = await createCommit({ ...projectData, chapters: commit.snapshot }, `Restored to commit [${commit.hash.slice(0, 8)}]`);
      const updated: ProjectData = {
        ...projectData,
        chapters: commit.snapshot,
        commits: [...(projectData.commits || []), restorationCommit],
        lastModified: Date.now()
      };
      setProjectData(updated);
      await saveProjectData(updated);
      alert("Manuscript restored successfully.");
    }
  };

    const handleCreateProject = async (title: string, author: string, useSample: boolean, shortName?: string, existingId?: string) => {
    const id = existingId || generateId();
    try {
      if (!existingId) await initGitForProject(id);
    } catch (e) {
      console.error("Git init failed", e);
    }
    let newProject: ProjectData = {
      id, title, shortName, author, summary: '', lastModified: Date.now(), characters: [], locations: [], timeline: [], notes: [], relationships: [], themes: [], calendars: [], artifacts: [], lore: [], chapters: [], sources: [],
      lastProcessedManuscriptSha: '', lastProcessedPromptSha: '',
      wordCount: 0,
      charCount: 0,
      entities: [],
      manuscript: '',
      history_diff: '',
      assets: []
      };
    if (useSample) {
      const ch1Content = `<!-- #CHAPTER_1 -->\n# Chapter 1: The Weight of Ink\n\nThe Great Archive was always cold. Arthur Penhaligon pulled his cloak tighter as he navigated the towering shelves of the Forbidden Wing. The scent of old parchment, dust, and something metallic—the smell of stagnant time—filled his lungs. He was a Junior Archivist, a role that mostly involved cataloging the mundane receipts of a city that traded in memories, but tonight, he was after something else. In his pocket, the Chronos Key hummed. It was a rhythmic, steady vibration that felt more like a heartbeat than a machine. Master Silas, his mentor, had whispered of this relic for years, claiming it was the only thing that could unlock the physical manifestations of memories. "The Mnemonic Plague didn't just take our past, Arthur," Silas had said, his eyes tired and secretive. "It turned it into a lock. And every lock has a key." Arthur reached the end of the row. Before him stood a door of solid obsidian, marked only with the sigil of The Great Weaver. According to lore, the Weaver had spun the first memory strings at the dawn of time, long before the Plague had wiped the world's collective slate clean 300 years ago. Arthur pressed the Chronos Key against the stone. The hum became a roar. The obsidian didn't swing open; it dissolved, the stone turning into a swirling mist of gray ink. Arthur stepped through, and for a moment, he felt the Void—that terrifying state of complete memory loss that every citizen of the Citadel feared. It was a cold, empty vacuum that threatened to swallow his very sense of self. Then, he was inside. The vault was filled with Memory Vials. Thousands of them, glowing with a soft, bioluminescent blue light. This was the currency of the Obsidian Citadel, the extracted experiences of the elite, preserved for eternity. But these vials were different. They weren't blue; they were gold. Arthur reached out to touch one, and a spectral figure materialized beside him. "You should not be here, Little Bird," the figure whispered. It was The Echo, the ghost of the vault. It looked like a man made of static and smoke. Arthur froze. He knew the legends of Echo-Walking—the rare ability to enter someone else's mind—but he had never seen an Echo manifest in the physical world. "I need to know," Arthur said, his voice trembling. "I need to know what High Architect Vaelen is hiding." The Echo tilted its head. "Vaelen hides the truth of the Founding. He hides the fact that the Citadel was built on a lie. Do you wish to see, or do you wish to sleep?"`;
      const ch2Content = `<!-- #CHAPTER_2 -->\n# Chapter 2: Shadows of the Spire\n\nThe Obsidian Spire pierced the gray clouds like a needle of dark glass. From his balcony at the summit, High Architect Vaelen looked down upon his city. To the world, he was the provider of order, the man who ensured that every citizen had enough Mnemos—the unit of memory strength—to function. But to Vaelen, they were merely cattle in a very large, very complex farm. Vaelen held a single Memory Vial between his fingers. It was dark, almost black. This was a "Dead Thread," a memory of a crime so terrible it had been purged from the ledger. He had many such threads. Power, he believed, wasn't just about what people remembered; it was about what they were forced to forget. A chime sounded. A holographic display flickered to life, showing the sharp-witted face of Elara Vane. She was an information broker from the Lower Wards, a survivor who lived in the smog-filled streets where those without memories were cast aside. "You called, Architect?" Elara's voice was cynical, devoid of the reverence most showed him. "There is a disturbance in the Archive," Vaelen said, his voice cold and strategic. "A Junior Archivist named Arthur. He has been seen near the Forbidden Wing. Master Silas has been... indulgent." "Silas is an old man dreaming of the past," Elara countered. "But Arthur? He's curious. Curious gets people killed in the Wards." "I don't want him killed yet," Vaelen said. "I want to know what he finds. If he successfully uses the Chronos Key, he will have access to the Primal Memory—the one that predates the Founding. Bring him to me, Elara. And I will ensure your sector receives a double shipment of Mnemos this month." Elara hesitated. She knew the cost of Vaelen's "gifts." Every shipment of Mnemos came from someone's mind. But the Lower Wards were starving for identity. "I'll find him," she said, and the display cut to black. Vaelen turned back to the city. Far below, in the shadows of the Great Archive, a fire was beginning to burn. Not a fire of wood and oil, but a fire of information. It reminded him of the Great Fire ten years ago, the one he had ordered to "cleanse" the West Wing. Some things, it seemed, refused to stay buried.`;
      const ch3Content = `<!-- #CHAPTER_3 -->\n# Chapter 3: The Echo in the Wards\n\nElara Vane found Arthur Penhaligon exactly where she expected: hiding in a corner of a tavern in the Lower Wards called The Weaver\'s Loom. He looked like a man who had seen a god and realized it was made of clockwork. "You look like hell, Archivist," Elara said, sliding into the booth across from him. Arthur jumped, nearly knocking over a glass of stale ale. "Who are you?" "Someone who knows that High Architect Vaelen is looking for you. And someone who knows that the 'ghost' you saw in the vault isn't a ghost at all." Elara leaned in, her eyes brave and resourceful. "It's a Echo-Walker who got stuck. A man named Silas used to talk about them." Arthur stared at her. "Silas? You know my mentor?" "In the Wards, everyone knows Silas. He's the one who sneaks us vials when the Citadel isn't looking. But Silas is playing a dangerous game, Arthur. He's using you to get to the Primal Memory." Arthur reached into his pocket and pulled out the Chronos Key. It was no longer humming; it was glowing. "The Echo told me the Citadel was built on a lie. He showed me a vision of the Mnemonic Plague. It wasn't a natural disaster, Elara. It was a weapon." Elara went pale. If that were true, the entire social structure of their world—the worship of the High Architects as saviors—would collapse. "You can't stay here," she whispered. "Vaelen has spies everywhere. We need to go to the Deep Vaults, beneath the Wards. There's a dictionary there, an ancient lexicon that Silas mentioned. It has the codes to stabilize the Echo." Suddenly, the doors of the tavern burst open. A squad of Citadel Sentinels, clad in obsidian armor, marched in. At their head was Vaelen himself, his presence a cold weight that seemed to dim the lights. "Arthur Penhaligon," Vaelen announced, his voice echoing in the sudden silence. "You have stolen property belonging to the state. Return the Key, and perhaps your mentor's life will be spared." Arthur looked at Elara, then at the Key. He realized then that sacrifice was the final theme of every great story. He didn't know if he could win, but he knew he couldn't let the truth be forgotten again. He stood up, the Chronos Key held high, and prepared to Echo-Walk for the first time in his life. The Void was waiting, but for the first time, he wasn't afraid.`;

      const filler = "\n\nMemories are the threads of reality. In the Citadel, those threads were pulled and twisted until the pattern was lost. The Archives hold secrets that would shake the very foundations of their world. Whispers echo through the corridors of power, speaking of a time before the Plague when knowledge flowed freely and no one needed to trade away pieces of their mind.\n\nIn the Lower Wards, where the memory-less wander in fog and confusion, the people tell stories of the before-times. Ancient songs passed down through generations, each telling slightly different—corrupted by time and loss. Some remember gardens that never existed. Others dream of cities made of light and glass, technologies that seem like magic to modern minds.\n\nThe Citadel's greatest lie is not what it tells its people, but what it has made them forget. Archives filled with thousands of deleted records. Books burned in controlled fires. Names struck from ledgers. Entire families erased as though they never existed. And all of it justified in the name of order, stability, peace.\n\nBut truth has a way of surfacing, like a body in still water. It rises slowly, inevitably, carrying with it the weight of years. In the deep places where the Citadel's light doesn't reach, in the hearts of those brave or foolish enough to question, the truth begins to stir.\n\nArthur's discovery changes everything. The Chronos Key is more than a relic—it is a key to understanding. A key to remembering. And in a world built on the foundation of enforced forgetting, memory is the most dangerous weapon of all.\n\nVaelen has ruled for so long that he has forgotten how to fear. But the appearance of the Echo, the manifestation of a spectral being that shouldn't exist, sends ice through his veins. Because if one Echo can manifest, what else might return from the depths of forgotten time? What other truths might take physical form and walk through his pristine halls?\n\nThe timeline of the Citadel is a carefully constructed narrative. Year zero begins after the Plague, with no authentic records of what came before. This is intentional. This is control. Every history written is a history of erasure, painted over the corpse of what truly was.\n\nElara knows this better than most. In the Lower Wards, memory is a luxury. The poor trade away experiences just to afford food. They sell their happiest moments, their deepest loves, their most precious achievements. The Citadel buys them cheap and stores them in vaults for the elite to experience like entertainment.\n\nMaster Silas has spent his entire life trying to protect fragments of truth. Hidden in margins of permitted texts, encoded in the cataloging system itself, are breadcrumbs for those clever enough to see them. But breadcrumbs are not proof. They are not sufficient. They are not enough to shake the foundations of a civilization.\n\nUntil Arthur. Until the Key. Until The Echo speaks.\n\nThe vaults beneath the city stretch deeper than most people realize. Some say they go down as far as the roots of mountains. Others whisper that the Deep Vaults connect to places that are not quite real, spaces that exist in the liminal zones between memory and forgetting. What lies down there has been sealed away so carefully that even the High Architects seem uncertain of their contents.\n\nKessandra moves through the world as a ghost herself. Stealing memories is not just a profession—it is a way of remaining invisible. Every memory she takes, she leaves a small void. A gap in someone's narrative. And those gaps are where she hides, in the spaces between what people remember and what they lived.\n\nThe Memory Markets operate with brutal efficiency. A merchant stall here, a private transaction there. Vials passed hand to hand in dim alcoves. Some are legitimate extractions from willing participants. Many are not. The black market in stolen experience is vast and complex, a shadow economy that the Citadel pretends doesn't exist while secretly regulating it.\n\nIn all the corners of this world, from the highest spires to the deepest vaults, from the gilded halls of power to the forgotten streets of the Wards, there is a current of change building. It starts small—a whisper, a question, a doubt. But these things grow. They compound. They accumulate until the weight becomes unbearable.\n\nArthur Penhaligon was meant to be a junior archivist, nothing more. A quiet life in the stacks, cataloging the mundane. But destiny has other plans. Or perhaps not destiny—perhaps something far more dangerous. Perhaps simply the truth, choosing this moment, this person, this key, to finally make itself known.\n\nThe Void awaits those who are not careful. That terrible emptiness where identity dissolves. Where the self becomes fluid and indistinct. Where memory—that essential thread that binds consciousness together—ceases to exist. It is the ultimate fear of the Citadel's citizens, because without memory, they are nothing.\n\nYet The Echo walks in that Void and does not disappear. The Echo remembers. The Echo speaks. The Echo reveals. And in doing so, it becomes not a ghost but a guide. Not a phantom of the past, but a messenger from it. Not something to fear, but something to understand.\n\nThe story of Arthur Penhaligon is only the beginning. Around him, the world shifts. In the shadows, other agents move. Other secrets stir. Other truths begin their slow, inevitable rise to the surface.\n\nIn the Citadel, change comes slowly or it comes catastrophically. There seems to be no middle ground. And what Arthur has set in motion may be the most catastrophic change of all. Not war, though that may come. Not plague, though the Citadel fears it. But revelation. The simple, terrible, unavoidable revelation of truth.\n\nThe machinery of governance in the Citadel is both elegant and sinister. It operates on a principle so fundamental that most citizens never question it: that control of information is control of reality itself. If a memory is not recorded, it never happened. If a record is burned, the truth burns with it. If an archive entry is erased, the experience is unmade.\n\nThis philosophy has served the High Architects well for three centuries. But philosophy breaks down when confronted with live testimony. It crumbles when proof walks through the door. It shatters when The Echo speaks the forbidden truths that have been locked away in the deepest vaults.\n\nArthur stands now at the precipice of becoming either a legend or a cautionary tale. History has not yet decided which. The Citadel's official records will mark him however the High Architects choose. But in the Lower Wards, in the whispered conversations of the memory-poor, in the hidden networks of truth-seekers, Arthur Penhaligon is already becoming something more. He is becoming hope.\n\nAnd hope, once kindled, is nearly impossible to extinguish. It spreads like fire through tinder. It grows in the cracks of a dying system. It takes root in the hearts of those who have been forgotten and builds them into something the Citadel never anticipated. A force that cannot be archived, cataloged, or erased.\n\nThis is the real revolution. Not one fought with weapons but with truth. Not one conducted in the streets but in the minds and memories of common people. Not one that destroys but one that remembers. That reclaims. That refuses to be forgotten.\n\nIn the end, what is a civilization built on lies but a house of cards? What is power without consent? What is control without the ability to control the ultimate truth—that people will always want to remember?\n";

      const fullManuscript = `${ch1Content}\n\n${ch2Content}\n\n${ch3Content}${filler}`;
      const wordCountValue = fullManuscript.trim().split(/\s+/).length;

      const characters = [
        { id: 'CH-ARTHUR', name: 'Arthur Penhaligon', role: 'Protagonist', job: 'Junior Archivist', description: 'A curious and determined young man with an uncanny ability to read ancient scripts.', traits: ['Curious', 'Determined'], source: 'manual' as const },
        { id: 'CH-VAELEN', name: 'Admin Vaelen', role: 'Antagonist', job: 'High Architect', description: 'The cold, calculating ruler of the Citadel.', traits: ['Cold', 'Calculating'], source: 'manual' as const },
        { id: 'CH-ELARA', name: 'Elara Vane', role: 'Ally', job: 'Information Broker', description: 'A resourceful survivor from the Lower Wards.', traits: ['Resourceful', 'Cynical'], source: 'manual' as const },
        { id: 'CH-SILAS', name: 'Master Silas', role: 'Mentor', job: 'Senior Archivist', description: 'A wise and secretive mentor who knows the truth.', traits: ['Wise', 'Secretive'], source: 'manual' as const },
        { id: 'CH-KESS', name: 'Kessandra Mohr', role: 'Ally', job: 'Memory Thief', description: 'A skilled operative who steals valuable memories for the black market. Torn between survival and morality.', traits: ['Cunning', 'Pragmatic', 'Conflicted'], source: 'manual' as const }
      ];

      const locations = [
        { id: 'LOC-GREAT-ARCHIVE', name: 'The Great Archive', description: 'The heart of the Obsidian Citadel, containing all recorded memories.', type: 'Library', source: 'manual' as const },
        { id: 'LOC-LOWER-WARDS', name: 'The Lower Wards', description: 'The smog-filled streets where the memory-less are cast aside.', type: 'District', source: 'manual' as const },
        { id: 'LOC-OBSIDIAN-SPIRE', name: 'The Obsidian Spire', description: 'Vaelen\'s seat of power, piercing the gray clouds.', type: 'Tower', source: 'manual' as const },
        { id: 'LOC-DEEP-VAULTS', name: 'The Deep Vaults', description: 'Ancient underground chambers rumored to contain pre-Plague knowledge and artifacts.', type: 'Underground', source: 'manual' as const },
        { id: 'LOC-MEMORY-MARKETS', name: 'Memory Markets', description: 'Bustling trading hub in the Lower Wards where memories and information exchange hands.', type: 'Marketplace', source: 'manual' as const }
      ];

      const artifacts = [
        { id: 'ART-CHRONOS-KEY', name: 'Chronos Key', description: 'A relic that can unlock memory vaults. Hums with a rhythmic pulse. Crafted before the Mnemonic Plague.', type: 'Artifact', significance: 'Crucial', source: 'manual' as const },
        { id: 'ART-MEMORY-VIAL', name: 'Golden Memory Vial', description: 'Vials containing memories from the First Age before the Plague. Glow with bioluminescent gold light.', type: 'Artifact', significance: 'Rare', source: 'manual' as const },
        { id: 'ART-LEXICON', name: 'Ancient Lexicon', description: 'A dictionary of the First Language containing codes that stabilize Echo-Walkers.', type: 'Artifact', significance: 'Critical', source: 'manual' as const },
        { id: 'ART-MEMORY-WEAVE', name: 'Memory Weave Pendant', description: 'Worn by high-ranking archivists, grants limited Echo-Walking ability and memory restoration.', type: 'Artifact', significance: 'Uncommon', source: 'manual' as const },
        { id: 'ART-TRUTH-SCROLL', name: 'The Founding Scroll', description: 'A hidden scroll revealing the truth about the Mnemonic Plague—that it was not a disaster but a weapon.', type: 'Artifact', significance: 'Legendary', source: 'manual' as const }
      ];

      const lore = [
        { id: 'LORE-MNEMONIC-PLAGUE', name: 'The Mnemonic Plague', content: 'Three centuries ago, a catastrophic event wiped the collective memory of civilization. Official records claim it was a natural disaster. In reality, it was engineered by the First High Architects as a tool to reshape society and eliminate dissent.', tags: ['History', 'Mystery'], source: 'manual' as const },
        { id: 'LORE-ECHO-WALKERS', name: 'Echo-Walkers and the Void', content: 'Echo-Walkers are individuals capable of entering others\' minds and experiencing their memories. Those untrained risk the Void—a state of complete memory loss that erases all sense of identity. The Chronos Key and ancient stabilization techniques can prevent this fate.', tags: ['Magic System', 'Danger'], source: 'manual' as const },
        { id: 'LORE-THE-WEAVER', name: 'The Great Weaver', content: 'A figure of legend from before the Plague who supposedly spun the first memory strings at the dawn of time. May have been the architect of the original society\'s memory system. Some believe The Weaver still exists in spectral form.', tags: ['Mythology', 'Speculation'], source: 'manual' as const },
        { id: 'LORE-MNEMOS-CURRENCY', name: 'Mnemos: Memory as Currency', content: 'In the post-Plague world, memories became the primary currency. Extracted memories of the elite are stored in vials and traded. Those with more memory strength (Mnemos) have greater social status and access to resources.', tags: ['Economy', 'Society'], source: 'manual' as const },
        { id: 'LORE-FIRST-AGE', name: 'The First Age Before Memory', content: 'Largely lost to the Plague, the First Age was a world where civilization depended on a unified memory system. Records suggest advanced technology, complex social structures, and knowledge now considered impossible. Only fragments remain in the Deep Vaults.', tags: ['Lost Civilization', 'History'], source: 'manual' as const }
      ];

      const timeline = [
        { id: 'TL-FIRST-AGE', date: '0', period: 'The First Age', description: 'Civilization at its height. Memory system operates perfectly. The Weaver constructs the foundational memory architecture.', status: 'Unknown' as const },
        { id: 'TL-THE-PLAGUE', date: '0-300YBP', period: 'The Mnemonic Plague', description: 'A catastrophic event wipes the collective memory. Official history begins here. Survivors rebuild, creating the Citadel under the rule of the First High Architects.', status: 'Documented' as const },
        { id: 'TL-CITADEL-FOUNDED', date: '300YBP', period: 'Founding of the Citadel', description: 'The Great Archive is constructed. Memory becomes the foundation of society. The tiered class system emerges based on memory strength.', status: 'Documented' as const },
        { id: 'TL-GREAT-FIRE', date: '10YBP', period: 'The West Wing Burning', description: 'Vaelen orders the destruction of the West Wing of the Archive to eliminate knowledge of dissent and rebellion. Thousands of memories are lost forever.', status: 'Suspected' as const },
        { id: 'TL-PRESENT-DAY', date: 'Now', period: 'The Echo Awakens', description: 'Arthur discovers the Chronos Key. The Echo manifests. The truth of the Founding begins to unravel. The Citadel\'s carefully constructed reality faces its greatest threat.', status: 'In Progress' as const }
      ];

      const proseDocuments = [
        { id: generateId(), title: 'Chapter 1: The Weight of Ink', content: ch1Content, lastModified: Date.now() },
        { id: generateId(), title: 'Chapter 2: Shadows of the Spire', content: ch2Content, lastModified: Date.now() },
        { id: generateId(), title: 'Chapter 3: The Echo in the Wards', content: ch3Content, lastModified: Date.now() }
      ];

      const chapters = [
        { 
          id: generateId(), title: 'Chapter 1: The Weight of Ink', content: ch1Content, order: 1, status: 'Draft' as const, lastModified: Date.now(), wordCount: ch1Content.trim().split(/\s+/).length,
          scenes: [{ id: generateId(), title: 'Scene 1', content: ch1Content, wordCount: ch1Content.trim().split(/\s+/).length }]
        },
        { 
          id: generateId(), title: 'Chapter 2: Shadows of the Spire', content: ch2Content, order: 2, status: 'Draft' as const, lastModified: Date.now(), wordCount: ch2Content.trim().split(/\s+/).length,
          scenes: [{ id: generateId(), title: 'Scene 1', content: ch2Content, wordCount: ch2Content.trim().split(/\s+/).length }]
        },
        { 
          id: generateId(), title: 'Chapter 3: The Echo in the Wards', content: ch3Content, order: 3, status: 'Draft' as const, lastModified: Date.now(), wordCount: ch3Content.trim().split(/\s+/).length,
          scenes: [{ id: generateId(), title: 'Scene 1', content: ch3Content, wordCount: ch3Content.trim().split(/\s+/).length }]
        }
      ];

      const semanticDocuments = [
        { id: generateId(), title: 'Chapter 1: The Weight of Ink', content: ch1Content + '\n\n^anchor-ch1', lastModified: Date.now() },
        { id: generateId(), title: 'Chapter 2: Shadows of the Spire', content: ch2Content + '\n\n^anchor-ch2', lastModified: Date.now() },
        { id: generateId(), title: 'Chapter 3: The Echo in the Wards', content: ch3Content + '\n\n^anchor-ch3', lastModified: Date.now() }
      ];

      newProject = {
        ...newProject,
        title: title || 'Sample Project',
        shortName: shortName || 'Sample',
        summary: 'In a world where memories are currency, a young archivist discovers a forgotten vault that could rewrite history—or erase it entirely.',
        themes: ['Memory', 'Power', 'Legacy', 'Sacrifice'],
        entities: [
          { id: 'CH-ARTHUR', name: 'Arthur Penhaligon', tier: 1, species: 'Human', type: 'Character', description: 'A curious and determined young man with an uncanny ability to read ancient scripts.', motivation: 'Unlock the Forbidden Vault.', conflict: 'Loyalty to Silas vs. the Echo\'s truths.', aliases: ['Little Bird'], location_id: 'LOC-GREAT-ARCHIVE' },
          { id: 'CH-VAELEN', name: 'Admin Vaelen', tier: 1, species: 'Human', type: 'Character', description: 'The cold, calculating ruler of the Citadel.', motivation: 'Maintain total control of memory.', conflict: 'Fear of a second Mnemonic Plague.', location_id: 'LOC-OBSIDIAN-SPIRE' },
          { id: 'CH-ELARA', name: 'Elara Vane', tier: 2, species: 'Human', type: 'Character', primary_trait: 'Resourceful survivor and information broker.', location_id: 'LOC-LOWER-WARDS' },
          { id: 'CH-SILAS', name: 'Master Silas', tier: 2, species: 'Human', type: 'Character', primary_trait: 'Wise and secretive mentor.', location_id: 'LOC-GREAT-ARCHIVE' },
          { id: 'CH-KESS', name: 'Kessandra Mohr', tier: 2, species: 'Human', type: 'Character', primary_trait: 'Skilled operative caught between survival and morality.', location_id: 'LOC-MEMORY-MARKETS' },
          { id: 'CH-ECHO', name: 'The Echo', tier: 3, species: 'Spectral Entity', type: 'Character' },
          { id: 'LOC-GREAT-ARCHIVE', name: 'The Great Archive', tier: 1, species: 'Structure', type: 'Location', description: 'The heart of the Obsidian Citadel.' },
          { id: 'LOC-LOWER-WARDS', name: 'The Lower Wards', tier: 3, species: 'District', type: 'Location' },
          { id: 'LOC-OBSIDIAN-SPIRE', name: 'The Obsidian Spire', tier: 1, species: 'Structure', type: 'Location', description: 'Vaelen\'s seat of power.' },
          { id: 'LOC-DEEP-VAULTS', name: 'The Deep Vaults', tier: 2, species: 'Underground', type: 'Location', description: 'Ancient chambers beneath the Citadel.' },
          { id: 'LOC-MEMORY-MARKETS', name: 'Memory Markets', tier: 2, species: 'Marketplace', type: 'Location', description: 'Heart of trade in the Lower Wards.' }
        ],
        characters,
        locations,
        artifacts,
        lore,
        timeline,
        relationships: [],
        notes: [],
        manuscript: fullManuscript,
        history_diff: '',
        assets: [],
        latestManuscriptText: fullManuscript,
        wordCount: wordCountValue,
        charCount: fullManuscript.length,
        proseDocuments,
        semanticDocuments,
        chapters
      };
    }

    await saveProjectData(newProject);
    if (isSignedIn) {
      await fetchWithAuth('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      }).catch(err => console.error("Cloud project creation failed", err));
    }
    setProjectData(newProject);
    await refreshMetadata();
    setCurrentView(ViewType.DASHBOARD);
  };const mergeAnalysisIntoProject = useCallback(async (analysis: any, content?: string) => {
    if (!projectData) return;

    // Merge logic:
    // 1. Characters: If name matches, update description/traits if they are more detailed. If new, add.
    const updatedCharacters = [...(projectData.characters || [])];
    analysis.characters.forEach((ac: any) => {
      const existingIdx = updatedCharacters.findIndex(c => c.name.toLowerCase() === ac.name.toLowerCase());
      if (existingIdx >= 0) {
        // Only update if existing is very short or AI source
        if (updatedCharacters[existingIdx].description.length < ac.description.length || updatedCharacters[existingIdx].source === 'ai') {
           updatedCharacters[existingIdx] = { 
             ...updatedCharacters[existingIdx], 
             ...ac,
             traits: Array.from(new Set([...updatedCharacters[existingIdx].traits, ...(ac.traits || [])])),
             source: 'ai'
           };
        }
      } else {
        updatedCharacters.push({ ...ac, id: generateId(), source: 'ai' });
      }
    });

    // 2. Locations: Same logic
    const updatedLocations = [...(projectData.locations || [])];
    analysis.locations.forEach((al: any) => {
      const existingIdx = updatedLocations.findIndex(l => l.name.toLowerCase() === al.name.toLowerCase());
      if (existingIdx >= 0) {
        if (updatedLocations[existingIdx].description.length < al.description.length || updatedLocations[existingIdx].source === 'ai') {
          updatedLocations[existingIdx] = { ...updatedLocations[existingIdx], ...al, source: 'ai' };
        }
      } else {
        updatedLocations.push({ ...al, id: generateId(), source: 'ai' });
      }
    });

    // 3. Timeline: Append new ones for now, maybe deduplicate by title later
    const updatedTimeline = [...(projectData.timeline || []), ...analysis.timeline.map((e: any) => ({ ...e, id: generateId(), source: 'ai' }))];

    const updates: Partial<ProjectData> = {
      summary: analysis.summary || projectData.summary,
      characters: updatedCharacters,
      locations: updatedLocations,
      timeline: updatedTimeline,
      themes: Array.from(new Set([...(projectData.themes || []), ...(analysis.themes || [])])),
      artifacts: Array.from(new Map([...(projectData.artifacts || []).map(a => [a.name, a]), ...analysis.artifacts.map((a: any) => [a.name, { ...a, id: generateId(), source: 'ai' }])]).values()) as Artifact[],
      lore: Array.from(new Map([...(projectData.lore || []).map(l => [l.term, l]), ...analysis.lore.map((l: any) => [l.term, { ...l, id: generateId(), source: 'ai' }])]).values()) as LoreEntry[]
    };

    if (content) {
      updates.chapters = [
        ...(projectData.chapters || []),
        { 
          id: generateId(), 
          title: `Imported ${new Date().toLocaleDateString()}`, 
          content, 
          order: (projectData.chapters?.length || 0), 
          status: 'Draft' as const, 
          lastModified: Date.now(),
          scenes: [],
          wordCount: content.trim().split(/\s+/).filter(w => w.length > 0).length
        }
      ];
    }

    await updateProjectData(updates);
    setAiError("Analysis complete. Characters and world details updated.");
    setTimeout(() => setAiError(null), 5000);
  }, [projectData, updateProjectData]);

  const handleDoubleProcessNote = async (text: string) => {
    addTask('double-process');
    setAiError(null);
    try {
      const res = await doubleProcessNote(text);
      const newNote: Note = { id: generateId(), content: text, expandedContent: res.expanded, metaSummary: res.summary, tags: res.tags, timestamp: Date.now() };
      setGlobalNotes(prev => [newNote, ...prev]);
      await saveGlobalNote(newNote);
    } catch (e) {
      handleError(e);
      const rawNote: Note = { id: generateId(), content: text, tags: ['#raw'], timestamp: Date.now() };
      setGlobalNotes(prev => [rawNote, ...prev]);
      await saveGlobalNote(rawNote);
    } finally {
      removeTask('double-process');
    }
  };

  const handleAddIdeaToProject = async (projectId: string, content: string, tags: string[]) => {
    if (projectData?.id === projectId) {
      const newIdea: Idea = {
        id: generateId(),
        content,
        tags,
        isCanon: false,
        timestamp: Date.now()
      };
      await updateProjectData({ ideas: [newIdea, ...(projectData.ideas || [])] });
    }
  };

  const handleExtractSoftAnchors = async () => {
    if (!projectData) return;
    setIsAnalyzing(true);
    addTask('Syncing Timeline (Soft Anchors)');
    setAiError(null);
    try {
      const manuscriptText = projectData.chapters?.map(c => c.content).join('\n') || '';
      if (!manuscriptText) throw new Error("No manuscript content to analyze.");
      
      const existingEvents = projectData.timeline.map(e => ({ id: e.id, title: e.title, uei: e.uei || 0 }));
      const newAnchors = await extractSoftAnchors(manuscriptText, existingEvents);
      
      if (newAnchors && newAnchors.length > 0) {
        const generatedEvents = newAnchors.map(a => ({
          id: generateId(),
          date: a.date || 'Unknown Date',
          title: a.title,
          description: a.description,
          uei: a.uei,
          isSoftAnchor: true,
          referenceEventId: a.referenceEventId,
          charactersInvolved: [],
          location: '',
          source: 'ai' as const
        }));
        await updateProjectData({ timeline: [...projectData.timeline, ...generatedEvents] });
      }
    } catch (e) {
      handleError(e);
    } finally {
      setIsAnalyzing(false);
      removeTask('Syncing Timeline (Soft Anchors)');
    }
  };

  const handleGenerateCover = async () => {
    if (!projectData) return;
    setIsGeneratingCover(true);
    addTask('Generating Cover Art');
    setAiError(null);
    try {
      const coverUrl = await generateBookCover(projectData.title, projectData.author || '', projectData.summary);
      if (coverUrl) await updateProjectData({ coverImage: coverUrl });
    } catch (e) {
      handleError(e);
    } finally {
      setIsGeneratingCover(false);
      removeTask('Generating Cover Art');
    }
  };

  const handleExportVault = async () => {
    try {
      addTask('Exporting Vault');
      await exportVaultAsZip(
        globalNotes,
        generateId(8),
        currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : 'Unknown Author',
        projectsMetadata
      );
    } catch (e) {
      handleError(e);
    } finally {
      removeTask('Exporting Vault');
    }
  };

  const handleToggleCanon = async (noteId: string, isCanon: boolean) => {
    let targetNote: Note | undefined;
    
    // Check global notes
    const globalNote = globalNotes.find(n => n.id === noteId);
    if (globalNote) {
      const updated = globalNotes.map(n => n.id === noteId ? { ...n, isCanon } : n);
      setGlobalNotes(updated);
      await saveGlobalNote({ ...globalNote, isCanon });
      targetNote = { ...globalNote, isCanon };
    }

    // Check project notes (ideas)
    if (!targetNote && projectData?.ideas) {
      const idea = projectData.ideas.find(n => n.id === noteId);
      if (idea) {
        const updated = projectData.ideas.map(n => n.id === noteId ? { ...n, isCanon } : n);
        await updateProjectData({ ideas: updated });
        targetNote = { ...idea, isCanon };
      }
    }
  };

  const handleUploadProject = async (file: File) => {
    setIsAnalyzing(true);
    addTask('uploading-project');
    try {
      // Handle Vault (.pvoid) files
      if (file.name.endsWith('.pvoid')) {
        const vaultData = await importVaultFromZip(file);
        // Merge vault notes into global notes
        const newNotes = vaultData.notes.map(note => ({
          id: note.id,
          content: note.content,
          tags: note.tags,
          anchor_target: note.anchor_target,
          note_type: note.note_type,
          created: new Date().toISOString(),
          modified: new Date().toISOString()
        }));
        
        // Add new notes to global notes
        const existingIds = new Set(globalNotes.map(n => n.id));
        const notesToAdd = newNotes.filter(n => !existingIds.has(n.id));
        
        const updatedNotes = [...globalNotes, ...notesToAdd];
        setGlobalNotes(updatedNotes);
        
        // Save each new note
        for (const note of notesToAdd) {
          await saveGlobalNote(note);
        }
        
        setProcessingStatus(`Imported ${notesToAdd.length} notes from Vault`);
        return;
      }
      
      // Handle Book (.plothole) files (ZIP format)
      if (file.name.endsWith('.plothole')) {
        const projectData = await unpackProject(file);
        if (projectData) {
          projectData.author = currentUser.name;
          await saveProjectData(projectData);
          setProjectData(projectData);
          await refreshMetadata();
          setCurrentView(ViewType.DASHBOARD);
          return;
        }
      }
      
      const text = await file.text();
      let data: any;
      
      if (file.name.endsWith('.json')) {
        data = JSON.parse(text);
        data.author = currentUser.name;
      } else {
        // It's a manuscript text file
        setProcessingStatus("Reading Manuscript...");
        const analysis = await analyzeStoryText(text, undefined, {
          extractCharacters: true,
          extractTimeline: true,
          extractLocations: true,
          extractArtifacts: true,
          extractLore: true
        }, (msg) => setProcessingStatus(msg));

        setProcessingStatus("Detecting Manuscript Structure...");
        const structure = await detectManuscriptStructure(text);
        let generatedChapters: any[] = [];
        
        try {
          const regex = new RegExp(`(${structure.chapterPattern})`, 'gim');
          const parts = text.split(regex);
          
          if (parts.length > 1) {
            // First part is prologue/front-matter
            if (parts[0].trim().length > 0) {
              generatedChapters.push({
                id: generateId(),
                title: 'Prologue / Front Matter',
                content: parts[0].trim(),
                order: 0,
                status: 'Draft' as const,
                lastModified: Date.now(),
                scenes: [],
                wordCount: parts[0].trim().split(/\s+/).filter(w => w.length > 0).length
              });
            }
            
            for (let i = 1; i < parts.length; i += 2) {
              const header = parts[i].trim();
              const body = (parts[i+1] || '').trim();
              const combined = header + '\n\n' + body;
              
              generatedChapters.push({
                id: generateId(),
                title: header.substring(0, 50), // keep title reasonable
                content: combined,
                order: generatedChapters.length,
                status: 'Draft' as const,
                lastModified: Date.now(),
                scenes: [],
                wordCount: combined.split(/\s+/).filter(w => w.length > 0).length
              });
            }
          }
        } catch (e) {
          console.warn("Regex parsing failed", e);
        }

        if (generatedChapters.length === 0) {
          generatedChapters = [{ 
            id: generateId(), 
            title: 'Imported Chapter', 
            content: text, 
            order: 0, 
            status: 'Draft' as const, 
            lastModified: Date.now(),
            scenes: [],
            wordCount: text.trim().split(/\s+/).filter(w => w.length > 0).length 
          }];
        }

        setProcessingStatus("Architecting World...");
        const finalCharacters = analysis.characters.map(c => ({ ...c, id: generateId(), source: 'ai' as const }));
        
        // Map relationship names to character IDs
        const finalRelationships = (analysis.relationships || []).map(rel => {
          const src = finalCharacters.find(c => c.name.toLowerCase() === (rel.sourceId || '').toLowerCase());
          const tgt = finalCharacters.find(c => c.name.toLowerCase() === (rel.targetId || '').toLowerCase());
          if (src && tgt) {
            return { ...rel, id: generateId(), sourceId: src.id, targetId: tgt.id };
          }
          return null;
        }).filter(Boolean) as Relationship[];

        data = {
          id: generateId(),
          title: analysis.title || file.name.replace(/\.[^/.]+$/, ""),
          author: currentUser.name,
          summary: analysis.summary,
          lastModified: Date.now(),
          wordCount: text.trim().split(/\s+/).filter(w => w.length > 0).length,
          charCount: text.length,
          characters: finalCharacters,
          relationships: finalRelationships,
          locations: analysis.locations.map(l => ({ ...l, id: generateId(), source: 'ai' as const })),
          timeline: analysis.timeline.map(e => ({ ...e, id: generateId(), source: 'ai' as const })),
          themes: analysis.themes,
          artifacts: analysis.artifacts.map(a => ({ ...a, id: generateId(), source: 'ai' as const })),
          lore: analysis.lore.map(l => ({ ...l, id: generateId(), source: 'ai' as const })),
          chapters: generatedChapters
        };
      }
      
      if (data) {
        if (!data.id) data.id = generateId();
        await saveProjectData(data);
        setProjectData(data);
        await refreshMetadata();
        setCurrentView(ViewType.DASHBOARD);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setIsAnalyzing(false);
      setProcessingStatus(null);
      removeTask('uploading-project');
    }
  };

  const viewContent = useMemo(() => {
    if (!isLoaded || !isClerkLoaded) return <div className="h-full flex items-center justify-center text-primary animate-pulse font-bold uppercase tracking-widest">Initialising Core Engines...</div>;

    // Admin view restriction
    if (currentView === ViewType.ADMIN && currentUser.role !== 'admin') {
      return <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-950 p-12 text-center">
        <Shield size={48} className="mb-4 text-red-500/50" />
        <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">Access Denied</h2>
        <p className="font-serif italic max-w-md">The archives in this sector are restricted to High Architects. Please return to your workstation.</p>
        <button 
          onClick={() => setCurrentView(ViewType.BOOKSHELF)}
          className="mt-8 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-indigo-700 transition-colors"
        >
          Return to Bookshelf
        </button>
      </div>;
    }

    if (!projectData && ![ViewType.BOOKSHELF, ViewType.TOOLBOX, ViewType.ADMIN, ViewType.SETTINGS, ViewType.NOTEPAD].includes(currentView)) {
        return <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-950 font-serif italic text-lg text-center p-12">Initialize a story world to unlock drafting tools.</div>;
    }

    switch (currentView) {
      case ViewType.BOOKSHELF:
        return <BookshelfView
          projects={projectsMetadata}
          activeProjectId={projectData?.id || ''}
          currentUser={currentUser}
          onRefreshMetadata={refreshMetadata}
          fetchWithAuth={fetchWithAuth}
          onSelectProject={async (id) => {
            const d = await loadProjectById(id); 
            if (d) { 
              setProjectData(d); 
              setIsDashboardModalOpen(true);
            } 
          }} 
          onDeselectProject={() => {
            setProjectData(null);
          }}
          onCreateProject={handleCreateProject} 
          onUploadProject={handleUploadProject} 
          onDeleteProject={handleDeleteProject}
          onEditProject={handleEditProject}
          onOpenDashboard={() => setIsDashboardModalOpen(true)} 
          isAnalyzing={isAnalyzing}
        />;

      case ViewType.NOTEPAD:
        return <ResearchSystemView
          currentView={currentView}
          onChangeView={setCurrentView}
          data={{...projectData, notes: globalNotes} as any}
          projectsMetadata={projectsMetadata}
          currentUser={currentUser}
          activeTasks={activeTasks}
          fetchWithAuth={fetchWithAuth}
          onAddNote={async n => {

            let noteToSave = { ...n };
            if (projectData) {
              const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
              const projectTags = [projectData.shortName, projectData.title].filter(Boolean).map(s => normalize(s!));
              const charTags = (projectData.characters || []).map(c => normalize(c.name));
              const locTags = (projectData.locations || []).map(l => normalize(l.name));
              const noteTags = n.tags.map(t => normalize(t));
              const shouldCanonize = noteTags.some(t => projectTags.includes(t) || charTags.includes(t) || locTags.includes(t));
              if (shouldCanonize) {
                noteToSave.isCanon = true;
              }
              await updateProjectData({ notes: [noteToSave, ...(projectData.notes || [])] });
            } else {
              setGlobalNotes(prev => [noteToSave, ...prev]); 
              await saveGlobalNote(noteToSave); 
            }
          }} 
          onAddIdeaToProject={handleAddIdeaToProject} 
          onToggleCanon={handleToggleCanon} 
          onDeleteNote={handleDeleteNote} 
          onDeleteAllNotes={async () => {
            setGlobalNotes([]);
            for (const note of globalNotes) await deleteGlobalNote(note.id);
            if (projectData?.notes) await updateProjectData({ notes: [] });
          }} 
          onLinkClick={handleLinkClick} 
          onAddDoubleProcessedNote={handleDoubleProcessNote} 
          activeTasks={activeTasks} 
          onUpdateProject={updateProjectData} 
          semanticSearchEnabled={currentUser.preferences?.semanticSearchEnabled}
          onCreateProject={handleCreateProject}
          onUploadProject={handleUploadProject}
          onDeleteProject={handleDeleteProject}
          onSelectProject={async (id) => { 
            const d = await loadProjectById(id); 
            if (d) { 
              setProjectData(d); 
              setIsDashboardModalOpen(true);
            } 
          }}
          onOpenDashboard={() => setIsDashboardModalOpen(true)}
          isAnalyzing={isAnalyzing}
        />;

      case ViewType.CHARACTERS: 
        return projectData ? <CharacterView 
          data={projectData}
          onUpdateProject={updateProjectData}
          onLinkClick={handleLinkClick} 
          onExtractRelationships={handleExtractRelationships}
          isExtractingRelationships={isExtractingRelationships}
        /> : null;
      case ViewType.DASHBOARD:
        return projectData ? <DashboardView projectData={projectData} globalNotes={globalNotes} onFileUpload={() => {}} onLoadSample={() => handleCreateProject(projectData?.title || 'The Obsidian Citadel', projectData?.author || 'Junior Archivist', true, projectData?.shortName || 'Citadel', projectData?.id)} isAnalyzing={isAnalyzing} error={null} onExport={() => exportFullArchive(globalNotes)} onAnalyzeText={(t) => {
            setIsAnalyzing(true);
            addTask('Analyzing Project');
            analyzeStoryText(t, undefined, { extractCharacters: true, extractTimeline: true, extractLocations: true, extractArtifacts: true, extractLore: true })
            .then(a => updateProjectData({ summary: a.summary, themes: a.themes }))
            .catch(handleError)
            .finally(() => {
              setIsAnalyzing(false);
              removeTask('Analyzing Project');
            });
        }} onRestoreHistory={() => {}} onRestoreCommit={handleRestoreCommit} onGenerateCover={handleGenerateCover} onExportVault={handleExportVault} onAuditThreads={handleAuditThreads} onExportProject={(p) => exportProjectPlothole(p)} isGeneratingCover={isGeneratingCover} onUpdateProcessedFiles={handleUpdateProcessedFiles} isUpdatingProcessed={isUpdatingProcessed} onLinkClick={handleLinkClick} 
         onUpdateProject={updateProjectData} 
         onSave={handleManualSave}
         currentUser={currentUser} 
         /> : null;
      case ViewType.TIMELINE:
      case ViewType.BOARD:
      case ViewType.MATRIX:
      case ViewType.PLOT_ANALYSIS:
      case ViewType.CALENDAR:
        return projectData ? <PlotSystemView currentView={currentView} onChangeView={setCurrentView} data={projectData} onUpdateCalendar={(c) => updateProjectData({ calendars: projectData.calendars.map(cal => cal.id === c.id ? c : cal) })} onSetActiveCalendar={(id) => updateProjectData({ activeCalendarId: id })} onLinkClick={handleLinkClick} onAddTimelineEvent={(e) => updateProjectData({ timeline: [...projectData.timeline, e] })} onUpdateTimelineEvent={(e) => updateProjectData({ timeline: projectData.timeline.map(ev => ev.id === e.id ? e : ev) })} onAnalyzePlot={() => {}} onExtractSoftAnchors={handleExtractSoftAnchors} onUpdateProject={updateProjectData} isAnalyzing={isAnalyzing} /> : null;

      case ViewType.MAP:
      case ViewType.LOCATIONS:
      case ViewType.ENCYCLOPEDIA:
      case ViewType.INVENTORY:
      case ViewType.DICTIONARY:
      case ViewType.GALLERY:
        return projectData ? <WorldSystemView 
          currentView={currentView} 
          onChangeView={setCurrentView} 
          data={projectData} 
          onUpdateLocation={(l) => updateProjectData({ locations: projectData.locations.map(loc => loc.id === l.id ? l : loc) })} 
          onAddLocation={(l) => updateProjectData({ locations: [...projectData.locations, l] })} 
          onUpdateRootMap={(u) => updateProjectData({ rootMapImage: u })} 
          onUpdateRootMapData={(s, u) => updateProjectData({ mapScale: s, mapUnit: u })} 
          onLinkClick={handleLinkClick} 
          onUpdateMapOrder={() => {}} 
          currentMapParentId={currentMapParentId} 
          onMapChange={setCurrentMapParentId} 
          onUpdateProject={updateProjectData} 
          onAddArtifact={(a) => updateProjectData({ artifacts: [...(projectData.artifacts || []), a] })} 
          onUpdateArtifact={(a) => updateProjectData({ artifacts: projectData.artifacts?.map(ar => ar.id === a.id ? a : ar) })} 
          onDeleteArtifact={(id) => updateProjectData({ artifacts: projectData.artifacts?.filter(ar => ar.id !== id) })} 
          onAddLore={(l) => updateProjectData({ lore: [...(projectData.lore || []), l] })} 
          onDeleteLore={(id) => updateProjectData({ lore: projectData.lore?.filter(lo => lo.id !== id) })} 
          isFullscreen={isMapFullscreen} 
          onToggleFullscreen={() => setIsMapFullscreen(!isMapFullscreen)}
          onLocationUndo={(id) => {
            const loc = projectData.locations.find(l => l.id === id);
            if (loc && loc.prevX !== undefined && loc.prevY !== undefined) {
              updateProjectData({ locations: projectData.locations.map(l => l.id === id ? { ...l, x: loc.prevX, y: loc.prevY, prevX: undefined, prevY: undefined } : l) });
            }
          }}
          onLocationReset={(id) => {
            const loc = projectData.locations.find(l => l.id === id);
            if (loc && loc.matchedX !== undefined && loc.matchedY !== undefined) {
              updateProjectData({ locations: projectData.locations.map(l => l.id === id ? { ...l, x: loc.matchedX, y: loc.matchedY } : l) });
            }
          }}
        /> : null;

      case ViewType.TOOLBOX:
        return projectData ? (
          <ToolboxView 
            data={projectData} 
            defaultResources={appSettings.defaultToolboxLinks || []} 
            onUpdateProject={updateProjectData} 
          />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 font-serif italic text-lg p-12 text-center bg-slate-50 dark:bg-slate-950">
            Initialize a story world to access the Writer's Toolbox.
          </div>
        );

      case ViewType.ADMIN:
        return <AdminView 
          data={projectData} 
          globalNotes={globalNotes}
          appPrompts={appPrompts} 
          appSettings={appSettings}
          onSaveSettings={async (s) => { setAppSettings(s); await saveAppSettings(s); }}
          onSavePrompts={async (p) => { setAppPromptsState(p); await saveAppPrompts(p); }} 
          onUpdateProject={updateProjectData}
          projectsMetadata={projectsMetadata}
          onDeleteGlobalNote={async id => {
            setGlobalNotes(prev => prev.filter(n => n.id !== id));
            await deleteGlobalNote(id);
          }}
          onLinkClick={handleLinkClick}
          onChangeView={setCurrentView}
          currentUser={currentUser}
          />;
      case ViewType.SETTINGS:
        const handleClearGlobalNotes = async () => {
          await clearAllGlobalNotes();
          setGlobalNotes([]);
        };
        return <SettingsView 
          projectData={projectData} 
          globalNotes={globalNotes} 
          onImportProject={async d => { await saveProjectData(d); await refreshMetadata(); }} 
          onFactoryReset={async () => { await clearDatabase(); window.location.reload(); }} 
          onClearGlobalNotes={handleClearGlobalNotes} 
          currentUser={currentUser} 
          onUpdateUser={u => setCurrentUser(prev => ({...prev, ...u}))} 
          onUpdateProject={d => updateProjectData(d)} 
          onChangeView={setCurrentView} 
          onLinkClick={handleLinkClick} 
          fetchWithAuth={fetchWithAuth}
        />;

      case ViewType.RESEARCH:
        return projectData ? <ResearchView projectData={projectData} globalNotes={globalNotes} projectsMetadata={projectsMetadata} currentUser={currentUser} onUpdateProject={updateProjectData} onDeleteNote={handleDeleteNote} onLinkClick={handleLinkClick} /> : <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-950 font-serif italic text-lg text-center p-12">Initialize a story world to unlock Research.</div>;

      case ViewType.CODEX:
        return projectData ? <CodexView projectData={projectData} onLinkClick={handleLinkClick} onUpdateProject={updateProjectData} /> : <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-950 font-serif italic text-lg text-center p-12">Initialize a story world to unlock Codex.</div>;

      case ViewType.SEMANTIC_EDITOR:
        return projectData ? <SemanticEditorView projectData={projectData} onUpdateProject={updateProjectData} /> : <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-950 font-serif italic text-lg text-center p-12">Initialize a story world to unlock Semantic Engine.</div>;

      /* case ViewType.STORY_ARCHITECT:
        return <StoryArchitectView projectsMetadata={projectsMetadata} onSelectProject={async (id) => { const d = await loadProjectById(id); if (d) { setProjectData(d); await refreshMetadata(); setCurrentView(ViewType.DASHBOARD); } }} onUpdateProject={updateProjectData} currentUser={currentUser} />; */

      default: 
        return <div className="h-full flex items-center justify-center text-slate-400">View not found.</div>;
    }
  }, [isLoaded, isClerkLoaded, currentView, projectData, projectsMetadata, globalNotes, isAnalyzing, isGeneratingCover, isExtractingThemes, isExtractingRelationships, isUpdatingProcessed, currentUser, appPrompts, globalResources, activeTasks, updateProjectData, currentMapParentId, refreshMetadata, handleDeleteProject, handleUploadProject, handleCreateProject, handleGenerateCover, handleDoubleProcessNote, handleError, handleQuickUpdate]);
  // Auto-collapse sidebar when entering/exiting Admin or Settings view
  useEffect(() => {
    if (currentView === ViewType.ADMIN || currentView === ViewType.SETTINGS) {
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarCollapsed(false);
    }
  }, [currentView]);

  // Listen for custom events from Sidebar
  React.useEffect(() => {
    const handleToggleAdminNote = () => setIsAdminNoteOpen(prev => !prev);
    window.addEventListener('toggleAdminNote', handleToggleAdminNote);
    return () => window.removeEventListener('toggleAdminNote', handleToggleAdminNote);
  }, []);

  const renderAppContent = () => (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors animate-in fade-in duration-500">
      <Sidebar
        currentView={currentView}
        onChangeView={(v) => { setCurrentView(v); setIsMobileSidebarOpen(false); }}
        isOpen={isMobileSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onClose={() => setIsMobileSidebarOpen(false)}
        hasActiveProject={!!projectData}
        onToggleAi={() => setIsAiOpen(!isAiOpen)}
        isAiOpen={isAiOpen}
        currentUser={currentUser}
        isProcessing={activeTasks.length > 0}
        processingStatus={processingStatus}
        activeProjectTitle={projectData?.title}
        onQuickNote={() => setIsAdminNoteOpen(!isAdminNoteOpen)}
        onSave={handleManualSave}
        appName={appSettings.appName}
        sidebarOrder={appSettings.sidebarOrder}
        onOpenLicenses={() => setIsLicensesOpen(true)}
        hideDesktopActions={!isSidebarCollapsed}
        isFullscreen={isMapFullscreen}
        isServerConnected={isServerConnected}
        isCloudStorage={isCloudStorageActive()}
        lastModified={projectData?.lastModified}
      />

      <main className="flex-1 h-full relative overflow-hidden flex flex-col">
        {/* Mobile Fixed Binding Header */}
        <div className={`lg:hidden z-[2000] fixed top-0 left-0 right-0 transition-all duration-500 bg-black ${currentView === ViewType.NOTEPAD ? 'h-[calc(env(safe-area-inset-top)+3.5rem)] shadow-2xl' : 'h-[env(safe-area-inset-top)]'}`}>
          {currentView === ViewType.NOTEPAD && (
            <>
              {/* Opaque Leather Texture */}
              <div 
                className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/leather.png')] opacity-100 pointer-events-none" 
              />
              
              {/* Rugged Texture Overlay (matches paper noise) */}
              <div 
                className="absolute inset-0 opacity-[0.15] pointer-events-none"
                style={{ 
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='256' height='256' viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`
                }}
              />

              {/* Smooth transition from solid black forehead into leather */}
              <div className="absolute inset-x-0 top-0 h-[calc(env(safe-area-inset-top)+1.5rem)] bg-gradient-to-b from-black via-black/40 to-transparent pointer-events-none" />

              {/* Noticeable grounded shadow where leather meets paper */}
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent opacity-100 pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-8 bg-black/40 blur-md pointer-events-none" />
            </>
          )}
        </div>

        <div className="flex-1 flex flex-col h-full overflow-hidden pt-[env(safe-area-inset-top)]">
          {!hasApiKey && (
            <div className="bg-indigo-600 text-white px-6 py-3 flex items-center justify-between shadow-lg z-[1001]">
              <div className="flex items-center gap-3 text-sm font-bold">
                <Sparkles size={18} className="animate-pulse" />
                <span>Connect your Gemini API Key to unlock AI story analysis features.</span>
              </div>
              <button
                onClick={handleOpenKeySelection}
                className="px-4 py-1.5 bg-white text-indigo-600 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-colors shadow-sm"
              >
                Connect Key
              </button>
            </div>
          )}
          {aiError && (
            <div className="bg-amber-500 text-white px-6 py-4 flex items-center justify-between shadow-2xl animate-in slide-in-from-top duration-300 z-[1000] border-b border-amber-600/50">
              <div className="flex items-center gap-4 font-bold text-sm">
                <AlertCircle size={22} className="animate-pulse" />
                {aiError}
              </div>
              <button onClick={() => setAiError(null)} className="p-2 hover:bg-black/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
          )}

          <div className="flex-1 overflow-hidden relative">
            {viewContent}
          </div>
        </div>
        
        {/* Mobile Floating Nav */}
        <BottomNav
          currentView={currentView}
          onChangeView={(v) => {
            setCurrentView(v);
            setIsMobileSidebarOpen(false);
            setIsAdminNoteOpen(false);
          }}
          onToggleSidebar={() => {
            setIsMobileSidebarOpen(!isMobileSidebarOpen);
            setIsAdminNoteOpen(false);
          }}
          isSidebarOpen={isMobileSidebarOpen}
          hasActiveProject={!!projectData}
          bottomNavOrder={appSettings.bottomNavOrder}
        />
        <ActiveArchitect tasks={activeTasks} />

        {/* Desktop Floating Action Buttons */}
        <div className="hidden lg:flex fixed bottom-8 right-8 flex-row items-center gap-4 z-[1000]">
          <button
            onClick={() => setIsAiOpen(!isAiOpen)}
            className={`p-4 rounded-2xl shadow-2xl transition-all flex items-center justify-center hover:scale-110 ${isAiOpen ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
            title="Summon The Oracle"
          >
            <div className="relative">
              <Sparkles size={24} className={activeTasks.length > 0 ? 'animate-spin' : ''} />
              {activeTasks.length > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse" />
              )}
            </div>
          </button>
        </div>
      </main>
      <AiAssistant projectData={projectData} isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} onToggle={() => setIsAiOpen(!isAiOpen)} currentUser={currentUser} />
      
      {/* Admin Note Canvas */}
      <AnimatePresence>
        {isAdminNoteOpen && (
          <motion.div
            initial={{ y: window.innerWidth < 1024 ? '-100%' : 0, x: window.innerWidth < 1024 ? 0 : '100%' }}
            animate={{ y: 0, x: 0 }}
            exit={{ y: window.innerWidth < 1024 ? '-100%' : 0, x: window.innerWidth < 1024 ? 0 : '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed z-[1500] bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col
              ${window.innerWidth < 1024 
                ? 'inset-x-0 top-0 max-h-[calc(100vh-12rem)] rounded-b-[3rem] border-b' 
                : 'inset-y-0 right-0 w-[450px] border-l'}`}
          >
            <div className="lg:hidden h-[env(safe-area-inset-top)] bg-slate-950 w-full shrink-0" />
            <header className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg">
                  <PenTool size={20} />
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Admin Notes</h2>
              </div>
              <button 
                onClick={() => setIsAdminNoteOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 relative">
              {/* Corkboard Texture/Design */}
              <div className="absolute inset-0 bg-[#d2b48c]/10 dark:bg-slate-900 opacity-30 pointer-events-none" />
              
              <div className="relative z-10 space-y-6">
                {/* Persistent Input at Top */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-lg border border-white/20">
                  <textarea 
                    autoFocus
                    placeholder="Quick draft an administrative note... (Enter to save)"
                    className="w-full h-24 bg-transparent border-none focus:ring-0 text-sm font-serif resize-none"
                    onKeyDown={async (e) => {
                      if (e.key === 'Escape') {
                        setIsAdminNoteOpen(false);
                      } else if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        const target = e.currentTarget;
                        const text = target.value.trim();
                        if (!text) return;
                        const n: Note = { id: generateId(), content: text, tags: ['admin_note'], timestamp: Date.now() };
                        if (projectData) {
                          await updateProjectData({ notes: [n, ...(projectData.notes || [])] });
                        } else {
                          setGlobalNotes(prev => [n, ...prev]);
                          await saveGlobalNote(n);
                        }
                        target.value = '';
                      }
                    }}
                  />
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Enter to Save &bull; Shift+Enter for Newline</span>
                    <button
                      onClick={async () => {
                        const textarea = document.querySelector('textarea[placeholder*="Quick draft"]');
                        if (textarea instanceof HTMLTextAreaElement) {
                          const text = textarea.value.trim();
                          if (!text) return;
                          const n: Note = { id: generateId(), content: text, tags: ['admin_note'], timestamp: Date.now() };
                          if (projectData) {
                            await updateProjectData({ notes: [n, ...(projectData.notes || [])] });
                          } else {
                            setGlobalNotes(prev => [n, ...prev]);
                            await saveGlobalNote(n);
                          }
                          textarea.value = '';
                        }
                      }}
                      className="lg:hidden px-4 py-1.5 bg-amber-600 text-white rounded-lg font-black text-[8px] uppercase tracking-widest shadow-lg shadow-amber-600/20 active:scale-95 transition-all"
                    >
                      Append
                    </button>
                  </div>
                </div>

                {/* Scrivener-style vertical row of notes */}
                <div className="space-y-4">
                  {(projectData?.notes || globalNotes).filter(n => n.tags.includes('admin_note')).map(note => (
                    <div 
                      key={note.id}
                      className="group relative bg-white dark:bg-slate-800 p-5 rounded-lg shadow-md border-t-4 border-t-amber-300 dark:border-t-amber-900 transition-all hover:shadow-xl"
                    >
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-400/50" />
                      <p className="text-sm text-slate-700 dark:text-slate-300 font-serif leading-relaxed">{note.content}</p>
                      <div className="mt-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[8px] font-black text-slate-400 uppercase">{new Date(note.timestamp).toLocaleDateString()}</span>
                        <button 
                          onClick={async () => {
                            if (projectData) {
                              await updateProjectData({ notes: projectData.notes.filter(n => n.id !== note.id) });
                            } else {
                              setGlobalNotes(prev => prev.filter(n => n.id !== note.id));
                              await deleteGlobalNote(note.id);
                            }
                          }}
                          className="text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {projectData && (
        <Modal
          isOpen={isDashboardModalOpen}
          onClose={() => setIsDashboardModalOpen(false)}
          title={`Story Dashboard: ${projectData.title}`}
          maxWidth="max-w-6xl"
        >
          <div className="h-[80vh] overflow-y-auto no-scrollbar">
            <DashboardView 
              projectData={projectData}
              globalNotes={globalNotes}
              onUpdateProject={updateProjectData} 
              onLinkClick={(type, id) => { 
                setIsDashboardModalOpen(false); 
                handleLinkClick(type, id); 
              }} 
              onExportProject={exportProjectPlothole} 
              onGenerateCover={handleGenerateCover}
              isGeneratingCover={isAnalyzing}
              onAuditThreads={handleAuditThreads}
              isAnalyzing={isAnalyzing}
              onRestoreCommit={handleRestoreCommit}
              currentUser={currentUser}
              onFileUpload={() => {}}
              onLoadSample={() => handleCreateProject(projectData?.title || 'The Obsidian Citadel', projectData?.author || 'Junior Archivist', true, projectData?.shortName || 'Citadel', projectData?.id)}
              onExport={() => exportProjectPlothole(projectData)}
              onAnalyzeText={() => {}}
              onRestoreHistory={() => {}}
              onUpdateProcessedFiles={handleUpdateProcessedFiles}
              isUpdatingProcessed={isUpdatingProcessed}
              error={null}
            />
          </div>
        </Modal>
      )}
      
      <Modal
        isOpen={isLicensesOpen}
        onClose={() => setIsLicensesOpen(false)}
        title="Open Source Licenses"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4 custom-scrollbar text-slate-900 dark:text-white">
          <p className="text-xs text-slate-500 italic leading-relaxed">
            Plothole is built upon the incredible work of the open source community. Below is a documentation of our third-party dependencies as per standard archival practices.
          </p>
          
          <div className="space-y-4">
            {[
              { 
                name: 'React Flow (@xyflow/react)', 
                maintainer: 'webkid.io / xyflow',
                usage: 'Powers the Relationship Graph visualization in Character View.',
                status: 'Actively Maintained',
                cost: 'Free (MIT License)'
              },
              { 
                name: 'Tiptap', 
                maintainer: 'überdosis',
                usage: 'Core rich-text engine for the Semantic Editor.',
                status: 'Actively Maintained',
                cost: 'Free (MIT License)'
              },
              { 
                name: 'Fuse.js', 
                maintainer: 'Kiro Risk',
                usage: 'Advanced fuzzy-search logic for the Entity Explorer.',                status: 'Actively Maintained',
                cost: 'Free (Apache 2.0)'
              },
              { 
                name: 'docx', 
                maintainer: 'Volodymyr Baydalka',
                usage: 'Generates Microsoft Word files for manuscript export.',
                status: 'Actively Maintained',
                cost: 'Free (MIT License)'
              },
              { 
                name: 'Leaflet', 
                maintainer: 'Volodymyr Agafonkin',
                usage: 'Geospatial mapping engine for the World Atlas.',
                status: 'Actively Maintained',
                cost: 'Free (BSD-2)'
              },
              { 
                name: 'Lucide', 
                maintainer: 'Lucide Contributors',
                usage: 'Provides all iconography across the application interface.',
                status: 'Actively Maintained',
                cost: 'Free (ISC License)'
              },
              { 
                name: 'Simple Git', 
                maintainer: 'Steve King',
                usage: 'Enables automatic Git versioning for story worlds.',
                status: 'Actively Maintained',
                cost: 'Free (MIT License)'
              },
              { 
                name: 'pdf-parse', 
                maintainer: 'Nicklas Teigen',
                usage: 'Server-side extraction of text from uploaded PDF research.',
                status: 'Maintained',
                cost: 'Free (MIT License)'
              },
              { 
                name: 'JSZip', 
                maintainer: 'Stuart Knightley',
                usage: 'Bundles and packages project files for local exports.',
                status: 'Actively Maintained',
                cost: 'Free (MIT / GPLv3)'
              },
              { 
                name: 'Express', 
                maintainer: 'OpenJS Foundation',
                usage: 'Standard server framework for Plothole storage APIs.',
                status: 'Actively Maintained',
                cost: 'Free (MIT License)'
              },
              { 
                name: 'Gemini (Google GenAI)', 
                maintainer: 'Google',
                usage: 'The "Oracle" AI processing and narrative synthesis.',
                status: 'Actively Maintained',
                cost: 'Commercial (Usage-based API costs apply)'
              },
              { 
                name: 'Clerk', 
                maintainer: 'Clerk, Inc.',
                usage: 'Secure user authentication and session management.',
                status: 'Actively Maintained',
                cost: 'Commercial (Free tier + usage-based costs)'
              }
            ].map((lib) => (
              <div key={lib.name} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-black uppercase tracking-tight">{lib.name}</h4>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${lib.status === 'Actively Maintained' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    {lib.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 text-[10px]">
                  <div><span className="font-black text-slate-400 uppercase tracking-widest mr-2">Maintainer:</span> <span className="font-bold">{lib.maintainer}</span></div>
                  <div><span className="font-black text-slate-400 uppercase tracking-widest mr-2">Usage:</span> <span>{lib.usage}</span></div>
                  <div><span className="font-black text-slate-400 uppercase tracking-widest mr-2">Cost:</span> <span className={`font-bold ${lib.cost.includes('Free') ? 'text-indigo-500' : 'text-amber-600'}`}>{lib.cost}</span></div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-center">
            <a 
              href="/licenses.txt" 
              target="_blank" 
              rel="noreferrer"
              className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-xl transition-all"
            >
              <FileText size={12} /> View Full Dependency Manifest (.txt)
            </a>
          </div>
        </div>
      </Modal>
    </div>
  );

  // Detect public wiki routes (/{username} or /{username}/{bookname})
  const isPublicWikiRoute = () => {
    // BrowserRouter puts the path in the pathname
    const path = location.pathname;
    const parts = path.split('/').filter(Boolean); // Split by / and remove empty strings
    
    // Exclude app view routes (these are ViewType names)
    const viewTypeValues = Object.values(ViewType);
    if (parts.length === 0 || viewTypeValues.includes(parts[0] as ViewType)) {
      return false;
    }
    
    // Public wiki routes: /{username} or /{username}/{bookname}
    // We expect the first part to be the username
    return parts.length === 1 || parts.length === 2;
  };

  const [isGuest, setIsGuest] = useState(false);

  return (
    <>
      {isPublicWikiRoute() ? (
        // Render public wiki pages without authentication
        location.pathname.split('/').filter(Boolean).length === 2 ? (
          <WikiPageView />
        ) : (
          <PublicProfileView />
        )
      ) : !isSignedIn && !isGuest ? (
        <SignInPage onGuestAccess={() => setIsGuest(true)} />
      ) : (
        renderAppContent()
      )}
    </>
  );
};

export default App;
