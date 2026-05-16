import { ProjectData, ProjectMetadata, Note, APP_DATA_VERSION, HierarchicalEntity, EntityTier, ProjectManifest, AssetMetadata, AppSettings, AppPrompts, ToolboxLink } from '../types';
import JSZip from 'jszip';
import yaml from 'js-yaml';
import * as Diff from 'diff';

const DB_NAME = 'PlotholeHierarchicalDB';
const STORE_PROJECTS = 'projects';
const STORE_METADATA = 'metadata';
const STORE_GLOBALS = 'globals';

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    // Increment version to 3 to force update
    const request = indexedDB.open(DB_NAME, 3);
    request.onupgradeneeded = (event: any) => {
      const db = request.result;
      
      // Clear existing if needed or just create new
      if (db.objectStoreNames.contains(STORE_PROJECTS)) db.deleteObjectStore(STORE_PROJECTS);
      if (db.objectStoreNames.contains(STORE_METADATA)) db.deleteObjectStore(STORE_METADATA);
      if (db.objectStoreNames.contains(STORE_GLOBALS)) db.deleteObjectStore(STORE_GLOBALS);

      db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      db.createObjectStore(STORE_METADATA, { keyPath: 'id' });
      db.createObjectStore(STORE_GLOBALS, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const generateId = (length: number = 12) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// ==========================================
// TIERED ENTITY CONVERSION LOGIC
// ==========================================

export const convertToTieredEntity = (raw: any, type: string, allLocations: any[]): HierarchicalEntity => {
  const name = raw.name || raw.label || raw.term || 'Untitled';
  const description = raw.description || raw.definition || '';
  const species = raw.species || raw.type || 'Unknown';
  
  // Determine Tier based on data density
  let tier: EntityTier = 3;
  if (description.length > 200 || raw.history || raw.goals || raw.motivation) {
    tier = 1;
  } else if (description.length > 50 || raw.traits?.length > 0 || raw.primary_trait) {
    tier = 2;
  }

  // Clean ID
  const idPrefix = type.slice(0, 3).toUpperCase();
  const safeName = name.toUpperCase().replace(/[^A-Z0-9]/g, '-');
  const id = `${idPrefix}-${safeName}`;

  const entity: HierarchicalEntity = {
    id,
    name,
    tier,
    species,
    type,
    description: tier === 3 ? undefined : description
  };

  // Tier 1: Core
  if (tier === 1) {
    entity.motivation = raw.motivation || raw.goals || '';
    entity.conflict = raw.conflict || raw.internal_conflict || '';
    entity.aliases = raw.aliases || [];
  }

  // Tier 2: Supporting
  if (tier <= 2) {
    entity.primary_trait = raw.primary_trait || (raw.traits?.[0]) || '';
    
    // Normalize Reference: Replace location mentions with LOC_ID
    let locId = raw.location_id || raw.associatedLocationId;
    if (!locId && raw.description) {
      const mentionedLoc = allLocations.find(l => raw.description.includes(l.name));
      if (mentionedLoc) locId = `LOC-${mentionedLoc.name.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`;
    }
    entity.location_id = locId;

    // Schema.org/Person mapping
    if (type === 'Character') {
      entity.givenName = raw.givenName;
      entity.familyName = raw.familyName;
      entity.honorificPrefix = raw.honorificPrefix;
      entity.honorificSuffix = raw.honorificSuffix;
      entity.jobTitle = raw.jobTitle || raw.job;
      entity.birthDate = raw.birthDate;
      entity.deathDate = raw.deathDate;
      entity.birthPlace = raw.birthPlace || raw.birthplace;
      entity.homeLocation = raw.homeLocation || raw.residence;
      entity.gender = raw.gender;
      entity.nationality = raw.nationality;
      entity.affiliation = raw.affiliation;
      entity.knowsAbout = raw.knowsAbout;
    }

    if (type === 'Timeline' || type === 'Event') {
      entity.startDate = raw.startDate || raw.date;
      entity.endDate = raw.endDate;
      entity.eventStatus = raw.eventStatus;
      entity.attendees = raw.attendees || raw.charactersInvolved;
      entity.duration = raw.duration;
    }

    if (type === 'Lore') {
      entity.prefLabel = raw.prefLabel || raw.term;
      entity.altLabel = raw.altLabel;
      entity.broader = raw.broader;
      entity.narrower = raw.narrower;
      entity.related = raw.related;
      entity.scopeNote = raw.scopeNote;
    }

    if (type === 'Source') {
      entity.dc_creator = raw.dc_creator || raw.author;
      entity.dc_publisher = raw.dc_publisher || raw.publisher;
      entity.dc_title = raw.dc_title || raw.name;
      entity.dc_date = raw.dc_date || (raw.publicationYear ? String(raw.publicationYear) : undefined);
      entity.bibtex_type = raw.bibtex_type;
      entity.bibtex_journal = raw.bibtex_journal;
      entity.bibtex_volume = raw.bibtex_volume || raw.volume;
      entity.bibtex_number = raw.bibtex_number || raw.issue;
      entity.bibtex_pages = raw.bibtex_pages || raw.pages;
    }
  }

  return entity;
};

// ==========================================
// MODULAR EXPORT ENGINE
// ==========================================

export const exportProjectPlothole = async (project: ProjectData) => {
  const zip = new JSZip();
  const timestamp = new Date().toISOString();

  // 1. /database/entities.yaml
  const allLocations = project.locations || [];
  const entities: HierarchicalEntity[] = [
    ...(project.characters || []).map(c => convertToTieredEntity(c, 'Character', allLocations)),
    ...(project.locations || []).map(l => convertToTieredEntity(l, 'Location', allLocations)),
    ...(project.artifacts || []).map(a => convertToTieredEntity(a, 'Item', allLocations))
  ];
  zip.folder('database')?.file('entities.yaml', yaml.dump({ entities }));

  // 2. /source/manuscript.md
  const manuscript = project.latestManuscriptText || project.manuscript || '';
  zip.folder('source')?.file('manuscript.md', manuscript);

  // 3. history.diff
  const diffContent = `\n===================================================================\n` +
                      `Baseline Established: ${timestamp}\n` +
                      `===================================================================\n`;
  zip.file('history.diff', diffContent);

  // 4. manifest.yaml with referenced_notes
  // Collect notes linked to this project's entities or with project-relevant tags
  const referencedNotes = (project.notes || []).map(note => ({
    origin_id: note.id || generateId(8),
    content: note.content,
    sync_status: 'synced' as const,
    last_vault_sync: timestamp,
    note_type: (note.note_type || 'global') as 'global' | 'ephemeral',
    tags: note.tags || [],
    anchor_target: note.anchor_target || null
  }));

  const manifest: ProjectManifest = {
    id: project.id,
    title: project.title,
    author: project.author || 'Unknown',
    version: '2.0.0 (Modular)',
    created_at: timestamp,
    last_modified: timestamp,
    summary: project.summary,
    counts: {
      entities: entities.length,
      tier1: entities.filter(e => e.tier === 1).length,
      tier2: entities.filter(e => e.tier === 2).length,
      tier3: entities.filter(e => e.tier === 3).length,
      assets: 0,
      word_count: manuscript.split(/\s+/).length
    },
    referenced_notes: referencedNotes.length > 0 ? referencedNotes : undefined
  };
  zip.file('manifest.yaml', yaml.dump(manifest));

  // 5. /assets/ & sidecar.yaml
  const assets: AssetMetadata[] = [];
  zip.folder('assets')?.file('sidecar.yaml', yaml.dump({ assets }));

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${project.title.replace(/\s+/g, '_')}_Modular.plothole`;
  link.click();
  
  return { manifest, entityCount: entities.length };
};

export const exportProjectModular = exportProjectPlothole;

// ==========================================
// VAULT EXPORT/IMPORT (NEW BACKUP SYSTEM)
// ==========================================

interface VaultManifest {
  version: string;
  vault_id: string;
  author: string;
  created: string;
  modified: string;
  statistics: {
    note_count: number;
    tag_count: number;
    books: number;
  };
  books: Array<{
    id: string;
    title: string;
    last_backup: string;
  }>;
}

export const exportVaultAsZip = async (
  globalNotes: Note[],
  vaultId: string = 'vault_' + generateId(8),
  author: string = 'Unknown Author',
  projectsMetadata: ProjectMetadata[] = []
) => {
  const zip = new JSZip();
  const timestamp = new Date().toISOString();

  // 1. Create account/ folder with notes.yaml
  const accountFolder = zip.folder('account');
  
  // Prepare notes with unique IDs
  const notesData = globalNotes.map(note => ({
    id: note.id || generateId(8),
    content: note.content,
    created: note.created || timestamp,
    modified: note.modified || timestamp,
    tags: note.tags || [],
    anchor_target: note.anchor_target || null,
    note_type: note.note_type || 'global'
  }));

  accountFolder?.file('notes.yaml', yaml.dump({ notes: notesData }));

  // 2. Create tags.yaml (extract unique tags from notes)
  const uniqueTags = new Set<string>();
  globalNotes.forEach(note => {
    (note.tags || []).forEach(tag => uniqueTags.add(tag));
  });
  const tagsData = Array.from(uniqueTags).map(tag => ({
    id: generateId(8),
    name: tag,
    color: '#6366f1'
  }));
  accountFolder?.file('tags.yaml', yaml.dump({ tags: tagsData }));

  // 3. Create metadata.yaml
  accountFolder?.file('metadata.yaml', yaml.dump({
    vault_id: vaultId,
    author,
    created: timestamp,
    version: '1.0'
  }));

  // 4. Create manifest.yaml with book inventory
  const manifest: VaultManifest = {
    version: '1.0',
    vault_id: vaultId,
    author,
    created: timestamp,
    modified: timestamp,
    statistics: {
      note_count: globalNotes.length,
      tag_count: uniqueTags.size,
      books: projectsMetadata.length
    },
    books: projectsMetadata.map(proj => ({
      id: proj.id,
      title: proj.title,
      last_backup: proj.lastModified ? new Date(proj.lastModified).toISOString() : timestamp
    }))
  };
  zip.file('manifest.yaml', yaml.dump(manifest));

  // 5. Create history.diff baseline
  const diffContent = `\n===================================================================\n` +
                      `Vault Baseline Established: ${timestamp}\n` +
                      `Author: ${author}\n` +
                      `Notes: ${globalNotes.length}\n` +
                      `===================================================================\n`;
  zip.file('history.diff', diffContent);

  // Generate and download
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${author.replace(/\s+/g, '_')}_Vault.pvoid`;
  link.click();
  URL.revokeObjectURL(url);

  return { manifest, noteCount: globalNotes.length };
};

interface VaultData {
  manifest: VaultManifest;
  notes: Array<{
    id: string;
    content: string;
    tags: string[];
    anchor_target: string | null;
    note_type: 'global' | 'ephemeral';
  }>;
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

export const importVaultFromZip = async (blob: Blob): Promise<VaultData> => {
  const zip = await JSZip.loadAsync(blob);

  // Load manifest
  const manifestRaw = await zip.file('manifest.yaml')?.async('text');
  const manifest = yaml.load(manifestRaw || '') as VaultManifest;

  // Load notes
  const notesRaw = await zip.file('account/notes.yaml')?.async('text');
  const { notes } = (yaml.load(notesRaw || '') || { notes: [] }) as { notes: any[] };

  // Load tags
  const tagsRaw = await zip.file('account/tags.yaml')?.async('text');
  const { tags } = (yaml.load(tagsRaw || '') || { tags: [] }) as { tags: any[] };

  return {
    manifest,
    notes: notes.map(note => ({
      id: note.id || generateId(8),
      content: note.content,
      tags: note.tags || [],
      anchor_target: note.anchor_target || null,
      note_type: note.note_type || 'global'
    })),
    tags: tags || []
  };
};

// ==========================================
// DIFFERENTIAL SYNC LOGIC
// ==========================================

export const generateManuscriptDiff = (oldText: string, newText: string): string => {
  const timestamp = new Date().toISOString();
  const patch = Diff.createPatch('manuscript.md', oldText, newText);
  return `\n--- UPDATED: ${timestamp} ---\n${patch}\n`;
};

// ==========================================
// STORAGE CONFIGURATION
// ==========================================

let useCloudStorage = false;
let serverHealthy = true;
let authFetch: ((url: string, options?: RequestInit) => Promise<Response>) | null = null;

export const setCloudStorageEnabled = (enabled: boolean, fetchFn: typeof authFetch) => {
  useCloudStorage = enabled;
  authFetch = fetchFn;
};

export const setServerHealth = (healthy: boolean) => {
  serverHealthy = healthy;
};

export const isCloudStorageActive = () => useCloudStorage && serverHealthy;

// Existing persistence methods (wrapped for Cloud support)
export const saveProjectData = async (data: ProjectData): Promise<void> => {
  if (useCloudStorage && authFetch) {
    try {
      const res = await authFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to save to cloud');
      // Wait a tiny bit for the DB transaction to fully commit before resolving
      await new Promise(resolve => setTimeout(resolve, 100));
      return;
    } catch (e) {
      console.error("Cloud save failed, falling back to local:", e);
      setServerHealth(false);
    }
  }

  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PROJECTS, STORE_METADATA], 'readwrite');
    tx.objectStore(STORE_PROJECTS).put({ ...data, lastModified: Date.now() });
    
    // Also update metadata for quick access
    const meta: ProjectMetadata = {
      id: data.id,
      title: data.title,
      author: data.author || '',
      summary: data.summary,
      lastModified: Date.now(),
      characterCount: data.entities?.filter(e => e.type === 'Character').length || data.characters?.length || 0,
      locationCount: data.entities?.filter(e => e.type === 'Location').length || data.locations?.length || 0,
      commitCount: data.commits?.length || 0,
      backupCount: data.backups?.length || 0,
      wordCount: data.wordCount || 0
    };
    tx.objectStore(STORE_METADATA).put(meta);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const loadProjectById = async (id: string): Promise<ProjectData | null> => {
  if (useCloudStorage && authFetch) {
    try {
      const res = await authFetch('/api/projects');
      if (res.ok) {
        const projects: ProjectData[] = await res.json();
        const cloudProj = projects.find(p => p.id === id);
        if (cloudProj) return cloudProj;
      }
    } catch (e) {
      console.error("Cloud load failed:", e);
    }
  }

  // Fallback to local
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const req = tx.objectStore(STORE_PROJECTS).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
};

export const getAllProjectsMetadata = async (): Promise<ProjectMetadata[]> => {
  let cloudProjects: ProjectMetadata[] = [];
  
  if (useCloudStorage && authFetch) {
    try {
      console.log("[Storage] Fetching cloud projects...");
      const res = await authFetch('/api/projects');
      if (res.ok) {
        const projects: ProjectData[] = await res.json();
        console.log(`[Storage] Cloud fetch success: ${projects.length} projects`);
        cloudProjects = projects.map(data => ({
          id: data.id,
          title: data.title,
          author: data.author || '',
          summary: data.summary,
          lastModified: data.lastModified || Date.now(),
          characterCount: data.entities?.filter(e => e.type === 'Character').length || data.characters?.length || 0,
          locationCount: data.entities?.filter(e => e.type === 'Location').length || data.locations?.length || 0,
          commitCount: data.commits?.length || 0,
          backupCount: data.backups?.length || 0,
          wordCount: data.wordCount || 0,
          origin: 'cloud'
        }));
      } else {
        console.warn(`[Storage] Cloud fetch failed with status: ${res.status}`);
      }
    } catch (e) {
      console.error("[Storage] Cloud metadata fetch error:", e);
    }
  } else {
    console.log(`[Storage] Skipping cloud fetch. useCloudStorage: ${useCloudStorage}, hasAuthFetch: ${!!authFetch}`);
  }

  const db = await getDB();
  const localProjects: ProjectMetadata[] = await new Promise((resolve) => {
    const tx = db.transaction(STORE_METADATA, 'readonly');
    const req = tx.objectStore(STORE_METADATA).getAll();
    req.onsuccess = () => {
      const results = (req.result || []).map((m: ProjectMetadata) => ({ ...m, origin: 'local' as const }));
      resolve(results);
    };
    req.onerror = () => resolve([]);
  });

  // Merge: Cloud versions take precedence for the same ID
  const merged = [...cloudProjects];
  for (const local of localProjects) {
    if (!merged.some(c => c.id === local.id)) {
      merged.push(local);
    }
  }

  return merged.sort((a, b) => b.lastModified - a.lastModified);
};

export const deleteProject = async (id: string): Promise<void> => {
  if (useCloudStorage && authFetch) {
    try {
      const res = await authFetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Cloud delete failed');
    } catch (e) {
      console.error("Cloud delete failed, attempting local delete:", e);
    }
  }

  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PROJECTS, STORE_METADATA], 'readwrite');
    tx.objectStore(STORE_PROJECTS).delete(id);
    tx.objectStore(STORE_METADATA).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// Real SHA-256 hash for integrity checks
export const generateSHA256 = async (str: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const getAppSettings = async (): Promise<AppSettings | null> => {
  if (useCloudStorage && authFetch) {
    try {
      const res = await authFetch('/api/globals/app_settings');
      if (res.ok) return await res.json();
    } catch (e) { /* ignore fallback */ }
  }

  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_GLOBALS, 'readonly');
    const req = tx.objectStore(STORE_GLOBALS).get('app_settings');
    req.onsuccess = () => resolve(req.result?.data || null);
    req.onerror = () => resolve(null);
  });
};

export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
  if (useCloudStorage && authFetch) {
    try {
      const res = await authFetch('/api/globals/app_settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!res.ok) setServerHealth(false);
    } catch (e) { 
      setServerHealth(false);
    }
  }

  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_GLOBALS, 'readwrite');
    tx.objectStore(STORE_GLOBALS).put({ id: 'app_settings', data: settings });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getAppPrompts = async (): Promise<AppPrompts | null> => {
  if (useCloudStorage && authFetch) {
    try {
      const res = await authFetch('/api/globals/app_prompts');
      if (res.ok) return await res.json();
    } catch (e) { /* ignore fallback */ }
  }

  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_GLOBALS, 'readonly');
    const req = tx.objectStore(STORE_GLOBALS).get('app_prompts');
    req.onsuccess = () => resolve(req.result?.data || null);
    req.onerror = () => resolve(null);
  });
};

export const saveAppPrompts = async (prompts: AppPrompts): Promise<void> => {
  if (useCloudStorage && authFetch) {
    try {
      const res = await authFetch('/api/globals/app_prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompts)
      });
      if (!res.ok) setServerHealth(false);
    } catch (e) { 
      setServerHealth(false);
    }
  }

  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_GLOBALS, 'readwrite');
    tx.objectStore(STORE_GLOBALS).put({ id: 'app_prompts', data: prompts });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getAllGlobalNotes = async (): Promise<Note[]> => {
  if (useCloudStorage && authFetch) {
    try {
      const res = await authFetch('/api/notes');
      if (res.ok) return await res.json();
    } catch (e) { /* ignore fallback */ }
  }

  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_GLOBALS, 'readonly');
    const req = tx.objectStore(STORE_GLOBALS).get('global_notes');
    req.onsuccess = () => resolve(req.result?.data || []);
    req.onerror = () => resolve([]);
  });
};

export const saveGlobalNote = async (note: Note): Promise<void> => {
  if (useCloudStorage && authFetch) {
    try {
      const res = await authFetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note)
      });
      if (res.ok) {
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        setServerHealth(false);
      }
      return;
    } catch (e) { 
      setServerHealth(false);
    }
  }

  const notes = await getAllGlobalNotes();
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_GLOBALS, 'readwrite');
    tx.objectStore(STORE_GLOBALS).put({ id: 'global_notes', data: [...notes, note] });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const deleteGlobalNote = async (id: string): Promise<void> => {
  // Cloud deletion for single notes not yet implemented in API explicitly, 
  // but saveGlobalNote handles individual updates. 
  // For now we rely on the client-side array management + saveGlobalNote.
  
  const notes = await getAllGlobalNotes();
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_GLOBALS, 'readwrite');
    tx.objectStore(STORE_GLOBALS).put({ id: 'global_notes', data: notes.filter(n => n.id !== id) });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};


export const clearAllGlobalNotes = async (): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_GLOBALS, 'readwrite');
    tx.objectStore(STORE_GLOBALS).put({ id: 'global_notes', data: [] });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getApiKey = async (name: string): Promise<string | null> => {
  if (useCloudStorage && authFetch) {
    try {
      const res = await authFetch(`/api/globals/api_key_${name}`);
      if (res.ok) {
        const data = await res.json();
        return data.key || data;
      }
    } catch (e) { /* fallback */ }
  }

  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_GLOBALS, 'readonly');
    const req = tx.objectStore(STORE_GLOBALS).get(`api_key_${name}`);
    req.onsuccess = () => resolve(req.result?.data || null);
    req.onerror = () => resolve(null);
  });
};

export const saveApiKey = async (name: string, key: string): Promise<void> => {
  if (useCloudStorage && authFetch) {
    try {
      const res = await authFetch(`/api/globals/api_key_${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });
      if (!res.ok) setServerHealth(false);
    } catch (e) { 
      setServerHealth(false);
    }
  }

  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_GLOBALS, 'readwrite');
    tx.objectStore(STORE_GLOBALS).put({ id: `api_key_${name}`, data: key });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getAllGlobalResources = async (): Promise<ToolboxLink[]> => {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_GLOBALS, 'readonly');
    const req = tx.objectStore(STORE_GLOBALS).get('global_resources');
    req.onsuccess = () => resolve(req.result?.data || []);
    req.onerror = () => resolve([]);
  });
};

export const saveGlobalResource = async (link: ToolboxLink): Promise<void> => {
  const links = await getAllGlobalResources();
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_GLOBALS, 'readwrite');
    tx.objectStore(STORE_GLOBALS).put({ id: 'global_resources', data: [...links, link] });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const deleteGlobalResource = async (id: string): Promise<void> => {
  const links = await getAllGlobalResources();
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_GLOBALS, 'readwrite');
    tx.objectStore(STORE_GLOBALS).put({ id: 'global_resources', data: links.filter(l => l.id !== id) });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const clearDatabase = async (): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PROJECTS, STORE_GLOBALS, STORE_METADATA], 'readwrite');
    tx.objectStore(STORE_PROJECTS).clear();
    tx.objectStore(STORE_GLOBALS).clear();
    tx.objectStore(STORE_METADATA).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const exportFullArchive = async (globalNotes: Note[]) => {
  const zip = new JSZip();
  const projects = await getAllProjectsMetadata();
  zip.file('full_archive.json', JSON.stringify({ projects, globalNotes }, null, 2));
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'full_archive.zip';
  link.click();
};

/**
 * Unpacks a .plothole ZIP blob into ProjectData
 */
export const unpackProject = async (blob: Blob): Promise<ProjectData> => {
  const zip = await JSZip.loadAsync(blob);
  
  const manifestRaw = await zip.file('manifest.yaml')?.async('text');
  const manifest = yaml.load(manifestRaw || '') as ProjectManifest;
  
  const raw_data = await zip.file('source/manuscript.md')?.async('text') || '';
  
  const entitiesRaw = await zip.file('database/entities.yaml')?.async('text');
  const { entities } = (yaml.load(entitiesRaw || '') || { entities: [] }) as { entities: HierarchicalEntity[] };
  
  const history_diff = await zip.file('history.diff')?.async('text') || '';
  
  const sidecarRaw = await zip.file('assets/sidecar.yaml')?.async('text');
  const { assets } = (yaml.load(sidecarRaw || '') || { assets: [] }) as { assets: AssetMetadata[] };

  // Load referenced notes from manifest
  const restoredNotes: Note[] = (manifest.referenced_notes || []).map(refNote => ({
    id: refNote.origin_id,
    content: refNote.content,
    tags: refNote.tags,
    anchor_target: refNote.anchor_target,
    note_type: refNote.note_type,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    timestamp: Date.now()
  }));

  return {
    manifest,
    entities,
    manuscript: raw_data,
    history_diff,
    assets,
    id: manifest.id,
    title: manifest.title,
    author: manifest.author,
    summary: manifest.summary,
    lastModified: new Date(manifest.last_modified).getTime(),
    characters: [],
    locations: [],
    timeline: [],
    relationships: [],
    notes: restoredNotes,
    themes: []
  };
};
