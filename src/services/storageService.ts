import { ProjectData, ProjectMetadata, Note, APP_DATA_VERSION, BackupFile, ToolboxLink, AppPrompts, ManuscriptHistoryEntry } from '../types';
import JSZip from 'jszip';

const DB_NAME = 'NovelNexusDB';
const STORE_NAME = 'projects';
const NOTEBOOK_STORE = 'notebook';
const GLOBALS_STORE = 'app_globals';
const DB_VERSION = 4;

let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
  console.log('storageService: getDB called');
  if (dbPromise) {
    console.log('storageService: returning existing dbPromise');
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    console.log('storageService: Opening IndexedDB', DB_NAME, DB_VERSION);
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      console.log('storageService: onupgradeneeded');
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(NOTEBOOK_STORE)) db.createObjectStore(NOTEBOOK_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(GLOBALS_STORE)) db.createObjectStore(GLOBALS_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => {
      console.log('storageService: IndexedDB opened successfully');
      resolve(request.result);
    };
    request.onerror = () => { 
      console.error('storageService: IndexedDB error', request.error);
      dbPromise = null; 
      reject(request.error); 
    };
    request.onblocked = () => {
      console.error('storageService: IndexedDB blocked');
    };
  });
  return dbPromise;
};

// Backend Sync Helpers
let authToken: string | null = null;
export const setAuthToken = (token: string | null) => { authToken = token; };

const apiFetch = async (path: string, options: RequestInit = {}) => {
  if (!authToken) return null;
  const res = await fetch(path, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) return null;
  return res.json();
};

export const generateId = () => crypto.randomUUID();

// Simple string hash for integrity checks
const generateHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

export const getApiKey = async (name: string): Promise<string | null> => {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(GLOBALS_STORE, 'readonly');
    const req = tx.objectStore(GLOBALS_STORE).get(name);
    req.onsuccess = () => resolve(req.result?.data || null);
    req.onerror = () => resolve(null);
  });
};

export const saveApiKey = async (name: string, key: string): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GLOBALS_STORE, 'readwrite');
    tx.objectStore(GLOBALS_STORE).put({ id: name, data: key });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getAppPrompts = async (): Promise<Partial<AppPrompts> | null> => {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(GLOBALS_STORE, 'readonly');
    const req = tx.objectStore(GLOBALS_STORE).get('app_prompts');
    req.onsuccess = () => resolve(req.result?.data || null);
    req.onerror = () => resolve(null);
  });
};

export const saveAppPrompts = async (prompts: AppPrompts): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GLOBALS_STORE, 'readwrite');
    tx.objectStore(GLOBALS_STORE).put({ id: 'app_prompts', data: prompts });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getAllGlobalResources = async (): Promise<ToolboxLink[]> => {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(GLOBALS_STORE, 'readonly');
    const req = tx.objectStore(GLOBALS_STORE).getAll();
    req.onsuccess = () => {
      const links = (req.result || []).filter((item: any) => item.id !== 'app_prompts');
      resolve(links);
    };
  });
};

export const saveGlobalResource = async (link: ToolboxLink): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GLOBALS_STORE, 'readwrite');
    tx.objectStore(GLOBALS_STORE).put(link);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const deleteGlobalResource = async (id: string): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GLOBALS_STORE, 'readwrite');
    tx.objectStore(GLOBALS_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const saveProjectData = async (data: ProjectData): Promise<void> => {
  const db = await getDB();
  // Local Save
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ ...data, lastModified: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  // Remote Sync
  if (authToken) {
    await apiFetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};

export const loadProjectById = async (id: string): Promise<ProjectData | null> => {
  // Try local first
  const db = await getDB();
  const local: ProjectData | null = await new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
  if (local) return local;

  // Try remote
  if (authToken) {
    const remote = await apiFetch(`/api/projects/${id}`);
    if (remote) {
      await saveProjectData(remote); // Cache locally
      return remote;
    }
  }
  return null;
};

export const deleteProject = async (id: string): Promise<void> => {
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  if (authToken) {
    await apiFetch(`/api/projects/${id}`, { method: 'DELETE' });
  }
};

export const getAllProjectsMetadata = async (): Promise<ProjectMetadata[]> => {
  // Sync from remote first if possible
  if (authToken) {
    const remoteProjects = await apiFetch('/api/projects');
    if (remoteProjects && Array.from(remoteProjects).length > 0) {
      const db = await getDB();
      for (const p of remoteProjects) {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(p);
      }
    }
  }

  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      const projs = req.result as ProjectData[];
      resolve(projs.map(p => ({ 
        id: p.id, 
        title: p.title, 
        author: p.author || '', 
        summary: p.summary, 
        lastModified: p.lastModified, 
        characterCount: p.characters?.length || 0, 
        locationCount: p.locations?.length || 0,
        coverImage: p.coverImage
      })));
    };
    req.onerror = () => resolve([]);
  });
};

export const getAllGlobalNotes = async (): Promise<Note[]> => {
  if (authToken) {
    const remoteNotes = await apiFetch('/api/notes');
    if (remoteNotes) {
      const db = await getDB();
      for (const n of remoteNotes) {
        const tx = db.transaction(NOTEBOOK_STORE, 'readwrite');
        tx.objectStore(NOTEBOOK_STORE).put(n);
      }
    }
  }

  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(NOTEBOOK_STORE, 'readonly');
    const req = tx.objectStore(NOTEBOOK_STORE).getAll();
    req.onsuccess = () => { 
      const notes = req.result as Note[]; 
      notes.sort((a,b)=>b.timestamp-a.timestamp); 
      resolve(notes || []); 
    };
    req.onerror = () => resolve([]);
  });
};

export const saveGlobalNote = async (note: Note): Promise<void> => {
  const db = await getDB();
  await new Promise<void>((resolve, reject) => { 
    const tx = db.transaction(NOTEBOOK_STORE, 'readwrite');
    tx.objectStore(NOTEBOOK_STORE).put(note); 
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  if (authToken) {
    await apiFetch('/api/notes', {
      method: 'POST',
      body: JSON.stringify(note)
    });
  }
};

export const deleteGlobalNote = async (id: string): Promise<void> => {
    const db = await getDB();
    return new Promise((resolve, reject) => { 
      const tx = db.transaction(NOTEBOOK_STORE, 'readwrite');
      tx.objectStore(NOTEBOOK_STORE).delete(id); 
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
};

export const clearDatabase = async (): Promise<void> => {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME, NOTEBOOK_STORE, GLOBALS_STORE], 'readwrite');
        tx.objectStore(STORE_NAME).clear(); 
        tx.objectStore(NOTEBOOK_STORE).clear();
        tx.objectStore(GLOBALS_STORE).clear();
        tx.oncomplete = () => { dbPromise = null; resolve(); };
        tx.onerror = () => reject(tx.error);
    });
};

export const exportFullArchive = async (globalNotes: Note[]) => {
    const db = await getDB();
    const allProjects: ProjectData[] = await new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).getAll();
        req.onsuccess = () => resolve(req.result || []);
    });

    const zip = new JSZip();
    const dateStr = new Date().toISOString().split('T')[0];
    const fullRestoreObj = { version: APP_DATA_VERSION, timestamp: Date.now(), source: 'Plothole_System_Archive', allProjects, globalNotes };

    zip.file("full_system_restore.json", JSON.stringify(fullRestoreObj, null, 2));

    const projectsFolder = zip.folder("Projects");
    allProjects.forEach(p => {
        const safeTitle = p.title.replace(/[^a-z0-9]/gi, '_') || "Untitled_Project";
        const pFolder = projectsFolder?.folder(safeTitle);
        pFolder?.file("Project_Data.json", JSON.stringify(p, null, 2));

        if (p.manuscriptHistory && p.manuscriptHistory.length > 0) {
            const vaultFolder = pFolder?.folder("Manuscripts");
            const top5 = [...p.manuscriptHistory].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

            const manifest = top5.map(h => ({
                id: h.id,
                filename: h.filename,
                timestamp: h.timestamp,
                date: new Date(h.timestamp).toISOString(),
                hash: generateHash(h.content),
                wordCount: h.content.trim().split(/\s+/).length
            }));

            vaultFolder?.file("Vault_Manifest.json", JSON.stringify(manifest, null, 2));

            top5.forEach((m, idx) => {
                const dateTag = new Date(m.timestamp).toISOString().slice(0, 10);
                const hashTag = generateHash(m.content).slice(0, 8);
                const ext = m.filename.endsWith('.md') ? '.md' : '.txt';
                vaultFolder?.file(`${idx + 1}_${dateTag}_${hashTag}${ext}`, m.content);
            });
        }
    });

    const blob = await zip.generateAsync({type:"blob"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; 
    link.download = `Plothole_System_Archive_${dateStr}.zip`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
};
