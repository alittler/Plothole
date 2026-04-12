import React, { useState } from 'react';
import { ProjectData, HierarchicalEntity, AppSettings } from '../../types';
import { Plus, Search, Sparkles, Loader2, Users } from 'lucide-react';
import { generateId } from '../../services/storageService';
import { CharacterCard } from '../ui/CharacterCard';
import { EntityEditModal } from '../ui/EntityEditModal';

interface CharacterViewProps {
  data: ProjectData;
  appSettings: AppSettings;
  onUpdateProject: (updates: Partial<ProjectData>) => void;
  onLinkClick: (type: string, id: string) => void;
  onExtractRelationships: () => void;
  isExtractingRelationships?: boolean;
}

export const CharacterView: React.FC<CharacterViewProps> = ({
  data, 
  appSettings,
  onUpdateProject, 
  onLinkClick,
  onExtractRelationships,
  isExtractingRelationships
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCharacter, setEditingCharacter] = useState<HierarchicalEntity | null>(null);

  const entities = data.entities || [];
  const legacyCharacters = (data.characters || []).map(c => ({ 
    ...c, 
    type: 'Character', 
    tier: (c as any).tier || 3 
  })) as HierarchicalEntity[];

  // Merge entities, avoiding duplicates by ID
  const allEntities = [...entities];
  legacyCharacters.forEach(lc => {
    if (!allEntities.some(e => e.id === lc.id)) {
      allEntities.push(lc);
    }
  });

  const characters = allEntities.filter(e => e.type === 'Character' || e.type === 'Group' || e.type === 'Faction');

  const filteredCharacters = characters.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.species?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddCharacter = () => {
    const newChar: HierarchicalEntity = { 
      id: generateId(), 
      name: '', 
      type: 'Character', 
      tier: 2, 
      species: 'Human', 
      description: '',
      role: 'Supporting',
      traits: [],
      source: 'manual'
    };
    setEditingCharacter(newChar);
  };

  const handleSaveCharacter = (updatedChar: HierarchicalEntity) => {
    const existingIndex = entities.findIndex(e => e.id === updatedChar.id);
    let newEntities = [...entities];
    
    if (existingIndex > -1) {
      newEntities[existingIndex] = updatedChar;
    } else {
      newEntities.push(updatedChar);
    }

    // Also handle legacy characters if they exist and are being edited
    const legacyIndex = (data.characters || []).findIndex(c => c.id === updatedChar.id);
    if (legacyIndex > -1) {
      const newLegacy = [...(data.characters || [])];
      newLegacy.splice(legacyIndex, 1);
      onUpdateProject({ 
        entities: newEntities,
        characters: newLegacy
      });
    } else {
      onUpdateProject({ entities: newEntities });
    }
  };

  const handleDeleteCharacter = (id: string) => {
    const newEntities = entities.filter(e => e.id !== id);
    const newLegacy = (data.characters || []).filter(c => c.id !== id);
    onUpdateProject({ entities: newEntities, characters: newLegacy });
  };

  return (
    <div className="h-full bg-slate-50 dark:bg-[#050505] flex flex-col overflow-y-auto custom-scrollbar">
      {/* Responsive Header Section */}
      <header className="px-[clamp(1rem,5vw,3rem)] py-[clamp(2rem,6vw,4rem)] border-b border-slate-200 dark:border-slate-800/50 bg-white/50 dark:bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-end justify-between gap-12">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-500/20">
              <Users size={12} /> Narrative Cast
            </div>
            <h1 className="text-[clamp(2.5rem,8vw,5rem)] font-black tracking-tighter leading-[0.85] text-slate-900 dark:text-white uppercase">
              Characters
            </h1>
            <p className="text-[clamp(1rem,2vw,1.25rem)] font-medium text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
              The architects of your story's soul. Manage protagonists, factions, and background players in a unified workspace.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative group flex-1 sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Search the cast..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm dark:text-white"
              />
            </div>
            <div className="flex gap-3">
               <button 
                onClick={onExtractRelationships}
                disabled={isExtractingRelationships || characters.length < 2}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-2xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
              >
                {isExtractingRelationships ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                <span className="hidden sm:inline">Sync From Manuscript</span>
              </button>
              <button
                onClick={handleAddCharacter}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all active:scale-95"
              >
                <Plus size={20} />
                Add Entity
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Responsive Grid Section */}
      <main className="flex-1 px-[clamp(1rem,5vw,3rem)] py-[clamp(2rem,6vw,4rem)]">
        <div className="max-w-7xl mx-auto">
          <div 
            className="grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))',
              gap: 'clamp(1.5rem, 4vw, 3rem)'
            }}
          >
            {filteredCharacters.map(char => (
              <CharacterCard 
                key={char.id} 
                character={char} 
                onEdit={() => setEditingCharacter(char)} 
              />
            ))}
          </div>
          
          {filteredCharacters.length === 0 && (
            <div className="py-40 text-center space-y-8 animate-in fade-in zoom-in duration-500">
              <div className="w-32 h-32 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto border-4 border-slate-50 dark:border-slate-800 shadow-inner">
                <Users size={64} className="text-slate-300 dark:text-slate-700" />
              </div>
              <div className="space-y-2">
                <p className="text-slate-900 dark:text-white font-black text-2xl uppercase tracking-tight">Silent Stage</p>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-lg max-w-xs mx-auto">No characters currently match your filter or search criteria.</p>
              </div>
              <button 
                onClick={() => setSearchQuery('')}
                className="text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest text-xs hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Popup Edit Page */}
      <EntityEditModal
        isOpen={!!editingCharacter}
        onClose={() => setEditingCharacter(null)}
        entity={editingCharacter}
        onSave={handleSaveCharacter}
        onDelete={handleDeleteCharacter}
      />
    </div>
  );
};
