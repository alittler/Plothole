import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ProjectData, 
  ProjectMetadata, 
  Character, 
  Location, 
  TimelineEvent, 
  Artifact, 
  LoreEntry, 
  ChangeLogEntry, 
  Note, 
  Chapter,
  Idea,
  BackupStatus,
  Commit
} from '../types';
import { 
  getAllProjectsMetadata, 
  loadProjectById, 
  saveProjectData, 
  deleteProject, 
  setCloudStorageEnabled, 
  generateId,
  saveGlobalNote,
  deleteGlobalNote,
  saveAllGlobalNotes,
  unpackProject,
  isCloudStorageActive
} from '../services/storageService';
import { auditPlotThreads, scanForContinuityErrors } from '../utils/aiUtils';
import { safeResponseJson } from '../utils/jsonUtils';

// Auto-populate Data Catalog from project entities
export function populateDataCatalog(data: ProjectData): ProjectData {
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

export function useProjectData(
  isAuthenticated: boolean, 
  fetchWithAuth: any,
  addTask: (id: string) => void,
  removeTask: (id: string) => void,
  setIsAnalyzing: (val: boolean) => void,
  globalNotes: Note[],
  setGlobalNotes: (notes: Note[]) => void
) {
  const [projectsMetadata, setProjectsMetadata] = useState<ProjectMetadata[]>([
    {
      id: 'global-notebook',
      title: 'Global Notebook',
      author: 'System',
      summary: 'Your personal scratchpad and research vault.',
      lastModified: Date.now(),
      characterCount: 0,
      locationCount: 0,
      commitCount: 0,
      backupCount: 0,
      wordCount: 0,
      origin: 'local'
    }
  ]);

  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [isRefreshingMetadata, setIsRefreshingMetadata] = useState(false);

  const refreshMetadata = useCallback(async () => {
    setIsRefreshingMetadata(true);
    console.log('[useProjectData] Refreshing metadata...');
    
    let meta: ProjectMetadata[] = [];
    try {
      setCloudStorageEnabled(isAuthenticated === true, fetchWithAuth);
      // Add a timeout to getAllProjectsMetadata to prevent hanging
      const metadataPromise = getAllProjectsMetadata();
      const timeoutPromise = new Promise<ProjectMetadata[]>((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 5000)
      );
      
      meta = await Promise.race([metadataPromise, timeoutPromise]);
      console.log(`[useProjectData] Received ${meta.length} projects from storage`);
    } catch (err) {
      console.error('[useProjectData] Failed to fetch project metadata:', err);
      // Fallback: use existing meta if any (we already have the notebook in state)
      meta = projectsMetadata.filter(m => m.id !== 'global-notebook');
    }

    try {
      const lastNoteTimestamp = globalNotes.length > 0 
        ? Math.max(...globalNotes.map(n => n.timestamp || 0)) 
        : 0;

      // Inject permanent Global Notebook
      const notebookMeta: ProjectMetadata = {
        id: 'global-notebook',
        title: 'Global Notebook',
        author: 'System',
        summary: 'Your personal scratchpad and research vault.',
        lastModified: lastNoteTimestamp || Date.now(),
        characterCount: 0,
        locationCount: 0,
        commitCount: 0,
        backupCount: 0,
        wordCount: 0,
        origin: isCloudStorageActive() ? 'cloud' : 'local'
      };
      
      // Ensure it's at the front and unique
      const finalMeta = [notebookMeta, ...meta.filter(m => m.id !== 'global-notebook')];
      setProjectsMetadata(finalMeta);
    } catch (err) {
      console.error('[useProjectData] Critical error in refreshMetadata:', err);
    } finally {
      setIsRefreshingMetadata(false);
    }
  }, [isAuthenticated, fetchWithAuth, globalNotes, projectsMetadata]);

  // Trigger refresh on mount and when authentication changes
  useEffect(() => {
    refreshMetadata();
  }, [isAuthenticated, fetchWithAuth]);

  const updateProjectData = useCallback(async (updatesOrFn: Partial<ProjectData> | ((prev: ProjectData) => Partial<ProjectData>)) => {
    if (!projectData) return;

    // Prevent direct updates to global-notebook project data via this method 
    // if it's supposed to use globalNotes state instead.
    // However, for consistency, we might want to allow some updates or just handle it in App.tsx.

    try {
      const prev = projectData;
      const updates = typeof updatesOrFn === 'function' ? updatesOrFn(prev) : updatesOrFn;
      
      let newLog: ChangeLogEntry | null = null;
      if (updates.characters && updates.characters.length !== prev.characters?.length) {
        const added = updates.characters.find(c => !prev.characters?.some(pc => pc.id === c.id));
        if (added) newLog = { id: generateId(), timestamp: Date.now(), entityType: 'Character', entityName: added.name, entityId: added.id, action: 'Created' };
      } else if (updates.locations && updates.locations.length !== prev.locations?.length) {
        const added = updates.locations.find(l => !prev.locations?.some(pl => pl.id === l.id));
        if (added) newLog = { id: generateId(), timestamp: Date.now(), entityType: 'Location', entityName: added.name, entityId: added.id, action: 'Created' };
      } else if (updates.timeline && updates.timeline.length !== prev.timeline?.length) {
        const added = updates.timeline.find(e => !prev.timeline?.some(pe => pe.id === e.id));
        if (added) newLog = { id: generateId(), timestamp: Date.now(), entityType: 'Timeline', entityName: added.title || 'Unknown', entityId: added.id, action: 'Created' };
      }

      const baseUpdated: ProjectData = {
        ...prev,
        ...updates,
        changeLog: newLog ? [...(prev.changeLog || []), newLog] : prev.changeLog,
        lastModified: Date.now()
      };

      setProjectData(baseUpdated);
      
      // Don't try to save 'global-notebook' as a standard project file
      if (projectData.id !== 'global-notebook') {
        await saveProjectData(baseUpdated);
        await refreshMetadata();
      }
    } catch (err) {
      console.error("[useProjectData] FAILED to update project data:", err);
    }
  }, [projectData, refreshMetadata]);

  const loadProject = useCallback(async (id: string) => {
    if (id === 'global-notebook') {
      const notebookData: ProjectData = {
        id: 'global-notebook',
        title: 'Global Notebook',
        author: 'System',
        summary: 'Your personal scratchpad and research vault.',
        lastModified: Date.now(),
        characters: [],
        locations: [],
        timeline: [],
        relationships: [],
        notes: globalNotes, // Use current global notes
        themes: [],
        entities: [],
        manuscript: '',
        history_diff: '',
        assets: []
      };
      setProjectData(notebookData);
      return notebookData;
    }

    const data = await loadProjectById(id);
    if (data) {
      const withCatalog = populateDataCatalog(data);
      setProjectData(withCatalog);
      return withCatalog;
    }
    return null;
  }, [globalNotes]);

  const handleManualSave = useCallback(async () => {
    if (!projectData || projectData.id === 'global-notebook') return;
    await saveProjectData(projectData);
    await refreshMetadata();
  }, [projectData, refreshMetadata]);

  const handleDeleteProject = useCallback(async (id: string) => {
    if (id === 'global-notebook') {
      console.warn('[useProjectData] Cannot delete Global Notebook');
      return;
    }
    console.log(`[useProjectData] Requesting deletion of project: ${id}`);
    try {
      await deleteProject(id);
      await refreshMetadata();

      if (projectData?.id === id) {
        setProjectData(null);
      }
    } catch (err: any) {
      console.error(`[useProjectData] Failed to delete project ${id}:`, err);
      alert(`Failed to delete project: ${err.message || String(err)}`);
    }
  }, [projectData?.id, refreshMetadata]);

  const handleEditProject = useCallback(async (id: string, title: string, author: string, shortName: string) => {
    try {
      if (projectData?.id === id) {
        const updated = { ...projectData, title, author, shortName };
        setProjectData(updated);
        await saveProjectData(updated);
      } else {
        const targetProject = await loadProjectById(id);
        if (targetProject) {
          const updated = { ...targetProject, title, author, shortName };
          await saveProjectData(updated);
        }
      }
      await refreshMetadata();
    } catch (err: any) {
      console.error(`[useProjectData] Failed to edit project ${id}:`, err);
      alert(`Failed to edit project: ${err.message || String(err)}`);
    }
  }, [projectData, refreshMetadata]);

  const handleCreateProject = useCallback(async (title: string, author: string, isSample: boolean = false, shortName?: string, existingId?: string) => {
    const id = existingId || generateId();
    
    let characters: Character[] = [];
    let locations: Location[] = [];
    let timeline: TimelineEvent[] = [];
    
    if (isSample) {
      characters = [
        {
          id: generateId(),
          name: 'Eara the Silent',
          role: 'Protagonist',
          tier: 1,
          traits: ['Observant', 'Stoic', 'Agile'],
          description: 'A master archivist who can hear the whispers of the past.',
          motivation: 'To uncover the truth behind the fall of the Obsidian Citadel.'
        },
        {
          id: generateId(),
          name: 'Kaelen Voss',
          role: 'Antagonist',
          tier: 1,
          traits: ['Ambitious', 'Charismatic', 'Ruthless'],
          description: 'A rogue scholar seeking to weaponize ancient secrets.',
          motivation: 'To rewrite history in his own image.'
        }
      ];
      
      locations = [
        {
          id: generateId(),
          name: 'The Obsidian Citadel',
          description: 'A sprawling fortress of dark glass and forgotten lore.',
          type: 'Fortress',
          scale: 'Regional'
        },
        {
          id: generateId(),
          name: 'The Whispering Archives',
          description: 'A subterranean library where the books speak to those who listen.',
          type: 'Library',
          scale: 'Building'
        }
      ];
      
      timeline = [
        {
          id: generateId(),
          title: 'The Great Shattering',
          description: 'The day the Citadel fell into silence.',
          date: '100 Years Ago',
          event_type: 'Catastrophe',
          significance: 'Pivotal'
        }
      ];
    }

    const newProject: ProjectData = {
      id,
      title,
      author,
      shortName: shortName || title.slice(0, 8),
      summary: isSample ? 'A sample archaeological thriller set in the ruins of the Obsidian Citadel.' : 'A new story world waiting to be explored.',
      lastModified: Date.now(),
      characters,
      locations,
      timeline,
      relationships: [],
      notes: [],
      themes: isSample ? ['Memory', 'Power', 'Legacy'] : [],
      entities: [],
      manuscript: isSample ? '# The Last Archivist\n\nEara stood before the massive gates of the Obsidian Citadel...' : '',
      history_diff: '',
      assets: []
    };

    setProjectData(newProject);
    await saveProjectData(newProject);
    // Wait a bit for cloud sync to complete, then refresh metadata
    // This ensures the UI shows the correct 'cloud' origin for newly created projects
    await new Promise(resolve => setTimeout(resolve, 500));
    await refreshMetadata();
    return newProject;
  }, [refreshMetadata]);

  const handleUploadProject = useCallback(async (file: File) => {
    addTask('uploading-project');
    try {
      const project = await unpackProject(file);
      setProjectData(project);
      await saveProjectData(project);
      // Wait a bit for cloud sync to complete, then refresh metadata
      // This ensures the UI shows the correct 'cloud' origin for newly uploaded projects
      await new Promise(resolve => setTimeout(resolve, 500));
      await refreshMetadata();
    } catch (err: any) {
      console.error("Upload failed", err);
      alert(`Failed to upload project: ${err.message}`);
    } finally {
      removeTask('uploading-project');
    }
  }, [addTask, removeTask, refreshMetadata]);

  const handleRestoreCommit = useCallback(async (commit: Commit) => {
    if (!projectData || !commit.snapshot) return;
    if (!confirm(`Restore project to "${commit.message}"? Current changes will be overwritten.`)) return;
    
    await updateProjectData({ chapters: commit.snapshot });
  }, [projectData, updateProjectData]);

  const handleAuditThreads = async () => {
    if (!projectData) return;
    setIsAnalyzing(true);
    addTask('Auditing Plot Threads');
    try {
      const threads = await auditPlotThreads(projectData.chapters || [], projectData.timeline);
      await updateProjectData({ aiDeadThreads: threads });
    } catch (err) {
      console.error("Audit failed", err);
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
    } catch (err) {
      console.error("Scan failed", err);
    } finally {
      setIsAnalyzing(false);
      removeTask('Continuity Audit');
    }
  };

  const handleExtractSoftAnchors = async () => {
    // Soft anchor extraction logic (previously in App.tsx)
    if (!projectData) return;
    setIsAnalyzing(true);
    addTask('Extracting Soft Anchors');
    try {
      const res = await fetchWithAuth('/api/narrative/soft-anchors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manuscript: projectData.manuscript, existingTimeline: projectData.timeline })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.anchors) {
          await updateProjectData({ timeline: [...projectData.timeline, ...data.anchors] });
        }
      }
    } catch (err) {
      console.error("Anchor extraction failed", err);
    } finally {
      setIsAnalyzing(false);
      removeTask('Extracting Soft Anchors');
    }
  };

  const handleDoubleProcessNote = async (noteId: string) => {
    if (!projectData) return;
    const note = [...projectData.notes, ...globalNotes].find(n => n.id === noteId);
    if (!note) return;

    addTask('Deep Processing Note');
    try {
      const res = await fetchWithAuth('/api/narrative/deep-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note, projectContext: projectData.summary })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.expanded) {
          const updatedNote = { ...note, expandedContent: data.expanded, metaSummary: data.summary };
          if (projectData.notes.some(n => n.id === noteId)) {
            await updateProjectData({ notes: projectData.notes.map(n => n.id === noteId ? updatedNote : n) });
          } else {
            const updatedGlobal = globalNotes.map(n => n.id === noteId ? updatedNote : n);
            setGlobalNotes(updatedGlobal);
            await saveAllGlobalNotes(updatedGlobal);
          }
        }
      }
    } catch (err) {
      console.error("Deep process failed", err);
    } finally {
      removeTask('Deep Processing Note');
    }
  };

  const handleDeleteNote = useCallback(async (id: string) => {
    // 1. Delete from Global Notes (Notepad)
    if (globalNotes.some(n => n.id === id)) {
      const updated = globalNotes.filter(n => n.id !== id);
      setGlobalNotes(updated);
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
  }, [globalNotes, projectData, updateProjectData, setGlobalNotes]);

  const handleAddIdeaToProject = useCallback(async (idea: Idea) => {
    if (!projectData) return;
    await updateProjectData({ ideas: [idea, ...(projectData.ideas || [])] });
  }, [projectData, updateProjectData]);

  const handleToggleCanon = useCallback(async (id: string) => {
    if (projectData) {
      await updateProjectData({ 
        notes: projectData.notes.map(n => n.id === id ? { ...n, isCanon: !n.isCanon } : n) 
      });
    } else {
      // Toggle in global notes
      const note = globalNotes.find(n => n.id === id);
      if (note) {
        const updatedNote = { ...note, isCanon: !note.isCanon };
        const updatedNotes = globalNotes.map(n => n.id === id ? updatedNote : n);
        setGlobalNotes(updatedNotes);
        await saveGlobalNote(updatedNote);
      }
    }
  }, [projectData, updateProjectData, globalNotes, setGlobalNotes]);

  const handleQuickUpdate = useCallback((type: string, id: string, key: string, value: any) => {
    if (!projectData) return;

    const mapTypeToKey: Record<string, string> = {
      'Character': 'characters', 'Location': 'locations', 'Timeline': 'timeline',
      'Source': 'sources', 'Artifact': 'artifacts', 'Lore': 'lore'
    };

    const projectKey = mapTypeToKey[type];
    if (!projectKey) return;

    const prevList = (projectData as any)[projectKey] || [];
    const index = prevList.findIndex((item: any) => item.id === id);
    if (index !== -1) {
      const newList = [...prevList];
      newList[index] = { ...newList[index], [key]: value };
      updateProjectData({ [projectKey]: newList });
    }
  }, [projectData, updateProjectData]);

  const handleExtractRelationships = async () => {
    if (!projectData) return;
    setIsAnalyzing(true);
    addTask('Analyzing Relationships');
    try {
      const chars = projectData.characters || [];
      if (chars.length < 2) throw new Error('Need at least 2 characters');

      const text = (projectData.chapters || []).map(c => c.content).join('\n\n') + '\n\n' + (projectData.notes || []).map(n => n.content).join('\n\n');
      const rels: any[] = [];
      
      if (text.trim().length > 0) {
        const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
        for (const para of paragraphs) {
          const lowerPara = para.toLowerCase();
          const mentionedChars = chars.filter(c => lowerPara.includes(c.name.toLowerCase()));
          for (let i = 0; i < mentionedChars.length; i++) {
            for (let j = i + 1; j < mentionedChars.length; j++) {
              const id1 = mentionedChars[i].id;
              const id2 = mentionedChars[j].id;
              if (!rels.some(r => (r.sourceId === id1 && r.targetId === id2) || (r.sourceId === id2 && r.targetId === id1))) {
                rels.push({ sourceId: id1, targetId: id2, type: 'connected', notes: 'Mentioned together' });
              }
            }
          }
        }
      }
      
      if (rels.length > 0) {
        const existing = projectData.relationships || [];
        const newRels = rels.filter(nr => !existing.some(er => er.sourceId === nr.sourceId && er.targetId === nr.targetId));
        if (newRels.length > 0) {
          await updateProjectData({ relationships: [...existing, ...newRels] });
        }
      }
    } catch (err) {
      console.error("Relationship extraction failed", err);
    } finally {
      setIsAnalyzing(false);
      removeTask('Analyzing Relationships');
    }
  };

  return {
    projectsMetadata,
    projectData,
    setProjectData,
    isRefreshingMetadata,
    refreshMetadata,
    updateProjectData,
    loadProject,
    handleManualSave,
    handleDeleteProject,
    handleEditProject,
    handleCreateProject,
    handleUploadProject,
    handleRestoreCommit,
    handleAuditThreads,
    handleScanContinuity,
    handleExtractSoftAnchors,
    handleDoubleProcessNote,
    handleDeleteNote,
    handleAddIdeaToProject,
    handleToggleCanon,
    handleQuickUpdate,
    handleExtractRelationships
  };
}
