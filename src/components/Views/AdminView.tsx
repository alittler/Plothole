import React, { useState, useMemo } from 'react';
import { ProjectData, AppPrompts, ToolboxLink, ProjectMetadata, Note, AppSettings, ViewType } from '../../types';
import { 
  Shield, Sparkles, Save, Database, Trash2, Clock, Tag, 
  Type, Users, Layout, Search, Filter, Hash, Archive,
  History, UserPlus, Mail, Link as LinkIcon, Check,
  ChevronRight, Maximize2, PenTool, X, Map
} from 'lucide-react';

enum AdminTab {
  SYSTEM = 'System',
  USERS = 'Users',
  CARDS = 'Master Card Feed'
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
  onOpenBlueprint: (type: string, id: string, data: any) => void;
  onQuickUpdate: (type: string, id: string, key: string, value: any) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  data, globalNotes, appPrompts, appSettings, onSaveSettings, onSavePrompts, projectsMetadata, onUpdateProject, onDeleteGlobalNote, onLinkClick, onChangeView, onOpenBlueprint, onQuickUpdate
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(AdminTab.SYSTEM);
  const [prompts, setPrompts] = useState(appPrompts);
  const [settings, setSettings] = useState(appSettings);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);
  
  // Master Card Feed States
  const [cardSearch, setCardSearch] = useState('');
  const [cardSort, setCardSort] = useState<'name' | 'type' | 'id'>('name');
  const [isQuickEdit, setIsQuickEdit] = useState(false);

  // Blueprint Editor States
  const [previewPromptKey, setPreviewPromptKey] = useState<string | null>(null);

  const compilePrompt = (template: string, itemData?: any) => {
    if (!data) return template;
    
    const charList = data.characters?.map(c => `- ${c.name} (${c.role}): ${c.description}`).join('\n') || 'No characters defined.';
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
      .replace(/{user_context}/g, 'Lead Architect')
      .replace(/{tasks}/g, 'No active tasks.');

    // Item-level resolution if context provided
    if (itemData) {
      compiled = compiled
        .replace(/{name}/g, itemData.name || itemData.title || itemData.term || 'Untitled')
        .replace(/{type}/g, itemData.type || 'Object')
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
  }, [data, cardSearch, cardSort]);

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
            {/* Blank Variable Card */}
            <section className="bg-slate-900 rounded-3xl p-8 shadow-2xl border-4 border-dashed border-slate-800 space-y-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Sparkles size={240} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl">
                      <Hash size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight">The Architect's Blueprint</h2>
                      <p className="text-xs text-slate-400 uppercase font-black tracking-widest mt-1">Prompt Variable Reference</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
                  {[
                    { title: "Project Title", var: "{title}" },
                    { title: "Author Name", var: "{author}" },
                    { title: "Full Summary", var: "{summary}" },
                    { title: "Character List", var: "{characters}" },
                    { title: "World Locations", var: "{locations}" },
                    { title: "Timeline Events", var: "{timeline}" },
                    { title: "Project Ledger", var: "{ledger}" },
                    { title: "Lore & Mythos", var: "{lore}" },
                    { title: "Core Themes", var: "{themes}" },
                    { title: "User Context", var: "{user_context}" },
                    { title: "Active Tasks", var: "{tasks}" },
                    { title: "Item Name", var: "{name}" },
                    { title: "Item Type", var: "{type}" },
                    { title: "Coordinate X", var: "{x}" },
                    { title: "Coordinate Y", var: "{y}" },
                    { title: "Item Data", var: "{description}" }
                  ].map(v => (
                    <div key={v.var} className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 flex flex-col gap-1 hover:bg-slate-800 transition-colors group/var">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{v.title}</span>
                        <ChevronRight size={10} className="text-slate-600 group-hover/var:text-indigo-400 transition-colors" />
                      </div>
                      <code className="text-indigo-400 font-mono text-xs">{v.var}</code>
                    </div>
                  ))}
                </div>

                {/* Prompt Preview Sub-Section */}
                <div className="bg-slate-950/50 rounded-3xl p-6 border border-slate-800 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400">
                        <Maximize2 size={16} />
                      </div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-tight">Live Prompt Compiler</h3>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <select 
                        value={previewPromptKey || ''} 
                        onChange={(e) => setPreviewPromptKey(e.target.value)}
                        className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="">Select a prompt to preview...</option>
                        {Object.keys(prompts).filter(k => k !== 'AI_MODEL').map(key => (
                          <option key={key} value={key}>{key.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {previewPromptKey ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="p-6 bg-slate-900/80 rounded-2xl border border-slate-800 font-serif text-slate-300 text-sm leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto custom-scrollbar">
                        {compilePrompt(prompts[previewPromptKey as keyof AppPrompts])}
                      </div>
                      <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Compiled Output</span>
                        <span className="text-[10px] text-slate-500 font-mono">Variables Injected: { (prompts[previewPromptKey as keyof AppPrompts].match(/{.*?}/g) || []).length }</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                      <p className="text-xs text-slate-500 italic font-serif">Select a system prompt above to see how your project data resolves into the blueprint.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

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
              </div>
            </section>
          </div>
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
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Master Card Feed</h2>
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

                <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {allCards.length} Total
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {allCards.map(card => (
                <div key={card.id} className="flex flex-col p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 group hover:border-indigo-500/30 transition-all hover:shadow-xl hover:shadow-indigo-500/5">
                  <div className="flex items-start justify-between mb-6">
                    <div className="space-y-1">
                      <div className="inline-block px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded text-[8px] font-black uppercase tracking-widest">
                        {card.type}
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white truncate max-w-[180px]">{card.name}</h3>
                      <span className="text-[10px] font-mono text-slate-400 block">#{card.id}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => onOpenBlueprint(card.type, card.id, card.data)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all flex items-center gap-1"
                        title="Open Blueprint Editor"
                      >
                        <PenTool size={16} />
                      </button>
                      <button 
                        onClick={() => {
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
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isQuickEdit ? 'Editing Mode' : 'Metadata Object'}</span>
                  </div>
                </div>
              ))}
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
    </div>
  );
};
