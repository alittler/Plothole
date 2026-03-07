import React from 'react';
import { ProjectData, AppPrompts, ToolboxLink, ProjectMetadata, Note, AppSettings } from '../../types';
import { Shield, Sparkles, Save, Database, Trash2, Clock, Tag, Type } from 'lucide-react';

interface AdminViewProps {
  data: ProjectData | null;
  globalNotes: Note[];
  appPrompts: AppPrompts;
  appSettings: AppSettings;
  onSaveSettings: (s: AppSettings) => void;
  onSavePrompts: (p: AppPrompts) => void;
  onUpdateProject: (d: Partial<ProjectData>) => void;
  onFullArchive: () => void;
  globalResources: ToolboxLink[];
  onAddGlobalResource: () => void;
  onDeleteGlobalResource: () => void;
  onToggleViewVisibility: () => void;
  projectsMetadata: ProjectMetadata[];
  onDeleteGlobalNote: (id: string) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  data, globalNotes, appPrompts, appSettings, onSaveSettings, onSavePrompts, projectsMetadata, onUpdateProject, onDeleteGlobalNote
}) => {
  const [prompts, setPrompts] = React.useState(appPrompts);
  const [settings, setSettings] = React.useState(appSettings);

  const adminNotes = React.useMemo(() => {
    const globalAdminNotes = globalNotes.filter(n => n.tags.includes('admin_note'));
    const projectAdminNotes = data?.ideas?.filter(n => n.tags.includes('admin_note')) || [];
    return [...globalAdminNotes, ...projectAdminNotes].sort((a, b) => b.timestamp - a.timestamp);
  }, [globalNotes, data]);

  const handleDeleteNote = async (id: string) => {
    if (globalNotes.some(n => n.id === id)) {
      onDeleteGlobalNote(id);
    } else if (data?.ideas?.some(n => n.id === id)) {
      onUpdateProject({ ideas: data.ideas.filter(n => n.id !== id) });
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-8">
        <div className="max-w-4xl mx-auto flex items-center gap-6">
          <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg">
            <Shield size={32} />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">ADMIN CONSOLE</h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Fine-tune the AI engines and system prompts.</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pb-12 space-y-12">

        <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
            <div className="flex items-center gap-4">
              <Type className="text-indigo-500" size={24} />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">App Settings</h2>
            </div>
            <button
              onClick={() => onSaveSettings(settings)}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
            >
              <Save size={18} />
              Save Settings
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">App Name</label>
              <input
                type="text"
                value={settings.appName}
                onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500"
                placeholder="Plothole AI"
              />
              <p className="text-xs text-slate-500">This name will be displayed in the sidebar and login screen.</p>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
            <div className="flex items-center gap-4">
              <Shield className="text-indigo-500" size={24} />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Model Configuration</h2>
            </div>
            <button
              onClick={() => onSavePrompts(prompts)}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
            >
              <Save size={18} />
              Save Changes
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Model</label>
              <select
                value={prompts.AI_MODEL}
                onChange={(e) => setPrompts({ ...prompts, AI_MODEL: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Default)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
                <option value="gemini-flash-latest">Gemini Flash Latest</option>
                <option value="gemini-pro-latest">Gemini Pro Latest</option>
              </select>
              <p className="text-xs text-slate-500 italic">Select the model that powers all narrative analysis and generation features.</p>
            </div>
          </div>
        </section>

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
            {Object.entries(prompts).filter(([key]) => key !== 'AI_MODEL').map(([key, value]) => (
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

        <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
            <div className="flex items-center gap-4">
              <Shield className="text-amber-500" size={24} />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Admin Notes</h2>
            </div>
            <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-black uppercase tracking-widest">
              {adminNotes.length} Notes
            </span>
          </div>

          <div className="space-y-4">
            {adminNotes.length === 0 ? (
              <p className="text-center py-8 text-slate-400 italic text-sm">No admin notes found.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {adminNotes.map(note => (
                  <div key={note.id} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 group relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                          <Shield size={16} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <Clock size={10} /> {new Date(note.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{note.content}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {note.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-400 rounded-md border border-slate-100 dark:border-slate-800 flex items-center gap-1">
                          <Tag size={8} /> {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
            <div className="flex items-center gap-4">
              <Database className="text-indigo-500" size={24} />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Backup Metadata</h2>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">This metadata is included when you perform a full system archive or backup.</p>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 overflow-x-auto">
              <pre className="text-xs font-mono text-slate-600 dark:text-slate-300">
                {JSON.stringify({
                  version: 11, // APP_DATA_VERSION
                  timestamp: Date.now(),
                  source: 'Plothole_System_Archive',
                  projects: projectsMetadata.map(p => ({
                    id: p.id,
                    title: p.title,
                    lastModified: p.lastModified
                  }))
                }, null, 2)}
              </pre>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
