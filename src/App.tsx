import React, { useState, useRef, useEffect } from 'react';
import { CharacterProfile, AnalysisResponse, Blueprint, SidecarLog, TermReplacement, ResearchNotebook, ResearchSource, AtlasMapState } from './types';
import SampleSelector from './components/SampleSelector';
import TokenUsageWidget from './components/TokenUsageWidget';
import CharacterList from './components/CharacterList';
import CharacterDetailView from './components/CharacterDetailView';
import JsonViewer from './components/JsonViewer';
import { ResearchLibrary } from './components/ResearchLibrary';
import { FantasyAtlas } from './components/FantasyAtlas';
import { OracleChat } from './components/OracleChat';
import { StenopadNotepad } from './components/StenopadNotepad';
import { loadAtlasStateFromStorage } from './utils/atlasStorage';
import { AdminPanel } from './components/AdminPanel';
import { SAMPLE_MANUSCRIPTS } from './data/samples';
import JSZip from 'jszip';
import { 
  BookOpen, 
  Upload, 
  FileText, 
  ChevronRight, 
  Sparkles, 
  RotateCcw, 
  HelpCircle, 
  ArrowRight,
  Eye,
  FileJson,
  CheckCircle,
  AlertCircle,
  Cloud,
  CloudUpload,
  LogOut,
  Check,
  Loader,
  Pencil,
  Trash2,
  Download,
  Settings,
  Mail,
  Sliders,
  Shield,
  Compass,
  ShieldAlert,
  Bot,
  PenTool
} from 'lucide-react';
import { 
  auth, 
  db, 
  initAuth, 
  googleSignIn, 
  logout, 
  saveDossierToFirestore, 
  loadDossiersFromFirestore, 
  deleteDossierFromFirestore, 
  uploadToGoogleDrive,
  updateDossierMetadataInFirestore,
  saveNotebookToFirestore,
  loadNotebooksFromFirestore,
  deleteNotebookFromFirestore
} from './lib/firebase';
import {
  loadGooglePickerScript,
  fetchDriveFileContent,
  createGoogleDocFromDossier,
  sendGmailBackup,
  createGoogleDocFromNotebook
} from './lib/googleWorkspace';


// Cryptographic hash helper with standard fallback for iframe environments
async function calculateSHA256(content: string): Promise<string> {
  try {
    const msgBuffer = new TextEncoder().encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (err) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return 'sha256-fallback-' + Math.abs(hash).toString(16);
  }
}

export default function App() {
  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<'analyzer' | 'library' | 'settings' | 'research' | 'atlas' | 'admin' | 'oracle' | 'stenopad'>('analyzer');
  const [atlasState, setAtlasState] = useState<AtlasMapState | null>(() => {
    try {
      const saved = localStorage.getItem('plothole_fantasy_atlas');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse atlasState from localStorage in App:", e);
    }
    return null;
  });

  // Load rich atlas state asynchronously from IndexedDB on startup
  useEffect(() => {
    loadAtlasStateFromStorage().then((idbState) => {
      if (idbState) {
        setAtlasState(idbState);
      }
    }).catch((err) => {
      console.error("Failed to load atlas state from IndexedDB in App:", err);
    });
  }, []);

  // Google Auth & Firestore states
  const [user, setUser] = useState<any | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [tokenUsage, setTokenUsage] = useState({ prompt: 0, completion: 0, total: 0 });
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [isLoadingPicker, setIsLoadingPicker] = useState(false);
  const [isSavingToDoc, setIsSavingToDoc] = useState(false);
  const [createdDocUrl, setCreatedDocUrl] = useState<string | null>(null);
  const [driveSaveStatus, setDriveSaveStatus] = useState<{ type: 'success' | 'error' | 'loading' | null; message: string }>({ type: null, message: '' });

  // Gmail backup settings states
  const [backupEmail, setBackupEmail] = useState('');
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [backupFormat, setBackupFormat] = useState<'json' | 'md'>('md');
  const [emailSubjectPrefix, setEmailSubjectPrefix] = useState('[Plothole Backup]');
  const [isSendingBackupEmail, setIsSendingBackupEmail] = useState(false);
  const [backupEmailStatus, setBackupEmailStatus] = useState<{ type: 'success' | 'error' | 'loading' | null; message: string }>({ type: null, message: '' });

  // Custom states for authentication troubleshooting and error handling
  const [authHelpOpen, setAuthHelpOpen] = useState(false);
  const [activeAuthError, setActiveAuthError] = useState<{ code: string; message: string; type: 'unauthorized-domain' | 'popup-closed' | 'testing-mode-restriction' | 'generic' } | null>(null);
  const [authInitializing, setAuthInitializing] = useState(true);

  const interpretAuthError = (err: any) => {
    const code = err?.code || '';
    const message = err?.message || String(err);
    
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return {
        code,
        message: "The sign-in window was closed. To back up your files, connect Google Drive, or log in, please click 'Sign in with Google' again and complete the login in the popup window.",
        type: 'popup-closed' as const
      };
    } else if (code === 'auth/unauthorized-domain' || message.includes('unauthorized-domain') || message.includes('unauthorized domain')) {
      return {
        code,
        message: `This domain (${window.location.hostname}) is not authorized in your Firebase Project configuration. You must whitelist this domain in the Firebase Console.`,
        type: 'unauthorized-domain' as const
      };
    } else if (message.includes('developer') || message.includes('consent') || message.includes('Testing') || message.includes('project members') || message.includes('restricted')) {
      return {
        code,
        message: "Google Sign-In is restricted: Your OAuth Consent Screen is in 'Testing' mode. Only whitelisted test users can log in, or the app must be Published.",
        type: 'testing-mode-restriction' as const
      };
    } else {
      return {
        code,
        message: message,
        type: 'generic' as const
      };
    }
  };

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        if (token) {
          setDriveToken(token);
        }
        setAuthInitializing(false);
      },
      () => {
        setUser(null);
        setDriveToken(null);
        setAuthInitializing(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Sync Gmail backup settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('plothole_gmail_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.backupEmail) setBackupEmail(parsed.backupEmail);
        if (parsed.autoBackupEnabled !== undefined) setAutoBackupEnabled(parsed.autoBackupEnabled);
        if (parsed.backupFormat) setBackupFormat(parsed.backupFormat);
        if (parsed.emailSubjectPrefix) setEmailSubjectPrefix(parsed.emailSubjectPrefix);
      }
    } catch (e) {
      console.error("Failed to load Gmail settings from localStorage", e);
    }
  }, []);

  // Fallback default backup email to logged in Google Account email
  useEffect(() => {
    if (user && !backupEmail) {
      setBackupEmail(user.email || '');
    }
  }, [user]);

  const saveGmailSettings = (email: string, autoEnabled: boolean, format: 'json' | 'md', prefix: string) => {
    try {
      localStorage.setItem('plothole_gmail_settings', JSON.stringify({
        backupEmail: email,
        autoBackupEnabled: autoEnabled,
        backupFormat: format,
        emailSubjectPrefix: prefix
      }));
    } catch (e) {
      console.error("Failed to save Gmail settings to localStorage", e);
    }
  };

  // Sync library history & restore active dossier when user changes or logged in
  useEffect(() => {
    if (user) {
      loadDossiersFromFirestore(user.uid)
        .then((firestoreBlueprints) => {
          setUserBlueprints(firestoreBlueprints);

          const firestoreHistory = firestoreBlueprints.map((bp) => ({
            sha: bp.manuscript_sha || bp.sha,
            date: bp.first_processed,
            title: bp.manuscript_title || 'Untitled Manuscript',
            author: bp.manuscript_author || 'Anonymous',
            text: bp.manuscript_text,
          })) as typeof manuscriptsHistory;

          setManuscriptsHistory((prev) => {
            const combined = [...firestoreHistory];
            prev.forEach((localItem) => {
              if (!combined.some((h) => h.sha === localItem.sha)) {
                combined.push(localItem);
              }
            });
            return combined.slice(0, 10);
          });

          // Restore active blueprint and manuscript text from user's saved account dossier if available
          if (firestoreBlueprints.length > 0) {
            const latest = firestoreBlueprints[0];
            setBlueprint(latest);
            if (latest.manuscript_text) setManuscriptText(latest.manuscript_text);
            if (latest.manuscript_title) setManuscriptTitle(latest.manuscript_title);
            if (latest.manuscript_author) setManuscriptAuthor(latest.manuscript_author);
            if (latest.sidecar_logs && latest.sidecar_logs.length > 0) setSidecarLogs(latest.sidecar_logs);
            if (latest.characters && latest.characters.length > 0) {
              setCharacters(latest.characters);
              setSelectedCharacter(latest.characters[0]);
            }
            if (latest.blueprint_notes) setBlueprintNotes(latest.blueprint_notes);
            if (latest.term_replacements) setTermReplacements(latest.term_replacements);
          }
        })
        .catch((err) => {
          console.error("Failed to load history from Firestore:", err);
        });
    } else {
      setUserBlueprints([]);
    }
  }, [user]);

  // Load research notebooks on mount or user shift
  useEffect(() => {
    if (user) {
      loadNotebooksFromFirestore(user.uid)
        .then((fetchedNotebooks) => {
          if (fetchedNotebooks && fetchedNotebooks.length > 0) {
            setNotebooks(fetchedNotebooks);
            setCurrentNotebookId((prev) => {
              if (prev && fetchedNotebooks.some(nb => nb.id === prev)) {
                return prev;
              }
              return fetchedNotebooks[0].id;
            });
          } else {
            const defaultNb: ResearchNotebook = {
              id: 'default-notebook',
              name: 'My Worldbuilding Notes',
              sources: [],
              createdAt: new Date().toISOString(),
              lastEdited: new Date().toISOString()
            };
            setNotebooks([defaultNb]);
            setCurrentNotebookId('default-notebook');
            saveNotebookToFirestore(user.uid, defaultNb).catch(console.error);
          }
        })
        .catch((err) => {
          console.error("Failed to load notebooks from Firestore:", err);
        });
    } else {
      try {
        const local = localStorage.getItem('plothole_guest_notebooks');
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed && parsed.length > 0) {
            setNotebooks(parsed);
            setCurrentNotebookId((prev) => {
              if (prev && parsed.some((nb: any) => nb.id === prev)) {
                return prev;
              }
              return parsed[0].id;
            });
            return;
          }
        }
        const defaultNb: ResearchNotebook = {
          id: 'default-notebook',
          name: 'My Worldbuilding Notes (Guest)',
          sources: [],
          createdAt: new Date().toISOString(),
          lastEdited: new Date().toISOString()
        };
        setNotebooks([defaultNb]);
        setCurrentNotebookId('default-notebook');
      } catch (e) {
        console.error("Failed to load guest notebooks:", e);
      }
    }
  }, [user]);

  const handleSendGmailNotebookBackup = async (activeNotebook: ResearchNotebook, silent: boolean = true) => {
    let currentToken = driveToken;
    if (!currentToken) {
      console.log("Silent notebook auto-sync bypassed: Google account not authorized.");
      return false;
    }

    const recipient = backupEmail || user?.email;
    if (!recipient) {
      console.log("No recipient configured for notebook auto-sync.");
      return false;
    }

    try {
      const subject = `${emailSubjectPrefix} - Research Notebook "${activeNotebook.name}" Auto-Sync`;
      const sourcesCount = activeNotebook.sources?.length || 0;
      
      const bodyHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; border-bottom: 2px solid #8b5cf6; padding-bottom: 15px; margin-bottom: 20px;">
            <h2 style="color: #6d28d9; margin: 0 0 5px 0;">Plothole Research Notebook Auto-Sync</h2>
            <p style="color: #64748b; font-size: 13px; margin: 0;">Secured Gmail sync of your Research sources and notes</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <p style="font-size: 15px; color: #334155;">Hello,</p>
            <p style="font-size: 15px; color: #334155; line-height: 1.6;">Your research notebook has been automatically synchronized. Here is a summary of the active sources in <strong>"${activeNotebook.name}"</strong>:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #475569; width: 150px;">Notebook:</td>
                <td style="padding: 8px 0; color: #0f172a;"><strong>"${activeNotebook.name}"</strong></td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Total Sources:</td>
                <td style="padding: 8px 0; color: #0f172a;">${sourcesCount} sources</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Last Synced:</td>
                <td style="padding: 8px 0; color: #0f172a;">${new Date().toLocaleString()}</td>
              </tr>
            </table>

            <h3 style="color: #334155; font-size: 14px; margin: 20px 0 10px 0;">Sources List:</h3>
            <ul style="font-size: 13px; color: #475569; padding-left: 20px; line-height: 1.6;">
              ${(activeNotebook.sources || []).slice(0, 10).map(s => `
                <li>
                  <strong>${s.title}</strong> (${s.type})
                  ${s.url ? `<br/><a href="${s.url}" style="color: #3b82f6; text-decoration: none; font-size: 11px;">${s.url}</a>` : ''}
                </li>
              `).join('')}
              ${sourcesCount > 10 ? `<li>... and ${sourcesCount - 10} more sources</li>` : ''}
            </ul>
          </div>
          
          <div style="margin-bottom: 20px; background-color: #f5f3ff; border: 1px dashed #c084fc; border-radius: 8px; padding: 15px; font-size: 13px; color: #5b21b6;">
            <strong>Attachment info:</strong><br/>
            An off-site backup file <strong>notebook_sync_${activeNotebook.id}.${backupFormat}</strong> is attached. You can import or share this directly.
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8;">
            Plothole • Secured via Google Account Authentication and TLS Encryption
          </div>
        </div>
      `;

      let attachmentContent = "";
      let attachmentMime = "";
      let attachmentExt = "";

      if (backupFormat === 'json') {
        attachmentContent = JSON.stringify(activeNotebook, null, 2);
        attachmentMime = "application/json";
        attachmentExt = "json";
      } else {
        // Markdown format
        let mdText = `# Plothole Research Notebook: ${activeNotebook.name}\n`;
        mdText += `Exported on: ${new Date().toLocaleDateString()} | Total Sources: ${sourcesCount}\n\n`;
        mdText += `========================================================================\n\n`;
        (activeNotebook.sources || []).forEach((source, index) => {
          mdText += `## [Source #${index + 1}] ${source.title}\n`;
          mdText += `- **Type**: ${source.type}\n`;
          if (source.url) mdText += `- **Link**: ${source.url}\n`;
          mdText += `- **Added**: ${new Date(source.addedAt).toLocaleString()}\n\n`;
          mdText += `### Content:\n${source.content}\n\n`;
          mdText += `------------------------------------------------------------------------\n\n`;
        });
        attachmentContent = mdText;
        attachmentMime = "text/markdown";
        attachmentExt = "md";
      }

      const filename = `notebook_${activeNotebook.id}_sync.${attachmentExt}`;
      
      await sendGmailBackup(
        currentToken,
        recipient,
        subject,
        bodyHtml,
        {
          filename,
          content: attachmentContent,
          mimeType: attachmentMime
        }
      );
      
      console.log("Successfully auto-synced research notebook via Gmail.");
      return true;
    } catch (error) {
      console.error("Failed to auto-sync research notebook via Gmail:", error);
      return false;
    }
  };

  const handleSaveNotebook = async (updatedNotebooks: ResearchNotebook[]) => {
    // Check if any notebook was deleted
    if (user) {
      const deletedNotebooks = notebooks.filter(oldNb => !updatedNotebooks.some(newNb => newNb.id === oldNb.id));
      for (const deleted of deletedNotebooks) {
        try {
          await deleteNotebookFromFirestore(user.uid, deleted.id);
        } catch (e) {
          console.error(`Failed to delete notebook ${deleted.id} from Firestore:`, e);
        }
      }
    }

    setNotebooks(updatedNotebooks);
    const targetId = currentNotebookId || (updatedNotebooks.length > 0 ? updatedNotebooks[0].id : null);
    if (!targetId) return;
    const active = updatedNotebooks.find(n => n.id === targetId);
    if (!active) return;

    if (user) {
      try {
        await saveNotebookToFirestore(user.uid, active);
        if (autoBackupEnabled) {
          handleSendGmailNotebookBackup(active, true);
        }
      } catch (e) {
        console.error("Failed to save notebook to Firestore:", e);
      }
    } else {
      try {
        localStorage.setItem('plothole_guest_notebooks', JSON.stringify(updatedNotebooks));
      } catch (e) {
        console.error("Failed to save notebook to localStorage:", e);
      }
    }

    if (!user && driveToken && autoBackupEnabled) {
      handleSendGmailNotebookBackup(active, true);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setActiveAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setDriveToken(result.accessToken);
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      const interpreted = interpretAuthError(err);
      setActiveAuthError(interpreted);
      if (interpreted.type !== 'popup-closed') {
        setAuthHelpOpen(true);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setDriveToken(null);
    } catch (err: any) {
      console.error("Logout failed:", err);
    }
  };

  const handleBrowseGoogleDrive = async () => {
    let currentToken = driveToken;
    if (!currentToken) {
      const confirmAuth = window.confirm("Google Drive is not authorized or your session has expired. Would you like to connect and authorize Google Drive now?");
      if (confirmAuth) {
        setIsLoggingIn(true);
        setActiveAuthError(null);
        try {
          const result = await googleSignIn();
          if (result) {
            setUser(result.user);
            setDriveToken(result.accessToken);
            currentToken = result.accessToken;
          }
        } catch (err: any) {
          console.error("Login failed:", err);
          const interpreted = interpretAuthError(err);
          setActiveAuthError(interpreted);
          if (interpreted.type !== 'popup-closed') {
            setAuthHelpOpen(true);
          }
          setIsLoggingIn(false);
          return;
        } finally {
          setIsLoggingIn(false);
        }
      } else {
        return;
      }
    }

    if (!currentToken) return;

    setIsLoadingPicker(true);
    setDriveSaveStatus({ type: 'loading', message: "Launching Google Drive Picker..." });
    try {
      await loadGooglePickerScript();
      
      const pickerOrigin =
        window.location.ancestorOrigins &&
        window.location.ancestorOrigins.length > 0
          ? window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1]
          : window.location.origin;

      const google = (window as any).google;
      
      const docsView = new google.picker.DocsView(google.picker.ViewId.DOCS);
      docsView.setMimeTypes("text/plain,application/vnd.google-apps.document,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown");

      const picker = new google.picker.PickerBuilder()
        .addView(docsView)
        .setOAuthToken(currentToken)
        .setCallback(async (data: any) => {
          if (data.action === google.picker.Action.PICKED) {
            const file = data.docs[0];
            const fileId = file.id;
            const name = file.name;
            const mimeType = file.mimeType;

            try {
              setDriveSaveStatus({ type: 'loading', message: `Retrieving "${name}" from Google Drive...` });
              const content = await fetchDriveFileContent(currentToken!, fileId, mimeType);
              
              setManuscriptText(content);
              
              // Try to set manuscript title by stripping known extension
              const cleanTitle = name.replace(/\.(txt|md|docx|doc)$/i, '');
              setManuscriptTitle(cleanTitle);
              
              setDriveSaveStatus({ type: 'success', message: `Successfully loaded manuscript "${name}"!` });
              alert(`Manuscript "${name}" successfully loaded from Google Drive into Workspace!`);
            } catch (err: any) {
              console.error("Failed to load manuscript content:", err);
              setDriveSaveStatus({ type: 'error', message: `Failed to fetch "${name}": ${err.message}` });
              alert(`Failed to load manuscript content from Google Drive: ${err.message}`);
            }
          }
        })
        .setOrigin(pickerOrigin)
        .build();
        
      picker.setVisible(true);
    } catch (err: any) {
      console.error("Failed to launch Google Picker:", err);
      setDriveSaveStatus({ type: 'error', message: `Picker error: ${err.message}` });
      alert(`Could not launch Google Drive Picker: ${err.message}`);
    } finally {
      setIsLoadingPicker(false);
    }
  };

  const handleExportToGoogleDoc = async () => {
    let currentToken = driveToken;
    if (!currentToken) {
      const confirmAuth = window.confirm("Google Drive is not authorized or your session has expired. Would you like to connect and authorize Google Drive now?");
      if (confirmAuth) {
        setIsLoggingIn(true);
        setActiveAuthError(null);
        try {
          const result = await googleSignIn();
          if (result) {
            setUser(result.user);
            setDriveToken(result.accessToken);
            currentToken = result.accessToken;
          }
        } catch (err: any) {
          console.error("Login failed:", err);
          const interpreted = interpretAuthError(err);
          setActiveAuthError(interpreted);
          if (interpreted.type !== 'popup-closed') {
            setAuthHelpOpen(true);
          }
          setIsLoggingIn(false);
          return;
        } finally {
          setIsLoggingIn(false);
        }
      } else {
        return;
      }
    }

    if (!currentToken) return;

    const charList = characters || blueprint?.characters;
    if (!charList || charList.length === 0) {
      alert("No character profiles to export!");
      return;
    }

    setIsSavingToDoc(true);
    setCreatedDocUrl(null);
    setDriveSaveStatus({ type: 'loading', message: "Creating beautifully formatted Google Doc..." });

    try {
      const titleRaw = blueprint?.manuscript_title || manuscriptTitle || 'Untitled Manuscript';
      const authorRaw = blueprint?.manuscript_author || manuscriptAuthor || 'Anonymous';

      const result = await createGoogleDocFromDossier(currentToken, titleRaw, authorRaw, charList);
      setCreatedDocUrl(result.url);
      setDriveSaveStatus({ 
        type: 'success', 
        message: `Successfully created Google Doc: "${titleRaw}"` 
      });
      alert(`Dossier successfully exported! You can open your Google Doc here: ${result.url}`);
    } catch (err: any) {
      console.error("Google Doc Export Error:", err);
      setDriveSaveStatus({ type: 'error', message: `Export failed: ${err.message}` });
      alert(`Google Doc Export Failed: ${err.message}`);
    } finally {
      setIsSavingToDoc(false);
    }
  };

  const handleSendGmailBackup = async (overrideCharacters?: any[], overrideTitle?: string, overrideAuthor?: string, silent: boolean = false) => {
    let currentToken = driveToken;
    if (!currentToken) {
      if (silent) {
        console.log("Silent auto-backup bypassed: Google account not authorized.");
        return false;
      }
      const confirmAuth = window.confirm("Gmail backup requires your Google Account to be authorized. Would you like to authorize and connect now?");
      if (confirmAuth) {
        setIsLoggingIn(true);
        setActiveAuthError(null);
        try {
          const result = await googleSignIn();
          if (result) {
            setUser(result.user);
            setDriveToken(result.accessToken);
            currentToken = result.accessToken;
          }
        } catch (err: any) {
          console.error("Login failed:", err);
          const interpreted = interpretAuthError(err);
          setActiveAuthError(interpreted);
          if (interpreted.type !== 'popup-closed') {
            setAuthHelpOpen(true);
          }
          setIsLoggingIn(false);
          return false;
        } finally {
          setIsLoggingIn(false);
        }
      } else {
        return false;
      }
    }

    if (!currentToken) return false;

    const charList = overrideCharacters || characters || blueprint?.characters;
    const titleRaw = overrideTitle || blueprint?.manuscript_title || manuscriptTitle || 'Untitled Manuscript';
    const authorRaw = overrideAuthor || blueprint?.manuscript_author || manuscriptAuthor || 'Anonymous';

    if (!charList || charList.length === 0) {
      if (!silent) {
        alert("No character profiles or dossier data available to backup yet. Please run an analysis first!");
      }
      return false;
    }

    const recipient = backupEmail || user?.email;
    if (!recipient) {
      if (!silent) {
        alert("Please configure a valid backup email recipient under Settings.");
      }
      return false;
    }

    setIsSendingBackupEmail(true);
    setBackupEmailStatus({ type: 'loading', message: `Preparing backup email and encoding attachments...` });

    try {
      // Create HTML Body
      const bodyHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px;">
            <h2 style="color: #1e3a8a; margin: 0 0 5px 0;">Plothole Manuscript Backup</h2>
            <p style="color: #64748b; font-size: 13px; margin: 0;">Sleek literary manuscript analysis & backup pipeline</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <p style="font-size: 15px; color: #334155;">Hello,</p>
            <p style="font-size: 15px; color: #334155; line-height: 1.6;">Your automated character dossier backup is ready. Below is a brief summary of the manuscript details:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #475569; width: 120px;">Manuscript:</td>
                <td style="padding: 8px 0; color: #0f172a;"><strong>"${titleRaw}"</strong></td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Author:</td>
                <td style="padding: 8px 0; color: #0f172a;">${authorRaw}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Total Characters:</td>
                <td style="padding: 8px 0; color: #0f172a;">${charList.length} unique profiles</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; font-weight: bold; color: #475569;">Backup Time:</td>
                <td style="padding: 8px 0; color: #0f172a;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>
          
          <div style="margin-bottom: 20px; background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 15px; font-size: 13px; color: #475569;">
            <strong>Attachment info:</strong><br/>
            An off-site backup file <strong>${titleRaw.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_dossier.${backupFormat}</strong> is attached to this email. You can import this file directly back into Plothole or share it with editors.
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8;">
            Plothole • Secured via Google Account Authentication and TLS Encryption
          </div>
        </div>
      `;

      // Prepare attachment content
      let attachmentContent = "";
      let attachmentMime = "";
      let attachmentExt = "";

      if (backupFormat === 'json') {
        const fullBackupObj = {
          manuscript_title: titleRaw,
          manuscript_author: authorRaw,
          characters: charList,
          manuscript_text: overrideCharacters ? "" : manuscriptText,
          exported_at: new Date().toISOString()
        };
        attachmentContent = JSON.stringify(fullBackupObj, null, 2);
        attachmentMime = "application/json";
        attachmentExt = "json";
      } else {
        // MD (Markdown) format
        let mdText = `# Character Dossiers for "${titleRaw}"\n`;
        mdText += `**Author:** ${authorRaw}\n`;
        mdText += `**Generated on:** ${new Date().toLocaleString()}\n\n`;
        mdText += `---\n\n`;

        charList.forEach((char, idx) => {
          mdText += `## ${idx + 1}. ${char.core.name}\n`;
          mdText += `- **Role:** ${char.core.role}\n`;
          mdText += `- **Classification:** ${char.core.species}\n`;
          mdText += `- **Status:** ${char.core.living_status}\n`;
          if (char.core.nickname) mdText += `- **Nickname:** ${char.core.nickname}\n`;
          mdText += `\n### Narrative Description\n${char.content.description || 'No description provided.'}\n\n`;
          
          if (char.content.goals && char.content.goals.length > 0) {
            mdText += `### Narrative Goals\n`;
            char.content.goals.forEach(g => mdText += `- ${g}\n`);
            mdText += `\n`;
          }

          if (char.content.relationships && char.content.relationships.length > 0) {
            mdText += `### Key Relationships\n`;
            char.content.relationships.forEach(r => mdText += `- **With ${r.name}:** ${r.relation}\n`);
            mdText += `\n`;
          }

          mdText += `--- \n\n`;
        });

        attachmentContent = mdText;
        attachmentMime = "text/markdown";
        attachmentExt = "md";
      }

      const safeTitle = titleRaw.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'manuscript';
      const filename = `${safeTitle}_dossier.${attachmentExt}`;
      const finalSubject = `${emailSubjectPrefix} - "${titleRaw}" Backup`;

      await sendGmailBackup(
        currentToken,
        recipient,
        finalSubject,
        bodyHtml,
        {
          filename,
          content: attachmentContent,
          mimeType: attachmentMime
        }
      );

      setBackupEmailStatus({ 
        type: 'success', 
        message: `Successfully emailed backup to ${recipient}!` 
      });
      if (!silent) {
        alert(`Backup successfully emailed to ${recipient}!`);
      }
      return true;
    } catch (err: any) {
      console.error("Gmail Send Error:", err);
      setBackupEmailStatus({ 
        type: 'error', 
        message: `Backup email failed: ${err.message}` 
      });
      if (!silent) {
        alert(`Gmail Backup Failed: ${err.message}`);
      }
      return false;
    } finally {
      setIsSendingBackupEmail(false);
    }
  };

  const handleSaveToDrive = async (type: 'json' | 'zip' | 'md') => {
    let currentToken = driveToken;
    if (!currentToken) {
      const confirmAuth = window.confirm("Google Drive is not authorized or your session has expired. Would you like to connect and authorize Google Drive now?");
      if (confirmAuth) {
        setIsLoggingIn(true);
        setActiveAuthError(null);
        try {
          const result = await googleSignIn();
          if (result) {
            setUser(result.user);
            setDriveToken(result.accessToken);
            currentToken = result.accessToken;
          }
        } catch (err: any) {
          console.error("Login failed:", err);
          const interpreted = interpretAuthError(err);
          setActiveAuthError(interpreted);
          if (interpreted.type !== 'popup-closed') {
            setAuthHelpOpen(true);
          }
          setIsLoggingIn(false);
          return;
        } finally {
          setIsLoggingIn(false);
        }
      } else {
        return;
      }
    }

    if (!currentToken) return;

    if (!characters) {
      alert("No character profiles to save!");
      return;
    }

    setIsSavingToDrive(true);
    setDriveSaveStatus({ type: 'loading', message: `Preparing file for Google Drive upload...` });

    try {
      const titleRaw = blueprint?.manuscript_title || manuscriptTitle || 'untitled';
      const authorRaw = blueprint?.manuscript_author || manuscriptAuthor || 'anon';
      const sha256_prefix = (blueprint?.sha || '').slice(0, 8) || 'unknown';
      const sanitizedTitle = titleRaw.toLowerCase().replace(/[^a-z0-9_-]/g, '_').replace(/_+/g, '_').replace(/(^_|_$)/g, '');
      const authorInitials = authorRaw.split(/\s+/).map((word) => word.charAt(0)).join('').toLowerCase().replace(/[^a-z0-9]/g, '');

      let filename = '';
      let mimeType = '';
      let content: string | Blob = '';

      if (type === 'json') {
        filename = `${sanitizedTitle}_${sha256_prefix}_${authorInitials}_blueprint.json`;
        mimeType = 'application/json';
        const latestBlueprint = {
          ...blueprint,
          characters: characters,
          manuscripts_history: manuscriptsHistory,
          blueprint_notes: blueprintNotes,
          term_replacements: termReplacements,
        };
        content = JSON.stringify(latestBlueprint, null, 2);
      } else if (type === 'md') {
        filename = `${sanitizedTitle}_${sha256_prefix}_${authorInitials}_dossiers.md`;
        mimeType = 'text/markdown';
        
        let md = `# Universal Character Dossier Extractor - Blueprint Report\n\n`;
        md += `* **First Processed:** ${blueprint?.first_processed || new Date().toISOString()}\n`;
        md += `* **Last Edited:** ${blueprint?.last_edited || new Date().toISOString()}\n`;
        md += `* **Blueprint SHA-256 Checksum:** ${blueprint?.sha || 'N/A'}\n`;
        md += `* **Total Characters:** ${characters.length}\n\n`;
        md += `---\n\n`;
        
        characters.forEach((char) => {
          md += `## ${char.core.name} ${char.core.nickname ? `(Alias: ${char.core.nickname})` : ''}\n\n`;
          md += `### Core Parameters\n`;
          md += `* **Role:** ${char.core.role}\n`;
          md += `* **Species:** ${char.core.species}\n`;
          md += `* **Status:** ${char.core.living_status}\n`;
          if (char.metadata.first_appearance) {
            md += `* **First Appearance:** ${char.metadata.first_appearance}\n`;
          }
          md += `\n`;
          
          md += `### Description\n`;
          md += `${char.content.description}\n\n`;
          
          if (char.custom_fields && Object.keys(char.custom_fields).length > 0) {
            md += `### Custom Attributes\n`;
            Object.entries(char.custom_fields).forEach(([key, val]) => {
              md += `* **${key}:** ${val}\n`;
            });
            md += `\n`;
          }
          
          if (char.content.goals && char.content.goals.length > 0) {
            md += `### Goals & Motivations\n`;
            char.content.goals.forEach((goal) => {
              md += `* ${goal}\n`;
            });
            md += `\n`;
          }
          
          if (char.content.relationships && char.content.relationships.length > 0) {
            md += `### Relationships\n`;
            char.content.relationships.forEach((rel) => {
              md += `* **${rel.name}**: ${rel.relation}\n`;
            });
            md += `\n`;
          }
          
          if (char.content.quotes && char.content.quotes.length > 0) {
            md += `### Key Quotes\n`;
            char.content.quotes.forEach((quote) => {
              md += `> "${quote}"\n\n`;
            });
            md += `\n`;
          }
          
          if (char.metadata.notes) {
            md += `### Analytical Notes\n`;
            md += `${char.metadata.notes}\n\n`;
          }
          
          if (char.metadata.tags && char.metadata.tags.length > 0) {
            md += `*Tags: ${char.metadata.tags.map(t => `#${t}`).join(', ')}*\n\n`;
          }
          
          md += `\n---\n\n`;
        });
        content = md;
      } else if (type === 'zip') {
        filename = `${sanitizedTitle}_${sha256_prefix}_${authorInitials}.phole.zip`;
        mimeType = 'application/zip';
        
        const zip = new JSZip();
        
        // 1. Add character_blueprint.json
        const latestBlueprint = {
          ...blueprint,
          characters: characters,
          manuscripts_history: manuscriptsHistory,
          blueprint_notes: blueprintNotes,
          term_replacements: termReplacements,
        };
        zip.file('character_blueprint.json', JSON.stringify(latestBlueprint, null, 2));
        
        // 2. Add sidecar_changelog.json
        const sidecarData = {
          manuscripts_history: manuscriptsHistory,
          changelog: sidecarLogs,
          term_replacements: termReplacements,
          blueprint_notes: blueprintNotes,
        };
        zip.file('sidecar_changelog.json', JSON.stringify(sidecarData, null, 2));
        
        // 3. Add characters_dossier.md
        let md = `# Universal Character Dossier Extractor - Blueprint Report\n\n`;
        md += `* **First Processed:** ${blueprint?.first_processed || new Date().toISOString()}\n`;
        md += `* **Last Edited:** ${blueprint?.last_edited || new Date().toISOString()}\n`;
        md += `* **Blueprint SHA-256 Checksum:** ${blueprint?.sha || 'N/A'}\n`;
        md += `* **Total Characters:** ${characters.length}\n\n`;
        md += `---\n\n`;
        
        characters.forEach((char) => {
          md += `## ${char.core.name} ${char.core.nickname ? `(Alias: ${char.core.nickname})` : ''}\n\n`;
          md += `### Core Parameters\n`;
          md += `* **Role:** ${char.core.role}\n`;
          md += `* **Species:** ${char.core.species}\n`;
          md += `* **Status:** ${char.core.living_status}\n`;
          if (char.metadata.first_appearance) {
            md += `* **First Appearance:** ${char.metadata.first_appearance}\n`;
          }
          md += `\n`;
          
          md += `### Description\n`;
          md += `${char.content.description}\n\n`;
          
          if (char.custom_fields && Object.keys(char.custom_fields).length > 0) {
            md += `### Custom Attributes\n`;
            Object.entries(char.custom_fields).forEach(([key, val]) => {
              md += `* **${key}:** ${val}\n`;
            });
            md += `\n`;
          }
          
          if (char.content.goals && char.content.goals.length > 0) {
            md += `### Goals & Motivations\n`;
            char.content.goals.forEach((goal) => {
              md += `* ${goal}\n`;
            });
            md += `\n`;
          }
          
          if (char.content.relationships && char.content.relationships.length > 0) {
            md += `### Relationships\n`;
            char.content.relationships.forEach((rel) => {
              md += `* **${rel.name}**: ${rel.relation}\n`;
            });
            md += `\n`;
          }
          
          if (char.content.quotes && char.content.quotes.length > 0) {
            md += `### Key Quotes\n`;
            char.content.quotes.forEach((quote) => {
              md += `> "${quote}"\n\n`;
            });
            md += `\n`;
          }
          
          if (char.metadata.notes) {
            md += `### Analytical Notes\n`;
            md += `${char.metadata.notes}\n\n`;
          }
          
          if (char.metadata.tags && char.metadata.tags.length > 0) {
            md += `*Tags: ${char.metadata.tags.map(t => `#${t}`).join(', ')}*\n\n`;
          }
          
          md += `\n---\n\n`;
        });
        zip.file('characters_dossier.md', md);

        // 4. Add manuscript.txt
        if (blueprint?.manuscript_text || manuscriptText) {
          const textToSave = blueprint?.manuscript_text || manuscriptText;
          const sha = blueprint?.manuscript_sha || await calculateSHA256(textToSave);
          const yamlHeader = `---
title: ${JSON.stringify(blueprint?.manuscript_title || manuscriptTitle)}
author: ${JSON.stringify(blueprint?.manuscript_author || manuscriptAuthor)}
manuscript_sha256: ${sha}
processed_date: ${blueprint?.first_processed || new Date().toISOString()}
---

`;
          zip.file('manuscript.txt', yamlHeader + textToSave);
        }
        
        // 5. Add images
        const referencedImages = new Set<string>();
        characters.forEach(char => {
          if (char.gallery) {
            char.gallery.forEach(p => referencedImages.add(p));
          }
        });
        referencedImages.forEach((imagePath) => {
          const dataUrl = images[imagePath];
          if (dataUrl) {
            const base64Data = dataUrl.split(',')[1];
            if (base64Data) {
              zip.file(imagePath, base64Data, { base64: true });
            }
          }
        });

        content = await zip.generateAsync({ type: 'blob' });
      }

      setDriveSaveStatus({ type: 'loading', message: `Uploading "${filename}" to Google Drive...` });
      
      const result = await uploadToGoogleDrive(currentToken, filename, mimeType, content);
      
      setDriveSaveStatus({ 
        type: 'success', 
        message: `Successfully uploaded "${filename}" to Google Drive!` 
      });
      alert(`Dossier "${filename}" successfully uploaded to your Google Drive!`);
    } catch (err: any) {
      console.error("Google Drive Save Error:", err);
      setDriveSaveStatus({ type: 'error', message: `Upload failed: ${err.message}` });
      alert(`Google Drive Upload Failed: ${err.message}`);
    } finally {
      setIsSavingToDrive(false);
    }
  };

  // Manuscript inputs
  const [manuscriptText, setManuscriptText] = useState('');
  const [manuscriptTitle, setManuscriptTitle] = useState('Untitled Manuscript');
  const [manuscriptAuthor, setManuscriptAuthor] = useState('Anonymous');
  const [manuscriptsHistory, setManuscriptsHistory] = useState<Array<{ 
    sha: string; 
    date: string; 
    title: string; 
    author: string; 
    text?: string; 
    tokens?: { promptTokens: number; completionTokens: number; totalTokens: number };
    optimization?: {
      originalLength: number;
      optimizedLength: number;
      charSavings: number;
      estimatedTokenSavings: number;
      wasOptimized: boolean;
      modelUsed: string;
    };
  }>>([]);

  // Load library history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('manuscript_library_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setManuscriptsHistory(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to load manuscript history from localStorage", e);
    }
  }, []);

  // Save library history to localStorage when updated
  useEffect(() => {
    try {
      localStorage.setItem('manuscript_library_history', JSON.stringify(manuscriptsHistory));
    } catch (e) {
      console.error("Failed to save manuscript history to localStorage", e);
    }
  }, [manuscriptsHistory]);

  const [editingManuscript, setEditingManuscript] = useState<{
    sha: string;
    title: string;
    author: string;
    text: string;
  } | null>(null);

  const handleSaveEdit = async () => {
    if (!editingManuscript) return;
    const { sha, title, author, text } = editingManuscript;
    
    // Update local state
    setManuscriptsHistory((prev) => 
      prev.map((item) => 
        item.sha === sha 
          ? { ...item, title, author, text } 
          : item
      )
    );

    // If this is currently active blueprint, update it too
    if (blueprint && (blueprint.manuscript_sha === sha || blueprint.sha === sha)) {
      setBlueprint((prev) => prev ? {
        ...prev,
        manuscript_title: title,
        manuscript_author: author,
        manuscript_text: text,
      } : null);
      setManuscriptTitle(title);
      setManuscriptAuthor(author);
      setManuscriptText(text);
    }

    // Sync to Firestore if logged in
    if (user) {
      try {
        await updateDossierMetadataInFirestore(user.uid, sha, title, author, text);
        if (autoBackupEnabled) {
          const charList = (blueprint && (blueprint.manuscript_sha === sha || blueprint.sha === sha)) ? characters : null;
          handleSendGmailBackup(charList || [], title, author, true)
            .catch((err) => console.error("Auto backup via Gmail on manuscript save failed:", err));
        }
      } catch (err: any) {
        console.error("Failed to update in Firestore:", err);
      }
    }

    setEditingManuscript(null);
    alert("Manuscript updated successfully!");
  };

  const handleDeleteManuscript = async (sha: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}" from your library? This action is irreversible.`)) {
      // Update local state
      setManuscriptsHistory((prev) => prev.filter((item) => item.sha !== sha));

      // If user is logged in, delete from Firestore
      if (user) {
        try {
          await deleteDossierFromFirestore(user.uid, sha);
        } catch (err: any) {
          console.error("Failed to delete from Firestore:", err);
        }
      }
      
      // If deleted manuscript is currently active in workspace, reset characters / active view
      if (blueprint && (blueprint.manuscript_sha === sha || blueprint.sha === sha)) {
        setBlueprint(null);
        setCharacters(null);
        setSelectedCharacter(null);
        setManuscriptText('');
        setManuscriptTitle('Untitled Manuscript');
        setManuscriptAuthor('Anonymous');
      }

      alert(`"${title}" deleted successfully.`);
    }
  };

  const handleDownloadSingleManuscript = (item: typeof manuscriptsHistory[0]) => {
    try {
      const textToSave = item.text || '';
      const yamlHeader = `---
title: ${JSON.stringify(item.title)}
author: ${JSON.stringify(item.author)}
manuscript_sha256: ${item.sha}
processed_date: ${item.date}
---

`;
      const fullContent = yamlHeader + textToSave;
      const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = (item.title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'manuscript';
      link.download = `${safeTitle}_processed.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Error generating download: " + err.message);
    }
  };

  const [blueprintNotes, setBlueprintNotes] = useState('');
  const [termReplacements, setTermReplacements] = useState<TermReplacement[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  
  // Token saving options state
  const [optimizeWhitespace, setOptimizeWhitespace] = useState(true);
  const [truncationLimit, setTruncationLimit] = useState<number>(0);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  
  // Drag and drop file upload state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blueprintFileInputRef = useRef<HTMLInputElement>(null);

  // Blueprint, State & Change Logs
  const [userBlueprints, setUserBlueprints] = useState<Array<Blueprint & { sidecar_logs?: SidecarLog[] }>>([]);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [sidecarLogs, setSidecarLogs] = useState<SidecarLog[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});

  const handleLoadManuscriptFromLibrary = (item: { sha: string; title: string; author: string; text?: string }) => {
    const matchingBp = userBlueprints.find(bp => bp.manuscript_sha === item.sha || bp.sha === item.sha);
    if (matchingBp) {
      setBlueprint(matchingBp);
      setManuscriptText(matchingBp.manuscript_text || item.text || '');
      setManuscriptTitle(matchingBp.manuscript_title || item.title || 'Untitled Manuscript');
      setManuscriptAuthor(matchingBp.manuscript_author || item.author || 'Anonymous');
      if (matchingBp.sidecar_logs) setSidecarLogs(matchingBp.sidecar_logs);
      if (matchingBp.characters && matchingBp.characters.length > 0) {
        setCharacters(matchingBp.characters);
        setSelectedCharacter(matchingBp.characters[0]);
      } else {
        setCharacters(null);
        setSelectedCharacter(null);
      }
      if (matchingBp.blueprint_notes) setBlueprintNotes(matchingBp.blueprint_notes);
      if (matchingBp.term_replacements) setTermReplacements(matchingBp.term_replacements);
    } else {
      setManuscriptText(item.text || '');
      setManuscriptTitle(item.title || 'Untitled Manuscript');
      setManuscriptAuthor(item.author || 'Anonymous');
    }
  };

  const handleAddImage = (path: string, dataUrl: string) => {
    setImages((prev) => ({ ...prev, [path]: dataUrl }));
  };

  const handleRemoveImage = (path: string) => {
    setImages((prev) => {
      const copy = { ...prev };
      delete copy[path];
      return copy;
    });
  };

  // Analysis result states
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [characters, setCharacters] = useState<CharacterProfile[] | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Active viewing tab for results: 'dossier', 'json', 'history' or 'research'
  const [activeTab, setActiveTab] = useState<'dossier' | 'json' | 'history' | 'research'>('dossier');

  // Notebook Research States
  const [notebooks, setNotebooks] = useState<ResearchNotebook[]>([]);
  const [currentNotebookId, setCurrentNotebookId] = useState<string | null>(null);

  // Multi-step loading messages to reassure and inform the user
  const loadingSteps = [
    "Receiving manuscript transmission...",
    "Scanning narrative chapters and paragraphs...",
    "Identifying active entities and aliases...",
    "Delineating character relationships and alignment...",
    "Synthesizing customized metadata fields...",
    "Assembling comprehensive dossier indexes..."
  ];

  // Starts the loading sequence simulation and fires the backend request
  const runAnalysis = async (textToAnalyze: string) => {
    if (!textToAnalyze.trim()) return;
    setLoading(true);
    setCharacters(null);
    setError(null);
    setLoadingStep(0);

    const mSha = await calculateSHA256(textToAnalyze);

    // Dynamic loading status messages interval
    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 1500);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          text: textToAnalyze,
          optimizeWhitespace,
          truncationLimit,
          model: selectedModel
        }),
      });

      const data: AnalysisResponse = await response.json();

      if (data.success && data.characters) {
        const nowStr = new Date().toISOString();
        const initialSha = await calculateSHA256(JSON.stringify(data.characters));
        
        const initialBlueprint: Blueprint = {
          sha: initialSha,
          first_processed: nowStr,
          last_edited: nowStr,
          characters: data.characters,
          manuscript_sha: mSha,
          manuscript_title: manuscriptTitle,
          manuscript_author: manuscriptAuthor,
          manuscript_text: textToAnalyze,
        };
        
        setBlueprint(initialBlueprint);
        setCharacters(data.characters);
        if (data.characters.length > 0) {
          setSelectedCharacter(data.characters[0]);
        }

        const newHistoryEntry = {
          sha: mSha,
          date: nowStr,
          title: manuscriptTitle,
          author: manuscriptAuthor,
          text: textToAnalyze,
          tokens: data.tokens,
          optimization: data.optimization,
        };
        setManuscriptsHistory((prev) => {
          const filtered = prev.filter(h => h.sha !== mSha);
          const updated = [newHistoryEntry, ...filtered];
          return updated.slice(0, 5);
        });

        if (data.tokens) {
          setTokenUsage(prev => ({
            prompt: prev.prompt + data.tokens!.promptTokens,
            completion: prev.completion + data.tokens!.completionTokens,
            total: prev.total + data.tokens!.totalTokens
          }));
        }

        const tokenDetails = data.tokens
          ? ` (Tokens: Prompt: ${data.tokens.promptTokens.toLocaleString()}, Completion: ${data.tokens.completionTokens.toLocaleString()}, Total: ${data.tokens.totalTokens.toLocaleString()})`
          : '';
        const optDetails = data.optimization?.wasOptimized
          ? ` [Optimized via ${data.optimization.modelUsed}: saved ${data.optimization.charSavings.toLocaleString()} characters (~${data.optimization.estimatedTokenSavings.toLocaleString()} tokens)]`
          : ` [Model: ${data.optimization?.modelUsed || 'gemini-3.5-flash'}]`;

        const initialLog: SidecarLog = {
          timestamp: nowStr,
          action: 'Initial Extraction',
          details: `Extracted ${data.characters.length} character profiles from narrative manuscript. Title: "${manuscriptTitle}" by ${manuscriptAuthor}.${optDetails} Manuscript SHA-256: ${mSha.slice(0, 12)}...${tokenDetails}`
        };
        setSidecarLogs([initialLog]);

        if (user) {
          saveDossierToFirestore(user.uid, initialBlueprint, [initialLog])
            .catch((err) => console.error("Auto-saving new analysis to Firestore failed:", err));
          setUserBlueprints((prev) => [
            { ...initialBlueprint, sidecar_logs: [initialLog] },
            ...prev.filter((b) => b.manuscript_sha !== initialBlueprint.manuscript_sha && b.sha !== initialBlueprint.sha)
          ]);
        }

        if (autoBackupEnabled) {
          handleSendGmailBackup(data.characters, manuscriptTitle, manuscriptAuthor, true)
            .catch((err) => console.error("Auto backup via Gmail failed:", err));
        }
      } else {
        setError(data.error || "The literary analysis engine encountered a parsing failure.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to connect to the character profiling server. Check if your API Key is correctly configured.");
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  const handleBlueprintUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    if (file.name.endsWith('.phole') || file.name.endsWith('.zip') || file.name.endsWith('.phole.zip')) {
      const zipReader = new FileReader();
      zipReader.onload = async (event) => {
        try {
          if (event.target && event.target.result instanceof ArrayBuffer) {
            const zip = await JSZip.loadAsync(event.target.result);
            
            // 1. Load character_blueprint.json
            const blueprintFile = zip.file('character_blueprint.json');
            if (!blueprintFile) {
              throw new Error("Invalid .phole file. Missing character_blueprint.json.");
            }
            
            const blueprintText = await blueprintFile.async('text');
            const parsedBlueprint = JSON.parse(blueprintText);
            
            // 2. Load sidecar_changelog.json if present
            const changelogFile = zip.file('sidecar_changelog.json');
            let loadedLogs: SidecarLog[] = [];
            let loadedHistory: any[] = [];
            if (changelogFile) {
              const logsText = await changelogFile.async('text');
              try {
                const parsedLogs = JSON.parse(logsText);
                if (parsedLogs && typeof parsedLogs === 'object' && !Array.isArray(parsedLogs)) {
                  loadedLogs = parsedLogs.logs || [];
                  loadedHistory = parsedLogs.manuscripts || [];
                } else if (Array.isArray(parsedLogs)) {
                  loadedLogs = parsedLogs;
                }
              } catch (e) {
                console.error("Failed to parse changelog", e);
              }
            }
            
            // 3. Load all gallery images as DataURLs
            const loadedImages: Record<string, string> = {};
            const imagePaths: string[] = [];
            
            const charsList: CharacterProfile[] = parsedBlueprint.characters || parsedBlueprint;
            if (!Array.isArray(charsList)) {
              throw new Error("Invalid character blueprint structure.");
            }
            
            charsList.forEach(char => {
              if (char.gallery) {
                char.gallery.forEach(path => {
                  imagePaths.push(path);
                });
              }
            });
            
            for (const path of imagePaths) {
              const imgFile = zip.file(path);
              if (imgFile) {
                const ext = path.split('.').pop()?.toLowerCase() || 'png';
                let mimeType = 'image/png';
                if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
                else if (ext === 'webp') mimeType = 'image/webp';
                else if (ext === 'gif') mimeType = 'image/gif';
                
                const base64Content = await imgFile.async('base64');
                loadedImages[path] = `data:${mimeType};base64,${base64Content}`;
              }
            }
            
            let uploadedBlueprint: Blueprint;
            if (Array.isArray(parsedBlueprint)) {
              const nowStr = new Date().toISOString();
              uploadedBlueprint = {
                sha: await calculateSHA256(JSON.stringify(parsedBlueprint)),
                first_processed: nowStr,
                last_edited: nowStr,
                characters: parsedBlueprint,
              };
            } else {
              uploadedBlueprint = {
                sha: parsedBlueprint.sha || await calculateSHA256(JSON.stringify(parsedBlueprint.characters)),
                first_processed: parsedBlueprint.first_processed || new Date().toISOString(),
                last_edited: parsedBlueprint.last_edited || new Date().toISOString(),
                characters: parsedBlueprint.characters,
                manuscript_sha: parsedBlueprint.manuscript_sha,
                manuscript_title: parsedBlueprint.manuscript_title,
                manuscript_author: parsedBlueprint.manuscript_author,
                manuscript_text: parsedBlueprint.manuscript_text,
                blueprint_notes: parsedBlueprint.blueprint_notes || '',
                term_replacements: parsedBlueprint.term_replacements || [],
              };
              if (parsedBlueprint.manuscripts_history && parsedBlueprint.manuscripts_history.length > 0) {
                loadedHistory = parsedBlueprint.manuscripts_history;
              }
            }
            
            // 4. Load manuscript.txt / manuscript.md if present inside .phole
            const manuscriptFile = zip.file('manuscript.txt') || zip.file('manuscript.md');
            if (manuscriptFile) {
              const mText = await manuscriptFile.async('text');
              setManuscriptText(mText);
            } else if (uploadedBlueprint.manuscript_text) {
              setManuscriptText(uploadedBlueprint.manuscript_text);
            }
            
            setImages((prev) => ({ ...prev, ...loadedImages }));
            setBlueprint(uploadedBlueprint);
            setCharacters(uploadedBlueprint.characters);
            setManuscriptsHistory(loadedHistory);
            setBlueprintNotes(uploadedBlueprint.blueprint_notes || '');
            setTermReplacements(uploadedBlueprint.term_replacements || []);
            setManuscriptTitle(uploadedBlueprint.manuscript_title || "Untitled Manuscript");
            setManuscriptAuthor(uploadedBlueprint.manuscript_author || "Anonymous");
            if (uploadedBlueprint.characters.length > 0) {
              setSelectedCharacter(uploadedBlueprint.characters[0]);
            }
            
            let finalLogs = loadedLogs;
            if (loadedLogs.length > 0) {
              setSidecarLogs(loadedLogs);
            } else {
              const nowStr = new Date().toISOString();
              const log: SidecarLog = {
                timestamp: nowStr,
                action: 'Bundle Imported',
                details: `Successfully imported .phole package with ${uploadedBlueprint.characters.length} characters and ${Object.keys(loadedImages).length} images.`
              };
              setSidecarLogs([log]);
              finalLogs = [log];
            }

            if (!uploadedBlueprint.manuscript_sha) {
              uploadedBlueprint.manuscript_sha = uploadedBlueprint.sha;
            }

            if (user) {
              saveDossierToFirestore(user.uid, uploadedBlueprint, finalLogs)
                .then(() => {
                  console.log("Auto-saved imported .phole to Firestore.");
                  if (autoBackupEnabled) {
                    handleSendGmailBackup(uploadedBlueprint.characters, uploadedBlueprint.manuscript_title, uploadedBlueprint.manuscript_author, true)
                      .catch((err) => console.error("Auto backup via Gmail on upload failed:", err));
                  }
                })
                .catch((err) => console.error("Auto-saving imported .phole to Firestore failed:", err));
            }
          }
        } catch (err: any) {
          alert("Error parsing .phole package: " + err.message);
        }
      };
      zipReader.readAsArrayBuffer(file);
      e.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        if (event.target && typeof event.target.result === 'string') {
          const parsed = JSON.parse(event.target.result);
          
          let uploadedBlueprint: Blueprint;
          let loadedHistory: any[] = [];
          
          if (Array.isArray(parsed)) {
            const nowStr = new Date().toISOString();
            uploadedBlueprint = {
              sha: await calculateSHA256(JSON.stringify(parsed)),
              first_processed: nowStr,
              last_edited: nowStr,
              characters: parsed,
            };
          } else if (parsed.characters && Array.isArray(parsed.characters)) {
            uploadedBlueprint = {
              sha: parsed.sha || await calculateSHA256(JSON.stringify(parsed.characters)),
              first_processed: parsed.first_processed || new Date().toISOString(),
              last_edited: parsed.last_edited || new Date().toISOString(),
              characters: parsed.characters,
              manuscript_sha: parsed.manuscript_sha,
              manuscript_title: parsed.manuscript_title,
              manuscript_author: parsed.manuscript_author,
              manuscript_text: parsed.manuscript_text,
              blueprint_notes: parsed.blueprint_notes || '',
              term_replacements: parsed.term_replacements || [],
            };
            if (parsed.manuscripts_history && parsed.manuscripts_history.length > 0) {
              loadedHistory = parsed.manuscripts_history;
            }
          } else {
            throw new Error("Invalid structure. Needs a characters list.");
          }
          
          setBlueprint(uploadedBlueprint);
          setCharacters(uploadedBlueprint.characters);
          setManuscriptsHistory(loadedHistory);
          setBlueprintNotes(uploadedBlueprint.blueprint_notes || '');
          setTermReplacements(uploadedBlueprint.term_replacements || []);
          setManuscriptTitle(uploadedBlueprint.manuscript_title || "Untitled Manuscript");
          setManuscriptAuthor(uploadedBlueprint.manuscript_author || "Anonymous");
          if (uploadedBlueprint.manuscript_text) {
            setManuscriptText(uploadedBlueprint.manuscript_text);
          }
          
          if (uploadedBlueprint.characters.length > 0) {
            setSelectedCharacter(uploadedBlueprint.characters[0]);
          }
          
          const nowStr = new Date().toISOString();
          const initialLog: SidecarLog = {
            timestamp: nowStr,
            action: 'Blueprint Uploaded',
            details: `Uploaded blueprint file containing ${uploadedBlueprint.characters.length} characters. SHA: ${uploadedBlueprint.sha.slice(0, 10)}`
          };
          setSidecarLogs([initialLog]);

          if (!uploadedBlueprint.manuscript_sha) {
            uploadedBlueprint.manuscript_sha = uploadedBlueprint.sha;
          }

          if (user) {
            saveDossierToFirestore(user.uid, uploadedBlueprint, [initialLog])
              .then(() => {
                console.log("Auto-saved uploaded JSON blueprint to Firestore.");
                if (autoBackupEnabled) {
                  handleSendGmailBackup(uploadedBlueprint.characters, uploadedBlueprint.manuscript_title, uploadedBlueprint.manuscript_author, true)
                    .catch((err) => console.error("Auto backup via Gmail on upload failed:", err));
                }
              })
              .catch((err) => console.error("Auto-saving uploaded JSON blueprint to Firestore failed:", err));
          }
        }
      } catch (err: any) {
        alert("Error parsing Blueprint file: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadMarkdown = () => {
    if (!characters) return;
    
    let md = `# Universal Character Dossier Extractor - Blueprint Report\n\n`;
    md += `* **First Processed:** ${blueprint?.first_processed || new Date().toISOString()}\n`;
    md += `* **Last Edited:** ${blueprint?.last_edited || new Date().toISOString()}\n`;
    md += `* **Blueprint SHA-256 Checksum:** ${blueprint?.sha || 'N/A'}\n`;
    md += `* **Total Characters:** ${characters.length}\n\n`;
    md += `---\n\n`;
    
    characters.forEach((char) => {
      md += `## ${char.core.name} ${char.core.nickname ? `(Alias: ${char.core.nickname})` : ''}\n\n`;
      md += `### Core Parameters\n`;
      md += `* **Role:** ${char.core.role}\n`;
      md += `* **Species:** ${char.core.species}\n`;
      md += `* **Status:** ${char.core.living_status}\n`;
      if (char.metadata.first_appearance) {
        md += `* **First Appearance:** ${char.metadata.first_appearance}\n`;
      }
      md += `\n`;
      
      md += `### Description\n`;
      md += `${char.content.description}\n\n`;
      
      if (char.custom_fields && Object.keys(char.custom_fields).length > 0) {
        md += `### Custom Attributes\n`;
        Object.entries(char.custom_fields).forEach(([key, val]) => {
          md += `* **${key}:** ${val}\n`;
        });
        md += `\n`;
      }
      
      if (char.content.goals && char.content.goals.length > 0) {
        md += `### Goals & Motivations\n`;
        char.content.goals.forEach((goal) => {
          md += `* ${goal}\n`;
        });
        md += `\n`;
      }
      
      if (char.content.relationships && char.content.relationships.length > 0) {
        md += `### Relationships\n`;
        char.content.relationships.forEach((rel) => {
          md += `* **${rel.name}**: ${rel.relation}\n`;
        });
        md += `\n`;
      }
      
      if (char.content.quotes && char.content.quotes.length > 0) {
        md += `### Key Quotes\n`;
        char.content.quotes.forEach((quote) => {
          md += `> "${quote}"\n\n`;
        });
        md += `\n`;
      }
      
      if (char.metadata.notes) {
        md += `### Analytical Notes\n`;
        md += `${char.metadata.notes}\n\n`;
      }
      
      if (char.metadata.tags && char.metadata.tags.length > 0) {
        md += `*Tags: ${char.metadata.tags.map(t => `#${t}`).join(', ')}*\n\n`;
      }
      
      md += `\n---\n\n`;
    });
    
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'characters_dossier.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSidecarLog = () => {
    const sidecarData = {
      manuscripts_history: manuscriptsHistory,
      changelog: sidecarLogs,
      term_replacements: termReplacements,
      blueprint_notes: blueprintNotes,
    };
    const logJson = JSON.stringify(sidecarData, null, 2);
    const blob = new Blob([logJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sidecar_changelog.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadManuscript = async () => {
    if (!manuscriptText) return;
    try {
      const sha = await calculateSHA256(manuscriptText);
      const nowStr = new Date().toISOString();
      const yamlHeader = `---
title: ${JSON.stringify(manuscriptTitle)}
author: ${JSON.stringify(manuscriptAuthor)}
manuscript_sha256: ${sha}
processed_date: ${nowStr}
---

`;
      const fullContent = yamlHeader + manuscriptText;
      const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = manuscriptTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'manuscript';
      link.download = `${safeTitle}_processed.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Error generating manuscript download: " + err.message);
    }
  };

  const handleDownloadPhole = async () => {
    if (!characters || !blueprint) return;
    
    try {
      const zip = new JSZip();
      
      // 1. Add character_blueprint.json
      const latestBlueprint = {
        ...blueprint,
        characters: characters,
        manuscripts_history: manuscriptsHistory,
        blueprint_notes: blueprintNotes,
        term_replacements: termReplacements,
      };
      zip.file('character_blueprint.json', JSON.stringify(latestBlueprint, null, 2));
      
      // 2. Add sidecar_changelog.json
      const sidecarData = {
        manuscripts_history: manuscriptsHistory,
        changelog: sidecarLogs,
        term_replacements: termReplacements,
        blueprint_notes: blueprintNotes,
      };
      zip.file('sidecar_changelog.json', JSON.stringify(sidecarData, null, 2));
      
      // 3. Add characters_dossier.md
      let md = `# Universal Character Dossier Extractor - Blueprint Report\n\n`;
      md += `* **First Processed:** ${blueprint.first_processed || new Date().toISOString()}\n`;
      md += `* **Last Edited:** ${blueprint.last_edited || new Date().toISOString()}\n`;
      md += `* **Blueprint SHA-256 Checksum:** ${blueprint.sha || 'N/A'}\n`;
      md += `* **Total Characters:** ${characters.length}\n\n`;
      md += `---\n\n`;
      
      characters.forEach((char) => {
        md += `## ${char.core.name} ${char.core.nickname ? `(Alias: ${char.core.nickname})` : ''}\n\n`;
        md += `### Core Parameters\n`;
        md += `* **Role:** ${char.core.role}\n`;
        md += `* **Species:** ${char.core.species}\n`;
        md += `* **Status:** ${char.core.living_status}\n`;
        if (char.metadata.first_appearance) {
          md += `* **First Appearance:** ${char.metadata.first_appearance}\n`;
        }
        md += `\n`;
        
        md += `### Description\n`;
        md += `${char.content.description}\n\n`;
        
        if (char.custom_fields && Object.keys(char.custom_fields).length > 0) {
          md += `### Custom Attributes\n`;
          Object.entries(char.custom_fields).forEach(([key, val]) => {
            md += `* **${key}:** ${val}\n`;
          });
          md += `\n`;
        }
        
        if (char.content.goals && char.content.goals.length > 0) {
          md += `### Goals & Motivations\n`;
          char.content.goals.forEach((goal) => {
            md += `* ${goal}\n`;
          });
          md += `\n`;
        }
        
        if (char.content.relationships && char.content.relationships.length > 0) {
          md += `### Relationships\n`;
          char.content.relationships.forEach((rel) => {
            md += `* **${rel.name}**: ${rel.relation}\n`;
          });
          md += `\n`;
        }
        
        if (char.content.quotes && char.content.quotes.length > 0) {
          md += `### Key Quotes\n`;
          char.content.quotes.forEach((quote) => {
            md += `> "${quote}"\n\n`;
          });
          md += `\n`;
        }
        
        if (char.metadata.notes) {
          md += `### Analytical Notes\n`;
          md += `${char.metadata.notes}\n\n`;
        }
        
        if (char.metadata.tags && char.metadata.tags.length > 0) {
          md += `*Tags: ${char.metadata.tags.map(t => `#${t}`).join(', ')}*\n\n`;
        }
        
        md += `\n---\n\n`;
      });
      zip.file('characters_dossier.md', md);

      // 5. Add manuscript.txt with YAML front matter header
      if (blueprint.manuscript_text || manuscriptText) {
        const textToSave = blueprint.manuscript_text || manuscriptText;
        const sha = blueprint.manuscript_sha || await calculateSHA256(textToSave);
        const yamlHeader = `---
title: ${JSON.stringify(blueprint.manuscript_title || manuscriptTitle)}
author: ${JSON.stringify(blueprint.manuscript_author || manuscriptAuthor)}
manuscript_sha256: ${sha}
processed_date: ${blueprint.first_processed || new Date().toISOString()}
---

`;
        zip.file('manuscript.txt', yamlHeader + textToSave);
      }
      
      // 4. Add gallery photos as relative paths
      const referencedImages = new Set<string>();
      characters.forEach(char => {
        if (char.gallery) {
          char.gallery.forEach(path => referencedImages.add(path));
        }
      });
      
      referencedImages.forEach((imagePath) => {
        const dataUrl = images[imagePath];
        if (dataUrl) {
          const base64Data = dataUrl.split(',')[1];
          if (base64Data) {
            zip.file(imagePath, base64Data, { base64: true });
          }
        }
      });
      
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Extract metadata for the custom filename format
      const titleRaw = blueprint.manuscript_title || manuscriptTitle || 'untitled';
      const authorRaw = blueprint.manuscript_author || manuscriptAuthor || 'anon';
      const sha256_prefix = (blueprint.sha || '').slice(0, 8) || 'unknown';
      
      const sanitizedTitle = titleRaw
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/(^_|_$)/g, '');
        
      const authorInitials = authorRaw
        .split(/\s+/)
        .map((word) => word.charAt(0))
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

      const filename = `${sanitizedTitle || 'untitled'}_${sha256_prefix}_${authorInitials || 'anon'}.phole.zip`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Error packaging .phole bundle: " + err.message);
    }
  };

  const countOccurrences = (word: string, sourceText: string) => {
    if (!word.trim()) return 0;
    try {
      const escaped = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      return (sourceText.match(regex) || []).length;
    } catch (e) {
      return 0;
    }
  };

  const rescanManuscript = () => {
    const updated = termReplacements.map((rep) => {
      const currentCount = countOccurrences(rep.from, manuscriptText);
      return {
        ...rep,
        currentCount,
      };
    });
    setTermReplacements(updated);
    alert("Manuscript scan complete! Counts of term occurrences have been updated.");
  };

  const applyReplacement = (fromWord: string, toWord: string) => {
    if (!manuscriptText.trim()) return;
    try {
      const escaped = fromWord.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      const newText = manuscriptText.replace(regex, toWord);
      setManuscriptText(newText);
      
      const updated = termReplacements.map((rep) => {
        if (rep.from.toLowerCase() === fromWord.toLowerCase()) {
          return {
            ...rep,
            currentCount: 0,
          };
        }
        return rep;
      });
      setTermReplacements(updated);
      alert(`Successfully replaced all instances of "${fromWord}" with "${toWord}" in the manuscript!`);
    } catch (e) {
      alert("Failed to apply replacement: " + e);
    }
  };

  const handleUpdateCharacter = async (updatedChar: CharacterProfile, changeDetails: string) => {
    if (!characters) return;
    
    const index = characters.findIndex(
      (c) => c.core.name.toLowerCase() === selectedCharacter?.core.name.toLowerCase()
    );
    
    if (index === -1) return;

    // Check if character name is being renamed
    const oldName = selectedCharacter?.core.name.trim() || '';
    const newName = updatedChar.core.name.trim() || '';
    const isRename = oldName && newName && oldName.toLowerCase() !== newName.toLowerCase();

    const updatedCharacters = [...characters];
    updatedCharacters[index] = updatedChar;
    
    const nowStr = new Date().toISOString();
    
    let updatedReplacements = [...termReplacements];
    if (isRename) {
      const originalCount = countOccurrences(oldName, manuscriptText);
      const currentCount = countOccurrences(oldName, manuscriptText);
      
      const existsIdx = updatedReplacements.findIndex(r => r.from.toLowerCase() === oldName.toLowerCase());
      if (existsIdx > -1) {
        updatedReplacements[existsIdx] = {
          ...updatedReplacements[existsIdx],
          to: newName,
          timestamp: nowStr,
          currentCount,
        };
      } else {
        updatedReplacements.push({
          from: oldName,
          to: newName,
          timestamp: nowStr,
          originalCount,
          currentCount,
        });
      }
      setTermReplacements(updatedReplacements);
    }

    const charactersJson = JSON.stringify(updatedCharacters);
    const newSha = await calculateSHA256(charactersJson);
    
    const nextBlueprint: Blueprint = {
      sha: newSha,
      first_processed: blueprint?.first_processed || nowStr,
      last_edited: nowStr,
      characters: updatedCharacters,
      manuscript_sha: blueprint?.manuscript_sha,
      manuscript_title: blueprint?.manuscript_title,
      manuscript_author: blueprint?.manuscript_author,
      manuscript_text: manuscriptText,
      blueprint_notes: blueprintNotes,
      term_replacements: updatedReplacements,
    };
    
    setBlueprint(nextBlueprint);
    setCharacters(updatedCharacters);
    setSelectedCharacter(updatedChar);
    
    const newLog: SidecarLog = {
      timestamp: nowStr,
      action: isRename ? 'Character Renamed' : 'Character Edited',
      details: changeDetails,
    };
    setSidecarLogs((prev) => [newLog, ...prev]);

    if (user) {
      const updatedLogs = [newLog, ...sidecarLogs];
      saveDossierToFirestore(user.uid, nextBlueprint, updatedLogs)
        .catch((err) => console.error("Auto-saving updated blueprint to Firestore failed:", err));
      setUserBlueprints((prev) => [
        { ...nextBlueprint, sidecar_logs: updatedLogs },
        ...prev.filter((b) => b.manuscript_sha !== nextBlueprint.manuscript_sha && b.sha !== nextBlueprint.sha)
      ]);
      if (autoBackupEnabled) {
        handleSendGmailBackup(updatedCharacters, blueprint?.manuscript_title || manuscriptTitle, blueprint?.manuscript_author || manuscriptAuthor, true)
          .catch((err) => console.error("Auto backup via Gmail on character update failed:", err));
      }
    }
  };

  const handleSelectSample = (excerpt: string) => {
    setManuscriptText(excerpt);
    const sample = SAMPLE_MANUSCRIPTS.find((s) => s.excerpt === excerpt);
    if (sample) {
      setSelectedSampleId(sample.id);
      setManuscriptTitle(sample.title);
      setManuscriptAuthor(sample.author);
    } else {
      setSelectedSampleId(null);
    }
  };

  // Drag & Drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processUploadedFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processUploadedFile(files[0]);
    }
  };

  const processUploadedFile = (file: File) => {
    if (!file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
      alert("Unsupported file format. Please upload a plain text (.txt) or markdown (.md) file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && typeof event.target.result === 'string') {
        setManuscriptText(event.target.result);
        setSelectedSampleId(null); // Clear sample ID since it is custom user text
      }
    };
    reader.readAsText(file);
  };

  const resetWorkspace = () => {
    setCharacters(null);
    setSelectedCharacter(null);
    setError(null);
    setCreatedDocUrl(null);
  };

  const getOptimizationPreview = () => {
    if (!manuscriptText) return null;
    let textToCompare = manuscriptText;
    let truncated = false;
    if (truncationLimit > 0 && textToCompare.length > truncationLimit) {
      textToCompare = textToCompare.slice(0, truncationLimit);
      truncated = true;
    }
    const originalLen = manuscriptText.length;
    let finalLen = textToCompare.length;
    if (optimizeWhitespace) {
      finalLen = textToCompare
        .replace(/[ \t]+/g, ' ')
        .replace(/\r?\n\s*\r?\n/g, '\n\n')
        .trim().length;
    }
    const savings = originalLen - finalLen;
    const estSavingsTokens = Math.round(savings / 4);

    // Estimate total tokens to process
    const estInputTokens = Math.round(finalLen / 4);
    // Standard dossier output size of ~3,000 tokens
    const estOutputTokens = 3000;

    const isLite = selectedModel === 'gemini-3.1-flash-lite';
    const inputRate = isLite ? 0.0375 : 0.075; // USD per 1M tokens
    const outputRate = isLite ? 0.15 : 0.30; // USD per 1M tokens

    const estInputCost = (estInputTokens * inputRate) / 1000000;
    const estOutputCost = (estOutputTokens * outputRate) / 1000000;
    const estTotalCost = estInputCost + estOutputCost;

    return {
      savings,
      estSavingsTokens,
      truncated,
      finalLen,
      originalLen,
      estInputTokens,
      estInputCost,
      estOutputCost,
      estTotalCost
    };
  };
  const previewStats = getOptimizationPreview();

  if (authInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6" id="auth-initializing-screen">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white animate-pulse shadow-md">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Initializing Plothole</h2>
            <p className="text-xs text-slate-400 mt-1">Connecting to secure literary database...</p>
          </div>
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mt-2" />
        </div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row" id="auth-login-screen">
        {/* Left Side: Brand Visual Panel */}
        <div className="md:w-1/2 bg-slate-900 text-white p-8 md:p-16 flex flex-col justify-between border-r border-slate-800 relative overflow-hidden shrink-0">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />
          
          <div className="relative flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow">
              P
            </div>
            <span className="text-lg font-extrabold tracking-tight">Plothole</span>
          </div>

          <div className="relative space-y-6 my-12 md:my-auto">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI-Powered Manuscript Intelligence</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight text-white">
              Uncover the architecture of your storytelling.
            </h2>
            <p className="text-slate-400 text-xs md:text-sm leading-relaxed max-w-md">
              Plothole analyzes raw literary manuscripts to automatically compile highly structured character profiles, mapping relational arcs, psychological dynamics, and narrative motifs.
            </p>

            {/* Feature Bullet Points */}
            <div className="space-y-3.5 pt-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-200">Structured Character Dossiers</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Generate detailed attributes, internal motivations, secrets, and key quotes.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-200">Interactive Social Maps</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Visualize alignment, hostility, and alliance dynamics between characters.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-200">Cloud & Google Drive Synchronization</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Durable saving to cloud libraries with one-click export to Drive file storage.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative text-[10px] text-slate-500 font-mono">
            Plothole v1.2.0 • Secure Cloud Auth Gated Workspace
          </div>
        </div>

        {/* Right Side: Login Box */}
        <div className="flex-1 bg-white flex flex-col justify-center items-center p-8 md:p-16 relative">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sign In to Your Workspace</h2>
              <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                Connect your Google account to access your personal manuscript extractor and sync with your Drive storage.
                <br/>
                Or, <button onClick={() => setIsGuest(true)} className="underline font-semibold text-blue-600">try out Plothole as a Guest</button> without saving features.
              </p>
            </div>

            {/* Active Authentication Error Badge */}
            {activeAuthError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2 text-left animate-fade-in" id="login-active-error-banner">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold text-[10px] text-red-800 font-mono uppercase tracking-wider block">
                      Authentication Failed ({activeAuthError.code || 'UNKNOWN'})
                    </span>
                    <p className="text-[11px] text-red-700 font-medium leading-relaxed">
                      {activeAuthError.message}
                    </p>
                    {activeAuthError.type === 'unauthorized-domain' && (
                      <p className="text-[10px] text-amber-700 font-bold bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                        💡 Domain Whitelisting required. Click the "Auth Setup Help" button below for a 1-minute step-by-step resolution.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Google Login Action Button */}
            <div className="space-y-4">
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                id="login-page-google-signin"
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl shadow-xs hover:shadow-sm transition-all cursor-pointer select-none active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-xs"
              >
                {isLoggingIn ? (
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                )}
                <span>{isLoggingIn ? 'Signing in securely...' : 'Sign in with Google'}</span>
              </button>

              <div className="flex items-center justify-between gap-4 py-2">
                <hr className="flex-1 border-slate-100" />
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Troubleshooting</span>
                <hr className="flex-1 border-slate-100" />
              </div>

              {/* Troubleshooting action trigger */}
              <button
                onClick={() => setAuthHelpOpen(true)}
                id="login-page-help-btn"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer text-xs font-bold"
              >
                <HelpCircle className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Google Auth Setup & Error Help Guide</span>
              </button>
            </div>

            {/* Changelog Card */}
            <div className="border-t border-slate-100 pt-6 text-left space-y-3">
              <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Project Changelog</h4>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3 max-h-48 overflow-y-auto select-scrollbar text-[11px] text-slate-600">
                <div className="space-y-1">
                  <p className="font-bold text-slate-800 flex justify-between">
                    <span>v1.2.0 - Research & Automatic Gmail Sync</span>
                    <span className="font-mono text-[9px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">Latest</span>
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-500">
                    <li>Added automated real-time background Gmail sync pipeline for Research Notebooks and sources.</li>
                    <li>Integrated robust duplicate warnings and validation for webpage sources based on URL uniqueness.</li>
                    <li>Added search and indexing tool within Research Library to filter sources by text and data.</li>
                    <li>Fixed list and document detail panel source delete triggers in NotebookLM view.</li>
                  </ul>
                </div>
                <hr className="border-slate-200/60" />
                <div className="space-y-1">
                  <p className="font-bold text-slate-800">v1.1.0 - Core Intelligence & Cloud Integration</p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-500">
                    <li>Integrated Google Workspace suite supporting Drive browser and Docs blueprint exporting.</li>
                    <li>Bootstrapped durable Firestore database schemas to persist manuscripts, dossiers, and notes.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 space-y-3.5 text-left text-[11px] text-slate-500 leading-relaxed font-medium">
              <p>
                🛡️ <strong>GDPR & Privacy Compliant:</strong> Plothole does not share your uploaded manuscripts or character dossiers with external parties. Drive documents are synced using sandboxed file permissions.
              </p>
              <p>
                🌐 <strong>Connection Alert:</strong> If you are running this app for the first time in a new environment, make sure your specific preview domain is authorized. Click the help guide above for instant instructions.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans" id="app-root-container">
      {isGuest && (
        <div className="bg-amber-100 text-amber-900 p-3 text-center text-sm border-b border-amber-200">
          <strong>Trial Mode:</strong> You are using Plothole without an account. Some saving features (Cloud/Drive/Gmail) are disabled. 
          <button onClick={() => { setIsGuest(false); googleSignIn(); }} className="underline font-semibold mx-2">Sign in</button>
        </div>
      )}
      <TokenUsageWidget usage={tokenUsage} />
      {/* Top Banner & Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm" id="app-header">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-sans text-lg font-bold shadow-sm">
              P
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800">
                Plothole
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Sleek manuscript analysis & character extraction
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono">
              v1.2.0 Full-Stack
            </span>

            <button
              onClick={() => setAuthHelpOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:text-blue-600 hover:bg-slate-50 border border-slate-200 hover:border-blue-200 rounded-full transition-all cursor-pointer bg-white text-[10px] font-bold shadow-2xs animate-fade-in"
              title="Google Auth & Drive Troubleshooting Setup Guide"
              id="auth-guide-trigger-btn"
            >
              <HelpCircle className="w-3 h-3 text-blue-500" />
              <span>Auth Setup Help</span>
            </button>

            {user ? (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-1.5 pr-3.5 rounded-full text-xs" id="auth-profile-widget">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-7 h-7 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
                  </div>
                )}
                <div className="text-left hidden md:block">
                  <p className="font-semibold text-slate-800 leading-tight max-w-[120px] truncate">{user.displayName || 'Author'}</p>
                  <p className="text-[9px] text-slate-400 leading-none truncate max-w-[120px]">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  id="auth-logout-btn"
                  className="ml-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                id="auth-login-btn"
                className="flex items-center gap-2 px-3.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 active:bg-slate-50 text-slate-700 text-xs font-bold rounded-full shadow-sm transition-all cursor-pointer hover:shadow"
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-3.5 h-3.5">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                </span>
                <span>{isLoggingIn ? 'Signing in...' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* View Mode Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 shadow-sm" id="main-view-navigation">
        <div className="max-w-6xl mx-auto px-4 flex gap-6">
          <button
            onClick={() => setViewMode('analyzer')}
            className={`flex items-center gap-2 py-4 text-xs font-semibold tracking-wider uppercase border-b-2 focus:outline-none transition-all cursor-pointer ${
              viewMode === 'analyzer'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Analyzer Workstation</span>
          </button>

          <button
            onClick={() => setViewMode('oracle')}
            className={`flex items-center gap-2 py-4 text-xs font-semibold tracking-wider uppercase border-b-2 focus:outline-none transition-all cursor-pointer relative ${
              viewMode === 'oracle'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            id="oracle-tab-trigger"
          >
            <Bot className="w-4 h-4 text-indigo-600 animate-pulse" />
            <span>The Oracle (AI Analyst)</span>
            <span className="ml-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-1.5 py-0.5 rounded text-[9px] font-extrabold font-mono tracking-tight">
              RAG
            </span>
          </button>

          <button
            onClick={() => setViewMode('stenopad')}
            className={`flex items-center gap-2 py-4 text-xs font-semibold tracking-wider uppercase border-b-2 focus:outline-none transition-all cursor-pointer relative ${
              viewMode === 'stenopad'
                ? 'border-amber-600 text-amber-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            id="stenopad-tab-trigger"
          >
            <PenTool className="w-4 h-4 text-amber-600" />
            <span>Stenopad (#WikiTags)</span>
            <span className="ml-1 bg-amber-500 text-white px-1.5 py-0.5 rounded text-[9px] font-extrabold font-mono tracking-tight">
              New
            </span>
          </button>

          <button
            onClick={() => setViewMode('research')}
            className={`flex items-center gap-2 py-4 text-xs font-semibold tracking-wider uppercase border-b-2 focus:outline-none transition-all cursor-pointer relative ${
              viewMode === 'research'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            id="research-tab-trigger"
          >
            <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
            <span>Research Library (NotebookLM)</span>
          </button>
          
          <button
            onClick={() => setViewMode('library')}
            className={`flex items-center gap-2 py-4 text-xs font-semibold tracking-wider uppercase border-b-2 focus:outline-none transition-all cursor-pointer relative ${
              viewMode === 'library'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>Manuscript Library & Registry</span>
            {manuscriptsHistory.length > 0 && (
              <span className="ml-1.5 bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold font-mono">
                {manuscriptsHistory.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setViewMode('settings')}
            className={`flex items-center gap-2 py-4 text-xs font-semibold tracking-wider uppercase border-b-2 focus:outline-none transition-all cursor-pointer relative ${
              viewMode === 'settings'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            id="settings-tab-trigger"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>Settings & Backups</span>
          </button>

          <button
            onClick={() => setViewMode('atlas')}
            className={`flex items-center gap-2 py-4 text-xs font-semibold tracking-wider uppercase border-b-2 focus:outline-none transition-all cursor-pointer relative ${
              viewMode === 'atlas'
                ? 'border-amber-600 text-amber-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            id="atlas-tab-trigger"
          >
            <Compass className="w-4 h-4 text-amber-600" />
            <span>Fantasy Atlas</span>
          </button>

          <button
            onClick={() => setViewMode('admin')}
            className={`flex items-center gap-2 py-4 text-xs font-semibold tracking-wider uppercase border-b-2 focus:outline-none transition-all cursor-pointer relative ${
              viewMode === 'admin'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            id="admin-tab-trigger"
          >
            <ShieldAlert className="w-4 h-4 text-indigo-600" />
            <span>Admin & Backup Codes</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Stage */}
      <main className={viewMode === 'atlas' || viewMode === 'oracle' ? "w-full max-w-[1650px] mx-auto px-2 sm:px-4 py-4" : "max-w-6xl mx-auto px-4 py-8"} id="main-workspace-stage">

        {viewMode === 'oracle' && (
          <div className="space-y-6 animate-fade-in" id="oracle-view-panel">
            <OracleChat
              user={user}
              manuscriptText={manuscriptText}
              manuscriptTitle={manuscriptTitle || 'Active Manuscript'}
              characters={characters}
              notebooks={notebooks}
              atlasState={atlasState}
            />
          </div>
        )}

        {viewMode === 'stenopad' && (
          <div className="space-y-6 animate-fade-in" id="stenopad-view-panel">
            <StenopadNotepad
              characters={characters}
              atlasState={atlasState}
              manuscriptTitle={manuscriptTitle || 'Active Manuscript'}
            />
          </div>
        )}

        {viewMode === 'atlas' && (
          <div className="space-y-6 animate-fade-in" id="fantasy-atlas-view-panel">
            <FantasyAtlas
              user={user}
              initialAtlasState={atlasState}
              onSaveAtlasState={(s) => setAtlasState(s)}
            />
          </div>
        )}

        {viewMode === 'admin' && (
          <div className="space-y-6 animate-fade-in" id="admin-panel-view-panel">
            <AdminPanel
              user={user}
              userBlueprints={userBlueprints}
              notebooks={notebooks}
              atlasState={atlasState}
              onSendGmailBackup={async () => {
                await handleSendGmailBackup(undefined, undefined, undefined, false);
              }}
            />
          </div>
        )}
        
        {viewMode === 'library' && (
          <div className="space-y-6 animate-fade-in" id="library-view-panel">
            <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-6 h-6 text-emerald-600" />
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">
                      Processed Manuscripts Library & Registry
                    </h3>
                    <p className="text-xs text-slate-500">
                      Browse your library of previously scanned stories, compare token parameters, and restore dossiers.
                    </p>
                  </div>
                </div>
                {manuscriptsHistory.length > 0 && (
                  <button
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to clear your entire library registry? This action is irreversible.")) {
                        if (user) {
                          try {
                            const deletePromises = manuscriptsHistory.map((item) => 
                              deleteDossierFromFirestore(user.uid, item.sha).catch((e) => console.error("Firestore single delete failed:", e))
                            );
                            await Promise.all(deletePromises);
                          } catch (err) {
                            console.error("Firestore clear failed:", err);
                          }
                        }
                        setManuscriptsHistory([]);
                        localStorage.removeItem('manuscript_library_history');
                        alert("Library registry cleared successfully.");
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-all cursor-pointer"
                  >
                    Clear Library
                  </button>
                )}
              </div>

              {manuscriptsHistory.length === 0 ? (
                <div className="text-center py-16 text-slate-400 space-y-3">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto animate-pulse" />
                  <p className="text-sm font-medium">No processed manuscripts in your library yet.</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Once you upload or paste a manuscript story and click the analyze button, the characters will be saved and tracked here in your offline-first library registry.
                  </p>
                  <button
                    onClick={() => setViewMode('analyzer')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-sm transition-all cursor-pointer"
                  >
                    Go to Analyzer Workstation
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {manuscriptsHistory.map((item, idx) => {
                    const isCurrent = item.sha === blueprint?.manuscript_sha;
                    return (
                      <div 
                        key={item.sha + idx} 
                        className={`p-5 rounded-xl border text-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${
                          isCurrent 
                            ? 'bg-emerald-50/10 border-emerald-300 ring-1 ring-emerald-500/10' 
                            : 'bg-slate-50/40 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="space-y-1.5 flex-1 w-full">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800 text-sm">
                              {item.title || "Untitled Manuscript"}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600 font-medium">
                              by {item.author || "Anonymous"}
                            </span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase font-sans border border-emerald-200">
                                Current Active
                              </span>
                            )}
                          </div>
                          
                          <div className="font-mono text-slate-400 text-[11px] flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>
                              <strong className="text-slate-500 font-medium">SHA-256:</strong> <span className="select-all text-slate-700 font-semibold">{item.sha}</span>
                            </span>
                            <span className="text-slate-300">|</span>
                            <span>
                              <strong className="text-slate-500 font-medium font-mono">Date Processed:</strong> {new Date(item.date).toLocaleString()}
                            </span>
                          </div>

                          {item.tokens && (() => {
                            const runIsLite = item.optimization?.modelUsed === 'gemini-3.1-flash-lite';
                            const promptCost = (item.tokens.promptTokens * (runIsLite ? 0.0375 : 0.075)) / 1000000;
                            const completionCost = (item.tokens.completionTokens * (runIsLite ? 0.15 : 0.30)) / 1000000;
                            const totalRunCost = promptCost + completionCost;
                            return (
                              <div className="font-mono text-slate-500 text-[11px] mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 bg-white border border-slate-200/60 px-2 py-1 rounded w-fit">
                                <span className="text-blue-700 font-bold uppercase text-[9px] tracking-wide mr-1 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                                  Token metrics
                                </span>
                                <span>Prompt: <strong>{item.tokens.promptTokens.toLocaleString()}</strong></span>
                                <span className="text-slate-300">|</span>
                                <span>Completion: <strong>{item.tokens.completionTokens.toLocaleString()}</strong></span>
                                <span className="text-slate-300">|</span>
                                <span>Total: <strong className="text-blue-700 font-semibold">{item.tokens.totalTokens.toLocaleString()}</strong></span>
                                <span className="text-slate-300">|</span>
                                <span className="text-indigo-700 font-bold">Cost: ${totalRunCost.toFixed(5)}</span>
                                
                                {item.optimization && (
                                  <>
                                    <span className="text-slate-300">|</span>
                                    <span className="text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100/60 text-[10px]">
                                      Model: {item.optimization.modelUsed === 'gemini-3.1-flash-lite' ? '3.1 Lite' : '3.5 Flash'}
                                      {item.optimization.wasOptimized && ` (Saved ~${item.optimization.charSavings.toLocaleString()} Chars)`}
                                    </span>
                                  </>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end shrink-0">
                          {item.text && (
                            <button
                              onClick={() => {
                                handleLoadManuscriptFromLibrary(item);
                                setViewMode('analyzer');
                                alert(`Manuscript "${item.title}" loaded into the Analyzer workspace!`);
                              }}
                              className="px-3.5 py-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 border border-emerald-200 hover:border-emerald-300 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-all cursor-pointer flex items-center gap-1"
                              title="Load manuscript into Analyzer workspace"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Load & Analyze</span>
                            </button>
                          )}
                          <button
                            onClick={() => setEditingManuscript({
                              sha: item.sha,
                              title: item.title,
                              author: item.author,
                              text: item.text || ''
                            })}
                            className="px-3 py-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-50 border border-blue-200 rounded-lg bg-white transition-all cursor-pointer flex items-center gap-1"
                            title="Edit manuscript registry details"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDownloadSingleManuscript(item)}
                            className="px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 border border-indigo-200 rounded-lg bg-white transition-all cursor-pointer flex items-center gap-1"
                            title="Download manuscript text file"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                          <button
                            onClick={() => handleDeleteManuscript(item.sha, item.title)}
                            className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded-lg bg-white transition-all cursor-pointer flex items-center gap-1"
                            title="Delete manuscript registry entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(item.sha);
                              alert("SHA-256 hash copied to clipboard!");
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-300 rounded-lg bg-white transition-all cursor-pointer"
                            title="Copy SHA-256 checksum to clipboard"
                          >
                            Copy SHA
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'settings' && (
          <div className="space-y-6 animate-fade-in" id="settings-view-panel">
            <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-6">
              
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800">
                    Account Settings & Backup Center
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure automated backups, authorize secure Gmail delivery pipelines, and customize dossier formats.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Columns - Configuration */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Google Account Status Panel */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-semibold text-xs text-slate-700 uppercase tracking-wider">
                          Google Account Security & Integration
                        </h4>
                      </div>
                      
                      {user ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3 h-3 animate-pulse" />
                          Authenticated & Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertCircle className="w-3 h-3" />
                          Disconnected
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      Plothole integrates directly with your secure Google Workspace account to save reports to Google Drive, export Google Docs, or send safe email backups to your inbox via the Gmail API.
                    </p>

                    {user ? (
                      <div className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-lg text-xs">
                        <div className="flex items-center gap-3">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                              {user.displayName?.charAt(0) || user.email?.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-800">{user.displayName || 'Authorized Author'}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{user.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={handleLogin}
                          className="px-2.5 py-1 text-[10px] font-bold border border-slate-200 rounded text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                        >
                          Reconnect Account
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-amber-50/40 border border-amber-100 p-4 rounded-lg">
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-slate-800">No active connection found</p>
                          <p className="text-[10px] text-slate-400">Log in with Google to enable Drive & Gmail backups.</p>
                        </div>
                        <button
                          onClick={handleLogin}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                        >
                          Connect Google
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Gmail Configuration Form */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm text-slate-800">Gmail Backup Pipeline Settings</h4>
                    
                    <div className="space-y-3">
                      
                      {/* Recipient Email */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Backup Recipient Email Address
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="w-4 h-4 text-slate-400" />
                          </span>
                          <input
                            type="email"
                            value={backupEmail}
                            onChange={(e) => setBackupEmail(e.target.value)}
                            placeholder="e.g. author@example.com"
                            className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          All narrative backup files will be sent securely to this target inbox.
                        </p>
                      </div>

                      {/* Subject Prefix */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Email Subject Tag Prefix
                        </label>
                        <input
                          type="text"
                          value={emailSubjectPrefix}
                          onChange={(e) => setEmailSubjectPrefix(e.target.value)}
                          placeholder="e.g. [Plothole Backup]"
                          className="block w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white font-mono"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Organize backups in your inbox using custom email tags.
                        </p>
                      </div>

                      {/* Format Selection & Auto Backup Toggle */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        
                        {/* Format */}
                        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                          <label className="block text-xs font-semibold text-slate-700">
                            Backup Attachment Format
                          </label>
                          <div className="flex gap-4">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-slate-600 font-medium">
                              <input
                                type="radio"
                                name="backupFormat"
                                value="md"
                                checked={backupFormat === 'md'}
                                onChange={() => setBackupFormat('md')}
                                className="text-blue-600 focus:ring-blue-500"
                              />
                              <span>Markdown Document (.md)</span>
                            </label>
                            <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-slate-600 font-medium">
                              <input
                                type="radio"
                                name="backupFormat"
                                value="json"
                                checked={backupFormat === 'json'}
                                onChange={() => setBackupFormat('json')}
                                className="text-blue-600 focus:ring-blue-500"
                              />
                              <span>JSON Bundle (.json)</span>
                            </label>
                          </div>
                        </div>

                        {/* Toggle */}
                        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-700">
                              Auto-Backup After Analysis
                            </span>
                            <button
                              onClick={() => setAutoBackupEnabled(!autoBackupEnabled)}
                              type="button"
                              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                autoBackupEnabled ? 'bg-blue-600' : 'bg-slate-200'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                  autoBackupEnabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                            When enabled, Plothole will automatically send an email backup immediately upon successful character profiling.
                          </p>
                        </div>

                      </div>

                    </div>
                    
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => {
                          saveGmailSettings(backupEmail, autoBackupEnabled, backupFormat, emailSubjectPrefix);
                          alert("Backup and Gmail configurations successfully saved to local system storage!");
                        }}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
                      >
                        Save Configurations
                      </button>
                    </div>

                  </div>

                </div>

                {/* Right Column - Actions & Info */}
                <div className="space-y-6">
                  
                  {/* Manual On-Demand Backup Block */}
                  <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-5 space-y-4">
                    <h4 className="font-bold text-xs text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      On-Demand Backup Engine
                    </h4>

                    <p className="text-xs text-blue-800/85 leading-relaxed">
                      Trigger a manual snapshot backup of your current active manuscript to your email inbox immediately.
                    </p>

                    <div className="bg-white border border-blue-100 p-3.5 rounded-lg text-xs space-y-2">
                      <p className="font-semibold text-slate-700">Active Manuscript in Session:</p>
                      {characters && characters.length > 0 ? (
                        <div className="space-y-1">
                          <p className="font-bold text-blue-700 truncate">"{blueprint?.manuscript_title || manuscriptTitle}"</p>
                          <p className="text-[10px] text-slate-500">By {blueprint?.manuscript_author || manuscriptAuthor || 'Anonymous'}</p>
                          <p className="text-[10px] text-slate-500">{characters.length} characters loaded</p>
                        </div>
                      ) : (
                        <p className="text-slate-400 italic">No active analyzed dossier in current session.</p>
                      )}
                    </div>

                    <button
                      onClick={() => user ? handleSendGmailBackup() : alert("Please sign in to send Gmail backups.")}
                      disabled={isSendingBackupEmail || !characters}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSendingBackupEmail ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          <span>Sending Backup Email...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          <span>Send Backup Email Now</span>
                        </>
                      )}
                    </button>

                    {backupEmailStatus.type && (
                      <p className={`text-[10px] text-center font-semibold leading-relaxed p-2 rounded-lg border ${
                        backupEmailStatus.type === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : backupEmailStatus.type === 'error'
                          ? 'bg-rose-50 text-rose-700 border-rose-100'
                          : 'bg-blue-50/50 text-blue-700 border-blue-100 animate-pulse'
                      }`}>
                        {backupEmailStatus.message}
                      </p>
                    )}
                  </div>

                  {/* Informational Help Box */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                    <h4 className="font-semibold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-slate-500" />
                      About Gmail Backups
                    </h4>
                    <ul className="text-[11px] text-slate-500 space-y-2 list-disc pl-4 leading-relaxed">
                      <li>Emails are composed and sent natively through your authorized Google Account. No third-party servers process your text.</li>
                      <li><strong>Markdown format</strong> attaches a text file containing complete dossiers formatted in clear Markdown headings.</li>
                      <li><strong>JSON format</strong> exports the complete structured schema, including narrative logs and metadata, perfect for importing back into Plothole later.</li>
                    </ul>
                  </div>

                </div>

              </div>

            </div>
          </div>
        )}

        {viewMode === 'research' && (
          <div className="space-y-6 animate-fade-in" id="research-view-panel">
            <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
                  <span>Research Library & Grounding (NotebookLM)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Manage your books, lore elements, transcripts, and timeline events in one workspace. Grounded chat analyzes your uploaded reference materials directly.
                </p>
              </div>
              <ResearchLibrary
                user={user}
                driveToken={driveToken}
                notebooks={notebooks}
                currentNotebookId={currentNotebookId}
                onSaveNotebook={handleSaveNotebook}
                setCurrentNotebookId={setCurrentNotebookId}
                onLoginRequest={handleLogin}
                createGoogleDocFromNotebook={createGoogleDocFromNotebook}
                uploadToGoogleDrive={uploadToGoogleDrive}
              />
            </div>
          </div>
        )}

        {viewMode === 'analyzer' && (
          <>
            {/* State A: Input Submission Panel (No characters loaded yet) */}
            {!characters && !loading && (
          <div className="space-y-8 animate-fade-in" id="input-stage-panel">
            
            {/* Header intro card */}
            <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col md:flex-row gap-5 items-center justify-between">
              <div className="space-y-1 text-center md:text-left">
                <h2 className="text-lg font-semibold text-slate-900">
                  Analyze and Extract Character Profiles
                </h2>
                <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
                  Provide any manuscript text (such as fantasy stories, science fiction scenes, noir detective chapters, or historical logs) below. Our engine will read, outline every single distinct character, map their network of relations, and create complete dossiers.
                </p>
              </div>
              <Sparkles className="w-10 h-10 text-blue-600/40 shrink-0" />
            </div>

            {/* Upload Existing Blueprint Card */}
            <div className="bg-slate-900 border border-slate-850 p-6 rounded-xl shadow-md text-slate-200 flex flex-col md:flex-row gap-5 items-center justify-between" id="upload-existing-blueprint-card">
              <div className="space-y-1 text-center md:text-left">
                <h3 className="text-base font-bold text-white flex items-center justify-center md:justify-start gap-2">
                  <FileJson className="w-5 h-5 text-blue-400" />
                  Have an Existing Blueprint JSON or .phole Package?
                </h3>
                <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                  Upload a previously saved blueprint JSON or a .phole bundle archive to instantly view, read, or edit character parameters and restore custom images in the Universal Character Extractor.
                </p>
              </div>
              <button
                onClick={() => blueprintFileInputRef.current?.click()}
                id="landing-blueprint-upload-btn"
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-2 shadow-sm transition-all shrink-0 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-blue-400" />
                <span>Upload Blueprint / .phole / .zip</span>
              </button>
              <input
                type="file"
                ref={blueprintFileInputRef}
                onChange={handleBlueprintUpload}
                accept=".json,.phole,.zip,.phole.zip"
                className="hidden"
              />
            </div>

            {/* Preloaded Samples Selection */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
              <SampleSelector 
                onSelectSample={handleSelectSample} 
                selectedId={selectedSampleId} 
              />
            </div>

            {/* Text input & upload workstation */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-slate-900">Manuscript Workspace</span>
                </div>
                
                {/* Length counter */}
                <div className="text-xs text-slate-500 font-mono text-right">
                  <div>
                    {manuscriptText.trim().length.toLocaleString()} characters | ~{Math.round(manuscriptText.split(/\s+/).filter(Boolean).length).toLocaleString()} words
                  </div>
                  {manuscriptText.trim().length > 0 && (
                    <div className="text-[10px] text-blue-600 font-semibold mt-0.5">
                      ~{Math.round(manuscriptText.length / 4).toLocaleString()} est. tokens
                    </div>
                  )}
                </div>
              </div>

              {/* Text Area Input */}
              <div className="p-5 space-y-4">
                {/* Title & Author Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="manuscript-title-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Dictated Manuscript Title
                    </label>
                    <input
                      id="manuscript-title-input"
                      type="text"
                      value={manuscriptTitle}
                      onChange={(e) => setManuscriptTitle(e.target.value)}
                      placeholder="e.g. Echoes of the Void"
                      className="w-full px-3 py-2 text-slate-800 border border-slate-200 rounded-lg text-xs font-sans focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 bg-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="manuscript-author-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Author Name
                    </label>
                    <input
                      id="manuscript-author-input"
                      type="text"
                      value={manuscriptAuthor}
                      onChange={(e) => setManuscriptAuthor(e.target.value)}
                      placeholder="e.g. A. K. Vance"
                      className="w-full px-3 py-2 text-slate-800 border border-slate-200 rounded-lg text-xs font-sans focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 bg-white"
                    />
                  </div>
                </div>

                {/* Token Optimization Settings */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3.5 animate-fade-in text-xs">
                  <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-200/60 pb-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Token Optimization & Cost Control Settings</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Model selection */}
                    <div>
                      <label htmlFor="llm-model-select" className="block text-slate-700 font-semibold mb-1.5">
                        Selected AI Model
                      </label>
                      <select
                        id="llm-model-select"
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 bg-white"
                      >
                        <option value="gemini-3.5-flash">Gemini 3.5 Flash (Premium & Smart)</option>
                        <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Ultra Cost-Efficient)</option>
                      </select>
                    </div>

                    {/* Character Truncation / Sampling */}
                    <div>
                      <label htmlFor="truncation-limit-select" className="block text-slate-700 font-semibold mb-1.5">
                        Analysis Range (Sampling)
                      </label>
                      <select
                        id="truncation-limit-select"
                        value={truncationLimit}
                        onChange={(e) => setTruncationLimit(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 bg-white"
                      >
                        <option value="0">Analyze Full Text (Comprehensive)</option>
                        <option value="15000">First 15,000 characters (~3.5k words)</option>
                        <option value="30000">First 30,000 characters (~7k words)</option>
                        <option value="60000">First 60,000 characters (~14k words)</option>
                        <option value="100000">First 100,000 characters (~25k words)</option>
                      </select>
                    </div>

                    {/* Whitespace compression checkbox */}
                    <div className="flex flex-col justify-center">
                      <label className="flex items-start gap-2.5 cursor-pointer select-none text-slate-700 font-semibold">
                        <input
                          type="checkbox"
                          checked={optimizeWhitespace}
                          onChange={(e) => setOptimizeWhitespace(e.target.checked)}
                          className="mt-0.5 rounded text-blue-600 focus:ring-blue-500/20 border-slate-300 w-4 h-4 cursor-pointer"
                        />
                        <div>
                          <span>Compress Whitespace (Lossless)</span>
                          <span className="block text-[10px] text-slate-500 font-normal mt-0.5 leading-normal">
                            Strips consecutive blank lines, spacing and indentation.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Dynamic Optimization Metrics Preview */}
                  {previewStats && previewStats.originalLen > 0 && (
                    <div className="bg-blue-50/40 border border-blue-100/50 rounded-xl p-4 text-xs text-slate-700 font-sans space-y-3">
                      <div className="flex items-center justify-between border-b border-blue-100/60 pb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono bg-blue-100/60 text-blue-700 px-2 py-0.5 rounded font-bold text-[9px] uppercase tracking-wider">
                            Optimization Forecast
                          </span>
                          <span className="text-slate-600 font-medium text-[11px]">
                            Sending <strong className="text-blue-900">{previewStats.finalLen.toLocaleString()}</strong> chars 
                            {previewStats.originalLen !== previewStats.finalLen && (
                              <> instead of <span className="line-through text-slate-400">{previewStats.originalLen.toLocaleString()}</span></>
                            )}.
                          </span>
                        </div>
                        {previewStats.truncated && (
                          <span className="text-amber-700 font-semibold text-[11px] flex items-center gap-1">
                            ⚠️ Truncation applied
                          </span>
                        )}
                      </div>

                      {/* Token & Financial Cost breakdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div className="bg-white/60 rounded-lg p-2 border border-blue-100/40 text-left">
                          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">Est. Input Tokens</div>
                          <div className="text-sm font-extrabold text-blue-900 font-mono mt-0.5">
                            {previewStats.estInputTokens.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">tokens</span>
                          </div>
                          {previewStats.savings > 0 && (
                            <div className="text-[9px] text-emerald-600 font-semibold mt-1">
                              Saved ~{previewStats.savings.toLocaleString()} chars (~{previewStats.estSavingsTokens.toLocaleString()} tokens!)
                            </div>
                          )}
                        </div>

                        <div className="bg-white/60 rounded-lg p-2 border border-blue-100/40 text-left">
                          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">Model Rates ({selectedModel === 'gemini-3.1-flash-lite' ? '3.1 Lite' : '3.5 Flash'})</div>
                          <div className="text-[10px] font-semibold text-slate-700 mt-1 font-mono leading-relaxed">
                            Input: <span className="text-blue-700">${selectedModel === 'gemini-3.1-flash-lite' ? '0.0375' : '0.075'}/1M</span>
                            <br />
                            Output: <span className="text-indigo-700">${selectedModel === 'gemini-3.1-flash-lite' ? '0.15' : '0.30'}/1M</span>
                          </div>
                        </div>

                        <div className="bg-white/60 rounded-lg p-2 border border-blue-100/40 text-left">
                          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">Estimated Run Cost</div>
                          <div className="text-sm font-extrabold text-indigo-900 font-mono mt-0.5">
                            ${previewStats.estTotalCost.toFixed(5)}
                          </div>
                          <div className="text-[9px] text-slate-400 font-normal leading-tight mt-1">
                            Input: ${previewStats.estInputCost.toFixed(5)} | Output (Est): ${previewStats.estOutputCost.toFixed(5)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <textarea
                  id="manuscript-input-textarea"
                  rows={10}
                  className="w-full p-4 text-slate-800 border border-slate-200 rounded-lg font-serif text-sm leading-relaxed focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 placeholder:text-slate-400 bg-slate-50/20"
                  placeholder="Paste your manuscript excerpt or full text here (any genre, any lengths)..."
                  value={manuscriptText}
                  onChange={(e) => {
                    setManuscriptText(e.target.value);
                    setSelectedSampleId(null); // Clear sample selection on edit
                  }}
                />

                {/* File Upload Zone - Supports both local local files and Google Drive */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="manuscript-file-sources">
                  <div
                    id="file-drop-zone"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all duration-200 flex flex-col justify-center items-center ${
                      isDragging
                        ? 'border-blue-600 bg-blue-50/30'
                        : 'border-slate-200 hover:border-blue-500 hover:bg-slate-50/40 bg-white'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept=".txt,.md"
                      className="hidden"
                    />
                    <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700 mb-0.5">
                      Drag & Drop, or click to browse locally
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Supports Plain Text (.txt) or Markdown (.md)
                    </p>
                  </div>

                  <div
                    id="drive-picker-trigger"
                    onClick={handleBrowseGoogleDrive}
                    className="border-2 border-dashed border-slate-200 hover:border-blue-500 hover:bg-slate-50/40 bg-white rounded-lg p-5 text-center cursor-pointer transition-all duration-200 flex flex-col justify-center items-center"
                  >
                    {isLoadingPicker ? (
                      <Loader className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
                    ) : (
                      <Cloud className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                    )}
                    <p className="text-xs font-semibold text-slate-700 mb-0.5">
                      Browse Manuscripts from Google Drive
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Select directly from Google Docs or standard files
                    </p>
                  </div>
                </div>

                {/* Action button */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => runAnalysis(manuscriptText)}
                    disabled={!manuscriptText.trim()}
                    id="analyze-manuscript-btn"
                    className={`px-6 py-3 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                      manuscriptText.trim()
                        ? 'bg-slate-800 hover:bg-slate-900 text-white shadow-sm hover:translate-x-0.5 cursor-pointer'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <span>Begin Character Analysis</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 flex gap-3 text-sm text-rose-800" id="error-banner">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Analysis Failed</p>
                  <p className="mt-1 text-xs opacity-90 leading-relaxed whitespace-pre-line">{error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* State B: Loading Screen Panel */}
        {loading && (
          <div className="max-w-md mx-auto py-16 text-center space-y-6 animate-pulse" id="loading-stage-panel">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-sans font-bold text-lg text-slate-950">
                Profiling Manuscript
              </h3>
              <p className="text-xs text-slate-500 font-mono tracking-wider uppercase h-4">
                {loadingSteps[loadingStep]}
              </p>
            </div>

            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 h-full transition-all duration-1000 ease-out" 
                style={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }}
              ></div>
            </div>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
              This process reads and maps the entire text. It might take up to a minute for very complex storylines.
            </p>
          </div>
        )}

        {/* State C: Character Dossier Dashboard Stage */}
        {characters && characters.length > 0 && !loading && (
          <div className="space-y-6 animate-fade-in" id="result-stage-panel">
            
            {/* Control Bar & Version Management */}
            <div className="space-y-3" id="version-control-bar">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-sm text-slate-900">
                      Character Blueprint Loaded
                    </h3>
                    <p className="text-xs text-slate-500">
                      Loaded {characters.length} unique character profiles
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  {/* Upload Blueprint button */}
                  <button
                    onClick={() => blueprintFileInputRef.current?.click()}
                    id="upload-blueprint-toolbar-btn"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 bg-white transition-colors cursor-pointer"
                    title="Upload existing blueprint JSON, .phole or .zip package"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-500" />
                    <span>Upload Blueprint / .zip</span>
                  </button>

                  {/* Download Bundle .phole.zip button */}
                  <button
                    onClick={handleDownloadPhole}
                    id="download-phole-btn"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-blue-200 rounded-lg hover:bg-blue-50 text-blue-700 bg-blue-50/30 hover:text-blue-800 transition-colors cursor-pointer flex-row"
                    title="Download complete bundle including images, blueprint, and markdown report as a standard .phole.zip file"
                  >
                    <FileJson className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                    <span className="font-bold">Download Bundle (.phole.zip)</span>
                  </button>

                  {/* Download MD button */}
                  <button
                    onClick={handleDownloadMarkdown}
                    id="download-md-btn"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 bg-white transition-colors cursor-pointer"
                    title="Download Dossiers in Markdown format"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Download MD</span>
                  </button>

                  {/* Download Manuscript button with YAML Front Matter */}
                  <button
                    onClick={handleDownloadManuscript}
                    id="download-manuscript-btn"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-emerald-200 rounded-lg hover:bg-emerald-50 text-emerald-700 bg-white transition-colors cursor-pointer"
                    title="Download the currently processed manuscript with YAML Front Matter"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Download Manuscript</span>
                  </button>

                  {/* Download Sidecar button */}
                  <button
                    onClick={handleDownloadSidecarLog}
                    id="download-sidecar-btn"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 bg-white transition-colors cursor-pointer"
                    title="Download change audit trail sidecar file"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                    <span>Changelog ({sidecarLogs.length})</span>
                  </button>

                  {/* Reset/Analyze New button */}
                  <button
                    onClick={resetWorkspace}
                    id="reset-workspace-btn"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 bg-white transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Analyze New</span>
                  </button>
                </div>
              </div>

              {/* Google Drive Export Panel */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs" id="google-drive-sync-panel">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Cloud className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span>Google Drive Cloud Sync</span>
                      {driveToken ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-extrabold uppercase border border-emerald-200">
                          <Check className="w-2.5 h-2.5" /> Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[9px] font-semibold uppercase border border-slate-300">
                          Not Authorized
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Save your parsed blueprints, full media bundles, or formatted reports directly to your cloud storage.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                  {driveToken ? (
                    <>
                      <button
                        onClick={() => user ? handleSaveToDrive('json') : alert("Please sign in to save files to Google Drive.")}
                        disabled={isSavingToDrive}
                        id="drive-save-json-btn"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-white text-slate-700 bg-slate-100/60 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <CloudUpload className="w-3.5 h-3.5 text-blue-500" />
                        <span>Save JSON Blueprint</span>
                      </button>

                      <button
                        onClick={() => user ? handleSaveToDrive('zip') : alert("Please sign in to save files to Google Drive.")}
                        disabled={isSavingToDrive}
                        id="drive-save-zip-btn"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-emerald-200 rounded-lg hover:bg-emerald-50 text-emerald-700 bg-emerald-50/20 transition-colors cursor-pointer disabled:opacity-50 font-bold"
                      >
                        {isSavingToDrive ? (
                          <Loader className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        ) : (
                          <CloudUpload className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        <span>Save Bundle (.phole.zip)</span>
                      </button>

                      <button
                        onClick={() => user ? handleSaveToDrive('md') : alert("Please sign in to save files to Google Drive.")}
                        disabled={isSavingToDrive}
                        id="drive-save-md-btn"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-white text-slate-700 bg-slate-100/60 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <CloudUpload className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Save MD Report</span>
                      </button>

                      <button
                        onClick={handleExportToGoogleDoc}
                        disabled={isSavingToDoc}
                        id="drive-export-doc-btn"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-blue-200 rounded-lg hover:bg-blue-50 text-blue-700 bg-blue-50/20 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isSavingToDoc ? (
                          <Loader className="w-3.5 h-3.5 animate-spin text-blue-600" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                        )}
                        <span>Export Google Doc</span>
                      </button>

                      {createdDocUrl && (
                        <a
                          href={createdDocUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          id="open-google-doc-link"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all cursor-pointer shadow-sm border border-blue-500 hover:scale-105 active:scale-95 duration-150"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Open Google Doc ↗</span>
                        </a>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={handleLogin}
                      disabled={isLoggingIn}
                      id="drive-authorize-btn"
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white font-bold rounded-lg text-xs shadow-sm transition-all cursor-pointer"
                    >
                      <Cloud className="w-4 h-4 text-emerald-400" />
                      <span>{isLoggingIn ? 'Authorizing...' : 'Authorize & Connect Google Drive'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Version History Info Bar */}
              {blueprint && (
                <div className="bg-slate-900 border border-slate-800 text-slate-400 px-4 py-2.5 rounded-lg text-[11px] font-mono flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>
                      <strong className="text-slate-300">SHA-256:</strong> {blueprint.sha.slice(0, 12)}...
                    </span>
                    <span className="text-slate-600">|</span>
                    <span>
                      <strong className="text-slate-300">Created:</strong> {new Date(blueprint.first_processed).toLocaleString()}
                    </span>
                    <span className="text-slate-600">|</span>
                    <span>
                      <strong className="text-slate-300">Last Edited:</strong> {new Date(blueprint.last_edited).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold font-sans">
                    System Blueprint Synced
                  </span>
                </div>
              )}
            </div>

            {/* Dashboard Workspace Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-workspace-grid">
              
              {/* Sidebar: Lists of Extracted Characters (Takes 4 of 12 columns) */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2.5 mb-3">
                    Extracted Characters
                  </h3>
                  <CharacterList
                    characters={characters}
                    selectedCharacter={selectedCharacter}
                    onSelectCharacter={(char) => setSelectedCharacter(char)}
                    images={images}
                  />
                </div>
              </div>

              {/* Main Dossier Detail Area (Takes 8 of 12 columns) */}
              <div className="lg:col-span-8 space-y-4">
                
                {/* View State Tabs switcher */}
                <div className="flex border-b border-slate-200">
                  <button
                    id="tab-btn-dossier"
                    onClick={() => setActiveTab('dossier')}
                    className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold transition-all border-b-2 focus:outline-none cursor-pointer ${
                      activeTab === 'dossier'
                        ? 'border-blue-600 text-blue-700 bg-blue-50/10'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    <span>Interactive Dossier</span>
                  </button>
                   <button
                    id="tab-btn-json"
                    onClick={() => setActiveTab('json')}
                    className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold transition-all border-b-2 focus:outline-none cursor-pointer ${
                      activeTab === 'json'
                        ? 'border-blue-600 text-blue-700 bg-blue-50/10'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <FileJson className="w-4 h-4" />
                    <span>Raw Extract (JSON)</span>
                  </button>

                  <button
                    id="tab-btn-blueprint-notes"
                    onClick={() => setActiveTab('blueprint-notes' as any)}
                    className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold transition-all border-b-2 focus:outline-none cursor-pointer ${
                      activeTab === 'blueprint-notes' as any
                        ? 'border-blue-600 text-blue-700 bg-blue-50/10'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-purple-600" />
                    <span>Blueprint Notes & Re-scan</span>
                  </button>

                  <button
                    id="tab-btn-history"
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold transition-all border-b-2 focus:outline-none cursor-pointer ${
                      activeTab === 'history'
                        ? 'border-blue-600 text-blue-700 bg-blue-50/10'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    <span>Manuscript Library & Registry ({manuscriptsHistory.length})</span>
                  </button>

                  <button
                    id="tab-btn-research"
                    onClick={() => setActiveTab('research')}
                    className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold transition-all border-b-2 focus:outline-none cursor-pointer ${
                      activeTab === 'research'
                        ? 'border-blue-600 text-blue-700 bg-blue-50/10'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
                    <span>Research Library & Grounding (NotebookLM)</span>
                  </button>
                </div>

                {/* Tab content */}
                <div className="animate-fade-in">
                  {activeTab === 'dossier' && selectedCharacter ? (
                    <CharacterDetailView
                      character={selectedCharacter}
                      allCharacters={characters}
                      onSelectCharacter={(char) => setSelectedCharacter(char)}
                      onUpdateCharacter={handleUpdateCharacter}
                      images={images}
                      onAddImage={handleAddImage}
                      onRemoveImage={handleRemoveImage}
                    />
                  ) : activeTab === 'blueprint-notes' as any ? (
                    <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-6">
                      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                        <FileText className="w-5 h-5 text-purple-600" />
                        <div>
                          <h3 className="font-bold text-base text-slate-800">
                            Blueprint Notes & Term Re-scan
                          </h3>
                          <p className="text-xs text-slate-500">
                            Manage overall book notes, track rename replacements, and re-scan the manuscript.
                          </p>
                        </div>
                      </div>

                      {/* General Blueprint Notes text area */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          General Project / Book Notes
                        </label>
                        <textarea
                          rows={6}
                          value={blueprintNotes}
                          onChange={(e) => {
                            setBlueprintNotes(e.target.value);
                            if (blueprint) {
                              setBlueprint({
                                ...blueprint,
                                blueprint_notes: e.target.value
                              });
                            }
                          }}
                          placeholder="Write overall outline notes, storyline guides, or narrative ideas for this character bible..."
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-serif text-sm leading-relaxed"
                        />
                      </div>

                      {/* Term Replacement & Scan Section */}
                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                              Manuscript Term Replacement Verifier
                            </h4>
                            <p className="text-xs text-slate-400">
                              Checks if renamed characters have had their replacements applied in the current manuscript.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={rescanManuscript}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Scan Current Manuscript</span>
                          </button>
                        </div>

                        {termReplacements.length === 0 ? (
                          <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg bg-slate-50/30 text-slate-400 text-xs">
                            No name changes recorded yet. Rename a character to track and verify manuscript replacements.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {termReplacements.map((rep, idx) => {
                              const isFullyReplaced = rep.currentCount === 0;
                              return (
                                <div key={idx} className="p-4 rounded-xl border bg-slate-50 border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap font-mono">
                                      <span className="font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded text-xs">
                                        {rep.from}
                                      </span>
                                      <span className="text-slate-400">➔</span>
                                      <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-xs">
                                        {rep.to}
                                      </span>
                                    </div>
                                    <div className="text-slate-500 text-[11px] flex items-center gap-3">
                                      <span>Original count: <strong>{rep.originalCount}</strong></span>
                                      <span>•</span>
                                      <span>Current count: <strong className={isFullyReplaced ? 'text-emerald-600' : 'text-amber-600 font-bold'}>{rep.currentCount}</strong></span>
                                      <span>•</span>
                                      <span className="text-slate-400">{new Date(rep.timestamp).toLocaleString()}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`px-2 py-1 rounded text-[10px] font-semibold tracking-wide uppercase border ${
                                      isFullyReplaced 
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}>
                                      {isFullyReplaced ? 'Applied' : 'Pending'}
                                    </span>
                                    {!isFullyReplaced && (
                                      <button
                                        type="button"
                                        onClick={() => applyReplacement(rep.from, rep.to)}
                                        className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded shadow-sm cursor-pointer transition-colors"
                                      >
                                        Auto-Replace Text
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Changelog inside panel */}
                      <div className="space-y-3 pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Full Change Logs & Edit Audit Trail
                        </h4>
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1 select-scrollbar">
                          {sidecarLogs.map((log, index) => (
                            <div key={index} className="p-3 rounded-lg border border-slate-100 bg-slate-50/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="space-y-0.5">
                                <span className="font-semibold text-slate-800">{log.action}</span>
                                <p className="text-slate-500 text-slate-600 leading-normal">{log.details}</p>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : activeTab === 'json' ? (
                    <JsonViewer blueprint={blueprint!} />
                  ) : activeTab === 'history' ? (
                    <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-6">
                      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                        <BookOpen className="w-5 h-5 text-emerald-600" />
                        <div>
                          <h3 className="font-bold text-base text-slate-800">
                            Processed Manuscripts Library & Registry
                          </h3>
                          <p className="text-xs text-slate-500">
                            Your personal library and audit trail of all processed manuscript files, version checksums, and token optimization metrics.
                          </p>
                        </div>
                      </div>

                      {manuscriptsHistory.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-xs">
                          No processed manuscripts recorded. Run a character analysis to start tracking versions.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {manuscriptsHistory.map((item, idx) => {
                            const isCurrent = item.sha === blueprint?.manuscript_sha;
                            return (
                              <div 
                                key={item.sha + idx} 
                                className={`p-4 rounded-lg border text-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${
                                  isCurrent 
                                    ? 'bg-emerald-50/10 border-emerald-200' 
                                    : 'bg-slate-50/40 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-slate-800 text-sm">
                                      {item.title || "Untitled Manuscript"}
                                    </span>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-slate-600">
                                      by {item.author || "Anonymous"}
                                    </span>
                                    {isCurrent && (
                                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase font-sans border border-emerald-200">
                                        Current
                                      </span>
                                    )}
                                  </div>
                                  <div className="font-mono text-slate-400 text-[11px] flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <span>
                                      <strong className="text-slate-600 font-medium">SHA-256:</strong> <span className="select-all text-slate-700 font-semibold">{item.sha}</span>
                                    </span>
                                    <span className="text-slate-300">|</span>
                                    <span>
                                      <strong className="text-slate-600 font-medium font-mono">Date Processed:</strong> {new Date(item.date).toLocaleString()}
                                    </span>
                                  </div>
                                  {item.tokens && (() => {
                                    const runIsLite = item.optimization?.modelUsed === 'gemini-3.1-flash-lite';
                                    const promptCost = (item.tokens.promptTokens * (runIsLite ? 0.0375 : 0.075)) / 1000000;
                                    const completionCost = (item.tokens.completionTokens * (runIsLite ? 0.15 : 0.30)) / 1000000;
                                    const totalRunCost = promptCost + completionCost;
                                    return (
                                      <div className="font-mono text-slate-500 text-[11px] mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 bg-slate-50 border border-slate-200/60 px-2 py-1 rounded w-fit animate-fade-in">
                                        <span className="text-blue-700 font-bold uppercase text-[9px] tracking-wide mr-1 flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                          Token Record
                                        </span>
                                        <span>Prompt: <strong>{item.tokens.promptTokens.toLocaleString()}</strong></span>
                                        <span className="text-slate-300">|</span>
                                        <span>Completion: <strong>{item.tokens.completionTokens.toLocaleString()}</strong></span>
                                        <span className="text-slate-300">|</span>
                                        <span>Total: <strong className="text-blue-700 font-semibold">{item.tokens.totalTokens.toLocaleString()}</strong></span>
                                        <span className="text-slate-300">|</span>
                                        <span className="text-indigo-700 font-bold">Cost: ${totalRunCost.toFixed(5)}</span>
                                        {item.optimization && (
                                          <>
                                            <span className="text-slate-300">|</span>
                                            <span className="text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100/60 text-[10px]">
                                              Model: {item.optimization.modelUsed === 'gemini-3.1-flash-lite' ? '3.1 Lite' : '3.5 Flash'}
                                              {item.optimization.wasOptimized && ` (Saved ~${item.optimization.charSavings.toLocaleString()} Chars)`}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 self-stretch md:self-auto justify-end">
                                  {item.text && (
                                    <button
                                      onClick={() => {
                                        if (window.confirm(`Load manuscript "${item.title}" into the workspace? This will replace your current workspace text.`)) {
                                          handleLoadManuscriptFromLibrary(item);
                                          alert(`Manuscript "${item.title}" loaded successfully!`);
                                        }
                                      }}
                                      className="px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 border border-emerald-200 hover:border-emerald-300 rounded bg-emerald-50/50 transition-all cursor-pointer flex items-center gap-1"
                                      title="Load manuscript into Analyzer workspace"
                                    >
                                      <BookOpen className="w-3 h-3" />
                                      <span>Load</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setEditingManuscript({
                                      sha: item.sha,
                                      title: item.title,
                                      author: item.author,
                                      text: item.text || ''
                                    })}
                                    className="px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-50 border border-blue-200 rounded bg-white transition-all cursor-pointer flex items-center gap-1"
                                    title="Edit manuscript registry details"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    onClick={() => handleDownloadSingleManuscript(item)}
                                    className="px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 border border-indigo-200 rounded bg-white transition-all cursor-pointer flex items-center gap-1"
                                    title="Download manuscript text file"
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>Download</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteManuscript(item.sha, item.title)}
                                    className="px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded bg-white transition-all cursor-pointer flex items-center gap-1"
                                    title="Delete manuscript registry entry"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Delete</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(item.sha);
                                      alert("SHA-256 hash copied to clipboard!");
                                    }}
                                    className="px-2.5 py-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-300 rounded bg-white transition-all cursor-pointer"
                                    title="Copy SHA-256 checksum to clipboard"
                                  >
                                    Copy SHA
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : activeTab === 'research' ? (
                    <ResearchLibrary
                      user={user}
                      driveToken={driveToken}
                      notebooks={notebooks}
                      currentNotebookId={currentNotebookId}
                      onSaveNotebook={handleSaveNotebook}
                      setCurrentNotebookId={setCurrentNotebookId}
                      onLoginRequest={handleLogin}
                      createGoogleDocFromNotebook={createGoogleDocFromNotebook}
                      uploadToGoogleDrive={uploadToGoogleDrive}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    )}
  </main>

      {/* Aesthetic Footer */}
      <footer className="border-t border-slate-200 mt-20 bg-white py-8" id="app-footer">
        <div className="max-w-6xl mx-auto px-4 text-center space-y-2 text-xs text-slate-400">
          <p className="font-serif italic font-medium">"Books have their own unique destinies, and characters their own lives."</p>
          <p>© 2026 Plothole | AI Studio Built Workspace</p>
        </div>
      </footer>

      {/* Firebase & Google OAuth Configuration Guide Modal */}
      {authHelpOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="auth-help-modal">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <h3 className="font-bold text-base text-slate-800">
                    Google Auth & Cloud Sync Setup Guide
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Resolve domain, login, and Google Drive connection errors
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setAuthHelpOpen(false); setActiveAuthError(null); }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer text-base font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 overflow-y-auto">
              
              {/* Active Caught Error (if any) */}
              {activeAuthError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2 text-left">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-xs text-red-800 font-mono">
                        Caught Code: {activeAuthError.code || 'N/A'}
                      </span>
                      <p className="text-xs text-red-700 mt-1 font-medium leading-relaxed">
                        {activeAuthError.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Troubleshooting Guide Chapters */}
              <div className="space-y-5 text-left text-xs">
                
                {/* 1. Unauthorized Domain Error */}
                <div className={`space-y-2 p-4 rounded-xl border transition-all ${activeAuthError?.type === 'unauthorized-domain' ? 'bg-amber-50/40 border-amber-300 ring-2 ring-amber-200' : 'bg-slate-50/50 border-slate-200'}`}>
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">1</span>
                    <span>Fixing "auth/unauthorized-domain" Error</span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    This error happens because your Cloud Run preview domain is not listed in your Firebase project's authorized authentication domains list. Follow these quick steps to whitelist it:
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-600 bg-white p-3 rounded-lg border border-slate-200 font-medium">
                    <li>Go to the <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold">Firebase Console</a> and open your project.</li>
                    <li>Navigate to <strong>Build &gt; Authentication &gt; Settings</strong> tab.</li>
                    <li>Scroll down and find the <strong>Authorized domains</strong> list.</li>
                    <li>Click <strong>Add domain</strong> and enter exactly:
                      <div className="mt-1 flex items-center gap-2 bg-slate-100 px-2 py-1 rounded font-mono text-[10px] text-slate-800 select-all font-bold w-fit border border-slate-200">
                        {window.location.hostname}
                      </div>
                    </li>
                    <li>Click <strong>Add domain</strong> again and enter your preview domain as well to make sure both links work:
                      <div className="mt-1 flex items-center gap-2 bg-slate-100 px-2 py-1 rounded font-mono text-[10px] text-slate-800 select-all font-bold w-fit border border-slate-200">
                        {window.location.hostname.includes('-dev-') ? window.location.hostname.replace('-dev-', '-pre-') : window.location.hostname}
                      </div>
                    </li>
                  </ol>
                </div>

                {/* 2. Google OAuth Consent Screen Restrictions (Testing vs. Published) */}
                <div className={`space-y-2 p-4 rounded-xl border transition-all ${activeAuthError?.type === 'testing-mode-restriction' ? 'bg-amber-50/40 border-amber-300 ring-2 ring-amber-200' : 'bg-slate-50/50 border-slate-200'}`}>
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">2</span>
                    <span>Allowing Others to Sign Up & Log In</span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    If you get the notification <em>"Currently no one except project members can sign in to this app"</em>, your Google OAuth Consent screen is currently in <strong>"Testing"</strong> mode. This restricts access. You have two easy solutions:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1.5">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider text-blue-600">Option A: Add Test Users</span>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        If you only want specific people to use the app, go to the <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a> &gt; APIs & Services &gt; OAuth Consent Screen. Under <strong>Test users</strong>, click <strong>Add Users</strong> and add their Google email addresses.
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider text-emerald-600">Option B: Publish App</span>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        To let <strong>anyone</strong> register/login to your app, go to the <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a> &gt; APIs & Services &gt; OAuth Consent Screen. Under "Publishing status", click the <strong>Publish App</strong> button to move it to Production!
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Safe Popup Usage */}
                <div className="space-y-2 p-4 bg-slate-50/50 border border-slate-200 rounded-xl">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">3</span>
                    <span>Popup Blocker & Cookies</span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    Firebase Google Auth uses a login popup window. If you click login and nothing happens, or you receive popup errors, please ensure:
                  </p>
                  <ul className="list-disc list-inside space-y-1 pl-1 text-slate-500 font-medium bg-white p-3 rounded-lg border border-slate-200">
                    <li>Your browser's <strong>popup blocker</strong> is disabled for this domain.</li>
                    <li>Third-party <strong>cookies/session storage</strong> are enabled (needed for Firebase authentication handshakes).</li>
                    <li>When prompted by Google, check the permission box for <strong>Google Drive files</strong> to enable Cloud backup.</li>
                  </ul>
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-mono">App Version: v1.2.0 (Google Drive Supported)</span>
              <button
                onClick={() => { setAuthHelpOpen(false); setActiveAuthError(null); }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors cursor-pointer"
              >
                Got it, Dismiss
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Edit Manuscript Modal */}
      {editingManuscript && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="edit-manuscript-modal">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <Pencil className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <h3 className="font-bold text-base text-slate-800">
                    Edit Manuscript Registry Entry
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Modify title, author, and manuscript content of this library entry.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setEditingManuscript(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer text-base font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 overflow-y-auto text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Manuscript Title
                  </label>
                  <input
                    type="text"
                    value={editingManuscript.title}
                    onChange={(e) => setEditingManuscript({ ...editingManuscript, title: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter title..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Manuscript Author
                  </label>
                  <input
                    type="text"
                    value={editingManuscript.author}
                    onChange={(e) => setEditingManuscript({ ...editingManuscript, author: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter author..."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Manuscript Content (Text)
                </label>
                <textarea
                  rows={10}
                  value={editingManuscript.text}
                  onChange={(e) => setEditingManuscript({ ...editingManuscript, text: e.target.value })}
                  placeholder="Paste or write story text..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-serif text-xs leading-relaxed"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-2 text-xs">
              <button
                onClick={() => setEditingManuscript(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
