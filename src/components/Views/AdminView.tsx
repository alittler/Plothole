import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProjectData, AppPrompts, ToolboxLink, ProjectMetadata, Note, AppSettings, ViewType, User as AppUser } from '../../types';
import { 
  Shield, Sparkles, Save, Database, Trash2, Check, Copy, Edit2, 
  Settings, User, Plus, Search, Archive, Clock, AlertCircle,
  FileText, Activity, Terminal, Code, Cpu, Download, Layout,
  UserPlus, Mail, Link as LinkIcon, ChevronRight, Maximize2, PenTool, X, Map, Globe, Loader2, RotateCcw, Target, Wrench, Upload
} from 'lucide-react';

import { UnifiedDatabaseView } from './UnifiedDatabaseView';
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
  onDeleteNote?: (id: string) => Promise<void>;
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
  TOOLBOX = 'Toolbox',
  ENTITIES = 'Entity Explorer'
}

export const AdminView: React.FC<AdminViewProps> = ({
  data, globalNotes, appPrompts, appSettings, onSaveSettings, onSavePrompts, projectsMetadata, onUpdateProject, onDeleteNote, onDeleteGlobalNote, onLinkClick, onChangeView, onQuickUpdate, currentUser, adminTargetId, onClearAdminTarget
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<AdminTab>(adminTargetId ? AdminTab.ENTITIES : (searchParams.get('tab') as AdminTab) || AdminTab.SYSTEM);

  const handleSetActiveTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const [prompts, setPrompts] = useState(appPrompts);
  const [settings, setSettings] = useState(appSettings);
  const [newUserEmail, setNewUserEmail] = useState('');

  const [newLink, setNewLink] = useState<Partial<ToolboxLink>>({ label: '', url: '', category: 'Writing', description: '' });
  const [networkInfo, setNetworkInfo] = useState<{ ip: string, port: number } | null>(null);

  React.useEffect(() => {
    fetch('/api/network-info')
      .then(res => res.json())
      .then(data => setNetworkInfo(data))
      .catch(err => console.error("Failed to fetch network info", err));
  }, []);

  const handleAddDefaultLink = () => {
    if (!newLink.label || !newLink.url) return;
    const link: ToolboxLink = {
      id: generateId(),
      label: newLink.label,
      url: newLink.url,
      category: newLink.category || 'Writing',
      description: newLink.description
    };
    const updatedSettings = {
      ...settings,
      defaultToolboxLinks: [...(settings.defaultToolboxLinks || []), link]
    };
    setSettings(updatedSettings);
    onSaveSettings(updatedSettings);
    setNewLink({ label: '', url: '', category: 'Writing', description: '' });
  };

  const handleRemoveDefaultLink = (id: string) => {
    const updatedSettings = {
      ...settings,
      defaultToolboxLinks: (settings.defaultToolboxLinks || []).filter(l => l.id !== id)
    };
    setSettings(updatedSettings);
    onSaveSettings(updatedSettings);
  };

  React.useEffect(() => {
    if (adminTargetId) handleSetActiveTab(AdminTab.ENTITIES);
  }, [adminTargetId]);

  const renderTabContent = () => {
    switch (activeTab) {
      case AdminTab.SYSTEM:
        return (
          <div className="max-w-5xl mx-auto space-y-8 py-8 animate-in fade-in duration-500">
            <section className="bg-white dark:bg-slate-900 rounded-2xl p-10 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
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

            <section className="bg-white dark:bg-slate-900 rounded-2xl p-10 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
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
                          <p className="text-xs text-slate-500">filename.ext.index.json</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-1 p-1 bg-emerald-500/20 text-emerald-400 rounded-lg"><FileText size={12} /></div>
                        <div>
                          <p className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Prose Sidecar</p>
                          <p className="text-xs text-slate-500">filename.ext.extracted.md</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white dark:bg-slate-900 rounded-2xl p-10 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-8">
                <div className="p-4 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/20"><Cpu size={28} /></div>
                <div><h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">AI Intelligence Schema</h2><p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Define global extraction logic and system instructions.</p></div>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col gap-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">General Extraction Prompt</label><textarea value={prompts.GENERAL_AND_CHARACTERS} onChange={e => setPrompts({...prompts, GENERAL_AND_CHARACTERS: e.target.value})} className="bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none h-48 resize-none font-mono leading-relaxed" /></div>
                <button onClick={() => onSavePrompts(prompts)} className="w-full py-4 bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-amber-700 transition-all shadow-xl shadow-amber-600/20 flex items-center justify-center gap-3"><Save size={20} /> Update AI Schema</button>
              </div>
            </section>

            <section className="bg-white dark:bg-slate-900 rounded-2xl p-10 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-8">
                <div className="p-4 bg-cyan-600 text-white rounded-2xl shadow-lg shadow-cyan-600/20"><Upload size={28} /></div>
                <div><h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">S3 Upload Test</h2><p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Test AWS S3 file upload and storage.</p></div>
              </div>
              <FileUploadTest />
            </section>
          </div>
        );

      case AdminTab.NAVIGATION:
        return (
          <div className="max-w-5xl mx-auto py-8 animate-in fade-in duration-500 space-y-8">
            <section className="bg-white dark:bg-slate-900 rounded-2xl p-10 shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-8 mb-8">
                <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-600/20"><Layout size={28} /></div>
                <div><h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Navigation & Routing</h2><p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Configure workspace layout and view access.</p></div>
              </div>
              <div className="p-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                <Layout size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-serif italic text-lg">Dynamic navigation ordering and permissions coming soon.</p>
              </div>
            </section>
          </div>
        );

      case AdminTab.TOOLBOX:
        return (
          <div className="max-w-5xl mx-auto py-8 animate-in fade-in duration-500 space-y-8">
            <section className="bg-white dark:bg-slate-900 rounded-2xl p-10 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-8">
                <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20"><Wrench size={28} /></div>
                <div><h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Toolbox Defaults</h2><p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Global resources for every story architect.</p></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800/50 p-8 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="space-y-4">
                  <div className="flex flex-col gap-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tool Label</label><input type="text" value={newLink.label} onChange={e => setNewLink({...newLink, label: e.target.value})} placeholder="e.g. RhymeZone" className="bg-white dark:bg-slate-900 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                  <div className="flex flex-col gap-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Resource URL</label><input type="text" value={newLink.url} onChange={e => setNewLink({...newLink, url: e.target.value})} placeholder="https://..." className="bg-white dark:bg-slate-900 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                </div>
                <div className="space-y-4">
                  <div className="flex flex-col gap-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label><input type="text" value={newLink.category} onChange={e => setNewLink({...newLink, category: e.target.value})} placeholder="e.g. Vocabulary" className="bg-white dark:bg-slate-900 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                  <div className="flex flex-col gap-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description (Optional)</label><input type="text" value={newLink.description} onChange={e => setNewLink({...newLink, description: e.target.value})} placeholder="What is this for?" className="bg-white dark:bg-slate-900 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                </div>
                <button onClick={handleAddDefaultLink} className="md:col-span-2 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3"><Plus size={20} /> Add Global Resource</button>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-1">Active Global Tools</h3>
                {settings.defaultToolboxLinks?.map(link => (
                  <div key={link.id} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 group">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl text-indigo-600 shadow-sm"><LinkIcon size={18} /></div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{link.label}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{link.category} &bull; {link.description || 'No description'}</p>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveDefaultLink(link.id)} className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18} /></button>
                  </div>
                ))}
                {(!settings.defaultToolboxLinks || settings.defaultToolboxLinks.length === 0) && (
                  <div className="py-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                    <Activity size={48} className="mx-auto text-slate-200 mb-4 opacity-20" />
                    <p className="text-slate-400 font-serif italic text-lg">No global resources configured.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        );

      case AdminTab.USERS:
        return (
          <div className="max-w-5xl mx-auto py-8 animate-in fade-in duration-500 space-y-8">
            <section className="bg-white dark:bg-slate-900 rounded-2xl p-10 shadow-sm border border-slate-200 dark:border-slate-800">
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

      case AdminTab.ENTITIES:
        return data ? (
          <div className="h-full flex flex-col min-h-0 animate-in fade-in duration-500">
            <UnifiedDatabaseView data={data} onUpdateProject={onUpdateProject} onDeleteNote={onDeleteNote} onQuickUpdate={onQuickUpdate} onLinkClick={onLinkClick} adminTargetId={adminTargetId} onClearAdminTarget={onClearAdminTarget} hideHeader={true} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-20"><div className="text-center space-y-4"><Database size={48} className="mx-auto text-slate-200" /><p className="text-slate-400 italic font-serif">Load a project to access the Entity Explorer.</p></div></div>
        );

      default: return null;
    }
  };

  return (
    <div className="h-full flex bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      {/* Admin Secondary Sidebar */}
      <aside className={`${activeTab ? 'hidden lg:flex' : 'flex'} w-full lg:w-64 md:w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-col shrink-0 transition-all duration-300`}>
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 space-y-1">
          <h1 className="ph-section-title text-xl flex items-center gap-3">
            <Shield size={20} className="text-indigo-600" /> Admin
          </h1>
          <p className="ph-section-subtitle">System Control</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          {Object.values(AdminTab).map(tab => (
            <button
              key={tab}
              onClick={() => handleSetActiveTab(tab)}
              className={`ph-tab w-full flex items-center gap-3 px-4 py-3.5 ${activeTab === tab ? 'ph-tab-active bg-indigo-600 text-white' : 'ph-tab-inactive'}`}
            >
              <div className={activeTab === tab ? 'text-white' : 'text-indigo-500'}>
                {tab === AdminTab.SYSTEM && <Settings size={18} />}
                {tab === AdminTab.NAVIGATION && <Layout size={18} />}
                {tab === AdminTab.USERS && <User size={18} />}
                {tab === AdminTab.TOOLBOX && <Wrench size={18} />}
                {tab === AdminTab.ENTITIES && <Database size={18} />}
              </div>
              {tab}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
          {networkInfo && (
            <div className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-500">
              <div className="p-2 bg-white rounded-lg border border-slate-100">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`http://${networkInfo.ip}:${networkInfo.port}`)}`}
                  alt="Local Access QR Code"
                  className="w-24 h-24"
                />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Local Network Access</p>
                <code className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg">
                  {networkInfo.ip}:{networkInfo.port}
                </code>
              </div>
            </div>
          )}

          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-2">
            <p className="ph-label mb-0">User Level</p>
            <div className="flex items-center gap-2 text-indigo-600">
              <Shield size={14} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Root Architect</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Admin Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto relative bg-slate-50 dark:bg-slate-950 custom-scrollbar">
        <div className="flex-1 w-full max-w-5xl mx-auto p-0 md:p-8 min-h-full pb-40">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
};

const FileUploadTest: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setUploadedUrl(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      setUploadedUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleCreateDummyFile = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('S3 Upload Test', 100, 100);
      ctx.fillText(new Date().toLocaleString(), 100, 130);
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'test-upload.png', { type: 'image/png' });
        handleUpload(file);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Upload Method</h3>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full py-4 bg-cyan-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-cyan-700 disabled:opacity-50 transition-all shadow-xl shadow-cyan-600/20 flex items-center justify-center gap-3"
          >
            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
            {isUploading ? 'Uploading...' : 'Choose File'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
            accept="image/*"
          />
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Auto-Generate Test File</h3>
          <button
            onClick={handleCreateDummyFile}
            disabled={isUploading}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3"
          >
            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
            {isUploading ? 'Creating...' : 'Create Dummy Image'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-sm text-red-900 dark:text-red-200 uppercase">Upload Failed</p>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      )}

      {uploadedUrl && (
        <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-4">
          <div className="flex items-center gap-3">
            <Check size={20} className="text-emerald-600 dark:text-emerald-400" />
            <p className="font-black text-sm text-emerald-900 dark:text-emerald-200 uppercase">Upload Successful!</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">File URL</label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={uploadedUrl}
                  readOnly
                  className="flex-1 bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-xs font-mono truncate"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(uploadedUrl);
                  }}
                  className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-800 rounded-xl transition"
                  title="Copy to clipboard"
                >
                  <Copy size={16} className="text-emerald-600 dark:text-emerald-400" />
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Preview</label>
              <img
                src={uploadedUrl}
                alt="Uploaded file"
                className="mt-2 max-w-full max-h-64 rounded-xl border border-emerald-200 dark:border-emerald-800"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.open(uploadedUrl, '_blank')}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm uppercase hover:bg-emerald-700 transition flex items-center justify-center gap-2"
              >
                <Download size={16} /> Open in New Tab
              </button>
              <button
                onClick={() => {
                  setUploadedUrl(null);
                  setError(null);
                }}
                className="flex-1 py-2 bg-slate-600 text-white rounded-lg font-bold text-sm uppercase hover:bg-slate-700 transition"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
