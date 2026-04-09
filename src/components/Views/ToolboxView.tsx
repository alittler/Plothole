import React, { useState } from 'react';
import { ToolboxLink, ProjectData } from '../../types';
import { Wrench, Plus, ExternalLink, Trash2, RotateCcw, Link as LinkIcon } from 'lucide-react';
import { generateId } from '../../services/storageService';

interface ToolboxViewProps {
  data: ProjectData;
  defaultResources: ToolboxLink[];
  onUpdateProject: (updates: Partial<ProjectData>) => void;
}

export const ToolboxView: React.FC<ToolboxViewProps> = ({
  data, defaultResources, onUpdateProject
}) => {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');

  const userLinks = data.userToolboxLinks || defaultResources;

  const handleAdd = () => {
    if (!url.trim() || !label.trim()) return;
    const newLink: ToolboxLink = { 
      id: generateId(), 
      label: label.trim(), 
      url: url.trim(), 
      category: 'Personal' 
    };
    onUpdateProject({ userToolboxLinks: [...userLinks, newLink] });
    setUrl('');
    setLabel('');
  };

  const handleDelete = (id: string) => {
    onUpdateProject({ userToolboxLinks: userLinks.filter(l => l.id !== id) });
  };

  const handleReset = () => {
    if (!confirm('Reset your toolbox to system defaults? This will remove your personal links.')) return;
    onUpdateProject({ userToolboxLinks: undefined });
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg">
              <Wrench size={32} />
            </div>
            <div className="space-y-1 hidden sm:block">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">WRITER'S TOOLBOX</h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">A collection of resources to aid your creative process.</p>
            </div>
          </div>
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors hidden sm:flex"
          >
            <RotateCcw size={14} /> Reset to Defaults
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pb-12 space-y-12">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Resource Name (e.g. RhymeZone)"
              className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Resource URL (https://...)"
              className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={handleAdd}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Add to My Toolbox
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {userLinks.map(resource => (
            <div key={resource.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400">
                  <LinkIcon size={24} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 dark:text-white truncate">{resource.label}</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-widest truncate">{resource.category}</p>
                  {resource.description && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-1 line-clamp-1">{resource.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <a href={resource.url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-indigo-500 transition-colors">
                  <ExternalLink size={18} />
                </a>
                <button onClick={() => handleDelete(resource.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
