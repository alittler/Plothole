import React, { useState, useMemo } from 'react';
import { ProjectData, HierarchicalEntity } from '../../types';
import { Wand2, Search, Plus, Zap, Heart, Shield, Sword, Eye, ChevronRight } from 'lucide-react';
import { WikiText } from '../ui/WikiText';
import { ViewHeader } from '../Layout/ViewHeader';

interface BestiaryViewProps {
  projectData: ProjectData;
  onLinkClick: (type: string, id: string) => void;
  onUpdateProject: (updates: Partial<ProjectData>) => void;
}

export const BestiaryView: React.FC<BestiaryViewProps> = ({ projectData, onLinkClick, onUpdateProject }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTier, setActiveType] = useState<string>('All');

  const entities = projectData.entities || [];
  
  // Filter for creature-like entities
  const creatures = useMemo(() => {
    return entities.filter(e => 
      e.type === 'Creature' || 
      e.type === 'Beast' || 
      e.type === 'Monster' ||
      e.species?.toLowerCase().includes('creature') || 
      e.species?.toLowerCase().includes('beast') ||
      e.species?.toLowerCase().includes('monster')
    );
  }, [entities]);

  const uniqueTiers = useMemo(() => {
    return ['All', '1', '2', '3'];
  }, []);

  const filteredCreatures = useMemo(() => {
    return creatures.filter(creature => {
      const matchesSearch = 
        creature.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        creature.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        creature.species?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTier = activeTier === 'All' || String(creature.tier) === activeTier;

      return matchesSearch && matchesTier;
    });
  }, [creatures, searchTerm, activeTier]);

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <ViewHeader
        icon={Wand2}
        title="Arcane Bestiary"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Study specimen..."
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-8 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-black uppercase text-slate-400 mr-2">Threat Tier</span>
          {uniqueTiers.map(tier => (
            <button
              key={tier}
              onClick={() => setActiveType(tier)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTier === tier 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tier === 'All' ? 'All Specimens' : `Tier ${tier}`}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {filteredCreatures.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Eye size={48} className="mb-4 opacity-20" />
                <p className="font-serif italic text-lg">No specimens recorded in this classification.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredCreatures.map(creature => (
                  <div 
                    key={creature.id}
                    onClick={() => onLinkClick('admin', creature.id)}
                    className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl transition-all group cursor-pointer"
                  >
                    <div className="h-48 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                      {creature.images?.[0]?.url ? (
                        <img src={creature.images[0].url} alt={creature.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700">
                          <Wand2 size={64} />
                        </div>
                      )}
                      <div className="absolute top-4 left-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          creature.tier === 1 ? 'bg-rose-500 text-white' :
                          creature.tier === 2 ? 'bg-amber-500 text-white' :
                          'bg-emerald-500 text-white'
                        }`}>
                          Tier {creature.tier || 3}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-8 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{creature.species || 'Unknown Species'}</span>
                        <div className="flex gap-2">
                           <Heart size={14} className="text-rose-500/30" />
                           <Shield size={14} className="text-blue-500/30" />
                           <Zap size={14} className="text-amber-500/30" />
                        </div>
                      </div>
                      
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                        {creature.name}
                      </h3>
                      
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 font-serif italic leading-relaxed">
                        {creature.description || 'Behavioral data pending analysis.'}
                      </p>
                      
                      <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Native to: {creature.homeLocation || 'Unknown'}</span>
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-all group-hover:translate-x-1" />
                      </div>
                    </div>
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
