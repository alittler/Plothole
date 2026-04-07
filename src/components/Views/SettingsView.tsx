import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProjectData, Note, User, ViewType, ChangeLogEntry, AppSettings } from '../../types';
import { 
  Settings, User as UserIcon, Database, Shield, Code, Check, 
  ChevronRight, History, Activity, Hash, Archive, FileCode,
  Link as LinkIcon, Sparkles, Copy, Trash2, Download, FileText, X
} from 'lucide-react';
import { Modal } from '../ui/Modal';

import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

enum SettingsTab {
  PROFILE = 'Profile',
  PREFERENCES = 'Preferences',
  ARCHIVE = 'Storage Archive',
  AUDIT = 'Audit Log',
  MANIFEST = 'Manifest',
  RAW = 'Raw',
  EXPORT = 'Export'
}

interface SettingsViewProps {
  projectData: ProjectData | null;
  globalNotes: Note[];
  onImportProject: (d: ProjectData) => void;
  onFactoryReset: () => void;
  onClearGlobalNotes?: () => void;
  currentUser: User;
  onUpdateUser: (u: Partial<User>) => void;
  onUpdateProject: (d: Partial<ProjectData>) => void;
  onChangeView: (v: ViewType) => void;
  onLinkClick?: (type: string, id: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser, onUpdateUser, onFactoryReset, projectData, onUpdateProject, onChangeView, onLinkClick, globalNotes, onClearGlobalNotes
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as SettingsTab) || SettingsTab.PROFILE;
  const setActiveTab = (tab: SettingsTab) => setSearchParams({ tab });

  const [rawText, setRawText] = React.useState('');
  const [isSaved, setIsSaved] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const [archiveFiles, setArchiveFiles] = React.useState<{ name: string, size: number, mtime: Date, url: string }[]>([]);
  const [previewFile, setPreviewFile] = React.useState<{ name: string, content: string, type: string } | null>(null);
  const [isLoadingArchive, setIsLoadingArchive] = React.useState(false);
  
  // Wiki feature state
  const [username, setUsername] = React.useState('');
  const [isLoadingUsername, setIsLoadingUsername] = React.useState(false);
  const [usernameSaved, setUsernameSaved] = React.useState(false);

  React.useEffect(() => {
    if (activeTab === SettingsTab.ARCHIVE && projectData) {
      fetchArchiveFiles();
    }
    if (activeTab === SettingsTab.PROFILE) {
      fetchUsername();
    }
  }, [activeTab, projectData]);

  const fetchUsername = async () => {
    try {
      const resp = await fetch('/api/user/username');
      if (resp.ok) {
        const data = await resp.json();
        setUsername(data.username || '');
      }
    } catch (err) {
      console.error('Failed to fetch username:', err);
    }
  };

  const handleSaveUsername = async () => {
    if (!username || !/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
      alert('Username must be 3-20 alphanumeric characters (no spaces)');
      return;
    }

    setIsLoadingUsername(true);
    try {
      const resp = await fetch('/api/user/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      
      if (resp.ok) {
        setUsernameSaved(true);
        setTimeout(() => setUsernameSaved(false), 2000);
      } else {
        const err = await resp.json();
        alert(err.error || 'Failed to save username');
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
      const data = await resp.json();
      setArchiveFiles(data.files || []);
    } catch (err) {
      console.error("Failed to fetch archive files", err);
    } finally {
      setIsLoadingArchive(false);
    }
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
                  <p className="text-xs text-slate-400">Your public wiki URL: plothole.click/{username || 'username'}</p>
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

              <div className="p-8 bg-red-50 dark:bg-red-900/10 rounded-[2rem] border border-red-100 dark:border-red-900/30">
                <h3 className="font-black text-red-600 dark:text-red-400 mb-2 uppercase text-xs tracking-[0.2em]">Factory Reset</h3>
                <p className="text-sm text-red-700 dark:text-red-300/70 mb-6 font-medium">This will permanently delete all projects, characters, manuscripts, and notes. This action cannot be undone.</p>
                <button
                  onClick={onFactoryReset}
                  className="px-8 py-3 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                >
                  Wipe All Data
                </button>
              </div>
            </section>
          </div>
        );

      case SettingsTab.PREFERENCES:
        return (
          <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-sm border border-slate-200 dark:border-slate-800 space-y-10 animate-in fade-in duration-500">
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
                    value={currentUser.preferences?.landingPage || ViewType.DASHBOARD}
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
          <section className="h-full flex flex-col bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in duration-500">
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
                            <div className="text-[11px] font-bold truncate">{file.name}</div>
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
                        <pre className="text-[11px] font-mono text-amber-600 dark:text-amber-400 bg-slate-50 dark:bg-slate-950 p-8 rounded-[2rem] overflow-x-auto border border-slate-100 dark:border-slate-800 whitespace-pre-wrap leading-relaxed">
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
          <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8 animate-in fade-in duration-500">
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
                      <div className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
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
          <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-sm border border-slate-200 dark:border-slate-800 space-y-10 animate-in fade-in duration-500">
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
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Container ID</div>
                <div className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate">#{projectData.id}</div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Integrity Hash</div>
                <div className="text-xs font-mono font-bold text-emerald-500 truncate">{projectData.integrityHash?.slice(0, 16)}...</div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Last Sync</div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">{new Date(projectData.lastModified).toLocaleTimeString()}</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800">
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
        return projectData ? (
          <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-8">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl">
                  <FileCode size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Raw Text Feed</h2>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">A continuous Markdown export of all project notes.</p>
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

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6">
              <textarea
                readOnly
                value={rawMarkdownDump}
                className="w-full h-[600px] bg-transparent border-none focus:ring-0 resize-none font-mono text-sm leading-relaxed text-slate-600 dark:text-slate-300 break-words [overflow-wrap:anywhere] custom-scrollbar"
                placeholder="No text entries found in this project."
              />
            </div>
          </section>
        ) : null;

      case SettingsTab.EXPORT:
        return projectData ? (
          <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-sm border border-slate-200 dark:border-slate-800 space-y-10 animate-in fade-in duration-500">
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
                className="flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] hover:border-indigo-500/50 hover:bg-indigo-50/10 transition-all group"
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
                className="flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] hover:border-emerald-500/50 hover:bg-emerald-50/10 transition-all group"
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
      <aside className={`${activeTab ? 'hidden lg:flex' : 'flex'} w-full lg:w-64 md:w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-col shrink-0 transition-all duration-300`}>
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 space-y-1">
          <h1 className="ph-section-title text-xl flex items-center gap-3">
            <Settings size={20} className="text-indigo-600" /> Settings
          </h1>
          <p className="ph-section-subtitle">Environment Control</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          {Object.values(SettingsTab).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`ph-tab w-full flex items-center gap-3 px-4 py-3.5 ${activeTab === tab ? 'ph-tab-active' : 'ph-tab-inactive'}`}
            >
              <div className={activeTab === tab ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}>
                {getTabIcon(tab)}
              </div>
              {tab}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-2 text-center">
            <p className="ph-label mb-0 text-center">Build Info</p>
            <div className="text-[10px] font-mono text-indigo-500 truncate">#{import.meta.env.VITE_GIT_COMMIT_HASH?.slice(0, 7)}</div>
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
