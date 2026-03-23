import React, { useState, useMemo } from 'react';
import { ProjectData, AppPrompts, ToolboxLink, ProjectMetadata, Note, AppSettings, ViewType, User as AppUser, Artifact, LoreEntry, Source, Character, Location, TimelineEvent, ChangeLogEntry } from '../../types';
import { 
  Shield, Sparkles, Save, Database, Trash2, Check, Copy, Edit2, 
  Settings, User, Plus, Search, Archive, Clock, AlertCircle,
  FileText, Activity, Terminal, Code, Cpu, Download, Layout,
  UserPlus, Mail, Link as LinkIcon, ChevronRight, Maximize2, PenTool, X, Map, Globe, Loader2, RotateCcw, Target
} from 'lucide-react';

import { UnifiedDatabaseView } from './UnifiedDatabaseView';
import { WikiText } from '../ui/WikiText';
import { generateId } from '../../services/storageService';

interface AdminViewProps {
  data: ProjectData | null;
  globalNotes: Note[];
  appPrompts: AppPrompts;
  appSettings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onSavePrompts: (prompts: AppPrompts) => void;
  projectsMetadata: ProjectMetadata[];
  onUpdateProject: (updates: Partial<ProjectData>) => void;
  onFullArchive: () => void;
  globalResources: ToolboxLink[];
  onAddGlobalResource: (resource: ToolboxLink) => void;
  onDeleteGlobalResource: (id: string) => void;
  onToggleViewVisibility: (viewId: string) => void;
  onDeleteGlobalNote: (id: string) => void;
  onLinkClick: (type: string, id: string) => void;
  onChangeView: (view: ViewType) => void;
  onQuickUpdate: (type: string, id: string, key: string, value: any) => void;
  currentUser: AppUser;
  adminTargetId?: string | null;
  onClearAdminTarget?: () => void;
}

enum AdminTab {
  SYSTEM = 'System',
  NAVIGATION = 'Navigation',
  USERS = 'Users',
  LEDGER = 'Narrative Ledger'
}

enum CardCategory {
  ALL = 'All Cards',
  RESEARCH = 'Research',
  CHARACTERS = 'Characters',
  WORLD = 'World Hub',
  PLOT = 'Plot System'
}

export const AdminView: React.FC<AdminViewProps> = ({
  data, globalNotes, appPrompts, appSettings, onSaveSettings, onSavePrompts, projectsMetadata, onUpdateProject, onDeleteGlobalNote, onLinkClick, onChangeView, onQuickUpdate, currentUser, adminTargetId, onClearAdminTarget
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(adminTargetId ? AdminTab.LEDGER : AdminTab.SYSTEM);
  const [prompts, setPrompts] = useState(appPrompts);
  const [settings, setSettings] = useState(appSettings);
  const [cardSearch, setCardSearch] = useState('');
  const [cardSort, setCardSort] = useState<'name' | 'type' | 'id'>('name');
  const [activeCardCategory, setActiveCardCategory] = useState<CardCategory>(CardCategory.ALL);
  const [isQuickEdit, setIsQuickEdit] = useState(true);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  
  React.useEffect(() => {
    if (adminTargetId) {
      setActiveTab(AdminTab.LEDGER);
    }
  }, [adminTargetId]);

  // Template resolution logic
  const resolveTemplate = (template: string, itemData?: any) => {
    if (!data) return template;

    const charList = data.characters?.map(c => `- ${c.name} (${c.role})`).join('\n') || 'None';
    const locList = data.locations?.map(l => `- ${l.name} (${l.type})`).join('\n') || 'None';
    const timeList = data.timeline?.map(e => `- ${e.title} (${e.date})`).join('\n') || 'None';
    const loreList = data.lore?.map(l => `- ${l.term}: ${l.definition.slice(0, 50)}...`).join('\n') || 'None';
    const ledgerList = data.ledger?.map(n => `- ${n.content.slice(0, 50)}...`).join('\n') || 'None';
    const themeList = data.themes?.join(', ') || 'None';

    let compiled = template
      .replace(/{title}/g, data.title)
      .replace(/{author}/g, data.author || 'Unknown')
      .replace(/{summary}/g, data.summary || 'No summary.')
      .replace(/{characters}/g, charList)
      .replace(/{locations}/g, locList)
      .replace(/{timeline}/g, timeList)
      .replace(/{ledger}/g, ledgerList)
      .replace(/{lore}/g, loreList)
      .replace(/{themes}/g, themeList)
      .replace(/{user_context}/g, currentUser.name)
      .replace(/{tasks}/g, 'No active tasks.');

    if (itemData) {
      compiled = compiled
        .replace(/{name}/g, itemData.name || itemData.title || itemData.term || 'Untitled')
        .replace(/{type}/g, itemData.type || 'Object')
        .replace(/{role}/g, itemData.role || '')
        .replace(/{job}/g, itemData.job || '')
        .replace(/{x}/g, String(itemData.x || '0.0'))
        .replace(/{y}/g, String(itemData.y || '0.0'))
        .replace(/{description}/g, itemData.description || itemData.definition || itemData.content || '');
    }

    return compiled;
  };

  const allCards = useMemo(() => {
    if (!data) return [];
    let cards: { id: string; type: string; name: string; data: any }[] = [];
    
    data.characters?.forEach(c => cards.push({ id: c.id, type: 'Character', name: c.name || 'Untitled', data: c }));
    data.locations?.forEach(l => cards.push({ id: l.id, type: 'Location', name: l.name || 'Untitled', data: l }));
    data.timeline?.forEach(e => cards.push({ id: e.id, type: 'Timeline', name: e.title || 'Untitled', data: e }));
    data.sources?.forEach(s => cards.push({ id: s.id, type: 'Source', name: s.name || 'Untitled', data: s }));
    data.ledger?.forEach(n => cards.push({ id: n.id, type: 'Ledger', name: 'Note', data: n }));
    data.artifacts?.forEach(a => cards.push({ id: a.id, type: 'Artifact', name: a.name || 'Untitled', data: a }));
    data.lore?.forEach(l => cards.push({ id: l.id, type: 'Lore', name: l.term || 'Untitled', data: l }));

    if (activeCardCategory !== CardCategory.ALL) {
      cards = cards.filter(c => {
        switch (activeCardCategory) {
          case CardCategory.RESEARCH: return c.type === 'Source' || c.type === 'Ledger';
          case CardCategory.CHARACTERS: return c.type === 'Character';
          case CardCategory.WORLD: return c.type === 'Location' || c.type === 'Artifact' || c.type === 'Lore';
          case CardCategory.PLOT: return c.type === 'Timeline';
          default: return true;
        }
      });
    }

    if (cardSearch.trim()) {
      const q = cardSearch.toLowerCase();
      cards = cards.filter(c => 
        (c.name || '').toLowerCase().includes(q) || 
        (c.type || '').toLowerCase().includes(q) || 
        (c.id || '').toLowerCase().includes(q)
      );
    }

    cards.sort((a, b) => {
      const valA = (cardSort === 'name' ? a.name : cardSort === 'type' ? a.type : a.id) || '';
      const valB = (cardSort === 'name' ? b.name : cardSort === 'type' ? b.type : b.id) || '';
      return valA.localeCompare(valB);
    });

    return cards;
  }, [data, activeCardCategory, cardSearch, cardSort]);

  const renderTabContent = () => {
    switch (activeTab) {
      case AdminTab.SYSTEM:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl"><Settings size={24} /></div>
                <div><h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase">App Configuration</h2><p className="text-xs text-slate-500">Core system parameters and AI limits.</p></div>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Application Name</label><input type="text" value={settings.appName} onChange={e => setSettings({...settings, appName: e.target.value})} className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Character Limit</label><input type="number" value={settings.aiCharacterLimit} onChange={e => setSettings({...settings, aiCharacterLimit: parseInt(e.target.value)})} className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                <button onClick={() => onSaveSettings(settings)} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"><Save size={18} /> Update Configuration</button>
              </div>
            </section>

            <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl"><Cpu size={24} /></div>
                <div><h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase">AI Intelligence Schema</h2><p className="text-xs text-slate-500">Define system prompts and extraction logic.</p></div>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">General Extraction Prompt</label><textarea value={prompts.GENERAL_AND_CHARACTERS} onChange={e => setPrompts({...prompts, GENERAL_AND_CHARACTERS: e.target.value})} className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none" /></div>
                <button onClick={() => onSavePrompts(prompts)} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"><Save size={18} /> Update AI Schema</button>
              </div>
            </section>
          </div>
        );

      case AdminTab.LEDGER:
        return data ? (
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden h-[800px] animate-in fade-in zoom-in-95 duration-500">
            <UnifiedDatabaseView data={data} onUpdateProject={onUpdateProject} onQuickUpdate={onQuickUpdate} onLinkClick={onLinkClick} adminTargetId={adminTargetId} onClearAdminTarget={onClearAdminTarget} />
          </div>
        ) : (
          <div className="p-20 text-center space-y-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800"><Database size={48} className="mx-auto text-slate-200" /><p className="text-slate-400 italic font-serif">Load a project to access the Narrative Ledger.</p></div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-lg"><Shield size={24} /></div>
            <div><h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Admin Console</h1><p className="text-xs text-slate-500 uppercase font-black tracking-widest">Technical System Management</p></div>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {Object.values(AdminTab).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>{tab}</button>
            ))}
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">{renderTabContent()}</div>
    </div>
  );
};
