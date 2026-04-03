import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ViewType, Relationship, ProjectData, HierarchicalEntity } from '../../types';
import { Plus, Search, Sparkles, Edit2, Trash2, Camera, Users, User, FileText, Network, Heart, Zap, Shield, ArrowRight, X, Loader2, Ghost, Map } from 'lucide-react';
import { generateId } from '../../services/storageService';
import { RelationshipGraph } from '../ui/RelationshipGraph';

interface CharacterViewProps {
  data: ProjectData;
  onUpdateProject: (updates: Partial<ProjectData>) => void;
  onLinkClick: (type: string, id: string) => void;
  onExtractRelationships: () => void;
  isExtractingRelationships?: boolean;
}

enum CharacterTab {
  ACTIVE_CAST = 'Active Cast',
  BACKGROUND = 'Background',
  GROUPS = 'Groups',
  RELATIONSHIPS = 'Relationships',
  GRAPH = 'Graph Map'
}

export const CharacterView: React.FC<CharacterViewProps> = ({
  data, 
  onUpdateProject, 
  onLinkClick,
  onExtractRelationships,
  isExtractingRelationships
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as CharacterTab) || CharacterTab.ACTIVE_CAST;
  const setActiveTab = (tab: CharacterTab) => setSearchParams({ tab });

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingRel, setIsAddingRel] = useState(false);
  const [newRel, setNewRel] = useState({ sourceId: '', targetId: '', type: '', description: '' });

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

  const characters = allEntities.filter(e => e.type === 'Character');
  const groups = allEntities.filter(e => e.type === 'Group' || e.type === 'Faction' || e.type === 'Family');
  const relationships = data.relationships || [];

  const getFilteredEntities = () => {
    let base: HierarchicalEntity[] = [];
    if (activeTab === CharacterTab.ACTIVE_CAST) {
      base = characters.filter(c => c.tier === 1 || c.tier === 2);
    } else if (activeTab === CharacterTab.BACKGROUND) {
      base = characters.filter(c => c.tier === 3);
    } else if (activeTab === CharacterTab.GROUPS) {
      base = groups;
    } else {
      return [];
    }

    return base.filter(e => 
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.species?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredEntities = getFilteredEntities();

  const handleAddCharacter = () => {
    const tier = activeTab === CharacterTab.ACTIVE_CAST ? 1 : 3;
    const newChar: HierarchicalEntity = { 
      id: generateId(), 
      name: 'New Character', 
      type: 'Character', 
      tier: tier as any, 
      species: 'Human', 
      description: '',
      role: tier === 1 ? 'Protagonist' : 'Supporting',
      traits: [],
      source: 'manual'
    };
    onUpdateProject({ entities: [...entities, newChar] });
  };

  const handleAddGroup = () => {
    const newGroup: HierarchicalEntity = { 
      id: generateId(), 
      name: 'New Group', 
      type: 'Group', 
      tier: 2 as any, 
      species: 'Faction', 
      description: '',
      role: 'Organization',
      traits: [],
      source: 'manual'
    };
    onUpdateProject({ entities: [...entities, newGroup] });
  };

  const handleAddRelationship = () => {
    if (!newRel.sourceId || !newRel.targetId || !newRel.type) return;
    const relationship: Relationship = {
      id: generateId(),
      sourceId: newRel.sourceId,
      targetId: newRel.targetId,
      type: newRel.type,
      description: newRel.description
    };
    onUpdateProject({ relationships: [...relationships, relationship] });
    setIsAddingRel(false);
    setNewRel({ sourceId: '', targetId: '', type: '', description: '' });
  };

  const handleDeleteRelationship = (id: string) => {
    onUpdateProject({ relationships: relationships.filter(r => r.id !== id) });
  };

  const getCharacterName = (id: string) => characters.find(c => c.id === id)?.name || 'Unknown Character';

  const renderActiveTabContent = () => {
    if (activeTab === CharacterTab.GRAPH) {
      return (
        <div className="h-[calc(100vh-300px)] animate-in fade-in duration-500">
          <RelationshipGraph 
            entities={allEntities} 
            relationships={relationships} 
          />
        </div>
      );
    }

    if (activeTab === CharacterTab.RELATIONSHIPS) {
      return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Network size={20} className="text-indigo-600" /> Relationship Mapper
              </h2>
              <p className="text-xs text-slate-500 mt-1">Map the social web and emotional ties of your cast.</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={onExtractRelationships}
                disabled={isExtractingRelationships || characters.length < 2}
                className="px-6 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-100 transition-colors disabled:opacity-50"
              >
                {isExtractingRelationships ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                Scan Manuscript
              </button>
              <button 
                onClick={() => setIsAddingRel(!isAddingRel)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
              >
                {isAddingRel ? <X size={18} /> : <Plus size={18} />}
                {isAddingRel ? 'Cancel' : 'New Connection'}
              </button>
            </div>
          </div>

          {isAddingRel && (
            <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border-2 border-indigo-500 shadow-xl space-y-6 animate-in slide-in-from-top-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Source Character</label>
                  <select 
                    value={newRel.sourceId}
                    onChange={(e) => setNewRel({...newRel, sourceId: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select...</option>
                    {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2 text-center flex flex-col justify-center">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Connection Type</div>
                  <input 
                    type="text"
                    placeholder="e.g. Rival, Spouse, Ally"
                    value={newRel.type}
                    onChange={(e) => setNewRel({...newRel, type: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm text-center font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Character</label>
                  <select 
                    value={newRel.targetId}
                    onChange={(e) => setNewRel({...newRel, targetId: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select...</option>
                    {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Context / Notes</label>
                <textarea 
                  value={newRel.description}
                  onChange={(e) => setNewRel({...newRel, description: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm h-20 resize-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Optional context about this relationship..."
                />
              </div>
              <button 
                onClick={handleAddRelationship}
                disabled={!newRel.sourceId || !newRel.targetId || !newRel.type}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                Create Bond
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {relationships.map(rel => (
              <div key={rel.id} className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-indigo-500/30 transition-all">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="font-bold text-slate-900 dark:text-white truncate">{getCharacterName(rel.sourceId)}</span>
                    <ArrowRight size={14} className="text-slate-400 shrink-0" />
                    <span className="font-bold text-slate-900 dark:text-white truncate">{getCharacterName(rel.targetId)}</span>
                  </div>
                  <button onClick={() => handleDeleteRelationship(rel.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                </div>
                <div className="inline-flex px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-3">{rel.type}</div>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 italic leading-relaxed">{rel.description || 'No additional context provided.'}</p>
              </div>
            ))}
            {relationships.length === 0 && (
              <div className="col-span-full py-20 text-center space-y-4">
                <Heart size={48} className="mx-auto text-slate-200 dark:text-slate-800" />
                <p className="text-slate-400 font-serif italic text-lg">No relationships mapped yet. Connect your cast to see their ties.</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 md:mb-8">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <button
            onClick={activeTab === CharacterTab.GROUPS ? handleAddGroup : handleAddCharacter}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors sm:ml-auto"
          >
            <Plus size={16} />
            Add {activeTab === CharacterTab.GROUPS ? 'Group' : 'Character'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredEntities.map(char => (
            <div key={char.id} className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden group hover:shadow-md transition-all">
              <div className="aspect-[4/5] bg-slate-100 dark:bg-slate-800 relative">
                {char.images && char.images.length > 0 ? (
                  <img src={char.images[0].url} alt={char.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700">
                    {activeTab === CharacterTab.GROUPS ? <Shield size={64} /> : <User size={64} />}
                  </div>
                )}
                <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 backdrop-blur-md text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                  {char.species || 'Human'}
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight drop-shadow-md">{char.name}</h3>
                    <p className="text-xs text-white/80 font-bold uppercase tracking-widest drop-shadow-sm">{char.role || 'Supporting'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onLinkClick('admin', char.id)}
                      className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6 flex flex-col h-[200px]">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${char.tier === 1 ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tier {char.tier} Entity</span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-2">{char.description || 'No description provided.'}</p>
                </div>

                {(char.age || char.species || char.gender || char.nationality || char.birthplace || char.residence) && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-3 border-y border-slate-100 dark:border-slate-800">
                    {char.age && (
                      <div className="flex items-center gap-2">
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Age</div>
                        <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{char.age}</div>
                      </div>
                    )}
                    {char.species && char.type === 'Character' && (
                      <div className="flex items-center gap-2">
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Race</div>
                        <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{char.species}</div>
                      </div>
                    )}
                    {char.gender && (
                      <div className="flex items-center gap-2">
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Gender</div>
                        <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{char.gender}</div>
                      </div>
                    )}
                    {char.nationality && (
                      <div className="flex items-center gap-2">
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Nation</div>
                        <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{char.nationality}</div>
                      </div>
                    )}
                    {(char.birthplace) && (
                      <div className="flex items-center gap-2 col-span-2">
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Born</div>
                        <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">{char.birthplace}</div>
                      </div>
                    )}
                    {(char.residence) && (
                      <div className="flex items-center gap-2 col-span-2">
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lives</div>
                        <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">{char.residence}</div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-auto pt-2">
                  {char.traits?.map(trait => (
                    <span key={trait} className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded text-[10px] font-bold uppercase tracking-wider">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {filteredEntities.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4">
              <FileText size={48} className="mx-auto text-slate-200 dark:text-slate-800" />
              <p className="text-slate-400 font-serif italic text-lg">No {activeTab.toLowerCase()} found matching your search.</p>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="p-6 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md z-10 shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="ph-section-title text-2xl md:text-3xl flex items-center justify-center md:justify-start gap-3">
              <Users size={32} className="text-indigo-600" /> Cast & Factions
            </h1>
            <p className="ph-section-subtitle">Orchestrate the souls and societies of your story world.</p>
          </div>
          <div className="ph-tab-container w-full md:w-auto overflow-x-auto no-scrollbar">
            {Object.values(CharacterTab).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`ph-tab ${activeTab === tab ? "ph-tab-active" : "ph-tab-inactive"}`}
              >
                {tab === CharacterTab.ACTIVE_CAST && <Zap size={14} />}
                {tab === CharacterTab.BACKGROUND && <Ghost size={14} />}
                {tab === CharacterTab.GROUPS && <Shield size={14} />}
                {tab === CharacterTab.RELATIONSHIPS && <Network size={14} />}
                {tab === CharacterTab.GRAPH && <Map size={14} />}
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-0 md:p-8 custom-scrollbar">
        <div className="max-w-6xl mx-auto min-h-full pb-40">
          {renderActiveTabContent()}
        </div>
      </div>
    </div>
  );
};
