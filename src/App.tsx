// FORCE REFRESH - PLOTHOLE V2
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import JSZip from 'jszip';
import { 
  ProjectData, ProjectMetadata, User, ViewType, Note, 
  AppPrompts, AppSettings, ToolboxLink, Artifact, LoreEntry, TimelineEvent, Idea, ChangeLogEntry, Relationship, SemanticDocument, ProseDocument, Chapter
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
  analyzeStoryText, generateBookCover, generateCharacterPhysicalDescription, doubleProcessNote, extractThemesFromNotes, extractSoftAnchors, auditPlotThreads,
  scanForContinuityErrors,
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
import { ResearchHubView } from './components/Views/ResearchHubView';
import { CharacterView } from './components/Views/CharacterView';
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import { WorldSystemView } from './components/Views/WorldSystemView';
import { Atlas2 } from './components/Views/Atlas2';
import { PlotSystemView } from './components/Views/PlotSystemView';
import { SettingsView } from './components/Views/SettingsView';
import { AdminView } from './components/Views/AdminView';
import { ToolboxView } from './components/Views/ToolboxView';
import { SemanticEditorView } from './components/Views/SemanticEditorView';
import { CodexView } from './components/Views/CodexView';
import { WikiPageView } from './components/Views/WikiPageView';
import { PublicProfileView } from './components/Views/PublicProfileView';
import { DynamicForgeView } from './components/Views/DynamicForgeView';
// import { StoryArchitectView } from './components/Views/StoryArchitectView';
import { ActiveArchitect } from './components/ui/ActiveArchitect';
import { Modal } from './components/ui/Modal';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X, Sparkles, Menu, LogOut, Shield, FileText, Database, PenTool, Trash2, Loader2, Search } from 'lucide-react';
import { useAuth0 } from '@auth0/auth0-react';
import { SignInPage } from './components/Auth/SignInPage';

const DEMO_USER: User = {
  id: 'user-1',
  name: 'Anonymous Writer',
  email: 'guest@plothole.local',
  role: 'admin',
  lastActive: Date.now(),
  themeColor: '59 130 246',
  preferences: { themeMode: 'light', fontSize: 'md', fontFamily: 'sans', landingPage: ViewType.BOOKSHELF, aiVerbosity: 'detailed', colorfulIcons: true, semanticSearchEnabled: false }
};



const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: auth0User, isAuthenticated, isLoading: isAuthLoading, getAccessTokenSilently } = useAuth0();

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    try {
      // Try to get token, but don't fail if unavailable
      let token: string | undefined;
      try {
        token = await getAccessTokenSilently({
          authorizationParams: {
            audience: 'https://dev-t0pa1ah6r1n2wc4a.us.auth0.com/api/v2/',
            scope: 'openid profile email offline_access'
          }
        });
      } catch (tokenErr: any) {
        console.warn(`[Auth] Could not get access token silently:`, tokenErr);
        // If it's a login_required error, we should stop trying to sync to cloud
        if (tokenErr.error === 'login_required' || tokenErr.error === 'consent_required') {
          console.error("[Auth] Login required. Disabling cloud storage for this session.");
          setCloudStorageEnabled(false, null);
        }
        token = undefined;
      }

      const headers = { ...options.headers } as Record<string, string>;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (isAuthenticated) {
        // If we are supposed to be authenticated but have no token, don't make the request
        console.warn(`[Auth] Authenticated but no token available for ${url}. Skipping request.`);
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }

      const response = await fetch(url, {
        ...options,
        headers
      });
      return response;
    } catch (err) {
      console.error(`[Auth] Error in fetchWithAuth for ${url}:`, err);
      throw err;
    }
  }, [getAccessTokenSilently, isAuthenticated]);

  const [projectsMetadata, setProjectsMetadata] = useState<ProjectMetadata[]>([]);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [globalNotes, setGlobalNotes] = useState<Note[]>([]);
  const [globalResources, setGlobalResources] = useState<ToolboxLink[]>([]);
  const [appPrompts, setAppPromptsState] = useState<AppPrompts>(DEFAULT_PROMPTS);
  const [appSettings, setAppSettings] = useState<AppSettings>({ 
    appName: 'Plothole — Your Story, Decoded',
    adminEmails: ['alittler86@gmail.com'],
    defaultToolboxLinks: [
      {
        id: 'demo-demographics',
        label: 'Fantasy Demographics Generator',
        url: 'https://donjon.bin.sh/fantasy/demographics/',
        category: 'World Building',
        description: 'Generate realistic demographic data for fantasy settlements'
      },
      {
        id: 'demo-magic-gen',
        label: 'Magic Generator',
        url: 'https://www.litrpgadventures.com/ai-tools/magic-generator/',
        category: 'World Building',
        description: 'Create unique magic systems and spells'
      },
      {
        id: 'demo-onelook',
        label: 'OneLook Dictionary',
        url: 'https://www.onelook.com/',
        category: 'Language',
        description: 'Search across multiple dictionaries simultaneously'
      },
      {
        id: 'demo-ogham',
        label: 'Ogham',
        url: 'https://ogham.co/',
        category: 'Language',
        description: 'Ancient Irish alphabet and writing system'
      },
      {
        id: 'demo-ipa',
        label: 'IPA Reader',
        url: 'https://ipa-reader.com/',
        category: 'Language',
        description: 'Pronunciation helper using International Phonetic Alphabet'
      },
      {
        id: 'demo-vulgarlang',
        label: 'Vulgar',
        url: 'https://www.vulgarlang.com/',
        category: 'Language',
        description: 'Create constructed and fictional languages'
      }
    ]
  });
  
  const [currentUser, setCurrentUser] = useState<User>(DEMO_USER);
  const [isServerConnected, setIsServerConnected] = useState(true);
  
  // Sync Auth0 user with app user
  useEffect(() => {
    if (!isAuthLoading && auth0User) {
      const email = auth0User.email || '';
      const isAdmin = (auth0User['https://plothole.ai/roles']?.includes('admin')) || 
                      (appSettings.adminEmails?.includes(email)) ||
                      (process.env.NODE_ENV === 'development' && email.endsWith('@plothole.ai'));

      setCurrentUser(prev => ({
        ...prev,
        id: auth0User.sub || '',
        name: auth0User.name || auth0User.nickname || 'Writer',
        email: email,
        role: isAdmin ? 'admin' : 'editor',
      }));
    }
  }, [isAuthLoading, auth0User, appSettings.adminEmails]);

  const currentView = (decodeURIComponent(location.pathname.slice(1)) as ViewType) || ViewType.BOOKSHELF;
  const [selectedCreatureId, setSelectedCreatureId] = useState<number | null>(null);
  const setCurrentView = (view: ViewType, params?: { creatureId?: number }) => {
    if (params?.creatureId !== undefined) {
      setSelectedCreatureId(params.creatureId);
    }
    navigate(`/${view}`);
  };

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
    setCloudStorageEnabled(isAuthenticated === true, fetchWithAuth);
    const meta = await getAllProjectsMetadata();
    console.log(`[App] Received ${meta.length} projects from storage`);
    setProjectsMetadata(meta);
  }, [isAuthenticated, fetchWithAuth]);

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
        
        // Helper function to determine tier based on role
        const getTierFromRole = (role: string): number => {
          const lowerRole = role.toLowerCase();
          if (lowerRole === 'protagonist' || lowerRole === 'antagonist' || lowerRole === 'core') {
            return 1; // Core tier
          } else if (lowerRole === 'supporting') {
            return 2; // Supporting tier
          } else {
            return 3; // Background tier (Minor, etc.)
          }
        };
        
        // Process each analyzed character
        for (const nc of analysis.characters) {
          const idx = existingChars.findIndex(ec => ec.name.toLowerCase() === nc.name.toLowerCase());
          const characterTier = getTierFromRole(nc.role || 'Minor');
          const isCoreTier = characterTier === 1;
          
          if (idx >= 0) {
            // Update existing character: prefer new data for job/role if current is empty
            existingChars[idx] = { 
              ...existingChars[idx], 
              job: existingChars[idx].job || nc.job || '',
              role: (existingChars[idx].role === 'Supporting' || existingChars[idx].role === 'Minor') ? (nc.role || existingChars[idx].role) : existingChars[idx].role,
              description: existingChars[idx].description.length < 10 ? (nc.description || existingChars[idx].description) : existingChars[idx].description,
              firstMentionOffset: nc.firstMentionOffset || existingChars[idx].firstMentionOffset,
              tier: existingChars[idx].tier !== undefined ? existingChars[idx].tier : characterTier
            };
            
            // Auto-generate physical description for core tier characters if missing
            if (isCoreTier && (!existingChars[idx].physicalFeatures || existingChars[idx].physicalFeatures.length < 20)) {
              try {
                setProcessingStatus(`Generating physical description for ${nc.name}...`);
                const physicalDesc = await generateCharacterPhysicalDescription({
                  name: existingChars[idx].name,
                  role: existingChars[idx].role,
                  age: existingChars[idx].age,
                  job: existingChars[idx].job,
                  traits: existingChars[idx].traits,
                  description: existingChars[idx].description
                });
                existingChars[idx].physicalFeatures = physicalDesc;
              } catch (err) {
                console.warn(`Failed to generate description for ${nc.name}:`, err);
              }
            }
          } else {
            // Add tier to new character based on their role
            const newChar = { ...nc, tier: characterTier };
            existingChars.push(newChar);
            
            // Auto-generate physical description for new core tier characters if missing
            if (isCoreTier && (!nc.physicalFeatures || nc.physicalFeatures.length < 20)) {
              try {
                setProcessingStatus(`Generating physical description for ${nc.name}...`);
                const physicalDesc = await generateCharacterPhysicalDescription({
                  name: nc.name,
                  role: nc.role,
                  age: nc.age,
                  job: nc.job,
                  traits: nc.traits,
                  description: nc.description
                });
                const charIdx = existingChars.findIndex(c => c.name === nc.name);
                if (charIdx >= 0) {
                  existingChars[charIdx].physicalFeatures = physicalDesc;
                }
              } catch (err) {
                console.warn(`Failed to generate description for ${nc.name}:`, err);
              }
            }
          }
        }
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
    } else if (type === 'bestiary') {
      setCurrentView(ViewType.CODEX);
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
    // Wait for Auth0 to determine auth status
    if (isAuthLoading) return;

    const init = async () => {
      try {
        console.log(`[Init] Auth0 loaded: ${!isAuthLoading}, Authenticated: ${isAuthenticated}, UserId: ${auth0User?.sub}`);
        
        // Configure storage first
        console.log(`[Init] Configuring storage. Cloud enabled: ${isAuthenticated === true}`);
        setCloudStorageEnabled(isAuthenticated === true, fetchWithAuth);

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
  }, [checkApiKey, isAuthenticated, isAuthLoading, fetchWithAuth]); // Re-run when auth state or Auth0 status changes

  // Auto-generate bestiary entries for creatures when project loads
  // (Disabled - BestiaryBrowserView has been removed)

  useEffect(() => {
    if (!projectData) return;
    
    const now = new Date();
    const lastBackupTime = projectData.backupSettings?.lastBackupTime;
    
    let shouldBackup = false;
    
    if (!lastBackupTime) {
      // First time backup
      shouldBackup = true;
    } else {
      const lastDate = new Date(lastBackupTime);
      // Check if it's a different day
      if (now.getDate() !== lastDate.getDate() || 
          now.getMonth() !== lastDate.getMonth() || 
          now.getFullYear() !== lastDate.getFullYear()) {
        shouldBackup = true;
      }
    }

    if (shouldBackup) {
      console.log(`Daily backup trigger active. Preparing snapshot...`);
      
      const backupId = generateId();
      const totalWords = (projectData.chapters || []).reduce((acc, c) => acc + (c.wordCount || 0), 0);
      
      const newBackup: BackupStatus = {
        id: backupId,
        timestamp: now.getTime(),
        wordCount: totalWords,
        hash: projectData.integrityHash || '',
        status: 'pending'
      };

      // Update backup settings in project data
      const updatedSettings: BackupSettings = {
        ...(projectData.backupSettings || { frequency: 'daily' }),
        lastBackupTime: now.getTime()
      };

      // Pessimistic update to project data
      const updatedBackups = [...(projectData.backups || []), newBackup];
      const directUpdate = { ...projectData, backups: updatedBackups, backupSettings: updatedSettings };
      
      setProjectData(directUpdate);
      saveProjectData(directUpdate);

      // Automated backup logic
      const doFetch = (isAuthenticated && fetchWithAuth) ? fetchWithAuth : fetch.bind(window);
      
      doFetch('/api/backup-email', {
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
            doFetch(`/api/verify-backup/${data.resendId}`)
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
  }, [projectData?.id, projectData?.backupSettings?.lastBackupTime, fetchWithAuth, isAuthenticated]);
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
  
  const handleScanContinuity = async () => {
    if (!projectData) return;
    setIsAnalyzing(true);
    addTask('Continuity Audit');
    try {
      const manuscript = (projectData.chapters || []).map(c => c.content).join('\n\n');
      const errors = await scanForContinuityErrors(manuscript, projectData);
      await updateProjectData({ continuityErrors: errors });
    } catch (e) {
      handleError(e);
    } finally {
      setIsAnalyzing(false);
      removeTask('Continuity Audit');
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

    let finalTitle = title || 'Sample Project';
    let finalShortName = shortName || (useSample ? 'Sample' : '');

    // If it's a sample project or empty title, handle incremental naming
    if (useSample || !title) {
      const existingTitles = projectsMetadata.map(p => p.title);
      if (existingTitles.includes(finalTitle)) {
        let counter = 2;
        while (existingTitles.includes(`${finalTitle} ${counter}`)) {
          counter++;
        }
        finalTitle = `${finalTitle} ${counter}`;
        if (finalShortName) {
          finalShortName = `${finalShortName} ${counter}`;
        }
      }
    }

    let newProject: ProjectData = {
      id, title: finalTitle, shortName: finalShortName, author, summary: '', lastModified: Date.now(), characters: [], locations: [], timeline: [], notes: [], relationships: [], themes: [], calendars: [], artifacts: [], lore: [], chapters: [], sources: [],
      lastProcessedManuscriptSha: '', lastProcessedPromptSha: '',
      wordCount: 0,
      charCount: 0,
      entities: [],
      manuscript: '',
      history_diff: '',
      assets: []
      };
    if (useSample) {
      const ch1Content = `<!-- #CHAPTER_1 -->\n# Chapter 1: The Weight of Ink\n\nThe Great Archive was always cold. Arthur Penhaligon pulled his cloak tighter as he navigated the towering shelves of the Forbidden Wing.`;
      const ch2Content = `<!-- #CHAPTER_2 -->\n# Chapter 2: Shadows of the Spire\n\nThe Obsidian Spire pierced the gray clouds like a needle of dark glass.`;
      const ch3Content = `<!-- #CHAPTER_3 -->\n# Chapter 3: The Echo in the Wards\n\nElara Vane found Arthur Penhaligon exactly where she expected.`;

      const filler = "\n\nMemories are the threads of reality. In the Citadel, those threads were pulled and twisted until the pattern was lost.";
      const fullManuscript = `${ch1Content}\n\n${ch2Content}\n\n${ch3Content}${filler}`;
      const wordCountValue = fullManuscript.trim().split(/\s+/).length;

      const characters = [
        { id: 'CH-ARTHUR', name: 'Arthur Penhaligon', role: 'Protagonist', job: 'Junior Archivist', description: 'A curious and determined young man with an uncanny ability to read ancient scripts.', traits: ['Curious', 'Determined'], physicalFeatures: 'Lean build, dark hair with premature silver streaks, pale from years in archives. Average height around 5\'10", sharp observant eyes that miss nothing.', style: 'Simple archival robes, ink-stained fingers, practical leather boots worn from navigating endless shelves.', strengths: 'Exceptional memory, pattern recognition, ability to decipher ancient texts, quick thinking under pressure.', weaknesses: 'Physically frail, inexperienced in combat, trusts too easily, struggles with social interaction outside academic circles.', age: 'Early 20s', source: 'manual' as const },
        { id: 'CH-VAELEN', name: 'Admin Vaelen', role: 'Antagonist', job: 'High Architect', description: 'The cold, calculating ruler of the Citadel.', traits: ['Cold', 'Calculating', 'Ruthless'], physicalFeatures: 'Tall and imposing, silver-haired with aristocratic features. Sharp jawline, piercing gray eyes that seem to look through people. Well-maintained despite advanced age, suggesting access to memory enhancements.', style: 'Immaculate obsidian robes trimmed with gold, rare artifacts adorning his wrists. Every appearance is choreographed for maximum psychological impact.', strengths: 'Masterful political strategist, charismatic orator, centuries of experience (through stolen memories), ability to control information.', weaknesses: 'Disconnected from ordinary people\'s suffering, overconfident in his power, fears the truth more than weapons, becoming paranoid with age.', age: 'Appeared 60+, actual age unknown', source: 'manual' as const },
        { id: 'CH-ELARA', name: 'Elara Vane', role: 'Ally', job: 'Information Broker', description: 'A resourceful survivor from the Lower Wards.', traits: ['Resourceful', 'Cynical', 'Brave'], physicalFeatures: 'Athletic build from years of navigating the Wards. Dark skin, shaved head revealing intricate memory tattoos along her scalp. Scars from street fights. Sharp-featured with intense dark eyes, stands about 5\'8".', style: 'Practical streetwear—patched cargo pants, layered tunics, heavy boots. Wears stolen jewelry from black market deals. Favors dark colors for moving undetected in shadows.', strengths: 'Street-smart, excellent at gathering intelligence, skilled negotiator, physically capable fighter, understands Lower Wards politics.', weaknesses: 'Limited formal education, struggles with trust despite outward confidence, carries guilt from past moral compromises.', age: 'Mid-30s', source: 'manual' as const },
        { id: 'CH-SILAS', name: 'Master Silas', role: 'Mentor', job: 'Senior Archivist', description: 'A wise and secretive mentor who knows the truth.', traits: ['Wise', 'Secretive', 'Patient'], physicalFeatures: 'Elderly and stooped from decades hunched over manuscripts. White hair and beard, weathered face lined with worry. Soft brown eyes that carry the weight of hidden knowledge. Moves slowly but with purpose, around 5\'6" in current state.', style: 'Well-worn archival robes with hidden pockets for smuggled documents. Spectacles on a chain around his neck. Carries a wooden cane carved with ancient symbols.', strengths: 'Encyclopedic knowledge of archives, master code-breaker, strategic thinker, commands respect from the archival community.', weaknesses: 'Age and declining health, confined to the Archive (Vaelen\'s spy network), unable to act directly without suspicion, haunted by past regrets.', age: '70+', source: 'manual' as const },
        { id: 'CH-KESS', name: 'Kessandra Mohr', role: 'Ally', job: 'Memory Thief', description: 'A skilled operative who steals valuable memories for the black market. Torn between survival and morality.', traits: ['Cunning', 'Pragmatic', 'Conflicted'], physicalFeatures: 'Lithe and graceful with an ethereal quality that makes people forget her presence. Pale skin with striking violet eyes—an unusual genetic anomaly. Shoulder-length white-blonde hair often concealed under hoods. Moves like smoke, around 5\'5".', style: 'Dark, form-fitting clothing designed for stealth. Multiple hidden compartments for memory vials. Wears silver rings—each one tied to a past "job" she\'s completed. A silver mask worn during operations.', strengths: 'Master thief, exceptional memory palace technique, can navigate locked vaults, understanding of black market networks, enhanced sensory perception.', weaknesses: 'Increasingly haunted by ethical concerns, difficulty forming stable relationships, dependent on stimulants to maintain focus, slowly becoming emotionally numb from repeated memory theft work.', age: 'Late 20s', source: 'manual' as const }
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

      const lore: LoreEntry[] = [
        { id: 'LORE-MNEMONIC-PLAGUE', term: 'The Mnemonic Plague', definition: 'Three centuries ago, a catastrophic event wiped the collective memory of civilization. Official records claim it was a natural disaster. In reality, it was engineered by the First High Architects as a tool to reshape society and eliminate dissent.', tags: ['History', 'Mystery'], category: 'Event', source: 'manual' as const },
        { id: 'LORE-ECHO-WALKERS', term: 'Echo-Walkers and the Void', definition: 'Echo-Walkers are individuals capable of entering others\' minds and experiencing their memories. Those untrained risk the Void—a state of complete memory loss that erases all sense of identity. The Chronos Key and ancient stabilization techniques can prevent this fate.', tags: ['Magic System', 'Danger'], category: 'Abilities', source: 'manual' as const },
        { id: 'LORE-THE-WEAVER', term: 'The Great Weaver', definition: 'A figure of legend from before the Plague who supposedly spun the first memory strings at the dawn of time. May have been the architect of the original society\'s memory system. Some believe The Weaver still exists in spectral form.', tags: ['Mythology', 'Speculation'], category: 'Mythology', source: 'manual' as const },
        { id: 'LORE-MNEMOS-CURRENCY', term: 'Mnemos: Memory as Currency', definition: 'In the post-Plague world, memories became the primary currency. Extracted memories of the elite are stored in vials and traded. Those with more memory strength (Mnemos) have greater social status and access to resources.', tags: ['Economy', 'Society'], category: 'Economy', source: 'manual' as const },
        { id: 'LORE-FIRST-AGE', term: 'The First Age Before Memory', definition: 'Largely lost to the Plague, the First Age was a world where civilization depended on a unified memory system. Records suggest advanced technology, complex social structures, and knowledge now considered impossible. Only fragments remain in the Deep Vaults.', tags: ['Lost Civilization', 'History'], category: 'History', source: 'manual' as const }
      ];

      const timeline: TimelineEvent[] = [
        { id: 'TL-FIRST-AGE', date: '0', title: 'The First Age', description: 'Civilization at its height. Memory system operates perfectly. The Weaver constructs the foundational memory architecture.', charactersInvolved: ['The Weaver'], location: 'The World' },
        { id: 'TL-THE-PLAGUE', date: '0-300YBP', title: 'The Mnemonic Plague', description: 'A catastrophic event wipes the collective memory. Official history begins here. Survivors rebuild, creating the Citadel under the rule of the First High Architects.', charactersInvolved: ['The First Architects'], location: 'Global' },
        { id: 'TL-CITADEL-FOUNDED', date: '300YBP', title: 'Founding of the Citadel', description: 'The Great Archive is constructed. Memory becomes the foundation of society. The tiered class system emerges based on memory strength.', charactersInvolved: ['First High Architects'], location: 'Citadel' },
        { id: 'TL-GREAT-FIRE', date: '10YBP', title: 'The West Wing Burning', description: 'Vaelen orders the destruction of the West Wing of the Archive to eliminate knowledge of dissent and rebellion. Thousands of memories are lost forever.', charactersInvolved: ['Admin Vaelen'], location: 'The Great Archive' },
        { id: 'TL-PRESENT-DAY', date: 'Now', title: 'The Echo Awakens', description: 'Arthur discovers the Chronos Key. The Echo manifests. The truth of the Founding begins to unravel. The Citadel\'s carefully constructed reality faces its greatest threat.', charactersInvolved: ['Arthur Penhaligon', 'The Echo'], location: 'The Citadel' }
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
        title: finalTitle,
        shortName: finalShortName,
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
    if (isAuthenticated) {
      await fetchWithAuth('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      }).catch(err => console.error("Cloud project creation failed", err));
    }
    setProjectData(newProject);
    await refreshMetadata();
    setCurrentView(ViewType.DASHBOARD);
  };

  const mergeAnalysisIntoProject = useCallback(async (analysis: any, content?: string) => {
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
        currentUser?.name || 'Unknown Author',
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
    if (!isLoaded || isAuthLoading) return <div className="h-full flex items-center justify-center text-primary animate-pulse font-bold uppercase tracking-widest">Initialising Core Engines...</div>;

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
          appSettings={appSettings}
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
        return projectData ? <PlotSystemView currentView={currentView} onChangeView={setCurrentView} data={projectData} onUpdateCalendar={(c) => updateProjectData({ calendars: projectData.calendars.map(cal => cal.id === c.id ? c : cal) })} onSetActiveCalendar={(id) => updateProjectData({ activeCalendarId: id })} onLinkClick={handleLinkClick} onAddTimelineEvent={(e) => updateProjectData({ timeline: [...projectData.timeline, e] })} onUpdateTimelineEvent={(e) => updateProjectData({ timeline: projectData.timeline.map(ev => ev.id === e.id ? e : ev) })} onAnalyzePlot={() => {}} onExtractSoftAnchors={handleExtractSoftAnchors} onScanContinuity={handleScanContinuity} onUpdateProject={updateProjectData} isAnalyzing={isAnalyzing} /> : null;

      case ViewType.MAP:
      case ViewType.ATLAS2:
      case ViewType.LOCATIONS:
      case ViewType.ENCYCLOPEDIA:
      case ViewType.INVENTORY:
      case ViewType.DICTIONARY:
      case ViewType.GALLERY:
        if (!projectData) return null;
        if (currentView === ViewType.ATLAS2) {
          return <Atlas2 
            currentView={currentView} 
            onChangeView={setCurrentView} 
            data={projectData} 
            onUpdateLocation={(l) => updateProjectData({ locations: projectData.locations.map(loc => loc.id === l.id ? l : loc) })}
            onUpdateCharacter={(c) => updateProjectData({ characters: projectData.characters.map(char => char.id === c.id ? c : char) })}
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
          />;
        }
        return <WorldSystemView
          currentView={currentView}
          onChangeView={setCurrentView}
          data={projectData}          onUpdateLocation={(l) => updateProjectData({ locations: projectData.locations.map(loc => loc.id === l.id ? l : loc) })}
          onUpdateCharacter={(c) => updateProjectData({ characters: projectData.characters.map(char => char.id === c.id ? c : char) })}
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
        />;

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

      case ViewType.DYNAMIC_FORGE:
        return projectData ? <DynamicForgeView
          data={projectData}
          onUpdateProject={updateProjectData}
        /> : null;

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

      case ViewType.CODEX:
        return projectData ? <CodexView projectData={projectData} onLinkClick={handleLinkClick} onUpdateProject={updateProjectData} /> : <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-950 font-serif italic text-lg text-center p-12">Initialize a story world to unlock Codex.</div>;

      case ViewType.RESEARCH:
        return projectData ? <ResearchHubView projectData={projectData} onUpdateProject={updateProjectData} /> : <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-950 font-serif italic text-lg text-center p-12">Initialize a story world to unlock Research Hub.</div>;

      case ViewType.SEMANTIC_EDITOR:
        return projectData ? <SemanticEditorView projectData={projectData} onUpdateProject={updateProjectData} /> : <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-950 font-serif italic text-lg text-center p-12">Initialize a story world to unlock Semantic Engine.</div>;

      /* case ViewType.STORY_ARCHITECT:
        return <StoryArchitectView projectsMetadata={projectsMetadata} onSelectProject={async (id) => { const d = await loadProjectById(id); if (d) { setProjectData(d); await refreshMetadata(); setCurrentView(ViewType.DASHBOARD); } }} onUpdateProject={updateProjectData} currentUser={currentUser} />; */

      default: 
        return <div className="h-full flex items-center justify-center text-slate-400">View not found.</div>;
    }
  }, [isLoaded, isAuthLoading, currentView, projectData, projectsMetadata, globalNotes, isAnalyzing, isGeneratingCover, isExtractingThemes, isExtractingRelationships, isUpdatingProcessed, currentUser, appPrompts, globalResources, activeTasks, updateProjectData, currentMapParentId, refreshMetadata, handleDeleteProject, handleUploadProject, handleCreateProject, handleGenerateCover, handleDoubleProcessNote, handleError, handleQuickUpdate]);
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
        isGuest={isGuest}
      />

      <main className="flex-1 h-full relative overflow-hidden flex flex-col">
        {/* Mobile Fixed Binding Header */}
        <div className={`lg:hidden z-[2000] fixed top-0 left-0 right-0 transition-all duration-500 ${currentView === ViewType.NOTEPAD ? 'bg-black h-[calc(env(safe-area-inset-top)+3.5rem)] shadow-2xl' : 'bg-slate-50 dark:bg-slate-950 h-[calc(env(safe-area-inset-top)+3.5rem)]'}`}>
          <div className="flex items-center justify-between px-6 pt-[env(safe-area-inset-top)] h-full">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsMobileSidebarOpen(true)}
                className={`p-2 rounded-xl transition-all ${currentView === ViewType.NOTEPAD ? 'text-white hover:bg-white/10' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <Menu size={20} />
              </button>
              <div className="flex flex-col">
                <span className={`text-[10px] font-black uppercase tracking-widest leading-none ${currentView === ViewType.NOTEPAD ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  {projectData?.shortName || 'Plothole'}
                </span>
                <span className={`text-xs font-black uppercase tracking-tight ${currentView === ViewType.NOTEPAD ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                  {currentView}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentView(ViewType.ADMIN)}
                className={`p-2 rounded-xl transition-all ${currentView === ViewType.NOTEPAD ? 'text-white hover:bg-white/10' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <Search size={20} />
              </button>
              <button 
                onClick={() => setIsAiOpen(true)}
                className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
              >
                <Sparkles size={18} />
              </button>
            </div>
          </div>
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
              onExport={handleExportVault}
              onExportVault={handleExportVault}
              onRestoreHistory={() => {}}
              onAnalyzeText={() => {}}
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
                usage: 'Advanced fuzzy-search logic for the Entity Explorer.',
                status: 'Actively Maintained',
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
      ) : (!isAuthenticated && !isGuest && !isAuthLoading) ? (
        <SignInPage onGuestAccess={() => setIsGuest(true)} />
      ) : (
        renderAppContent()
      )}
    </>
  );
};

export default App;
