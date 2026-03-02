import React from 'react';
import { ProjectData, AppPrompts, ToolboxLink } from '../../types';
import { Shield, Sparkles, Save } from 'lucide-react';

interface AdminViewProps {
  data: ProjectData | null;
  appPrompts: AppPrompts;
  onSavePrompts: (p: AppPrompts) => void;
  onUpdateProject: (d: Partial<ProjectData>) => void;
  onFullArchive: () => void;
  globalResources: ToolboxLink[];
  onAddGlobalResource: () => void;
  onDeleteGlobalResource: () => void;
  onToggleViewVisibility: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  appPrompts, onSavePrompts
}) => {
  const [prompts, setPrompts] = React.useState(appPrompts);

  return (
    <div className="h-full overflow-y-auto p-8 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="flex items-center gap-4">
          <div className="p-3 bg-slate-900 text-white rounded-2xl">
            <Shield size={32} />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">ADMIN CONSOLE</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Fine-tune the AI engines and system prompts.</p>
          </div>
        </header>

        <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
            <div className="flex items-center gap-4">
              <Sparkles className="text-indigo-500" size={24} />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI System Prompts</h2>
            </div>
            <button
              onClick={() => onSavePrompts(prompts)}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
            >
              <Save size={18} />
              Save Changes
            </button>
          </div>

          <div className="space-y-6">
            {Object.entries(prompts).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{key.replace(/_/g, ' ')}</label>
                <textarea
                  value={value}
                  onChange={(e) => setPrompts({ ...prompts, [key]: e.target.value })}
                  className="w-full h-24 bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
