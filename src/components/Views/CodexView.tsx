import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProjectData } from '../../types';
import { Book, Search, FileText, Settings, Languages, Box, Plus } from 'lucide-react';
import { WikiText } from '../ui/WikiText';
import { generateId } from '../../services/storageService';

interface CodexViewProps {
  projectData: ProjectData;
  onLinkClick: (type: string, id: string) => void;
  onUpdateProject: (updates: Partial<ProjectData>) => void;
}

enum CodexTab {
  SYSTEMS = 'Systems',
  ENCYCLOPEDIA = 'Encyclopedia',
  LINGUISTICS = 'Linguistics',
  ARTIFACTS = 'Artifacts'
}

export const CodexView: React.FC<CodexViewProps> = ({ projectData, onLinkClick, onUpdateProject }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as CodexTab) || CodexTab.ENCYCLOPEDIA;
  const setActiveTab = (tab: CodexTab) => setSearchParams({ tab });

  const [searchTerm, setSearchTerm] = useState('');
  
  const lore = projectData.lore || [];
  const entities = projectData.entities || [];
  const artifacts = entities.filter(e => e.type === 'Item' || e.type === 'Artifact');

  const getFilteredContent = () => {
    let base: any[] = [];
    if (activeTab === CodexTab.SYSTEMS) {
      base = lore.filter(l => l.category === 'System' || l.category === 'Rules');
    } else if (activeTab === CodexTab.ENCYCLOPEDIA) {
      base = lore.filter(l => l.category !== 'Dictionary' && l.category !== 'System' && l.category !== 'Rules');
    } else if (activeTab === CodexTab.LINGUISTICS) {
      base = lore.filter(l => l.category === 'Dictionary' || l.category === 'Linguistics');
    } else if (activeTab === CodexTab.ARTIFACTS) {
      base = artifacts;
    }

    return base.filter(entry => {
      const name = entry.term || entry.name || '';
      const content = entry.definition || entry.description || '';
      return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             content.toLowerCase().includes(searchTerm.toLowerCase());
    });
  };

  const filteredContent = getFilteredContent();

  const handleAddEntry = () => {
    if (activeTab === CodexTab.ARTIFACTS) {
      const newArtifact = { 
        id: generateId(), 
        name: 'New Artifact', 
        type: 'Item', 
        tier: 3 as const, 
        species: 'Relic', 
        description: '',
        source: 'manual'
      };
      onUpdateProject({ entities: [...entities, newArtifact] });
    } else {
      let category = 'General';
      if (activeTab === CodexTab.SYSTEMS) category = 'System';
      if (activeTab === CodexTab.LINGUISTICS) category = 'Dictionary';
      
      const newLore = {
        id: generateId(),
        term: 'New Entry',
        definition: '',
        category,
        source: 'manual' as const
      };
      onUpdateProject({ lore: [...lore, newLore] });
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">CODEX</h1>
            <p className="hidden md:block text-xs md:text-sm text-slate-500 dark:text-slate-400">The authoritative collection of your world's knowledge.</p>
          </div>
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar">
            {Object.values(CodexTab).map(tab => {
              const Icon = {
                [CodexTab.SYSTEMS]: Settings,
                [CodexTab.ENCYCLOPEDIA]: Book,
                [CodexTab.LINGUISTICS]: Languages,
                [CodexTab.ARTIFACTS]: Box
              }[tab];
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-xl font-bold text-[10px] md:text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  <Icon size={14} />
                  {tab}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder={`Search ${activeTab}...`} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <button
              onClick={handleAddEntry}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors sm:ml-auto"
            >
              <Plus size={16} />
              Add Entry
            </button>
          </div>

          {filteredContent.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <Book size={48} className="mb-4 opacity-20" />
              <p className="font-serif italic text-lg">No entries found in {activeTab}.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredContent.map(entry => {
                const id = entry.id;
                const title = entry.term || entry.name;
                const description = entry.definition || entry.description;
                const category = entry.category || entry.type;

                return (
                  <div key={id} className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative group">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{category}</span>
                      <button 
                        onClick={() => onLinkClick('admin', id)}
                        className="text-slate-400 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <FileText size={16} />
                      </button>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-2">{title}</h3>
                    <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-serif">
                      <WikiText text={description} projectData={projectData} onLinkClick={onLinkClick} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
