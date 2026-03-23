import React, { useState } from 'react';
import { Character, Location, TimelineEvent, Artifact, Note, ManuscriptHistoryEntry, ViewType, Relationship, ProjectData } from '../../types';
import { Plus, Search, Sparkles, Edit2, Trash2, Camera, Users, User, FileText, Network, Heart, Zap, Shield, ArrowRight, X, Loader2 } from 'lucide-react';
import { generateId } from '../../services/storageService';

interface CharacterViewProps {
  projectTitle: string;
  characters: Character[];
  relationships: Relationship[];
  locations: Location[];
  timeline: TimelineEvent[];
  artifacts: Artifact[];
  themes: string[];
  notes: Note[];
  manuscriptHistory: ManuscriptHistoryEntry[];
  onUpdateCharacter: (c: Character) => void;
  onAddCharacter: (c: Character) => void;
  onUpdateProject: (updates: Partial<ProjectData>) => void;
  onLinkClick: (type: string, id: string) => void;
  characterLimit?: number;
  onChangeView: (view: ViewType) => void;
  onExtractThemesFromNotes: () => void;
  onExtractRelationships: () => void;
  isExtractingThemes: boolean;
  isExtractingRelationships?: boolean;
}

enum CharacterTab {
  ROSTER = 'Roster',
  RELATIONSHIPS = 'Relationships',
  NOTES = 'Notes'
}

export const CharacterView: React.FC<CharacterViewProps> = ({
  characters, relationships = [], onAddCharacter, onUpdateProject, onExtractRelationships, isExtractingRelationships = false, onLinkClick
}) => {
  const [activeTab, setActiveTab] = useState<CharacterTab>(CharacterTab.ROSTER);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingRel, setIsAddingRel] = useState(false);
  const [newRel, setNewRel] = useState({ sourceId: '', targetId: '', type: '', description: '' });

  const filteredCharacters = characters.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.job && c.job.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddRelationship = () => {
    if (!newRel.sourceId || !newRel.targetId || !newRel.type) return;
    
    const rel: Relationship = {
      id: generateId(),
      sourceId: newRel.sourceId,
      targetId: newRel.targetId,
      type: newRel.type,
      description: newRel.description
    };

    onUpdateProject({ relationships: [...relationships, rel] });
    setIsAddingRel(false);
    setNewRel({ sourceId: '', targetId: '', type: '', description: '' });
  };

  const handleDeleteRelationship = (id: string) => {
    onUpdateProject({ relationships: relationships.filter(r => r.id !== id) });
  };

  const getCharacterName = (id: string) => characters.find(c => c.id === id)?.name || 'Unknown Character';

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">CHARACTERS</h1>
            <p className="hidden md:block text-xs md:text-sm text-slate-500 dark:text-slate-400">Manage the souls that inhabit your story.</p>
          </div>
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar">
            {[CharacterTab.ROSTER, CharacterTab.RELATIONSHIPS, CharacterTab.NOTES].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-xl font-bold text-[10px] md:text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                {tab === CharacterTab.ROSTER && <Users size={14} />}
                {tab === CharacterTab.RELATIONSHIPS && <Network size={14} />}
                {tab === CharacterTab.NOTES && <FileText size={14} />}
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {activeTab === CharacterTab.ROSTER && (
            <>
              <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 md:mb-8">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <button
                  onClick={() => onAddCharacter({ id: Math.random().toString(), name: 'New Character', role: 'Supporting', job: '', description: '', traits: [], source: 'manual' })}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors sm:ml-auto"
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredCharacters.map(char => (
                  <div key={char.id} className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden group hover:shadow-md transition-all">
                    <div className="aspect-[4/5] bg-slate-100 dark:bg-slate-800 relative">
                      {char.images && char.images.length > 0 ? (
                        <img src={char.images[0].url} alt={char.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700">
                          <User size={64} />
                        </div>
                      )}
                      <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 backdrop-blur-md text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                        {char.role}
                      </div>
                      
                      {/* Character Lifespan Bar */}
                      {char.firstMentionOffset !== undefined && char.lastMentionOffset !== undefined && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                          <div 
                            className="absolute h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"
                            style={{ 
                              left: `${(char.firstMentionOffset / 1000000) * 100}%`, 
                              right: `${100 - (char.lastMentionOffset / 1000000) * 100}%` 
                            }}
                          />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <button 
                          onClick={() => onLinkClick('admin', char.id)}
                          className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all transform scale-90 group-hover:scale-100 shadow-2xl border border-white/20 flex flex-col items-center gap-2"
                        >
                          <Edit2 size={24} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Edit</span>
                        </button>
                      </div>
                    </div>
                    <div className="p-6 space-y-4 flex-1 flex flex-col">
                      <div className="break-words [overflow-wrap:anywhere]">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-xl font-black text-slate-900 dark:text-white">{char.name}</h3>
                          {char.nickname && <span className="text-[10px] font-bold text-slate-400 italic">"{char.nickname}"</span>}
                        </div>
                        {char.job && (
                          <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">
                            {char.job}
                          </div>
                        )}
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-2">{char.description || 'No description provided.'}</p>
                      </div>

                      {(char.age || char.birthplace || char.residence) && (
                        <div className="grid grid-cols-2 gap-y-2 py-3 border-y border-slate-100 dark:border-slate-800">
                          {char.age && (
                            <div className="flex items-center gap-2">
                              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Age</div>
                              <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{char.age}</div>
                            </div>
                          )}
                          {char.species && (
                            <div className="flex items-center gap-2">
                              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Race</div>
                              <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{char.species}</div>
                            </div>
                          )}
                          {char.birthplace && (
                            <div className="flex items-center gap-2 col-span-2">
                              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Home</div>
                              <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">{char.birthplace}</div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mt-auto pt-2">
                        {char.traits.map(trait => (
                          <span key={trait} className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded text-[10px] font-bold uppercase tracking-wider">
                            {trait}
                          </span>
                        ))}
                      </div>
                      {char.source === 'ai' && (
                        <div className="flex items-center gap-1 text-[10px] font-black text-amber-500 uppercase tracking-widest">
                          <Sparkles size={10} />
                          AI Extracted
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === CharacterTab.RELATIONSHIPS && (
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
                    <div className="flex items-end justify-center py-2 text-slate-300">
                      <ArrowRight size={24} />
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Connection Type</label>
                      <input 
                        type="text"
                        placeholder="e.g. Rival, Spouse, Mentor..."
                        value={newRel.type}
                        onChange={(e) => setNewRel({...newRel, type: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                      <input 
                        type="text"
                        placeholder="Details about their bond..."
                        value={newRel.description}
                        onChange={(e) => setNewRel({...newRel, description: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button 
                      onClick={handleAddRelationship}
                      disabled={!newRel.sourceId || !newRel.targetId || !newRel.type}
                      className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50"
                    >
                      Establish Connection
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {relationships.length > 0 ? relationships.map(rel => (
                  <div key={rel.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {rel.type}
                      </div>
                      <button 
                        onClick={() => handleDeleteRelationship(rel.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 text-center">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-400">
                          <User size={20} />
                        </div>
                        <div className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{getCharacterName(rel.sourceId)}</div>
                      </div>
                      <div className="text-indigo-300 flex flex-col items-center">
                        <ArrowRight size={16} />
                      </div>
                      <div className="flex-1 text-center">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-400">
                          <User size={20} />
                        </div>
                        <div className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{getCharacterName(rel.targetId)}</div>
                      </div>
                    </div>
                    {rel.description && (
                      <p className="mt-4 text-[11px] text-slate-500 dark:text-slate-400 italic text-center border-t border-slate-50 dark:border-slate-800 pt-4">
                        "{rel.description}"
                      </p>
                    )}
                  </div>
                )) : (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 space-y-4 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Network size={48} className="opacity-20" />
                    <p className="font-serif italic text-lg text-center px-8">No character connections mapped yet. <br /> Use the "New Connection" button to define how your cast is linked.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === CharacterTab.NOTES && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
              <FileText size={48} className="opacity-20" />
              <p className="font-serif italic text-lg">Character notes integration coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
