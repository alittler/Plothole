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

  // 4. manifest.yaml
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
    }
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
// DIFFERENTIAL SYNC LOGIC
// ==========================================

export const generateManuscriptDiff = (oldText: string, newText: string): string => {
  const timestamp = new Date().toISOString();
  const patch = Diff.createPatch('manuscript.md', oldText, newText);
  return `\n--- UPDATED: ${timestamp} ---\n${patch}\n`;
};

// Existing persistence methods (simplified for transition)
export const saveProjectData = async (data: ProjectData): Promise<void> => {
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
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const req = tx.objectStore(STORE_PROJECTS).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
};

export const getAllProjectsMetadata = async (): Promise<ProjectMetadata[]> => {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_METADATA, 'readonly');
    const req = tx.objectStore(STORE_METADATA).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
};

export const deleteProject = async (id: string): Promise<void> => {
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
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_GLOBALS, 'readonly');
    const req = tx.objectStore(STORE_GLOBALS).get('app_settings');
    req.onsuccess = () => resolve(req.result?.data || null);
    req.onerror = () => resolve(null);
  });
};

export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_GLOBALS, 'readwrite');
    tx.objectStore(STORE_GLOBALS).put({ id: 'app_settings', data: settings });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getAppPrompts = async (): Promise<AppPrompts | null> => {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_GLOBALS, 'readonly');
    const req = tx.objectStore(STORE_GLOBALS).get('app_prompts');
    req.onsuccess = () => resolve(req.result?.data || null);
    req.onerror = () => resolve(null);
  });
};

export const saveAppPrompts = async (prompts: AppPrompts): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_GLOBALS, 'readwrite');
    tx.objectStore(STORE_GLOBALS).put({ id: 'app_prompts', data: prompts });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getAllGlobalNotes = async (): Promise<Note[]> => {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_GLOBALS, 'readonly');
    const req = tx.objectStore(STORE_GLOBALS).get('global_notes');
    req.onsuccess = () => resolve(req.result?.data || []);
    req.onerror = () => resolve([]);
  });
};

export const saveGlobalNote = async (note: Note): Promise<void> => {
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
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_GLOBALS, 'readonly');
    const req = tx.objectStore(STORE_GLOBALS).get(`api_key_${name}`);
    req.onsuccess = () => resolve(req.result?.data || null);
    req.onerror = () => resolve(null);
  });
};

export const saveApiKey = async (name: string, key: string): Promise<void> => {
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
    notes: [],
    themes: [],
    calendars: []
  };
};
