import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProjectData, HierarchicalEntity } from '../../types';
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
      const newArtifact: HierarchicalEntity = {
        id: generateId(),
        name: 'New Artifact',
        type: 'Artifact',
        tier: 3,
        species: 'Object',
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
      <header className="p-6 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md z-10 shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="ph-section-title text-2xl md:text-3xl flex items-center justify-center md:justify-start gap-3">
              <Book size={32} className="text-indigo-600" /> Story Codex
            </h1>
            <p className="ph-section-subtitle">The authoritative collection of your world's knowledge.</p>
          </div>
          <div className="ph-tab-container w-full md:w-auto overflow-x-auto no-scrollbar">
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
                  className={`ph-tab ${activeTab === tab ? "ph-tab-active" : "ph-tab-inactive"}`}
                >
                  <Icon size={14} />
                  {tab}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-0 md:p-8 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 min-h-full pb-40">
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder={`Search ${activeTab.toLowerCase()}...`} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ph-input pl-12 w-full"
              />
            </div>
            <button
              onClick={handleAddEntry}
              className="ph-button-primary w-full sm:w-auto"
            >
              <Plus size={18} />
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
