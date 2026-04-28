import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Search, Zap, Loader2, Send, Trash2, Layout, BookOpen, 
  FileText, Cpu, Code, Plus, ArrowRight,
  Download, Upload, Copy, Check, Sparkles, User 
} from 'lucide-react';
import { ViewType, ProjectData, ProjectMetadata, Note, Source } from '../../types';
import { generateId } from '../../services/storageService';
import { StenoSourcesPanel } from './Steno/StenoSourcesPanel';
import { StenoChatPanel } from './Steno/StenoChatPanel';
import Markdown from 'react-markdown';

enum StenoTab {
  RESEARCH = 'Research',
  SOURCES = 'Sources'
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') as StenoTab) || StenoTab.RESEARCH;
  const setActiveTab = (tab: StenoTab) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    router.push(`?${params.toString()}`);
  };

  // Shared State
  const ideas = projectData.ideas || [];
  const setIdeas = async (newIdeas: Note[] | ((prev: Note[]) => Note[])) => {
    const updated = typeof newIdeas === 'function' ? newIdeas(ideas) : newIdeas;
    await onUpdateProject({ ideas: updated });
  };
  
  const setSources = async (newSources: Source[] | ((prev: Source[]) => Source[])) => {
    const currentSources = projectData.sources || [];
    const updated = typeof newSources === 'function' ? newSources(currentSources) : newSources;
    console.log("Saving sources to projectData:", updated.length);
    await onUpdateProject({ sources: updated });
  };

  const sources = projectData.sources || [];
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(sources.map(s => s.id));

  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // UI State
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mobileSubTab, setMobileSubTab] = useState<'chat' | 'sources'>('chat');

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
      case StenoTab.RESEARCH:
        return (
          <div className="h-full flex flex-col overflow-hidden">
            {/* Mobile Sub-Tab Navigation */}
            <div className="lg:hidden flex p-2 bg-slate-100 dark:bg-slate-800 gap-1 shrink-0 border-b border-slate-200 dark:border-slate-700">
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
                {/* Chat Panel - First Column */}
                <div className={`${mobileSubTab === 'chat' ? 'block' : 'hidden'} lg:block lg:col-span-3 h-full overflow-hidden lg:order-1`}>
                  <StenoChatPanel 
                    chatMessages={chatMessages}
                    setChatMessages={setChatMessages}
                    chatInput={chatInput}
                    setChatInput={setChatInput}
                    isChatLoading={isChatLoading}
                    setIsChatLoading={setIsChatLoading}
                    onSaveIdea={handleSaveIdea}
                    onSaveAsSource={handleSaveChatAsSource}
                    sources={sources.filter(s => selectedSourceIds.includes(s.id))}
                    ideas={ideas}
                  />
                </div>

                {/* Sources Panel - Second Column */}
                <div className={`${mobileSubTab === 'sources' ? 'block' : 'hidden'} lg:block lg:col-span-1 h-full overflow-hidden lg:order-2`}>
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

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md z-10 shrink-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-0 hidden sm:block">
              <h1 className="ph-section-title text-xl md:text-3xl flex items-center gap-2 md:gap-3">
                <Search size={24} className="md:w-8 md:h-8 text-indigo-600" /> <span className="hidden md:inline">Research & Discovery</span>
              </h1>
            </div>
            <div className="sm:hidden">
              <Search size={24} className="text-indigo-600" />
            </div>
            <div className="relative ml-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search..."
                className="ph-input pl-12 w-64"
              />
            </div>
          </div>
          <div className="ph-tab-container overflow-x-auto no-scrollbar">
            {Object.values(StenoTab).map(tab => {
              const Icon = {
                [StenoTab.RESEARCH]: Layout,
                [StenoTab.SOURCES]: Search
              }[tab as StenoTab];
              
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`ph-tab text-xs md:text-sm ${isActive ? "ph-tab-active" : "ph-tab-inactive"}`}
                >
                  {Icon && <Icon size={14} className="md:w-4 md:h-4" />}
                  <span className="hidden sm:inline">{tab}</span>
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
