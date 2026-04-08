import React, { useState, useMemo } from 'react';
import { ProjectData, Character, Location, TimelineEvent, Artifact, LoreEntry, Source, Note } from '../../types';
import { 
  Database, Search, Filter, Check, Trash2, Plus, 
  Users, MapPin, Clock, Box, Book, FileText, Archive,
  ArrowUpDown, MoreHorizontal, X, Save, ChevronRight, Sparkles, Maximize2, Edit2, Globe, Shield, Ruler, Info, Link as LinkIcon, FileCode, Network, Zap
} from 'lucide-react';
import { generateId } from '../../services/storageService';
import { parseDateToUEI } from '../../utils/calendarUtils';
import Fuse from 'fuse.js';

interface UnifiedDatabaseViewProps {
  data: ProjectData;
  onUpdateProject: (updates: Partial<ProjectData>) => void;
  onDeleteNote?: (id: string) => Promise<void>;
  onQuickUpdate: (type: string, id: string, key: string, value: any) => void;
  onLinkClick?: (type: string, id: string) => void;
  adminTargetId?: string | null;
  onClearAdminTarget?: () => void;
  hideHeader?: boolean;
}

interface Field {
  key: string;
  label: string;
  type: string;
  group: string;
  readonly?: boolean;
}

enum Category {
  ALL = 'All Entities',
  CHARACTERS = 'Characters',
  RELATIONSHIPS = 'Bonds & Ties',
  LOCATIONS = 'Locations',
  TIMELINE = 'Timeline',
  ARTIFACTS = 'Inventory',
  LORE = 'Lore & Lexicon',
  SOURCES = 'Research Sources'
}

// ==========================================
// CATEGORY-SPECIFIC SCHEMAS (Standardized)
// ==========================================

const CHARACTER_FIELDS: Field[] = [
  { key: 'name', label: 'Full Name', type: 'text', group: 'Identity' },
  { key: 'givenName', label: 'Given Name', type: 'text', group: 'Schema.org/Person' },
  { key: 'familyName', label: 'Family Name', type: 'text', group: 'Schema.org/Person' },
  { key: 'honorificPrefix', label: 'Prefix (Dr/Sir)', type: 'text', group: 'Schema.org/Person' },
  { key: 'jobTitle', label: 'Job Title', type: 'text', group: 'Schema.org/Person' },
  { key: 'gender', label: 'Gender', type: 'text', group: 'Schema.org/Person' },
  { key: 'birthDate', label: 'Birth Date (ISO)', type: 'text', group: 'Schema.org/Person' },
  { key: 'birthPlace', label: 'Birth Place', type: 'text', group: 'Schema.org/Person' },
  { key: 'homeLocation', label: 'Home Location', type: 'text', group: 'Schema.org/Person' },
  { key: 'nationality', label: 'Nationality', type: 'text', group: 'Schema.org/Person' },
  { key: 'affiliation', label: 'Affiliation', type: 'text', group: 'Schema.org/Person' },
  { key: 'description', label: 'Biography', type: 'long', group: 'Content' },
  { key: 'traits', label: 'Traits (csv)', type: 'text', group: 'Narrative' },
];

const LOCATION_FIELDS: Field[] = [
  { key: 'name', label: 'Place Name', type: 'text', group: 'Identity' },
  { key: 'type', label: 'Place Type', type: 'text', group: 'GeoJSON/Place' },
  { key: 'icon', label: 'Marker Icon', type: 'text', group: 'GeoJSON/Place' },
  { key: 'latitude', label: 'Latitude', type: 'number', group: 'GeoJSON/Place' },
  { key: 'longitude', label: 'Longitude', type: 'number', group: 'GeoJSON/Place' },
  { key: 'address', label: 'Address/Region', type: 'text', group: 'GeoJSON/Place' },
  { key: 'containedInPlace', label: 'Parent ID', type: 'text', group: 'GeoJSON/Place' },
  { key: 'x', label: 'Local X', type: 'number', group: 'Spatial' },
  { key: 'y', label: 'Local Y', type: 'number', group: 'Spatial' },
  { key: 'mapId', label: 'Map Layer ID', type: 'text', group: 'Spatial' },
  { key: 'description', label: 'Description', type: 'long', group: 'Content' },
];

const TIMELINE_FIELDS: Field[] = [
  { key: 'title', label: 'Event Title', type: 'text', group: 'Identity' },
  { key: 'startDate', label: 'Start Date (ISO)', type: 'text', group: 'Schema.org/Event' },
  { key: 'endDate', label: 'End Date (ISO)', type: 'text', group: 'Schema.org/Event' },
  { key: 'eventStatus', label: 'Status', type: 'text', group: 'Schema.org/Event' },
  { key: 'location', label: 'Location Name', type: 'text', group: 'Schema.org/Event' },
  { key: 'attendees', label: 'Attendees (IDs)', type: 'text', group: 'Schema.org/Event' },
  { key: 'duration', label: 'Duration (ISO)', type: 'text', group: 'Schema.org/Event' },
  { key: 'uei', label: 'Chronological Index', type: 'number', group: 'Temporal' },
  { key: 'description', label: 'Event Summary', type: 'long', group: 'Content' },
];

const LORE_FIELDS: Field[] = [
  { key: 'term', label: 'Preferred Label', type: 'text', group: 'Identity' },
  { key: 'prefLabel', label: 'SKOS PrefLabel', type: 'text', group: 'Knowledge (SKOS)' },
  { key: 'altLabel', label: 'Alt Labels (csv)', type: 'text', group: 'Knowledge (SKOS)' },
  { key: 'broader', label: 'Broader (Parent IDs)', type: 'text', group: 'Knowledge (SKOS)' },
  { key: 'narrower', label: 'Narrower (Child IDs)', type: 'text', group: 'Knowledge (SKOS)' },
  { key: 'related', label: 'Related (IDs)', type: 'text', group: 'Knowledge (SKOS)' },
  { key: 'scopeNote', label: 'Scope Note', type: 'text', group: 'Knowledge (SKOS)' },
  { key: 'category', label: 'Category', type: 'text', group: 'Identity' },
  { key: 'definition', label: 'Formal Definition', type: 'long', group: 'Content' },
];

const SOURCE_FIELDS: Field[] = [
  { key: 'name', label: 'Source Title', type: 'text', group: 'Identity' },
  { key: 'dc_creator', label: 'Creator/Author', type: 'text', group: 'Dublin Core' },
  { key: 'dc_publisher', label: 'Publisher', type: 'text', group: 'Dublin Core' },
  { key: 'dc_date', label: 'Date', type: 'text', group: 'Dublin Core' },
  { key: 'dc_identifier', label: 'Identifier/URL', type: 'text', group: 'Dublin Core' },
  { key: 'dc_language', label: 'Language', type: 'text', group: 'Dublin Core' },
  { key: 'bibtex_type', label: 'BibTeX Type', type: 'text', group: 'BibTeX' },
  { key: 'bibtex_journal', label: 'Journal', type: 'text', group: 'BibTeX' },
  { key: 'bibtex_volume', label: 'Volume', type: 'text', group: 'BibTeX' },
  { key: 'bibtex_isbn', label: 'ISBN/ISSN', type: 'text', group: 'BibTeX' },
  { key: 'url', label: 'Original URL', type: 'text', group: 'System' },
  { key: 'content', label: 'Extracted Content', type: 'long', group: 'Content' },
];

const RELATIONSHIP_FIELDS: Field[] = [
  { key: 'type', label: 'Relationship Label', type: 'text', group: 'Identity' },
  { key: 'sourceId', label: 'Source (ID)', type: 'text', group: 'Identity' },
  { key: 'targetId', label: 'Target (ID)', type: 'text', group: 'Identity' },
  { key: 'predicate', label: 'RDF Predicate (URI)', type: 'text', group: 'Graph (RDF)' },
  { key: 'weight', label: 'Weight (0-1)', type: 'number', group: 'Graph (JGF)' },
  { key: 'directed', label: 'Directed Edge', type: 'text', group: 'Graph (JGF)' },
  { key: 'description', label: 'Description', type: 'long', group: 'Content' },
];

const UNIVERSAL_FIELDS: Field[] = [
  { key: 'name', label: 'Primary Name', type: 'text', group: 'Identity' },
  { key: 'type', label: 'Classification', type: 'text', group: 'Identity' },
  { key: 'description', label: 'Core Description', type: 'long', group: 'Content' },
  { key: 'source', label: 'Data Source', type: 'text', group: 'System' },
  { key: 'id', label: 'System GUID', type: 'text', group: 'System', readonly: true }
];

export const UnifiedDatabaseView: React.FC<UnifiedDatabaseViewProps> = ({
  data, onUpdateProject, onDeleteNote, onQuickUpdate, onLinkClick, adminTargetId, onClearAdminTarget, hideHeader = false
}) => {
  const [activeCategory, setActiveCategory] = useState<Category>(Category.ALL);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'id' | 'recent' | 'date'>('name');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const getActiveFields = (type: string) => {
    switch (type) {
      case 'Character': return CHARACTER_FIELDS;
      case 'Location': return LOCATION_FIELDS;
      case 'Timeline': return TIMELINE_FIELDS;
      case 'Lore': return LORE_FIELDS;
      case 'Source': return SOURCE_FIELDS;
      case 'Relationship': return RELATIONSHIP_FIELDS;
      default: return UNIVERSAL_FIELDS;
    }
  };

  React.useEffect(() => {
    if (adminTargetId) {
      setSelectedId(adminTargetId);
      setSearchQuery(adminTargetId);
    }
  }, [adminTargetId]);

  const allEntities = useMemo(() => {
    let entities: { id: string; type: string; name: string; data: any; timestamp?: number }[] = [];
    
    data.characters?.forEach(c => entities.push({ id: c.id, type: 'Character', name: c.name || 'Untitled Character', data: c }));
    data.relationships?.forEach(r => entities.push({ id: r.id, type: 'Relationship', name: `${r.type}`, data: r }));
    data.locations?.forEach(l => entities.push({ id: l.id, type: 'Location', name: l.name || 'Untitled Location', data: l }));
    data.timeline?.forEach(e => entities.push({ id: e.id, type: 'Timeline', name: e.title || 'Untitled Event', data: e }));
    data.artifacts?.forEach(a => entities.push({ id: a.id, type: 'Artifact', name: a.name || 'Untitled Artifact', data: a }));
    data.lore?.forEach(l => entities.push({ id: l.id, type: 'Lore', name: l.term || 'Untitled Lore', data: l }));
    data.sources?.forEach(s => entities.push({ id: s.id, type: 'Source', name: s.name || 'Untitled Source', data: s, timestamp: s.timestamp }));

    if (activeCategory !== Category.ALL) {
      entities = entities.filter(e => {
        switch (activeCategory) {
          case Category.CHARACTERS: return e.type === 'Character';
          case Category.RELATIONSHIPS: return e.type === 'Relationship';
          case Category.LOCATIONS: return e.type === 'Location';
          case Category.TIMELINE: return e.type === 'Timeline';
          case Category.ARTIFACTS: return e.type === 'Artifact';
          case Category.LORE: return e.type === 'Lore';
          case Category.SOURCES: return e.type === 'Source';
          default: return true;
        }
      });
    }

    if (searchQuery.trim()) {
      const fuse = new Fuse(entities, {
        keys: [
          'name',
          'type',
          'id',
          'data.description',
          'data.term',
          'data.title',
          'data.content',
          'data.shortId'
        ],
        threshold: 0.3,
        distance: 100
      });
      return fuse.search(searchQuery).map(result => result.item);
    }

    entities.sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'type') return (a.type || '').localeCompare(b.type || '');
      if (sortBy === 'id') return (a.id || '').localeCompare(b.id || '');
      if (sortBy === 'recent') return (b.timestamp || 0) - (a.timestamp || 0);
      if (sortBy === 'date') {
        const calendar = data.calendars?.[0] || { id: 'default', name: 'Standard', months: [{ id: '1', name: 'January', days: 30 }], eras: [] };
        const ueiA = a.data.uei !== undefined ? a.data.uei : (parseDateToUEI(calendar as any, a.data.startDate || a.data.date) ?? -1);
        const ueiB = b.data.uei !== undefined ? b.data.uei : (parseDateToUEI(calendar as any, b.data.startDate || b.data.date) ?? -1);
        return ueiA - ueiB;
      }
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
      case 'Relationship': return <Network size={16} />;
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
      case 'Relationship': return 'text-violet-500 bg-violet-50 dark:bg-violet-900/20';
      default: return 'text-slate-500 bg-slate-50';
    }
  };

  const handleAddNew = () => {
    let type = activeCategory === Category.ALL ? 'Character' : activeCategory.replace(/s$/, '');
    if (activeCategory === Category.RELATIONSHIPS) type = 'Relationship';
    if (activeCategory === Category.ARTIFACTS) type = 'Artifact';
    if (activeCategory === Category.LORE) type = 'Lore';
    if (activeCategory === Category.SOURCES) type = 'Source';

    const id = generateId();
    const mapTypeToKey: Record<string, string> = {
      'Character': 'characters', 'Relationship': 'relationships', 'Location': 'locations', 'Timeline': 'timeline',
      'Artifact': 'artifacts', 'Lore': 'lore', 'Source': 'sources'
    };
    const key = mapTypeToKey[type] || 'characters';

    let newItem: any = { id, source: 'manual', shortId: Math.random().toString(36).substring(2, 10) };
    if (type === 'Character') newItem = { ...newItem, name: 'New Character', role: 'Supporting' };
    if (type === 'Relationship') newItem = { ...newItem, sourceId: '', targetId: '', type: 'Connection' };
    if (type === 'Location') newItem = { ...newItem, name: 'New Location', type: 'Point of Interest' };
    if (type === 'Timeline') newItem = { ...newItem, title: 'New Event', description: '', date: 'Unknown' };
    if (type === 'Artifact') newItem = { ...newItem, name: 'New Artifact', type: 'Object' };
    if (type === 'Lore') newItem = { ...newItem, term: 'New Lore', definition: '', category: 'General' };
    if (type === 'Source') newItem = { ...newItem, name: 'New Source', content: '', type: 'text', timestamp: Date.now() };

    onUpdateProject({ [key]: [newItem, ...(data as any)[key] || []] });
    setSelectedId(id);
  };

  const handleDelete = (type: string, id: string) => {
    if (!confirm(`Delete this ${type}?`)) return;

    const mapTypeToKey: Record<string, string> = {
      'Character': 'characters', 'Location': 'locations', 'Timeline': 'timeline',
      'Artifact': 'artifacts', 'Lore': 'lore', 'Source': 'sources', 'Relationship': 'relationships'
    };
    const key = mapTypeToKey[type];
    if (key) {
      onUpdateProject({ [key]: (data as any)[key].filter((i: any) => i.id !== id) });
      if (selectedId === id) setSelectedId(null);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {!hideHeader && (
        <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><Database size={24} /></div>
              <div><h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Entity Explorer</h1><p className="text-xs text-slate-500 uppercase font-black tracking-widest">Universal Database Explorer</p></div>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:flex-none"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search database..." className="w-full lg:w-64 pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 outline-none"><option value="name">Sort: A-Z</option><option value="type">Sort: Type</option><option value="recent">Sort: Recent</option><option value="date">Sort: Date</option><option value="id">Sort: ID</option></select>
              <button onClick={handleAddNew} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"><Plus size={16} /> Add New</button>
            </div>
          </div>
        </header>
      )}

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 overflow-y-auto no-scrollbar">
          {hideHeader && (
            <div className="mb-6 space-y-3">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-[10px] font-black uppercase text-slate-500 outline-none"><option value="name">Sort: A-Z</option><option value="type">Sort: Type</option><option value="recent">Sort: Recent</option><option value="date">Sort: Date</option><option value="id">Sort: ID</option></select>
              <button onClick={handleAddNew} className="w-full py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"><Plus size={14} /> Add New</button>
              <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2" />
            </div>
          )}
          <div className="space-y-1">
            {Object.values(Category).map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeCategory === cat ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><div className="flex items-center gap-3"><div className={activeCategory === cat ? 'text-indigo-500' : 'text-slate-400'}>{cat === Category.ALL && <Archive size={16} />}{cat === Category.CHARACTERS && <Users size={16} />}{cat === Category.RELATIONSHIPS && <LinkIcon size={16} />}{cat === Category.LOCATIONS && <MapPin size={16} />}{cat === Category.TIMELINE && <Clock size={16} />}{cat === Category.ARTIFACTS && <Box size={16} />}{cat === Category.LORE && <Book size={16} />}{cat === Category.SOURCES && <FileText size={16} />}</div>{cat}</div>{activeCategory === cat && <ChevronRight size={14} />}</button>
            ))}
          </div>
        </aside>

        <div className="flex-1 min-w-0 overflow-y-auto p-4 lg:p-8 space-y-4 custom-scrollbar">
          <div className="space-y-4 pb-20">
            {allEntities.length === 0 ? (
              <div className="py-20 text-center space-y-4"><Database size={48} className="mx-auto text-slate-200 dark:text-slate-800" /><p className="text-slate-400 font-serif italic text-lg">No entities found.</p></div>
            ) : (
              allEntities.map(entity => (
                <div key={entity.id} onClick={() => setSelectedId(entity.id === selectedId ? null : entity.id)} className={`group relative bg-white dark:bg-slate-900 border transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer ${selectedId === entity.id ? 'border-indigo-500 shadow-2xl ring-4 ring-indigo-500/5' : 'border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 shadow-sm'}`}>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${getColorClass(entity.type)}`}>{getIcon(entity.type)}</div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{entity.type}</span><span className="text-[10px] font-mono text-slate-300">#{entity.id.slice(0, 8)}</span></div>
                          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{entity.name}</h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        {entity.type === 'Character' && (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation();
                              const person = {
                                "@context": "https://schema.org",
                                "@type": "Person",
                                "name": entity.data.name,
                                "givenName": entity.data.givenName,
                                "familyName": entity.data.familyName,
                                "additionalName": entity.data.nickname,
                                "honorificPrefix": entity.data.honorificPrefix,
                                "honorificSuffix": entity.data.honorificSuffix,
                                "jobTitle": entity.data.jobTitle || entity.data.job,
                                "birthDate": entity.data.birthDate,
                                "deathDate": entity.data.deathDate,
                                "birthPlace": entity.data.birthPlace || entity.data.birthplace,
                                "homeLocation": entity.data.homeLocation || entity.data.residence,
                                "gender": entity.data.gender,
                                "nationality": entity.data.nationality,
                                "affiliation": entity.data.affiliation,
                                "description": entity.data.description
                              };
                              navigator.clipboard.writeText(JSON.stringify(person, null, 2));
                              alert('JSON-LD copied to clipboard!');
                            }} 
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all" 
                            title="Copy Schema.org JSON-LD"
                          >
                            <FileCode size={18} />
                          </button>
                        )}
                        {entity.type === 'Timeline' && (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation();
                              const event = {
                                "@context": "https://schema.org",
                                "@type": "Event",
                                "name": entity.data.title || entity.name,
                                "startDate": entity.data.startDate || entity.data.date,
                                "endDate": entity.data.endDate,
                                "eventStatus": entity.data.eventStatus,
                                "location": {
                                  "@type": "Place",
                                  "name": entity.data.location
                                },
                                "description": entity.data.description,
                                "attendee": (entity.data.attendees || entity.data.charactersInvolved || []).map((name: string) => ({
                                  "@type": "Person",
                                  "name": name
                                }))
                              };
                              navigator.clipboard.writeText(JSON.stringify(event, null, 2));
                              alert('JSON-LD copied to clipboard!');
                            }} 
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all" 
                            title="Copy Schema.org JSON-LD"
                          >
                            <FileCode size={18} />
                          </button>
                        )}
                        {entity.type === 'Lore' && (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation();
                              const concept = {
                                "@context": "http://www.w3.org/2004/02/skos/core#",
                                "@type": "Concept",
                                "prefLabel": entity.data.prefLabel || entity.data.term || entity.name,
                                "altLabel": Array.isArray(entity.data.altLabel) ? entity.data.altLabel : (entity.data.altLabel?.split(',').map((s:string) => s.trim()) || []),
                                "definition": entity.data.definition || entity.data.description,
                                "scopeNote": entity.data.scopeNote,
                                "broader": (Array.isArray(entity.data.broader) ? entity.data.broader : (entity.data.broader?.split(',').map((s:string) => s.trim()) || [])).map((id:string) => ({ "@id": id })),
                                "narrower": (Array.isArray(entity.data.narrower) ? entity.data.narrower : (entity.data.narrower?.split(',').map((s:string) => s.trim()) || [])).map((id:string) => ({ "@id": id })),
                                "related": (Array.isArray(entity.data.related) ? entity.data.related : (entity.data.related?.split(',').map((s:string) => s.trim()) || [])).map((id:string) => ({ "@id": id }))
                              };
                              navigator.clipboard.writeText(JSON.stringify(concept, null, 2));
                              alert('SKOS JSON-LD copied to clipboard!');
                            }} 
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all" 
                            title="Copy SKOS Concept JSON-LD"
                          >
                            <FileCode size={18} />
                          </button>
                        )}
                        {entity.type === 'Source' && (
                          <div className="flex gap-1">
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation();
                                const author = entity.data.author || entity.data.dc_creator || 'Unknown';
                                const year = entity.data.publicationYear || entity.data.bibtex_year || new Date(entity.data.timestamp).getFullYear();
                                const key = entity.data.bibtex_key || `${author.split(' ')[0].toLowerCase()}${year}`;
                                const bibtex = `@${entity.data.bibtex_type || 'misc'}{${key},\n  title = {${entity.data.name}},\n  author = {${author}},\n  year = {${year}},\n  url = {${entity.data.url || ''}}\n}`;
                                navigator.clipboard.writeText(bibtex);
                                alert('BibTeX copied to clipboard!');
                              }} 
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all" 
                              title="Copy BibTeX"
                            >
                              <FileCode size={18} />
                            </button>
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation();
                                const dc = `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n  <dc:title>${entity.data.name}</dc:title>\n  <dc:creator>${entity.data.author || entity.data.dc_creator || ''}</dc:creator>\n  <dc:type>${entity.data.type || entity.data.dc_type || ''}</dc:type>\n  <dc:identifier>${entity.data.url || ''}</dc:identifier>\n</metadata>`;
                                navigator.clipboard.writeText(dc);
                                alert('Dublin Core XML copied to clipboard!');
                              }} 
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-all" 
                              title="Copy Dublin Core XML"
                            >
                              <Archive size={18} />
                            </button>
                          </div>
                        )}
                        {entity.type === 'Relationship' && (
                          <div className="flex gap-1">
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation();
                                const edge = {
                                  "source": entity.data.sourceId,
                                  "target": entity.data.targetId,
                                  "relation": entity.data.predicate || entity.data.type,
                                  "label": entity.data.type,
                                  "directed": entity.data.directed !== 'false',
                                  "metadata": {
                                    "id": entity.id,
                                    "weight": entity.data.weight,
                                    "description": entity.data.description
                                  }
                                };
                                navigator.clipboard.writeText(JSON.stringify(edge, null, 2));
                                alert('JGF Edge JSON copied to clipboard!');
                              }} 
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all" 
                              title="Copy JGF Edge JSON"
                            >
                              <Network size={18} />
                            </button>
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation();
                                const subject = `<ph:entity/${entity.data.sourceId}>`;
                                const predicate = `<ph:predicate/${(entity.data.predicate || entity.data.type).toLowerCase().replace(/\s+/g, '_')}>`;
                                const object = `<ph:entity/${entity.data.targetId}>`;
                                const triple = `${subject} ${predicate} ${object} .`;
                                navigator.clipboard.writeText(triple);
                                alert('RDF Triple copied to clipboard!');
                              }} 
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-xl transition-all" 
                              title="Copy RDF Triple (N-Triples)"
                            >
                              <Zap size={18} />
                            </button>
                          </div>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setSelectedId(entity.id === selectedId ? null : entity.id); }} className={`p-2 rounded-xl transition-all ${selectedId === entity.id ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`} title="Edit Entity"><Edit2 size={18} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(entity.type, entity.id); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors" title="Delete"><Trash2 size={18} /></button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {getActiveFields(entity.type).map(field => {
                        const value = entity.data[field.key] || (field.key === 'name' ? entity.name : '');
                        const isLong = field.type === 'long';
                        return (
                          <div key={field.key} className={`space-y-1.5 ${isLong ? 'md:col-span-2 lg:col-span-3' : ''}`}>
                            <div className="flex items-center justify-between px-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{field.label}</label>
                              <span className="text-[8px] font-mono text-slate-300 uppercase">{field.group}</span>
                            </div>
                            {isLong ? (
                              <textarea value={String(value || '')} onClick={e => e.stopPropagation()} onChange={e => onQuickUpdate(entity.type, entity.id, field.key, e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-xs font-serif leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24" />
                            ) : (
                              <input type={field.type === 'number' ? 'number' : 'text'} value={String(value || '')} disabled={field.readonly} onClick={e => e.stopPropagation()} onChange={e => onQuickUpdate(entity.type, entity.id, field.key, e.target.value)} className={`w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none ${field.readonly ? 'opacity-50' : ''}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="px-6 py-3 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{entity.type} OBJECT</span></div>{entity.data.source === 'ai' && (<div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-full text-[8px] font-black uppercase tracking-widest"><Sparkles size={8} /> AI Generated</div>)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
