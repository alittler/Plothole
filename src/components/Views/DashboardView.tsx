import React, { useState } from 'react';
import Image from 'next/image';
import { ViewType, ProjectData, Note } from '../../types';
import { Download, FileJson, Share2, Save, Calendar, Users, MapPin, BookOpen, ArrowLeft, ArrowRight, Plus, Trash2, Clock, CheckCircle2, AlertCircle, Palette, Check, FileUp, FileText, Eye, X } from 'lucide-react';

interface DashboardViewProps {
  projectData: ProjectData;
  globalNotes: Note[];
  onBack?: () => void;
  onNavigate?: (view: ViewType) => void;
  onUpdateProject?: (data: Partial<ProjectData>) => Promise<void>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ projectData, globalNotes, onBack, onNavigate, onUpdateProject }) => {
  const [exportFormat, setExportFormat] = useState<'json' | 'md' | 'txt'>('json');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<'edit' | 'character' | 'general'>('general');
  const [viewingDraftId, setViewingDraftId] = useState<string | null>(null);

  const handleAddProjectNote = async () => {
    if (!newNoteContent.trim() || !onUpdateProject) return;

    const newNote = {
      id: `pnote-${Date.now()}`,
      content: newNoteContent.trim(),
      timestamp: Date.now(),
      category: newNoteCategory
    };

    const updatedNotes = [newNote, ...(projectData.projectNotes || [])];
    await onUpdateProject({ projectNotes: updatedNotes });
    setNewNoteContent('');
  };

  const handleUploadDraft = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateProject) return;

    const content = await file.text();
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    
    const newDraft = {
      id: `draft-${Date.now()}`,
      name: file.name,
      content,
      timestamp: Date.now(),
      wordCount
    };

    const draftLimit = parseInt(process.env.NEXT_PUBLIC_MANUSCRIPT_DRAFT_LIMIT || '10', 10);
    const existingDrafts = projectData.manuscriptDrafts || [];
    const updatedDrafts = [newDraft, ...existingDrafts].slice(0, draftLimit);

    const logEntry = {
      id: `pnote-${Date.now()}`,
      content: `Uploaded new manuscript draft: ${file.name} (${wordCount.toLocaleString()} words)`,
      timestamp: Date.now(),
      category: 'edit' as const
    };

    await onUpdateProject({ 
      manuscriptDrafts: updatedDrafts,
      manuscript: content,
      wordCount: wordCount,
      projectNotes: [logEntry, ...(projectData.projectNotes || [])]
    });
    
    alert('Manuscript draft uploaded and set as active version.');
  };

  const handleActivateDraft = async (draftId: string) => {
    if (!onUpdateProject) return;
    const draft = projectData.manuscriptDrafts?.find(d => d.id === draftId);
    if (!draft) return;

    if (!confirm(`Switch active manuscript to "${draft.name}"?`)) return;

    const logEntry = {
      id: `pnote-${Date.now()}`,
      content: `Restored manuscript draft: ${draft.name}`,
      timestamp: Date.now(),
      category: 'edit' as const
    };

    await onUpdateProject({ 
      manuscript: draft.content,
      wordCount: draft.wordCount,
      projectNotes: [logEntry, ...(projectData.projectNotes || [])]
    });
    
    setViewingDraftId(null);
  };

  const handleDeleteProjectNote = async (id: string) => {
    if (!onUpdateProject) return;
    const updatedNotes = (projectData.projectNotes || []).filter(n => n.id !== id);
    await onUpdateProject({ projectNotes: updatedNotes });
  };

  // Only include notes that are tagged with the project ID or a matching tag
  const projectNotes = globalNotes.filter(note => 
    note.tags?.includes(projectData.id) || 
    note.tags?.includes(projectData.title)
  );

  const handleExport = () => {
    let content = '';
    let filename = '';

    if (exportFormat === 'json') {
      content = JSON.stringify({
        project: projectData,
        notes: projectNotes,
        exportedAt: new Date().toISOString()
      }, null, 2);
      filename = `${projectData.title}-export.json`;
    } else if (exportFormat === 'md') {
      content = `# ${projectData.title}\n\n**By:** ${projectData.author}\n\n## Project Details\n\n- **Characters:** ${projectData.characters?.length || 0}\n- **Locations:** ${projectData.locations?.length || 0}\n- **Timeline Events:** ${projectData.timeline?.length || 0}\n- **Word Count:** ${projectData.wordCount || 0}\n\n## Notes (${projectNotes.length})\n\n`;
      
      projectNotes.forEach((note, idx) => {
        content += `\n### Note ${idx + 1}\n\n${note.content}\n\n**Created:** ${new Date(note.timestamp || 0).toLocaleDateString()}\n\n---\n`;
      });
      
      filename = `${projectData.title}-notes.md`;
    } else {
      content = `${projectData.title}\nBy ${projectData.author}\n\n`;
      content += `NOTES (${projectNotes.length}):\n\n`;
      projectNotes.forEach((note, idx) => {
        content += `\n--- Note ${idx + 1} ---\n${note.content}\n\nCreated: ${new Date(note.timestamp || 0).toLocaleDateString()}\n`;
      });
      filename = `${projectData.title}-notes.txt`;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      <header className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{projectData.title}</h1>
            <p className="text-sm text-slate-500 italic">by {projectData.author}</p>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft size={24} />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Project Aesthetics */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Palette size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Project Aesthetics</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Personalize the sidebar and project cover.</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="space-y-4 flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cover Color</p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { label: 'Indigo', value: '#4f46e5' },
                    { label: 'Rose', value: '#e11d48' },
                    { label: 'Emerald', value: '#10b981' },
                    { label: 'Amber', value: '#d97706' },
                    { label: 'Violet', value: '#7c3aed' },
                    { label: 'Sky', value: '#0ea5e9' },
                    { label: 'Slate', value: '#475569' },
                    { label: 'Crimson', value: '#991b1b' },
                  ].map(color => (
                    <button
                      key={color.value}
                      onClick={() => onUpdateProject?.({ coverColor: color.value })}
                      className="w-10 h-10 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center shadow-lg"
                      style={{ 
                        backgroundColor: color.value,
                        borderColor: projectData.coverColor === color.value ? 'white' : 'transparent',
                        boxShadow: projectData.coverColor === color.value ? `0 0 15px ${color.value}` : 'none'
                      }}
                      title={color.label}
                    >
                      {projectData.coverColor === color.value && <Check size={20} className="text-white" />}
                    </button>
                  ))}
                  <div className="relative group">
                    <input 
                      type="color" 
                      value={projectData.coverColor || '#4f46e5'} 
                      onChange={(e) => onUpdateProject?.({ coverColor: e.target.value })}
                      className="w-10 h-10 rounded-full bg-transparent cursor-pointer border-none p-0 overflow-hidden"
                    />
                    <div className="absolute inset-0 rounded-full pointer-events-none border-2 border-slate-200 dark:border-slate-700 opacity-50" />
                  </div>
                </div>
              </div>

              <div className="w-full md:w-64 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Preview</p>
                <div className="w-32 h-44 rounded-lg shadow-2xl relative overflow-hidden transition-all duration-500"
                  style={{ 
                    backgroundColor: projectData.coverColor || '#4f46e5',
                    boxShadow: `0 20px 50px -12px ${projectData.coverColor || '#4f46e5'}44`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                  <div className="absolute left-2 right-2 top-8 text-center">
                    <p className="text-white font-black text-xs uppercase leading-tight tracking-tighter line-clamp-3">{projectData.title}</p>
                    <div className="w-8 h-0.5 bg-white/30 mx-auto mt-2 rounded-full" />
                    <p className="text-white/60 font-bold text-[8px] uppercase tracking-widest mt-2">{projectData.author}</p>
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                     <Image src="/logos/plothole_256x256.png" alt="logo" width={24} height={24} className="opacity-20 grayscale brightness-200" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Project Overview */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Project Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <button 
                onClick={() => onNavigate?.(ViewType.CHARACTERS)}
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all text-left group"
              >
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Users size={24} className="text-indigo-600 dark:text-indigo-400 group-hover:text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Characters</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{projectData.characters?.length || 0}</p>
                </div>
                <ArrowRight size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
              </button>

              <button 
                onClick={() => onNavigate?.(ViewType.WORLD_HUB)}
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all text-left group"
              >
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <MapPin size={24} className="text-emerald-600 dark:text-emerald-400 group-hover:text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Locations</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{projectData.locations?.length || 0}</p>
                </div>
                <ArrowRight size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
              </button>

              <button 
                onClick={() => onNavigate?.(ViewType.TIMELINE)}
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-amber-500/50 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-all text-left group"
              >
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Calendar size={24} className="text-amber-600 dark:text-amber-400 group-hover:text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Timeline Events</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{projectData.timeline?.length || 0}</p>
                </div>
                <ArrowRight size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
              </button>

              <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <BookOpen size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Word Count</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{projectData.wordCount?.toLocaleString() || 0}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800 pb-2">Project Metadata</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Modified</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {new Date(projectData.lastModified).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Themes</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {projectData.themes?.length || 0} Established
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sources</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {projectData.sources?.length || 0} Referenced
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Artifacts</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {projectData.artifacts?.length || 0} Tracked
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800 pb-2">Summary</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                  {projectData.summary || 'No project summary established yet. Use the Manuscript Analyzer to generate one from your notes.'}
                </p>
              </div>
            </div>
          </section>

          {/* Project Development Log */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Development Log</h2>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">
                  <CheckCircle2 size={12} /> {projectData.projectNotes?.length || 0} Entries
                </span>
              </div>
            </div>

            {/* Add New Note */}
            <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                  {(['general', 'edit', 'character'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setNewNoteCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                        newNoteCategory === cat
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                          : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Record an edit, character change, or general project note..."
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none min-h-[100px]"
                />
                <button
                  onClick={handleAddProjectNote}
                  disabled={!newNoteContent.trim()}
                  className="self-end px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase tracking-widest text-xs hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2 shadow-xl shadow-slate-900/10 dark:shadow-white/5"
                >
                  <Plus size={16} /> Add Entry
                </button>
              </div>
            </div>

            {/* Log Entries */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {(!projectData.projectNotes || projectData.projectNotes.length === 0) ? (
                <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <Clock size={32} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500 font-medium">No development logs yet.</p>
                  <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-black">Record your first change above</p>
                </div>
              ) : (
                projectData.projectNotes.map((note) => (
                  <div key={note.id} className="group relative p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-[0.2em] ${
                          note.category === 'edit' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          note.category === 'character' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {note.category}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {new Date(note.timestamp).toLocaleDateString()} at {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteProjectNote(note.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {note.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Manuscript Versions */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
                  <FileText size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Manuscript Drafts</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Keep up to 10 versions of your story.</p>
                </div>
              </div>
              <label className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] cursor-pointer transition-all shadow-lg shadow-indigo-600/20">
                <FileUp size={16} />
                Upload New Draft
                <input type="file" className="hidden" accept=".txt,.md" onChange={handleUploadDraft} />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(!projectData.manuscriptDrafts || projectData.manuscriptDrafts.length === 0) ? (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                  <FileText size={32} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No drafts saved yet.</p>
                </div>
              ) : (
                projectData.manuscriptDrafts.map((draft) => (
                  <div key={draft.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 transition-all group">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-800 dark:text-white truncate">{draft.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                          {new Date(draft.timestamp).toLocaleDateString()} • {draft.wordCount.toLocaleString()} words
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setViewingDraftId(draft.id)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                          title="View Content"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => handleActivateDraft(draft.id)}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"
                          title="Set as Active"
                        >
                          <Check size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Export Options */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Export & Download</h2>
            
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => setExportFormat('json')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-widest transition-all ${
                    exportFormat === 'json'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  JSON
                </button>
                <button
                  onClick={() => setExportFormat('md')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-widest transition-all ${
                    exportFormat === 'md'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Markdown
                </button>
                <button
                  onClick={() => setExportFormat('txt')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-widest transition-all ${
                    exportFormat === 'txt'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Text
                </button>
              </div>
              <button
                onClick={handleExport}
                className="ml-auto px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
              >
                <Download size={18} />
                Download
              </button>
            </div>
          </section>

          {/* Associated Notes */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Associated Notes ({projectNotes.length})</h2>
            
            {projectNotes.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No notes associated with this project yet.</p>
            ) : (
              <div className="space-y-4">
                {projectNotes.map((note, idx) => (
                  <div key={note.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Note {idx + 1}</p>
                      <p className="text-xs text-slate-400">{new Date(note.timestamp).toLocaleDateString()}</p>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">{note.content}</p>
                    {note.tags && note.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {note.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                        {note.tags.length > 3 && (
                          <span className="text-[10px] text-slate-500">+{note.tags.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Draft Preview Modal */}
      {viewingDraftId && (() => {
        const draft = projectData.manuscriptDrafts?.find(d => d.id === viewingDraftId);
        if (!draft) return null;
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{draft.name}</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                    {new Date(draft.timestamp).toLocaleString()} • {draft.wordCount.toLocaleString()} words
                  </p>
                </div>
                <button 
                  onClick={() => setViewingDraftId(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  <X size={24} className="text-slate-500" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 font-serif leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap select-text">
                {draft.content}
              </div>
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-950/50 rounded-b-3xl">
                <button 
                  onClick={() => setViewingDraftId(null)}
                  className="px-6 py-2 rounded-xl font-black uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                >
                  Close
                </button>
                <button 
                  onClick={() => handleActivateDraft(draft.id)}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                >
                  <Check size={16} />
                  Restore as Active Manuscript
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
