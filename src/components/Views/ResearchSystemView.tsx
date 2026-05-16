import React from 'react';
import { ViewType, Note, ProjectData, ProjectMetadata, User, APP_DATA_VERSION } from '../../types';
import { Plus, Search, Trash2, Sparkles, Zap, Loader2, X, CheckCircle, Clock, ChevronRight, Edit2, FileText, Globe, PenTool, LayoutGrid, Lightbulb, Image as ImageIcon, Trash, Download, Upload } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { StackedPaper } from '../ui/StackedPaper';
import { WikiText } from '../ui/WikiText';
import { RichEditor } from '../ui/RichEditor';
// import { semanticSearchNotes } from '../../services/geminiService';
import { BookshelfView } from './BookshelfView';
import { ImageUploadInput } from '../ui/ImageUploadInput';
import { sanitizeHtml } from '../../utils/htmlSanitizer';

enum NotepadView {
  STREAM = 'Notebook',
  CORKBOARD = 'Corkboard',
  INSPIRATION = 'Moodboard',
  CHAT = 'Chat'
}
import { generateId } from '../../services/storageService';

interface ResearchSystemViewProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  data: ProjectData & { notes: Note[] };
  projectsMetadata?: ProjectMetadata[];
  currentUser?: User;
  onAddNote: (note: Note) => void;
  onImportNotes?: (notes: Note[]) => Promise<void>;
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
  fetchWithAuth?: (url: string, options?: RequestInit) => Promise<Response>;
}

export const ResearchSystemView: React.FC<ResearchSystemViewProps> = ({
  currentView, onChangeView, data, projectsMetadata, currentUser, onAddNote, onImportNotes, onAddIdeaToProject, onToggleCanon, onDeleteNote, onDeleteAllNotes, onLinkClick, onAddDoubleProcessedNote, activeTasks, onUpdateProject, semanticSearchEnabled, isEmbedded,
  onCreateProject, onUploadProject, onDeleteProject, onSelectProject, onOpenDashboard, isAnalyzing: isAnalyzingProp, fetchWithAuth
}) => {
  const [viewMode, setNotepadView] = React.useState<NotepadView>(NotepadView.STREAM);
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [newNote, setNewNote] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('plothole_notepad_draft') || '';
    }
    return '';
  });

  // Auto-save draft to localStorage
  React.useEffect(() => {
    localStorage.setItem('plothole_notepad_draft', newNote);
  }, [newNote]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [semanticResults, setSemanticResults] = React.useState<string[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showTagSuggestion, setShowTagSuggestion] = React.useState(false);
  const [noteToDelete, setNoteToDelete] = React.useState<string | null>(null);
  const [selectedProseId, setSelectedProseId] = React.useState<string | null>(null);
  const [chatMessages, setChatMessages] = React.useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: "Hello! I'm your Laboratory Assistant. I can help you find connections between your notes, brainstorm new ideas, or analyze your current story world. What's on your mind?" }
  ]);
  const [chatInput, setChatInput] = React.useState('');
  const [isChatLoading, setIsChatLoading] = React.useState(false);
  const [synthesis, setSynthesis] = React.useState<{ [key: string]: string }>({});
  const [isGeneratingSynthesis, setIsGeneratingSynthesis] = React.useState(false);

  // Auto-generate synthesis when switching to Chat tab or changing tags
  React.useEffect(() => {
    if (viewMode === NotepadView.CHAT) {
      const tagKey = selectedTag || 'all_notes';
      if (!synthesis[tagKey]) {
        generateSynthesis(tagKey);
      }
    }
  }, [viewMode, selectedTag]);

  const generateSynthesis = async (tagKey: string) => {
    setIsGeneratingSynthesis(true);
    try {
      const contextNotes = selectedTag 
        ? allNotes.filter(n => n.tags.includes(selectedTag))
        : allNotes;
      
      if (contextNotes.length < 2) {
        setSynthesis(prev => ({ ...prev, [tagKey]: "Add more notes to this collection to see story connections." }));
        return;
      }

      const notesText = contextNotes.map(n => n.content).join('\n---\n');
      const manuscriptText = data.manuscript || '';
      const entitiesContext = (data.entities || []).map(e => `${e.name} (${e.type}): ${e.description || e.primary_trait || ''}`).join('\n');
      const loreContext = (data.lore || []).map(l => `${l.title}: ${l.content}`).join('\n');
      
      const response = await fetch('/api/narrative/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `You are a Story Architect. Your goal is to find narrative connections between the user's RESEARCH NOTES and their ESTABLISHED STORY (Manuscript & Lore).

TASK:
Analyze how these new notes connect to, expand upon, or contradict the established manuscript. 
Do NOT just summarize. 
Look for:
1. Narrative Hooks: How can a specific note be woven into a specific scene in the manuscript?
2. Lore Validation: Does a note confirm or challenge an established fact in the world lore?
3. Character Growth: Does a note suggest a new motivation for an existing character?
4. Inconsistencies: Point out where a note might break the logic of the established world.

FORMAT:
Use clean Markdown headers and bold text for emphasis. Be specific and creative.`,
          context: `USER'S RESEARCH NOTES:
${notesText}

ESTABLISHED LORE & ENTITIES:
${entitiesContext.substring(0, 2000)}
${loreContext.substring(0, 2000)}

ESTABLISHED MANUSCRIPT:
${manuscriptText.substring(0, 15000)}`
        })
      });

      if (!response.ok) throw new Error('Failed to reach AI Brain');
      const result = await response.json();
      
      setSynthesis(prev => ({ ...prev, [tagKey]: result.result || "I've analyzed your notes against the manuscript. No specific connections found yet." }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingSynthesis(false);
    }
  };

  const corkboardNotes = React.useMemo(() => data.corkboardNotes || [], [data.corkboardNotes]);
  const activeProse = React.useMemo(() => corkboardNotes.find(d => d.id === selectedProseId), [corkboardNotes, selectedProseId]);

  const handleCreateProse = () => {
    const newDoc = {
      id: generateId(),
      title: 'Untitled Snippet',
      content: '',
      lastModified: Date.now()
    };
    onUpdateProject?.({ corkboardNotes: [newDoc, ...corkboardNotes] });
    setSelectedProseId(newDoc.id);
  };

  const handleUpdateProse = (id: string, updates: Partial<{ title: string, content: string }>) => {
    const updated = corkboardNotes.map(d => d.id === id ? { ...d, ...updates, lastModified: Date.now() } : d);
    onUpdateProject?.({ corkboardNotes: updated });
  };

  const handleDeleteProse = (id: string) => {
    if (!confirm('Delete this snippet?')) return;
    onUpdateProject?.({ corkboardNotes: corkboardNotes.filter(d => d.id !== id) });
    if (selectedProseId === id) setSelectedProseId(null);
  };

  // Inspiration board handlers
  const [newInspirationTitle, setNewInspirationTitle] = React.useState('');
  const [newInspirationDesc, setNewInspirationDesc] = React.useState('');
  const [newInspirationUrl, setNewInspirationUrl] = React.useState('');
  const [newInspirationImage, setNewInspirationImage] = React.useState('');
  const [showInspirationForm, setShowInspirationForm] = React.useState(false);
  const [inspirationImageError, setInspirationImageError] = React.useState('');
  const [editingInspirationId, setEditingInspirationId] = React.useState<string | null>(null);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      // Build context from current notes or collection
      const contextNotes = selectedTag 
        ? allNotes.filter(n => n.tags.includes(selectedTag))
        : allNotes;
      
      const contextText = contextNotes.map(n => n.content).join('\n---\n');
      
      const response = await fetch('/api/narrative/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manuscriptText: contextText || "No notes available in this collection.",
          customPrompt: `You are a creative writing assistant. The user is asking about their story notes. 
          
Context (User's Notes):
${contextText.substring(0, 10000)}

User's Question:
${userMsg}

Please provide a helpful, creative, and insightful response based on their notes.`,
          existingEntities: data.entities || []
        })
      });

      if (!response.ok) throw new Error('Failed to reach AI Brain');
      
      const result = await response.json();
      // The API returns worldState by default, but we can repurpose it or add a specific chat endpoint later.
      // For now, let's assume the API can handle a string response if customPrompt is provided.
      // Actually the current API returns worldState (extracted entities).
      
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result.worldType || "I've analyzed your notes. How else can I help?" 
      }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I'm having trouble connecting to my creative centers right now. Please try again in a moment." }]);
    } finally {
      setIsChatLoading(false);
    }
  };
  const handleExportNotes = () => {
    const exportData = {
      version: APP_DATA_VERSION,
      timestamp: Date.now(),
      project: data.title,
      notes: allNotes,
      tags: projectTags
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plothole-notes-${data.shortName || 'export'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportNotes = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.notes && Array.isArray(imported.notes)) {
          // Merge logic - avoid duplicates by ID
          const existingIds = new Set(allNotes.map(n => n.id));
          const newNotes = imported.notes.filter((n: Note) => !existingIds.has(n.id));
          
          if (onImportNotes) {
            await onImportNotes(newNotes);
          } else {
            for (const note of newNotes) {
              onAddNote(note);
            }
          }
          alert(`Imported ${newNotes.length} new notes.`);
        }
      } catch (err) {
        alert("Failed to import notes. Please ensure the file is a valid Plothole export.");
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleAddInspiration = () => {
    if (!newInspirationTitle.trim()) {
      alert('Please enter a title for this inspiration');
      return;
    }
    if (!newInspirationImage.trim()) {
      alert('Please upload an image');
      return;
    }
    
    const extractedTags = newInspirationDesc.match(/#\w+/g)?.map(t => t.slice(1)) || [];
    
    const newInspo = {
      id: generateId(),
      title: newInspirationTitle.trim(),
      description: newInspirationDesc,
      imageUrl: newInspirationImage,
      url: newInspirationUrl,
      tags: extractedTags,
      timestamp: Date.now()
    };
    
    console.log('Adding inspiration:', newInspo);
    
    onUpdateProject?.({
      inspirations: [newInspo, ...(data.inspirations || [])]
    });
    
    setNewInspirationTitle('');
    setNewInspirationDesc('');
    setNewInspirationUrl('');
    setNewInspirationImage('');
    setInspirationImageError('');
    setShowInspirationForm(false);
  };

  const handleInspirationImageUrl = (url: string) => {
    console.log('Image uploaded successfully. URL:', url);
    setNewInspirationImage(url);
    setInspirationImageError('');
  };

  const handleInspirationImageError = (error: string) => {
    console.error('Inspiration image upload error:', error);
    setInspirationImageError(error);
  };

  const handleUpdateInspiration = (id: string, updates: Partial<any>) => {
    const updated = data.inspirations?.map(inspo => 
      inspo.id === id ? { ...inspo, ...updates } : inspo
    ) || [];
    onUpdateProject?.({ inspirations: updated });
  };

  const handleDeleteInspiration = (id: string) => {
    if (!confirm('Delete this inspiration?')) return;
    onUpdateProject?.({
      inspirations: data.inspirations?.filter(i => i.id !== id)
    });
    setEditingInspirationId(null);
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

  React.useEffect(() => {
    console.log('Inspirations in data:', data.inspirations);
  }, [data.inspirations]);

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    
    // Split by --- delimiter if present
    const segments = newNote.includes('---') 
      ? newNote.split('---').map(s => s.trim()).filter(Boolean)
      : [newNote.trim()];

    const currentProjectTag = (data.shortName || data.title || '').replace(/[^\w\s]/g, '').replace(/\s+/g, '_').toLowerCase();
    
    // Process each segment as a separate note
    const notesToBatch = [];
    
    for (const content of segments) {
      const tags = content.match(/#\w+/g)?.map(t => t.slice(1)) || [];
      
      if (onAddIdeaToProject && data.id) {
        if (tags.some(t => t.toLowerCase() === currentProjectTag)) {
          onAddIdeaToProject(data.id, content, tags);
        }
      }

      const note: Note = {
        id: generateId(),
        content,
        tags,
        timestamp: Date.now()
      };
      
      notesToBatch.push(note);
      onAddNote(note);
    }

    // If there was an import-like batch, ensure we signal it if possible
    if (segments.length > 1 && onImportNotes) {
       // onAddNote already called individually, but for safety in cloud/local sync:
       await onImportNotes(notesToBatch);
    }

    setNewNote('');
    localStorage.removeItem('plothole_notepad_draft');
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
      // Focus back to textarea
      setTimeout(() => textareaRef.current?.focus(), 10);
    }
  };

  const handleSemanticSearch = async () => {
    if (!searchQuery.trim()) {
      setSemanticResults([]);
      return;
    }
    setIsSearching(true);
    try {
      // Simple text search fallback (no AI semantic search)
      const results = data.notes.filter(note => 
        note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
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

  const projectTags = React.useMemo(() => {
    const tags = new Set<string>();
    allNotes.forEach(note => {
      note.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [allNotes]);

  const filteredNotes = React.useMemo(() => {
    let notes = allNotes;
    
    if (selectedTag) {
      notes = notes.filter(n => n.tags.includes(selectedTag));
    }
    
    if (semanticSearchEnabled && searchQuery.trim() && semanticResults.length > 0) {
      return semanticResults
        .map(id => notes.find(n => n.id === id))
        .filter((n): n is Note => !!n);
    }
    
    if (!searchQuery.trim()) return notes;
    
    const query = searchQuery.toLowerCase();
    return notes.filter(n => 
      n.content.toLowerCase().includes(query) || 
      n.tags.some(t => t.toLowerCase().includes(query)) ||
      n.expandedContent?.toLowerCase().includes(query)
    );
  }, [allNotes, searchQuery, semanticSearchEnabled, semanticResults, selectedTag]);

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {!isEmbedded && (
        <header className="hidden lg:block p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 shadow-md z-10">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex flex-col gap-3">
              <h1 className="ph-section-title text-2xl md:text-3xl flex items-center gap-3">
                <PenTool size={32} className="text-indigo-600" /> Laboratory
              </h1>
              <div className="ph-tab-container overflow-x-auto no-scrollbar flex items-center gap-2">
                {Object.values(NotepadView).map(v => (
                  <button
                    key={v}
                    onClick={() => {
                      setNotepadView(v);
                      setSelectedTag(null);
                    }}
                    className={`ph-tab ${viewMode === v && !selectedTag ? 'ph-tab-active' : 'ph-tab-inactive'}`}
                  >
                  {v === NotepadView.STREAM && <Zap size={14} />}
                    {v === NotepadView.INSPIRATION && <Lightbulb size={14} />}
                    {v === NotepadView.CHAT && <Sparkles size={14} />}
                    {v}
                  </button>
                ))}

                {/* Project Collection Tabs */}
                {viewMode === NotepadView.STREAM && projectTags.length > 0 && (
                  <>
                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-2" />
                    {projectTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(tag)}
                        className={`ph-tab whitespace-nowrap ${selectedTag === tag ? 'ph-tab-active border-indigo-500 text-indigo-600' : 'ph-tab-inactive'}`}
                      >
                        <span className="text-indigo-400 mr-1 opacity-50">#</span>
                        {tag}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 mr-2 border-r border-slate-200 dark:border-slate-800 pr-4">
                <button
                  onClick={handleExportNotes}
                  className="ph-button-ghost p-2 text-slate-400 hover:text-indigo-600"
                  title="Export Notes"
                >
                  <Download size={18} />
                </button>
                <label className="ph-button-ghost p-2 text-slate-400 hover:text-indigo-600 cursor-pointer" title="Import Notes">
                  <Upload size={18} />
                  <input type="file" className="hidden" accept=".json" onChange={handleImportNotes} />
                </label>
              </div>
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

      {/* Mobile/Small Screen Navigation (Visible when main header is hidden) */}
      <div className="lg:hidden flex flex-col gap-2 p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 z-20 shadow-sm">
        <div className="ph-tab-container overflow-x-auto no-scrollbar flex items-center gap-2">
          {Object.values(NotepadView).map(v => (
            <button
              key={v}
              onClick={() => {
                setNotepadView(v);
                setSelectedTag(null);
              }}
              className={`ph-tab whitespace-nowrap ${viewMode === v && !selectedTag ? 'ph-tab-active' : 'ph-tab-inactive'}`}
            >
              <div className="flex items-center gap-1">
                {v === NotepadView.STREAM && <Zap size={12} />}
                {v === NotepadView.INSPIRATION && <Lightbulb size={12} />}
                {v === NotepadView.CHAT && <Sparkles size={12} />}
                {v}
              </div>
            </button>
          ))}
          
          {/* Project Collection Tabs on Mobile */}
          {viewMode === NotepadView.STREAM && projectTags.length > 0 && (
            <>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-2" />
              {projectTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`ph-tab whitespace-nowrap ${selectedTag === tag ? 'ph-tab-active border-indigo-500 text-indigo-600' : 'ph-tab-inactive'}`}
                >
                  <span className="text-indigo-400 mr-0.5 opacity-50">#</span>
                  {tag}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {isEmbedded && (
        <div className="hidden lg:flex flex-col gap-2 p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="ph-tab-container overflow-x-auto no-scrollbar flex items-center gap-2">
            {Object.values(NotepadView).map(v => (
              <button
                key={v}
                onClick={() => {
                  setNotepadView(v);
                  setSelectedTag(null);
                }}
                className={`ph-tab whitespace-nowrap ${viewMode === v && !selectedTag ? 'ph-tab-active' : 'ph-tab-inactive'}`}
              >
                <div className="flex items-center gap-1">
                  {v === NotepadView.STREAM && <Zap size={12} />}
                  {v === NotepadView.INSPIRATION && <Lightbulb size={12} />}
                  {v === NotepadView.CHAT && <Sparkles size={12} />}
                  {v}
                </div>
              </button>
            ))}
            {viewMode === NotepadView.STREAM && projectTags.length > 0 && (
              <>
                <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-2" />
                {projectTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`ph-tab whitespace-nowrap ${selectedTag === tag ? 'ph-tab-active border-indigo-500 text-indigo-600' : 'ph-tab-inactive'}`}
                  >
                    #{tag}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto relative p-0 md:p-8">
        <div className={`max-w-4xl mx-auto min-h-full relative shadow-2xl rounded-none md:rounded-3xl overflow-hidden flex flex-col ${viewMode === NotepadView.STREAM ? 'paper-texture' : ''}`}>
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
                          ref={textareaRef}
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
          ) : viewMode === NotepadView.CHAT ? (
            <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
              {/* Chat Backdrop */}
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
              
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 relative custom-scrollbar">
                <div className="max-w-3xl mx-auto space-y-6 pb-20">
                  {/* Preliminary Connections Panel */}
                  <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="p-4 bg-indigo-600/5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-indigo-600" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Brainstorm</h3>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedTag ? `#${selectedTag}` : 'All Notebook'}</span>
                    </div>
                    <div className="p-6 md:p-8">
                      {isGeneratingSynthesis ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                          <Loader2 size={32} className="animate-spin text-indigo-500/50" />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Mapping Story Graph...</p>
                        </div>
                      ) : (
                        <div className="prose prose-slate dark:prose-invert prose-sm max-w-none font-serif text-slate-700 dark:text-slate-300 leading-relaxed">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {synthesis[selectedTag || 'all_notes']}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="perforation-line opacity-50" />

                  {chatMessages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
                    >
                      <div className={`max-w-[85%] p-4 md:p-6 rounded-[2rem] shadow-sm border font-serif text-sm md:text-base leading-relaxed
                        ${msg.role === 'user' 
                          ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none' 
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 rounded-tl-none'}`}
                      >
                        <div className={msg.role === 'user' ? '' : 'prose prose-slate dark:prose-invert prose-sm max-w-none'}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start animate-pulse">
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700">
                        <Loader2 size={16} className="animate-spin text-indigo-500" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Input Area */}
              <div className="p-4 md:p-8 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shrink-0">
                <div className="max-w-3xl mx-auto relative group">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={selectedTag ? `Ask about #${selectedTag}...` : "Ask about your notes..."}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 rounded-2xl md:rounded-3xl py-4 pl-6 pr-14 text-sm md:text-base font-serif resize-none shadow-inner transition-all"
                    rows={1}
                    style={{ minHeight: '56px', maxHeight: '150px' }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isChatLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-indigo-600 text-white rounded-xl md:rounded-2xl shadow-lg shadow-indigo-600/20 disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
                  >
                    {isChatLoading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} className="rotate-45" />}
                  </button>
                </div>
                <div className="max-w-3xl mx-auto mt-2 px-2 flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {selectedTag ? `Context: #${selectedTag} notes` : "Context: All notebook notes"}
                  </span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Shift+Enter for newline</span>
                </div>
              </div>
            </div>
          ) : viewMode === NotepadView.INSPIRATION ? (
            <div className="flex-1 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 overflow-y-auto p-8 lg:p-12">
              <div className="max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Inspiration Board</h2>
                  <button 
                    onClick={() => setShowInspirationForm(!showInspirationForm)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                  >
                    {showInspirationForm ? <X size={16} /> : <Plus size={16} />} {showInspirationForm ? 'Cancel' : 'Add Inspiration'}
                  </button>
                </div>
                
                {showInspirationForm && (
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl mb-8 border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Title</label>
                        <input type="text" value={newInspirationTitle} onChange={e => setNewInspirationTitle(e.target.value)} className="ph-input w-full" placeholder="E.g., Gothic Castle Reference" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Image</label>
                        <ImageUploadInput
                          onImageUrl={handleInspirationImageUrl}
                          onError={handleInspirationImageError}
                          filename="inspiration"
                          showPreview={true}
                        />
                        {newInspirationImage && (
                          <div className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <CheckCircle size={14} /> Image ready
                          </div>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Description & Tags (use #)</label>
                        <textarea value={newInspirationDesc} onChange={e => setNewInspirationDesc(e.target.value)} className="ph-input w-full h-24 resize-none" placeholder="Notes about this inspiration... #Oakhaven" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">External Link (Optional)</label>
                        <input type="text" value={newInspirationUrl} onChange={e => setNewInspirationUrl(e.target.value)} className="ph-input w-full" placeholder="https://en.wikipedia.org/wiki/..." />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => {
                          setNewInspirationTitle('');
                          setNewInspirationDesc('');
                          setNewInspirationUrl('');
                          setNewInspirationImage('');
                          setInspirationImageError('');
                          setShowInspirationForm(false);
                        }}
                        className="px-6 py-2 bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-400 dark:hover:bg-slate-500 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleAddInspiration}
                        disabled={!newInspirationTitle.trim() || !newInspirationImage.trim()}
                        className={`px-6 py-2 rounded-xl font-bold transition-colors ${
                          newInspirationTitle.trim() && newInspirationImage.trim()
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        Save Inspiration
                      </button>
                    </div>
                  </div>
                )}
                
                {editingInspirationId && data.inspirations?.find(i => i.id === editingInspirationId) && (
                   (() => {
                     const inspo = data.inspirations!.find(i => i.id === editingInspirationId)!;
                     return (
                       <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl mb-8 border-2 border-indigo-500 dark:border-indigo-400 animate-in fade-in slide-in-from-top-4">
                         <div className="flex items-center justify-between gap-2 mb-4">
                           <h3 className="font-bold text-slate-900 dark:text-white text-lg">Edit Inspiration</h3>
                           <button 
                             onClick={() => setEditingInspirationId(null)}
                             className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                           >
                             <X size={20} />
                           </button>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                           <div className="md:col-span-2">
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Title</label>
                             <input 
                               type="text" 
                               value={inspo.title}
                               onChange={(e) => handleUpdateInspiration(inspo.id, { title: e.target.value })}
                               className="ph-input w-full"
                             />
                           </div>
                           <div className="md:col-span-2">
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Description & Tags (use #)</label>
                             <textarea 
                               value={inspo.description || ''}
                               onChange={(e) => handleUpdateInspiration(inspo.id, { description: e.target.value })}
                               className="ph-input w-full h-24 resize-none"
                             />
                           </div>
                           <div className="md:col-span-2">
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">External Link (Optional)</label>
                             <input 
                               type="text" 
                               value={inspo.url || ''}
                               onChange={(e) => handleUpdateInspiration(inspo.id, { url: e.target.value })}
                               className="ph-input w-full"
                             />
                           </div>
                         </div>
                         <div className="flex justify-end gap-3">
                           <button 
                             onClick={() => handleDeleteInspiration(inspo.id)}
                             className="px-6 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                           >
                             Delete
                           </button>
                           <button 
                             onClick={() => setEditingInspirationId(null)}
                             className="px-6 py-2 bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-400 dark:hover:bg-slate-500 transition-colors"
                           >
                             Done
                           </button>
                         </div>
                       </div>
                     );
                   })()
                 )}

                <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
                  {!(data.inspirations?.length) && !showInspirationForm && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700">
                        <ImageIcon size={32} className="text-slate-300" />
                      </div>
                      <p className="text-slate-400 font-serif italic">Your mood board is empty. Add some inspirations to build your world's aesthetic.</p>
                    </div>
                  )}
                  
                  {data.inspirations?.map((inspo) => (
                    <div key={inspo.id} className="break-inside-avoid bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-200 dark:border-slate-700 group">
                      {inspo.imageUrl && (
                        <div className="relative">
                          <img src={inspo.imageUrl} alt={inspo.title} className="w-full h-auto object-cover" loading="lazy" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-tighter text-sm">{inspo.title}</h3>
<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                               <button 
                                 onClick={() => setEditingInspirationId(inspo.id)}
                                 className="text-slate-300 hover:text-indigo-500 transition-colors"
                                 title="Edit"
                               >
                                 <Edit2 size={16} />
                               </button>
                               <button 
                                 onClick={() => handleDeleteInspiration(inspo.id)}
                                 className="text-slate-300 hover:text-red-500 transition-colors"
                               >
                                 <Trash size={16} />
                               </button>
                             </div>
                        </div>
                        {inspo.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-serif mb-4 whitespace-pre-wrap">{inspo.description}</p>
                        )}
                        {inspo.url && (
                          <a href={inspo.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-500 hover:text-indigo-600 flex items-center gap-1 mb-4 truncate bg-indigo-50 dark:bg-indigo-900/20 py-1 px-2 rounded">
                            <Globe size={10} /> {inspo.url.replace(/^https?:\/\//, '')}
                          </a>
                        )}
                        <div className="flex flex-wrap gap-1 mt-auto">
                          {inspo.tags?.map(tag => {
                            const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                            const tagSimple = normalize(tag);
                            const colors: { [key: string]: string } = {
                              world: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200',
                              character: 'bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-200',
                              plot: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200',
                              setting: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200',
                              magic: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200',
                            };
                            return (
                              <span key={tag} className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${colors[tagSimple] || 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>
                                #{tag}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : viewMode === NotepadView.CORKBOARD ? (
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
                        placeholder="Snippet Title"
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
                      placeholder="Jot down your thoughts or miscellaneous lines here... This is independent of your manuscript."
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-8 lg:p-12 relative">
                  {/* Corkboard Texture/Design */}
                  <div className="absolute inset-0 bg-[#d2b48c]/20 dark:bg-slate-900 opacity-50 pointer-events-none" />
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cork-board.png')] opacity-10 pointer-events-none" />
                  
                  <div className="max-w-5xl mx-auto relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                      <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Snippet Corkboard</h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">A place for miscellaneous lines and thoughts.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="relative group">
                          <input 
                            type="text" 
                            placeholder="Quick add line..." 
                            className="ph-input pr-10 w-64 text-xs"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                const val = e.currentTarget.value.trim();
                                const newDoc = {
                                  id: generateId(),
                                  title: val.slice(0, 20) + (val.length > 20 ? '...' : ''),
                                  content: val,
                                  lastModified: Date.now()
                                };
                                onUpdateProject?.({ corkboardNotes: [newDoc, ...corkboardNotes] });
                                e.currentTarget.value = '';
                              }
                            }}
                          />
                          <Plus size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                        </div>
                        <button 
                          onClick={handleCreateProse}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                        >
                          <Plus size={16} /> New Snippet
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {corkboardNotes.length === 0 ? (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4">
                          <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700">
                            <FileText size={32} className="text-slate-300" />
                          </div>
                          <p className="text-slate-400 font-serif italic">Your corkboard is empty. Create a new snippet to begin.</p>
                        </div>
                      ) : (
                        corkboardNotes.map(doc => (
                          <button
                            key={doc.id}
                            onClick={() => setSelectedProseId(doc.id)}
                            className="group relative bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl border-t-8 border-t-amber-200 dark:border-t-amber-900/50 hover:scale-105 hover:shadow-2xl transition-all text-left flex flex-col h-48 overflow-hidden"
                          >
                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-slate-300/50" /> {/* Pin head */}
                            <h3 className="font-bold text-slate-900 dark:text-white mb-2 line-clamp-1 uppercase text-xs tracking-widest">{doc.title}</h3>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-serif line-clamp-5 overflow-hidden" dangerouslySetInnerHTML={{ __html: sanitizeHtml(doc.content || 'Empty snippet...') }} />
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
                fetchWithAuth={fetchWithAuth}
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
