import { AtlasMapState } from '../types';

const DB_NAME = 'plothole_fantasy_db';
const STORE_NAME = 'atlas_store';
const DB_KEY = 'plothole_fantasy_atlas';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves atlas state into IndexedDB (supports large base64 image data)
 * and safely mirrors to localStorage with automatic quota exception handling.
 */
export async function saveAtlasStateToStorage(state: AtlasMapState): Promise<void> {
  // 1. Try saving full state (with large images) into IndexedDB
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(state, DB_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB save failed, falling back to localStorage only:', err);
  }

  // 2. Try saving to localStorage. Catch QuotaExceededError and strip huge base64 image if necessary.
  try {
    localStorage.setItem('plothole_fantasy_atlas', JSON.stringify(state));
  } catch (e: any) {
    console.warn('localStorage.setItem failed (likely quota limit exceeded for base64 image). Saving lightweight state.', e);
    try {
      // If image is a large base64 data URL, strip it or mark it so localStorage doesn't crash
      const isBase64 = state.imageUrl && state.imageUrl.startsWith('data:');
      const lightweightState: AtlasMapState = {
        ...state,
        imageUrl: isBase64 ? '' : state.imageUrl // keep URL if external web link, omit if base64 data URL
      };
      localStorage.setItem('plothole_fantasy_atlas', JSON.stringify(lightweightState));
    } catch (fallbackError) {
      console.error('Failed to save even lightweight atlas state to localStorage:', fallbackError);
    }
  }
}

/**
 * Loads atlas state from IndexedDB first, falling back to localStorage if empty.
 */
export async function loadAtlasStateFromStorage(): Promise<AtlasMapState | null> {
  // Try IndexedDB first
  try {
    const db = await openDB();
    const result = await new Promise<AtlasMapState | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(DB_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    if (result) return result;
  } catch (err) {
    console.warn('Could not read atlas state from IndexedDB:', err);
  }

  // Fallback to localStorage
  try {
    const saved = localStorage.getItem('plothole_fantasy_atlas');
    if (saved) {
      return JSON.parse(saved) as AtlasMapState;
    }
  } catch (e) {
    console.error('Failed to parse atlas state from localStorage:', e);
  }

  return null;
}
