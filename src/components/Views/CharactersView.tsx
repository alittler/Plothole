import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProjectData, Character, HierarchicalEntity } from '../../types';
import { Users, Code, Plus } from 'lucide-react';
import { CardActions } from '../ui/CardActions';
import { WikiText } from '../ui/WikiText';
import { EntityEditModal } from '../ui/EntityEditModal';
import { generateId } from '../../services/storageService';

interface CharactersViewProps {
  data: ProjectData;
  onUpdateCharacter: (c: Character) => void;
  onAddCharacter?: (c: Character) => void;
  onDeleteCharacter?: (id: string) => void;
  onLinkClick?: (type: string, id: string) => void;
}

enum CharacterTab {
  CARDS = 'Cards',
  JSON = 'JSON Data'
}

export const CharactersView: React.FC<CharactersViewProps> = ({
  data,
  onUpdateCharacter,
  onAddCharacter,
  onDeleteCharacter,
  onLinkClick
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') as CharacterTab) || CharacterTab.CARDS;
  const setActiveTab = (tab: CharacterTab) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    router.push(`?${params.toString()}`);
  };

  const [expandedCharId, setExpandedCharId] = useState<string | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);

  const characters = data.characters || [];

  const handleDeleteCharacter = (id: string) => {
    if (onDeleteCharacter) {
      onDeleteCharacter(id);
    }
  };

  const handleSaveCharacter = (updatedEntity: HierarchicalEntity) => {
    if (onUpdateCharacter && editingCharacter) {
      const updatedCharacter: Character = {
        ...editingCharacter,
        ...updatedEntity,
        field_notes: updatedEntity.fieldNotes || editingCharacter.field_notes || [],
      } as any as Character;
      
      onUpdateCharacter(updatedCharacter);
    }
    setEditingCharacter(null);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 ph-container">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20 ph-header">
        <div className="px-4 md:px-8 py-4 md:py-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0 hidden sm:block">
              <h1 className="ph-section-title text-2xl md:text-3xl flex items-center gap-3">
                <Users size={32} className="text-indigo-600" /> Characters
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => onAddCharacter?.({
                  id: generateId(),
                  name: 'New Character',
                  role: 'Supporting Character',
                  tier: 3,
                  description: '',
                  motivation: '',
                  traits: [],
                  field_notes: [],
                  physical_description: '',
                  aliases: []
                } as any as Character)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs uppercase tracking-widest transition shadow-lg shadow-indigo-600/20 flex items-center gap-2"
              >
                <Plus size={16} /> Add Character
              </button>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                {characters.length} {characters.length === 1 ? 'character' : 'characters'}
              </div>
            </div>

          </div>
          <div className="ph-tab-container overflow-x-auto no-scrollbar flex items-center gap-2">
            <div className="sm:hidden flex items-center gap-2 shrink-0">
              <Users size={24} className="text-indigo-600" />
            </div>
            {Object.values(CharacterTab).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`ph-tab ${activeTab === tab ? "ph-tab-active" : "ph-tab-inactive"}`}
                title={tab}
              >
                {tab === CharacterTab.CARDS && <Users size={14} />}
                {tab === CharacterTab.JSON && <Code size={14} />}
                <span className="hidden sm:inline">{tab}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-0 md:p-8 custom-scrollbar">
        <div className="max-w-6xl mx-auto px-4 md:px-0 pt-8 md:pt-0 min-h-full pb-40">
          {activeTab === CharacterTab.CARDS && (
            <>
              {characters.length === 0 ? (
                <div className="text-center py-20">
                  <Users size={48} className="mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500 dark:text-slate-400 mb-4">No characters found. Upload a manuscript to extract characters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {characters.map(char => (
                    <div
                      key={char.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-black text-slate-900 dark:text-white">{char.name}</h3>
                          {char.role && (
                            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mt-1">
                              {char.role}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Tier Badge */}
                      {char.tier && (
                        <div className="mb-3">
                          <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                            char.tier === 1 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                            char.tier === 2 ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' :
                            'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                          }`}>
                            Tier {char.tier}
                          </span>
                        </div>
                      )}

                      {/* Description */}
                      {char.description && (
                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
                          <WikiText text={char.description} projectData={data} onLinkClick={onLinkClick} />
                        </p>
                      )}

                      {/* Physical Description */}
                      {char.physical_description && (
                        <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                            Physical Appearance
                          </p>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            <WikiText text={char.physical_description} projectData={data} onLinkClick={onLinkClick} />
                          </p>
                        </div>
                      )}

                      {/* Traits */}
                      {char.traits && char.traits.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                            Traits
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {char.traits.map((trait, i) => (
                              <span
                                key={i}
                                className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full font-medium"
                              >
                                {trait}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Motivation */}
                      {char.motivation && (
                        <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
                            Motivation
                          </p>
                          <p className="text-sm text-slate-700 dark:text-slate-300">
                            <WikiText text={char.motivation} projectData={data} onLinkClick={onLinkClick} />
                          </p>
                        </div>
                      )}

                      {/* Aliases */}
                      {char.aliases && char.aliases.length > 0 && (
                        <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                            Also Known As
                          </p>
                          <div className="space-y-1">
                            {char.aliases.map((alias, i) => (
                              <p key={i} className="text-sm text-slate-600 dark:text-slate-400">
                                • {alias}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Affiliation */}
                      {char.affiliation && (
                        <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
                            Affiliation
                          </p>
                          <p className="text-sm text-slate-700 dark:text-slate-300">
                            <WikiText text={char.affiliation} projectData={data} onLinkClick={onLinkClick} />
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2">
                        <button
                          onClick={() => setExpandedCharId(expandedCharId === char.id ? null : char.id)}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 uppercase tracking-widest"
                        >
                          {expandedCharId === char.id ? 'Hide' : 'Show'} JSON
                        </button>
                        {(onLinkClick || onDeleteCharacter) && (
                          <CardActions
                            itemName={char.name}
                            onEdit={() => setEditingCharacter(char)}
                            onDelete={() => handleDeleteCharacter(char.id)}
                          />
                        )}
                      </div>

                      {/* Expanded JSON */}
                      {expandedCharId === char.id && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                          <pre className="bg-slate-900 dark:bg-slate-950 text-emerald-400 p-3 rounded-lg text-xs overflow-x-auto max-h-64 overflow-y-auto font-mono">
                            {JSON.stringify(char, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === CharacterTab.JSON && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Code size={20} /> Raw Character Data
                </h2>
                <pre className="bg-slate-900 dark:bg-slate-950 text-emerald-400 p-4 rounded-lg text-xs overflow-x-auto max-h-96 overflow-y-auto font-mono leading-relaxed">
                  {JSON.stringify(characters, null, 2)}
                </pre>
              </div>

              {/* Field Reference */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
                <h3 className="text-sm font-black text-blue-900 dark:text-blue-200 mb-4 uppercase tracking-widest">
                  Field Reference
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-blue-800 dark:text-blue-300">
                  <div>
                    <p className="font-semibold mb-1">Core Fields:</p>
                    <ul className="space-y-1 text-xs opacity-80">
                      <li>• <span className="font-mono">id</span>: Unique identifier</li>
                      <li>• <span className="font-mono">name</span>: Character's name</li>
                      <li>• <span className="font-mono">role</span>: Story role (protagonist, etc.)</li>
                      <li>• <span className="font-mono">tier</span>: Importance (1-3)</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Details:</p>
                    <ul className="space-y-1 text-xs opacity-80">
                      <li>• <span className="font-mono">traits</span>: Array of character traits</li>
                      <li>• <span className="font-mono">motivation</span>: Primary goal</li>
                      <li>• <span className="font-mono">description</span>: Appearance & personality</li>
                      <li>• <span className="font-mono">aliases</span>: Other names</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {editingCharacter && (
        <EntityEditModal
          entity={{
            ...editingCharacter,
            fieldNotes: editingCharacter.field_notes
          } as HierarchicalEntity}
          isOpen={!!editingCharacter}
          onClose={() => setEditingCharacter(null)}
          onSave={handleSaveCharacter}
          onDelete={() => {
            handleDeleteCharacter(editingCharacter.id);
            setEditingCharacter(null);
          }}
        />
      )}
    </div>
  );
};
