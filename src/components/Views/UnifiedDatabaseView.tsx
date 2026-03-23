import React, { useState, useMemo } from 'react';
import { ProjectData, ViewType, Character, Location, TimelineEvent, Artifact, LoreEntry, Source, Note } from '../../types';
import { 
  Database, Search, Filter, Check, Trash2, Plus, 
  Users, MapPin, Clock, Box, Book, FileText, Archive,
  ArrowUpDown, MoreHorizontal, X, Save, ChevronRight, Sparkles, Maximize2, Edit2
} from 'lucide-react';
import { generateId } from '../../services/storageService';

interface UnifiedDatabaseViewProps {
  data: ProjectData;
  onUpdateProject: (updates: Partial<ProjectData>) => void;
  onQuickUpdate: (type: string, id: string, key: string, value: any) => void;
  onLinkClick?: (type: string, id: string) => void;
  adminTargetId?: string | null;
  onClearAdminTarget?: () => void;
}

enum Category {
  ALL = 'All Entities',
  CHARACTERS = 'Characters',
  LOCATIONS = 'Locations',
  TIMELINE = 'Timeline',
  ARTIFACTS = 'Inventory',
  LORE = 'Lore & Lexicon',
  SOURCES = 'Research Sources',
  LEDGER = 'Ledger Entries'
}

export const UnifiedDatabaseView: React.FC<UnifiedDatabaseViewProps> = ({
  data, onUpdateProject, onQuickUpdate, onLinkClick, adminTargetId, onClearAdminTarget
}) => {
  const [activeCategory, setActiveCategory] = useState<Category>(Category.ALL);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'id' | 'recent'>('name');
  const [isQuickEdit, setIsQuickEdit] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  React.useEffect(() => {
    if (adminTargetId) {
      setSelectedId(adminTargetId);
      setSearchQuery(adminTargetId);
    }
  }, [adminTargetId]);

  const allEntities = useMemo(() => {
    let entities: { id: string; type: string; name: string; data: any; timestamp?: number }[] = [];
    
    data.characters?.forEach(c => entities.push({ id: c.id, type: 'Character', name: c.name || 'Untitled Character', data: c }));
    data.locations?.forEach(l => entities.push({ id: l.id, type: 'Location', name: l.name || 'Untitled Location', data: l }));
    data.timeline?.forEach(e => entities.push({ id: e.id, type: 'Timeline', name: e.title || 'Untitled Event', data: e }));
    data.artifacts?.forEach(a => entities.push({ id: a.id, type: 'Artifact', name: a.name || 'Untitled Artifact', data: a }));
    data.lore?.forEach(l => entities.push({ id: l.id, type: 'Lore', name: l.term || 'Untitled Lore', data: l }));
    data.sources?.forEach(s => entities.push({ id: s.id, type: 'Source', name: s.name || 'Untitled Source', data: s, timestamp: s.timestamp }));
    data.ledger?.forEach(n => entities.push({ id: n.id, type: 'Ledger', name: 'Note', data: n, timestamp: n.timestamp }));

    // Filter by Category
    if (activeCategory !== Category.ALL) {
      entities = entities.filter(e => {
        switch (activeCategory) {
          case Category.CHARACTERS: return e.type === 'Character';
          case Category.LOCATIONS: return e.type === 'Location';
          case Category.TIMELINE: return e.type === 'Timeline';
          case Category.ARTIFACTS: return e.type === 'Artifact';
          case Category.LORE: return e.type === 'Lore';
          case Category.SOURCES: return e.type === 'Source';
          case Category.LEDGER: return e.type === 'Ledger';
          default: return true;
        }
      });
    }

    // Filter by Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      entities = entities.filter(e => 
        (e.name || '').toLowerCase().includes(q) || 
        (e.type || '').toLowerCase().includes(q) ||
        (e.id || '').toLowerCase().includes(q) ||
        (e.data.shortId || '').toLowerCase().includes(q) ||
        (e.data.description && e.data.description.toLowerCase().includes(q)) ||
        (e.data.content && e.data.content.toLowerCase().includes(q))
      );
    }

    // Sort - Added guards for undefined name/id
    entities.sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'type') return (a.type || '').localeCompare(b.type || '');
      if (sortBy === 'id') return (a.id || '').localeCompare(b.id || '');
      if (sortBy === 'recent') return (b.timestamp || 0) - (a.timestamp || 0);
      return 0;
    });

    return entities;
  }, [data, activeCategory, searchQuery, sortBy]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'Character': return <Users size={16} />;
      case 'Location': return <MapPin size={16} />;
      case 'Timeline': return <Clock size={16} />;
      case 'Artifact': return <Box size={16} />;
      case 'Lore': return <Book size={16} />;
      case 'Source': return <FileText size={16} />;
      case 'Ledger': return <Archive size={16} />;
      default: return <Database size={16} />;
    }
  };

  const getColorClass = (type: string) => {
    switch (type) {
      case 'Character': return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'Location': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
      case 'Timeline': return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20';
      case 'Artifact': return 'text-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'Lore': return 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20';
      case 'Source': return 'text-pink-500 bg-pink-50 dark:bg-pink-900/20';
      case 'Ledger': return 'text-slate-500 bg-slate-50 dark:bg-slate-900/20';
      default: return 'text-slate-500 bg-slate-50';
    }
  };

  const handleAddNew = () => {
    let type = activeCategory === Category.ALL ? 'Character' : activeCategory.replace(/s$/, '');
    if (activeCategory === Category.ARTIFACTS) type = 'Artifact';
    if (activeCategory === Category.LORE) type = 'Lore';
    if (activeCategory === Category.SOURCES) type = 'Source';
    if (activeCategory === Category.LEDGER) type = 'Ledger';

    const id = generateId();
    const mapTypeToKey: Record<string, string> = {
      'Character': 'characters', 'Location': 'locations', 'Timeline': 'timeline',
      'Artifact': 'artifacts', 'Lore': 'lore', 'Source': 'sources', 'Ledger': 'ledger'
    };
    const key = mapTypeToKey[type] || 'characters';

    let newItem: any = { id, source: 'manual' };
    if (type === 'Character') newItem = { ...newItem, name: 'New Character', role: 'Supporting', description: '', traits: [] };
    if (type === 'Location') newItem = { ...newItem, name: 'New Location', type: 'Point of Interest', description: '' };
    if (type === 'Timeline') newItem = { ...newItem, title: 'New Event', description: '', date: 'Unknown', charactersInvolved: [] };
    if (type === 'Artifact') newItem = { ...newItem, name: 'New Artifact', type: 'Object', description: '' };
    if (type === 'Lore') newItem = { ...newItem, term: 'New Lore', definition: '', category: 'General' };
    if (type === 'Source') newItem = { ...newItem, name: 'New Source', content: '', type: 'text', timestamp: Date.now() };
    if (type === 'Ledger') newItem = { ...newItem, content: 'New Note', tags: [], timestamp: Date.now() };

    onUpdateProject({ [key]: [newItem, ...(data as any)[key] || []] });
    setSelectedId(id);
  };

  const handleDelete = (type: string, id: string) => {
    if (!confirm(`Delete this ${type}?`)) return;
    const mapTypeToKey: Record<string, string> = {
      'Character': 'characters', 'Location': 'locations', 'Timeline': 'timeline',
      'Artifact': 'artifacts', 'Lore': 'lore', 'Source': 'sources', 'Ledger': 'ledger'
    };
    const key = mapTypeToKey[type];
    if (key) {
      onUpdateProject({ [key]: (data as any)[key].filter((i: any) => i.id !== id) });
      if (selectedId === id) setSelectedId(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
              <Database size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Narrative Ledger</h1>
              <p className="text-xs text-slate-500 uppercase font-black tracking-widest">Master Database Explorer</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search database..."
                className="w-full lg:w-64 pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <select 
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 outline-none"
            >
              <option value="name">Sort: A-Z</option>
              <option value="type">Sort: Type</option>
              <option value="recent">Sort: Recent</option>
              <option value="id">Sort: ID</option>
            </select>

            <button 
              onClick={handleAddNew}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
            >
              <Plus size={16} /> Add New
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 overflow-y-auto no-scrollbar">
          <div className="space-y-1">
            {Object.values(Category).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeCategory === cat ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={activeCategory === cat ? 'text-indigo-500' : 'text-slate-400'}>
                    {cat === Category.ALL && <Archive size={16} />}
                    {cat === Category.CHARACTERS && <Users size={16} />}
                    {cat === Category.LOCATIONS && <MapPin size={16} />}
                    {cat === Category.TIMELINE && <Clock size={16} />}
                    {cat === Category.ARTIFACTS && <Box size={16} />}
                    {cat === Category.LORE && <Book size={16} />}
                    {cat === Category.SOURCES && <FileText size={16} />}
                    {cat === Category.LEDGER && <Archive size={16} />}
                  </div>
                  {cat}
                </div>
                {activeCategory === cat && <ChevronRight size={14} />}
              </button>
            ))}
          </div>
        </aside>

        {/* Main List */}
        <div className="flex-1 min-w-0 overflow-y-auto p-4 lg:p-8 space-y-4 custom-scrollbar bg-slate-50 dark:bg-slate-950">
          <div className="max-w-5xl mx-auto space-y-4 pb-20">
            {allEntities.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <Database size={48} className="mx-auto text-slate-200 dark:text-slate-800" />
                <p className="text-slate-400 font-serif italic text-lg">No entities found in this sector.</p>
              </div>
            ) : (
              allEntities.map(entity => (
                <div 
                  key={entity.id}
                  onClick={() => setSelectedId(entity.id === selectedId ? null : entity.id)}
                  className={`group relative bg-white dark:bg-slate-900 border transition-all duration-300 rounded-[2rem] overflow-hidden cursor-pointer ${selectedId === entity.id ? 'border-indigo-500 shadow-2xl ring-4 ring-indigo-500/5' : 'border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 shadow-sm'}`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${getColorClass(entity.type)}`}>
                          {getIcon(entity.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{entity.type}</span>
                            <span className="text-[10px] font-mono text-slate-300">#{entity.id.slice(0, 8)}</span>
                          </div>
                          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{entity.name}</h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedId(entity.id === selectedId ? null : entity.id); }}
                          className={`p-2 rounded-xl transition-all ${selectedId === entity.id ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}
                          title="Edit Entity"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(entity.type, entity.id); }}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.entries(entity.data).map(([key, value]) => {
                        if (key === 'id' || key === 'source' || key === 'timestamp' || key === 'images' || key === 'referenceUrls' || key === 'portraitStyle' || key === 'uei' || key === 'ueiRange') return null;
                        if (typeof value === 'object' && !Array.isArray(value)) return null;
                        
                        const isLong = String(value).length > 60 || key === 'description' || key === 'definition' || key === 'content' || key === 'summary' || key === 'history';
                        
                        return (
                          <div key={key} className={`space-y-1.5 ${isLong ? 'md:col-span-2 lg:col-span-3' : ''}`}>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter block ml-1">{key.replace(/([A-Z])/g, ' $1')}</label>
                            {isQuickEdit ? (
                              Array.isArray(value) ? (
                                <div className="flex flex-wrap gap-1.5 p-1">
                                  {value.map((v, i) => (
                                    <span key={i} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                                      {String(v)}
                                    </span>
                                  ))}
                                  {value.length === 0 && <span className="text-[10px] text-slate-400 italic">None</span>}
                                </div>
                              ) : isLong ? (
                                <textarea 
                                  value={String(value || '')}
                                  onClick={e => e.stopPropagation()}
                                  onChange={e => onQuickUpdate(entity.type, entity.id, key, e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-xs font-serif leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24"
                                />
                              ) : (
                                <input 
                                  type="text"
                                  value={String(value || '')}
                                  onClick={e => e.stopPropagation()}
                                  onChange={e => onQuickUpdate(entity.type, entity.id, key, e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                              )
                            ) : (
                              <div className="text-xs text-slate-700 dark:text-slate-300 px-1 truncate">
                                {String(value || '-')}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Subtle Footer */}
                  <div className="px-6 py-3 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{entity.type} OBJECT</span>
                    </div>
                    {entity.data.source === 'ai' && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-full text-[8px] font-black uppercase tracking-widest">
                        <Sparkles size={8} /> AI Generated
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
