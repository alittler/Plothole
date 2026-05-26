// FORCE REFRESH - PLOTHOLE V2
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import JSZip from 'jszip';
import {
  ProjectData, ProjectMetadata, User, ViewType, Note,
  AppPrompts, AppSettings, ToolboxLink, Artifact, LoreEntry, TimelineEvent, Idea, ChangeLogEntry, Relationship, SemanticDocument, ProseDocument, Chapter, Character, Location
} from './types';
import {
  getAllProjectsMetadata, loadProjectById, saveProjectData,
  deleteProject, getAllGlobalNotes, saveGlobalNote, saveAllGlobalNotes,
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
import { initGitForProject } from './services/versioningService';
import { Commit, BackupStatus } from './types';
import { safeJsonParse, safeResponseJson } from './utils/jsonUtils';
import { EditModalProvider, useEditModal } from './contexts/EditModalContext';
import { DynamicEditModal } from './components/ui/DynamicEditModal';
import { DEFAULT_APP_PROMPTS, DEFAULT_APP_SETTINGS } from './constants/defaults';
import { getSampleProjectData } from './constants/sampleProject';
import { LicenseModal } from './components/Modals/LicenseModal';

import dynamic from 'next/dynamic';

// Components
import { Sidebar } from './components/Layout/Sidebar';
import { BottomNav } from './components/Layout/BottomNav';

const BookshelfView = dynamic(() => import('./components/Views/BookshelfView').then(mod => mod.BookshelfView), { ssr: false });
const DashboardView = dynamic(() => import('./components/Views/DashboardView').then(mod => mod.DashboardView), { ssr: false });
const ResearchHubView = dynamic(() => import('./components/Views/ResearchHubView').then(mod => mod.ResearchHubView), { ssr: false });
const WorldSystemView = dynamic(() => import('./components/Views/WorldSystemView').then(mod => mod.WorldSystemView), { ssr: false });
const PlotHubView = dynamic(() => import('./components/Views/PlotHubView').then(mod => mod.PlotHubView), { ssr: false });
const CharactersView = dynamic(() => import('./components/Views/CharactersView').then(mod => mod.CharactersView), { ssr: false });
const SettingsView = dynamic(() => import('./components/Views/SettingsView').then(mod => mod.SettingsView), { ssr: false });
const AdminView = dynamic(() => import('./components/Views/AdminView').then(mod => mod.AdminView), { ssr: false });
const ToolboxView = dynamic(() => import('./components/Views/ToolboxView').then(mod => mod.ToolboxView), { ssr: false });
const CodexHubView = dynamic(() => import('./components/Views/CodexHubView').then(mod => mod.CodexHubView), { ssr: false });
const NarrativeArchitectView = dynamic(() => import('./components/Views/NarrativeArchitectView').then(mod => mod.NarrativeArchitectView), { ssr: false });
const OracleFloatingButton = dynamic(() => import('./components/ui/OracleFloatingButton').then(mod => mod.OracleFloatingButton), { ssr: false });

import { useRouter, usePathname } from 'next/navigation';

// import { StoryArchitectView } from './components/Views/StoryArchitectView';
import { ActiveArchitect } from './components/ui/ActiveArchitect';
import { UploadProminentModal } from './components/ui/UploadProminentModal';
import { Modal } from './components/ui/Modal';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X, Menu, LogOut, Shield, FileText, Database, PenTool, Trash2, Loader2, Search } from 'lucide-react';
import { useAuth0 } from '@auth0/auth0-react';
import { SignInPage } from './components/Auth/SignInPage';

const DEMO_USER: User = {
  id: 'user-1',
  name: 'Anonymous Writer',
  email: 'guest@plothole.local',
  role: 'admin',
  lastActive: Date.now(),
  themeColor: '59 130 246',
  preferences: { 
    themeMode: 'light', 
    fontSize: 'md', 
    fontFamily: 'sans', 
    landingPage: ViewType.BOOKSHELF, 
    colorfulIcons: true, 
    semanticSearchEnabled: false,
    aiVerbosity: 'balanced'
  }
};

// Auto-populate Data Catalog from project entities
function populateDataCatalog(data: ProjectData): ProjectData {
  if (!data.id) return data;

  // Ensure arrays are initialized to prevent "undefined" errors
  data.characters = data.characters || [];
  data.locations = data.locations || [];
  data.timeline = data.timeline || [];
  data.artifacts = data.artifacts || [];
  data.notes = data.notes || [];
  data.themes = data.themes || [];

  // If catalogs already exist, don't overwrite
  if (data.catalogs && data.catalogs.length > 0) {
    return data;
  }

  const catalogs = [];

  // Create Character catalog
  if (data.characters && data.characters.length > 0) {
    catalogs.push({
      id: `catalog-characters-${data.id}`,
      projectId: data.id,
      name: 'Characters',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      entities: data.characters.map(c => ({
        id: c.id || generateId(8),
        type: 'Character',
        name: c.name || 'Unknown',
        description: c.description || '',
        tier: c.tier || 3,
        ...c // Preserve all original fields
      }))
    });
  }

  // Create Locations catalog
  if (data.locations && data.locations.length > 0) {
    catalogs.push({
      id: `catalog-locations-${data.id}`,
      projectId: data.id,
      name: 'Locations',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      entities: data.locations.map(l => ({
        id: l.id || generateId(8),
        type: 'Location',
        name: l.name || 'Unknown',
        description: l.description || '',
        tier: 2,
        ...l
      }))
    });
  }

  // Create Timeline/Events catalog
  if (data.timeline && data.timeline.length > 0) {
    catalogs.push({
      id: `catalog-timeline-${data.id}`,
      projectId: data.id,
      name: 'Timeline',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      entities: data.timeline.map(t => ({
        id: t.id || generateId(8),
        type: 'Event',
        name: t.title || 'Unknown Event',
        description: t.description || '',
        tier: 2,
        date: t.date,
        ...t
      }))
    });
  }

  // Create Artifacts catalog
  if (data.artifacts && data.artifacts.length > 0) {
    catalogs.push({
      id: `catalog-artifacts-${data.id}`,
      projectId: data.id,
      name: 'Artifacts',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      entities: data.artifacts.map(a => ({
        id: a.id || generateId(8),
        type: 'Artifact',
        name: a.name || 'Unknown',
        description: a.description || '',
        tier: 2,
        ...a
      }))
    });
  }

  // Create Lore catalog
  if (data.lore && data.lore.length > 0) {
    catalogs.push({
      id: `catalog-lore-${data.id}`,
      projectId: data.id,
      name: 'Lore & Worldbuilding',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      entities: data.lore.map(l => ({
        id: l.id || generateId(8),
        type: 'Lore',
        name: l.term || 'Unknown',
        description: l.definition || '',
        tier: 2,
        ...l
      }))
    });
  }

  // Create Themes catalog
  if (data.themes && data.themes.length > 0) {
    catalogs.push({
      id: `catalog-themes-${data.id}`,
      projectId: data.id,
      name: 'Themes',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      entities: data.themes.map(t => ({
        id: Math.random().toString(36).substring(7),
        type: 'Theme',
        name: t,
        description: '',
        tier: 2
      }))
    });
  }

  return {
    ...data,
    catalogs: catalogs.length > 0 ? catalogs : data.catalogs
  };
}

const App: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user: auth0User, isAuthenticated, isLoading: isAuthLoading, getAccessTokenSilently } = useAuth0();
  const hasAutoLoaded = useRef(false);


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
  const [appPrompts, setAppPromptsState] = useState<AppPrompts>(DEFAULT_APP_PROMPTS);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

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

      // Fetch username from database
      const fetchUsername = async () => {
        try {
          const token = await getAccessTokenSilently();
          const resp = await fetch('/api/user/username', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data.username) {
              setCurrentUser(prev => ({
                ...prev,
                username: data.username
              }));
            }
          }
        } catch (err) {
          console.error('Failed to fetch username:', err);
        }
      };
      fetchUsername();
    }
  }, [isAuthLoading, auth0User, appSettings.adminEmails, getAccessTokenSilently]);

  const currentView = (decodeURIComponent(pathname?.slice(1) || '') as ViewType) || ViewType.BOOKSHELF;
  const [selectedCreatureId, setSelectedCreatureId] = useState<number | null>(null);
  const setCurrentView = (view: ViewType, params?: { creatureId?: number }) => {
    if (params?.creatureId !== undefined) {
      setSelectedCreatureId(params.creatureId);
    }
    router.push(`/${view}`);
  };

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAdminNoteOpen, setIsAdminNoteOpen] = useState(false);
  const [adminNoteDraft, setAdminNoteDraft] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('plothole_admin_note_draft') || '';
    }
    return '';
  });

  useEffect(() => {
    localStorage.setItem('plothole_admin_note_draft', adminNoteDraft);
  }, [adminNoteDraft]);

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
  const [uploadingFileName, setUploadingFileName] = useState<string | undefined>(undefined);
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
        const updated = { ...projectData, title, author, shortName };
        setProjectData(updated);
        await saveProjectData(updated);
      } else {
        // For inactive projects, we need to load, update, and save
        const targetProject = await loadProjectById(id);
        if (targetProject) {
          const updated = { ...targetProject, title, author, shortName };
          await saveProjectData(updated);
        }
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
      router.push(`/${ViewType.CODEX_HUB}?tab=Bestiary`);
    } else if (type === 'dashboard') {
      setCurrentView(ViewType.DASHBOARD);
    }
  }, [router]);

  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('Spooling Engines');

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
  const [isExtractingThemes, setIsExtractingThemes] = useState(false);
  const [isExtractingRelationships, setIsExtractingRelationships] = useState(false);

  const handleExtractRelationships = async () => {
    if (!projectData) return;
    setIsExtractingRelationships(true);
    addTask('Analyzing Relationships');
    try {
      const chars = projectData.characters || [];
      if (chars.length < 2) {
        throw new Error('Need at least 2 characters to extract relationships');
      }

      // Simple relationship analysis: find character co-mentions in text
      const text = (projectData.chapters || []).map(c => c.content).join('\n\n') + '\n\n' + (projectData.notes || []).map(n => n.content).join('\n\n');
      
      const rels: any[] = [];
      
      if (text.trim().length > 0) {
        // Find character pairs that appear together in paragraphs
        const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
        
        for (const para of paragraphs) {
          const lowerPara = para.toLowerCase();
          const mentionedChars = chars.filter(c => lowerPara.includes(c.name.toLowerCase()));
          
          for (let i = 0; i < mentionedChars.length; i++) {
            for (let j = i + 1; j < mentionedChars.length; j++) {
              const id1 = mentionedChars[i].id;
              const id2 = mentionedChars[j].id;
              const existing = rels.find(r => 
                (r.sourceId === id1 && r.targetId === id2) ||
                (r.sourceId === id2 && r.targetId === id1)
              );
              if (!existing) {
                rels.push({
                  sourceId: id1,
                  targetId: id2,
                  type: 'connected',
                  notes: 'Mentioned together in manuscript'
                });
              }
            }
          }
        }
      }
      
      // If no text found, create relationships between first few characters as example
      if (rels.length === 0 && chars.length >= 2) {
        for (let i = 0; i < Math.min(chars.length - 1, 3); i++) {
          rels.push({
            sourceId: chars[i].id,
            targetId: chars[i + 1].id,
            type: 'connected',
            notes: 'Sample relationship'
          });
        }
      }
      
      if (rels.length > 0) {
        const existing = projectData.relationships || [];
        const newRels = rels.filter(nr => !existing.some(er => 
          er.sourceId === nr.sourceId && er.targetId === nr.targetId && er.type === nr.type
        ));
        
        if (newRels.length > 0) {
          await updateProjectData({ relationships: [...existing, ...newRels] });
        }
      }
    } catch (e) { 
      handleError(e);
      throw e;
    } finally {
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

  const handleError = useCallback((err: any) => {
    console.error("App Error:", err);
  }, []);

  useEffect(() => {
    document.title = appSettings.appName;
  }, [appSettings.appName]);

  useEffect(() => {
    // Wait for Auth0 to determine auth status
    if (isAuthLoading) return;

    const init = async () => {
      setIsLoaded(false);
      setLoadingProgress(5);
      setLoadingStage('Authorizing Storage Bridge');
      try {
        console.log(`[Init] Auth0 loaded: ${!isAuthLoading}, Authenticated: ${isAuthenticated}, UserId: ${auth0User?.sub}`);

        // Configure storage first
        console.log(`[Init] Configuring storage. Cloud enabled: ${isAuthenticated === true}`);
        setCloudStorageEnabled(isAuthenticated === true, fetchWithAuth);
        
        setLoadingProgress(20);
        setLoadingStage('Synchronizing Metadata');

        console.log(`[Init] Fetching metadata...`);
        // Only await the absolute essentials to clear the splash screen
        const meta = await getAllProjectsMetadata();

        setLoadingProgress(60);
        setLoadingStage('Reconciling Project States');

        console.log(`[Init] Received ${meta?.length || 0} projects`);
        setProjectsMetadata(meta || []);

        // Load non-critical data in the background
        getAllGlobalNotes().then(notes => setGlobalNotes(notes));
        getAllGlobalResources().then(resources => setGlobalResources(resources));
        getAppPrompts().then(prompts => {
          if (prompts) setAppPromptsState(prev => ({ ...prev, ...prompts }));
        });
        getAppSettings().then(async settings => {
          if (settings) {
            const finalSettings = { ...settings };
            if (!finalSettings.appName || finalSettings.appName.includes('Steno') || finalSettings.appName === 'Plothole AI') {
              finalSettings.appName = 'Plothole — Your Story, Decoded';
              await saveAppSettings(finalSettings as AppSettings);
            }
            setAppSettings(prev => ({ ...prev, ...finalSettings }));
          }
        });

        // Auto-load last edited project
        if (meta && meta.length > 0 && !projectData && !hasAutoLoaded.current) {
          setLoadingProgress(85);
          setLoadingStage('Spooling Last Manuscript');
          const sortedMeta = [...meta].sort((a, b) => b.lastModified - a.lastModified);
          const lastProject = await loadProjectById(sortedMeta[0].id);
          if (lastProject) {
            setProjectData(populateDataCatalog(lastProject));
            // Only auto-switch to dashboard if we're on the landing page/initial load
            // and NOT if the user explicitly navigated to the Bookshelf
            if (!pathname || pathname === '/') {
              setCurrentView(ViewType.DASHBOARD);
            }
          }
          hasAutoLoaded.current = true;
        }

        setLoadingProgress(100);
        setLoadingStage('Ready');
        setTimeout(() => setIsLoaded(true), 200);
      } catch (err) {
        console.error("Initialization failed", err);
        setIsLoaded(true);
      }
    };
    init();
  }, [isAuthenticated, isAuthLoading, fetchWithAuth]); // Re-run when auth state or Auth0 status changes

  // Auto-generate bestiary entries for creatures when project loads
  // (Disabled - BestiaryBrowserView has been removed)

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
        .then(res => safeResponseJson(res))
        .then(data => {
          if (!data || !data.success) {
            console.warn('Backup email failed or returned invalid response');
            return;
          }
          // Poll for verification
          setTimeout(() => {
            doFetch(`/api/verify-backup/${data.resendId}`)
              .then(res => safeResponseJson(res))
              .then(verifyData => {
                if (verifyData && verifyData.status === 'delivered') {
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
              })
              .catch(err => console.error('Verify backup failed:', err));
          }, 5000);
        })
        .catch(err => console.error("Backup failed", err));
    }
  }, [projectData, lastBackupMilestone, fetchWithAuth, isAuthenticated]);
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
      id, title: finalTitle, shortName: finalShortName, author, summary: '', lastModified: Date.now(), characters: [], locations: [], timeline: [], notes: [], relationships: [], themes: [], artifacts: [], lore: [], chapters: [], sources: [],
      lastProcessedManuscriptSha: '', lastProcessedPromptSha: '',
      wordCount: 0,
      charCount: 0,
      entities: [],
      manuscript: '',
      history_diff: '',
      assets: []
    };

    if (useSample) {
      newProject = getSampleProjectData(id, finalTitle, author, finalShortName);
    }

    // Ensure cloud storage is enabled before saving
    setCloudStorageEnabled(isAuthenticated === true, fetchWithAuth);
    await saveProjectData(newProject);
    const projectWithCatalog = populateDataCatalog(newProject);
    setProjectData(projectWithCatalog);
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
  }, [projectData, updateProjectData]);

  const handleDoubleProcessNote = async (text: string) => {
    addTask('double-process');
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
    try {
      const manuscriptText = projectData.chapters?.map(c => c.content).join('\n') || '';
      if (!manuscriptText) throw new Error("No manuscript content to analyze.");

      // Simple timeline extraction: find sentences with temporal markers
      const timeMarkers = ['then', 'later', 'before', 'after', 'when', 'while', 'during', 'finally', 'eventually', 'suddenly', 'once'];
      const sentences = manuscriptText.split(/[.!?]+/).filter(s => s.trim().length > 20);
      
      const newAnchors: any[] = [];
      for (const sentence of sentences) {
        const hasTimeMarker = timeMarkers.some(marker => sentence.toLowerCase().includes(marker));
        if (hasTimeMarker) {
          newAnchors.push({
            title: sentence.trim().substring(0, 80),
            description: sentence.trim(),
            date: 'Unknown Date',
            isSoftAnchor: true,
            charactersInvolved: []
          });
        }
        if (newAnchors.length >= 5) break; // Limit to 5 new events
      }

      if (newAnchors && newAnchors.length > 0) {
        const generatedEvents = newAnchors.map(a => ({
          id: generateId(),
          date: a.date || 'Unknown Date',
          title: a.title,
          description: a.description,
          isSoftAnchor: true,
          charactersInvolved: [],
          location: '',
          source: 'ai' as const
        }));
        await updateProjectData({ timeline: [...projectData.timeline, ...generatedEvents] });
      }
    } catch (e) {
      handleError(e);
      throw e;
    } finally {
      setIsAnalyzing(false);
      removeTask('Syncing Timeline (Soft Anchors)');
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

  // Analyze manuscript using AI to extract characters, locations, and events
  const analyzeManuscript = async (manuscriptText: string): Promise<{
    characters: Character[];
    locations: Location[];
    events: TimelineEvent[];
    worldType: string;
  }> => {
    try {
      setProcessingStatus("Analyzing manuscript with AI...");
      console.log('[Analyze] Starting manuscript analysis');

      // Build combined prompt from enabled puzzle pieces
      let customPrompt = '';
      if (appPrompts?.extractionPuzzle && appPrompts.extractionPuzzle.length > 0) {
        const enabledPieces = appPrompts.extractionPuzzle.filter(p => p.enabled);
        
        // Extract just the instructions (remove "Return as:" lines)
        const instructions = enabledPieces.map(p => {
          const lines = p.prompt.split('\n');
          const withoutReturn = lines.filter(line => !line.includes('Return as:')).join('\n').trim();
          return `[${p.label.toUpperCase()}]\n${withoutReturn}`;
        }).join('\n\n');
        
        // Build final prompt with unified return format
        customPrompt = `${instructions}

IMPORTANT: Extract and return the data as a SINGLE JSON object with these keys:
{
  "characters": [array of extracted characters],
  "locations": [array of extracted locations],
  "timeline_events": [array of extracted timeline events],
  "artifacts": [array of extracted artifacts],
  "lore": [array of extracted lore entries],
  "relationships": [array of extracted relationships]
}

Include only the arrays for enabled sections above.`;
        
        console.log(`[Analyze] Built combined prompt from ${enabledPieces.length} puzzle pieces`);
      }

      const response = await fetch('/api/narrative/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manuscriptText,
          customPrompt: customPrompt || undefined,
          chunkSize: 5000
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[Analyze] API error:', error);
        throw new Error(error.error || 'Failed to analyze manuscript');
      }

      const data = await response.json();
      const worldState = data.worldState || [];
      const worldType = data.worldType || 'fictional';
      
      console.log(`[Analyze] Received ${worldState.length} entities from AI`);
      console.log(`[Analyze] World type: ${worldType}`);
      console.log('[Analyze] WorldState:', JSON.stringify(worldState, null, 2));

      // Transform HierarchicalEntity[] into Character[], Location[], TimelineEvent[]
      const characters: Character[] = [];
      const locations: Location[] = [];
      const events: TimelineEvent[] = [];

      for (const entity of worldState) {
        console.log(`[Analyze] Processing entity:`, entity.type, entity.name);
        if (entity.type === 'Character') {
          characters.push({
            id: entity.id || generateId(),
            name: entity.name || 'Unknown',
            role: entity.role || '',
            tier: entity.tier || 3,
            aliases: entity.aliases || [],
            affiliation: entity.affiliation || '',
            traits: entity.traits || [],
            motivation: entity.motivation || '',
            description: entity.description || '',
            physical_description: entity.physical_description || '',
            source: 'ai_generated',
            first_mention_offset: entity.firstMentionOffset,
            field_notes: []
          });
        } else if (entity.type === 'Location') {
          locations.push({
            id: entity.id || generateId(),
            name: entity.name || 'Unknown',
            type: (entity.locationType || 'other') as any,
            scale: 'region',
            parent_location_id: undefined,
            controlling_faction: '',
            inhabitants: [],
            x: undefined,
            y: undefined,
            is_locked: false,
            description: entity.description || '',
            source: 'ai_generated',
            first_mention_offset: entity.firstMentionOffset,
            field_notes: []
          });
        } else if (entity.type === 'Event' || entity.type === 'PlotPoint') {
          events.push({
            id: entity.id || generateId(),
            title: entity.name || entity.title || 'Unknown Event',
            event_type: 'other',
            significance: 'major',
            real_world_sort_key: 0,
            is_flashback: false,
            location_id: undefined,
            participants: entity.charactersInvolved || [],
            description: entity.description || '',
            source: 'ai_generated',
            first_mention_offset: entity.firstMentionOffset,
            field_notes: []
          });
        }
      }

      console.log(`[Analyze] Transformed: ${characters.length} characters, ${locations.length} locations, ${events.length} events`);
      return { characters, locations, events, worldType };

    } catch (error) {
      console.error('[Analyze] Analysis failed:', error);
      setProcessingStatus(`Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { characters: [], locations: [], events: [], worldType: 'fictional' };
    }
  };

  const handleCancelUpload = () => {
    setIsAnalyzing(false);
    setUploadingFileName(undefined);
    setProcessingStatus(null);
    removeTask('uploading-project');
    console.log('[Upload] Upload cancelled by user');
  };

  // Helper function to generate unique project title by appending numbers
  const getUniqueProjectTitle = (baseTitle: string, existingMetadata: ProjectMetadata[]): string => {
    const existingTitles = new Set(existingMetadata.map(p => p.title));
    
    if (!existingTitles.has(baseTitle)) {
      return baseTitle;
    }

    let counter = 1;
    let newTitle = `${baseTitle} (${counter})`;
    while (existingTitles.has(newTitle)) {
      counter++;
      newTitle = `${baseTitle} (${counter})`;
    }
    return newTitle;
  };

  const handleUploadProject = async (file: File) => {
    console.log('[Upload] Starting file upload:', file.name);
    setIsAnalyzing(true);
    setUploadingFileName(file.name);
    addTask('uploading-project');
    try {
      // Handle Vault (.pvoid) files
      if (file.name.endsWith('.pvoid')) {
        console.log('[Upload] Processing Vault file');
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
        console.log('[Upload] Vault import complete');
        return;
      }

      // Handle Book (.plothole) files (ZIP format)
      if (file.name.endsWith('.plothole')) {
        console.log('[Upload] Processing Plothole file');
        const projectData = await unpackProject(file);
        if (projectData) {
          projectData.author = currentUser.name;
          projectData.title = getUniqueProjectTitle(projectData.title, projectsMetadata);
          const dataWithCatalog = populateDataCatalog(projectData);
          await saveProjectData(dataWithCatalog);
          setProjectData(dataWithCatalog);
          await refreshMetadata();
          setCurrentView(ViewType.DASHBOARD);
          console.log('[Upload] Plothole file processed');
          return;
        }
      }

      console.log('[Upload] Reading file as text');
      const text = await file.text();
      let data: any;

      if (file.name.endsWith('.json')) {
        console.log('[Upload] Processing JSON file');
        data = safeJsonParse(text);
        if (!data) {
          setError("Failed to parse JSON file. It might be malformed or empty.");
          return;
        }
        data.author = currentUser.name;
        if (data.title) {
          data.title = getUniqueProjectTitle(data.title, projectsMetadata);
        }
      } else {
        // It's a manuscript text file
        console.log('[Upload] Processing manuscript text file');
        setProcessingStatus("Reading Manuscript...");
        let generatedChapters: any[] = [];

        // Simple parsing: treat "Chapter" prefixed lines as chapter breaks
        try {
          const regex = /^(Chapter\s+\d+|Chapter\s+[IVivx]+)/gim;
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
              const body = (parts[i + 1] || '').trim();
              const combined = header + '\n\n' + body;

              generatedChapters.push({
                id: generateId(),
                title: header.substring(0, 50),
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

        data = {
          id: generateId(),
          title: getUniqueProjectTitle(file.name.replace(/\.[^/.]+$/, ""), projectsMetadata),
          author: currentUser.name,
          summary: '',
          lastModified: Date.now(),
          wordCount: text.trim().split(/\s+/).filter(w => w.length > 0).length,
          charCount: text.length,
          characters: [],
          relationships: [],
          locations: [],
          timeline: [],
          themes: [],
          artifacts: [],
          lore: [],
          entities: [],
          chapters: generatedChapters
        };

        if (!data.id) data.id = generateId();

        // Analyze manuscript to extract entities
        console.log('[Upload] Calling AI analysis...');
        const { characters, locations, events, worldType } = await analyzeManuscript(text);
        
        // Merge extracted data into the project
        data.characters = characters;
        data.locations = locations;
        data.timeline = events;
        
        console.log(`[Upload] Merged AI results: ${characters.length} chars, ${locations.length} locs, ${events.length} events`);
        console.log(`[Upload] World type detected: ${worldType}`);

        const dataWithCatalog = populateDataCatalog(data);
        
        // Ensure project is set to fictional world by default
        dataWithCatalog.isRealWorldMap = false;

        console.log('[Upload] Saving project data...');
        await saveProjectData(dataWithCatalog);
        setProjectData(dataWithCatalog);
        console.log('[Upload] Project saved, setting view');
        
        console.log('[Upload] Refreshing metadata');
        await refreshMetadata();
        setCurrentView(ViewType.DASHBOARD);
        console.log('[Upload] Upload complete');
      }
    } catch (err) {
      console.error('[Upload] Error during upload:', err);
      handleError(err);
    } finally {
      setIsAnalyzing(false);
      setUploadingFileName(undefined);
      setProcessingStatus(null);
      removeTask('uploading-project');
      console.log('[Upload] Upload handler finished');
    }
  };

  const viewContent = useMemo(() => {
    if (!isLoaded) return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-12 transition-all duration-700">
        <div className="w-full max-w-xs space-y-8">
          {/* Logo / Icon Area */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 blur-3xl animate-pulse" />
              <div className="relative p-6 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800">
                <Database size={40} className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Progress Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              <span>{loadingStage}</span>
              <span className="tabular-nums text-indigo-500">{loadingProgress}%</span>
            </div>
            
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-[1px]">
              <div 
                className="h-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-400 rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(79,70,229,0.4)]"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>

            <div className="flex justify-between px-1">
              {[0, 25, 50, 75, 100].map(p => (
                <div key={p} className={`w-1 h-1 rounded-full transition-colors duration-500 ${loadingProgress >= p ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
              ))}
            </div>
          </div>

          <div className="text-center">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-50">Initialising Core Engines</p>
          </div>
        </div>
      </div>
    );

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
              setProjectData(populateDataCatalog(d));
            }
          }}          onDeselectProject={() => {
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
      case ViewType.RESEARCH:
        return projectData ? <ResearchHubView
          currentView={currentView}
          onChangeView={setCurrentView}
          data={(currentView === ViewType.NOTEPAD ? { ...projectData, notes: globalNotes } : projectData) as any}
          projectsMetadata={projectsMetadata}
          currentUser={currentUser}
          activeTasks={activeTasks}
          fetchWithAuth={fetchWithAuth}
          onAddNote={async n => {
            if (currentView === ViewType.NOTEPAD) {
              let noteToSave = { ...n };
              setGlobalNotes(prev => [noteToSave, ...prev]);
              await saveGlobalNote(noteToSave);

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
              }
            } else {
              const noteToSave = { ...n, isCanon: true };
              await updateProjectData({ notes: [noteToSave, ...(projectData.notes || [])] });
            }
          }}
          onImportNotes={async (newNotes) => {
            if (currentView === ViewType.NOTEPAD) {
              const combined = [...newNotes, ...globalNotes];
              setGlobalNotes(combined);
              await saveAllGlobalNotes(combined);
              
              if (projectData) {
                await updateProjectData({ notes: [...newNotes, ...(projectData.notes || [])] });
              }
            } else if (projectData) {
              await updateProjectData({ notes: [...newNotes, ...(projectData.notes || [])] });
            }
          }}
          onAddIdeaToProject={handleAddIdeaToProject}
          onToggleCanon={handleToggleCanon}
          onDeleteNote={handleDeleteNote}
          onDeleteAllNotes={async () => {
            if (currentView === ViewType.NOTEPAD) {
              setGlobalNotes([]);
              for (const note of globalNotes) await deleteGlobalNote(note.id);
              if (projectData?.notes) await updateProjectData({ notes: [] });
            } else if (projectData) {
              await updateProjectData({ notes: [] });
            }
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
            if (d) setProjectData(populateDataCatalog(d));
          }}
          onOpenDashboard={() => setIsDashboardModalOpen(true)}
          isAnalyzing={isAnalyzing}
        /> : <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-950 font-serif italic text-lg text-center p-12">Initialize a story world to unlock drafting tools.</div>;

      case ViewType.DASHBOARD:
        return projectData ? <DashboardView projectData={projectData} globalNotes={globalNotes} onFileUpload={() => { }} onLoadSample={() => handleCreateProject(projectData?.title || 'The Obsidian Citadel', projectData?.author || 'Junior Archivist', true, projectData?.shortName || 'Citadel', projectData?.id)} isAnalyzing={isAnalyzing} error={null} onExport={() => exportFullArchive(globalNotes)} onAnalyzeText={() => { }} onRestoreHistory={() => { }} onRestoreCommit={handleRestoreCommit} onGenerateCover={() => { }} onExportVault={handleExportVault} onAuditThreads={handleAuditThreads} onExportProject={(p) => exportProjectPlothole(p)} isGeneratingCover={false} onUpdateProcessedFiles={() => { }} isUpdatingProcessed={false} onLinkClick={handleLinkClick}
          onUpdateProject={updateProjectData}
          onSave={handleManualSave}
          currentUser={currentUser}
        /> : null;

      case ViewType.PLOT_HUB:
      case ViewType.TIMELINE:
        return projectData ? <PlotHubView 
          currentView={currentView} 
          onChangeView={setCurrentView} 
          data={projectData} 
          onLinkClick={handleLinkClick} 
          onAddTimelineEvent={(e) => updateProjectData({ timeline: [...projectData.timeline, e] })} 
          onUpdateTimelineEvent={(e) => updateProjectData({ timeline: projectData.timeline.map(ev => ev.id === e.id ? e : ev) })} 
          onAnalyzePlot={() => { }} 
          onExtractSoftAnchors={handleExtractSoftAnchors} 
          onScanContinuity={handleScanContinuity} 
          onUpdateProject={updateProjectData} 
          isAnalyzing={isAnalyzing} 
        /> : null;

      case ViewType.WORLD_HUB:
      case ViewType.MAP:
        if (!projectData) return null;
        return <WorldSystemView
          currentView={currentView}
          onChangeView={setCurrentView}
          data={projectData} 
          onUpdateLocation={(l) => updateProjectData({ locations: projectData.locations.map(loc => loc.id === l.id ? l : loc) })}
          onUpdateCharacter={(c) => updateProjectData({ characters: projectData.characters.map(char => char.id === c.id ? c : char) })}
          onAddLocation={(l) => updateProjectData({ locations: [...projectData.locations, l] })}
          onUpdateRootMap={(u) => updateProjectData({ rootMapImage: u })}
          onUpdateRootMapData={(s, u) => updateProjectData({ mapScale: s, mapUnit: u })}
          onLinkClick={handleLinkClick}
          onUpdateMapOrder={() => { }}
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
          currentUser={currentUser}
          projectsMetadata={projectsMetadata}
        />;

      case ViewType.CHARACTERS:
      case ViewType.CODEX_HUB:
        return projectData ? <CodexHubView projectData={projectData} onLinkClick={handleLinkClick} onUpdateProject={updateProjectData} /> : <div className="h-full flex items-center justify-center text-slate-400">Initialize a story world to view the Codex Hub.</div>;

      case ViewType.NARRATIVE_ARCHITECT:
        return projectData ? <NarrativeArchitectView projectData={projectData} globalNotes={globalNotes} onUpdateProject={updateProjectData} /> : null;

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
          onUpdateUser={u => setCurrentUser(prev => ({ ...prev, ...u }))}
          onUpdateProject={d => updateProjectData(d)}
          onChangeView={setCurrentView}
          onLinkClick={handleLinkClick}
          fetchWithAuth={fetchWithAuth}
          appSettings={appSettings}
        />;

      default:
        return <div className="h-full flex items-center justify-center text-slate-400">View not found.</div>;
    }
  }, [isLoaded, isAuthLoading, currentView, projectData, projectsMetadata, globalNotes, isAnalyzing, isExtractingThemes, isExtractingRelationships, currentUser, appPrompts, globalResources, activeTasks, updateProjectData, currentMapParentId, refreshMetadata, handleDeleteProject, handleUploadProject, handleCreateProject, handleDoubleProcessNote, handleError, handleQuickUpdate]);


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
          <div className="flex-1 overflow-hidden relative">
            <React.Suspense fallback={
              <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            }>
              {viewContent}
            </React.Suspense>
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
        <ActiveArchitect tasks={activeTasks.filter(t => 
          t !== 'uploading-project' && 
          !t.startsWith('Analyzing') && 
          !t.includes('Audit') && 
          !t.startsWith('Syncing')
        )} />
        <UploadProminentModal 
          isOpen={activeTasks.includes('uploading-project')} 
          status={processingStatus}
          fileName={uploadingFileName}
          onClose={handleCancelUpload}
        />

        {projectData && (
          <OracleFloatingButton 
            data={{ ...projectData, notes: globalNotes } as any} 
            currentUser={currentUser} 
          />
        )}
      </main>

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
                    value={adminNoteDraft}
                    onChange={(e) => setAdminNoteDraft(e.target.value)}
                    placeholder="Quick draft an administrative note... (Enter to save)"
                    className="w-full h-24 bg-transparent border-none focus:ring-0 text-sm font-serif resize-none"
                    onKeyDown={async (e) => {
                      if (e.key === 'Escape') {
                        setIsAdminNoteOpen(false);
                      } else if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        const text = adminNoteDraft.trim();
                        if (!text) return;
                        const n: Note = { id: generateId(), content: text, tags: ['admin_note'], timestamp: Date.now() };
                        if (projectData) {
                          await updateProjectData({ notes: [n, ...(projectData.notes || [])] });
                        } else {
                          setGlobalNotes(prev => [n, ...prev]);
                          await saveGlobalNote(n);
                        }
                        setAdminNoteDraft('');
                        localStorage.removeItem('plothole_admin_note_draft');
                      }
                    }}
                  />
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Enter to Save &bull; Shift+Enter for Newline</span>
                    <button
                      onClick={async () => {
                        const text = adminNoteDraft.trim();
                        if (!text) return;
                        const n: Note = { id: generateId(), content: text, tags: ['admin_note'], timestamp: Date.now() };
                        if (projectData) {
                          await updateProjectData({ notes: [n, ...(projectData.notes || [])] });
                        } else {
                          setGlobalNotes(prev => [n, ...prev]);
                          await saveGlobalNote(n);
                        }
                        setAdminNoteDraft('');
                        localStorage.removeItem('plothole_admin_note_draft');
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
              onGenerateCover={() => { }}
              isGeneratingCover={false}
              onAuditThreads={handleAuditThreads}
              isAnalyzing={isAnalyzing}
              onRestoreCommit={handleRestoreCommit}
              currentUser={currentUser}
              onFileUpload={() => { }}
              onLoadSample={() => handleCreateProject(projectData?.title || 'The Obsidian Citadel', projectData?.author || 'Junior Archivist', true, projectData?.shortName || 'Citadel', projectData?.id)}
              onExport={handleExportVault}
              onExportVault={handleExportVault}
              onRestoreHistory={() => { }}
              onAnalyzeText={() => { }}
              onUpdateProcessedFiles={() => { }}
              isUpdatingProcessed={false}
              error={null}
            />
          </div>
        </Modal>
      )}

      <LicenseModal
        isOpen={isLicensesOpen}
        onClose={() => setIsLicensesOpen(false)}
      />
    </div>
  );

  const [isGuest, setIsGuest] = useState(false);

  return (
    <EditModalProvider>
      <AppWithEditor
        isAuthenticated={isAuthenticated}
        isAuthLoading={isAuthLoading}
        isGuest={isGuest}
        setIsGuest={setIsGuest}
        renderAppContent={renderAppContent}
      />
    </EditModalProvider>
  );
};

interface AppWithEditorProps {
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isGuest: boolean;
  setIsGuest: (value: boolean) => void;
  renderAppContent: () => React.ReactNode;
}

const AppWithEditor: React.FC<AppWithEditorProps> = ({
  isAuthenticated,
  isAuthLoading,
  isGuest,
  setIsGuest,
  renderAppContent,
}) => {
  const { modalState, closeEditor } = useEditModal();

  return (
    <>
      {(!isAuthenticated && !isGuest && !isAuthLoading) ? (
        <SignInPage onGuestAccess={() => setIsGuest(true)} />
      ) : (
        renderAppContent()
      )}
      
      {/* Global Edit Modal */}
      <DynamicEditModal
        isOpen={modalState.isOpen}
        data={modalState.data}
        entityType={modalState.entityType}
        entityId={modalState.entityId}
        title={modalState.title}
        onClose={closeEditor}
      />
    </>
  );
};

export default App;
