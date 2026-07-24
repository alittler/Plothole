import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDocs, 
  collection, 
  deleteDoc,
  query,
  orderBy,
  updateDoc
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Blueprint, SidecarLog, ResearchNotebook } from '../types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Configure Google OAuth Provider with requested scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/documents');
provider.addScope('https://www.googleapis.com/auth/gmail.send');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');

// In-memory access token cache
let cachedAccessToken: string | null = null;
let isSigningIn = false;

/**
 * Initializes the Firebase Auth listener.
 * Clears or updates token on auth state change.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // If we already have the token cached, pass it along.
      // Note: standard page refreshes don't restore Google Access Tokens natively,
      // so if cachedAccessToken is null we pass an empty string, indicating they are logged in
      // but need to click Sign-in/Connect to acquire/restore Google Drive permissions.
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken || '');
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign in using Google OAuth popup.
 * Caches the access token in memory for Google Drive API operations.
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve Google Access Token for Drive API operations.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Firebase Google Sign-in Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Sign out of UCE and clear credentials.
 */
export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Retrieve cached access token
 */
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Set custom cached access token (useful if we restore it elsewhere)
 */
export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

/**
 * Saves a manuscript blueprint dossier to Firestore.
 */
export const saveDossierToFirestore = async (
  userId: string,
  blueprint: Blueprint,
  sidecarLogs: SidecarLog[]
): Promise<void> => {
  if (!userId) throw new Error('User must be logged in to save dossiers to Firestore.');
  if (!blueprint.manuscript_sha) throw new Error('Cannot save a blueprint without a valid manuscript SHA.');

  try {
    // Create reference under users/{userId}/blueprints/{manuscript_sha}
    const docRef = doc(db, 'users', userId, 'blueprints', blueprint.manuscript_sha);
    
    const dataToSave = JSON.parse(JSON.stringify({
      sha: blueprint.sha,
      first_processed: blueprint.first_processed,
      last_edited: blueprint.last_edited,
      characters: blueprint.characters,
      manuscript_sha: blueprint.manuscript_sha,
      manuscript_title: blueprint.manuscript_title || 'Untitled Manuscript',
      manuscript_author: blueprint.manuscript_author || 'Anonymous',
      manuscript_text: blueprint.manuscript_text || '',
      blueprint_notes: blueprint.blueprint_notes || '',
      term_replacements: blueprint.term_replacements || [],
      sidecar_logs: sidecarLogs,
      saved_at: new Date().toISOString()
    }));

    await setDoc(docRef, dataToSave, { merge: true });
    console.log(`Successfully saved dossier ${blueprint.manuscript_sha} to Firestore.`);
  } catch (error: any) {
    console.error('Firestore Save Error:', error);
    throw new Error(`Failed to persist dossier to database: ${error.message}`);
  }
};

/**
 * Loads all manuscript blueprints for the logged in user from Firestore.
 */
export const loadDossiersFromFirestore = async (userId: string): Promise<Blueprint[]> => {
  if (!userId) throw new Error('User must be logged in to load dossiers from Firestore.');

  try {
    const colRef = collection(db, 'users', userId, 'blueprints');
    const q = query(colRef, orderBy('last_edited', 'desc'));
    const snapshot = await getDocs(q);
    
    const blueprints: Blueprint[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      blueprints.push({
        sha: data.sha,
        first_processed: data.first_processed,
        last_edited: data.last_edited,
        characters: data.characters || [],
        manuscript_sha: data.manuscript_sha,
        manuscript_title: data.manuscript_title,
        manuscript_author: data.manuscript_author,
        manuscript_text: data.manuscript_text,
        blueprint_notes: data.blueprint_notes || '',
        term_replacements: data.term_replacements || [],
        sidecar_logs: data.sidecar_logs || [],
      } as any);
    });
    
    return blueprints;
  } catch (error: any) {
    console.error('Firestore Load Error:', error);
    throw new Error(`Failed to load dossiers from database: ${error.message}`);
  }
};

/**
 * Deletes a dossier from Firestore.
 */
export const deleteDossierFromFirestore = async (userId: string, manuscriptSha: string): Promise<void> => {
  if (!userId) throw new Error('User must be logged in to delete dossiers.');
  try {
    const docRef = doc(db, 'users', userId, 'blueprints', manuscriptSha);
    await deleteDoc(docRef);
    console.log(`Successfully deleted dossier ${manuscriptSha} from Firestore.`);
  } catch (error: any) {
    console.error('Firestore Delete Error:', error);
    throw new Error(`Failed to delete dossier from database: ${error.message}`);
  }
};

/**
 * Updates a dossier's title, author, and text in Firestore.
 */
export const updateDossierMetadataInFirestore = async (
  userId: string,
  manuscriptSha: string,
  title: string,
  author: string,
  text: string
): Promise<void> => {
  if (!userId) throw new Error('User must be logged in to update dossiers.');
  try {
    const docRef = doc(db, 'users', userId, 'blueprints', manuscriptSha);
    await updateDoc(docRef, {
      manuscript_title: title,
      manuscript_author: author,
      manuscript_text: text,
      last_edited: new Date().toISOString()
    });
    console.log(`Successfully updated dossier metadata for ${manuscriptSha} in Firestore.`);
  } catch (error: any) {
    console.error('Firestore Update Error:', error);
    throw new Error(`Failed to update dossier in database: ${error.message}`);
  }
};

/**
 * Uploads a file (text, JSON or binary Blob) to Google Drive.
 */
export const uploadToGoogleDrive = async (
  accessToken: string,
  filename: string,
  mimeType: string,
  content: string | Blob
): Promise<{ id: string; name: string; webViewLink?: string }> => {
  if (!accessToken) {
    throw new Error('Google Drive authorization token is missing. Please authorize or reconnect Google Drive.');
  }

  const boundary = 'foo_bar_boundary';
  
  // Construct multi-part header payload
  const header = 
    `\r\n--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify({ name: filename, mimeType: mimeType }) +
    `\r\n--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`;
    
  const footer = `\r\n--${boundary}--`;
  
  const headerBlob = new Blob([header], { type: 'text/plain' });
  const contentBlob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content;
  const footerBlob = new Blob([footer], { type: 'text/plain' });
  
  // Combine parts into single multi-part body
  const multipartBody = new Blob([headerBlob, contentBlob, footerBlob], { type: `multipart/related; boundary=${boundary}` });
  
  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    body: multipartBody,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Drive upload failed: ${response.statusText}. Details: ${errText}`);
  }

  const result = await response.json();
  return result;
};

/**
 * Saves or updates a research notebook in Firestore.
 */
export const saveNotebookToFirestore = async (userId: string, notebook: ResearchNotebook): Promise<void> => {
  if (!userId) throw new Error('User must be logged in to save research notebooks.');
  try {
    const docRef = doc(db, 'users', userId, 'notebooks', notebook.id);
    const cleanNotebook = JSON.parse(JSON.stringify({
      id: notebook.id,
      name: notebook.name,
      sources: notebook.sources || [],
      createdAt: notebook.createdAt,
      lastEdited: new Date().toISOString()
    }));
    await setDoc(docRef, cleanNotebook);
    console.log(`Successfully saved research notebook ${notebook.name} (${notebook.id}) to Firestore.`);
  } catch (error: any) {
    console.error('Firestore Save Notebook Error:', error);
    throw new Error(`Failed to save research notebook: ${error.message}`);
  }
};

/**
 * Loads all research notebooks for the logged-in user from Firestore.
 */
export const loadNotebooksFromFirestore = async (userId: string): Promise<ResearchNotebook[]> => {
  if (!userId) throw new Error('User must be logged in to load research notebooks.');
  try {
    const colRef = collection(db, 'users', userId, 'notebooks');
    const q = query(colRef, orderBy('lastEdited', 'desc'));
    const snapshot = await getDocs(q);
    
    const notebooks: ResearchNotebook[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      notebooks.push({
        id: data.id,
        name: data.name,
        sources: data.sources || [],
        createdAt: data.createdAt,
        lastEdited: data.lastEdited || data.createdAt
      });
    });
    return notebooks;
  } catch (error: any) {
    console.error('Firestore Load Notebooks Error:', error);
    return [];
  }
};

/**
 * Deletes a research notebook from Firestore.
 */
export const deleteNotebookFromFirestore = async (userId: string, notebookId: string): Promise<void> => {
  if (!userId) throw new Error('User must be logged in to delete research notebooks.');
  try {
    const docRef = doc(db, 'users', userId, 'notebooks', notebookId);
    await deleteDoc(docRef);
    console.log(`Successfully deleted research notebook ${notebookId} from Firestore.`);
  } catch (error: any) {
    console.error('Firestore Delete Notebook Error:', error);
    throw new Error(`Failed to delete research notebook: ${error.message}`);
  }
};

