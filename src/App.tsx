import React, { useState, useEffect, useCallback, useMemo } from 'react';
import JSZip from 'jszip';
import { 
  ProjectData, ProjectMetadata, User, ViewType, Note, 
  AppPrompts, AppSettings, ToolboxLink, Idea, Artifact, LoreEntry, ChangeLogEntry
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
  exportProjectPlothole
} from './services/storageService';
import { 
  analyzeStoryText, generateBookCover, doubleProcessNote, extractThemesFromNotes, extractSoftAnchors, auditPlotThreads,
  DEFAULT_PROMPTS, initializeApiKey, isApiKeyValid
} from './services/geminiService';
import { createCommit, updateIntegrityHash } from './services/versioningService';
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
import { BlueprintRescueView } from './components/Views/BlueprintRescueView';
import ResearchView from './components/Views/ResearchView';
import { SemanticEditorView } from './components/Views/SemanticEditorView';
import { StoryArchitectView } from './components/Views/StoryArchitectView';
import { ActiveArchitect } from './components/ui/ActiveArchitect';
import { AlertCircle, X, Sparkles, Menu } from 'lucide-react';
import { SignedIn, SignedOut, useUser } from '@clerk/clerk-react';
import { SignInPage } from './components/Auth/SignInPage';

const DEMO_USER: User = {
  id: 'user-1',
  name: 'Lead Architect',
  email: 'writer@plothole.ai',
  role: 'admin',
  lastActive: Date.now(),
  themeColor: '59 130 246',
  preferences: { themeMode: 'light', fontSize: 'md', fontFamily: 'sans', landingPage: ViewType.BOOKSHELF, aiVerbosity: 'detailed', colorfulIcons: true, semanticSearchEnabled: false }
};

import { MasterBlueprintEditor } from './components/ui/MasterBlueprintEditor';

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();

  const [currentUser, setCurrentUser] = useState<User>(DEMO_USER);
  
  // Sync Clerk user with app user
  useEffect(() => {
    // Developer mode bypass
    if (import.meta.env.MODE === 'development' && !clerkUser) {
      setCurrentUser(prev => ({
        ...prev,
        role: 'admin',
      }));
      return;
    }

    if (isClerkLoaded && clerkUser) {
      setCurrentUser(prev => ({
        ...prev,
        id: clerkUser.id,
        name: clerkUser.fullName || clerkUser.username || 'Writer',
        email: clerkUser.primaryEmailAddress?.emailAddress || 'writer@plothole.ai',
      }));
    }
  }, [isClerkLoaded, clerkUser]);
  const currentView = (decodeURIComponent(location.pathname.slice(1)) as ViewType) || DEMO_USER.preferences?.landingPage || ViewType.BOOKSHELF;
  const setCurrentView = (view: ViewType) => navigate(`/${view}`);
  
  const [projectsMetadata, setProjectsMetadata] = useState<ProjectMetadata[]>([]);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [globalNotes, setGlobalNotes] = useState<Note[]>([]);
  const [globalResources, setGlobalResources] = useState<ToolboxLink[]>([]);
  const [appPrompts, setAppPromptsState] = useState<AppPrompts>(DEFAULT_PROMPTS);
  const [appSettings, setAppSettings] = useState<AppSettings>({ appName: 'Plothole — Your Story, Decoded' });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [activeTasks, setActiveTasks] = useState<string[]>([]);

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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Global Blueprint Editor State
  const [isBlueprintOpen, setIsBlueprintOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<{ id: string; type: string; data: any } | null>(null);
  
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
  const [currentMapParentId, setCurrentMapParentId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [rescueData, setRescueData] = useState<any | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);
  const [lastBackupMilestone, setLastBackupMilestone] = useState<{ words: number, commits: number }>({ words: 0, commits: 0 });

  const addTask = (id: string) => setActiveTasks(prev => [...prev, id]);
  const removeTask = (id: string) => setActiveTasks(prev => prev.filter(t => t !== id));

  const refreshMetadata = useCallback(async () => {
    const meta = await getAllProjectsMetadata();
    setProjectsMetadata(meta);
  }, []);

  const updateProjectData = useCallback(async (updates: Partial<ProjectData>) => {
    if (!projectData) return;

    // Auto-generate change log entry for notable entities
    let newLog: ChangeLogEntry | null = null;
    if (updates.characters && updates.characters.length !== projectData.characters?.length) {
      const added = updates.characters.find(c => !projectData.characters?.some(pc => pc.id === c.id));
      if (added) newLog = { id: generateId(), timestamp: Date.now(), entityType: 'Character', entityName: added.name, entityId: added.id, action: 'Created' };
    } else if (updates.locations && updates.locations.length !== projectData.locations?.length) {
      const added = updates.locations.find(l => !projectData.locations?.some(pl => pl.id === l.id));
      if (added) newLog = { id: generateId(), timestamp: Date.now(), entityType: 'Location', entityName: added.name, entityId: added.id, action: 'Created' };
    } else if (updates.timeline && updates.timeline.length !== projectData.timeline?.length) {
      const added = updates.timeline.find(e => !projectData.timeline?.some(pe => pe.id === e.id));
      if (added) newLog = { id: generateId(), timestamp: Date.now(), entityType: 'Timeline', entityName: added.title, entityId: added.id, action: 'Created' };
    }

    const baseUpdated = { 
      ...projectData, 
      ...updates,
      changeLog: newLog ? [...(projectData.changeLog || []), newLog] : projectData.changeLog
    };
    const commit = await createCommit(baseUpdated, updates.title ? `Meta update: ${updates.title}` : 'Manual Save');
    const integrityHash = await updateIntegrityHash(baseUpdated);

    const updated: ProjectData = { 
      ...baseUpdated, 
      commits: [...(projectData.commits || []), commit],
      integrityHash,
      lastModified: Date.now() 
    };

    setProjectData(updated);
    await saveProjectData(updated);
    await refreshMetadata();

    // Trigger cleanup occasionally
    if (Math.random() < 0.2) {
      performImageCleanup();
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

  const openBlueprint = useCallback((type: string, id: string, dataObj: any) => {
    setEditingCard({ id, type, data: dataObj });
    setIsBlueprintOpen(true);
  }, []);

  const handleQuickUpdate = useCallback((type: string, id: string, key: string, value: any) => {
    if (!projectData) return;

    // Handle Top-Level Project variables
    if (type === 'Project') {
      updateProjectData({ [key]: value });
      setEditingCard(prev => prev && prev.type === 'Project' ? { ...prev, data: { ...prev.data, [key]: value } } : prev);
      return;
    }

    const mapTypeToKey: Record<string, string> = {
      'Character': 'characters',
      'Location': 'locations',
      'Timeline': 'timeline',
      'Source': 'sources',
      'Ledger': 'ledger',
      'Artifact': 'artifacts',
      'Lore': 'lore',
      'Chapter': 'chapters',
      'Calendar': 'calendars',
      'Plotline': 'plotlines',
      'MatrixCell': 'matrixCells',
      'Language': 'languages'
    };

    const projectKey = mapTypeToKey[type];
    if (!projectKey) return;

    const list = [...(projectData as any)[projectKey] || []];
    const index = list.findIndex((item: any) => item.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], [key]: value };
      updateProjectData({ [projectKey]: list });
      
      // Sync local editing card if it's the one being modified
      setEditingCard(prev => prev && prev.id === id ? { ...prev, data: { ...prev.data, [key]: value } } : prev);
    }
  }, [projectData, updateProjectData]);

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
    const init = async () => {
      try {
        const [meta, notes, resources, prompts, settings] = await Promise.all([
          getAllProjectsMetadata(),
          getAllGlobalNotes(),
          getAllGlobalResources(),
          getAppPrompts(),
          getAppSettings()
        ]);
        setProjectsMetadata(meta);
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
  }, [checkApiKey]); // Removed currentView/projectData/location to prevent infinite loops, init should only run once


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

  const handleCreateProject = async (title: string, author: string, useSample: boolean, shortName?: string) => {
    const id = generateId();
    let newProject: ProjectData = {
      id, title, shortName, author, summary: '', lastModified: Date.now(), characters: [], locations: [], timeline: [], notes: [], relationships: [], themes: [], calendars: [], artifacts: [], lore: [], chapters: [], sources: []
    };

    if (useSample) {
      newProject = {
        ...newProject,
        summary: 'A story about a hidden archive.',
        themes: ['Mystery'],
        characters: [{ id: generateId(), name: 'Arthur', role: 'Archivist', description: 'keeper of secrets.', traits: ['Diligent'], source: 'manual' }],
        locations: [{ id: generateId(), name: 'Archives', description: 'Underground library.', type: 'Library', source: 'manual' }]
      };
    }

    await saveProjectData(newProject);
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
          status: 'Draft', 
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

    if (targetNote && projectData) {
      const currentLedger = projectData.ledger || [];
      if (isCanon) {
        // Add to ledger if not already there
        if (!currentLedger.some(n => n.id === noteId)) {
          await updateProjectData({ ledger: [targetNote, ...currentLedger] });
        }
      } else {
        // Remove from ledger
        await updateProjectData({ ledger: currentLedger.filter(n => n.id !== noteId) });
      }
    }
  };

  const handleUploadProject = async (file: File) => {
    setIsAnalyzing(true);
    addTask('uploading-project');
    try {
      const text = await file.text();
      let data: any;
      
      if (file.name.endsWith('.json')) {
        data = JSON.parse(text);
      } else if (file.name.endsWith('.plothole')) {
        // .plothole files are JSON (for now)
        data = JSON.parse(text);
      } else {
        // It's a manuscript text file
        const analysis = await analyzeStoryText(text, undefined, { 
          extractCharacters: true, 
          extractTimeline: true, 
          extractLocations: true,
          extractArtifacts: true,
          extractLore: true
        });
        
        data = {
          id: generateId(),
          title: analysis.title || file.name.replace(/\.[^/.]+$/, ""),
          author: currentUser.name,
          summary: analysis.summary,
          lastModified: Date.now(),
          characters: analysis.characters.map(c => ({ ...c, id: generateId(), source: 'ai' as const })),
          locations: analysis.locations.map(l => ({ ...l, id: generateId(), source: 'ai' as const })),
          timeline: analysis.timeline.map(e => ({ ...e, id: generateId(), source: 'ai' as const })),
          themes: analysis.themes,
          artifacts: analysis.artifacts.map(a => ({ ...a, id: generateId(), source: 'ai' as const })),
          lore: analysis.lore.map(l => ({ ...l, id: generateId(), source: 'ai' as const })),
          chapters: [{ 
            id: generateId(), 
            title: 'Imported Chapter', 
            content: text, 
            order: 0, 
            status: 'Draft' as const, 
            lastModified: Date.now(),
            wordCount: text.split(/\s+/).length 
          }]
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
      removeTask('uploading-project');
    }
  };

  const viewContent = useMemo(() => {
    if (!isLoaded || !isClerkLoaded) return <div className="h-full flex items-center justify-center text-primary animate-pulse font-bold uppercase tracking-widest">Initialising Core Engines...</div>;

    if (!projectData && ![ViewType.BOOKSHELF, ViewType.TOOLBOX, ViewType.ADMIN, ViewType.SETTINGS, ViewType.NOTEPAD].includes(currentView)) {
        return <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-950 font-serif italic text-lg text-center p-12">Initialize a story world to unlock drafting tools.</div>;
    }

    switch (currentView) {
      case ViewType.BOOKSHELF: 
        return <BookshelfView projects={projectsMetadata} activeProjectId={projectData?.id || ''} currentUser={currentUser} onSelectProject={async (id) => { const d = await loadProjectById(id); if (d) { setProjectData(d); setCurrentView(ViewType.DASHBOARD); } }} onCreateProject={handleCreateProject} onUploadProject={handleUploadProject} onDeleteProject={async id => { await deleteProject(id); await refreshMetadata(); if (projectData?.id === id) setProjectData(null); }} onOpenDashboard={() => setCurrentView(ViewType.DASHBOARD)} isAnalyzing={isAnalyzing} />;

      case ViewType.NOTEPAD: 
        return <ResearchSystemView currentView={currentView} onChangeView={setCurrentView} data={{...projectData, notes: globalNotes} as any} projectsMetadata={projectsMetadata} currentUser={currentUser} onAddNote={async n => { 
          let noteToSave = { ...n };
          
          // Auto-Ledger Logic
          if (projectData) {
            const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
            const projectTags = [projectData.shortName, projectData.title].filter(Boolean).map(s => normalize(s!));
            const charTags = (projectData.characters || []).map(c => normalize(c.name));
            const locTags = (projectData.locations || []).map(l => normalize(l.name));
            
            const noteTags = n.tags.map(t => normalize(t));
            const shouldCanonize = noteTags.some(t => projectTags.includes(t) || charTags.includes(t) || locTags.includes(t));

            if (shouldCanonize) {
              noteToSave.isCanon = true;
              const currentLedger = projectData.ledger || [];
              if (!currentLedger.some(ln => ln.id === n.id)) {
                await updateProjectData({ ledger: [{...noteToSave, isSavedInLedger: true}, ...currentLedger] });
              }
            }
          }

          setGlobalNotes(prev => [noteToSave, ...prev]); 
          await saveGlobalNote(noteToSave); 
        }} onAddIdeaToProject={handleAddIdeaToProject} onToggleCanon={handleToggleCanon} onDeleteNote={async id => { 
          if (globalNotes.some(n => n.id === id)) {
            setGlobalNotes(prev => prev.filter(n => n.id !== id)); 
            await deleteGlobalNote(id); 
          } else if (projectData?.ideas?.some(n => n.id === id)) {
            await updateProjectData({ ideas: projectData.ideas.filter(n => n.id !== id) });
          }
        }} onDeleteAllNotes={async () => {
          setGlobalNotes([]);
          for (const note of globalNotes) await deleteGlobalNote(note.id);
          if (projectData?.ideas) await updateProjectData({ ideas: [] });
        }} onLinkClick={(type, id) => { if (type === 'character') setCurrentView(ViewType.CHARACTERS); else if (type === 'dashboard') setCurrentView(ViewType.DASHBOARD); else { setCurrentMapParentId(id); setCurrentView(ViewType.MAP); } }} onAddDoubleProcessedNote={handleDoubleProcessNote} activeTasks={activeTasks} onUpdateProject={updateProjectData} semanticSearchEnabled={currentUser.preferences?.semanticSearchEnabled} />;

      case ViewType.CHARACTERS: 
        return <CharacterView 
          projectTitle={projectData?.title || ''} 
          characters={projectData?.characters || []} 
          relationships={projectData?.relationships || []}
          locations={projectData?.locations || []} 
          timeline={projectData?.timeline || []} 
          artifacts={projectData?.artifacts || []} 
          themes={projectData?.themes || []} 
          notes={globalNotes} 
          manuscriptHistory={projectData?.manuscriptHistory || []} 
          onUpdateCharacter={(c) => updateProjectData({ characters: projectData?.characters.map(ch => ch.id === c.id ? c : ch) })} 
          onAddCharacter={(c) => updateProjectData({ characters: [...(projectData?.characters || []), c] })} 
          onUpdateProject={updateProjectData}
          onLinkClick={(type, id) => { if (type === 'location') { setCurrentMapParentId(id); setCurrentView(ViewType.MAP); } }} 
          characterLimit={projectData?.characterLimit} 
          onChangeView={setCurrentView} 
          onExtractThemesFromNotes={async () => {
            if (!projectData) return;
            setIsExtractingThemes(true);
            addTask('Extracting Themes');
            try {
              const themes = await extractThemesFromNotes(globalNotes);
              if (themes.length > 0) await updateProjectData({ themes: Array.from(new Set([...projectData.themes, ...themes])) });
            } catch (e) { handleError(e); } finally { 
              setIsExtractingThemes(false); 
              removeTask('Extracting Themes');
            }
          }}
          isExtractingThemes={isExtractingThemes}
          onExtractRelationships={handleExtractRelationships}
          isExtractingRelationships={isExtractingRelationships}
          onOpenBlueprint={openBlueprint}
        />;
      case ViewType.DASHBOARD:
        return projectData ? <DashboardView projectData={projectData} globalNotes={globalNotes} onFileUpload={() => {}} onLoadSample={() => {}} isAnalyzing={isAnalyzing} error={null} onExport={() => exportFullArchive(globalNotes)} onAnalyzeText={(t) => {
            setIsAnalyzing(true);
            addTask('Analyzing Project');
            analyzeStoryText(t, undefined, { extractCharacters: true, extractTimeline: true, extractLocations: true, extractArtifacts: true, extractLore: true })
            .then(a => updateProjectData({ summary: a.summary, themes: a.themes }))
            .catch(handleError)
            .finally(() => {
              setIsAnalyzing(false);
              removeTask('Analyzing Project');
            });
        }} onRestoreHistory={() => {}} onRestoreCommit={handleRestoreCommit} onGenerateCover={handleGenerateCover} onAuditThreads={handleAuditThreads} onExportProject={(p) => exportProjectPlothole(p, globalNotes)} isGeneratingCover={isGeneratingCover} onOpenBlueprint={openBlueprint} /> : null;

      case ViewType.TIMELINE:
      case ViewType.BOARD:
      case ViewType.MATRIX:
      case ViewType.PLOT_ANALYSIS:
      case ViewType.CALENDAR:
        return projectData ? <PlotSystemView currentView={currentView} onChangeView={setCurrentView} data={projectData} onUpdateCalendar={(c) => updateProjectData({ calendars: projectData.calendars.map(cal => cal.id === c.id ? c : cal) })} onSetActiveCalendar={(id) => updateProjectData({ activeCalendarId: id })} onLinkClick={(type, id) => { if (type === 'character') setCurrentView(ViewType.CHARACTERS); else { setCurrentMapParentId(id); setCurrentView(ViewType.MAP); } }} onAddTimelineEvent={(e) => updateProjectData({ timeline: [...projectData.timeline, e] })} onUpdateTimelineEvent={(e) => updateProjectData({ timeline: projectData.timeline.map(ev => ev.id === e.id ? e : ev) })} onAnalyzePlot={() => {}} onExtractSoftAnchors={handleExtractSoftAnchors} onUpdateProject={updateProjectData} isAnalyzing={isAnalyzing} onOpenBlueprint={openBlueprint} /> : null;

      case ViewType.MAP:
      case ViewType.LOCATIONS:
      case ViewType.ENCYCLOPEDIA:
      case ViewType.INVENTORY:
      case ViewType.DICTIONARY:
      case ViewType.GALLERY:
        return projectData ? <WorldSystemView currentView={currentView} onChangeView={setCurrentView} data={projectData} onUpdateLocation={(l) => updateProjectData({ locations: projectData.locations.map(loc => loc.id === l.id ? l : loc) })} onAddLocation={(l) => updateProjectData({ locations: [...projectData.locations, l] })} onUpdateRootMap={(u) => updateProjectData({ rootMapImage: u })} onUpdateRootMapData={(s, u) => updateProjectData({ mapScale: s, mapUnit: u })} onLinkClick={(type, id) => { if (type === 'character') setCurrentView(ViewType.CHARACTERS); }} onUpdateMapOrder={() => {}} currentMapParentId={currentMapParentId} onMapChange={setCurrentMapParentId} onUpdateProject={updateProjectData} onAddArtifact={(a) => updateProjectData({ artifacts: [...(projectData.artifacts || []), a] })} onUpdateArtifact={(a) => updateProjectData({ artifacts: projectData.artifacts?.map(ar => ar.id === a.id ? a : ar) })} onDeleteArtifact={(id) => updateProjectData({ artifacts: projectData.artifacts?.filter(ar => ar.id !== id) })} onAddLore={(l) => updateProjectData({ lore: [...(projectData.lore || []), l] })} onDeleteLore={(id) => updateProjectData({ lore: projectData.lore?.filter(lo => lo.id !== id) })} onOpenBlueprint={openBlueprint} isFullscreen={isMapFullscreen} onToggleFullscreen={() => setIsMapFullscreen(!isMapFullscreen)} /> : null;

      case ViewType.TOOLBOX:
        return <ToolboxView bakedResources={globalResources} onAddResource={async (l) => { setGlobalResources(prev => [...prev, l]); await saveGlobalResource(l); }} onDeleteResource={async (id) => { setGlobalResources(prev => prev.filter(r => r.id !== id)); await deleteGlobalResource(id); }} />;

      case ViewType.ADMIN:
        return <AdminView 
          data={projectData} 
          globalNotes={globalNotes}
          appPrompts={appPrompts} 
          appSettings={appSettings}
          onSaveSettings={async (s) => { setAppSettings(s); await saveAppSettings(s); }}
          onSavePrompts={async (p) => { setAppPromptsState(p); await saveAppPrompts(p); }} 
          onUpdateProject={updateProjectData}
          onFullArchive={() => exportFullArchive(globalNotes)}
          globalResources={[]}
          onAddGlobalResource={async () => {}}
          onDeleteGlobalResource={async () => {}}
          onToggleViewVisibility={() => {}}
          projectsMetadata={projectsMetadata}
          onDeleteGlobalNote={async id => {
            setGlobalNotes(prev => prev.filter(n => n.id !== id));
            await deleteGlobalNote(id);
          }}
          onLinkClick={(type, id) => { if (type === 'character') setCurrentView(ViewType.CHARACTERS); else { setCurrentMapParentId(id); setCurrentView(ViewType.MAP); } }}
          onChangeView={setCurrentView}
          onOpenBlueprint={openBlueprint}
          onQuickUpdate={handleQuickUpdate}
          />;
      case ViewType.SETTINGS:
        const handleClearGlobalNotes = async () => {
          await clearAllGlobalNotes();
          setGlobalNotes([]);
        };
        return <SettingsView projectData={projectData} globalNotes={globalNotes} onImportProject={async d => { await saveProjectData(d); await refreshMetadata(); }} onFactoryReset={async () => { await clearDatabase(); window.location.reload(); }} onClearGlobalNotes={handleClearGlobalNotes} currentUser={currentUser} onUpdateUser={u => setCurrentUser(prev => ({...prev, ...u}))} onUpdateProject={d => updateProjectData(d)} onChangeView={setCurrentView} onLinkClick={(type, id) => { if (type === 'character') setCurrentView(ViewType.CHARACTERS); else { setCurrentMapParentId(id); setCurrentView(ViewType.MAP); } }} />;

      case ViewType.RESEARCH:
        return projectData ? <ResearchView projectData={projectData} globalNotes={globalNotes} projectsMetadata={projectsMetadata} currentUser={currentUser} onUpdateProject={updateProjectData} onLinkClick={(type, id) => { if (type === 'character') setCurrentView(ViewType.CHARACTERS); else if (type === 'dashboard') setCurrentView(ViewType.DASHBOARD); else { setCurrentMapParentId(id); setCurrentView(ViewType.MAP); } }} onOpenBlueprint={openBlueprint} /> : <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-950 font-serif italic text-lg text-center p-12">Initialize a story world to unlock Research.</div>;

      case ViewType.SEMANTIC_EDITOR:
        return projectData ? <SemanticEditorView projectData={projectData} onUpdateProject={updateProjectData} /> : <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-950 font-serif italic text-lg text-center p-12">Initialize a story world to unlock Semantic Engine.</div>;

      case ViewType.STORY_ARCHITECT:
        return <StoryArchitectView projectsMetadata={projectsMetadata} onSelectProject={async (id) => { const d = await loadProjectById(id); if (d) { setProjectData(d); await refreshMetadata(); setCurrentView(ViewType.DASHBOARD); } }} onUpdateProject={updateProjectData} currentUser={currentUser} />;

      default: 
        return <div className="h-full flex items-center justify-center text-slate-400">View not found.</div>;
    }
  }, [isLoaded, isClerkLoaded, currentView, projectData, projectsMetadata, globalNotes, isAnalyzing, isGeneratingCover, isExtractingThemes, isExtractingRelationships, currentUser, appPrompts, globalResources, activeTasks, updateProjectData, currentMapParentId, refreshMetadata, handleCreateProject, handleGenerateCover, handleDoubleProcessNote, handleError, openBlueprint, handleQuickUpdate]);
  const renderAppContent = () => (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors animate-in fade-in duration-500">
      <div className={`transition-all duration-700 ease-in-out hidden lg:flex shrink-0 overflow-hidden ${isMapFullscreen ? 'w-0 opacity-0 pointer-events-none' : isSidebarCollapsed ? 'w-20' : 'w-64 md:w-80'}`}>
        <Sidebar 
          currentView={currentView} 
          onChangeView={setCurrentView} 
          isOpen={isMobileSidebarOpen} 
          isCollapsed={isSidebarCollapsed} 
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
          onClose={() => setIsMobileSidebarOpen(false)} 
          hasActiveProject={!!projectData} 
          onToggleAi={() => setIsAiOpen(!isAiOpen)} 
          isAiOpen={isAiOpen} 
          currentUser={currentUser} 
          isProcessing={activeTasks.length > 0} 
          activeProjectTitle={projectData?.title}
          onQuickNote={async (text) => {
            const n: Note = { id: generateId(), content: text, tags: ['admin_note'], timestamp: Date.now() };
            if (projectData) {
              await updateProjectData({ ideas: [n, ...(projectData.ideas || [])] });
            } else {
              setGlobalNotes(prev => [n, ...prev]);
              await saveGlobalNote(n);
            }
          }}
          appName={appSettings.appName}
          sidebarOrder={appSettings.sidebarOrder}
        />
      </div>
      <main className="flex-1 h-full relative overflow-hidden flex flex-col">
        {/* Mobile Header */}
        <div className={`flex lg:hidden flex-col shrink-0 z-[1000] bg-slate-50 dark:bg-slate-950 transition-all duration-700 ease-in-out ${isMapFullscreen ? 'max-h-0 opacity-0 overflow-hidden p-0' : 'max-h-20'}`}>
          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 relative z-30 shadow-sm">
            <button onClick={() => setIsMobileSidebarOpen(true)} className="p-2 -ml-2 text-slate-500 dark:text-slate-400">
              <Menu size={20} />
            </button>
            <span className="font-black tracking-tighter text-slate-900 dark:text-white uppercase text-sm">{appSettings.appName}</span>
            <button onClick={() => setIsAiOpen(!isAiOpen)} className="p-2 -mr-2 text-indigo-500">
              <Sparkles size={20} />
            </button>
          </div>
        </div>

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
        <div className="flex-1 overflow-hidden relative pb-14 lg:pb-0">
          {viewContent}
        </div>
        
        {/* Mobile Floating Nav */}
        <BottomNav 
          currentView={currentView} 
          onChangeView={setCurrentView} 
          onOpenSidebar={() => setIsMobileSidebarOpen(true)}
          hasActiveProject={!!projectData}
          bottomNavOrder={appSettings.bottomNavOrder}
        />

        <ActiveArchitect tasks={activeTasks} />

        {rescueData && (
          <BlueprintRescueView 
            rawData={rescueData} 
            onCommit={async (migrated) => {
              await saveProjectData(migrated);
              setProjectData(migrated);
              await refreshMetadata();
              setRescueData(null);
              setCurrentView(ViewType.DASHBOARD);
            }} 
            onCancel={() => setRescueData(null)} 
          />
        )}
      </main>
      <AiAssistant projectData={projectData} isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} onToggle={() => setIsAiOpen(!isAiOpen)} />
      
      {projectData && (
        <MasterBlueprintEditor
          isOpen={isBlueprintOpen}
          onClose={() => setIsBlueprintOpen(false)}
          projectData={projectData}
          editingCard={editingCard}
          onUpdateProject={updateProjectData}
          onQuickUpdate={handleQuickUpdate}
          appPrompts={appPrompts}
        />
      )}
    </div>
  );

  return (
    <>
      {import.meta.env.MODE === 'development' && !clerkUser ? (
        renderAppContent()
      ) : (
        <>
          <SignedOut>
            <SignInPage appName={appSettings.appName} />
          </SignedOut>
          <SignedIn>
            {renderAppContent()}
          </SignedIn>
        </>
      )}
    </>
  );
};

export default App;
