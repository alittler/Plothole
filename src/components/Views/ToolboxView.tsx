import React from 'react';
import { ToolboxLink } from '../../types';
import { HelpCircle, Plus, ExternalLink, Trash2 } from 'lucide-react';

interface ToolboxViewProps {
  bakedResources: ToolboxLink[];
  onAddResource: (l: ToolboxLink) => void;
  onDeleteResource: (id: string) => void;
}

export const ToolboxView: React.FC<ToolboxViewProps> = ({
  bakedResources, onAddResource, onDeleteResource
}) => {
  const [url, setUrl] = React.useState('');

  const handleAdd = () => {
    if (!url.trim()) return;
    onAddResource({ id: Math.random().toString(), label: url, url, category: 'General' });
    setUrl('');
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-8">
        <div className="max-w-4xl mx-auto flex items-center gap-6">
          <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg">
            <HelpCircle size={32} />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">WRITER'S TOOLBOX</h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">A collection of resources to aid your creative process.</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pb-12 space-y-12">

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex gap-4">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a resource URL (e.g. Pinterest, Spotify, Research Paper)..."
            className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleAdd}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} /> Add Resource
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bakedResources.map(resource => (
            <div key={resource.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400">
                  <HelpCircle size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1">{resource.label}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{resource.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={resource.url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-indigo-500 transition-colors">
                  <ExternalLink size={18} />
                </a>
                <button onClick={() => onDeleteResource(resource.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
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
