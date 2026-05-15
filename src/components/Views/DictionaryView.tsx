import React, { useState, useMemo } from 'react';
import { ProjectData, LoreEntry } from '../../types';
import { BookMarked, Search, Plus, Languages, Type, Quote, Hash, ChevronRight } from 'lucide-react';
import { WikiText } from '../ui/WikiText';
import { ViewHeader } from '../Layout/ViewHeader';

interface DictionaryViewProps {
  projectData: ProjectData;
  onLinkClick: (type: string, id: string) => void;
  onUpdateProject: (updates: Partial<ProjectData>) => void;
}

export const DictionaryView: React.FC<DictionaryViewProps> = ({ projectData, onLinkClick, onUpdateProject }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeLetter, setActiveLetter] = useState<string>('All');

  const lore = projectData.lore || [];
  
  // Filter for dictionary-like entries
  const lexicon = useMemo(() => {
    return lore.filter(l => 
      l.category === 'Dictionary' || 
      l.category === 'Lexicon' || 
      l.category === 'Linguistics' ||
      l.type === 'Term'
    ).sort((a, b) => (a.term || '').localeCompare(b.term || ''));
  }, [lore]);

  const alphabet = useMemo(() => {
    const letters = new Set(lexicon.map(l => (l.term || '#')[0].toUpperCase()));
    return ['All', ...Array.from(letters).sort()];
  }, [lexicon]);

  const filteredLexicon = useMemo(() => {
    return lexicon.filter(entry => {
      const matchesSearch = 
        (entry.term || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.definition || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLetter = activeLetter === 'All' || (entry.term || '#')[0].toUpperCase() === activeLetter;

      return matchesSearch && matchesLetter;
    });
  }, [lexicon, searchTerm, activeLetter]);

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <ViewHeader
        icon={BookMarked}
        title="World Lexicon"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Define term..."
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-8 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {alphabet.map(letter => (
            <button
              key={letter}
              onClick={() => setActiveLetter(letter)}
              className={`min-w-[40px] h-10 flex items-center justify-center rounded-xl text-xs font-black uppercase transition-all ${
                activeLetter === letter 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-4">
            {filteredLexicon.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Languages size={48} className="mb-4 opacity-20" />
                <p className="font-serif italic text-lg">No terms found in the lexicon.</p>
              </div>
            ) : (
              filteredLexicon.map(entry => (
                <div 
                  key={entry.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all group border-l-4 border-l-slate-200 dark:border-l-slate-800 hover:border-l-indigo-500"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                          {entry.term}
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {entry.category || 'Term'}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 font-serif leading-relaxed pr-8">
                        <WikiText text={entry.definition || 'No definition recorded.'} projectData={projectData} onLinkClick={onLinkClick} />
                      </div>
                    </div>
                    <button 
                      onClick={() => onLinkClick('admin', entry.id)}
                      className="p-2 text-slate-300 hover:text-indigo-500 transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                  
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {entry.tags.map(tag => (
                        <span key={tag} className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
