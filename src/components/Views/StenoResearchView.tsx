import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Zap, Loader2, Send, Trash2, Layout, BookOpen, 
  FileText, MessageSquare, Cpu, Code, Plus, ArrowRight,
  Download, Upload, Copy, Check, Sparkles, User as UserIcon, Pin, Link as LinkIcon, Save, Book
} from 'lucide-react';
import { stenoResearch, chatWithAssistant, generateSourceGuide as generateSourceGuideAi } from '../../services/geminiService';
import Markdown from 'react-markdown';
import { generateId } from '../../services/storageService';
import { StackedPaper } from '../ui/StackedPaper';
import { WikiText } from '../ui/WikiText';
import * as pdfjsLib from 'pdfjs-dist';

import { ProjectData, Note, ProjectMetadata, User, Source } from '../../types';
import { StenoLedgerPanel } from './Steno/StenoLedgerPanel';
import { StenoSourcesPanel } from './Steno/StenoSourcesPanel';
import { StenoChatPanel } from './Steno/StenoChatPanel';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

enum StenoTab {
  WORKSPACE = 'Workspace',
  LEDGER = 'Ledger',
  SOURCES = 'Sources',
  CHAT = 'Chat',
  ARCHITECT = 'Architect'
}



interface SourceGuide {
  summary: string;
  topics: string[];
  questions: string[];
}

interface StenoResearchViewProps {
  projectData: ProjectData;
  globalNotes: Note[];
  projectsMetadata?: ProjectMetadata[];
  currentUser?: User;
  onUpdateProject: (data: Partial<ProjectData>) => void;
  onLinkClick?: (type: string, id: string) => void;
}

const StenoResearchView: React.FC<StenoResearchViewProps> = ({ projectData, globalNotes, projectsMetadata, currentUser, onUpdateProject, onLinkClick }) => {
  const [activeTab, setActiveTab] = useState<StenoTab>(StenoTab.WORKSPACE);
  
  // Shared State
  const ideas = projectData.ideas || [];
  const setIdeas = (newIdeas: Note[] | ((prev: Note[]) => Note[])) => {
    const updated = typeof newIdeas === 'function' ? newIdeas(ideas) : newIdeas;
    onUpdateProject({ ideas: updated });
  };
  const [sources, setSources] = useState<Source[]>([]);
  const ledger = projectData.ledger || [];
  
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Architect State
  const [architectInput, setArchitectInput] = useState('');
  const [architectResults, setArchitectResults] = useState<string[]>([]);
  const [isArchitecting, setIsArchitecting] = useState(false);

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

  const handleArchitectShred = async () => {
    if (!architectInput.trim() || isArchitecting) return;
    setIsArchitecting(true);
    try {
      const res = await stenoResearch(architectInput);
      // Split by common markdown headers or bullet points to "shred"
      const sections = res.split(/## /).filter(s => s.trim().length > 0).map(s => `## ${s}`);
      setArchitectResults(sections);
    } catch (error) {
      console.error("Architect Error:", error);
    } finally {
      setIsArchitecting(false);
    }
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
          <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 lg:p-6 overflow-y-auto lg:overflow-hidden">
            {/* Ledger Panel */}
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
              onArchitect={(content) => {
                setArchitectInput(content);
                setActiveTab(StenoTab.ARCHITECT);
              }}
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
                onArchitect={(content) => {
                  setArchitectInput(content);
                  setActiveTab(StenoTab.ARCHITECT);
                }}
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

      case StenoTab.ARCHITECT:
        return (
          <div className="h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 lg:p-8">
              <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Cpu size={14} /> Raw Input
                    </h3>
                    <button 
                      onClick={() => setArchitectInput('')}
                      className="text-[10px] font-bold text-slate-400 hover:text-red-500"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex-1 relative">
                    <StackedPaper className="h-full">
                      <textarea
                        value={architectInput}
                        onChange={(e) => setArchitectInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleArchitectShred();
                          }
                        }}
                        placeholder="Paste massive brain-dumps or transcripts here to shred them into atomic notes..."
                        className="w-full h-full bg-transparent border-none focus:ring-0 resize-none font-serif text-lg leading-relaxed p-6 relative z-20 text-slate-900 dark:text-white"
                      />
                    </StackedPaper>
                  </div>
                  <button
                    onClick={handleArchitectShred}
                    disabled={isArchitecting || !architectInput.trim()}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                  >
                    {isArchitecting ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} />}
                    {isArchitecting ? 'Shredding...' : 'Shred into Atomic Notes'}
                  </button>
                </div>

                <div className="flex flex-col space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Layout size={14} /> Atomic Results
                  </h3>
                  <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                    {architectResults.length === 0 && (
                      <div className="h-full flex items-center justify-center text-slate-400 italic text-sm border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                        Results will appear here after shredding.
                      </div>
                    )}
                    {architectResults.map((res, i) => (
                      <StackedPaper key={i} className="group">
                        <div className="p-6 relative z-20">
                          <div className="prose prose-slate dark:prose-invert max-w-none text-sm mb-4">
                            <Markdown>{res}</Markdown>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleCommitToLedger(res)}
                              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors"
                            >
                              Commit to Ledger
                            </button>
                            <button 
                              onClick={() => handleConvertToSource(res, 'Atomic Note')}
                              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors"
                            >
                              Send to Sources
                            </button>
                          </div>
                        </div>
                      </StackedPaper>
                    ))}
                  </div>
                </div>
              </div>
            </div>
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
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">RESEARCH & ARCHITECT</h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Analyze sources, manage your ledger, and architect new ideas.</p>
          </div>
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto no-scrollbar">
            {Object.values(StenoTab).map(tab => {
              const Icon = {
                [StenoTab.WORKSPACE]: Layout,
                [StenoTab.LEDGER]: BookOpen,
                [StenoTab.SOURCES]: Search,
                [StenoTab.CHAT]: MessageSquare,
                [StenoTab.ARCHITECT]: Cpu
              }[tab];
              
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${isActive ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  <Icon size={16} />
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

export default StenoResearchView;
