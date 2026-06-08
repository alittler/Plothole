import React, { useState } from 'react';
import { ProjectData, Character } from '../../types';
import { Users, Plus, Edit2, Trash2, Sparkles, Loader2, Image as ImageIcon } from 'lucide-react';

interface CharactersViewProps {
  data: ProjectData;
  onUpdateCharacter: (c: Character) => void;
  onAddCharacter?: (c: Character) => void;
  onDeleteCharacter?: (id: string) => void;
  onLinkClick?: (type: string, id: string) => void;
  fetchWithAuth?: (url: string, options?: RequestInit) => Promise<Response>;
}

export const CharactersView: React.FC<CharactersViewProps> = ({
  data,
  onUpdateCharacter,
  onAddCharacter,
  onDeleteCharacter,
  onLinkClick,
  fetchWithAuth
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Character>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedEditMode, setExpandedEditMode] = useState(false);
  const [expandedEditValues, setExpandedEditValues] = useState<Partial<Character>>({});
  const [notesTab, setNotesTab] = useState(false);
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null);

  const characters = data.characters || [];

  const handleGenerateImage = async (char: Character) => {
    if (!fetchWithAuth || !char.physical_description) return;
    
    setGeneratingImageId(char.id);
    try {
      const prompt = `A cinematic, detailed portrait of a character from a story. Physical description: ${char.physical_description}. Artistic style: High-quality illustration, fantasy/literary atmosphere.`;
      
      const response = await fetchWithAuth('/api/narrative/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          characterId: char.id,
          characterName: char.name
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }
      
      const result = await response.json();
      if (result.url) {
        onUpdateCharacter({
          ...char,
          images: [{ url: result.url }]
        });
      }
    } catch (err) {
      console.error('Image generation error:', err);
      alert('Failed to generate character image. Check your API configuration.');
    } finally {
      setGeneratingImageId(null);
    }
  };

  const handleEdit = (char: Character) => {
    setEditingId(char.id);
    setEditValues(char);
  };

  const handleSave = () => {
    if (editingId && editValues) {
      const char = characters.find(c => c.id === editingId);
      if (char) {
        // Merge edited values with original character to preserve all fields
        onUpdateCharacter({
          ...char,
          ...editValues,
          id: editingId
        } as Character);
        setEditingId(null);
        setEditValues({});
      }
    }
  };

  const handleExpandedEdit = (char: Character) => {
    setExpandedEditMode(true);
    setExpandedEditValues(char);
  };

  const handleExpandedSave = () => {
    const char = characters.find(c => c.id === expandedId);
    if (char) {
      // Merge edited values with original character to preserve all fields
      onUpdateCharacter({
        ...char,
        ...expandedEditValues,
        id: expandedId
      } as Character);
      setExpandedEditMode(false);
      setExpandedEditValues({});
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
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow flex flex-col"
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
                  <div className="flex gap-6 h-full">
                    {/* Left: Content */}
                    <div className="flex-1 flex flex-col min-w-0">
                      {/* Card Header */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-black text-slate-900 dark:text-white truncate" title={char.name}>{char.name}</h3>
                          {char.tier === 1 && (
                            <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[8px] font-black uppercase tracking-widest rounded">Tier 1</span>
                          )}
                        </div>
                        {char.role && (
                          <p className="text-sm text-slate-600 dark:text-slate-300 truncate">
                            {char.role}
                          </p>
                        )}
                      </div>

                      {/* Description Section */}
                      {char.description && (
                        <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                            Description
                          </p>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-3">
                            {char.description}
                          </p>
                        </div>
                      )}

                      {/* Goals Section */}
                      {char.motivation && (
                        <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-800 flex-grow min-h-0">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                            Goals
                          </p>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-3">
                            {char.motivation}
                          </p>
                        </div>
                      )}

                      {/* Show More Details Button */}
                      <div className="flex gap-2 mb-4 mt-auto">
                        <button
                          onClick={() => setExpandedId(char.id)}
                          className="flex-1 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/10 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                        >
                          Details
                        </button>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button
                          onClick={() => handleEdit(char)}
                          className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        {onDeleteCharacter && (
                          <button
                            onClick={() => onDeleteCharacter(char.id)}
                            className="px-3 py-2 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Right: Image (for Tier 1) */}
                    {char.tier === 1 && (
                      <div className="w-32 shrink-0 flex flex-col gap-3">
                        <div className="aspect-[3/4] rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 overflow-hidden relative group">
                          {char.images && char.images[0]?.url ? (
                            <>
                              <img 
                                src={char.images[0].url} 
                                alt={char.name} 
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={() => handleGenerateImage(char)}
                                disabled={generatingImageId === char.id}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              >
                                {generatingImageId === char.id ? (
                                  <Loader2 size={24} className="text-white animate-spin" />
                                ) : (
                                  <Sparkles size={24} className="text-white" />
                                )}
                              </button>
                            </>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                              {generatingImageId === char.id ? (
                                <Loader2 size={24} className="text-indigo-600 animate-spin mb-2" />
                              ) : (
                                <ImageIcon size={24} className="text-slate-300 dark:text-slate-700 mb-2" />
                              )}
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-tight">
                                {generatingImageId === char.id ? 'Generating...' : 'No Image'}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {!char.images?.[0]?.url && (
                          <button
                            onClick={() => handleGenerateImage(char)}
                            disabled={generatingImageId === char.id || !char.physical_description}
                            className="w-full py-2 bg-indigo-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
                            title={!char.physical_description ? 'Missing physical description' : ''}
                          >
                            {generatingImageId === char.id ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <Sparkles size={10} />
                            )}
                            Visualize
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expanded Details Modal */}
      {expandedId && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto my-8">
            {characters.find(c => c.id === expandedId) && (
              <div>
                {(() => {
                  const char = characters.find(c => c.id === expandedId)!;
                  const displayChar = expandedEditMode ? expandedEditValues : char;
                  
                  return (
                    <>
                      {/* Header */}
                      <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 flex justify-between items-start">
                        <div>
                          {expandedEditMode ? (
                            <input
                              type="text"
                              value={expandedEditValues.name || ''}
                              onChange={(e) => setExpandedEditValues({ ...expandedEditValues, name: e.target.value })}
                              className="text-3xl font-black text-slate-900 dark:text-white w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg mb-2"
                            />
                          ) : (
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white">{displayChar.name}</h2>
                          )}
                          {displayChar.role && (
                            expandedEditMode ? (
                              <input
                                type="text"
                                value={expandedEditValues.role || ''}
                                onChange={(e) => setExpandedEditValues({ ...expandedEditValues, role: e.target.value })}
                                className="text-base text-slate-600 dark:text-slate-300 mt-2 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                              />
                            ) : (
                              <p className="text-base text-slate-600 dark:text-slate-300 mt-2">
                                {displayChar.role}
                              </p>
                            )
                          )}
                        </div>
                        <div className="flex gap-2">
                          {expandedEditMode ? (
                            <>
                              <button
                                onClick={handleExpandedSave}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setExpandedEditMode(false)}
                                className="px-4 py-2 bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg font-semibold"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleExpandedEdit(char)}
                              className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg font-semibold"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setExpandedId(null);
                              setExpandedEditMode(false);
                            }}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Tabs */}
                      <div className="border-b border-slate-200 dark:border-slate-800 flex bg-slate-50 dark:bg-slate-950 sticky top-20">
                        <button
                          onClick={() => setNotesTab(false)}
                          className={`flex-1 px-6 py-3 font-semibold text-sm transition ${
                            !notesTab
                              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                              : 'text-slate-600 dark:text-slate-400 border-b-2 border-transparent'
                          }`}
                        >
                          Profile
                        </button>
                        <button
                          onClick={() => setNotesTab(true)}
                          className={`flex-1 px-6 py-3 font-semibold text-sm transition ${
                            notesTab
                              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                              : 'text-slate-600 dark:text-slate-400 border-b-2 border-transparent'
                          }`}
                        >
                          Notes & Edits
                        </button>
                      </div>

                      {/* Content */}
                      <div className="p-8">
                        {notesTab ? (
                          // Notes Tab
                          <div className="space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                              <p className="text-sm text-blue-800 dark:text-blue-300">
                                💡 <strong>Notes & Edits:</strong> Use this space to collect thoughts, references, and changes about this character as you develop their story.
                              </p>
                            </div>
                            <textarea
                              value={expandedEditValues.description || displayChar.description || ''}
                              onChange={(e) => setExpandedEditValues({ ...expandedEditValues, description: e.target.value })}
                              placeholder="Add your notes and edits here..."
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm min-h-96 font-mono"
                              disabled={!expandedEditMode}
                            />
                            {!expandedEditMode && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                                Click "Edit" at the top to add or modify notes.
                              </p>
                            )}
                          </div>
                        ) : (
                          // Profile Tab
                          <div className="space-y-6">
                            {displayChar.tier && (
                              <div>
                                <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                                  displayChar.tier === 1 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                                  displayChar.tier === 2 ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' :
                                  'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                                }`}>
                                  Tier {displayChar.tier}
                                </span>
                              </div>
                            )}

                            {/* Description */}
                            {displayChar.description || expandedEditMode ? (
                              <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                                  Description
                                </p>
                                {expandedEditMode ? (
                                  <textarea
                                    value={expandedEditValues.description || ''}
                                    onChange={(e) => setExpandedEditValues({ ...expandedEditValues, description: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm min-h-24"
                                  />
                                ) : (
                                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                    {displayChar.description}
                                  </p>
                                )}
                              </div>
                            ) : null}

                            {/* Goals & Motivation */}
                            {displayChar.motivation || expandedEditMode ? (
                              <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                                  Goals & Motivation
                                </p>
                                {expandedEditMode ? (
                                  <textarea
                                    value={expandedEditValues.motivation || ''}
                                    onChange={(e) => setExpandedEditValues({ ...expandedEditValues, motivation: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm min-h-24"
                                  />
                                ) : (
                                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                    {displayChar.motivation}
                                  </p>
                                )}
                              </div>
                            ) : null}

                            {/* Physical Description */}
                            {displayChar.physical_description || expandedEditMode ? (
                              <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                                  Physical Description
                                </p>
                                {expandedEditMode ? (
                                  <textarea
                                    value={expandedEditValues.physical_description || ''}
                                    onChange={(e) => setExpandedEditValues({ ...expandedEditValues, physical_description: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm min-h-24"
                                  />
                                ) : (
                                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                    {displayChar.physical_description}
                                  </p>
                                )}
                              </div>
                            ) : null}

                            {/* Aliases */}
                            {(displayChar.aliases && displayChar.aliases.length > 0) || expandedEditMode ? (
                              <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                                  Aliases
                                </p>
                                {expandedEditMode ? (
                                  <textarea
                                    value={(expandedEditValues.aliases || []).join(', ')}
                                    onChange={(e) => setExpandedEditValues({ ...expandedEditValues, aliases: e.target.value.split(',').map(a => a.trim()) })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                                    placeholder="Separate aliases with commas"
                                  />
                                ) : (
                                  <p className="text-sm text-slate-700 dark:text-slate-300">
                                    {displayChar.aliases?.join(', ')}
                                  </p>
                                )}
                              </div>
                            ) : null}

                            {/* Traits */}
                            {(displayChar.traits && displayChar.traits.length > 0) && (
                              <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
                                  Traits
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {displayChar.traits.map((trait, i) => (
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

                            {/* Analysis Details */}
                            {displayChar.field_notes && displayChar.field_notes.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
                                  Analysis Details
                                </p>
                                <div className="space-y-2">
                                  {displayChar.field_notes.map((note, i) => (
                                    <p key={i} className="text-sm text-slate-600 dark:text-slate-400">
                                      <span className="font-semibold">{note.label}:</span> {note.value}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      {!expandedEditMode && !notesTab && (
                        <div className="border-t border-slate-200 dark:border-slate-800 p-6 bg-slate-50 dark:bg-slate-950 flex gap-2">
                          {onDeleteCharacter && (
                            <button
                              onClick={() => {
                                onDeleteCharacter(char.id);
                                setExpandedId(null);
                              }}
                              className="px-4 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 text-sm font-semibold rounded-lg transition"
                            >
                              <Trash2 size={16} className="inline mr-2" />
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
