import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProjectData, Note, User as AppUser, ViewType, ChangeLogEntry, AppSettings, BackupFrequency } from '../../types';
import { 
  Settings, User as UserIcon, Database, Shield, Code, Check, 
  ChevronRight, History, Activity, Hash, Archive, FileCode,
  Link as LinkIcon, Sparkles, Copy, Trash2, Download, FileText, X,
  MapPin, Book, Clock, Upload, AlertCircle, Mail
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { safeResponseJson } from '../../utils/jsonUtils';

import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

enum SettingsTab {
  PROFILE = 'Profile',
  PREFERENCES = 'Preferences',
  ARCHIVE = 'Storage Archive',
  AUDIT = 'Audit Log',
  MANIFEST = 'Manifest',
  RAW = 'Raw',
  EXPORT = 'Export',
  CARD_EXAMPLES = 'Card Examples'
}

interface SettingsViewProps {
  projectData: ProjectData | null;
  globalNotes: Note[];
  onImportProject: (d: ProjectData) => void;
  onFactoryReset: () => void;
  onClearGlobalNotes?: () => void;
  currentUser: AppUser;
  onUpdateUser: (u: Partial<AppUser>) => void;
  onUpdateProject: (d: Partial<ProjectData>) => void;
  onChangeView: (v: ViewType) => void;
  onLinkClick?: (type: string, id: string) => void;
  fetchWithAuth?: (url: string, options?: RequestInit) => Promise<Response>;
  appSettings: AppSettings;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser, onUpdateUser, onFactoryReset, projectData, onUpdateProject, onChangeView, onLinkClick, globalNotes, onClearGlobalNotes, fetchWithAuth, appSettings
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') as SettingsTab) || SettingsTab.PROFILE;
  console.log('[SettingsView] Active Tab:', activeTab);
  const setActiveTab = (tab: SettingsTab) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    router.push(`?${params.toString()}`);
  };

  const [rawText, setRawText] = React.useState('');
  const [isSaved, setIsSaved] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const [archiveFiles, setArchiveFiles] = React.useState<{ name: string, size: number, mtime: Date, url: string }[]>([]);
  const [previewFile, setPreviewFile] = React.useState<{ name: string, content: string, type: string } | null>(null);
  const [isLoadingArchive, setIsLoadingArchive] = React.useState(false);
  
  const [backupFrequency, setBackupFrequency] = React.useState<BackupFrequency>((projectData?.backupSettings?.frequency) || 'manual');
  const [isBackupEnabled, setIsBackupEnabled] = React.useState(projectData?.backupSettings?.enabled ?? false);
  const [isTestEmailLoading, setIsTestEmailLoading] = React.useState(false);
  const [testEmailResult, setTestEmailResult] = React.useState<{ success: boolean; message: string } | null>(null);
  const [isTestBackupLoading, setIsTestBackupLoading] = React.useState(false);
  const [testBackupResult, setTestBackupResult] = React.useState<{ success: boolean; message: string } | null>(null);
  
  // Use provided fetchWithAuth or fallback to plain fetch
  const doFetch = fetchWithAuth || fetch.bind(window);

  // Wiki feature state
  const [username, setUsername] = React.useState(currentUser?.username || '');
  const [isLoadingUsername, setIsLoadingUsername] = React.useState(false);
  const [usernameSaved, setUsernameSaved] = React.useState(false);

  // Sync username from currentUser when it changes
  React.useEffect(() => {
    if (currentUser?.username) {
      setUsername(currentUser.username);
    }
  }, [currentUser?.username]);

  React.useEffect(() => {
    if (activeTab === SettingsTab.ARCHIVE && projectData) {
      fetchArchiveFiles();
    }
    if (activeTab === SettingsTab.PROFILE && !currentUser?.username) {
      fetchUsername();
    }
  }, [activeTab, projectData, currentUser?.username]);

  const fetchUsername = async () => {
    try {
      const resp = await doFetch('/api/user/username');
      if (resp.ok) {
        const data = await resp.json();
        setUsername(data.username || '');
      }
    } catch (err) {
      console.error('Failed to fetch username:', err);
    }
  };

  const handleSaveUsername = async () => {
    const lowercaseUsername = username.toLowerCase();
    if (!lowercaseUsername || !/^[a-z0-9_-]{3,20}$/.test(lowercaseUsername)) {
      alert('Username must be 3-20 alphanumeric characters (no spaces)');
      return;
    }

    setIsLoadingUsername(true);
    try {
      const resp = await doFetch('/api/user/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: lowercaseUsername })
      });
      
      if (resp.ok) {
        setUsernameSaved(true);
        // Update local user state as well
        onUpdateUser({ ...currentUser, username: lowercaseUsername });
        setTimeout(() => setUsernameSaved(false), 2000);
      } else {
        const errData = await safeResponseJson(resp);
        alert(errData?.error || 'Failed to save username');
      }
    } catch (err) {
      console.error('Error saving username:', err);
      alert('Failed to save username');
    } finally {
      setIsLoadingUsername(false);
    }
  };

  const fetchArchiveFiles = async () => {
    if (!projectData) return;
    setIsLoadingArchive(true);
    try {
      const resp = await fetch(`/api/source-files/${projectData.id}`);
      const data = await safeResponseJson(resp);
      if (data) {
        setArchiveFiles(data.files || []);
      } else {
        setArchiveFiles([]);
      }
    } catch (err) {
      console.error("Failed to fetch archive files", err);
    } finally {
      setIsLoadingArchive(false);
    }
  };

  const handleSendTestEmail = async () => {
    setIsTestEmailLoading(true);
    setTestEmailResult(null);
    try {
      const resp = await doFetch('/api/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId: projectData?.id,
          userEmail: currentUser?.email 
        })
      });
      
      const data = await safeResponseJson(resp);
      setTestEmailResult({
        success: resp.ok && !!data,
        message: data?.message || (resp.ok ? 'Test email sent successfully!' : 'Failed to send test email')
      });
      setTimeout(() => setTestEmailResult(null), 5000);
    } catch (err) {
      setTestEmailResult({
        success: false,
        message: 'Error sending test email: ' + (err instanceof Error ? err.message : 'Unknown error')
      });
    } finally {
      setIsTestEmailLoading(false);
    }
  };

  const handleTestBackup = async () => {
    setIsTestBackupLoading(true);
    setTestBackupResult(null);
    try {
      const resp = await doFetch('/api/test-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId: projectData?.id
        })
      });
      
      const data = await safeResponseJson(resp);
      setTestBackupResult({
        success: resp.ok && !!data,
        message: data?.message || (resp.ok ? 'Test backup created successfully!' : 'Failed to create test backup')
      });
      setTimeout(() => setTestBackupResult(null), 5000);
    } catch (err) {
      setTestBackupResult({
        success: false,
        message: 'Error creating test backup: ' + (err instanceof Error ? err.message : 'Unknown error')
      });
    } finally {
      setIsTestBackupLoading(false);
    }
  };

  const handleBackupSettingsChange = (frequency: BackupFrequency) => {
    setBackupFrequency(frequency);
    if (projectData) {
      onUpdateProject({
        ...projectData,
        backupSettings: {
          ...(projectData.backupSettings || { enabled: true }),
          frequency: frequency,
          lastBackupTime: projectData.backupSettings?.lastBackupTime,
          nextBackupTime: projectData.backupSettings?.nextBackupTime
        }
      });
    }
  };

  const handleBackupEnabledChange = (enabled: boolean) => {
    setIsBackupEnabled(enabled);
    if (projectData) {
      onUpdateProject({
        ...projectData,
        backupSettings: {
          frequency: backupFrequency,
          enabled,
          lastBackupTime: projectData.backupSettings?.lastBackupTime,
          nextBackupTime: projectData.backupSettings?.nextBackupTime
        }
      });
    }
  };

  const getNextBackupTime = () => {
    if (!isBackupEnabled || backupFrequency === 'manual') return null;
    
    const now = Date.now();
    const intervals: Record<BackupFrequency, number> = {
      hourly: 60 * 60 * 1000,
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000,
      manual: 0
    };
    
    const nextTime = (projectData?.backupSettings?.lastBackupTime || now) + intervals[backupFrequency];
    return nextTime;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const handlePreviewFile = async (file: { name: string, url: string }) => {
    try {
      const resp = await fetch(file.url);
      const content = await resp.text();
      const type = file.name.endsWith('.json') ? 'json' : (file.name.endsWith('.md') ? 'markdown' : 'text');
      setPreviewFile({ name: file.name, content, type });
    } catch (err) {
      console.error("Failed to preview file", err);
    }
  };

  const handleExportDocx = async () => {
    if (!projectData) return;

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: projectData.title,
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            text: `Author: ${projectData.author || currentUser.name}`,
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            text: projectData.summary || "",
            heading: HeadingLevel.HEADING_3,
          }),
          ... (projectData.chapters || []).flatMap(chapter => [
            new Paragraph({
              text: chapter.title,
              heading: HeadingLevel.HEADING_1,
              pageBreakBefore: true,
            }),
            ...chapter.content.split('\n').map(line => new Paragraph({
              children: [new TextRun(line)],
            }))
          ])
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${projectData.title.replace(/\s+/g, '_')}_Manuscript.docx`);
  };

  const allTextEntries = React.useMemo(() => {
    const entries: { id: string; type: string; content: string; timestamp: number }[] = [];
    
    // Global Notes (Notepad)
    globalNotes.forEach(n => entries.push({ id: n.id, type: 'GLOBAL_NOTEPAD', content: n.content, timestamp: n.timestamp }));

    if (projectData) {
      projectData.sources?.forEach(s => entries.push({ id: s.id, type: 'SOURCE', content: s.content, timestamp: s.timestamp }));
      projectData.notes?.forEach(n => entries.push({ id: n.id, type: 'PROJECT_NOTEPAD', content: n.content, timestamp: n.timestamp }));
      projectData.ideas?.forEach(i => entries.push({ id: i.id, type: 'IDEA', content: i.content, timestamp: i.timestamp }));
    }

    return entries.sort((a, b) => b.timestamp - a.timestamp);
  }, [projectData, globalNotes]);

  const rawMarkdownDump = React.useMemo(() => {
    return allTextEntries.map(entry => {
      const dateStr = new Date(entry.timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      return `[${dateStr}] ${entry.type}\n${entry.content}\n\n========================================\n`;
    }).join('\n');
  }, [allTextEntries]);

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'Character': return <UserIcon size={12} />;
      case 'Location': return <Database size={12} />;
      case 'Timeline': return <History size={12} />;
      case 'Source': return <Archive size={12} />;
      default: return <Activity size={12} />;
    }
  };

  const getTabIcon = (tab: SettingsTab) => {
    switch (tab) {
      case SettingsTab.PROFILE: return <UserIcon size={18} />;
      case SettingsTab.PREFERENCES: return <Settings size={18} />;
      case SettingsTab.ARCHIVE: return <Archive size={18} />;
      case SettingsTab.AUDIT: return <History size={18} />;
      case SettingsTab.MANIFEST: return <FileCode size={18} />;
      case SettingsTab.RAW: return <Code size={18} />;
      case SettingsTab.EXPORT: return <Download size={18} />;
      case SettingsTab.CARD_EXAMPLES: return <Book size={18} />;
    }
  };

  const handleDeleteFeed = () => {
    if (projectData) {
      onUpdateProject({
        sources: projectData.sources?.filter(s => s.type === 'image') || [], // Keep image assets, clear text sources
        notes: [],
        ideas: []
      });
    }
    if (onClearGlobalNotes) {
      onClearGlobalNotes();
    }
    setShowDeleteConfirm(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case SettingsTab.PROFILE:
        return (
          <div className="space-y-12 animate-in fade-in duration-500">
            <section className="bg-white dark:bg-slate-900 rounded-none md:rounded-3xl p-4 md:p-10 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-8">
                <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
                  <UserIcon size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">User Profile</h2>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Your identity within the Plothole ecosystem.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Display Name</label>
                  <input
                    type="text"
                    value={currentUser.name}
                    onChange={(e) => onUpdateUser({ name: e.target.value })}
                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all text-sm font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input
                    type="email"
                    value={currentUser.email}
                    onChange={(e) => onUpdateUser({ email: e.target.value })}
                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all text-sm font-bold"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Wiki Username</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase())}
                      placeholder="e.g., storyteller_123"
                      className="flex-1 px-5 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all text-sm font-bold"
                    />
                    <button
                      onClick={handleSaveUsername}
                      disabled={isLoadingUsername}
                      className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm"
                    >
                      {isLoadingUsername ? 'Saving...' : usernameSaved ? '✓ Saved' : 'Save'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    Your public profile URL: 
                    <a 
                      href={`//${window.location.host}/${username}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-500 font-bold flex items-center gap-1 group"
                    >
                      {window.location.host}/{username || 'username'}
                      <LinkIcon size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-white dark:bg-slate-900 rounded-none md:rounded-3xl p-4 md:p-10 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-8">
                <div className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl">
                  <Shield size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Open Source Credits</h2>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">The powerful foundations that make Plothole possible.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { name: 'React Flow', purpose: 'Graphs', license: 'MIT' },
                  { name: 'Tiptap', purpose: 'Rich Text', license: 'MIT' },
                  { name: 'Leaflet', purpose: 'Maps', license: 'BSD-2' },
                  { name: 'Fuse.js', purpose: 'Fuzzy Search', license: 'Apache 2.0' },
                  { name: 'docx', purpose: 'Word Export', license: 'MIT' },
                  { name: 'Clerk', purpose: 'Auth', license: 'Commercial' },
                  { name: 'Gemini', purpose: 'AI Intelligence', license: 'Commercial' },
                  { name: 'Lucide', purpose: 'Iconography', license: 'ISC' },
                  { name: 'React', purpose: 'UI Framework', license: 'MIT' },
                  { name: 'Vite', purpose: 'Build Tool', license: 'MIT' },
                  { name: 'Simple Git', purpose: 'Versioning', license: 'MIT' },
                  { name: 'Express', purpose: 'Server Engine', license: 'MIT' }
                ].map((lib) => (
                  <div key={lib.name} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{lib.purpose}</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{lib.name}</div>
                    <div className="text-[8px] text-slate-400 uppercase mt-1 font-black">{lib.license} License</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white dark:bg-slate-900 rounded-none md:rounded-3xl p-4 md:p-10 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-8">
                <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl">
                  <Database size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Data Management</h2>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Critical system operations and maintenance.</p>
                </div>
              </div>

              <div className="p-8 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30">
                <h3 className="font-black text-red-600 dark:text-red-400 mb-2 uppercase text-xs tracking-[0.2em]">Factory Reset</h3>
                <p className="text-sm text-red-700 dark:text-red-300/70 mb-6 font-medium">This will permanently delete all projects, characters, manuscripts, and notes from BOTH your local device and your cloud account. This action cannot be undone.</p>
                <button
                  onClick={onFactoryReset}
                  className="px-8 py-3 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                >
                  Wipe All Data From Account
                </button>
              </div>
            </section>
          </div>
        );

      case SettingsTab.PREFERENCES:
        return (
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-10 shadow-sm border border-slate-200 dark:border-slate-800 space-y-10 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-8">
              <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                <Settings size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">System Preferences</h2>
                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Customize your experience and workflow defaults.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Appearance */}
              <div className="space-y-8">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-l-4 border-indigo-500 pl-4">Appearance</h3>
                
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Theme Mode</label>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                    {(['light', 'dark'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => onUpdateUser({ preferences: { ...currentUser.preferences, themeMode: mode } })}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${currentUser.preferences?.themeMode === mode ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Font Family</label>
                  <select 
                    value={currentUser.preferences?.fontFamily || 'sans'}
                    onChange={(e) => onUpdateUser({ preferences: { ...currentUser.preferences, fontFamily: e.target.value as any } })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="sans">Modern Sans</option>
                    <option value="serif">Classic Serif</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Font Size</label>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                    {(['sm', 'md', 'lg'] as const).map(size => (
                      <button
                        key={size}
                        onClick={() => onUpdateUser({ preferences: { ...currentUser.preferences, fontSize: size } })}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${currentUser.preferences?.fontSize === size ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Workflow */}
              <div className="space-y-8">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-l-4 border-indigo-500 pl-4">Workflow</h3>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Default Landing Page</label>
                  <select 
                    value={currentUser.preferences?.landingPage || ViewType.NOTEPAD}
                    onChange={(e) => onUpdateUser({ preferences: { ...currentUser.preferences, landingPage: e.target.value as any } })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {Object.values(ViewType).map(view => (
                      <option key={view} value={view}>{view}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">The Oracle Verbosity</label>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                    {(['minimal', 'balanced', 'detailed'] as const).map(v => (
                      <button
                        key={v}
                        onClick={() => onUpdateUser({ preferences: { ...currentUser.preferences, aiVerbosity: v } })}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${currentUser.preferences?.aiVerbosity === v ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 mt-4">
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Reduce Motion</span>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Minimize animations and transitions.</p>
                  </div>
                  <button 
                    onClick={() => onUpdateUser({ preferences: { ...currentUser.preferences, reducedMotion: !currentUser.preferences?.reducedMotion } })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${currentUser.preferences?.reducedMotion ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${currentUser.preferences?.reducedMotion ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        );

      case SettingsTab.ARCHIVE:
        return projectData ? (
          <section className="h-full flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-y-auto animate-in fade-in duration-500">
            {/* Backup Resend Section */}
            <div className="p-10 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-600/20">
                  <Download size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Backup & Resend</h3>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Resend project backups to cloud storage.</p>
                </div>
              </div>
              
              {projectData.backups && projectData.backups.length > 0 ? (
                <div className="space-y-3">
                  {projectData.backups.map(backup => (
                    <div key={backup.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-2 h-2 rounded-full ${backup.status === 'delivered' ? 'bg-emerald-500' : backup.status === 'pending' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm">{new Date(backup.timestamp).toLocaleString()}</p>
                          <p className="text-xs text-slate-500">{backup.wordCount} words • {backup.status}</p>
                        </div>
                      </div>
                      {backup.status !== 'delivered' && (
                        <button 
                          onClick={() => {
                            fetch(`/api/resend-backup/${backup.id}`, { method: 'POST' })
                              .catch(err => console.error('Resend failed:', err));
                          }}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-bold uppercase"
                        >
                          Resend
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No backups yet.</p>
              )}

              {/* Test Backup Button */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleTestBackup}
                  disabled={isTestBackupLoading}
                  className="flex-1 px-6 py-3 bg-emerald-600 text-white font-bold uppercase text-sm rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/30"
                >
                  {isTestBackupLoading ? 'Creating...' : 'Test Backup'}
                </button>
              </div>

              {testBackupResult && (
                <div className={`mt-4 p-4 rounded-lg border ${testBackupResult.success ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800'}`}>
                  <p className={`text-sm font-bold ${testBackupResult.success ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                    {testBackupResult.message}
                  </p>
                </div>
              )}

              {/* Backup Scheduling Settings */}
              <div className="mt-8 pt-8 border-t border-emerald-200 dark:border-emerald-800/50 space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 mb-3 block">Backup Schedule</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['manual', 'hourly', 'daily', 'weekly', 'monthly'] as BackupFrequency[]).map(freq => (
                      <button
                        key={freq}
                        onClick={() => handleBackupSettingsChange(freq)}
                        className={`py-3 px-4 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${backupFrequency === freq ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-emerald-500'}`}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200 dark:border-emerald-800/30 mb-6">
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Automatic Backups</span>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase">Enable scheduled backups.</p>
                  </div>
                  <button 
                    onClick={() => handleBackupEnabledChange(!isBackupEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isBackupEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isBackupEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {isBackupEnabled && getNextBackupTime() && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px]">
                    <p className="text-slate-600 dark:text-slate-300 font-bold uppercase tracking-widest mb-1">Next Backup</p>
                    <p className="text-slate-500 dark:text-slate-400 font-mono text-xs">{formatTime(getNextBackupTime()!)}</p>
                  </div>
                )}

                {appSettings.enableBackupPreview && (
                  <div className="mt-8 pt-8 border-t border-emerald-200 dark:border-emerald-800/50 space-y-4 pb-20">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={16} className="text-emerald-600" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Backup Preview</h4>
                    </div>

                    {/* Email Preview Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-rose-400" />
                            <div className="w-2 h-2 rounded-full bg-amber-400" />
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase ml-2">Backup Notification Preview</span>
                        </div>
                        <Mail size={12} className="text-slate-400" />
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Subject</p>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100">[Milestone] Backup: {projectData?.title || 'Project'} [sha-8] ({projectData?.wordCount || 0} words)</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Body</p>
                          <div className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/30 p-3 rounded-lg border border-slate-100 dark:border-slate-800/50">
                            <p>Automated backup for project: <strong>{projectData?.title}</strong></p>
                            <p className="mt-1 text-slate-400 italic">This backup contains the current .plothole files for all books associated with your account.</p>
                          </div>
                        </div>

                        {/* Attachments Preview */}
                        <div className="pt-2">
                          <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Attachments (Estimated)</p>
                          <div className="grid grid-cols-1 gap-2">
                            <div className="flex items-center justify-between p-2 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300 rounded">
                                  <FileText size={12} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">{projectData?.title?.replace(/\s+/g, '_')}_current.plothole</span>
                              </div>
                              <span className="text-[9px] font-mono text-emerald-600/70">CURRENT</span>
                            </div>

                            <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-800/50 opacity-60">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded">
                                  <History size={12} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">Historical_Snapshots.zip</span>
                              </div>
                              <span className="text-[9px] font-mono text-slate-400">UP TO 5 COPIES (MATCHING SHA)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Test Email Section */}
            <div className="p-10 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-violet-600 text-white rounded-2xl shadow-lg shadow-violet-600/20">
                  <Mail size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Email Settings</h3>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Test your email configuration.</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-300">Send a test email to verify your backup notifications are working correctly.</p>
                
                {testEmailResult && (
                  <div className={`p-4 rounded-lg border ${testEmailResult.success ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800'}`}>
                    <p className={`text-sm font-bold ${testEmailResult.success ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                      {testEmailResult.message}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleSendTestEmail}
                  disabled={isTestEmailLoading}
                  className="w-full px-6 py-3 bg-violet-600 text-white font-bold uppercase text-sm rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-600/30"
                >
                  {isTestEmailLoading ? 'Sending...' : 'Send Test Email'}
                </button>
              </div>
            </div>

            <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
                  <Archive size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Storage Archive</h2>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Explore raw and processed sidecar files.</p>
                </div>
              </div>
              <button 
                onClick={fetchArchiveFiles}
                className="p-4 text-slate-400 hover:text-indigo-600 bg-slate-50 dark:bg-slate-800 rounded-2xl transition-all"
                title="Refresh File List"
              >
                <Activity size={24} />
              </button>
            </div>

            <div className="flex-1 flex min-h-0">
              {/* File List */}
              <div className="w-80 border-r border-slate-100 dark:border-slate-800 flex flex-col">
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 truncate">Folder: /{projectData.id}</span>
                  <span className="text-[9px] font-black text-indigo-500 uppercase shrink-0">{archiveFiles.length} Files</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                  {isLoadingArchive ? (
                    <div className="h-full flex items-center justify-center text-slate-400 italic text-xs">Scanning...</div>
                  ) : archiveFiles.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 italic text-xs">Empty.</div>
                  ) : (
                    archiveFiles.map(file => (
                      <button
                        key={file.name}
                        onClick={() => handlePreviewFile(file)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left group ${previewFile?.name === file.name ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-500/50'}`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          {file.name.endsWith('.json') ? <Code size={16} className={previewFile?.name === file.name ? 'text-white' : 'text-amber-500'} /> : file.name.endsWith('.md') ? <FileText size={16} className={previewFile?.name === file.name ? 'text-white' : 'text-indigo-500'} /> : <Database size={16} className={previewFile?.name === file.name ? 'text-white' : 'text-slate-400'} />}
                          <div className="truncate">
                            <div className="text-xs font-bold truncate">{file.name}</div>
                            <div className={`text-[8px] uppercase font-black tracking-widest mt-0.5 ${previewFile?.name === file.name ? 'text-indigo-200' : 'text-slate-400'}`}>{(file.size / 1024).toFixed(1)} KB</div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Preview Panel */}
              <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-slate-900">
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                  <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
                    <Activity size={14} /> File Previewer
                  </h3>
                  {previewFile && (
                    <button 
                      onClick={() => setPreviewFile(null)}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  {previewFile ? (
                    <div className="max-w-3xl mx-auto space-y-6">
                      <div className="flex items-center justify-between mb-6">
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-4 py-1.5 rounded-full">{previewFile.name}</span>
                        <button 
                          onClick={() => { navigator.clipboard.writeText(previewFile.content); alert('Copied to clipboard!'); }}
                          className="text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-2"
                        >
                          <Copy size={14} /> Copy Raw
                        </button>
                      </div>
                      {previewFile.type === 'json' ? (
                        <pre className="text-xs font-mono text-amber-600 dark:text-amber-400 bg-slate-50 dark:bg-slate-950 p-8 rounded-2xl overflow-x-auto border border-slate-100 dark:border-slate-800 whitespace-pre-wrap leading-relaxed">
                          {JSON.stringify(JSON.parse(previewFile.content), null, 2)}
                        </pre>
                      ) : (
                        <div className="prose prose-slate dark:prose-invert prose-sm max-w-none font-serif leading-relaxed text-slate-700 dark:text-slate-300">
                          <textarea 
                            readOnly 
                            value={previewFile.content} 
                            className="w-full h-[500px] bg-transparent border-none focus:ring-0 resize-none text-sm leading-relaxed custom-scrollbar font-serif"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-6">
                      <Archive size={64} className="opacity-10" />
                      <p className="font-serif italic text-xl opacity-30">Select a file to inspect its contents</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div className="flex-1 flex items-center justify-center p-20 shrink-0"><div className="text-center space-y-4"><Database size={48} className="mx-auto text-slate-200" /><p className="text-slate-400 italic font-serif">Load a project to access the Archive.</p></div></div>
        );

      case SettingsTab.AUDIT:
        return projectData ? (
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-10 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-8">
              <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                <History size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Audit Log</h2>
                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Every change to every card is recorded here.</p>
              </div>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
              {(projectData.changeLog || []).slice().reverse().map((log: ChangeLogEntry) => (
                <div key={log.id} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-indigo-500/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl text-slate-400 shadow-sm">
                      {getEntityIcon(log.entityType)}
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        {log.action} {log.entityType}
                        {log.entityId && <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">#{log.entityId}</span>}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{log.entityName} • {new Date(log.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                  {log.entityId && (
                    <button 
                      onClick={() => {
                        const tag = `[[#${log.entityId}]]`;
                        navigator.clipboard.writeText(tag);
                        setCopiedId(log.entityId || null);
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2"
                      title="Copy Reference Tag"
                    >
                      {copiedId === log.entityId ? <Check size={18} /> : <LinkIcon size={18} />}
                      {copiedId === log.entityId && <span className="text-[9px] font-black uppercase">Copied</span>}
                    </button>
                  )}
                </div>
              ))}
              {(!projectData.changeLog || projectData.changeLog.length === 0) && (
                <div className="py-20 text-center text-slate-400 italic font-serif text-lg">No activity recorded yet.</div>
              )}
            </div>
          </section>
        ) : null;

      case SettingsTab.MANIFEST:
        return projectData ? (
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-10 shadow-sm border border-slate-200 dark:border-slate-800 space-y-10 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-8">
              <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <FileCode size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Project Manifest</h2>
                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">The metadata and structural integrity of this .plothole container.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Container ID</div>
                <div className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate">#{projectData.id}</div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Integrity Hash</div>
                <div className="text-xs font-mono font-bold text-emerald-500 truncate">{projectData.integrityHash?.slice(0, 16)}...</div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Last Sync</div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">{new Date(projectData.lastModified).toLocaleTimeString()}</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase text-sm tracking-tight">
                  <Shield size={18} className="text-indigo-500" /> Semantic Security
                </h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Enable deep-meaning search and AI analysis for this manifest.</p>
              </div>
              <button 
                onClick={() => onUpdateUser({ 
                  preferences: { 
                    ...currentUser.preferences, 
                    semanticSearchEnabled: !currentUser.preferences?.semanticSearchEnabled 
                  } 
                })}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${currentUser.preferences?.semanticSearchEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${currentUser.preferences?.semanticSearchEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </section>
        ) : null;

      case SettingsTab.RAW:
        return (
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-10 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-8">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl">
                  <FileCode size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Raw Text Feed</h2>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">A continuous Markdown export of all project and global notes.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all"
                  title="Clear All Text Entries"
                >
                  <Trash2 size={24} />
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(rawMarkdownDump);
                    setIsSaved(true);
                    setTimeout(() => setIsSaved(false), 2000);
                  }}
                  className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-3 ${isSaved ? 'bg-emerald-100 text-emerald-600 shadow-lg shadow-emerald-600/10' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20'}`}
                >
                  {isSaved ? <><Check size={18} /> Copied</> : <><Copy size={18} /> Copy All</>}
                </button>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
              <textarea
                readOnly
                value={rawMarkdownDump}
                className="w-full h-[600px] bg-transparent border-none focus:ring-0 resize-none font-mono text-sm leading-relaxed text-slate-600 dark:text-slate-300 break-words [overflow-wrap:anywhere] custom-scrollbar"
                placeholder="No text entries found."
              />
            </div>
          </section>
        );

      case SettingsTab.CARD_EXAMPLES:
        return (
          <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Sample Data Gallery</h2>
                <p className="text-slate-600 dark:text-slate-400 font-serif italic">Complete example project with 5+ cards of every type, showing exactly how your data will look</p>
              </div>

              {/* CHARACTERS */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                    <UserIcon size={20} className="text-indigo-600" />
                  </div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">CHARACTERS</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: "Eleanor Valorian", role: "Paladin", job: "Knight Commander", desc: "Fierce warrior devoted to protecting the realm. Bears a mysterious scar across her shoulder blade." },
                    { name: "Theon Darksbane", role: "Rogue", job: "Shadow Master", desc: "Master of deception and stealth. Commands the Thieves' Guild from the shadows of the capital." },
                    { name: "Lyra Willowbrook", role: "Mage", job: "Head Archmage", desc: "Ancient mage who discovered the secrets of crystalline magic. Mentors the next generation of wizards." },
                    { name: "Marcus Ironheart", role: "Ranger", job: "Forest Warden", desc: "Skilled tracker and archer. Protects the Whisperwood Forest from poachers and dark creatures." },
                    { name: "Isolde Silverwind", role: "Cleric", job: "Priestess of Dawn", desc: "Devoted to healing and light magic. Founded the Order of the Sacred Dawn in the northern provinces." }
                  ].map((char, i) => (
                    <div key={i} className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 space-y-2">
                      <p className="font-bold text-slate-900 dark:text-white">{char.name}</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300"><strong>Role:</strong> {char.role}</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300"><strong>Job:</strong> {char.job}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{char.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* LOCATIONS */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <MapPin size={20} className="text-green-600" />
                  </div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">LOCATIONS</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: "The Citadel of Ashenmarch", type: "Fortress", desc: "Imposing stone fortress perched on a mountain peak. Home to the kingdom's military and royal family." },
                    { name: "Whisperwood Forest", type: "Wilderness", desc: "Ancient forest shrouded in perpetual mist. Inhabited by elves and forbidden magical creatures." },
                    { name: "Port Valorian", type: "Coastal City", desc: "Bustling trade hub where merchants from across the realm conduct business. Known for its skyline of white towers." },
                    { name: "The Obsidian Tower", type: "Dungeon", desc: "Crumbling dark tower in the wastelands. Rumored to contain artifacts of immense power and danger." },
                    { name: "Silverhall Academy", type: "Institution", desc: "Premier magical academy where young mages train in the arcane arts. Founded over three centuries ago." }
                  ].map((loc, i) => (
                    <div key={i} className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 space-y-2">
                      <p className="font-bold text-slate-900 dark:text-white">{loc.name}</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300"><strong>Type:</strong> {loc.type}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{loc.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ARTIFACTS */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                    <Upload size={20} className="text-amber-600" />
                  </div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">ARTIFACTS</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: "Excalibur's Echo", type: "Legendary Sword", rarity: "Unique", desc: "Mystical blade forged in starlight. Cuts through illusions and reflects magic back upon casters." },
                    { name: "Crown of Eternal Wisdom", type: "Relic", rarity: "Artifact", desc: "Ancient crown that grants visions of the future. Worn by monarchs throughout the ages." },
                    { name: "The Obsidian Grimoire", type: "Spell Book", rarity: "Artifact", desc: "Leather-bound tome containing forbidden magic. Each spell requires a dangerous sacrifice to cast." },
                    { name: "Pendulum of Lost Time", type: "Magical Item", rarity: "Artifact", desc: "Swings backward through moments. Used to rewind actions or glimpse past events." },
                    { name: "Wings of the Phoenix", type: "Armor Piece", rarity: "Legendary", desc: "Shimmering wings that grant the wearer temporary flight. Regenerates once per day." }
                  ].map((art, i) => (
                    <div key={i} className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 space-y-2">
                      <p className="font-bold text-slate-900 dark:text-white">{art.name}</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300"><strong>Type:</strong> {art.type} • <strong>Rarity:</strong> {art.rarity}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{art.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* LORE */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                    <Book size={20} className="text-purple-600" />
                  </div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">LORE</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { term: "The First Age", category: "History", def: "The ancient epoch when the world was young and gods still walked among mortals, gifting humans with magic." },
                    { term: "The Sundering", category: "Mythology", def: "Catastrophic event that split the continent into multiple islands and reshaped the magical grid." },
                    { term: "Crystalline Magic", category: "Magic System", def: "Form of magic channeled through living crystals. Amplifies caster power but requires constant focus." },
                    { term: "The Pact of Stars", category: "Political", def: "Ancient agreement between five kingdoms to maintain peace and share magical knowledge equally." },
                    { term: "Shadowborn Curse", category: "Mythology", def: "Dark blessing that allows a soul to exist in shadow form. Comes with insatiable hunger for life force." }
                  ].map((lore, i) => (
                    <div key={i} className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 space-y-2">
                      <p className="font-bold text-slate-900 dark:text-white">{lore.term}</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300"><strong>Category:</strong> {lore.category}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{lore.def}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* TIMELINE */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Clock size={20} className="text-blue-600" />
                  </div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">TIMELINE EVENTS</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title: "The Great Schism", date: "1432 (Second Age)", desc: "The kingdom split into three nations, each vying for control of the throne and magical resources." },
                    { title: "Rise of the Thieves' Guild", date: "1589 (Second Age)", desc: "Theon Darksbane founded the shadowy organization that would control trade in the capital for centuries." },
                    { title: "The War of Eternal Night", date: "1701 (Second Age)", desc: "Catastrophic conflict where shadow mages attempted to plunge the world into permanent darkness." },
                    { title: "Rediscovery of Crystalline Magic", date: "1812 (Third Age)", desc: "Lyra Willowbrook unlocked the secrets of crystal magic, revolutionizing magical practice forever." },
                    { title: "The Pact Renewal", date: "1920 (Third Age)", desc: "All five kingdoms reaffirmed their ancient agreements and established the Council of Sages." }
                  ].map((evt, i) => (
                    <div key={i} className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 space-y-2">
                      <p className="font-bold text-slate-900 dark:text-white">{evt.title}</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300"><strong>Year:</strong> {evt.date}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{evt.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ENTITIES */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900 flex items-center justify-center">
                    <Sparkles size={20} className="text-rose-600" />
                  </div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">ENTITIES & CONCEPTS</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: "The Order of the Sacred Dawn", type: "Organization", tier: "A", desc: "Religious order dedicated to healing and protection. Maintains temples across all five kingdoms." },
                    { name: "Thieves' Guild", type: "Criminal Organization", tier: "A", desc: "Underground network controlling illegal trade and information networks. Operates from Port Valorian." },
                    { name: "The Council of Sages", type: "Government", tier: "S", desc: "Supreme governing body representing all five kingdoms. Makes decisions affecting all magical regulation." },
                    { name: "Shadowborn", type: "Race/Species", tier: "A", desc: "Rare beings who exist partially in shadow. Feared and hunted by many, but revered in ancient texts." },
                    { name: "The Crystalline Network", type: "Phenomenon", tier: "S", desc: "Ancient magical infrastructure connecting all points of power. Only recently rediscovered and partially understood." }
                  ].map((ent, i) => (
                    <div key={i} className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-4 space-y-2">
                      <p className="font-bold text-slate-900 dark:text-white">{ent.name}</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300"><strong>Type:</strong> {ent.type} • <strong>Tier:</strong> {ent.tier}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{ent.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* DATA STRUCTURE */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <FileCode size={20} className="text-slate-600" />
                  </div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">PROJECT BACKUP STRUCTURE</h3>
                </div>
                <div className="space-y-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">When exporting your project, all cards and data are saved in this structure:</p>
                  <pre className="bg-slate-900 text-green-400 text-xs p-4 rounded-lg overflow-x-auto font-mono">
{`{
  "id": "proj_abc123",
  "title": "The Realm of Valoris",
  "author": "Your Name",
  
  // Card collections (30 total cards shown above)
  "characters": [ 5 entries ],
  "locations": [ 5 entries ],
  "artifacts": [ 5 entries ],
  "lore": [ 5 entries ],
  "timeline": [ 5 entries ],
  "entities": [ 5 entries ],
  
  // Story content
  "notes": [ ... ],
  "proseDocuments": [ ... ],
  "chapters": [ ... ],
  "ideas": [ ... ],
  "inspirations": [ ... ],
  
  // Metadata
  "lastModified": 1712606522,
  "wordCount": 25847,
  "characterCount": 156234
}`}
                  </pre>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-900 dark:text-blue-200">
                      <strong>📊 Data Organization:</strong> Each card type is stored in its own array. When you export your project, all 30+ example cards above would be included in the backup file and can be restored or migrated to other projects.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case SettingsTab.EXPORT:
        return projectData ? (
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-10 shadow-sm border border-slate-200 dark:border-slate-800 space-y-10 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-8">
              <div className="p-4 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl">
                <Download size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Export Project</h2>
                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Export your work into various formats for publication or backup.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <button 
                onClick={handleExportDocx}
                className="flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl hover:border-indigo-500/50 hover:bg-indigo-50/10 transition-all group"
              >
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FileCode size={32} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Microsoft Word</span>
                <span className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-wider">Manuscript (.docx)</span>
              </button>

              <button 
                onClick={() => {
                  const dataStr = JSON.stringify(projectData, null, 2);
                  const blob = new Blob([dataStr], { type: 'application/json' });
                  saveAs(blob, `${projectData.title.replace(/\s+/g, '_')}_Backup.json`);
                }}
                className="flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl hover:border-emerald-500/50 hover:bg-emerald-50/10 transition-all group"
              >
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Database size={32} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">JSON Data</span>
                <span className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-wider">Full Project Backup (.json)</span>
              </button>
            </div>
          </section>
        ) : null;

      default: return null;
    }
  };

  return (
    <div className="h-full flex bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      {/* Settings Secondary Sidebar */}
      <aside className={`w-full lg:w-64 md:w-72 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col lg:flex-col shrink-0 transition-all duration-300`}>
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 space-y-1">
          <h1 className="ph-section-title text-xl flex items-center gap-3">
            <Settings size={20} className="text-indigo-600" /> Settings
          </h1>
          <p className="ph-section-subtitle">Environment Control</p>
        </div>

        <nav data-section="view-tabs" className="lg:flex-1 overflow-x-auto lg:overflow-y-auto p-4 flex lg:flex-col gap-2 custom-scrollbar">
          {Object.values(SettingsTab).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`ph-tab lg:w-full flex flex-row items-center lg:gap-3 gap-1 px-2 lg:px-4 py-2 lg:py-3.5 whitespace-nowrap shrink-0 ${activeTab === tab ? 'ph-tab-active' : 'ph-tab-inactive'}`}
            >
              <div className={activeTab === tab ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}>
                {getTabIcon(tab)}
              </div>
              <span className="hidden lg:inline">{tab}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-2 text-center">
            <p className="ph-label mb-0 text-center">Build Info</p>
            <div className="text-[10px] font-mono text-indigo-500 truncate">#{(process.env.NEXT_PUBLIC_GIT_COMMIT_HASH || 'unknown')?.slice(0, 7)}</div>
          </div>
        </div>
      </aside>

      {/* Main Settings Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto relative bg-slate-50 dark:bg-slate-950 custom-scrollbar p-4 lg:p-8">
        <div className="max-w-5xl mx-auto w-full min-h-full pb-40">
          {renderTabContent()}
        </div>
      </main>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteFeed}
        title="Clear Raw Text Feed?"
        footer={
          <>
            <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-slate-600 font-bold hover:text-slate-900 transition-colors uppercase text-[10px] tracking-widest">Cancel</button>
            <button onClick={handleDeleteFeed} className="px-6 py-2 bg-red-600 text-white rounded-xl font-black hover:bg-red-700 transition-colors uppercase text-[10px] tracking-widest shadow-lg shadow-red-600/20">Clear All Feed Data</button>
          </>
        }
      >
        <p className="text-slate-600 dark:text-slate-400 font-serif text-lg leading-relaxed">
          This will permanently delete all text entries in the current project (Notes, Ideas, and non-image Sources) as well as all global notebook entries.
          <br /><br />          <span className="font-bold text-red-500">This action cannot be undone and will empty the Raw Text Feed entirely.</span>
        </p>
      </Modal>
    </div>
  );
};
