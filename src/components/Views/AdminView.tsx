import React, { useState, useMemo } from 'react';
import { ProjectData, AppPrompts, ToolboxLink, ProjectMetadata, Note, AppSettings, ChangeLogEntry } from '../../types';
import { 
  Shield, Sparkles, Save, Database, Trash2, Clock, Tag, 
  Type, Users, Layout, Search, Filter, Hash, Archive,
  History, UserPlus, Mail, Link as LinkIcon, Check
} from 'lucide-react';
import { StackedPaper } from '../ui/StackedPaper';

enum AdminTab {
  SYSTEM = 'System',
  USERS = 'Users',
  CARDS = 'Master Card Feed'
}

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
  onLinkClick?: (type: string, id: string) => void;
  onChangeView?: (v: any) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  data, globalNotes, appPrompts, appSettings, onSaveSettings, onSavePrompts, projectsMetadata, onUpdateProject, onDeleteGlobalNote, onLinkClick, onChangeView
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(AdminTab.SYSTEM);
  const [prompts, setPrompts] = useState(appPrompts);
  const [settings, setSettings] = useState(appSettings);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);

  const adminNotes = useMemo(() => {
    const globalAdminNotes = globalNotes.filter(n => n.tags.includes('admin_note'));
    const projectAdminNotes = data?.ideas?.filter(n => n.tags.includes('admin_note')) || [];
    return [...globalAdminNotes, ...projectAdminNotes].sort((a, b) => b.timestamp - a.timestamp);
  }, [globalNotes, data]);

  // Unified Card Explorer logic
  const allCards = useMemo(() => {
    if (!data) return [];
    const cards: { id: string; type: string; name: string; data: any }[] = [];
    
    data.characters?.forEach(c => cards.push({ id: c.id, type: 'Character', name: c.name, data: c }));
    data.locations?.forEach(l => cards.push({ id: l.id, type: 'Location', name: l.name, data: l }));
    data.timeline?.forEach(e => cards.push({ id: e.id, type: 'Timeline', name: e.title, data: e }));
    data.sources?.forEach(s => cards.push({ id: s.id, type: 'Source', name: s.name, data: s }));
    data.ledger?.forEach(n => cards.push({ id: n.id, type: 'Ledger', name: 'Ledger Entry', data: n }));
    data.artifacts?.forEach(a => cards.push({ id: a.id, type: 'Artifact', name: a.name, data: a }));
    data.lore?.forEach(l => cards.push({ id: l.id, type: 'Lore', name: l.term, data: l }));
    
    return cards;
  }, [data]);

  const handleAddAdmin = () => {
    if (!newUserEmail.trim()) return;
    const currentAdmins = settings.adminEmails || [];
    if (!currentAdmins.includes(newUserEmail)) {
      const updated = { ...settings, adminEmails: [...currentAdmins, newUserEmail.trim()] };
      setSettings(updated);
      onSaveSettings(updated);
    }
    setNewUserEmail('');
  };

  const handleRemoveAdmin = (email: string) => {
    const updated = { ...settings, adminEmails: (settings.adminEmails || []).filter(e => e !== email) };
    setSettings(updated);
    onSaveSettings(updated);
  };

  const handleDeleteNote = async (id: string) => {
    if (globalNotes.some(n => n.id === id)) {
      onDeleteGlobalNote(id);
    } else if (data?.ideas?.some(n => n.id === id)) {
      onUpdateProject({ ideas: data.ideas.filter(n => n.id !== id) });
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case AdminTab.SYSTEM:
        return (
          <div className="space-y-12">
            <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
                <div className="flex items-center gap-4">
                  <Type className="text-indigo-500" size={24} />
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">App Settings</h2>
                </div>
                <button onClick={() => onSaveSettings(settings)} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                  <Save size={18} /> Save Settings
                </button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">App Name</label>
                  <input type="text" value={settings.appName} onChange={(e) => setSettings({ ...settings, appName: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Plothole AI" />
                </div>
              </div>
            </section>

            <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
                <div className="flex items-center gap-4">
                  <Shield className="text-indigo-500" size={24} />
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Configuration</h2>
                </div>
                <button onClick={() => onSavePrompts(prompts)} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                  <Save size={18} /> Save Changes
                </button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Model</label>
                  <select value={prompts.AI_MODEL} onChange={(e) => setPrompts({ ...prompts, AI_MODEL: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500">
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                  </select>
                </div>
              </div>
            </section>
          </div>
        );

      case AdminTab.USERS:
        return (
          <div className="space-y-8">
            <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                  <Users size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Role Management</h2>
                  <p className="text-xs text-slate-500">Assign Admin status to specific email addresses.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <input 
                  type="email" 
                  value={newUserEmail} 
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                />
                <button onClick={handleAddAdmin} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2">
                  <UserPlus size={18} /> Add Admin
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Admins</h3>
                {(settings.adminEmails || []).length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No external admins assigned.</p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {settings.adminEmails?.map(email => (
                      <div key={email} className="py-3 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <Mail size={14} className="text-slate-400" />
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{email}</span>
                        </div>
                        <button onClick={() => handleRemoveAdmin(email)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        );

      case AdminTab.CARDS:
        return (
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                  <Archive size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Master Card Feed</h2>
                  <p className="text-xs text-slate-500">Inspect every data object generated in this project container.</p>
                </div>
              </div>
              <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-black text-slate-500 uppercase tracking-widest">
                {allCards.length} Total Cards
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {allCards.map(card => (
                <div key={card.id} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-indigo-500/30 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded text-[8px] font-black uppercase tracking-widest">
                        {card.type}
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{card.name}</h3>
                      <span className="text-[10px] font-mono text-slate-400">#{card.id}</span>
                    </div>
                    <button 
                      onClick={() => {
                        const tag = `[[#${card.id}]]`;
                        navigator.clipboard.writeText(tag);
                        setCopiedCardId(card.id);
                        setTimeout(() => setCopiedCardId(null), 2000);
                      }}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all opacity-0 group-hover:opacity-100 flex items-center gap-1"
                      title="Copy Reference Tag"
                    >
                      {copiedCardId === card.id ? <Check size={16} /> : <LinkIcon size={16} />}
                      {copiedCardId === card.id && <span className="text-[8px] font-black uppercase">Copied</span>}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(card.data).map(([key, value]) => {
                      if (typeof value === 'object' || Array.isArray(value)) return null;
                      return (
                        <div key={key} className="space-y-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter block">{key}</span>
                          <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 truncate bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-100 dark:border-slate-800">
                            {String(value)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg">
              <Shield size={32} />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">ADMIN CONSOLE</h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">System architecture, role management, and master data feed.</p>
            </div>
          </div>
          
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto no-scrollbar">
            {Object.values(AdminTab).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 pb-12">
        {renderTabContent()}
      </div>
    </div>
  );
};
