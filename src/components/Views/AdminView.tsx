import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProjectData, AppPrompts, ToolboxLink, ProjectMetadata, Note, AppSettings, ViewType, User as AppUser, Artifact, LoreEntry, Source, Character, Location, TimelineEvent, ChangeLogEntry } from '../../types';
import { 
  Shield, Sparkles, Save, Database, Trash2, Check, Copy, Edit2, 
  Settings, User, Plus, Search, Archive, Clock, AlertCircle,
  FileText, Activity, Terminal, Code, Cpu, Download, Layout,
  UserPlus, Mail, Link as LinkIcon, ChevronRight, Maximize2, PenTool, X, Map, Globe, Loader2, RotateCcw, Target
} from 'lucide-react';

import { UnifiedDatabaseView } from './UnifiedDatabaseView';
import { WikiText } from '../ui/WikiText';
import { generateId } from '../../services/storageService';

interface AdminViewProps {
  data: ProjectData | null;
  globalNotes: Note[];
  appPrompts: AppPrompts;
  appSettings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onSavePrompts: (prompts: AppPrompts) => void;
  projectsMetadata: ProjectMetadata[];
  onUpdateProject: (updates: Partial<ProjectData>) => void;
  onFullArchive: () => void;
  globalResources: ToolboxLink[];
  onAddGlobalResource: (resource: ToolboxLink) => void;
  onDeleteGlobalResource: (id: string) => void;
  onToggleViewVisibility: (viewId: string) => void;
  onDeleteGlobalNote: (id: string) => void;
  onLinkClick: (type: string, id: string) => void;
  onChangeView: (view: ViewType) => void;
  onQuickUpdate: (type: string, id: string, key: string, value: any) => void;
  currentUser: AppUser;
  adminTargetId?: string | null;
  onClearAdminTarget?: () => void;
}

enum AdminTab {
  SYSTEM = 'System',
  NAVIGATION = 'Navigation',
  USERS = 'Users',
  LEDGER = 'Narrative Ledger'
}

export const AdminView: React.FC<AdminViewProps> = ({
  data, globalNotes, appPrompts, appSettings, onSaveSettings, onSavePrompts, projectsMetadata, onUpdateProject, onDeleteGlobalNote, onLinkClick, onChangeView, onQuickUpdate, currentUser, adminTargetId, onClearAdminTarget
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (adminTargetId ? AdminTab.LEDGER : (searchParams.get('tab') as AdminTab)) || AdminTab.SYSTEM;
  const setActiveTab = (tab: AdminTab) => setSearchParams({ tab });

  const [prompts, setPrompts] = useState(appPrompts);
  const [settings, setSettings] = useState(appSettings);
  const [newUserEmail, setNewUserEmail] = useState('');

  React.useEffect(() => {
    if (adminTargetId) setActiveTab(AdminTab.LEDGER);
  }, [adminTargetId]);

  const renderTabContent = () => {
    switch (activeTab) {
      case AdminTab.SYSTEM:
        return (
          <div className="max-w-5xl mx-auto space-y-8 py-8 animate-in fade-in duration-500">
            <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-8">
                <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20"><Settings size={28} /></div>
                <div><h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">App Configuration</h2><p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Core system parameters and performance limits.</p></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex flex-col gap-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Application Name</label><input type="text" value={settings.appName} onChange={e => setSettings({...settings, appName: e.target.value})} className="bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                <div className="flex flex-col gap-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">AI Character Limit</label><input type="number" value={settings.aiCharacterLimit} onChange={e => setSettings({...settings, aiCharacterLimit: parseInt(e.target.value)})} className="bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
              </div>
              <button onClick={() => onSaveSettings(settings)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3"><Save size={20} /> Update Configuration</button>
            </section>

            <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-8">
                <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20"><Archive size={28} /></div>
                <div><h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Data Storage & Formats</h2><p className="text-sm text-slate-500 font-bold uppercase tracking-widest">How the system ingests and mirrors your research.</p></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                    <FileText size={14} /> Accepted Formats
                  </h3>
                  <div className="space-y-2">
                    {[
                      { ext: '.txt, .md', type: 'Plain Text', save: 'Bundle (extracted.md)' },
                      { ext: '.pdf', type: 'Document', save: 'Bundle (extracted.md)' },
                      { ext: '.png, .jpg', type: 'Images', save: 'Bundle (extracted.md)' },
                    ].map(f => (
                      <div key={f.ext} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div>
                          <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{f.ext}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{f.type}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Saves As</p>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{f.save}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                    <Activity size={14} /> The Bundle Method
                  </h3>
                  <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 space-y-4">
                    <p className="text-xs text-slate-400 leading-relaxed font-serif italic">
                      "Plothole uses the <strong>Bundle Method</strong> to pair raw sources with machine-readable indices and clean transcripts."
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 p-1 bg-indigo-500/20 text-indigo-400 rounded-lg"><Code size={12} /></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Index Sidecar</p>
                          <p className="text-[11px] text-slate-500">filename.ext.index.json</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-1 p-1 bg-emerald-500/20 text-emerald-400 rounded-lg"><FileText size={12} /></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Prose Sidecar</p>
                          <p className="text-[11px] text-slate-500">filename.ext.extracted.md</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-8">
                <div className="p-4 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/20"><Cpu size={28} /></div>
                <div><h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">AI Intelligence Schema</h2><p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Define global extraction logic and system instructions.</p></div>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col gap-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">General Extraction Prompt</label><textarea value={prompts.GENERAL_AND_CHARACTERS} onChange={e => setPrompts({...prompts, GENERAL_AND_CHARACTERS: e.target.value})} className="bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none h-48 resize-none font-mono leading-relaxed" /></div>
                <button onClick={() => onSavePrompts(prompts)} className="w-full py-4 bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-amber-700 transition-all shadow-xl shadow-amber-600/20 flex items-center justify-center gap-3"><Save size={20} /> Update AI Schema</button>
              </div>
            </section>
          </div>
        );

      case AdminTab.NAVIGATION:
        return (
          <div className="max-w-5xl mx-auto py-8 animate-in fade-in duration-500 space-y-8">
            <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-8 mb-8">
                <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-600/20"><Layout size={28} /></div>
                <div><h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Navigation & Routing</h2><p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Configure workspace layout and view access.</p></div>
              </div>
              <div className="p-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem]">
                <Layout size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-serif italic text-lg">Dynamic navigation ordering and permissions coming soon.</p>
              </div>
            </section>
          </div>
        );

      case AdminTab.USERS:
        return (
          <div className="max-w-5xl mx-auto py-8 animate-in fade-in duration-500 space-y-8">
            <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-8 mb-8">
                <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20"><User size={28} /></div>
                <div><h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Identity Management</h2><p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Manage authorized collaborators and roles.</p></div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-4 mb-8">
                <input 
                  type="email" 
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="Invite user by email..."
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"><UserPlus size={18} /> Invite</button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 font-black">AD</div>
                    <div><p className="text-sm font-black text-slate-900 dark:text-white uppercase">Admin Account</p><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Primary Story Architect</p></div>
                  </div>
                  <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-[8px] font-black uppercase tracking-widest">Active</span>
                </div>
              </div>
            </section>
          </div>
        );

      case AdminTab.LEDGER:
        return data ? (
          <div className="h-full flex flex-col min-h-0 animate-in fade-in duration-500">
            <UnifiedDatabaseView data={data} onUpdateProject={onUpdateProject} onQuickUpdate={onQuickUpdate} onLinkClick={onLinkClick} adminTargetId={adminTargetId} onClearAdminTarget={onClearAdminTarget} hideHeader={true} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-20"><div className="text-center space-y-4"><Database size={48} className="mx-auto text-slate-200" /><p className="text-slate-400 italic font-serif">Load a project to access the Narrative Ledger.</p></div></div>
        );

      default: return null;
    }
  };

  return (
    <div className="h-full flex bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Admin Secondary Sidebar */}
      <aside className="w-64 md:w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl shadow-lg"><Shield size={20} /></div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Admin</h1>
          </div>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">System Control</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          {Object.values(AdminTab).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              {tab === AdminTab.SYSTEM && <Settings size={18} />}
              {tab === AdminTab.NAVIGATION && <Layout size={18} />}
              {tab === AdminTab.USERS && <User size={18} />}
              {tab === AdminTab.LEDGER && <Database size={18} />}
              {tab}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-2">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">User Level</p>
            <div className="flex items-center gap-2 text-indigo-600">
              <Shield size={14} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Root Architect</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Admin Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto relative bg-slate-50 dark:bg-slate-950 custom-scrollbar">
        {renderTabContent()}
      </main>
    </div>
  );
};
