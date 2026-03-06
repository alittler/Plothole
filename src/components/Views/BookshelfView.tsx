import React, { useState } from 'react';
import { ProjectMetadata, User } from '../../types';
import { Plus, Upload, Trash2, BookOpen } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface BookshelfViewProps {
  projects: ProjectMetadata[];
  activeProjectId: string;
  currentUser: User;
  onSelectProject: (id: string) => void;
  onCreateProject: (title: string, author: string, useSample: boolean, shortName?: string) => void;
  onUploadProject: (file: File) => void;
  onDeleteProject: (id: string) => void;
  onOpenDashboard: () => void;
  isAnalyzing: boolean;
}

export const BookshelfView: React.FC<BookshelfViewProps> = ({
  projects, onSelectProject, onCreateProject, onUploadProject, onDeleteProject, isAnalyzing
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newShortName, setNewShortName] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    onCreateProject(newTitle, newAuthor || 'Unknown Author', false, newShortName);
    setIsCreating(false);
    setNewTitle('');
    setNewShortName('');
    setNewAuthor('');
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-8 md:mb-12">
        <div className="max-w-6xl mx-auto flex items-center gap-6">
          <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg">
            <BookOpen size={32} />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase">MY LIBRARY</h1>
            <p className="text-xs md:text-base text-slate-500 dark:text-slate-400">Manage your story worlds and manuscripts.</p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 pb-12">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {projects.map(project => (
            <div
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className="h-64 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col group hover:shadow-md transition-all cursor-pointer hover:border-indigo-500/50"
            >
              <div className="flex-1 p-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-black text-xl text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 transition-colors">{project.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">by {project.author}</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                  <span>{project.characterCount} Characters</span>
                  <span>{project.locationCount} Locations</span>
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                  <BookOpen size={16} />
                  Open World
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setProjectToDelete(project.id);
                  }}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-4 h-64">
            <button
              onClick={() => setIsCreating(true)}
              className="flex-1 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-all group"
            >
              <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-full group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 transition-colors">
                <Plus size={20} className="text-slate-400 group-hover:text-indigo-600" />
              </div>
              <span className="font-bold text-xs text-slate-500 group-hover:text-indigo-600 uppercase tracking-widest">New World</span>
            </button>

            <label className="flex-1 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition-all group cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept=".txt,.md,.json,.zip"
                onChange={(e) => e.target.files?.[0] && onUploadProject(e.target.files[0])}
                disabled={isAnalyzing}
              />
              <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-full group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900 transition-colors">
                <Upload size={20} className="text-slate-400 group-hover:text-emerald-600" />
              </div>
              <span className="font-bold text-xs text-slate-500 group-hover:text-emerald-600 uppercase tracking-widest">
                {isAnalyzing ? 'Analyzing...' : 'Upload'}
              </span>
            </label>
          </div>
        </div>
      </div>

      <Modal isOpen={isCreating} onClose={() => setIsCreating(false)} title="New Story World" footer={<button onClick={handleCreate} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">Create World</button>}>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Story Title</label>
            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. The Last Archivist" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Short Name (for tagging)</label>
            <input type="text" value={newShortName} onChange={e => setNewShortName(e.target.value)} placeholder="e.g. Archivist" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Author</label>
            <input type="text" value={newAuthor} onChange={e => setNewAuthor(e.target.value)} placeholder="Your Name" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2" />
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={!!projectToDelete} 
        onClose={() => setProjectToDelete(null)} 
        title="Confirm Deletion" 
        footer={
          <div className="flex gap-4">
            <button onClick={() => setProjectToDelete(null)} className="px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold">Cancel</button>
            <button 
              onClick={() => {
                if (projectToDelete) {
                  onDeleteProject(projectToDelete);
                  setProjectToDelete(null);
                }
              }} 
              className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold"
            >
              Delete Forever
            </button>
          </div>
        }
      >
        <p className="text-slate-600 dark:text-slate-400">
          Are you sure you want to delete this story world? This action cannot be undone and all associated manuscript data will be lost.
        </p>
      </Modal>
    </div>
  );
};
