import React, { useState } from 'react';
import { 
  Search, Zap, Loader2, Send, Trash2, Layout, BookOpen, 
  FileText, MessageSquare, Cpu, Code, Plus, ArrowRight,
  Download, Upload, Copy, Check, Sparkles, User 
} from 'lucide-react';
import { ViewType, ProjectData, ProjectMetadata, Note, Source } from '../../types';
import { generateId } from '../../services/storageService';
import { StenoLedgerPanel } from './Steno/StenoLedgerPanel';
import { StenoSourcesPanel } from './Steno/StenoSourcesPanel';
import { StenoChatPanel } from './Steno/StenoChatPanel';
import Markdown from 'react-markdown';

enum StenoTab {
  WORKSPACE = 'Workspace',
  LEDGER = 'Ledger',
  SOURCES = 'Sources',
  CHAT = 'Chat'
}

interface ResearchViewProps {
  projectData: ProjectData;
  globalNotes: Note[];
  projectsMetadata: ProjectMetadata[];
  currentUser: any;
  onUpdateProject: (data: Partial<ProjectData>) => void;
  onLinkClick?: (type: string, id: string) => void;
}

const ResearchView: React.FC<ResearchViewProps> = ({ projectData, globalNotes, projectsMetadata, currentUser, onUpdateProject, onLinkClick }) => {
  const [activeTab, setActiveTab] = useState<StenoTab>(StenoTab.WORKSPACE);

  // Shared State
  const ideas = projectData.ideas || [];
  const setIdeas = (newIdeas: Note[] | ((prev: Note[]) => Note[])) => {
    const updated = typeof newIdeas === 'function' ? newIdeas(ideas) : newIdeas;
    onUpdateProject({ ideas: updated });
  };
  
  const sources = projectData.sources || [];
  const setSources = (newSources: Source[] | ((prev: Source[]) => Source[])) => {
    const updated = typeof newSources === 'function' ? newSources(sources) : newSources;
    onUpdateProject({ sources: updated });
  };

  const ledger = projectData.ledger || [];

  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // UI State
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleConvertToSource = (content: string, name: string = 'Converted Note') => {
    const newSource: Source = {
      id: generateId(),
      name: `${name} (${new Date().toLocaleTimeString()})`,
      content,
      type: 'text',
      timestamp: Date.now(),
      isAnalyzing: false
    };
    setSources(prev => [newSource, ...prev]);
  };

  const handleCommitToLedger = (content: string) => {
    const newEntry: Note = {
      id: generateId(),
      content,
      timestamp: Date.now(),
      tags: [],
      isCanon: true,
      isSavedInLedger: true
    };
    onUpdateProject({ ledger: [newEntry, ...ledger] });
  };

  const handleSaveIdea = (content: string) => {
    const newIdea: Note = {
      id: generateId(),
      content,
      tags: [],
      isCanon: false,
      timestamp: Date.now()
    };
    setIdeas(prev => [newIdea, ...prev]);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case StenoTab.WORKSPACE:
        return (
          <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 lg:p-8 overflow-hidden">
            {/* Ledger Feed Panel */}
            <StenoLedgerPanel 
              projectData={projectData} 
              onUpdateProject={onUpdateProject} 
              currentUser={currentUser}
              projectsMetadata={projectsMetadata}
              onLinkClick={onLinkClick}
            />

            {/* Source Directory Panel */}
            <StenoSourcesPanel
              sources={sources}
              setSources={setSources}
            />
            
            {/* AI Chat Panel */}
            <StenoChatPanel 
              chatMessages={chatMessages}
              setChatMessages={setChatMessages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              isChatLoading={isChatLoading}
              setIsChatLoading={setIsChatLoading}
              onSaveIdea={handleSaveIdea}
              onCommitToLedger={handleCommitToLedger}
              sources={sources}
              ideas={ideas}
            />
          </div>
        );

      case StenoTab.LEDGER:
        return (
          <div className="h-full p-8 overflow-y-auto">
             <StenoLedgerPanel 
              projectData={projectData} 
              onUpdateProject={onUpdateProject} 
              currentUser={currentUser}
              projectsMetadata={projectsMetadata}
              onLinkClick={onLinkClick}
              isFullScreen={true}
            />
          </div>
        );

      case StenoTab.SOURCES:
        return (
          <div className="h-full p-8 overflow-y-auto">
            <div className="max-w-5xl mx-auto">
              <StenoSourcesPanel 
                sources={sources} 
                setSources={setSources} 
                isFullScreen={true}
              />
            </div>
          </div>
        );

      case StenoTab.CHAT:
        return (
          <div className="h-full flex flex-col max-w-4xl mx-auto p-4 lg:p-6">
             <StenoChatPanel 
              chatMessages={chatMessages}
              setChatMessages={setChatMessages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              isChatLoading={isChatLoading}
              setIsChatLoading={setIsChatLoading}
              onSaveIdea={handleSaveIdea}
              onCommitToLedger={handleCommitToLedger}
              sources={sources}
              ideas={ideas}
              isFullScreen={true}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">RESEARCH & DISCOVERY</h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Analyze sources, manage your ledger, and chat with Merlin.</p>
          </div>
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto no-scrollbar">
            {Object.values(StenoTab).map(tab => {
              const Icon = {
                [StenoTab.WORKSPACE]: Layout,
                [StenoTab.LEDGER]: BookOpen,
                [StenoTab.SOURCES]: Search,
                [StenoTab.CHAT]: MessageSquare
              }[tab as StenoTab];
              
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${isActive ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  {Icon && <Icon size={16} />}
                  {tab}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden relative">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default ResearchView;
