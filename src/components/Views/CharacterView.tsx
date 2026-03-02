import React, { useState } from 'react';
import { Character, Location, TimelineEvent, Artifact, Note, ManuscriptHistoryEntry, ViewType } from '../../types';
import { Plus, User, Search, Filter, Sparkles, Edit2, Trash2, Camera } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface CharacterViewProps {
  projectTitle: string;
  characters: Character[];
  locations: Location[];
  timeline: TimelineEvent[];
  artifacts: Artifact[];
  themes: string[];
  notes: Note[];
  manuscriptHistory: ManuscriptHistoryEntry[];
  onUpdateCharacter: (c: Character) => void;
  onAddCharacter: (c: Character) => void;
  onLinkClick: (type: string, id: string) => void;
  characterLimit?: number;
  onChangeView: (view: ViewType) => void;
  onExtractThemesFromNotes: () => void;
  isExtractingThemes: boolean;
}

export const CharacterView: React.FC<CharacterViewProps> = ({
  characters, onAddCharacter, onUpdateCharacter
}) => {
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCharacters = characters.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = () => {
    if (editingCharacter) {
      onUpdateCharacter(editingCharacter);
      setEditingCharacter(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">DRAMATIS PERSONAE</h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Manage the souls that inhabit your story.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Find a character..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={() => onAddCharacter({ id: Math.random().toString(), name: 'New Character', role: 'Protagonist', description: '', traits: [], source: 'manual' })}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
            >
              <Plus size={18} />
              Add Character
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCharacters.map(char => (
              <div key={char.id} className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden group hover:shadow-md transition-all">
                <div className="h-48 bg-slate-100 dark:bg-slate-800 relative">
                  {char.imageUrl ? (
                    <img src={char.imageUrl} className="w-full h-full object-cover" alt={char.name} referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <User size={64} />
                    </div>
                  )}
                  <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 backdrop-blur-md text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                    {char.role}
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button 
                      onClick={() => setEditingCharacter(char)}
                      className="p-3 bg-white text-slate-900 rounded-full hover:scale-110 transition-transform"
                    >
                      <Edit2 size={20} />
                    </button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">{char.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{char.description || 'No description provided.'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
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
        </div>
      </div>

      <Modal
        isOpen={!!editingCharacter}
        onClose={() => setEditingCharacter(null)}
        title="Edit Character"
        footer={
          <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">
            Save Changes
          </button>
        }
      >
        {editingCharacter && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Name</label>
                <input
                  type="text"
                  value={editingCharacter.name}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Role</label>
                <input
                  type="text"
                  value={editingCharacter.role}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, role: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Description</label>
              <textarea
                value={editingCharacter.description}
                onChange={(e) => setEditingCharacter({ ...editingCharacter, description: e.target.value })}
                className="w-full h-32 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Traits (comma separated)</label>
              <input
                type="text"
                value={editingCharacter.traits.join(', ')}
                onChange={(e) => setEditingCharacter({ ...editingCharacter, traits: e.target.value.split(',').map(t => t.trim()) })}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Image URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editingCharacter.imageUrl || ''}
                  onChange={(e) => setEditingCharacter({ ...editingCharacter, imageUrl: e.target.value })}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://..."
                />
                <button className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-indigo-500 transition-colors">
                  <Camera size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
