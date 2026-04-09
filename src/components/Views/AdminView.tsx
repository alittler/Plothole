import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProjectData, AppPrompts, ToolboxLink, ProjectMetadata, Note, AppSettings, ViewType, User as AppUser } from '../../types';
import { 
  Shield, Sparkles, Save, Trash2, Check, Copy, Edit2, 
  Settings, User, Plus, Search, Archive, Clock, AlertCircle,
  FileText, Activity, Terminal, Code, Cpu, Download, Layout,
  UserPlus, Mail, Link as LinkIcon, ChevronRight, Maximize2, PenTool, X, Map, MapPin, Globe, Loader2, RotateCcw, Target, Wrench, Upload, Book, Grid3x3, GripVertical, Eye, EyeOff, Users, Calendar
} from 'lucide-react';

import { CardCatalogueView } from './CardCatalogueView';
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
  onDeleteGlobalNote: (id: string) => void;
  onLinkClick: (type: string, id: string) => void;
  onChangeView: (view: ViewType) => void;
  currentUser: AppUser;
}

enum AdminTab {
  SYSTEM = 'System',
  NAVIGATION = 'Navigation',
  USERS = 'Users',
  TOOLBOX = 'Toolbox',
  CARD_CATALOGUE = 'Card Catalogue',
  PLOTHOLE_FORMAT = 'File Format'
}

export const AdminView: React.FC<AdminViewProps> = ({
  data, globalNotes, appPrompts, appSettings, onSaveSettings, onSavePrompts, projectsMetadata, onUpdateProject, onDeleteGlobalNote, onLinkClick, onChangeView, currentUser
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<AdminTab>((searchParams.get('tab') as AdminTab) || AdminTab.SYSTEM);

  const handleSetActiveTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const [prompts, setPrompts] = useState(appPrompts);
  const [settings, setSettings] = useState(appSettings);
  const [sidebarOrder, setSidebarOrder] = useState<ViewType[]>(appSettings.sidebarOrder || []);
  const [bottomNavOrder, setBottomNavOrder] = useState<ViewType[]>(appSettings.bottomNavOrder || []);
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

  const getViewLabel = (view: ViewType): string => {
    const labels: Record<ViewType, string> = {
      [ViewType.DASHBOARD]: 'Dashboard',
      [ViewType.NOTEPAD]: 'Notepad',
      [ViewType.BOOKSHELF]: 'Library',
      [ViewType.CHARACTERS]: 'Characters',
      [ViewType.MAP]: 'Atlas',
      [ViewType.TIMELINE]: 'History',
      [ViewType.CODEX]: 'Codex',
      [ViewType.RESEARCH]: 'Research',
      [ViewType.TOOLBOX]: 'Toolbox',
      [ViewType.SETTINGS]: 'Settings',
      [ViewType.ADMIN]: 'Admin'
    };
    return labels[view] || view;
  };

  const getViewIcon = (view: ViewType) => {
    const iconMap: Record<ViewType, any> = {
      [ViewType.DASHBOARD]: Grid3x3,
      [ViewType.NOTEPAD]: FileText,
      [ViewType.BOOKSHELF]: Book,
      [ViewType.CHARACTERS]: Users,
      [ViewType.MAP]: Globe,
      [ViewType.TIMELINE]: Calendar,
      [ViewType.CODEX]: Book,
      [ViewType.RESEARCH]: Target,
      [ViewType.TOOLBOX]: Wrench,
      [ViewType.SETTINGS]: Settings,
      [ViewType.ADMIN]: Shield
    };
    const Icon = iconMap[view];
    return Icon ? <Icon size={18} /> : null;
  };

  const moveSidebarItem = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...sidebarOrder];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newOrder.length) return;
    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
    setSidebarOrder(newOrder);
  };

  const moveBottomNavItem = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...bottomNavOrder];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newOrder.length) return;
    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
    setBottomNavOrder(newOrder);
  };

  const toggleBottomNavItem = (view: ViewType) => {
    const index = bottomNavOrder.indexOf(view);
    if (index > -1) {
      setBottomNavOrder(bottomNavOrder.filter(v => v !== view));
    } else {
      setBottomNavOrder([...bottomNavOrder, view]);
    }
  };

  const saveSidebarOrder = () => {
    const updatedSettings = { ...settings, sidebarOrder };
    setSettings(updatedSettings);
    onSaveSettings(updatedSettings);
  };

  const saveBottomNavOrder = () => {
    const updatedSettings = { ...settings, bottomNavOrder };
    setSettings(updatedSettings);
    onSaveSettings(updatedSettings);
  };

  const allViews = Object.values(ViewType);
  const hiddenBottomNavItems = allViews.filter(v => !bottomNavOrder.includes(v) && v !== ViewType.RESEARCH);

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
            {/* Sidebar Order */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl p-10 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-8 mb-8">
                <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-600/20"><Layout size={28} /></div>
                <div><h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Sidebar Navigation Order</h2><p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Reorder page links in sidebar and mobile menu.</p></div>
              </div>
              
              <div className="space-y-2">
                {sidebarOrder.length === 0 ? (
                  <p className="text-slate-500 italic py-6 text-center">No pages configured</p>
                ) : (
                  sidebarOrder.map((view, index) => (
                    <div key={view} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 group hover:border-emerald-400 transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                        <GripVertical size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                        {getViewIcon(view)}
                        <span className="font-bold text-slate-900 dark:text-white">{getViewLabel(view)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => moveSidebarItem(index, 'up')}
                          disabled={index === 0}
                          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move up"
                        >
                          <ChevronRight size={16} className="rotate-90" />
                        </button>
                        <button
                          onClick={() => moveSidebarItem(index, 'down')}
                          disabled={index === sidebarOrder.length - 1}
                          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move down"
                        >
                          <ChevronRight size={16} className="-rotate-90" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button onClick={saveSidebarOrder} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20">
                <Save size={18} /> Save Sidebar Order
              </button>
            </section>

            {/* Bottom Nav Order */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl p-10 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-8 mb-8">
                <div className="p-4 bg-purple-600 text-white rounded-2xl shadow-lg shadow-purple-600/20"><Layout size={28} /></div>
                <div><h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Bottom Navigation Order</h2><p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Configure mobile bottom nav links and order.</p></div>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-100 dark:border-slate-800 space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Visible Links (middle one is always inflated)</h3>
                {bottomNavOrder.length === 0 ? (
                  <p className="text-slate-500 italic py-4 text-center">No pages shown in bottom nav</p>
                ) : (
                  bottomNavOrder.map((view, index) => (
                    <div key={view} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 group hover:border-purple-400 transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                        <GripVertical size={16} className="text-slate-300 group-hover:text-purple-500 transition-colors" />
                        {getViewIcon(view)}
                        <span className="font-bold text-slate-900 dark:text-white">{getViewLabel(view)}</span>
                        {index === Math.floor(bottomNavOrder.length / 2) && (
                          <span className="ml-2 text-[10px] font-black bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full uppercase">Inflated</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => moveBottomNavItem(index, 'up')}
                          disabled={index === 0}
                          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move up"
                        >
                          <ChevronRight size={16} className="rotate-90" />
                        </button>
                        <button
                          onClick={() => moveBottomNavItem(index, 'down')}
                          disabled={index === bottomNavOrder.length - 1}
                          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move down"
                        >
                          <ChevronRight size={16} className="-rotate-90" />
                        </button>
                        <button
                          onClick={() => toggleBottomNavItem(view)}
                          className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/20 text-rose-500 rounded-lg transition-colors"
                          title="Hide from bottom nav"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {hiddenBottomNavItems.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-100 dark:border-slate-800 space-y-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Hidden Links</h3>
                  <div className="space-y-2">
                    {hiddenBottomNavItems.map(view => (
                      <div key={view} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 opacity-50">
                        <div className="flex items-center gap-3">
                          <EyeOff size={16} className="text-slate-400" />
                          {getViewIcon(view)}
                          <span className="font-bold text-slate-900 dark:text-white">{getViewLabel(view)}</span>
                        </div>
                        <button
                          onClick={() => toggleBottomNavItem(view)}
                          className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 text-emerald-500 rounded-lg transition-colors"
                          title="Show in bottom nav"
                        >
                          <EyeOff size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={saveBottomNavOrder} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20">
                <Save size={18} /> Save Bottom Nav Order
              </button>
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

      case AdminTab.CARD_CATALOGUE:
        return data ? (
          <div className="h-full flex flex-col min-h-0 animate-in fade-in duration-500">
            <CardCatalogueView data={data} onUpdateProject={onUpdateProject} onLinkClick={onLinkClick} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-20"><div className="text-center space-y-4"><Grid3x3 size={48} className="mx-auto text-slate-200" /><p className="text-slate-400 italic font-serif">Load a project to access the Card Catalogue.</p></div></div>
        );

      case AdminTab.PLOTHOLE_FORMAT:
        return (
          <div className="max-w-5xl mx-auto space-y-8 py-8 animate-in fade-in duration-500">
            {/* Format Overview */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl p-10 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-8">
                <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20"><Archive size={28} /></div>
                <div><h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">.plothole Format</h2><p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Portable project container structure and specification.</p></div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">Overview</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    A <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-mono text-xs">.plothole</code> file is a ZIP archive containing your complete project structure, including metadata, entities, source materials, and version history. This format enables easy sharing, backup, and migration between systems.
                  </p>
                </div>

                {/* Directory Structure */}
                <div>
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">Directory Structure</h3>
                  <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-6 font-mono text-xs text-slate-300 overflow-x-auto">
                    <pre>{`.plothole/
├── manifest.yaml              # Project metadata & entity index
├── entities.yaml              # Complete entity definitions
├── database/
│   ├── chapters.yaml          # Manuscript chapters
│   ├── characters.yaml        # Character entities
│   ├── locations.yaml         # Location entities
│   ├── items.yaml             # Items & artifacts
│   ├── lore.yaml              # Worldbuilding entries
│   └── timeline.yaml          # Timeline events
├── source/
│   ├── inspirations/          # Image & reference files
│   ├── research/              # Research documents
│   └── notes/                 # Associated notes
└── history.diff               # Version control / edit history`}</pre>
                  </div>
                </div>

                {/* Sample Manifest */}
                <div>
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">Sample manifest.yaml</h3>
                  <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-6 font-mono text-xs text-slate-300 overflow-x-auto">
                    <pre>{`# Plothole Project Manifest
version: "1.0"
projectId: "proj_abc123xyz"
title: "The Forgotten Codex"
author: "Jane Doe"
created: "2024-01-15T10:30:00Z"
modified: "2024-01-20T14:22:00Z"

statistics:
  wordCount: 2512
  chapters: 3
  characters: 5
  locations: 5
  items: 5
  lore: 5
  timeline: 5

entities:
  characters:
    - id: "char_001"
      name: "Kessandra Mohr"
      role: "Memory Thief"
    - id: "char_002"
      name: "Eris Thane"
      role: "Timeline Guardian"
  locations:
    - id: "loc_001"
      name: "The Memory Archive"
      type: "Place"
  timeline:
    - id: "evt_001"
      title: "The First Age"
      date: "Year 0"`}</pre>
                  </div>
                </div>

                {/* Manifest Fields */}
                <div>
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">Manifest Fields</h3>
                  <div className="space-y-3">
                    {[
                      { field: 'version', desc: 'Plothole format version' },
                      { field: 'projectId', desc: 'Unique project identifier' },
                      { field: 'title', desc: 'Project name' },
                      { field: 'author', desc: 'Project creator' },
                      { field: 'created', desc: 'ISO 8601 creation timestamp' },
                      { field: 'modified', desc: 'ISO 8601 last modification timestamp' },
                      { field: 'statistics', desc: 'Aggregate counts of project entities' },
                      { field: 'entities', desc: 'Index of all entities by type and id' }
                    ].map(item => (
                      <div key={item.field} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest font-mono">{item.field}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Database Files */}
                <div>
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">Database Files</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Each file in the <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-mono text-xs">database/</code> directory stores entities as YAML:</p>
                  <div className="space-y-2">
                    {[
                      { file: 'chapters.yaml', content: 'Manuscript chapters with content, word count, and metadata' },
                      { file: 'characters.yaml', content: 'Character profiles with traits, roles, backgrounds' },
                      { file: 'locations.yaml', content: 'Geographic and physical locations with descriptions' },
                      { file: 'items.yaml', content: 'Items and artifacts with properties and significance' },
                      { file: 'lore.yaml', content: 'Worldbuilding entries, history, and lore' },
                      { file: 'timeline.yaml', content: 'Timeline events with dates and descriptions' }
                    ].map(item => (
                      <div key={item.file} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30 flex items-start gap-3">
                        <FileText size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white font-mono">{item.file}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">{item.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Export & Import */}
                <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                  <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-wider mb-2">Export & Import</h3>
                  <p className="text-sm text-indigo-800 dark:text-indigo-300">
                    Use the export function to generate a <code className="bg-white dark:bg-slate-900 px-2 py-1 rounded font-mono text-xs">.plothole</code> file of your current project. Import .plothole files to restore projects or migrate between installations.
                  </p>
                </div>
              </div>
            </section>

            {/* Vault (.pvoid) Section */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl p-10 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-8">
                <div className="p-4 bg-purple-600 text-white rounded-2xl shadow-lg shadow-purple-600/20"><Archive size={28} /></div>
                <div><h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">.pvoid Format</h2><p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Master vault containing global notes and account-wide metadata.</p></div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">Overview</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    A <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-mono text-xs">.pvoid</code> file is a ZIP archive containing your author-level Vault: all global notes, tags, account metadata, and a reference list of all your projects. This acts as a "Single Source of Truth" for notes that can be referenced across multiple Books.
                  </p>
                </div>

                {/* Vault Directory Structure */}
                <div>
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">Directory Structure</h3>
                  <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-6 font-mono text-xs text-slate-300 overflow-x-auto">
                    <pre>{`.pvoid/
├── manifest.yaml              # Vault metadata & book inventory
├── account/
│   ├── notes.yaml             # All global notes with unique IDs
│   ├── tags.yaml              # Tag definitions & metadata
│   └── metadata.yaml          # Author/account information
└── history.diff               # Version control / edit history`}</pre>
                  </div>
                </div>

                {/* Sample Vault Manifest */}
                <div>
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">Sample manifest.yaml</h3>
                  <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-6 font-mono text-xs text-slate-300 overflow-x-auto">
                    <pre>{`# Plothole Vault Manifest
version: "1.0"
vault_id: "vault_author_001"
author: "Jane Doe"
created: "2024-01-01T00:00:00Z"
modified: "2024-01-20T14:22:00Z"

statistics:
  note_count: 42
  tag_count: 8
  books: 3

books:
  - id: "book_avatar_id"
    title: "Avatar Project"
    last_backup: "2024-01-20T10:00:00Z"
  - id: "book_memories_id"
    title: "Memories of the Void"
    last_backup: "2024-01-19T15:30:00Z"`}</pre>
                  </div>
                </div>

                {/* Vault Manifest Fields */}
                <div>
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">Manifest Fields</h3>
                  <div className="space-y-3">
                    {[
                      { field: 'vault_id', desc: 'Unique vault identifier for this author' },
                      { field: 'author', desc: 'Author/account name' },
                      { field: 'created', desc: 'ISO 8601 vault creation timestamp' },
                      { field: 'modified', desc: 'ISO 8601 last modification timestamp' },
                      { field: 'statistics', desc: 'Counts of notes, tags, and linked books' },
                      { field: 'books', desc: 'Array of book IDs and titles backed up from this vault' }
                    ].map(item => (
                      <div key={item.field} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest font-mono">{item.field}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vault Notes Schema */}
                <div>
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">Notes Schema</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Each note in <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-mono text-xs">account/notes.yaml</code> contains:</p>
                  <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-6 font-mono text-xs text-slate-300 overflow-x-auto">
                    <pre>{`notes:
  - id: "note_001"              # Unique vault-wide ID
    content: "Character notes"
    created: "2024-01-01T10:00:00Z"
    modified: "2024-01-20T14:00:00Z"
    tags: []                     # Tag IDs (managed by app)
    anchor_target: "char_001"    # Optional: Entity ID (character, location, etc.)
    note_type: "global"          # "global" or "ephemeral"
  
  - id: "note_002"
    content: "Temporary thoughts"
    tags: ["avatar"]
    anchor_target: null
    note_type: "ephemeral"       # Ephemeral notes stay in vault only`}</pre>
                  </div>
                </div>

                {/* Book-Vault Relationship */}
                <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-100 dark:border-purple-900/30">
                  <h3 className="text-sm font-black text-purple-900 dark:text-purple-200 uppercase tracking-wider mb-3">Book-Vault Relationship</h3>
                  <div className="space-y-3 text-sm text-purple-800 dark:text-purple-300">
                    <p>
                      When you back up a <strong>Book (.plothole)</strong>, it includes <strong>referenced_notes</strong>: cached copies of notes from the Vault that are relevant to that project.
                    </p>
                    <p>
                      Books are <strong>self-contained</strong>. If you share a .plothole file with someone else, they can read the notes without needing your .pvoid Vault.
                    </p>
                    <p>
                      <strong>Sync behavior:</strong> Book backups are snapshots. If you edit a note in the Vault and then back up a Book, the next backup will include the updated note cached inside the .plothole file.
                    </p>
                  </div>
                </div>

                {/* Vault Export & Import */}
                <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-100 dark:border-purple-900/30">
                  <h3 className="text-sm font-black text-purple-900 dark:text-purple-200 uppercase tracking-wider mb-2">Export & Import</h3>
                  <p className="text-sm text-purple-800 dark:text-purple-300">
                    Use the <strong>Export Vault</strong> button to backup all your global notes and account metadata into a <code className="bg-white dark:bg-slate-900 px-2 py-1 rounded font-mono text-xs">.pvoid</code> file. Import .pvoid files to restore your Vault on another device or as a backup.
                  </p>
                </div>

                {/* Manuscript Analysis Section */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-4 bg-amber-600 text-white rounded-2xl shadow-lg shadow-amber-600/20"><Book size={28} /></div>
                    <div><h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Manuscript Analysis</h2><p className="text-sm text-slate-500 font-bold uppercase tracking-widest">What details the app extracts when processing your manuscript.</p></div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">Extracted Details</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">When you process or sync your manuscript, the AI analyzes the text and extracts the following details:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { title: 'Title & Summary', desc: 'Project name and executive summary of the story' },
                          { title: 'Cover Description', desc: 'Poetic visual description for generating cover art' },
                          { title: 'Characters', desc: 'Names, roles, jobs, traits, physical features, strengths, weaknesses' },
                          { title: 'Character Relationships', desc: 'Bonds between characters (rivals, spouses, mentors, etc.)' },
                          { title: 'Themes', desc: 'Primary narrative themes and recurring motifs' },
                          { title: 'Timeline Events', desc: 'Dated story events with characters involved and locations' },
                          { title: 'Locations', desc: 'Settings with descriptions and classifications' },
                          { title: 'Artifacts & Items', desc: 'Inanimate objects, weapons, relics, and their significance' },
                          { title: 'Worldbuilding Terms', desc: 'Unique concepts, magic systems, terminology specific to your world' },
                          { title: 'Character Tier Classification', desc: 'Categorized as Core, Supporting, or Background based on role' }
                        ].map(item => (
                          <div key={item.title} className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
                            <p className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-widest mb-1">{item.title}</p>
                            <p className="text-xs text-amber-800 dark:text-amber-300">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">Character Details Extracted</h3>
                      <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-6 font-mono text-xs text-slate-300 overflow-x-auto">
                        <pre>{`Character Fields Extracted:
├── name               # Character name
├── role               # Story role (Protagonist, Antagonist, Supporting, Minor)
├── tier               # Tier assignment (1=Core, 2=Supporting, 3=Background)
├── job                # Profession or occupation
├── description        # General character description
├── traits             # Array of personality traits
├── age                # Age or age range
├── birthday           # Birth date if mentioned
├── birthplace         # Birth location if mentioned
├── residence          # Current residence if known
├── physicalFeatures   # Height, weight, build, distinctive marks
├── style              # Clothing, fashion, appearance style
├── strengths          # Character abilities and strengths
├── weaknesses         # Vulnerabilities and weaknesses
├── nickname           # Alternate names or aliases
├── firstMentionOffset # Character position in text
└── source             # "ai" or "manual" (origin of data)`}</pre>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">Character Tier System</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        Characters are classified into three tiers based on their narrative role during manuscript analysis. Only <strong>Core Tier (Tier 1)</strong> characters receive automatic physical description generation.
                      </p>
                      <div className="space-y-3">
                        {[
                          { tier: '1 - Core', roles: 'Protagonist, Antagonist', desc: 'Main characters driving the narrative. Auto-generate missing physical descriptions.' },
                          { tier: '2 - Supporting', roles: 'Supporting cast', desc: 'Important secondary characters. Manual description recommended.' },
                          { tier: '3 - Background', roles: 'Minor, Extras', desc: 'Incidental characters with limited page time. Low priority for detail generation.' }
                        ].map(item => (
                          <div key={item.tier} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">{item.tier}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2"><strong>Roles:</strong> {item.roles}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">Analysis Process</h3>
                      <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-decimal list-inside">
                        <li>You upload or edit your manuscript</li>
                        <li>App detects changes (Smart Sync)</li>
                        <li>AI analyzes manuscript in chunks (for large files)</li>
                        <li>Details are extracted using the unified analysis schema</li>
                        <li>Characters are classified by role into tiers (Protagonist/Antagonist → Tier 1, Supporting → Tier 2, Minor → Tier 3)</li>
                        <li>New characters are added with their assigned tier; existing ones are merged with new data</li>
                        <li><strong>For Tier 1 (Core) characters:</strong> If physical description is missing, AI generates it automatically</li>
                        <li>Timeline, locations, artifacts, and lore are updated</li>
                        <li>Project summary and themes are refreshed</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      {/* Admin Secondary Sidebar */}
      <aside className={`${activeTab ? 'hidden md:flex' : 'flex'} w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-col shrink-0 transition-all duration-300`}>
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
                {tab === AdminTab.CARD_CATALOGUE && <Grid3x3 size={18} />}
                {tab === AdminTab.PLOTHOLE_FORMAT && <Archive size={18} />}
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
        <div className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8 min-h-full pb-40">
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
