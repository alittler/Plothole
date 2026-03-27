import React from 'react';
import { ProjectData, Note, User, LedgerEntry, ViewType, ChangeLogEntry } from '../../types';
import { 
  Settings, User as UserIcon, Database, Shield, Code, Check, 
  ChevronRight, History, Activity, Hash, Archive, FileCode,
  Link as LinkIcon, Sparkles, Copy, Trash2
} from 'lucide-react';
import { Modal } from '../ui/Modal';

enum SettingsTab {
  PROFILE = 'Profile',
  PREFERENCES = 'Preferences',
  AUDIT = 'Audit Log',
  MANIFEST = 'Manifest',
  RAW = 'Raw'
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
  const [activeTab, setActiveTab] = React.useState<SettingsTab>(SettingsTab.PROFILE);
  const [rawText, setRawText] = React.useState('');
  const [isSaved, setIsSaved] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const allTextEntries = React.useMemo(() => {
    const entries: { id: string; type: string; content: string; timestamp: number }[] = [];
    
    // Global Notes (Notepad)
    globalNotes.forEach(n => entries.push({ id: n.id, type: 'GLOBAL_NOTEPAD', content: n.content, timestamp: n.timestamp }));

    if (projectData) {
      projectData.ledger?.forEach(n => entries.push({ id: n.id, type: 'LEDGER', content: n.content, timestamp: n.timestamp }));
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

  const getEntityView = (type: string): ViewType => {
    switch (type) {
      case 'Character': return ViewType.CHARACTERS;
      case 'Location': return ViewType.MAP;
      case 'Timeline': return ViewType.TIMELINE;
      case 'Note': return ViewType.RESEARCH;
      case 'Source': return ViewType.RESEARCH;
      default: return ViewType.DASHBOARD;
    }
  };

  React.useEffect(() => {
    if (projectData?.ledger) {
      setRawText(projectData.ledger.map(e => `--- ENTRY ${e.id} ---\n${e.content}`).join('\n\n'));
    }
  }, [projectData]);

  const handleSaveRaw = () => {
    if (!projectData) return;
    // Simple parser for the raw format
    const entries = rawText.split(/--- ENTRY (.*) ---/).filter(Boolean);
    const newLedger: LedgerEntry[] = [];
    for (let i = 0; i < entries.length; i += 2) {
      const id = entries[i].trim();
      const content = entries[i + 1]?.trim();
      if (id && content) {
        newLedger.push({
          id,
          content,
          timestamp: Date.now(),
          tags: [] // Tags are lost in this simple raw editor, but that's okay for "raw"
        });
      }
    }
    onUpdateProject({ ledger: newLedger });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleDeleteFeed = () => {
    if (projectData) {
      onUpdateProject({
        ledger: [],
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

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg">
              <Settings size={32} />
            </div>
            <div className="space-y-1 text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">SYSTEM SETTINGS</h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Configure your writing environment and user profile.</p>
            </div>
          </div>
          
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto no-scrollbar">
            {Object.values(SettingsTab).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pb-12 space-y-12">
        {activeTab === SettingsTab.PROFILE && (
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                <UserIcon size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">User Profile</h2>
                <p className="text-xs text-slate-500">Your identity within the Plothole ecosystem.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Display Name</label>
                <input
                  type="text"
                  value={currentUser.name}
                  onChange={(e) => onUpdateUser({ name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                <input
                  type="email"
                  value={currentUser.email}
                  onChange={(e) => onUpdateUser({ email: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
                />
              </div>
            </div>
          </section>
        )}

        {activeTab === SettingsTab.PREFERENCES && (
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                <Settings size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">System Preferences</h2>
                <p className="text-xs text-slate-500">Customize your experience and workflow defaults.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Appearance */}
              <div className="space-y-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-l-2 border-indigo-500 pl-3">Appearance</h3>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Theme Mode</label>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {(['light', 'dark'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => onUpdateUser({ preferences: { ...currentUser.preferences, themeMode: mode } })}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all capitalize ${currentUser.preferences?.themeMode === mode ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Font Family</label>
                  <select 
                    value={currentUser.preferences?.fontFamily || 'sans'}
                    onChange={(e) => onUpdateUser({ preferences: { ...currentUser.preferences, fontFamily: e.target.value as any } })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="sans">Modern Sans</option>
                    <option value="serif">Classic Serif</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Font Size</label>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {(['sm', 'md', 'lg'] as const).map(size => (
                      <button
                        key={size}
                        onClick={() => onUpdateUser({ preferences: { ...currentUser.preferences, fontSize: size } })}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all uppercase ${currentUser.preferences?.fontSize === size ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Workflow */}
              <div className="space-y-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-l-2 border-indigo-500 pl-3">Workflow</h3>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Default Landing Page</label>
                  <select 
                    value={currentUser.preferences?.landingPage || ViewType.DASHBOARD}
                    onChange={(e) => onUpdateUser({ preferences: { ...currentUser.preferences, landingPage: e.target.value as any } })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.values(ViewType).map(view => (
                      <option key={view} value={view}>{view}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">The Oracle Verbosity</label>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {(['concise', 'detailed'] as const).map(v => (
                      <button
                        key={v}
                        onClick={() => onUpdateUser({ preferences: { ...currentUser.preferences, aiVerbosity: v } })}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all capitalize ${currentUser.preferences?.aiVerbosity === v ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 mt-4">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Reduce Motion</span>
                    <p className="text-[10px] text-slate-500">Minimize animations and transitions.</p>
                  </div>
                  <button 
                    onClick={() => onUpdateUser({ preferences: { ...currentUser.preferences, reducedMotion: !currentUser.preferences?.reducedMotion } })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${currentUser.preferences?.reducedMotion ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${currentUser.preferences?.reducedMotion ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
        
        {activeTab === SettingsTab.AUDIT && projectData && (
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                <History size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Audit Log</h2>
                <p className="text-xs text-slate-500">Every change to every card is recorded here.</p>
              </div>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {(projectData.changeLog || []).slice().reverse().map((log: ChangeLogEntry) => (
                <div key={log.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-indigo-500/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg text-slate-400">
                      {getEntityIcon(log.entityType)}
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        {log.action} {log.entityType}
                        {log.entityId && <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 rounded">#{log.entityId}</span>}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">{log.entityName} • {new Date(log.timestamp).toLocaleString()}</div>
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
                      className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all opacity-0 group-hover:opacity-100 flex items-center gap-1"
                      title="Copy Reference Tag"
                    >
                      {copiedId === log.entityId ? <Check size={16} /> : <LinkIcon size={16} />}
                      {copiedId === log.entityId && <span className="text-[8px] font-black uppercase">Copied</span>}
                    </button>
                  )}
                </div>
              ))}
              {(!projectData.changeLog || projectData.changeLog.length === 0) && (
                <div className="py-12 text-center text-slate-400 italic text-sm">No activity recorded yet.</div>
              )}
            </div>
          </section>
        )}

        {activeTab === SettingsTab.MANIFEST && projectData && (
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <FileCode size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Project Manifest</h2>
                <p className="text-xs text-slate-500">The metadata and structural integrity of this .plothole container.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Container ID</div>
                <div className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate">#{projectData.id}</div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Integrity Hash</div>
                <div className="text-xs font-mono font-bold text-emerald-500 truncate">{projectData.integrityHash?.slice(0, 16)}...</div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Sync</div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">{new Date(projectData.lastModified).toLocaleTimeString()}</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield size={16} className="text-indigo-500" /> Semantic Security
                </h3>
                <p className="text-xs text-slate-500">Enable deep-meaning search and AI analysis for this project manifest.</p>
              </div>
              <button 
                onClick={() => onUpdateUser({ 
                  preferences: { 
                    ...currentUser.preferences, 
                    semanticSearchEnabled: !currentUser.preferences?.semanticSearchEnabled 
                  } 
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${currentUser.preferences?.semanticSearchEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${currentUser.preferences?.semanticSearchEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </section>
        )}

        {activeTab === SettingsTab.RAW && projectData && (
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl">
                  <FileCode size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Raw Text Feed</h2>
                  <p className="text-xs text-slate-500">A continuous Markdown export of all project notes.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                  title="Clear All Text Entries"
                >
                  <Trash2 size={20} />
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(rawMarkdownDump);
                    setIsSaved(true);
                    setTimeout(() => setIsSaved(false), 2000);
                  }}
                  className={`px-6 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${isSaved ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                >
                  {isSaved ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy All</>}
                </button>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
              <textarea
                readOnly
                value={rawMarkdownDump}
                className="w-full h-[600px] bg-transparent border-none focus:ring-0 resize-none font-mono text-sm leading-relaxed text-slate-600 dark:text-slate-300 break-words [overflow-wrap:anywhere]"
                placeholder="No text entries found in this project."
              />
            </div>
          </section>
        )}

        {activeTab === SettingsTab.PROFILE && (
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl">
                <Database size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Data Management</h2>
                <p className="text-xs text-slate-500">Critical system operations and database maintenance.</p>
              </div>
            </div>

            <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30">
              <h3 className="font-bold text-red-600 dark:text-red-400 mb-2 uppercase text-xs tracking-widest">Factory Reset</h3>
              <p className="text-sm text-red-700 dark:text-red-300/70 mb-4">This will permanently delete all projects, characters, manuscripts, and notes. This action cannot be undone.</p>
              <button
                onClick={onFactoryReset}
                className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors"
              >
                Wipe All Data
              </button>
            </div>
          </section>
        )}
      </div>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteFeed}
        title="Clear Raw Text Feed?"
        footer={
          <>
            <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-slate-600 font-bold hover:text-slate-900 transition-colors">Cancel</button>
            <button onClick={handleDeleteFeed} className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors">Clear All Feed Data</button>
          </>
        }
      >
        <p className="text-slate-600 dark:text-slate-400 font-serif text-lg leading-relaxed">
          This will permanently delete all text entries in the current project (Ledger, Notes, Ideas, and non-image Sources) as well as all global notebook entries. 
          <br /><br />
          <span className="font-bold text-red-500">This action cannot be undone and will empty the Raw Text Feed entirely.</span>
        </p>
      </Modal>
    </div>
  );
};
