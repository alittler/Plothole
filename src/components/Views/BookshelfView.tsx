import React, { useState } from 'react';
import { ProjectMetadata, User } from '../../types';
import { Plus, Trash2, BookOpen, Zap, Sparkles, Cloud, CloudOff, Database, Edit2, X, Layout } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { CardActions } from '../ui/CardActions';

interface BookshelfViewProps {
  projects: ProjectMetadata[];
  activeProjectId: string;
  currentUser: User;
  onSelectProject: (id: string) => void;
  onCreateProject: (title: string, author: string, useSample: boolean, shortName?: string) => void;
  onUploadProject: (file: File) => void;
  onDeleteProject: (id: string) => void;
  onEditProject?: (id: string, title: string, author: string, shortName: string) => Promise<void>;
  onDeselectProject?: () => void;
  onRefreshMetadata?: () => Promise<void>;
  isAnalyzing: boolean;
  fetchWithAuth?: (url: string, options?: RequestInit) => Promise<Response>;
}

export const BookshelfView: React.FC<BookshelfViewProps> = ({
  projects, activeProjectId, onSelectProject, onCreateProject, onUploadProject, onDeleteProject, onEditProject, onDeselectProject, onRefreshMetadata, isAnalyzing, currentUser, fetchWithAuth
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newShortName, setNewShortName] = useState('');
  const [newAuthor, setNewAuthor] = useState(currentUser.name);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editShortName, setEditShortName] = useState('');
  const [editAuthor, setEditAuthor] = useState('');

  const handleRefresh = async () => {
    if (!onRefreshMetadata || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefreshMetadata();
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await onCreateProject(newTitle, newAuthor || currentUser.name, false, newShortName);
    setIsCreating(false);
    setNewTitle('');
    setNewShortName('');
    setNewAuthor(currentUser.name);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md z-10 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center gap-3 md:gap-6">
          <div className="p-2 md:p-4 bg-indigo-600 text-white rounded-2xl shadow-lg shrink-0">
            <BookOpen size={20} className="md:w-8 md:h-8" />
          </div>
          <div className="space-y-1 hidden sm:block">
            <h1 className="ph-section-title text-xl md:text-4xl">My Library</h1>
            <p className="ph-section-subtitle text-xs md:text-sm">Manage the story worlds of your multiverse.</p>
          </div>
          {onRefreshMetadata && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`ml-auto px-2 md:px-4 py-1.5 md:py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-1 md:gap-2 transition-all shrink-0 ${
                isRefreshing 
                  ? 'bg-indigo-100 text-indigo-400' 
                  : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-indigo-600 border border-slate-200 dark:border-slate-700 shadow-sm'
              }`}
            >
              <Database size={14} className={isRefreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh Library'}</span>
            </button>
          )}
          {activeProjectId && onDeselectProject && (
            <button
              onClick={onDeselectProject}
              className="px-2 md:px-4 py-1.5 md:py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-1 md:gap-2 transition-all bg-white dark:bg-slate-800 text-slate-500 hover:text-red-600 border border-slate-200 dark:border-slate-700 shadow-sm shrink-0"
            >
              <X size={14} />
              <span className="hidden sm:inline">Clear Selection</span>
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-6xl mx-auto min-h-full pb-40">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {projects.map(project => {
              const isActive = project.id === activeProjectId;
              return (
                <div
                  key={project.id}
                  className={`h-64 rounded-2xl shadow-sm border overflow-hidden flex flex-col group hover:shadow-md transition-all ${
                    project.id === 'global-notebook'
                      ? 'paper-texture border-amber-300/30 dark:border-amber-900/30'
                      : `bg-white dark:bg-slate-900 ${isActive ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-500/50'}`
                  }`}
                >
                  <div 
                    onClick={() => onSelectProject(project.id)}
                    className="flex-1 p-6 flex flex-col justify-between relative cursor-pointer"
                  >
                    <div className="absolute top-6 right-6 flex items-center gap-2">
                      {project.origin === 'cloud' ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 text-indigo-500 rounded-lg" title="Synced to Cloud">
                          <Cloud size={14} />
                          <span className="text-[8px] font-black uppercase tracking-widest">Cloud</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 text-amber-500 rounded-lg" title="Local Storage Only">
                          <CloudOff size={14} />
                          <span className="text-[8px] font-black uppercase tracking-widest">Local</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className={`font-black text-xl line-clamp-1 pr-16 group-hover:text-indigo-600 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-900 dark:text-white'}`}>{project.title}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 italic">by {project.author}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                        <span>{project.characterCount} Characters</span>
                        <span>{(project.wordCount || 0).toLocaleString()} Words</span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-indigo-500/60">
                        <span>{project.commitCount} Commits</span>
                        <span>{project.locationCount} Locations</span>
                      </div>
                    </div>
                  </div>
                  <div className={`p-4 border-t flex items-center justify-between gap-2 ${isActive ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800'}`}>
                    <div className={`flex items-center gap-2 font-bold text-sm ${isActive ? 'text-indigo-700 dark:text-indigo-400' : 'text-indigo-600'}`}>
                      <BookOpen size={16} />
                      {isActive ? 'Active World' : 'Open World'}
                    </div>
                    <div className="flex items-center gap-2">
                      {project.id !== 'global-notebook' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const proj = projects.find(p => p.id === project.id);
                              if (proj) {
                                setProjectToEdit(project.id);
                                setEditTitle(proj.title);
                                setEditAuthor(proj.author);
                                setEditShortName(proj.shortName || '');
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
                            title="Edit Project"
                          >
                            <Edit2 size={18} />
                          </button>
                          <CardActions
                            itemName={project.title}
                            onEdit={() => {
                              const proj = projects.find(p => p.id === project.id);
                              if (proj) {
                                setProjectToEdit(project.id);
                                setEditTitle(proj.title);
                                setEditAuthor(proj.author);
                                setEditShortName(proj.shortName || '');
                              }
                            }}
                            onDelete={() => setProjectToDelete(project.id)}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex flex-col gap-3 h-64">
              <label className="flex-1 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-1 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-all group cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept=".txt,.md,.json,.zip"
                  onChange={(e) => e.target.files?.[0] && onUploadProject(e.target.files[0])}
                  disabled={isAnalyzing}
                />
                <div className="p-1.5 bg-slate-100 dark:bg-slate-900 rounded-full group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 transition-colors">
                  <Zap size={16} className="text-slate-400 group-hover:text-indigo-600" />
                </div>
                <span className="font-bold text-[10px] text-slate-500 group-hover:text-indigo-600 uppercase tracking-widest">
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Manuscript'}
                </span>
              </label>

              <div className="flex gap-3 h-14">
                <button
                  onClick={() => onCreateProject('Sample Project', currentUser.name, true, 'Sample')}
                  className="flex-1 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl flex items-center justify-center gap-2 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-500/5 transition-all group"
                >
                  <Sparkles size={14} className="text-slate-400 group-hover:text-amber-600" />
                  <span className="font-bold text-[10px] text-slate-500 group-hover:text-amber-600 uppercase tracking-widest">Sample</span>
                </button>

                <button
                  onClick={() => {
                    setNewAuthor(currentUser.name);
                    setIsCreating(true);
                  }}
                  className="flex-1 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl flex items-center justify-center gap-2 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group"
                >
                  <Plus size={14} className="text-slate-400 group-hover:text-slate-600" />
                  <span className="font-bold text-[10px] text-slate-500 group-hover:text-slate-600 uppercase tracking-widest">Manual</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal 
        isOpen={isCreating} 
        onClose={() => setIsCreating(false)} 
        onConfirm={handleCreate}
        title="New Story World" 
        footer={<button onClick={handleCreate} className="ph-button-primary">Create World</button>}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="ph-label">Story Title</label>
            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. The Last Archivist" className="ph-input w-full" autoFocus />
          </div>
          <div className="space-y-1">
            <label className="ph-label">Short Name (for tagging)</label>
            <input type="text" value={newShortName} onChange={e => setNewShortName(e.target.value)} placeholder="e.g. Archivist" className="ph-input w-full" />
          </div>
          <div className="space-y-1">
            <label className="ph-label">Author</label>
            <input type="text" value={newAuthor} onChange={e => setNewAuthor(e.target.value)} placeholder="Your Name" className="ph-input w-full" />
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={projectToDelete !== null} 
        onClose={() => setProjectToDelete(null)} 
        onConfirm={async () => {
          if (projectToDelete) {
            console.log(`[BookshelfView] Confirming deletion of ${projectToDelete}`);
            await onDeleteProject(projectToDelete);
            setProjectToDelete(null);
          }
        }}
        title="Confirm Deletion" 
        footer={
          <div className="flex gap-4">
            <button onClick={() => setProjectToDelete(null)} className="ph-button-secondary">Cancel</button>
            <button 
              onClick={async () => {
                if (projectToDelete) {
                  console.log(`[BookshelfView] Delete Forever clicked for ${projectToDelete}`);
                  await onDeleteProject(projectToDelete);
                  setProjectToDelete(null);
                }
              }} 
              className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
              autoFocus
            >
              Delete Forever
            </button>
          </div>
        }
      >
        <p className="text-slate-600 dark:text-slate-400 font-serif italic">
          Are you sure you want to delete this story world? This action cannot be undone and all associated manuscript data will be lost.
        </p>
      </Modal>

      <Modal
 
        isOpen={projectToEdit !== null} 
        onClose={() => setProjectToEdit(null)} 
        onConfirm={async () => {
          if (projectToEdit && onEditProject) {
            await onEditProject(projectToEdit, editTitle, editAuthor, editShortName);
            setProjectToEdit(null);
          }
        }}
        title="Edit Story World" 
        footer={<button onClick={async () => {
          if (projectToEdit && onEditProject) {
            await onEditProject(projectToEdit, editTitle, editAuthor, editShortName);
            setProjectToEdit(null);
          }
        }} className="ph-button-primary">Save Changes</button>}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="ph-label">Story Title</label>
            <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="e.g. The Last Archivist" className="ph-input w-full" autoFocus />
          </div>
          <div className="space-y-1">
            <label className="ph-label">Short Name (for tagging)</label>
            <input type="text" value={editShortName} onChange={e => setEditShortName(e.target.value)} placeholder="e.g. Archivist" className="ph-input w-full" />
          </div>
          <div className="space-y-1">
            <label className="ph-label">Author</label>
            <input type="text" value={editAuthor} onChange={e => setEditAuthor(e.target.value)} placeholder="Your Name" className="ph-input w-full" />
          </div>
        </div>
      </Modal>
    </div>
  );
};
