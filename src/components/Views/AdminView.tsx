import React, { useState, useMemo } from 'react';
import { ProjectData, AppPrompts, ToolboxLink, ProjectMetadata, Note, AppSettings, ViewType, User as AppUser } from '../../types';
import { 
  Shield, Sparkles, Save, Database, Trash2, Clock, Tag, 
  Type, Users, Layout, Search, Filter, Hash, Archive,
  History, UserPlus, Mail, Link as LinkIcon, Check,
  ChevronRight, Maximize2, PenTool, X, Map
} from 'lucide-react';

enum AdminTab {
  SYSTEM = 'System',
  NAVIGATION = 'Navigation',
  USERS = 'Users',
  CARDS = 'UNIFIED DATA FEED'
}

enum CardCategory {
  ALL = 'All Cards',
  RESEARCH = 'Research',
  CHARACTERS = 'Characters',
  WORLD = 'World Hub',
  PLOT = 'Plot & Timeline'
}

interface AdminViewProps {
  data: ProjectData | null;
  globalNotes: Note[];
  appPrompts: AppPrompts;
  appSettings: AppSettings;
  onSaveSettings: (s: AppSettings) => void;
  onSavePrompts: (p: AppPrompts) => void;
  onUpdateProject: (d: Partial<ProjectData>) => void;
  onFullArchive: () => void;
  globalResources: ToolboxLink[];
  onAddGlobalResource: () => void;
  onDeleteGlobalResource: () => void;
  onToggleViewVisibility: () => void;
  projectsMetadata: ProjectMetadata[];
  onDeleteGlobalNote: (id: string) => void;
  onLinkClick?: (type: string, id: string) => void;
  onChangeView?: (v: any) => void;
  onQuickUpdate: (type: string, id: string, key: string, value: any) => void;
  currentUser: AppUser;
}

export const AdminView: React.FC<AdminViewProps> = ({
  data, globalNotes, appPrompts, appSettings, onSaveSettings, onSavePrompts, projectsMetadata, onUpdateProject, onDeleteGlobalNote, onLinkClick, onChangeView, onQuickUpdate, currentUser
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(AdminTab.SYSTEM);
  const [prompts, setPrompts] = useState(appPrompts);
  const [settings, setSettings] = useState(appSettings);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);
  
  // UNIFIED DATA FEED States
  const [cardSearch, setCardSearch] = useState('');
  const [cardSort, setCardSort] = useState<'name' | 'type' | 'id'>('name');
  const [isQuickEdit, setIsQuickEdit] = useState(false);
  const [activeCardCategory, setActiveCardCategory] = useState<CardCategory>(CardCategory.ALL);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [mergedData, setMergedData] = useState<any>(null);

  const handleOpenMerge = () => {
    if (selectedCards.length !== 2) return;
    if (selectedCards[0].type !== selectedCards[1].type) {
      alert("You can only merge objects of the same type.");
      return;
    }
    
    // Initialize merged data with the first card's data
    setMergedData({ ...selectedCards[0].data });
    setIsMergeOpen(true);
  };

  const handleConfirmMerge = () => {
    if (!mergedData) return;
    
    const type = selectedCards[0].type;
    const sourceId = selectedCards[0].id;
    const targetId = selectedCards[1].id;

    // Logic: Update the "target" (2nd) card with mergedData, and delete the "source" (1st) card.
    // We'll simulate this by updating the target and filtering out the source.
    const mapTypeToKey: Record<string, string> = {
      'Character': 'characters',
      'Location': 'locations',
      'Timeline': 'timeline',
      'Source': 'sources',
      'Ledger': 'ledger',
      'Artifact': 'artifacts',
      'Lore': 'lore'
    };

    const projectKey = mapTypeToKey[type];
    if (!projectKey || !data) return;

    const list = [...(data as any)[projectKey] || []];
    const targetIdx = list.findIndex((item: any) => item.id === targetId);
    
    if (targetIdx !== -1) {
      list[targetIdx] = { ...list[targetIdx], ...mergedData, id: targetId };
      const filteredList = list.filter((item: any) => item.id !== sourceId);
      onUpdateProject({ [projectKey]: filteredList });
    }

    setIsMergeOpen(false);
    setSelectedCardIds([]);
    setMergedData(null);
    alert(`Successfully merged ${selectedCards[0].name} and ${selectedCards[1].name}`);
  };

  const toggleCardSelection = (id: string) => {
    setSelectedCardIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const compilePrompt = (template: string, itemData?: any) => {
    if (!data) return template;
    
    const charList = data.characters?.map(c => `- ${c.name} (${c.role}${c.job ? `, ${c.job}` : ''}): ${c.description}`).join('\n') || 'No characters defined.';
    const locList = data.locations?.map(l => `- ${l.name} [${l.type}] (X: ${l.x?.toFixed(1) || '0.0'}, Y: ${l.y?.toFixed(1) || '0.0' }): ${l.description}`).join('\n') || 'No locations defined.';
    const timeList = data.timeline?.map(e => `- ${e.date}: ${e.title} - ${e.description}`).join('\n') || 'No timeline events.';
    const loreList = data.lore?.map(l => `- ${l.term} [${l.category}]: ${l.definition}`).join('\n') || 'No lore defined.';
    const ledgerList = data.ledger?.map(n => `[${new Date(n.timestamp).toLocaleDateString()}] ${n.content}`).join('\n\n') || 'No ledger entries.';
    const themeList = data.themes?.join(', ') || 'No themes defined.';
    
    let compiled = template
      .replace(/{title}/g, data.title)
      .replace(/{author}/g, data.author || 'Unknown')
      .replace(/{summary}/g, data.summary || 'No summary.')
      .replace(/{characters}/g, charList)
      .replace(/{locations}/g, locList)
      .replace(/{timeline}/g, timeList)
      .replace(/{ledger}/g, ledgerList)
      .replace(/{lore}/g, loreList)
      .replace(/{themes}/g, themeList)
      .replace(/{user_context}/g, currentUser.name)
      .replace(/{tasks}/g, 'No active tasks.');

    // Item-level resolution if context provided
    if (itemData) {
      compiled = compiled
        .replace(/{name}/g, itemData.name || itemData.title || itemData.term || 'Untitled')
        .replace(/{type}/g, itemData.type || 'Object')
        .replace(/{role}/g, itemData.role || '')
        .replace(/{job}/g, itemData.job || '')
        .replace(/{x}/g, String(itemData.x || '0.0'))
        .replace(/{y}/g, String(itemData.y || '0.0'))
        .replace(/{description}/g, itemData.description || itemData.definition || itemData.content || '');
    }

    return compiled;
  };

  const adminNotes = useMemo(() => {
    const globalAdminNotes = globalNotes.filter(n => n.tags.includes('admin_note'));
    const projectAdminNotes = data?.ideas?.filter(n => n.tags.includes('admin_note')) || [];
    return [...globalAdminNotes, ...projectAdminNotes].sort((a, b) => b.timestamp - a.timestamp);
  }, [globalNotes, data]);

  // Unified Card Explorer logic with filter and sort
  const allCards = useMemo(() => {
    if (!data) return [];
    let cards: { id: string; type: string; name: string; data: any }[] = [];
    
    data.characters?.forEach(c => cards.push({ id: c.id, type: 'Character', name: c.name, data: c }));
    data.locations?.forEach(l => cards.push({ id: l.id, type: 'Location', name: l.name, data: l }));
    data.timeline?.forEach(e => cards.push({ id: e.id, type: 'Timeline', name: e.title, data: e }));
    data.sources?.forEach(s => cards.push({ id: s.id, type: 'Source', name: s.name, data: s }));
    data.ledger?.forEach(n => cards.push({ id: n.id, type: 'Ledger', name: 'Ledger Entry', data: n }));
    data.artifacts?.forEach(a => cards.push({ id: a.id, type: 'Artifact', name: a.name, data: a }));
    data.lore?.forEach(l => cards.push({ id: l.id, type: 'Lore', name: l.term, data: l }));

    // Apply Category Filter
    if (activeCardCategory !== CardCategory.ALL) {
      cards = cards.filter(c => {
        switch (activeCardCategory) {
          case CardCategory.RESEARCH:
            return c.type === 'Source' || c.type === 'Ledger';
          case CardCategory.CHARACTERS:
            return c.type === 'Character';
          case CardCategory.WORLD:
            return c.type === 'Location' || c.type === 'Artifact' || c.type === 'Lore';
          case CardCategory.PLOT:
            return c.type === 'Timeline';
          default:
            return true;
        }
      });
    }

    // Apply Filter
    if (cardSearch.trim()) {
      const q = cardSearch.toLowerCase();
      cards = cards.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.type.toLowerCase().includes(q) || 
        c.id.toLowerCase().includes(q)
      );
    }

    // Apply Sort
    cards.sort((a, b) => {
      if (cardSort === 'name') return a.name.localeCompare(b.name);
      if (cardSort === 'type') return a.type.localeCompare(b.type);
      if (cardSort === 'id') return a.id.localeCompare(b.id);
      return 0;
    });
    
    return cards;
  }, [data, cardSearch, cardSort, activeCardCategory]);

  const selectedCards = useMemo(() => 
    allCards.filter(c => selectedCardIds.includes(c.id)),
  [allCards, selectedCardIds]);

  const handleAddAdmin = () => {
    if (!newUserEmail.trim()) return;
    const currentAdmins = settings.adminEmails || [];
    if (!currentAdmins.includes(newUserEmail)) {
      const updated = { ...settings, adminEmails: [...currentAdmins, newUserEmail.trim()] };
      setSettings(updated);
      onSaveSettings(updated);
    }
    setNewUserEmail('');
  };

  const handleRemoveAdmin = (email: string) => {
    const updated = { ...settings, adminEmails: (settings.adminEmails || []).filter(e => e !== email) };
    setSettings(updated);
    onSaveSettings(updated);
  };

  const handleDeleteNote = async (id: string) => {
    if (globalNotes.some(n => n.id === id)) {
      onDeleteGlobalNote(id);
    } else if (data?.ideas?.some(n => n.id === id)) {
      onUpdateProject({ ideas: data.ideas.filter(n => n.id !== id) });
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case AdminTab.SYSTEM:
        return (
          <div className="space-y-12">
            {/* AI Parameter Cards */}
            <div className="grid grid-cols-1 gap-8">
              {Object.entries(prompts).map(([key, value]) => {
                if (key === 'AI_MODEL') return null;
                return (
                  <section key={key} className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl">
                          <Sparkles size={20} />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">{key.replace(/_/g, ' ')}</h2>
                          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">AI Logic Parameter</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => onSavePrompts(prompts)} 
                        className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                        title="Save Parameter"
                      >
                        <Save size={20} />
                      </button>
                    </div>
                    <div className="relative">
                      <textarea 
                        value={value} 
                        onChange={(e) => setPrompts({ ...prompts, [key]: e.target.value })}
                        className="w-full h-48 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-6 text-sm font-serif leading-relaxed focus:ring-2 focus:ring-indigo-500 resize-none outline-none"
                        placeholder="Define the AI logic here... use {variables} for dynamic context."
                      />
                      <div className="absolute bottom-4 right-4 text-[10px] font-mono text-slate-400 pointer-events-none">
                        PROMPT_CARD_V1
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>

            <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
                <div className="flex items-center gap-4">
                  <Shield className="text-indigo-500" size={24} />
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Global Config</h2>
                </div>
                <button onClick={() => onSavePrompts(prompts)} className="flex items-center gap-2 px-4 sm:px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                  <Save size={18} /> <span className="hidden sm:inline">Save Global Config</span>
                </button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Model</label>
                  <select value={prompts.AI_MODEL} onChange={(e) => setPrompts({ ...prompts, AI_MODEL: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                    <option value="gemini-2.0-pro-exp-02-05">Gemini 2.0 Pro Experimental</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Character Limit (per chunk/analysis)</label>
                  <input 
                    type="number" 
                    value={settings.aiCharacterLimit || 400000} 
                    onChange={(e) => setSettings({ ...settings, aiCharacterLimit: parseInt(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. 400000"
                  />
                  <p className="text-[9px] text-slate-500 font-medium">Controls the amount of text sent to the AI in a single request. Higher values capture more context but take longer to process.</p>
                </div>
              </div>
            </section>
          </div>
        );

      case AdminTab.NAVIGATION:
        return (
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-12 animate-in fade-in duration-500">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/20 text-indigo-500 rounded-2xl">
                  <Layout size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Navigation Layout</h2>
                  <p className="text-xs text-slate-500 uppercase font-black tracking-widest mt-1">Configure global sidebar and mobile navigation</p>
                </div>
              </div>
              <button 
                onClick={() => onSaveSettings(settings)}
                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                <Save size={18} /> Save Layout
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Sidebar Configuration */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Sidebar Icons</h3>
                  <div className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold text-slate-500">Desktop</div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">Rearrange the order of views in the main sidebar. Top items appear first.</p>
                
                <div className="space-y-2">
                  {(settings.sidebarOrder || [
                    ViewType.NOTEPAD, ViewType.STORY_ARCHITECT, ViewType.BOOKSHELF, ViewType.DASHBOARD,
                    ViewType.RESEARCH, ViewType.CHARACTERS, ViewType.MAP, ViewType.TIMELINE,
                    ViewType.TOOLBOX, ViewType.SETTINGS, ViewType.ADMIN
                  ]).map((view, index, arr) => (
                    <div key={view} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 group transition-all hover:border-indigo-500/30">
                      <div className="flex flex-col gap-1">
                        <button 
                          disabled={index === 0}
                          onClick={() => {
                            const newOrder = [...arr];
                            [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                            setSettings({ ...settings, sidebarOrder: newOrder });
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-500 disabled:opacity-0 transition-colors"
                        >
                          <ChevronRight size={14} className="-rotate-90" />
                        </button>
                        <button 
                          disabled={index === arr.length - 1}
                          onClick={() => {
                            const newOrder = [...arr];
                            [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
                            setSettings({ ...settings, sidebarOrder: newOrder });
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-500 disabled:opacity-0 transition-colors"
                        >
                          <ChevronRight size={14} className="rotate-90" />
                        </button>
                      </div>
                      <div className="flex-1 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400">
                          <Hash size={14} />
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 capitalize">{view.toLowerCase()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Nav Configuration */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Bottom Navbar</h3>
                  <div className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 rounded text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Mobile</div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">Select and order the 4 primary quick-access views for mobile users.</p>

                <div className="space-y-2">
                  {(settings.bottomNavOrder || [
                    ViewType.BOOKSHELF, ViewType.DASHBOARD, ViewType.NOTEPAD, ViewType.RESEARCH
                  ]).map((view, index, arr) => (
                    <div key={view} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 group transition-all hover:border-indigo-500/30">
                      <div className="flex flex-col gap-1">
                        <button 
                          disabled={index === 0}
                          onClick={() => {
                            const newOrder = [...arr];
                            [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                            setSettings({ ...settings, bottomNavOrder: newOrder });
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-500 disabled:opacity-0 transition-colors"
                        >
                          <ChevronRight size={14} className="-rotate-90" />
                        </button>
                        <button 
                          disabled={index === arr.length - 1}
                          onClick={() => {
                            const newOrder = [...arr];
                            [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
                            setSettings({ ...settings, bottomNavOrder: newOrder });
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-500 disabled:opacity-0 transition-colors"
                        >
                          <ChevronRight size={14} className="rotate-90" />
                        </button>
                      </div>
                      <div className="flex-1 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-500/50">
                          <Sparkles size={14} />
                        </div>
                        <select
                          value={view}
                          onChange={(e) => {
                            const newOrder = [...arr];
                            newOrder[index] = e.target.value as ViewType;
                            setSettings({ ...settings, bottomNavOrder: newOrder });
                          }}
                          className="flex-1 bg-transparent border-none text-sm font-bold text-slate-700 dark:text-slate-300 focus:ring-0 outline-none"
                        >
                          {Object.values(ViewType).map(v => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20 mt-6">
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                    <span className="font-black uppercase mr-1">Note:</span> The 5th slot in the mobile navbar is reserved for the sidebar menu toggle.
                  </p>
                </div>
              </div>
            </div>
          </section>
        );

      case AdminTab.USERS:
        return (
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/20 text-indigo-500 rounded-2xl">
                  <Users size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Role Management</h2>
                  <p className="text-xs text-slate-500 uppercase font-black tracking-widest mt-1">Authorized Access Control</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="email" 
                    value={newUserEmail} 
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="architect@plothole.ai" 
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <button onClick={handleAddAdmin} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20">
                  <UserPlus size={18} /> Grant Access
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(settings.adminEmails || []).map(email => (
                  <div key={email} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-between group border border-slate-100 dark:border-slate-800 transition-colors hover:border-indigo-500/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-500 font-bold uppercase">
                        {email[0]}
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{email}</span>
                    </div>
                    <button onClick={() => handleRemoveAdmin(email)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case AdminTab.CARDS:
        return (
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6 gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                  <Archive size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">UNIFIED DATA FEED</h2>
                  <p className="text-xs text-slate-500">Inspect and quick-edit project metadata objects.</p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text" 
                    value={cardSearch}
                    onChange={e => setCardSearch(e.target.value)}
                    placeholder="Search cards..."
                    className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 w-48 outline-none"
                  />
                </div>
                
                <select 
                  value={cardSort}
                  onChange={e => setCardSort(e.target.value as any)}
                  className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 font-bold text-slate-600 dark:text-slate-400 outline-none"
                >
                  <option value="name">Sort: Name</option>
                  <option value="type">Sort: Type</option>
                  <option value="id">Sort: ID</option>
                </select>

                <button 
                  onClick={() => setIsQuickEdit(!isQuickEdit)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${isQuickEdit ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}
                >
                  <PenTool size={14} />
                  {isQuickEdit ? 'Exit Quick Edit' : 'Edit All'}
                </button>

                {selectedCardIds.length === 2 && (
                  <button 
                    onClick={handleOpenMerge}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 hover:bg-emerald-700 animate-in zoom-in duration-200"
                  >
                    <Users size={14} />
                    Merge Selected
                  </button>
                )}

                <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {allCards.length} Total
                </div>
              </div>
            </div>

            <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto no-scrollbar w-fit">
              {Object.values(CardCategory).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCardCategory(cat)}
                  className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeCardCategory === cat ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {allCards.map(card => {
                const isSelected = selectedCardIds.includes(card.id);
                return (
                  <div 
                    key={card.id} 
                    onClick={() => toggleCardSelection(card.id)}
                    className={`flex flex-col p-6 rounded-3xl border transition-all cursor-pointer ${isSelected ? 'bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/20' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-indigo-500/30'} group hover:shadow-xl hover:shadow-indigo-500/5`}
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700'}`}>
                            {isSelected && <Check size={10} />}
                          </div>
                          <div className="inline-block px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded text-[8px] font-black uppercase tracking-widest">
                            {card.type}
                          </div>
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white truncate max-w-[180px]">{card.name}</h3>
                        <span className="text-[10px] font-mono text-slate-400 block">#{card.id}</span>
                      </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsQuickEdit(!isQuickEdit);
                        }}
                        className={`p-2 rounded-xl transition-all flex items-center gap-1 ${isQuickEdit ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}
                        title="Toggle Edit Mode"
                      >
                        <PenTool size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const tag = `[[#${card.id}]]`;
                          navigator.clipboard.writeText(tag);
                          setCopiedCardId(card.id);
                          setTimeout(() => setCopiedCardId(null), 2000);
                        }}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0"
                        title="Copy Reference Tag"
                      >
                        {copiedCardId === card.id ? <Check size={16} /> : <LinkIcon size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3 flex-1">
                    {Object.entries(card.data).slice(0, 8).map(([key, value]) => {
                      if (typeof value === 'object' || Array.isArray(value) || key === 'id') return null;
                      return (
                        <div key={key} className="flex flex-col gap-1 border-b border-slate-200/50 dark:border-slate-700/30 pb-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter shrink-0">{key}</span>
                          {isQuickEdit ? (
                            <input 
                              type="text"
                              value={String(value || '')}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => onQuickUpdate(card.type, card.id, key, e.target.value)}
                              className="text-[11px] font-mono bg-white dark:bg-slate-900 border-none rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 w-full outline-none"
                            />
                          ) : (
                            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 truncate w-full px-2">
                              {String(value || '-')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/30 flex justify-between items-center opacity-40 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete this ${card.type}?`)) {
                          const mapTypeToKey: Record<string, string> = {
                            'Character': 'characters', 'Location': 'locations', 'Timeline': 'timeline',
                            'Source': 'sources', 'Ledger': 'ledger', 'Artifact': 'artifacts', 'Lore': 'lore'
                          };
                          const projectKey = mapTypeToKey[card.type];
                          if (projectKey && data) {
                            onUpdateProject({ [projectKey]: (data as any)[projectKey].filter((i: any) => i.id !== card.id) });
                          }
                        }
                      }}
                      className="p-1.5 hover:text-red-500 transition-colors"
                      title="Delete Item"
                    >
                      <Trash2 size={14} />
                    </button>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isQuickEdit ? 'Editing Mode' : 'Metadata Object'}</span>
                  </div>
                </div>
              )})}
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg">
              <Shield size={32} />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">ADMIN CONSOLE</h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">System architecture, role management, and master data feed.</p>
            </div>
          </div>
          
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto no-scrollbar">
            {Object.values(AdminTab).map(tab => (
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

      <div className="max-w-6xl mx-auto px-4 pb-12">
        {renderTabContent()}
      </div>

      {isMergeOpen && selectedCards.length === 2 && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[40px] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
            <header className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                  <Users size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Unified Merge</h2>
                  <p className="text-xs text-slate-500 uppercase font-black tracking-widest mt-1">Resolving {selectedCards[0].type} Conflicts</p>
                </div>
              </div>
              <button onClick={() => setIsMergeOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={24} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="grid grid-cols-1 gap-8">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 px-4">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Field</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Option A: {selectedCards[0].name}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Option B: {selectedCards[1].name}</div>
                  </div>

                  {Object.keys({ ...selectedCards[0].data, ...selectedCards[1].data }).map(key => {
                    if (key === 'id') return null;
                    const valA = selectedCards[0].data[key];
                    const valB = selectedCards[1].data[key];
                    const currentVal = mergedData ? mergedData[key] : '';

                    return (
                      <div key={key} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="text-[10px] font-mono text-indigo-500">Conflict Resolution</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <button 
                            onClick={() => setMergedData({...mergedData, [key]: valA})}
                            className={`p-3 rounded-xl border text-left transition-all ${mergedData && mergedData[key] === valA ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                          >
                            <div className="text-[10px] font-black uppercase opacity-50 mb-1">Use A</div>
                            <div className="text-xs truncate">{String(valA || '(Empty)')}</div>
                          </button>
                          <button 
                            onClick={() => setMergedData({...mergedData, [key]: valB})}
                            className={`p-3 rounded-xl border text-left transition-all ${mergedData && mergedData[key] === valB ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                          >
                            <div className="text-[10px] font-black uppercase opacity-50 mb-1">Use B</div>
                            <div className="text-xs truncate">{String(valB || '(Empty)')}</div>
                          </button>
                        </div>

                        <input 
                          type="text"
                          value={String(currentVal || '')}
                          onChange={(e) => setMergedData({...mergedData, [key]: e.target.value})}
                          placeholder="Manual entry..."
                          className="w-full px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <footer className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between shrink-0">
              <p className="text-xs text-slate-500 italic max-w-md">
                <strong>Warning:</strong> Merging will update "{selectedCards[1].name}" and permanently delete "{selectedCards[0].name}".
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsMergeOpen(false)}
                  className="px-6 py-2 text-slate-500 font-bold text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmMerge}
                  className="px-8 py-2 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                >
                  Confirm Merge
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};
