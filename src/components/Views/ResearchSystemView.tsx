import React from 'react';
import { ViewType, Note, ProjectData, ProjectMetadata, User } from '../../types';
import { Plus, Search, Trash2, Sparkles, Zap, Loader2, X, CheckCircle, Clock, ChevronRight, Edit2, FileText, Globe, PenTool, LayoutGrid } from 'lucide-react';
import { StackedPaper } from '../ui/StackedPaper';
import { WikiText } from '../ui/WikiText';
import { RichEditor } from '../ui/RichEditor';
import { semanticSearchNotes } from '../../services/geminiService';
import { BookshelfView } from './BookshelfView';

enum NotepadView {
  STREAM = 'Stream',
  PROSE = 'Prose',
  WORKSPACE = 'Workspace'
}
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
  // Bookshelf Props
  onCreateProject?: (title: string, author: string, useSample: boolean, shortName?: string) => Promise<void>;
  onUploadProject?: (file: File) => Promise<void>;
  onDeleteProject?: (id: string) => Promise<void>;
  onSelectProject?: (id: string) => Promise<void>;
  onOpenDashboard?: () => void;
  isAnalyzing?: boolean;
}

export const ResearchSystemView: React.FC<ResearchSystemViewProps> = ({
  currentView, onChangeView, data, projectsMetadata, currentUser, onAddNote, onAddIdeaToProject, onToggleCanon, onDeleteNote, onDeleteAllNotes, onLinkClick, onAddDoubleProcessedNote, activeTasks, onUpdateProject, semanticSearchEnabled, isEmbedded,
  onCreateProject, onUploadProject, onDeleteProject, onSelectProject, onOpenDashboard, isAnalyzing: isAnalyzingProp
}) => {
  const [viewMode, setNotepadView] = React.useState<NotepadView>(NotepadView.STREAM);
  const [newNote, setNewNote] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [semanticResults, setSemanticResults] = React.useState<string[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showTagSuggestion, setShowTagSuggestion] = React.useState(false);
  const [noteToDelete, setNoteToDelete] = React.useState<string | null>(null);
  const [selectedProseId, setSelectedProseId] = React.useState<string | null>(null);

  const proseDocs = React.useMemo(() => data.proseDocuments || [], [data.proseDocuments]);
  const activeProse = React.useMemo(() => proseDocs.find(d => d.id === selectedProseId), [proseDocs, selectedProseId]);

  const handleCreateProse = () => {
    const newDoc = {
      id: generateId(),
      title: 'Untitled Scene',
      content: '',
      lastModified: Date.now()
    };
    onUpdateProject?.({ proseDocuments: [newDoc, ...proseDocs] });
    setSelectedProseId(newDoc.id);
  };

  const handleUpdateProse = (id: string, updates: Partial<{ title: string, content: string }>) => {
    const updated = proseDocs.map(d => d.id === id ? { ...d, ...updates, lastModified: Date.now() } : d);
    onUpdateProject?.({ proseDocuments: updated });
  };

  const handleDeleteProse = (id: string) => {
    if (!confirm('Delete this document?')) return;
    onUpdateProject?.({ proseDocuments: proseDocs.filter(d => d.id !== id) });
    if (selectedProseId === id) setSelectedProseId(null);
  };

  // Keyboard shortcuts for delete modal
  React.useEffect(() => {
    if (!noteToDelete) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (noteToDelete === 'ALL' && onDeleteAllNotes) {
          onDeleteAllNotes();
        } else if (noteToDelete !== 'ALL') {
          onDeleteNote(noteToDelete);
        }
        setNoteToDelete(null);
      } else if (e.key === 'Escape') {
        setNoteToDelete(null);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [noteToDelete, onDeleteNote, onDeleteAllNotes]);

  const handleAdd = () => {
    if (!newNote.trim()) return;
    const tags = newNote.match(/#\w+/g)?.map(t => t.slice(1)) || [];
    
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
        <header className="hidden lg:block p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 shadow-md z-10">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex flex-col gap-3">
              <h1 className="ph-section-title text-2xl md:text-3xl flex items-center gap-3">
                <PenTool size={32} className="text-indigo-600" /> Laboratory
              </h1>
              <div className="ph-tab-container">
                {Object.values(NotepadView).map(v => (
                  <button
                    key={v}
                    onClick={() => setNotepadView(v)}
                    className={`ph-tab ${viewMode === v ? 'ph-tab-active' : 'ph-tab-inactive'}`}
                  >
                    {v === NotepadView.STREAM && <Zap size={14} />}
                    {v === NotepadView.WORKSPACE && <LayoutGrid size={14} />}
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {onDeleteAllNotes && (
                <button
                  onClick={() => setNoteToDelete('ALL')}
                  className="ph-button-ghost p-2 text-slate-400 hover:text-red-500"
                  title="Delete All Notes"
                >
                  <Trash2 size={18} />
                </button>
              )}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && semanticSearchEnabled) {
                      handleSemanticSearch();
                    }
                  }}
                  placeholder={semanticSearchEnabled ? "Search meaning..." : "Search research..."}
                  className="ph-input pl-12 w-64"
                />
                {isSearching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Loader2 size={14} className="animate-spin text-indigo-500" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      <div className="flex-1 overflow-y-auto relative p-0 md:p-8 paper-texture">
        <div className="max-w-4xl mx-auto min-h-full relative shadow-2xl rounded-none md:rounded-3xl overflow-hidden flex flex-col paper-texture">
          {viewMode === NotepadView.STREAM ? (
            <>
              {/* Spacer to push content below fixed leather header */}
              <div className="h-12 shrink-0 lg:hidden" />

              {/* Transition Zone - paper texture continues underneath */}
              <div className="relative h-14 z-20 pointer-events-none overflow-hidden shrink-0">
                {/* Layer 3 (Back) */}
                <div className="absolute top-0 left-0 right-0 torn-layer-shadow translate-y-4">
                  <div className="h-8 paper-fringe-dark path-torn-2" />
                </div>
                {/* Layer 2 */}
                <div className="absolute top-0 left-0 right-0 torn-layer-shadow translate-y-2">
                  <div className="h-8 paper-fringe-mid path-torn-3" />
                </div>
                {/* Layer 1 (Front) */}
                <div className="absolute top-0 left-0 right-0 torn-layer-shadow">
                  <div className="h-8 paper-fringe-light path-torn-1" />
                </div>
              </div>

              <div className="flex-1 relative pt-0 pb-40 lg:pb-8 px-4 md:px-8 lg:px-16">
                <div className="space-y-0 relative z-10">
                  <StackedPaper className="space-y-4" transparent>
                    <div className="p-4 md:p-6 relative z-20 bg-white/40 dark:bg-white/5 rounded-2xl backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/30 mb-4 shadow-sm">
                      <div className="relative">
                        <textarea
                          value={newNote}
                          onChange={handleTextChange}
                          onKeyDown={handleKeyDown}
                          placeholder="Jot down a thought... (Enter to Save)"
                          className="w-full h-32 bg-transparent border-none focus:ring-0 text-base md:text-lg resize-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400/50"
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
                        <span className="text-xs text-slate-400 font-medium italic">Press Enter to save. Use # to tag.</span>
                        <button 
                          onClick={handleAdd}
                          className="lg:hidden px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </StackedPaper>

                  <div className="grid grid-cols-1">
                    {filteredNotes.length === 0 && searchQuery.trim() && (
                      <div className="p-12 text-center text-slate-400 italic">
                        No notes found matching your search.
                      </div>
                    )}
                    {filteredNotes.map((note, index) => (
                      <React.Fragment key={note.id}>
                        {index > 0 && <div className="perforation-line my-2" />}
                        <StackedPaper className="group" transparent>
                          <div className={`p-0 md:p-6 relative z-20 ${note.isCanon ? 'border-l-4 border-amber-500/50' : ''}`}>
                            <div className="flex items-start justify-between mb-4 p-4 md:p-0">
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
                                <button 
                                  onClick={() => onLinkClick('admin', note.id)}
                                  className="p-1 text-slate-300 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"
                                  title="Edit Note"
                                >
                                  <Edit2 size={18} />
                                </button>
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
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : viewMode === NotepadView.PROSE ? (
            <div className="flex-1 bg-slate-100 dark:bg-slate-900 overflow-hidden flex flex-col relative">
              {activeProse ? (
                <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 animate-in fade-in zoom-in-95 duration-300">
                  <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setSelectedProseId(null)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                        title="Back to Corkboard"
                      >
                        <ChevronRight size={20} className="rotate-180" />
                      </button>
                      <input 
                        type="text" 
                        value={activeProse.title}
                        onChange={(e) => handleUpdateProse(activeProse.id, { title: e.target.value })}
                        className="bg-transparent border-none focus:ring-0 text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleDeleteProse(activeProse.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
                    </div>
                  </header>
                  <div className="flex-1 overflow-hidden">
                    <RichEditor 
                      content={activeProse.content} 
                      onChange={(html) => handleUpdateProse(activeProse.id, { content: html })}
                      placeholder="Write your scene here... Your work is automatically saved."
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-8 lg:p-12 relative">
                  {/* Corkboard Texture/Design */}
                  <div className="absolute inset-0 bg-[#d2b48c]/20 dark:bg-slate-900 opacity-50 pointer-events-none" />
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cork-board.png')] opacity-10 pointer-events-none" />
                  
                  <div className="max-w-5xl mx-auto relative z-10">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Prose Corkboard</h2>
                      <button 
                        onClick={handleCreateProse}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                      >
                        <Plus size={16} /> New Scene
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {proseDocs.length === 0 ? (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4">
                          <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700">
                            <FileText size={32} className="text-slate-300" />
                          </div>
                          <p className="text-slate-400 font-serif italic">Your corkboard is empty. Create a new scene to begin.</p>
                        </div>
                      ) : (
                        proseDocs.map(doc => (
                          <button
                            key={doc.id}
                            onClick={() => setSelectedProseId(doc.id)}
                            className="group relative bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl border-t-8 border-t-amber-200 dark:border-t-amber-900/50 hover:scale-105 hover:shadow-2xl transition-all text-left flex flex-col h-48 overflow-hidden"
                          >
                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-slate-300/50" /> {/* Pin head */}
                            <h3 className="font-bold text-slate-900 dark:text-white mb-2 line-clamp-1 uppercase text-xs tracking-widest">{doc.title}</h3>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-serif line-clamp-5 overflow-hidden" dangerouslySetInnerHTML={{ __html: doc.content || 'Empty scene...' }} />
                            <div className="mt-auto pt-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-[8px] font-black text-slate-400 uppercase">{new Date(doc.lastModified).toLocaleDateString()}</span>
                              <div className="flex items-center gap-2">
                                <Edit2 size={12} className="text-indigo-500" />
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
              <BookshelfView
                projects={projectsMetadata || []}
                activeProjectId={data.id || ''}
                currentUser={currentUser!}
                onRefreshMetadata={async () => {}} // Placeholder for now, or we can pass it down if needed
                onSelectProject={onSelectProject || (async () => {})}                onCreateProject={onCreateProject || (async () => {})} 
                onUploadProject={onUploadProject || (async () => {})} 
                onDeleteProject={onDeleteProject || (async () => {})} 
                onOpenDashboard={onOpenDashboard || (() => {})} 
                isAnalyzing={isAnalyzingProp || false} 
              />
            </div>
          )}
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
