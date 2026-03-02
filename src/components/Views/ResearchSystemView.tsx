import React from 'react';
import { ViewType, Note, ProjectData } from '../../types';
import { Plus, Search, Trash2, Sparkles } from 'lucide-react';
import { StackedPaper } from '../ui/StackedPaper';

interface ResearchSystemViewProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  data: ProjectData & { notes: Note[] };
  onAddNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onLinkClick: (type: string, id: string) => void;
  onAddDoubleProcessedNote: (text: string) => void;
  activeTasks: string[];
}

export const ResearchSystemView: React.FC<ResearchSystemViewProps> = ({
  data, onAddNote, onDeleteNote, onAddDoubleProcessedNote, activeTasks
}) => {
  const [newNote, setNewNote] = React.useState('');

  const handleAdd = () => {
    if (!newNote.trim()) return;
    onAddDoubleProcessedNote(newNote);
    setNewNote('');
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">RESEARCH & NOTES</h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search notes..."
                className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <StackedPaper className="space-y-4">
            <div className="p-6 relative z-20">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Jot down a thought, a name, or a plot point..."
                className="w-full h-32 bg-transparent border-none focus:ring-0 text-lg resize-none text-slate-800 dark:text-slate-200"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">AI will automatically expand and tag your note.</span>
                <button
                  onClick={handleAdd}
                  disabled={!newNote.trim() || activeTasks.includes('double-process')}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  <Sparkles size={18} className={activeTasks.includes('double-process') ? 'animate-spin' : ''} />
                  {activeTasks.includes('double-process') ? 'Processing...' : 'Save Note'}
                </button>
              </div>
            </div>
          </StackedPaper>

          <div className="grid grid-cols-1 gap-8">
            {data.notes.map(note => (
              <StackedPaper key={note.id} className="group">
                <div className="p-6 relative z-20">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex flex-wrap gap-2">
                      {note.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-[10px] font-black uppercase tracking-widest">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button onClick={() => onDeleteNote(note.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 mb-4 font-serif text-lg leading-relaxed">{note.content}</p>
                  {note.expandedContent && (
                    <div className="mt-4 pt-4 border-t border-slate-900/10">
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-2">AI Expansion</span>
                      <p className="text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed">{note.expandedContent}</p>
                    </div>
                  )}
                  <div className="mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {new Date(note.timestamp).toLocaleString()}
                  </div>
                </div>
              </StackedPaper>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
