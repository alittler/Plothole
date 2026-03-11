import { ProjectData, ProjectMetadata, Note, APP_DATA_VERSION, BackupFile, ToolboxLink, AppPrompts, AppSettings, ManuscriptHistoryEntry } from '../types';
import JSZip from 'jszip';

const DB_NAME = 'NovelNexusDB';
const STORE_NAME = 'projects';
const NOTEBOOK_STORE = 'notebook';
const GLOBALS_STORE = 'app_globals';
const DB_VERSION = 4;

let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(NOTEBOOK_STORE)) db.createObjectStore(NOTEBOOK_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(GLOBALS_STORE)) db.createObjectStore(GLOBALS_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { dbPromise = null; reject(request.error); };
  });
  return dbPromise;
};

export const generateId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => chars[b % chars.length]).join('');
};

// Real SHA-256 hash for integrity checks
export const generateSHA256 = async (str: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const getApiKey = async (keyName: string): Promise<string | null> => {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(GLOBALS_STORE, 'readonly');
    const req = tx.objectStore(GLOBALS_STORE).get(keyName);
    req.onsuccess = () => resolve(req.result?.data || null);
    req.onerror = () => resolve(null);
  });
};

export const saveApiKey = async (keyName: string, key: string): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GLOBALS_STORE, 'readwrite');
    tx.objectStore(GLOBALS_STORE).put({ id: keyName, data: key });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getAppSettings = async (): Promise<Partial<AppSettings> | null> => {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(GLOBALS_STORE, 'readonly');
    const req = tx.objectStore(GLOBALS_STORE).get('app_settings');
    req.onsuccess = () => resolve(req.result?.data || null);
    req.onerror = () => resolve(null);
  });
};

export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GLOBALS_STORE, 'readwrite');
    tx.objectStore(GLOBALS_STORE).put({ id: 'app_settings', data: settings });
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
      const links = (req.result || []).filter((item: any) => item.id !== 'app_prompts' && item.id !== 'app_settings');
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
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ ...data, lastModified: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const loadProjectById = async (id: string): Promise<ProjectData | null> => {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
};

export const deleteProject = async (id: string): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getAllProjectsMetadata = async (): Promise<ProjectMetadata[]> => {
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
        commitCount: p.commits?.length || 0,
        backupCount: p.backups?.length || 0,
        coverImage: p.coverImage
      })));
    };
    req.onerror = () => resolve([]);
  });
};

export const getAllGlobalNotes = async (): Promise<Note[]> => {
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
  return new Promise((resolve, reject) => { 
    const tx = db.transaction(NOTEBOOK_STORE, 'readwrite');
    tx.objectStore(NOTEBOOK_STORE).put(note); 
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
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

export const exportProjectPlothole = async (project: ProjectData, globalNotes?: Note[]) => {
    const zip = new JSZip();
    const safeTitle = project.title.replace(/[^a-z0-9]/gi, '_') || "Untitled_Project";
    const dateStr = new Date().toISOString().split('T')[0];
    
    // manifest.json - The brain of the file
    zip.file("manifest.json", JSON.stringify({
      id: project.id,
      title: project.title,
      author: project.author,
      summary: project.summary,
      lastModified: project.lastModified,
      uei: project.activeCalendarId,
      integrityHash: project.integrityHash,
      commits: project.commits?.length || 0,
      backups: project.backups?.length || 0
    }, null, 2));

    // Full project data for restoration
    zip.file("Project_Data.json", JSON.stringify(project, null, 2));

    // Global Notes / Notepad
    if (globalNotes && globalNotes.length > 0) {
      zip.file("global_notepad.json", JSON.stringify(globalNotes, null, 2));
    }

    // manuscript/ - Markdown versions
    const manuscriptFolder = zip.folder("manuscript");
    if (project.chapters && project.chapters.length > 0) {
      project.chapters.forEach((c, idx) => {
        manuscriptFolder?.file(`${idx + 1}_${c.title.replace(/\s+/g, '_')}.md`, c.content);
      });
    }

    // assets/ - simulated
    const assetsFolder = zip.folder("assets");
    if (project.sources && project.sources.length > 0) {
      project.sources.forEach(s => {
        if (s.type === 'image') {
          // If content is base64, save as file
          const match = s.content.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
          if (match) {
            assetsFolder?.file(s.name, match[2], { base64: true });
          } else {
            assetsFolder?.file(`${s.name}.txt`, s.content);
          }
        } else {
          assetsFolder?.file(`${s.name}.txt`, s.content);
        }
      });
    }

    // Full project sources JSON
    zip.file("sources.json", JSON.stringify(project.sources || [], null, 2));

    // ledger.db - simulated relational store
    zip.file("ledger.db", JSON.stringify(project.ledger || [], null, 2));

    const blob = await zip.generateAsync({type:"blob"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; 
    link.download = `${safeTitle}.plothole`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
};

export const exportGlobalPvoid = async (globalNotes: Note[]) => {
    const zip = new JSZip();
    const dateStr = new Date().toISOString().split('T')[0];
    const data = { version: APP_DATA_VERSION, timestamp: Date.now(), source: 'Plothole_Global_Vault', globalNotes };
    
    zip.file("Global_Vault.json", JSON.stringify(data, null, 2));
    
    const blob = await zip.generateAsync({type:"blob"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; 
    link.download = `P_Library_Archive_${dateStr}.pvoid`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
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
    for (const p of allProjects) {
        const safeTitle = p.title.replace(/[^a-z0-9]/gi, '_') || "Untitled_Project";
        const pFolder = projectsFolder?.folder(safeTitle);
        pFolder?.file("Project_Data.json", JSON.stringify(p, null, 2));

        if (p.manuscriptHistory && p.manuscriptHistory.length > 0) {
            const vaultFolder = pFolder?.folder("Manuscripts");
            const top5 = [...p.manuscriptHistory].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

            const manifest = await Promise.all(top5.map(async h => ({
                id: h.id,
                filename: h.filename,
                timestamp: h.timestamp,
                date: new Date(h.timestamp).toISOString(),
                hash: await generateSHA256(h.content),
                wordCount: h.content.trim().split(/\s+/).length
            })));

            vaultFolder?.file("Vault_Manifest.json", JSON.stringify(manifest, null, 2));

            for (let i = 0; i < top5.length; i++) {
                const m = top5[i];
                const dateTag = new Date(m.timestamp).toISOString().slice(0, 10);
                const hashTag = (await generateSHA256(m.content)).slice(0, 8);
                const ext = m.filename.endsWith('.md') ? '.md' : '.txt';
                vaultFolder?.file(`${i + 1}_${dateTag}_${hashTag}${ext}`, m.content);
            }
        }
    }

    const blob = await zip.generateAsync({type:"blob"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; 
    link.download = `Plothole_System_Archive_${dateStr}.zip`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
};
