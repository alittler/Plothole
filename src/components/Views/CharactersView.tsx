import React, { useState, useMemo } from 'react';
import { Users, Upload, ChevronRight, Download, Trash2, Plus } from 'lucide-react';
import YAML from 'js-yaml';
import { ViewHeader } from '../Layout/ViewHeader';
import { getGlobalTemplate, createPHolePackage, parsePHolePackage, generateBlankCharacter } from '../../services/characterTemplateService';
import { saveAs } from 'file-saver';

interface RenderingField {
  key: string;
  type: 'text' | 'rich_text' | 'bullet_points' | 'list' | 'location_link' | 'number' | 'date' | 'tags' | 'title' | 'subtitle' | 'badge';
  label?: string;
  tab?: string;
  description?: string;
}

interface RenderingTab {
  tab: string;
  fields: RenderingField[];
}

interface RenderingSchema {
  version?: string;
  layout?: RenderingTab[];
  tabs?: RenderingTab[];
  character_name_field?: string;
}

interface CharacterRecord {
  id: string;
  data: Record<string, any>;
  templateYaml: string;
}

interface CharactersViewProps {
  data?: any;
  onUpdateCharacter?: (c: any) => void;
  onAddCharacter?: (c: any) => void;
  onDeleteCharacter?: (id: any) => void;
  onClearCharacters?: () => void;
  onLinkClick?: (type: string, id: string) => void;
  fetchWithAuth?: (url: string, options?: RequestInit) => Promise<Response>;
}

export const CharactersView: React.FC<CharactersViewProps> = ({
  data,
  onUpdateCharacter,
  onAddCharacter,
  onDeleteCharacter,
  onClearCharacters,
  onLinkClick,
  fetchWithAuth,
}) => {
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});

  const globalTemplate = getGlobalTemplate();
  
  const renderingSchema = useMemo(() => {
    try {
      const parsed = YAML.load(globalTemplate) as RenderingSchema;
      if (!parsed?.layout) return { layout: [] };
      return parsed;
    } catch {
      return { layout: [] };
    }
  }, [globalTemplate]);

  const handleDataUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const newCharacter: CharacterRecord = {
        id: `${Date.now()}-${Math.random()}`,
        data,
        templateYaml: globalTemplate,
      };

      setCharacters([...characters, newCharacter]);
      event.target.value = '';
    } catch (err) {
      alert(`Failed to parse data.json: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handlePHoleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const { manifest, rendering, data } = await parsePHolePackage(file);

      const newCharacter: CharacterRecord = {
        id: `${Date.now()}-${Math.random()}`,
        data,
        templateYaml: rendering,
      };

      setCharacters([...characters, newCharacter]);
      event.target.value = '';
    } catch (err) {
      alert(`Failed to parse .phole file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleExportPHole = async (charId: string) => {
    const character = characters.find(c => c.id === charId);
    if (!character) return;

    try {
      const characterName = character.data.name || 'Unknown Character';
      const blob = await createPHolePackage(
        character.data,
        character.templateYaml,
        characterName,
        `char.${charId.split('-')[0]}`,
        '1.0.0'
      );

      saveAs(blob, `${characterName.replace(/\s+/g, '_')}.phole`);
    } catch (err) {
      alert(`Failed to export: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDeleteCharacter = (id: string) => {
    setCharacters(characters.filter(c => c.id !== id));
    if (expandedId === id) setExpandedId(null);
    if (editingId === id) setEditingId(null);
  };

  const handleEditStart = (character: CharacterRecord) => {
    setEditingId(character.id);
    setEditData({ ...character.data });
  };

  const handleEditSave = (charId: string) => {
    setCharacters(
      characters.map(c =>
        c.id === charId ? { ...c, data: editData } : c
      )
    );
    setEditingId(null);
    setEditData({});
  };

  const handleCreateNewCharacter = () => {
    const blankData = generateBlankCharacter(globalTemplate);
    const newCharacter: CharacterRecord = {
      id: `${Date.now()}-${Math.random()}`,
      data: blankData,
      templateYaml: globalTemplate,
    };
    setCharacters([newCharacter, ...characters]);
    setExpandedId(newCharacter.id);
    setEditingId(newCharacter.id);
    setEditData(blankData);
  };

  const filteredCharacters = characters.filter(char =>
    (char.data.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <ViewHeader
        icon={Users}
        title="Characters"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search characters..."
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-8 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-4 flex-wrap">
          <button
            onClick={handleCreateNewCharacter}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold text-sm"
          >
            <Plus size={18} />
            New Character
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer font-semibold text-sm">
            <Upload size={18} />
            Upload data.json
            <input
              type="file"
              accept=".json"
              onChange={handleDataUpload}
              className="hidden"
            />
          </label>
          <label className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-colors cursor-pointer font-semibold text-sm">
            <Upload size={18} />
            Upload .phole
            <input
              type="file"
              accept=".phole"
              onChange={handlePHoleUpload}
              className="hidden"
            />
          </label>
          {characters.length > 0 && (
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {characters.length} character{characters.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {filteredCharacters.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Users size={48} className="mb-4 opacity-20" />
                <p className="font-serif italic text-lg">
                  {characters.length === 0
                    ? 'No characters yet. Upload data.json to get started.'
                    : 'No characters match your search.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredCharacters.map((character) => {
                  const characterName = character.data.name || 'Unknown Character';
                  const isExpanded = expandedId === character.id;
                  const isEditing = editingId === character.id;

                  return (
                    <div
                      key={character.id}
                      className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl transition-all group"
                    >
                      <div className="h-48 bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/30 dark:to-indigo-800/20 relative overflow-hidden flex items-center justify-center">
                        <Users size={64} className="text-indigo-300 dark:text-indigo-700" />
                      </div>

                      <div className="p-8 space-y-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.name || ''}
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            className="w-full text-2xl font-black bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-3 py-2"
                            placeholder="Character name"
                          />
                        ) : (
                          <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            {characterName}
                          </h3>
                        )}

                        {isExpanded && !isEditing && (
                          <div className="pt-4 space-y-6 border-t border-slate-100 dark:border-slate-800">
                            {renderingSchema.layout && renderingSchema.layout.length > 0 ? (
                              renderingSchema.layout.map((tab: RenderingTab, tabIdx) => (
                                <div key={`tab-${tabIdx}`}>
                                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                    {tab.tab}
                                  </h4>
                                  <div className="space-y-3">
                                    {tab.fields && tab.fields.map((field: RenderingField, fieldIdx) => (
                                      <div key={`field-${fieldIdx}`}>
                                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                                          {field.label || field.key}
                                        </span>
                                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                          {renderFieldValue(field, character.data[field.key])}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-slate-500 italic">No template defined</p>
                            )}
                          </div>
                        )}

                        {isEditing && (
                          <div className="pt-4 space-y-3 border-t border-slate-100 dark:border-slate-800">
                            <button
                              onClick={() => handleEditSave(character.id)}
                              className="w-full px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="w-full px-4 py-2 text-sm font-semibold bg-slate-400 text-white rounded-lg hover:bg-slate-500 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {!isEditing && (
                          <div className="pt-4 space-y-2 border-t border-slate-100 dark:border-slate-800">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : character.id)}
                              className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                              <ChevronRight
                                size={18}
                                className={`transition-all ${isExpanded ? 'rotate-90' : ''}`}
                              />
                            </button>
                            <button
                              onClick={() => handleEditStart(character)}
                              className="w-full px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleExportPHole(character.id)}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            >
                              <Download size={16} />
                              Export .phole
                            </button>
                            <button
                              onClick={() => handleDeleteCharacter(character.id)}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function renderFieldValue(field: RenderingField, value: any): React.ReactNode {
  if (value === null || value === undefined) return <span className="text-slate-400 italic">—</span>;

  switch (field.type) {
    case 'list':
    case 'tags':
      if (Array.isArray(value)) {
        return (
          <div className="flex flex-wrap gap-2">
            {value.map((item, idx) => (
              <span key={idx} className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded-full">
                {item}
              </span>
            ))}
          </div>
        );
      }
      return String(value);

    case 'bullet_points':
      if (Array.isArray(value)) {
        return (
          <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            {value.map((item, idx) => (
              <li key={idx}>• {item}</li>
            ))}
          </ul>
        );
      }
      return String(value);

    case 'badge':
      return <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full font-semibold">{value}</span>;

    case 'location_link':
      return <span className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">{value}</span>;

    case 'rich_text':
      return <div className="text-sm font-serif italic leading-relaxed">{value}</div>;

    case 'title':
      return <h4 className="text-lg font-bold text-slate-900 dark:text-white">{value}</h4>;

    case 'subtitle':
      return <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{value}</p>;

    case 'number':
      return <span>{Number(value)}</span>;

    case 'date':
      return <span>{new Date(value).toLocaleDateString()}</span>;

    default:
      return <span>{String(value)}</span>;
  }
}
