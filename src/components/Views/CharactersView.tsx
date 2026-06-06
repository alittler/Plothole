import React, { useState } from 'react';
import { ProjectData, Character } from '../../types';
import { Users, Plus, Edit2, Trash2 } from 'lucide-react';

interface CharactersViewProps {
  data: ProjectData;
  onUpdateCharacter: (c: Character) => void;
  onAddCharacter?: (c: Character) => void;
  onDeleteCharacter?: (id: string) => void;
  onLinkClick?: (type: string, id: string) => void;
}

export const CharactersView: React.FC<CharactersViewProps> = ({
  data,
  onUpdateCharacter,
  onAddCharacter,
  onDeleteCharacter,
  onLinkClick
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Character>>({});

  const characters = data.characters || [];

  const handleEdit = (char: Character) => {
    setEditingId(char.id);
    setEditValues(char);
  };

  const handleSave = () => {
    if (editingId && editValues) {
      onUpdateCharacter({
        ...editValues,
        id: editingId
      } as Character);
      setEditingId(null);
      setEditValues({});
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20">
        <div className="px-8 py-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Users size={32} className="text-indigo-600" />
              <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">Characters</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{characters.length} character{characters.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            {onAddCharacter && (
              <button
                onClick={() => {
                  const newChar: Character = {
                    id: `char-${Date.now()}`,
                    name: 'New Character',
                    role: 'Character',
                    tier: 1,
                    aliases: [],
                    traits: [],
                    motivation: '',
                    description: '',
                    physical_description: '',
                    source: 'manual',
                    field_notes: []
                  };
                  onAddCharacter(newChar);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition"
              >
                <Plus size={16} /> Add Character
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {characters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <Users size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 mb-2">No characters yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500">Import a manuscript to extract characters</p>
          </div>
        ) : (
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto w-full">
            {characters.map(char => (
              <div
                key={char.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow"
              >
                {editingId === char.id ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={editValues.name || ''}
                      onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold"
                      placeholder="Character name"
                    />
                    <input
                      type="text"
                      value={editValues.role || ''}
                      onChange={(e) => setEditValues({ ...editValues, role: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                      placeholder="Role"
                    />
                    <textarea
                      value={editValues.description || ''}
                      onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                      placeholder="Description"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 px-3 py-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 text-slate-900 dark:text-white text-sm font-bold rounded-lg transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">{char.name}</h3>
                      {char.role && (
                        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mt-1">
                          {char.role}
                        </p>
                      )}
                    </div>

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

                    {char.description && (
                      <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
                        {char.description}
                      </p>
                    )}

                    {char.traits && char.traits.length > 0 && (
                      <div className="mb-4">
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

                    <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <button
                        onClick={() => handleEdit(char)}
                        className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg transition flex items-center justify-center gap-1"
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                      {onDeleteCharacter && (
                        <button
                          onClick={() => onDeleteCharacter(char.id)}
                          className="px-3 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 text-sm font-semibold rounded-lg transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
