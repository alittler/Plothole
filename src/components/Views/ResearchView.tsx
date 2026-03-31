import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  onDeleteNote: (id: string) => Promise<void>;
  onLinkClick?: (type: string, id: string) => void;
  }

  const ResearchView: React.FC<ResearchViewProps> = ({
  projectData, globalNotes, projectsMetadata, currentUser, onUpdateProject, onDeleteNote, onLinkClick
  }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as StenoTab) || StenoTab.WORKSPACE;
  const setActiveTab = (tab: StenoTab) => setSearchParams({ tab });

  // Shared State
  const ideas = projectData.ideas || [];
  const setIdeas = (newIdeas: Note[] | ((prev: Note[]) => Note[])) => {
    const updated = typeof newIdeas === 'function' ? newIdeas(ideas) : newIdeas;
    onUpdateProject({ ideas: updated });
  };
  
  const setSources = (newSources: Source[] | ((prev: Source[]) => Source[])) => {
    // We need to use functional update to avoid stale closure issues
    onUpdateProject(prev => {
      const currentSources = prev.sources || [];
      const updated = typeof newSources === 'function' ? newSources(currentSources) : newSources;
      console.log("Saving sources to projectData:", updated.length);
      return { ...prev, sources: updated };
    });
  };

  const sources = projectData.sources || [];
  const ledger = projectData.ledger || [];
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(sources.map(s => s.id));

  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // UI State
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mobileSubTab, setMobileSubTab] = useState<'ledger' | 'chat' | 'sources'>('chat');

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

  const handleSaveChatAsSource = () => {
    if (chatMessages.length === 0) return;
    
    const content = chatMessages.map(m => `### ${m.role === 'user' ? 'USER' : 'ORACLE'}\n\n${m.text}`).join('\n\n');
    const newSource: Source = {
      id: generateId(),
      name: `Chat Archive - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      content: content,
      type: 'text',
      timestamp: Date.now(),
      isAnalyzing: false
    };
    
    setSources(prev => [newSource, ...prev]);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case StenoTab.WORKSPACE:
        return (
          <div className="h-full flex flex-col overflow-hidden">
            {/* Mobile Sub-Tab Navigation */}
            <div className="lg:hidden flex p-2 bg-slate-100 dark:bg-slate-800 gap-1 shrink-0 border-b border-slate-200 dark:border-slate-700">
              <button 
                onClick={() => setMobileSubTab('ledger')}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mobileSubTab === 'ledger' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
              >
                Ledger
              </button>
              <button 
                onClick={() => setMobileSubTab('chat')}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mobileSubTab === 'chat' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
              >
                Oracle
              </button>
              <button 
                onClick={() => setMobileSubTab('sources')}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mobileSubTab === 'sources' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
              >
                Sources
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-0 md:p-8 custom-scrollbar">
              <div className="h-full min-h-full grid grid-cols-1 lg:grid-cols-4 gap-6 pb-40 lg:pb-0">
                {/* Ledger Panel */}
                <div className={`${mobileSubTab === 'ledger' ? 'block' : 'hidden'} lg:block lg:col-span-1 h-full overflow-hidden`}>
                  <StenoLedgerPanel 
                    projectData={projectData} 
                    onUpdateProject={onUpdateProject} 
                    onDeleteNote={onDeleteNote}
                    currentUser={currentUser}
                    projectsMetadata={projectsMetadata}
                    onLinkClick={onLinkClick}
                  />
                </div>

                {/* Chat Panel */}
                <div className={`${mobileSubTab === 'chat' ? 'block' : 'hidden'} lg:block lg:col-span-2 h-full overflow-hidden`}>
                  <StenoChatPanel 
                    chatMessages={chatMessages}
                    setChatMessages={setChatMessages}
                    chatInput={chatInput}
                    setChatInput={setChatInput}
                    isChatLoading={isChatLoading}
                    setIsChatLoading={setIsChatLoading}
                    onSaveIdea={handleSaveIdea}
                    onCommitToLedger={handleCommitToLedger}
                    onSaveAsSource={handleSaveChatAsSource}
                    sources={sources.filter(s => selectedSourceIds.includes(s.id))}
                    ideas={ideas}
                  />
                </div>

                {/* Sources Panel */}
                <div className={`${mobileSubTab === 'sources' ? 'block' : 'hidden'} lg:block lg:col-span-1 h-full overflow-hidden`}>
                  <StenoSourcesPanel
                    sources={sources}
                    setSources={setSources}
                    projectId={projectData.id}
                    selectedSourceIds={selectedSourceIds}
                    setSelectedSourceIds={setSelectedSourceIds}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case StenoTab.LEDGER:
        return (
          <div className="h-full overflow-y-auto p-0 md:p-8 custom-scrollbar">
             <div className="min-h-full pb-40">
               <StenoLedgerPanel 
                projectData={projectData} 
                onUpdateProject={onUpdateProject} 
                onDeleteNote={onDeleteNote}
                currentUser={currentUser}
                projectsMetadata={projectsMetadata}
                onLinkClick={onLinkClick}
                isFullScreen={true}
              />
             </div>
          </div>
        );

      case StenoTab.SOURCES:
        return (
          <div className="h-full overflow-y-auto p-0 md:p-8 custom-scrollbar">
            <div className="max-w-7xl mx-auto min-h-full pb-40">
              <StenoSourcesPanel 
                sources={sources} 
                setSources={setSources} 
                isFullScreen={true}
                projectId={projectData.id}
              />
            </div>
          </div>
        );

      case StenoTab.CHAT:
        return (
          <div className="h-full flex flex-col max-w-4xl mx-auto p-4 lg:p-6 min-h-full pb-40">
             <StenoChatPanel 
              chatMessages={chatMessages}
              setChatMessages={setChatMessages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              isChatLoading={isChatLoading}
              setIsChatLoading={setIsChatLoading}
              onSaveIdea={handleSaveIdea}
              onCommitToLedger={handleCommitToLedger}
              onSaveAsSource={handleSaveChatAsSource}
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
      <header className="p-6 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md z-10 shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="ph-section-title text-2xl md:text-3xl flex items-center justify-center md:justify-start gap-3">
              <Search size={32} className="text-indigo-600" /> Research & Discovery
            </h1>
            <p className="ph-section-subtitle">Analyze sources, manage your ledger, and chat with the Oracle.</p>
          </div>
          <div className="ph-tab-container w-full md:w-auto overflow-x-auto no-scrollbar">
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
                  className={`ph-tab ${isActive ? "ph-tab-active" : "ph-tab-inactive"}`}
                >
                  {Icon && <Icon size={14} />}
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
