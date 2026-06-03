import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProjectData } from '../../types';
import { 
  Book, 
  Scroll, 
  BookMarked, 
  Box, 
  Wand2, 
  MoreHorizontal, 
  MapPin,
  Search,
  Plus,
  Users
} from 'lucide-react';
import { ViewHeader } from '../Layout/ViewHeader';

const BestiaryView = dynamic(() => import('./BestiaryView').then(mod => mod.BestiaryView), { ssr: false });
const DictionaryView = dynamic(() => import('./DictionaryView').then(mod => mod.DictionaryView), { ssr: false });
const InventoryView = dynamic(() => import('./InventoryView').then(mod => mod.InventoryView), { ssr: false });
const LocationsListView = dynamic(() => import('./LocationsListView').then(mod => mod.LocationsListView), { ssr: false });
const EncyclopediaView = dynamic(() => import('./EncyclopediaView').then(mod => mod.EncyclopediaView), { ssr: false });
const CharactersView = dynamic(() => import('./CharactersView').then(mod => mod.CharactersView), { ssr: false });

interface CodexHubViewProps {
  projectData: ProjectData;
  onLinkClick: (type: string, id: string) => void;
  onUpdateProject: (updates: Partial<ProjectData>) => void;
}

export enum CodexTab {
  CHARACTERS = 'Characters',
  ENCYCLOPEDIA = 'Encyclopedia',
  BESTIARY = 'Bestiary',
  LEXICON = 'Lexicon',
  ARTIFACTS = 'Artifacts',
  LOCATIONS = 'Locations',
  LORE = 'Lore'
}

export const CodexHubView: React.FC<CodexHubViewProps> = ({ projectData, onLinkClick, onUpdateProject }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') as CodexTab) || CodexTab.CHARACTERS;
  
  const setActiveTab = (tab: CodexTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`?${params.toString()}`);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case CodexTab.CHARACTERS:
        return <CharactersView 
          data={projectData} 
          onUpdateCharacter={(c) => onUpdateProject({ characters: projectData.characters.map(char => char.id === c.id ? c : char) })}
          onAddCharacter={(c) => onUpdateProject({ characters: [...projectData.characters, c] })}
          onDeleteCharacter={(id) => onUpdateProject({ characters: projectData.characters.filter(char => char.id !== id) })}
          onLinkClick={onLinkClick}
        />;
      case CodexTab.BESTIARY:
        return <BestiaryView projectData={projectData} onLinkClick={onLinkClick} onUpdateProject={onUpdateProject} />;
      case CodexTab.LEXICON:
        return <DictionaryView projectData={projectData} onLinkClick={onLinkClick} onUpdateProject={onUpdateProject} />;
      case CodexTab.ARTIFACTS:
        return <InventoryView projectData={projectData} onLinkClick={onLinkClick} onUpdateProject={onUpdateProject} />;
      case CodexTab.LOCATIONS:
        return <LocationsListView projectData={projectData} onLinkClick={onLinkClick} onUpdateProject={onUpdateProject} />;
      case CodexTab.ENCYCLOPEDIA:
      default:
        return <EncyclopediaView projectData={projectData} onLinkClick={onLinkClick} />;
    }
  };

  const getTabIcon = (tab: CodexTab) => {
    switch (tab) {
      case CodexTab.CHARACTERS: return Users;
      case CodexTab.ENCYCLOPEDIA: return Book;
      case CodexTab.BESTIARY: return Wand2;
      case CodexTab.LEXICON: return BookMarked;
      case CodexTab.ARTIFACTS: return Box;
      case CodexTab.LOCATIONS: return MapPin;
      case CodexTab.LORE: return Scroll;
      default: return MoreHorizontal;
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <div className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="px-8 h-14 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <Book size={18} className="text-indigo-600" />
             <h2 className="text-sm font-black uppercase tracking-tighter text-slate-900 dark:text-white">Codex Hub</h2>
           </div>
           
           <div className="flex items-center gap-1">
             {Object.values(CodexTab).filter(t => t !== CodexTab.LORE).map(tab => {
               const Icon = getTabIcon(tab);
               const isActive = activeTab === tab;
               return (
                 <button
                   key={tab}
                   onClick={() => setActiveTab(tab)}
                   className={`px-4 h-9 flex items-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                     isActive 
                       ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                       : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                   }`}
                 >
                   <Icon size={14} />
                   <span className="hidden lg:inline">{tab}</span>
                 </button>
               );
             })}
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {renderTabContent()}
      </div>
    </div>
  );
};
