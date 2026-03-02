import React, { useState } from 'react';
import { ProjectData, Note } from '../../types';
import { Sparkles, FileText, Users, Map, Calendar, Clock, Edit3 } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface DashboardViewProps {
  projectData: ProjectData;
  globalNotes: Note[];
  onFileUpload: () => void;
  onUpdateManuscript: (file: File) => void;
  onRescanManuscript: (file: File) => void;
  onExportManuscript: () => void;
  onImportManuscript: (file: File) => void;
  onLoadSample: () => void;
  isAnalyzing: boolean;
  error: string | null;
  onUpdateMetadata: (title: string, author: string) => void;
  onExport: () => void;
  onAnalyzeText: (text: string) => void;
  onRestoreHistory: () => void;
  onGenerateCover: () => void;
  isGeneratingCover: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projectData, onGenerateCover, isGeneratingCover, onUpdateMetadata
}) => {
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editTitle, setEditTitle] = useState(projectData.title);
  const [editAuthor, setEditAuthor] = useState(projectData.author || '');

  const handleSaveMetadata = () => {
    onUpdateMetadata(editTitle, editAuthor);
    setIsEditingMetadata(false);
  };

  return (
    <div className="h-full overflow-y-auto p-8 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row items-center md:items-end gap-8 text-center md:text-left">
          <div className="w-48 h-72 bg-slate-200 dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden relative group flex-shrink-0">
            {projectData.coverImage ? (
              <img src={projectData.coverImage} className="w-full h-full object-cover" alt="Cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <button
                  onClick={onGenerateCover}
                  disabled={isGeneratingCover}
                  className="flex flex-col items-center gap-2 text-slate-400 hover:text-indigo-500 transition-colors"
                >
                  <Sparkles size={32} className={isGeneratingCover ? 'animate-spin' : ''} />
                  <span className="text-xs font-bold uppercase tracking-widest">Generate Cover</span>
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 space-y-4 w-full">
            <div className="space-y-1 group relative">
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white uppercase flex flex-col md:flex-row items-center gap-2 md:gap-4">
                {projectData.title}
                <button onClick={() => setIsEditingMetadata(true)} className="p-2 text-slate-300 hover:text-indigo-500 transition-colors md:opacity-0 md:group-hover:opacity-100">
                  <Edit3 size={24} />
                </button>
              </h1>
              <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 italic">by {projectData.author}</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Story Summary</span>
                <p className="text-slate-700 dark:text-slate-300 line-clamp-3 text-sm md:text-base">{projectData.summary || 'No summary generated yet.'}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Characters" value={projectData.characters.length} color="text-blue-500" />
          <StatCard icon={Map} label="Locations" value={projectData.locations.length} color="text-emerald-500" />
          <StatCard icon={Clock} label="Timeline Events" value={projectData.timeline.length} color="text-amber-500" />
          <StatCard icon={FileText} label="Manuscript Chapters" value={projectData.chapters?.length || 0} color="text-indigo-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">LATEST ACTIVITY</h2>
              <div className="space-y-4">
                {projectData.changeLog?.slice(0, 5).map(log => (
                  <div key={log.id} className="flex items-center gap-4 text-sm">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className="font-bold text-slate-900 dark:text-white">{log.action} {log.entityType}:</span>
                    <span className="text-slate-500 dark:text-slate-400">{log.entityName}</span>
                    <span className="ml-auto text-xs text-slate-400">{new Date(log.timestamp).toLocaleDateString()}</span>
                  </div>
                )) || <p className="text-slate-400 italic">No activity recorded yet.</p>}
              </div>
            </section>
          </div>
          <div className="space-y-6">
            <section className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-500/20">
              <h2 className="text-xl font-black mb-4 uppercase tracking-tight">AI INSIGHTS</h2>
              <p className="text-indigo-100 text-sm leading-relaxed mb-6">
                Your narrative has a strong focus on {projectData.themes[0] || 'character development'}. 
                Consider expanding the role of {projectData.characters[0]?.name || 'your protagonist'} in the second act.
              </p>
              <button className="w-full py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors">
                Run Deep Analysis
              </button>
            </section>
          </div>
        </div>
      </div>

      <Modal isOpen={isEditingMetadata} onClose={() => setIsEditingMetadata(false)} title="Edit Project Details" footer={<button onClick={handleSaveMetadata} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">Save Changes</button>}>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Project Title</label>
            <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Author Name</label>
            <input type="text" value={editAuthor} onChange={e => setEditAuthor(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2" />
          </div>
        </div>
      </Modal>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4">
    <div className={`p-3 rounded-xl bg-slate-50 dark:bg-slate-950 ${color}`}>
      <Icon size={24} />
    </div>
    <div>
      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">{label}</span>
      <span className="text-2xl font-black text-slate-900 dark:text-white">{value}</span>
    </div>
  </div>
);
