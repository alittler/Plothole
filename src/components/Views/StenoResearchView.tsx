import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Zap, Loader2, Send, Trash2, Layout, BookOpen, 
  FileText, MessageSquare, Cpu, Code, Plus, ArrowRight,
  Download, Upload, Copy, Check, Sparkles, User
} from 'lucide-react';
import { stenoResearch, chatWithAssistant } from '../../services/geminiService';
import Markdown from 'react-markdown';
import { generateId } from '../../services/storageService';
import { StackedPaper } from '../ui/StackedPaper';

enum StenoTab {
  WORKSPACE = 'Workspace',
  LEDGER = 'Ledger',
  SOURCES = 'Sources',
  CHAT = 'Chat',
  ARCHITECT = 'Architect',
  RAW = 'Raw'
}

interface Source {
  id: string;
  name: string;
  content: string;
  type: 'text' | 'pdf' | 'image';
  timestamp: number;
}

interface LedgerEntry {
  id: string;
  content: string;
  timestamp: number;
  tags: string[];
}

const StenoResearchView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<StenoTab>(StenoTab.WORKSPACE);
  
  // Shared State
  const [notepad, setNotepad] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // Architect State
  const [architectInput, setArchitectInput] = useState('');
  const [architectResults, setArchitectResults] = useState<string[]>([]);
  const [isArchitecting, setIsArchitecting] = useState(false);

  // UI State
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleConvertToSource = (content: string, name: string = 'Converted Note') => {
    const newSource: Source = {
      id: generateId(),
      name: `${name} (${new Date().toLocaleTimeString()})`,
      content,
      type: 'text',
      timestamp: Date.now()
    };
    setSources(prev => [newSource, ...prev]);
    // Optionally switch to sources tab or show toast
  };

  const handleCommitToLedger = (content: string) => {
    const newEntry: LedgerEntry = {
      id: generateId(),
      content,
      timestamp: Date.now(),
      tags: []
    };
    setLedger(prev => [newEntry, ...prev]);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    
    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      // Use sources as context if needed, for now just simple chat
      const context = sources.map(s => `Source: ${s.name}\n${s.content}`).join('\n\n');
      const history = chatMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      const response = await chatWithAssistant(userMsg, null, history, context);
      setChatMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      console.error("Chat Error:", error);
    } finally {
      setIsChatLoading(false);
    }
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const newSource: Source = {
        id: generateId(),
        name: file.name,
        content,
        type: 'text',
        timestamp: Date.now()
      };
      setSources(prev => [newSource, ...prev]);
    };
    reader.readAsText(file);
  };

  const handleAddManualSource = () => {
    const name = prompt("Enter source name:");
    if (!name) return;
    const content = prompt("Enter source content:");
    if (!content) return;
    
    const newSource: Source = {
      id: generateId(),
      name,
      content,
      type: 'text',
      timestamp: Date.now()
    };
    setSources(prev => [newSource, ...prev]);
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
            {/* Notepad Panel */}
            <div className="flex flex-col h-full">
              <StackedPaper className="flex-1">
                <div className="p-4 border-b border-slate-900/10 flex items-center justify-between relative z-20">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={14} /> Notepad
                  </h3>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleConvertToSource(notepad, 'Notepad Draft')}
                      disabled={!notepad.trim()}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-30 flex items-center gap-1"
                    >
                      Convert to Source <ArrowRight size={10} />
                    </button>
                    <button 
                      onClick={() => handleCommitToLedger(notepad)}
                      disabled={!notepad.trim()}
                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-30 flex items-center gap-1"
                    >
                      Commit to Ledger <Check size={10} />
                    </button>
                  </div>
                </div>
                <textarea
                  value={notepad}
                  onChange={(e) => setNotepad(e.target.value)}
                  placeholder="Draft your messy ideas here..."
                  className="flex-1 p-6 bg-transparent border-none focus:ring-0 resize-none font-serif text-lg text-slate-800 dark:text-slate-200 relative z-20"
                />
              </StackedPaper>
            </div>

            {/* AI Chat Panel */}
            <div className="flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare size={14} /> Synthesis Chat
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8">
                    <Sparkles size={32} className="mb-2 opacity-20" />
                    <p className="text-xs italic">Ask the AI to help synthesize your notes and sources.</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask anything..."
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={isChatLoading || !chatInput.trim()}
                  className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {isChatLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </div>

            {/* Source Directory Panel */}
            <div className="flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Search size={14} /> Source Directory
                </h3>
                <button 
                  onClick={handleAddManualSource}
                  className="p-1 text-slate-400 hover:text-indigo-500 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {sources.length === 0 && (
                  <div className="p-8 text-center text-slate-400 italic text-xs">No sources uploaded yet.</div>
                )}
                {sources.map(source => (
                  <div key={source.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-500">
                        <FileText size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{source.name}</div>
                        <div className="text-[10px] text-slate-400">{new Date(source.timestamp).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case StenoTab.LEDGER:
        return (
          <div className="h-full p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">PROJECT LEDGER</h2>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors">
                    <Download size={14} /> Export Ledger
                  </button>
                </div>
              </div>
              
              <div className="space-y-6">
                {ledger.length === 0 && (
                  <div className="p-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                    <BookOpen size={48} className="mx-auto mb-4 text-slate-200 dark:text-slate-800" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">The Ledger is Empty</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto mt-2">Commit your refined insights from the Architect or Notepad to preserve them here.</p>
                  </div>
                )}
                {ledger.map(entry => (
                  <StackedPaper key={entry.id} className="group">
                    <div className="absolute top-8 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                      <button 
                        onClick={() => copyToClipboard(entry.content, entry.id)}
                        className="p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-lg shadow-sm hover:text-indigo-500"
                      >
                        {copiedId === entry.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                    <div className="p-8 relative z-20">
                      <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4">
                        ENTRY // {new Date(entry.timestamp).toLocaleString()}
                      </div>
                      <div className="prose prose-slate dark:prose-invert max-w-none font-serif text-lg leading-relaxed">
                        <Markdown>{entry.content}</Markdown>
                      </div>
                    </div>
                  </StackedPaper>
                ))}
              </div>
            </div>
          </div>
        );

      case StenoTab.SOURCES:
        return (
          <div className="h-full p-8 overflow-y-auto">
            <div className="max-w-5xl mx-auto space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">SOURCE DIRECTORY</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Contextual grounding for the AI Architect.</p>
                </div>
                <div className="flex gap-2">
                  <label className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer">
                    <Upload size={16} /> Upload Files
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sources.length === 0 && (
                  <div className="col-span-full p-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400">
                    No sources found. Upload documents or convert notes to ground your AI.
                  </div>
                )}
                {sources.map(source => (
                  <div key={source.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500/50 transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 bg-slate-50 dark:bg-slate-950 rounded-xl flex items-center justify-center text-slate-500">
                        <FileText size={20} />
                      </div>
                      <button className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-1 truncate">{source.name}</h4>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-4">{source.type} • {Math.ceil(source.content.length / 6)} words</p>
                    <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 font-serif italic mb-4">
                      "{source.content.substring(0, 150)}..."
                    </div>
                    <button 
                      onClick={() => {
                        setArchitectInput(source.content);
                        setActiveTab(StenoTab.ARCHITECT);
                      }}
                      className="w-full py-2 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      Send to Architect
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case StenoTab.CHAT:
        return (
          <div className="h-full flex flex-col max-w-4xl mx-auto p-4 lg:p-6">
            <div className="flex-1 overflow-y-auto space-y-6 pb-32">
              {chatMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center">
                    <MessageSquare size={40} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">Deep Synthesis</h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-sm">A focused environment for long-form dialogue and complex reasoning grounded in your sources.</p>
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>
                    {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                  </div>
                  <div className={`max-w-[80%] p-6 rounded-3xl text-base leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm'}`}>
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                    {msg.role === 'model' && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                        <button 
                          onClick={() => handleCommitToLedger(msg.text)}
                          className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 flex items-center gap-1"
                        >
                          Commit to Ledger <ArrowRight size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="sticky bottom-0 left-0 right-0 p-4 bg-slate-50 dark:bg-slate-950 lg:bg-transparent lg:static lg:p-0">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-2 flex gap-2 max-w-3xl mx-auto w-full">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Deep dive into your project knowledge..."
                  className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-3 text-sm lg:text-lg"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={isChatLoading || !chatInput.trim()}
                  className="px-4 lg:px-6 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isChatLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </div>
            </div>
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
                        placeholder="Paste massive brain-dumps or transcripts here to shred them into atomic notes..."
                        className="w-full h-full bg-transparent border-none focus:ring-0 resize-none font-serif text-lg leading-relaxed p-6 relative z-20"
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

      case StenoTab.RAW:
        return (
          <div className="h-full p-8 flex flex-col">
            <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">RAW TEXT EDITOR</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Distraction-free bulk editing of your project data.</p>
                </div>
                <button className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors">
                  Save All Changes
                </button>
              </div>
              <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
                <textarea 
                  className="w-full h-full bg-transparent border-none focus:ring-0 resize-none font-mono text-sm leading-relaxed text-slate-600 dark:text-slate-400"
                  defaultValue={ledger.map(e => `--- ENTRY ${e.id} ---\n${e.content}`).join('\n\n')}
                />
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
      {/* Navigation Tabs */}
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 overflow-x-auto no-scrollbar">
        <div className="max-w-6xl mx-auto flex items-center gap-4 lg:gap-8 min-w-max">
          {Object.values(StenoTab).map(tab => {
            const Icon = {
              [StenoTab.WORKSPACE]: Layout,
              [StenoTab.LEDGER]: BookOpen,
              [StenoTab.SOURCES]: Search,
              [StenoTab.CHAT]: MessageSquare,
              [StenoTab.ARCHITECT]: Cpu,
              [StenoTab.RAW]: Code
            }[tab];
            
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-6 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] border-b-2 transition-all ${isActive ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                <Icon size={14} />
                {tab}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default StenoResearchView;
