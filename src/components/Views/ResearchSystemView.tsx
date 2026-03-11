import React from 'react';
import { ViewType, Note, ProjectData, ProjectMetadata, User } from '../../types';
import { Plus, Search, Trash2, Sparkles, Zap, Loader2, X, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import { StackedPaper } from '../ui/StackedPaper';
import { WikiText } from '../ui/WikiText';
import { semanticSearchNotes } from '../../services/geminiService';
import { generateId } from '../../services/storageService';

interface ResearchSystemViewProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  data: ProjectData & { notes: Note[] };
  projectsMetadata?: ProjectMetadata[];
  currentUser?: User;
  onAddNote: (note: Note) => void;
  onAddIdeaToProject?: (projectId: string, content: string, tags: string[]) => void;
  onToggleCanon?: (noteId: string, isCanon: boolean) => void;
  onDeleteNote: (id: string) => void;
  onDeleteAllNotes?: () => void;
  onLinkClick: (type: string, id: string) => void;
  onAddDoubleProcessedNote: (text: string) => void;
  onUpdateProject?: (data: Partial<ProjectData>) => void;
  activeTasks: string[];
  semanticSearchEnabled?: boolean;
  isEmbedded?: boolean;
}

export const ResearchSystemView: React.FC<ResearchSystemViewProps> = ({
  currentView, onChangeView, data, projectsMetadata, currentUser, onAddNote, onAddIdeaToProject, onToggleCanon, onDeleteNote, onDeleteAllNotes, onLinkClick, onAddDoubleProcessedNote, activeTasks, onUpdateProject, semanticSearchEnabled, isEmbedded
}) => {
  const [newNote, setNewNote] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [semanticResults, setSemanticResults] = React.useState<string[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showTagSuggestion, setShowTagSuggestion] = React.useState(false);
  const [noteToDelete, setNoteToDelete] = React.useState<string | null>(null);

  // Automatically sync canonized notes to ledger if onUpdateProject is provided
  React.useEffect(() => {
    if (!onUpdateProject) return;
    
    // Combine global and project notes to find canonized ones
    const allNotes = [...(data.notes || []), ...(data.ideas || [])];
    const canonizedNotes = allNotes.filter(n => n.isCanon);
    const currentLedger = data.ledger || [];
    
    let needsUpdate = false;
    const newLedger: Note[] = [];

    // 1. Keep existing ledger notes, update them, or remove them
    for (const ledgerNote of currentLedger) {
      const activeNote = allNotes.find(n => n.id === ledgerNote.id);
      if (activeNote) {
        if (activeNote.isCanon) {
          // Still canon, keep it (and update content if needed)
          newLedger.push(activeNote);
          if (activeNote.content !== ledgerNote.content) needsUpdate = true;
        } else {
          // Un-canonized, remove it
          needsUpdate = true;
        }
      } else {
        // Deleted! Remove it from ledger as well
        needsUpdate = true;
      }
    }

    // 2. Add any new canonized notes that aren't in the ledger yet
    for (const canonNote of canonizedNotes) {
      if (!newLedger.some(n => n.id === canonNote.id)) {
        newLedger.push(canonNote);
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      // Sort by timestamp descending
      newLedger.sort((a, b) => b.timestamp - a.timestamp);
      onUpdateProject({ ledger: newLedger });
    }
  }, [data.notes, data.ideas, data.ledger, onUpdateProject]);

  const handleAdd = () => {
    if (!newNote.trim()) return;
    const tags = newNote.match(/#\w+/g)?.map(t => t.slice(1)) || [];
    
    // Check for book tags to route to Ideas
    if (onAddIdeaToProject) {
      const currentProjectTag = (data.shortName || data.title || '').replace(/[^\w\s]/g, '').replace(/\s+/g, '_').toLowerCase();
      if (tags.some(t => t.toLowerCase() === currentProjectTag) && data.id) {
        onAddIdeaToProject(data.id, newNote, tags);
      }
    }

    onAddNote({
      id: generateId(),
      content: newNote,
      tags,
      timestamp: Date.now()
    });
    setNewNote('');
    setShowTagSuggestion(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewNote(value);
    
    const lastChar = value[value.length - 1];
    if (lastChar === '#') {
      setShowTagSuggestion(true);
    } else if (!value.includes('#') || value.endsWith(' ')) {
      setShowTagSuggestion(false);
    }
  };

  const applyTagSuggestion = () => {
    const projectTag = (data.shortName || data.title || 'Project').replace(/[^\w\s]/g, '').replace(/\s+/g, '_');
    const lastHashIndex = newNote.lastIndexOf('#');
    if (lastHashIndex !== -1) {
      const updatedNote = newNote.substring(0, lastHashIndex + 1) + projectTag + ' ';
      setNewNote(updatedNote);
      setShowTagSuggestion(false);
    }
  };

  const handleSemanticSearch = async () => {
    if (!searchQuery.trim()) {
      setSemanticResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await semanticSearchNotes(searchQuery, data.notes);
      setSemanticResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const allNotes = React.useMemo(() => {
    const combined = [...(data.notes || [])];
    if (data.ideas) {
      data.ideas.forEach(idea => {
        if (!combined.some(n => n.id === idea.id)) combined.push(idea);
      });
    }
    return combined
      .filter(n => !n.tags.includes('admin_note'))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [data.notes, data.ideas]);

  const filteredNotes = React.useMemo(() => {
    if (semanticSearchEnabled && searchQuery.trim() && semanticResults.length > 0) {
      return semanticResults
        .map(id => allNotes.find(n => n.id === id))
        .filter((n): n is Note => !!n);
    }
    
    if (!searchQuery.trim()) return allNotes;
    
    const query = searchQuery.toLowerCase();
    return allNotes.filter(n => 
      n.content.toLowerCase().includes(query) || 
      n.tags.some(t => t.toLowerCase().includes(query)) ||
      n.expandedContent?.toLowerCase().includes(query)
    );
  }, [allNotes, searchQuery, semanticSearchEnabled, semanticResults]);

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {!isEmbedded && (
        <header className="p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">RESEARCH & NOTES</h1>
            <div className="flex items-center gap-4">
              {onDeleteAllNotes && (
                <button
                  onClick={() => setNoteToDelete('ALL')}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                  title="Delete All Notes"
                >
                  <Trash2 size={18} />
                </button>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && semanticSearchEnabled) {
                      handleSemanticSearch();
                    }
                  }}
                  placeholder={semanticSearchEnabled ? "Search by meaning (Enter)..." : "Search notes..."}
                  className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500 w-64"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 size={14} className="animate-spin text-indigo-500" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      <div className="flex-1 overflow-y-auto relative p-4 md:p-8 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-4xl mx-auto min-h-full relative paper-texture shadow-2xl rounded-3xl overflow-hidden flex flex-col">
          {/* Layered paper effect fixed at the top of the sheet */}
          <div className="relative h-6 z-20 pointer-events-none overflow-hidden shrink-0">
            <div className="absolute top-0 left-0 right-0 h-full bg-slate-900/10 torn-paper-edge-overlay translate-y-[4px]" />
            <div className="absolute top-0 left-0 right-0 h-full bg-slate-900/10 torn-paper-edge-overlay translate-y-[3px]" />
            <div className="absolute top-0 left-0 right-0 h-full bg-slate-900/10 torn-paper-edge-overlay translate-y-[2px]" />
            <div className="absolute top-0 left-0 right-0 h-full bg-slate-900/10 torn-paper-edge-overlay translate-y-[1px]" />
            <div className="absolute top-0 left-0 right-0 h-full torn-paper-edge" />
          </div>

          <div className="flex-1 relative pt-8 pb-32 lg:pb-8 px-4 md:pl-24 lg:pl-32">
            <div className="space-y-0 relative z-10">
              <StackedPaper className="space-y-4" transparent>
                <div className="p-6 relative z-20">
                  <div className="relative">
                    <textarea
                      value={newNote}
                      onChange={handleTextChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Jot down a thought, a name, or a plot point... (Enter to Save)"
                      className="w-full h-32 bg-transparent border-none focus:ring-0 text-lg resize-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400/50"
                    />
                    {showTagSuggestion && (
                      <button
                        onClick={applyTagSuggestion}
                        className="absolute bottom-2 left-0 bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2"
                      >
                        #{(data.shortName || data.title || 'Project').replace(/[^\w\s]/g, '').replace(/\s+/g, '_')}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-700/30 pb-4">
                    <span className="text-xs text-slate-400 font-medium italic">Press Enter to save. Use # to tag characters or books.</span>
                  </div>
                </div>
              </StackedPaper>

              <div className="grid grid-cols-1 divide-y divide-slate-200/50 dark:divide-slate-700/30">
                {filteredNotes.length === 0 && searchQuery.trim() && (
                  <div className="p-12 text-center text-slate-400 italic">
                    No notes found matching your search.
                  </div>
                )}
                {filteredNotes.map(note => (
                  <StackedPaper key={note.id} className="group" transparent>
                    <div className={`p-6 relative z-20 ${note.isCanon ? 'border-l-4 border-amber-500/50' : ''}`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex flex-wrap gap-2">
                          {note.tags.map(tag => {
                            const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                            const tagSimple = normalize(tag);
                            const bookSimple = normalize(data.shortName || data.title || '');
                            
                            const isBook = tagSimple === bookSimple;
                            const isCharacter = data.characters?.some(c => normalize(c.name) === tagSimple);
                            const isLocation = data.locations?.some(l => normalize(l.name) === tagSimple);
                            
                            return (
                              <button 
                                key={tag} 
                                onClick={() => {
                                  if (isBook) onChangeView(ViewType.DASHBOARD);
                                  else if (isCharacter) onChangeView(ViewType.CHARACTERS);
                                  else if (isLocation) {
                                    const loc = data.locations?.find(l => normalize(l.name) === tagSimple);
                                    if (loc) onLinkClick('location', loc.id);
                                  }
                                }}
                                className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest transition-colors max-w-[150px] truncate inline-block align-bottom ${
                                  isBook || isCharacter || isLocation
                                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                #{tag}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-2">
                          {onToggleCanon && (
                            <button 
                              onClick={() => onToggleCanon(note.id, !note.isCanon)}
                              className={`p-1 rounded-lg transition-all ${note.isCanon ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-300 hover:text-amber-500'}`}
                              title={note.isCanon ? "Canonized" : "Mark as Canon"}
                            >
                              <Zap size={18} fill={note.isCanon ? "currentColor" : "none"} />
                            </button>
                          )}
                          <button onClick={() => setNoteToDelete(note.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      <div className="text-slate-800 dark:text-slate-200 mb-4 font-serif text-lg leading-relaxed">
                        <WikiText text={note.content} projectData={data as any} projectsMetadata={projectsMetadata} onLinkClick={onLinkClick} />
                      </div>
                      <div className="mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest flex justify-between items-center">
                        <span>{new Date(note.timestamp).toLocaleString()}</span>
                        {currentUser?.role === 'admin' && (
                          <span className="font-mono text-[9px] opacity-50 select-all">ID: {note.id}</span>
                        )}
                      </div>
                    </div>
                  </StackedPaper>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {noteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              {noteToDelete === 'ALL' ? 'Delete All Notes?' : 'Delete Note?'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              {noteToDelete === 'ALL' 
                ? 'Are you sure you want to delete ALL notes in the Notebook? This action cannot be undone.' 
                : 'Are you sure you want to delete this note? This action cannot be undone.'}
            </p>
            <div className="flex justify-end gap-4">
              <button 
                onClick={() => setNoteToDelete(null)}
                className="px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (noteToDelete === 'ALL' && onDeleteAllNotes) {
                    onDeleteAllNotes();
                  } else if (noteToDelete !== 'ALL') {
                    onDeleteNote(noteToDelete);
                  }
                  setNoteToDelete(null);
                }}
                className="px-6 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                {noteToDelete === 'ALL' ? 'Delete All' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
