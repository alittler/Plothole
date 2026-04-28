import React, { useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProjectData, Note } from '../../types';
import { 
  BookOpen, FileText, Plus, Search, Trash2, Download, Upload, Eye, EyeOff, 
  ChevronDown, Loader2, MapPin, Tag, Calendar, Settings, X, Copy, Check,
  AlertCircle, Filter
} from 'lucide-react';
import { generateId } from '../../services/storageService';

enum ResearchHubTab {
  SOURCES = 'Sources',
  NOTES = 'Notes',
  SCRIPTURE = 'Scripture',
  CITATIONS = 'Citations'
}

interface ResearchSource {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'text' | 'document';
  uploadDate: number;
  size: number;
  extractionStatus: 'pending' | 'completed' | 'failed';
  extractedTextPath?: string;
  originalPath?: string;
  notes?: string;
}

interface ResearchNote {
  id: string;
  title: string;
  content: string;
  sourceIds: string[];
  scriptureCitations: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

interface ScriptureReference {
  id: string;
  reference: string;
  translation: string;
  text: string;
}

interface ResearchHubViewProps {
  projectData: ProjectData;
  onUpdateProject: (updates: Partial<ProjectData>) => void;
}

export const ResearchHubView: React.FC<ResearchHubViewProps> = ({ projectData, onUpdateProject }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') as ResearchHubTab) || ResearchHubTab.SOURCES;
  const setActiveTab = (tab: ResearchHubTab) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    router.push(`?${params.toString()}`);
  };

  // State Management
  const [sources, setSources] = useState<ResearchSource[]>(projectData.researchSources || []);
  const [notes, setNotes] = useState<ResearchNote[]>(projectData.researchNotes || []);
  const [scriptureLibrary, setScriptureLibrary] = useState<ScriptureReference[]>(() => {
    const stored = localStorage.getItem('scripture_entries');
    return stored ? JSON.parse(stored) : [];
  });

  // UI State
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  // Create New Note
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteTags, setNewNoteTags] = useState<string[]>([]);
  const [newNoteTagInput, setNewNoteTagInput] = useState('');

  // Create New Source
  const [sourceUploadLoading, setSourceUploadLoading] = useState(false);

  // Handlers
  const handleAddSource = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSourceUploadLoading(true);
    try {
      const type = file.type.includes('pdf') ? 'pdf' 
                  : file.type.includes('image') ? 'image'
                  : file.type.includes('text') ? 'text'
                  : 'document';

      const newSource: ResearchSource = {
        id: generateId(),
        name: file.name,
        type: type as any,
        uploadDate: Date.now(),
        size: file.size,
        extractionStatus: 'pending',
        notes: ''
      };

      const updated = [...sources, newSource];
      setSources(updated);
      onUpdateProject({ researchSources: updated });
    } finally {
      setSourceUploadLoading(false);
    }
  };

  const handleDeleteSource = (id: string) => {
    const updated = sources.filter(s => s.id !== id);
    setSources(updated);
    onUpdateProject({ researchSources: updated });
  };

  const handleAddNote = () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;

    const newNote: ResearchNote = {
      id: generateId(),
      title: newNoteTitle,
      content: newNoteContent,
      sourceIds: selectedSourceId ? [selectedSourceId] : [],
      scriptureCitations: [],
      tags: newNoteTags,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const updated = [newNote, ...notes];
    setNotes(updated);
    onUpdateProject({ researchNotes: updated });

    // Reset form
    setNewNoteTitle('');
    setNewNoteContent('');
    setNewNoteTags([]);
    setNewNoteTagInput('');
  };

  const handleDeleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    onUpdateProject({ researchNotes: updated });
  };

  const handleAddTag = () => {
    if (newNoteTagInput.trim() && !newNoteTags.includes(newNoteTagInput)) {
      setNewNoteTags([...newNoteTags, newNoteTagInput]);
      setNewNoteTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setNewNoteTags(newNoteTags.filter(t => t !== tag));
  };

  // Filtered Data
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           note.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTag = !filterTag || note.tags.includes(filterTag);
      return matchesSearch && matchesTag;
    });
  }, [notes, searchTerm, filterTag]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach(note => note.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [notes]);

  const renderSourcesTab = () => (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">
          Upload Source
        </h3>
        
        <label className="flex items-center justify-center w-full px-8 py-12 border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-2xl cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors">
          <div className="flex flex-col items-center gap-3">
            <Upload size={32} className="text-indigo-600" />
            <div className="text-center">
              <p className="text-sm font-black text-indigo-600 uppercase tracking-wide">Click to upload source</p>
              <p className="text-xs text-slate-500 mt-1">PDF, images, or documents</p>
            </div>
          </div>
          <input 
            type="file" 
            className="hidden" 
            onChange={handleAddSource}
            disabled={sourceUploadLoading}
            accept=".pdf,.png,.jpg,.jpeg,.gif,.tif,.tiff,.webp,.txt,.doc,.docx"
          />
        </label>
      </div>

      {/* Sources List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">
          Your Sources ({sources.length})
        </h3>

        {sources.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <FileText size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-serif italic">No sources uploaded yet. Start by uploading a research document.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map(source => (
              <div key={source.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={18} className="text-indigo-600 flex-shrink-0" />
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{source.name}</h4>
                      <span className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-[10px] font-black text-slate-700 dark:text-slate-300 rounded uppercase tracking-wider flex-shrink-0">
                        {source.type}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(source.uploadDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <span>{(source.size / 1024).toFixed(1)} KB</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <AlertCircle size={14} className={source.extractionStatus === 'completed' ? 'text-green-500' : source.extractionStatus === 'failed' ? 'text-red-500' : 'text-yellow-500'} />
                        {source.extractionStatus === 'pending' && 'Pending extraction'}
                        {source.extractionStatus === 'completed' && 'Extraction complete'}
                        {source.extractionStatus === 'failed' && 'Extraction failed'}
                      </div>
                    </div>
                    {source.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 italic">{source.notes}</p>
                    )}
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => {/* View original */}}
                      className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg transition-colors text-indigo-600"
                      title="View original file"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => {/* View extracted */}}
                      className="p-2 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-lg transition-colors text-amber-600"
                      title="View extracted text"
                    >
                      <FileText size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteSource(source.id)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors text-red-600"
                      title="Delete source"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderNotesTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Create Note */}
      <div className="lg:col-span-1">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 sticky top-6">
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">
            New Note
          </h3>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Note title..."
              value={newNoteTitle}
              onChange={e => setNewNoteTitle(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            />

            <textarea
              placeholder="Write your research note..."
              value={newNoteContent}
              onChange={e => setNewNoteContent(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />

            {/* Tags */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tags</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Add tag..."
                  value={newNoteTagInput}
                  onChange={e => setNewNoteTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  onClick={handleAddTag}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-black hover:bg-indigo-700 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
              {newNoteTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {newNoteTags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] font-bold flex items-center gap-1">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="hover:opacity-70">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleAddNote}
              disabled={!newNoteTitle.trim() || !newNoteContent.trim()}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Create Note
            </button>
          </div>
        </div>
      </div>

      {/* Notes List */}
      <div className="lg:col-span-2 space-y-4">
        {/* Search & Filter */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          {allTags.length > 0 && (
            <div className="relative">
              <select
                value={filterTag || ''}
                onChange={e => setFilterTag(e.target.value || null)}
                className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">All tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Notes Display */}
        {filteredNotes.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <FileText size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-serif italic">No notes yet. Start by creating a research note.</p>
          </div>
        ) : (
          filteredNotes.map(note => (
            <div key={note.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <button
                onClick={() => setExpandedNoteId(expandedNoteId === note.id ? null : note.id)}
                className="w-full p-4 flex items-start justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1">{note.title}</h4>
                  <p className="text-xs text-slate-500 mb-2">{new Date(note.createdAt).toLocaleDateString()}</p>
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {note.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <ChevronDown size={18} className={`text-slate-400 transition-transform ${expandedNoteId === note.id ? 'rotate-180' : ''}`} />
              </button>

              {expandedNoteId === note.id && (
                <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-4">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{note.content}</p>
                  
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="px-4 py-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderScriptureTab = () => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800">
      <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">
        Scripture Library
      </h3>

      {scriptureLibrary.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-serif italic">No scripture entries yet. Add verses in the Admin panel.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {scriptureLibrary.map(entry => (
            <div key={entry.id} className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider">{entry.reference}</h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-bold">{entry.translation}</p>
                </div>
                <button
                  className="p-2 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 rounded-lg transition-colors text-amber-600"
                  title="Copy verse"
                >
                  <Copy size={16} />
                </button>
              </div>
              <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed font-serif italic">"{entry.text}"</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCitationsTab = () => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800">
      <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">
        Citations & References
      </h3>
      <p className="text-slate-600 dark:text-slate-400 mb-6">Track how you've used sources and scripture in your notes.</p>

      {notes.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Link2 size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-serif italic">No citations yet. Create a research note that links sources.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map(note => (
            <div key={note.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">{note.title}</h4>
              <div className="space-y-2">
                {note.sourceIds.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Sources cited:</p>
                    <div className="flex flex-wrap gap-2">
                      {note.sourceIds.map(srcId => {
                        const source = sources.find(s => s.id === srcId);
                        return source ? (
                          <span key={srcId} className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded">
                            {source.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
                {note.scriptureCitations.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Scripture cited:</p>
                    <div className="flex flex-wrap gap-2">
                      {note.scriptureCitations.map((citation, idx) => (
                        <span key={idx} className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold rounded">
                          {citation}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header */}
      <header className="p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-0">
              <h1 className="ph-section-title text-3xl flex items-center gap-3">
                <Search size={28} className="text-indigo-600" /> Research Hub
              </h1>
            </div>
            <div className="relative ml-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search..."
                className="ph-input pl-12 w-64"
              />
            </div>
          </div>
          <div className="flex gap-2">
            {Object.values(ResearchHubTab).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-black uppercase tracking-wider transition-all ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto p-8">
          {activeTab === ResearchHubTab.SOURCES && renderSourcesTab()}
          {activeTab === ResearchHubTab.NOTES && renderNotesTab()}
          {activeTab === ResearchHubTab.SCRIPTURE && renderScriptureTab()}
          {activeTab === ResearchHubTab.CITATIONS && renderCitationsTab()}
        </div>
      </main>
    </div>
  );
};

// Add missing import
import { Link2 } from 'lucide-react';
