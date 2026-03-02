import React from 'react';
import { ProjectData, Note, User } from '../../types';
import { Settings, User as UserIcon, Database, Shield } from 'lucide-react';

interface SettingsViewProps {
  projectData: ProjectData | null;
  globalNotes: Note[];
  onImportProject: (d: ProjectData) => void;
  onFactoryReset: () => void;
  currentUser: User;
  onUpdateUser: (u: Partial<User>) => void;
  onUpdateProject: (d: Partial<ProjectData>) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser, onUpdateUser, onFactoryReset
}) => {
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
