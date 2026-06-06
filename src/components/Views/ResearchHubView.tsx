import React from 'react';
import { ViewType, Note, ProjectData, ProjectMetadata, User, APP_DATA_VERSION, Idea } from '../../types';
import { Plus, Search, Trash2, Zap, Loader2, X, CheckCircle, Clock, ChevronRight, Edit2, FileText, Globe, PenTool, Lightbulb, Image as ImageIcon, Trash, Download, Upload, Copy, BookOpen, Layout } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { StackedPaper } from '../ui/StackedPaper';
import { WikiText } from '../ui/WikiText';
import { RichEditor } from '../ui/RichEditor';
// import { semanticSearchNotes } from '../../services/geminiService';
import { BookshelfView } from './BookshelfView';
import { ImageUploadInput } from '../ui/ImageUploadInput';
import { sanitizeHtml } from '../../utils/htmlSanitizer';

enum ResearchHubTab {
  NOTEBOOK = 'Notebook',
  // CORKBOARD = 'Extracted Dossier Index',
  // MOODBOARD = 'Moodboard'
}

import { generateId, saveGlobalNote, saveAllGlobalNotes } from '../../services/storageService';

interface ResearchHubViewProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  data: ProjectData & { notes: Note[] };
  projectsMetadata?: ProjectMetadata[];
  currentUser?: User;
  onAddNote: (note: Note) => void;
  onImportNotes?: (notes: Note[]) => Promise<void>;
  onAddIdeaToProject?: (idea: Idea) => void;
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
  onCreateProject?: (title: string, author: string, useSample: boolean, shortName?: string) => Promise<any>;
  onUploadProject?: (file: File) => Promise<ProjectData | null>;
  onDeleteProject?: (id: string) => Promise<void>;
  onSelectProject?: (id: string) => Promise<any>;
  isAnalyzing?: boolean;
  fetchWithAuth?: (url: string, options?: RequestInit) => Promise<Response>;
}

export const ResearchHubView: React.FC<ResearchHubViewProps> = ({
  currentView, onChangeView, data, projectsMetadata, currentUser, onAddNote, onImportNotes, onAddIdeaToProject, onToggleCanon, onDeleteNote, onDeleteAllNotes, onLinkClick, onAddDoubleProcessedNote, activeTasks, onUpdateProject, semanticSearchEnabled, isEmbedded,
  onCreateProject, onUploadProject, onDeleteProject, onSelectProject, isAnalyzing: isAnalyzingProp, fetchWithAuth
}) => {
  const [optimisticNotes, addOptimisticNote] = (React as any).useOptimistic(
    data.notes,
    (state: Note[], newNote: Note) => [newNote, ...state]
  );
  const [viewMode, setNotepadView] = React.useState<ResearchHubTab>(ResearchHubTab.NOTEBOOK);
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null);

  const setActiveTab = (v: ResearchHubTab) => {
    setNotepadView(v);
    setSelectedTag(null);
  };
  const [searchQuery, setSearchQuery] = React.useState('');
  const [newNote, setNewNote] = React.useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [semanticResults, setSemanticResults] = React.useState<string[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showTagSuggestion, setShowTagSuggestion] = React.useState(false);
  const [noteToDelete, setNoteToDelete] = React.useState<string | null>(null);
  const [selectedProseId, setSelectedProseId] = React.useState<string | null>(null);
  
  // Chat state
  const [chatInput, setChatInput] = React.useState('');
  const [chatMessages, setChatMessages] = React.useState<any[]>([]);
  const [isChatLoading, setIsChatLoading] = React.useState(false);

  const generateSynthesis = () => {};

  const corkboardNotes = React.useMemo(() => data?.corkboardNotes || [], [data?.corkboardNotes]);
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
          existingEntities: data?.entities || []
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
      project: data?.title,
      notes: allNotes,
      tags: projectTags
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plothole-notes-${data?.shortName || data?.title || 'export'}-${new Date().toISOString().split('T')[0]}.json`;
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
      inspirations: [newInspo, ...(data?.inspirations || [])]
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
    const updated = data?.inspirations?.map(inspo => 
      inspo.id === id ? { ...inspo, ...updates } : inspo
    ) || [];
    onUpdateProject?.({ inspirations: updated });
  };

  const handleDeleteInspiration = (id: string) => {
    if (!confirm('Delete this inspiration?')) return;
    onUpdateProject?.({
      inspirations: data?.inspirations?.filter(i => i.id !== id)
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
    console.log('Inspirations in data:', data?.inspirations);
  }, [data?.inspirations]);

  const normalizeTagName = (name: string): string => {
    const ARTICLES = ['the', 'a', 'an', 'der', 'die', 'das', 'ein', 'eine', 'le', 'la', 'les', 'el', 'los', 'las'];
    let normalized = name.toLowerCase().trim();
    
    for (const article of ARTICLES) {
      const prefix = article + ' ';
      if (normalized.startsWith(prefix)) {
        normalized = normalized.substring(prefix.length);
        break;
      }
    }
    return normalized.trim();
  };

  const parseTags = (content: string): string[] => {
    const tags: string[] = [];
    
    // Match @Entity, +Location, #Tag, +Book
    // Regex explanation:
    // (@|\+|#) - starts with @, + or #
    // ([^@+#\s]+) - one or more characters that are not @, +, # or whitespace
    // (?:\s+from\s+(\+[^@+#\s]+))? - optional " from +Book" pattern
    const tagRegex = /(@|\+|#)([^@+#\s][^@+#]*?)(?=\s|$|\.|,|!|\?)/g;
    let match;
    
    while ((match = tagRegex.exec(content)) !== null) {
      const prefix = match[1];
      const name = match[2].trim();
      
      // Handle stacking: "@Character from +Book"
      // Check if the next word is "from" and followed by a +Book tag
      const remaining = content.substring(tagRegex.lastIndex);
      const fromMatch = remaining.match(/^\s+from\s+(\+[^@+#\s][^@+#]*?)(?=\s|$|\.|,|!|\?)/);
      
      if (fromMatch) {
        const bookName = fromMatch[1].substring(1).trim(); // Remove the +
        tags.push(`${prefix}${name} from +${bookName}`);
        // Skip the "from +Book" part in the main regex
        tagRegex.lastIndex += fromMatch[0].length;
      } else {
        tags.push(`${prefix}${name}`);
      }
    }
    
    return tags;
  };

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    
    // Split by delimiters if present
    const segments = (newNote.includes('---') || newNote.includes('***'))
      ? newNote.split(/---|\*\*\*/).map(s => s.trim()).filter(Boolean)
      : [newNote.trim()];

    const currentProjectTag = (data?.shortName || data?.title || '').replace(/[^\w\s]/g, '').replace(/\s+/g, '_').toLowerCase();
    
    // Process each segment as a separate note
    const notesToBatch = [];
    
    for (const content of segments) {
      const tags = parseTags(content);
      
      if (onAddIdeaToProject && data?.id) {
        if (tags.some(t => t.toLowerCase() === '#' + currentProjectTag || t.toLowerCase() === '+' + currentProjectTag)) {
          onAddIdeaToProject({
            id: generateId(),
            content,
            tags,
            timestamp: Date.now()
          });
        }
      }

      const note: Note = {
        id: generateId(),
        content,
        tags,
        timestamp: Date.now()
      };
      
      React.startTransition(() => {
        addOptimisticNote(note);
      });
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
    if (lastChar === '#' || lastChar === '@' || lastChar === '+') {
      setShowTagSuggestion(true);
    } else if (!(value.includes('#') || value.includes('@') || value.includes('+')) || value.endsWith(' ')) {
      setShowTagSuggestion(false);
    }
  };

  const applyTagSuggestion = () => {
    const lastHashIndex = newNote.lastIndexOf('#');
    const lastAtIndex = newNote.lastIndexOf('@');
    const lastPlusIndex = newNote.lastIndexOf('+');
    
    const lastIndex = Math.max(lastHashIndex, lastAtIndex, lastPlusIndex);
    if (lastIndex === -1) return;
    
    const prefix = newNote[lastIndex];
    let suggestion = '';
    
    if (prefix === '#') {
      suggestion = (data?.shortName || data?.title || 'Project').replace(/[^\w\s]/g, '').replace(/\s+/g, '_');
    } else if (prefix === '@') {
      // Get first character
      suggestion = data?.characters?.[0]?.name?.replace(/\s+/g, '_') || 'Character';
    } else if (prefix === '+') {
      // Get first location
      suggestion = data?.locations?.[0]?.name?.replace(/\s+/g, '_') || 'Location';
    }
    
    if (suggestion) {
      const updatedNote = newNote.substring(0, lastIndex + 1) + suggestion + ' ';
      setNewNote(updatedNote);
      setShowTagSuggestion(false);
      // Focus back to textarea
      setTimeout(() => textareaRef.current?.focus(), 10);
    }
  };

  const getCurrentTagSuggestion = () => {
    const lastHashIndex = newNote.lastIndexOf('#');
    const lastAtIndex = newNote.lastIndexOf('@');
    const lastPlusIndex = newNote.lastIndexOf('+');
    
    const lastIndex = Math.max(lastHashIndex, lastAtIndex, lastPlusIndex);
    if (lastIndex === -1) return '';
    
    const prefix = newNote[lastIndex];
    let suggestion = '';
    
    if (prefix === '#') {
      suggestion = (data?.shortName || data?.title || 'Project').replace(/[^\w\s]/g, '').replace(/\s+/g, '_');
    } else if (prefix === '@') {
      suggestion = data?.characters?.[0]?.name?.replace(/\s+/g, '_') || 'Character';
    } else if (prefix === '+') {
      suggestion = data?.locations?.[0]?.name?.replace(/\s+/g, '_') || 'Location';
    }
    
    return `${prefix}${suggestion}`;
  };

  const handleSemanticSearch = async () => {
    if (!searchQuery.trim()) {
      setSemanticResults([]);
      return;
    }
    setIsSearching(true);
    try {
      // Simple text search fallback (no AI semantic search)
      const results = (data?.notes || []).filter(note => 
        note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setSemanticResults(results.map(n => n.id));
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const allNotes = React.useMemo(() => {
    const combined = [...(optimisticNotes || [])];
    if (data?.ideas) {
      data?.ideas.forEach(idea => {
        if (!combined.some(n => n.id === idea.id)) combined.push(idea);
      });
    }
    
    // Deduplicate by ID to prevent React key errors
    const uniqueMap = new Map();
    combined.forEach(n => {
      if (n && n.id && !uniqueMap.has(n.id)) {
        uniqueMap.set(n.id, n);
      }
    });
    
    return Array.from(uniqueMap.values())
      .filter(n => n && n.tags && !n.tags.includes('admin_note'))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [optimisticNotes, data?.ideas]);

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
                <PenTool size={32} className="text-indigo-600" /> Notebook
              </h1>
              <div className="ph-tab-container overflow-x-auto no-scrollbar flex items-center gap-2">
                {Object.values(ResearchHubTab).map(v => (
                  <button
                    key={v}
                    onClick={() => setActiveTab(v)}
                    className={`ph-tab ${viewMode === v && !selectedTag ? 'ph-tab-active' : 'ph-tab-inactive'}`}
                  >
                  {v === ResearchHubTab.NOTEBOOK && <Zap size={14} />}
                  {v}
                  </button>
                ))}

                {/* Project Collection Tabs */}
                {viewMode === ResearchHubTab.NOTEBOOK && projectTags.length > 0 && (
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
          {Object.values(ResearchHubTab).map(v => (
            <button
              key={v}
              onClick={() => setActiveTab(v)}
              className={`ph-tab whitespace-nowrap ${viewMode === v && !selectedTag ? 'ph-tab-active' : 'ph-tab-inactive'}`}
            >
              <div className="flex items-center gap-1">
                {v === ResearchHubTab.NOTEBOOK && <Zap size={12} />}

                {v}
              </div>
            </button>
          ))}
          
          {/* Project Collection Tabs on Mobile */}
          {viewMode === ResearchHubTab.NOTEBOOK && projectTags.length > 0 && (
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
            {Object.values(ResearchHubTab).map(v => (
              <button
                key={v}
                onClick={() => setActiveTab(v)}
                className={`ph-tab whitespace-nowrap ${viewMode === v && !selectedTag ? 'ph-tab-active' : 'ph-tab-inactive'}`}
              >
                <div className="flex items-center gap-1">
                  {v === ResearchHubTab.NOTEBOOK && <Zap size={12} />}
  
                  {v}
                </div>
              </button>
            ))}
            {viewMode === ResearchHubTab.NOTEBOOK && projectTags.length > 0 && (
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
        <div className={`max-w-4xl mx-auto min-h-full relative shadow-2xl rounded-none md:rounded-3xl overflow-hidden flex flex-col ${viewMode === ResearchHubTab.NOTEBOOK ? 'paper-texture' : ''}`}>
          {viewMode === ResearchHubTab.NOTEBOOK ? (
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
                            {getCurrentTagSuggestion()}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-700/30 pb-4">
                        <span className="text-xs text-slate-400 font-medium italic">Press Enter to save. Use # for tags, @ for characters, + for locations. Split multiple with ***</span>
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
                                  // Handle stacked tags: "@Character from +Book"
                                  const parts = tag.split(' from ');
                                  const mainTag = parts[0];
                                  const fromTag = parts[1]; // e.g. "+Book"
                                  
                                  const prefix = mainTag[0];
                                  const name = mainTag.substring(1);
                                  const normalizedName = normalizeTagName(name);
                                  
                                  const isCharacter = prefix === '@' || data?.characters?.some(c => normalizeTagName(c.name) === normalizedName);
                                  const isLocation = prefix === '+' || data?.locations?.some(l => normalizeTagName(l.name) === normalizedName);
                                  const isBook = prefix === '+' && !isLocation; // If it's + and not a known location, treat as Book? 
                                  // Actually let's use the prefix strictly if provided, else fallback to search.
                                  
                                  const handleTagClick = () => {
                                    if (prefix === '@') {
                                      // Find character and navigate
                                      const char = data?.characters?.find(c => normalizeTagName(c.name) === normalizedName);
                                      if (char) onLinkClick('character', char.id);
                                      else onChangeView(ViewType.CHARACTERS);
                                    } else if (prefix === '+') {
                                      // Find location and navigate
                                      const loc = data?.locations?.find(l => normalizeTagName(l.name) === normalizedName);
                                      if (loc) onLinkClick('location', loc.id);
                                      else {
                                        // Check if it's a book/project
                                        const proj = projectsMetadata?.find(p => normalizeTagName(p.shortName || p.title) === normalizedName);
                                        if (proj) {
                                          if (onSelectProject) onSelectProject(proj.id);
                                          onChangeView(ViewType.NOTEPAD);
                                        }
                                      }
                                    }
                                  };

                                  return (
                                    <div key={tag} className="flex items-center">
                                      <button 
                                        onClick={handleTagClick}
                                        className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest transition-colors max-w-[150px] truncate inline-block align-bottom ${
                                          prefix === '@' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200' :
                                          prefix === '+' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200' :
                                          'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200'
                                        }`}
                                      >
                                        {tag}
                                      </button>
                                    </div>
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
          ) : null}
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
