import React, { useState } from 'react';
import { HierarchicalEntity } from '../../types';
import { Edit2, X, Users, BookOpen, Target, Activity, Shield, MapPin, Globe, Sparkles } from 'lucide-react';

interface CharacterCardProps {
  character: HierarchicalEntity;
  onEdit?: () => void;
  isPreview?: boolean;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({ 
  character, 
  onEdit,
  isPreview = false
}) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <article 
        className={`group relative flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden transition-all hover:shadow-xl hover:border-indigo-500/30 [container-type:inline-size] ${isPreview ? 'max-w-sm w-full mx-auto' : ''}`}
      >
        <div className="p-6 space-y-5">
          {/* Header: Name & Edit */}
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">
              {character.name}
            </h3>
            {onEdit && (
              <button 
                onClick={onEdit}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all shrink-0"
              >
                <Edit2 size={16} />
              </button>
            )}
          </div>

          {/* Subheader: Job/Description • Species */}
          <div className="flex flex-wrap items-center gap-x-2 text-[10px] font-black uppercase tracking-widest">
            <span className="text-indigo-600 dark:text-indigo-400">
              {character.role || character.jobTitle || 'No Role'}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-slate-500 dark:text-slate-400">
              {character.species || 'Human'}
            </span>
          </div>

          {/* #Description Section */}
          <div className="space-y-1.5">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">#Description</h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
              {character.description || 'A mysterious figure whose thread in the narrative remains yet to be fully woven into the tapestry.'}
            </p>
          </div>

          {/* #Goals Section */}
          <div className="space-y-1.5">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">#Goals</h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2 italic">
              {character.motivation || 'No specific goals defined yet.'}
            </p>
          </div>

          {/* View More Link */}
          <div className="pt-2 border-t border-slate-50 dark:border-slate-800/50">
            <button 
              onClick={() => setShowModal(true)}
              className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] hover:underline flex items-center gap-2 group/btn"
            >
              #View More Details
              <Users size={12} className="group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </article>

      {/* Full Dossier Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <header className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center text-3xl font-black shadow-lg shadow-indigo-600/20">
                  {character.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-2">{character.name}</h2>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                      Tier {character.tier || 3}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{character.type || 'Character'}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-4 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-all"
              >
                <X size={24} className="text-slate-400" />
              </button>
            </header>
            
            {/* Modal Content */}
            <main className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-12">
              {/* Primary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Profile Data */}
                <section className="space-y-8">
                  <div className="space-y-6">
                    <h3 className="flex items-center gap-3 text-xs font-black text-indigo-500 uppercase tracking-[0.2em] border-b border-indigo-500/10 pb-3">
                      <Shield size={16} /> Identity & Background
                    </h3>
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                      <DetailItem label="Species" value={character.species} />
                      <DetailItem label="Role" value={character.role || character.jobTitle} />
                      <DetailItem label="Age" value={character.age} />
                      <DetailItem label="Gender" value={character.gender} />
                      <DetailItem label="Nationality" value={character.nationality} />
                      <DetailItem label="Birthplace" value={character.birthPlace} />
                      <DetailItem label="Residence" value={character.homeLocation} />
                      <DetailItem label="Affiliation" value={character.affiliation} />
                      <DetailItem label="Style" value={character.style} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="flex items-center gap-3 text-xs font-black text-amber-500 uppercase tracking-[0.2em] border-b border-amber-500/10 pb-3">
                      <Target size={16} /> Narrative Traits
                    </h3>
                    <div className="space-y-3">
                      {character.primary_trait && (
                        <div>
                          <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Primary Trait</span>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{character.primary_trait}</p>
                        </div>
                      )}
                      {character.traits && character.traits.length > 0 && (
                        <div>
                          <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Traits</span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {character.traits.map(trait => (
                              <span key={trait} className="px-4 py-2 bg-amber-500/5 text-amber-600 dark:text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-500/10">
                                {trait}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="flex items-center gap-3 text-xs font-black text-violet-500 uppercase tracking-[0.2em] border-b border-violet-500/10 pb-3">
                      <Sparkles size={16} /> Strengths & Weaknesses
                    </h3>
                    <div className="space-y-3">
                      {character.strengths && (
                        <div>
                          <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Strengths</span>
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{character.strengths}</p>
                        </div>
                      )}
                      {character.weaknesses && (
                        <div>
                          <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Weaknesses</span>
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{character.weaknesses}</p>
                        </div>
                      )}
                      {!character.strengths && !character.weaknesses && (
                        <span className="text-xs text-slate-400 italic">No strengths or weaknesses defined.</span>
                      )}
                    </div>
                  </div>
                </section>

                {/* Narrative Sections */}
                <section className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="flex items-center gap-3 text-xs font-black text-emerald-500 uppercase tracking-[0.2em] border-b border-emerald-500/10 pb-3">
                      <BookOpen size={16} /> Extended Description
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-serif italic">
                      {character.description || 'No extended description available.'}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="flex items-center gap-3 text-xs font-black text-rose-500 uppercase tracking-[0.2em] border-b border-rose-500/10 pb-3">
                      <Activity size={16} /> Conflicts & Stakes
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {character.conflict || 'The narrative conflicts for this character have not yet been established.'}
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="flex items-center gap-3 text-xs font-black text-sky-500 uppercase tracking-[0.2em] border-b border-sky-500/10 pb-3">
                      <Globe size={16} /> Physical Features
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {character.physicalFeatures || 'No physical features described.'}
                    </p>
                  </div>
                </section>
              </div>

              {/* Tags/Keywords if any */}
              {character.aliases && character.aliases.length > 0 && (
                <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Known Aliases</h3>
                  <div className="flex flex-wrap gap-3">
                    {character.aliases.map(alias => (
                      <span key={alias} className="text-sm font-bold text-slate-900 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl">
                        {alias}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </main>

            <footer className="px-10 py-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
               <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-widest">
                  <Sparkles size={14} /> Narrative Synchronized
               </div>
               <button 
                onClick={() => setShowModal(false)}
                className="px-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 transition-all shadow-xl shadow-slate-900/10 dark:shadow-white/5"
               >
                Close Dossier
               </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
};

const DetailItem = ({ label, value }: { label: string, value?: any }) => (
  <div className="space-y-1">
    <span className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{label}</span>
    <span className="text-xs font-bold text-slate-900 dark:text-slate-200 block truncate" title={value?.toString()}>
      {value || 'Unknown'}
    </span>
  </div>
);
