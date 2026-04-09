import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProjectData, HierarchicalEntity } from '../../types';
import { Book, Search, FileText, Settings, Languages, Box, Plus, Upload, Send, Loader2, X, MessageSquare, Bookmark } from 'lucide-react';
import { WikiText } from '../ui/WikiText';
import { generateId } from '../../services/storageService';
import { analyzeSourceForCodex } from '../../services/geminiService';

interface CodexViewProps {
  projectData: ProjectData;
  onLinkClick: (type: string, id: string) => void;
  onUpdateProject: (updates: Partial<ProjectData>) => void;
}

enum CodexTab {
  SYSTEMS = 'Systems',
  ENCYCLOPEDIA = 'Encyclopedia',
  LINGUISTICS = 'Linguistics',
  ARTIFACTS = 'Artifacts',
  SOURCES = 'Sources'
}

export const CodexView: React.FC<CodexViewProps> = ({ projectData, onLinkClick, onUpdateProject }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as CodexTab) || CodexTab.ENCYCLOPEDIA;
  const setActiveTab = (tab: CodexTab) => setSearchParams({ tab });

  const [searchTerm, setSearchTerm] = useState('');
  const [uploadedSources, setUploadedSources] = useState<{id: string; name: string; content: string}[]>(
    projectData.codexSources || []
  );
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant'; text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const lore = projectData.lore || [];
  const entities = projectData.entities || [];
  const artifacts = entities.filter(e => e.type === 'Item' || e.type === 'Artifact');

  const getFilteredContent = () => {
    let base: any[] = [];
    if (activeTab === CodexTab.SYSTEMS) {
      base = lore.filter(l => l.category === 'System' || l.category === 'Rules');
    } else if (activeTab === CodexTab.ENCYCLOPEDIA) {
      base = lore.filter(l => l.category !== 'Dictionary' && l.category !== 'System' && l.category !== 'Rules');
    } else if (activeTab === CodexTab.LINGUISTICS) {
      base = lore.filter(l => l.category === 'Dictionary' || l.category === 'Linguistics');
    } else if (activeTab === CodexTab.ARTIFACTS) {
      base = artifacts;
    }

    return base.filter(entry => {
      const name = entry.term || entry.name || '';
      const content = entry.definition || entry.description || '';
      return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             content.toLowerCase().includes(searchTerm.toLowerCase());
    });
  };

  const filteredContent = getFilteredContent();

  const handleAddEntry = () => {
    if (activeTab === CodexTab.ARTIFACTS) {
      const newArtifact: HierarchicalEntity = {
        id: generateId(),
        name: 'New Artifact',
        type: 'Artifact',
        tier: 3,
        species: 'Object',
        description: '',
        source: 'manual'
      };
      onUpdateProject({ entities: [...entities, newArtifact] });
    } else {
      let category = 'General';
      if (activeTab === CodexTab.SYSTEMS) category = 'System';
      if (activeTab === CodexTab.LINGUISTICS) category = 'Dictionary';
      
      const newLore = {
        id: generateId(),
        term: 'New Entry',
        definition: '',
        category,
        source: 'manual' as const
      };
      onUpdateProject({ lore: [...lore, newLore] });
    }
  };

  const handleUploadSource = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const newSource = {
        id: generateId(),
        name: file.name,
        content: content.substring(0, 10000) // Limit to 10k chars for demo
      };
      const updated = [...uploadedSources, newSource];
      setUploadedSources(updated);
      setSelectedSourceId(newSource.id);
      // Persist to projectData
      onUpdateProject({ codexSources: updated });
    };
    reader.readAsText(file);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !selectedSourceId || isChatLoading) return;

    const source = uploadedSources.find(s => s.id === selectedSourceId);
    if (!source) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsChatLoading(true);

    try {
      const assistantMessage = await analyzeSourceForCodex(source.content, userMessage);
      setChatMessages(prev => [...prev, { role: 'assistant', text: assistantMessage }]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to analyze source';
      setChatMessages(prev => [...prev, { role: 'assistant', text: `Error: ${errorMsg}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSaveAsLoreEntry = () => {
    if (chatMessages.length === 0) return;

    const lastAssistantMessage = [...chatMessages].reverse().find(m => m.role === 'assistant');
    if (!lastAssistantMessage) return;

    const newLore = {
      id: generateId(),
      term: uploadedSources.find(s => s.id === selectedSourceId)?.name || 'Extracted Entry',
      definition: lastAssistantMessage.text,
      category: 'General',
      source: 'user' as const
    };
    onUpdateProject({ lore: [...lore, newLore] });
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <header className="p-6 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md z-10 shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="ph-section-title text-2xl md:text-3xl flex items-center justify-center md:justify-start gap-3">
              <Book size={32} className="text-indigo-600" /> Story Codex
            </h1>
            <p className="ph-section-subtitle">The authoritative collection of your world's knowledge.</p>
          </div>
          <div className="ph-tab-container w-full md:w-auto overflow-x-auto no-scrollbar">
            {Object.values(CodexTab).map(tab => {
              const Icon = {
                [CodexTab.SYSTEMS]: Settings,
                [CodexTab.ENCYCLOPEDIA]: Book,
                [CodexTab.LINGUISTICS]: Languages,
                [CodexTab.ARTIFACTS]: Box,
                [CodexTab.SOURCES]: Upload
              }[tab];
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`ph-tab ${activeTab === tab ? "ph-tab-active" : "ph-tab-inactive"}`}
                >
                  <Icon size={14} />
                  {tab}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-0 md:p-8 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 min-h-full pb-40">
          {activeTab === CodexTab.SOURCES ? (
            // Sources/NotebookLM Tab
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
              {/* Sources List */}
              <div className="lg:col-span-1 flex flex-col">
                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Upload Source</label>
                  <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-indigo-300 rounded-xl cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors">
                    <div className="flex flex-col items-center gap-2">
                      <Upload size={20} className="text-indigo-600" />
                      <span className="text-xs font-bold text-indigo-600 text-center">Click to upload</span>
                    </div>
                    <input type="file" className="hidden" onChange={handleUploadSource} accept=".txt,.md,.pdf" />
                  </label>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                  {uploadedSources.map(source => (
                    <button
                      key={source.id}
                      onClick={() => setSelectedSourceId(source.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedSourceId === source.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 justify-between">
                        <FileText size={16} className="flex-shrink-0" />
                        <span className="text-sm font-bold truncate flex-1">{source.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const updated = uploadedSources.filter(s => s.id !== source.id);
                            setUploadedSources(updated);
                            if (selectedSourceId === source.id) setSelectedSourceId(null);
                            onUpdateProject({ codexSources: updated });
                          }}
                          className="p-1 hover:bg-red-500/20 rounded transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat */}
              <div className="lg:col-span-2 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {selectedSourceId ? (
                  <>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                      {chatMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                          <MessageSquare size={48} className="mb-4 opacity-20" />
                          <p className="font-serif italic">Ask questions about this source to extract insights for your Codex.</p>
                        </div>
                      ) : (
                        chatMessages.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              msg.role === 'user'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                            }`}>
                              <p className="text-sm">{msg.text}</p>
                            </div>
                          </div>
                        ))
                      )}
                      {isChatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2 rounded-lg flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin" />
                            <span className="text-sm">Analyzing source...</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Ask about this source..."
                          className="ph-input flex-1"
                          disabled={isChatLoading}
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={isChatLoading || !chatInput.trim()}
                          className="ph-button-primary"
                        >
                          <Send size={18} />
                        </button>
                      </div>
                      {chatMessages.length > 0 && (
                        <button
                          onClick={handleSaveAsLoreEntry}
                          className="flex items-center gap-2 justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-bold text-sm"
                        >
                          <Bookmark size={16} />
                          Save to Encyclopedia
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <Upload size={48} className="mb-4 opacity-20" />
                    <p className="font-serif italic">Upload a source to begin</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Other tabs
            <>
              <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder={`Search ${activeTab.toLowerCase()}...`} 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="ph-input pl-12 w-full"
                  />
                </div>
                <button
                  onClick={handleAddEntry}
                  className="ph-button-primary w-full sm:w-auto"
                >
                  <Plus size={18} />
                  Add Entry
                </button>
              </div>

              {filteredContent.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                  <Book size={48} className="mb-4 opacity-20" />
                  <p className="font-serif italic text-lg">No entries found in {activeTab}.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {filteredContent.map(entry => {
                    const id = entry.id;
                    const title = entry.term || entry.name;
                    const description = entry.definition || entry.description;
                    const category = entry.category || entry.type;

                    return (
                      <div key={id} className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative group">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{category}</span>
                          <button 
                            onClick={() => onLinkClick('admin', id)}
                            className="text-slate-400 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <FileText size={16} />
                          </button>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-2">{title}</h3>
                        <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-serif">
                          <WikiText text={description} projectData={projectData} onLinkClick={onLinkClick} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
