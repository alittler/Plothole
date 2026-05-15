import React, { useState, useMemo } from 'react';
import { ProjectData, HierarchicalEntity, LoreEntry } from '../../types';
import { Book, Search, Filter, Layers, Users, Map, Scroll, FileText, ChevronRight, Bookmark } from 'lucide-react';
import { WikiText } from '../ui/WikiText';
import { ViewHeader } from '../Layout/ViewHeader';

interface EncyclopediaViewProps {
  projectData: ProjectData;
  onLinkClick: (type: string, id: string) => void;
}

export const EncyclopediaView: React.FC<EncyclopediaViewProps> = ({ projectData, onLinkClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Lore' | 'Characters' | 'Locations' | 'Entities'>('All');

  const lore = projectData.lore || [];
  const entities = projectData.entities || [];
  const characters = projectData.characters || [];
  const locations = projectData.locations || [];

  const allEntries = useMemo(() => {
    const entries: any[] = [
      ...lore.map(l => ({ ...l, type: 'Lore', title: l.term, content: l.definition })),
      ...entities.map(e => ({ ...e, type: e.type || 'Entity', title: e.name, content: e.description })),
      ...characters.map(c => ({ ...c, type: 'Character', title: c.name, content: c.description })),
      ...locations.map(l => ({ ...l, type: 'Location', title: l.name, content: l.description }))
    ];
    return entries.sort((a, b) => a.title.localeCompare(b.title));
  }, [lore, entities, characters, locations]);

  const filteredEntries = useMemo(() => {
    return allEntries.filter(entry => {
      const matchesSearch = 
        entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.content?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = 
        activeFilter === 'All' || 
        (activeFilter === 'Lore' && entry.type === 'Lore') ||
        (activeFilter === 'Characters' && entry.type === 'Character') ||
        (activeFilter === 'Locations' && entry.type === 'Location') ||
        (activeFilter === 'Entities' && !['Lore', 'Character', 'Location'].includes(entry.type));

      return matchesSearch && matchesFilter;
    });
  }, [allEntries, searchTerm, activeFilter]);

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <ViewHeader
        icon={Book}
        title="World Encyclopedia"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Consult the archives..."
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-8 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {(['All', 'Lore', 'Characters', 'Locations', 'Entities'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeFilter === filter 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {filteredEntries.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Search size={48} className="mb-4 opacity-20" />
                <p className="font-serif italic text-lg">No records found in the library.</p>
              </div>
            ) : (
              <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
                {filteredEntries.map((entry, idx) => (
                  <div 
                    key={`${entry.id}-${idx}`} 
                    className="break-inside-avoid bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all p-6 group cursor-pointer"
                    onClick={() => onLinkClick(entry.type.toLowerCase(), entry.id)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {entry.type === 'Character' && <Users size={14} className="text-indigo-500" />}
                        {entry.type === 'Location' && <Map size={14} className="text-emerald-500" />}
                        {entry.type === 'Lore' && <Scroll size={14} className="text-amber-500" />}
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-indigo-500 transition-colors">
                          {entry.type}
                        </span>
                      </div>
                      <Bookmark size={14} className="text-slate-200 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2 flex items-center justify-between">
                      {entry.title}
                      <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </h3>
                    
                    <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-serif line-clamp-4 italic">
                      <WikiText text={entry.content || 'No description recorded.'} projectData={projectData} onLinkClick={onLinkClick} />
                    </div>
                    
                    {entry.type === 'Character' && entry.role && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Role: {entry.role}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
