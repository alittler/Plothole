import React from 'react';
import { ProjectData, Note, User, LedgerEntry, ViewType } from '../../types';
import { Settings, User as UserIcon, Database, Shield, Code, Check, ChevronRight } from 'lucide-react';

interface SettingsViewProps {
  projectData: ProjectData | null;
  globalNotes: Note[];
  onImportProject: (d: ProjectData) => void;
  onFactoryReset: () => void;
  currentUser: User;
  onUpdateUser: (u: Partial<User>) => void;
  onUpdateProject: (d: Partial<ProjectData>) => void;
  onChangeView: (v: ViewType) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser, onUpdateUser, onFactoryReset, projectData, onUpdateProject, onChangeView
}) => {
  const [rawText, setRawText] = React.useState('');
  const [isSaved, setIsSaved] = React.useState(false);

  React.useEffect(() => {
    if (projectData?.ledger) {
      setRawText(projectData.ledger.map(e => `--- ENTRY ${e.id} ---\n${e.content}`).join('\n\n'));
    }
  }, [projectData]);

  const handleSaveRaw = () => {
    if (!projectData) return;
    // Simple parser for the raw format
    const entries = rawText.split(/--- ENTRY (.*) ---/).filter(Boolean);
    const newLedger: LedgerEntry[] = [];
    for (let i = 0; i < entries.length; i += 2) {
      const id = entries[i].trim();
      const content = entries[i + 1]?.trim();
      if (id && content) {
        newLedger.push({
          id,
          content,
          timestamp: Date.now(),
          tags: [] // Tags are lost in this simple raw editor, but that's okay for "raw"
        });
      }
    }
    onUpdateProject({ ledger: newLedger });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="h-full overflow-y-auto p-8 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">SYSTEM SETTINGS</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Configure your writing environment and user profile.</p>
        </header>

        <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
          <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <UserIcon size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">User Profile</h2>
              <p className="text-xs text-slate-500">Your identity within the Plothole ecosystem.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Display Name</label>
              <input
                type="text"
                value={currentUser.name}
                onChange={(e) => onUpdateUser({ name: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Email Address</label>
              <input
                type="email"
                value={currentUser.email}
                onChange={(e) => onUpdateUser({ email: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </section>
        
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
          <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI & Semantic Engine</h2>
              <p className="text-xs text-slate-500">Configure how the AI interacts with your project data.</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 dark:text-white">Semantic Search Engine</h3>
              <p className="text-xs text-slate-500">Enable deep-meaning search across all your notes and ideas.</p>
            </div>
            <button 
              onClick={() => onUpdateUser({ 
                preferences: { 
                  ...currentUser.preferences, 
                  semanticSearchEnabled: !currentUser.preferences?.semanticSearchEnabled 
                } 
              })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${currentUser.preferences?.semanticSearchEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${currentUser.preferences?.semanticSearchEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 dark:text-white">Semantic Engine Dashboard</h3>
              <p className="text-xs text-slate-500">Access the advanced Semantic Engine view to analyze your story world.</p>
            </div>
            <button 
              onClick={() => onChangeView?.(ViewType.SEMANTIC_EDITOR)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
            >
              Open Engine
            </button>
          </div>
        </section>

        {projectData && (
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                  <Code size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Raw Ledger Editor</h2>
                  <p className="text-xs text-slate-500">Bulk edit your project's ledger entries directly.</p>
                </div>
              </div>
              <button
                onClick={handleSaveRaw}
                className={`px-6 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${isSaved ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
              >
                {isSaved ? <><Check size={16} /> Saved</> : 'Save Changes'}
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full h-96 bg-transparent border-none focus:ring-0 resize-none font-mono text-sm leading-relaxed text-slate-600 dark:text-slate-400"
                placeholder="--- ENTRY id ---\nContent here..."
              />
            </div>
          </section>
        )}

        <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
          <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl">
              <Database size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Data Management</h2>
              <p className="text-xs text-slate-500">Critical system operations and database maintenance.</p>
            </div>
          </div>

          <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30">
            <h3 className="font-bold text-red-600 dark:text-red-400 mb-2 uppercase text-xs tracking-widest">Factory Reset</h3>
            <p className="text-sm text-red-700 dark:text-red-300/70 mb-4">This will permanently delete all projects, characters, manuscripts, and notes. This action cannot be undone.</p>
            <button
              onClick={onFactoryReset}
              className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors"
            >
              Wipe All Data
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
