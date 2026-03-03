import React, { useState, useEffect, useMemo } from 'react';
import { SemanticDocument, ProjectData } from '../../types';
import { SemanticEngine, SemanticMetadata } from '../../services/semanticEngine';
import { 
  FileText, 
  Activity, 
  Share2, 
  RefreshCw, 
  Database, 
  Link as LinkIcon, 
  Hash, 
  AtSign, 
  Bookmark,
  ChevronRight,
  Search,
  Zap
} from 'lucide-react';
import { StackedPaper } from '../ui/StackedPaper';
import Markdown from 'react-markdown';

interface SemanticEditorViewProps {
  projectData: ProjectData;
  onUpdateProject: (data: Partial<ProjectData>) => void;
}

export const SemanticEditorView: React.FC<SemanticEditorViewProps> = ({ projectData, onUpdateProject }) => {
  const [documents, setDocuments] = useState<SemanticDocument[]>(projectData.semanticDocuments || []);
  const [activeDocId, setActiveDocId] = useState<string | null>(documents[0]?.id || null);
  const [isHealing, setIsHealing] = useState(false);
  const [transclusionTarget, setTransclusionTarget] = useState('');
  const [transclusionResult, setTransclusionResult] = useState<string | null>(null);

  const activeDoc = useMemo(() => documents.find(d => d.id === activeDocId), [documents, activeDocId]);

  useEffect(() => {
    onUpdateProject({ semanticDocuments: documents });
  }, [documents]);

  const handleDocChange = (content: string) => {
    if (!activeDocId) return;
    setDocuments(prev => prev.map(d => d.id === activeDocId ? { ...d, content, lastModified: Date.now() } : d));
  };

  const handleHeal = async () => {
    if (!activeDoc) return;
    setIsHealing(true);
    try {
      const healedContent = await SemanticEngine.heal(activeDoc.content);
      handleDocChange(healedContent);
    } finally {
      setIsHealing(false);
    }
  };

  const handleTransclude = () => {
    if (!activeDoc || !transclusionTarget) return;
    const result = SemanticEngine.transclude(activeDoc.content, transclusionTarget);
    setTransclusionResult(result);
  };

  const graph = useMemo(() => {
    if (!activeDoc) return { entities: [], mentions: [], tags: [], anchors: [] };
    return SemanticEngine.getGraph(activeDoc.content);
  }, [activeDoc?.content]);

  const metadata: SemanticMetadata | null = useMemo(() => {
    if (!activeDoc) return null;
    const parts = activeDoc.content.split('\n\n===METADATA===\n');
    if (parts.length < 2) return null;
    try {
      return JSON.parse(parts[1]);
    } catch (e) {
      return null;
    }
  }, [activeDoc?.content]);

  const createNewDoc = () => {
    const newDoc: SemanticDocument = {
      id: crypto.randomUUID(),
      title: 'Untitled Semantic Doc',
      content: 'Start writing here...\n\n^anchor-1',
      lastModified: Date.now()
    };
    setDocuments(prev => [...prev, newDoc]);
    setActiveDocId(newDoc.id);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Database size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">Semantic Engine</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Self-Healing Document Architecture</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={createNewDoc}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
          >
            New Document
          </button>
          <button 
            onClick={handleHeal}
            disabled={!activeDoc || isHealing}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            {isHealing ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
            Heal Document
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: Doc List */}
        <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto p-4 space-y-2">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Documents</h3>
          {documents.map(doc => (
            <button
              key={doc.id}
              onClick={() => setActiveDocId(doc.id)}
              className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${activeDocId === doc.id ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <FileText size={16} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate">{doc.title}</div>
                <div className="text-[10px] opacity-50">{new Date(doc.lastModified).toLocaleDateString()}</div>
              </div>
            </button>
          ))}
        </aside>

        {/* Main Editor */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
          {activeDoc ? (
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                  <input 
                    type="text"
                    value={activeDoc.title}
                    onChange={(e) => setDocuments(prev => prev.map(d => d.id === activeDocId ? { ...d, title: e.target.value } : d))}
                    className="w-full bg-transparent border-none focus:ring-0 text-xl font-black text-slate-900 dark:text-white"
                  />
                </div>
                <textarea
                  value={activeDoc.content}
                  onChange={(e) => handleDocChange(e.target.value)}
                  className="flex-1 p-8 bg-transparent border-none focus:ring-0 resize-none font-mono text-sm leading-relaxed text-slate-700 dark:text-slate-300"
                  placeholder="Write your semantic prose here... Use [[Entities]], @Mentions, #Tags, and ^Anchors."
                />
              </div>

              {/* Inspector Panel */}
              <aside className="w-96 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 space-y-8">
                {/* Graph Map */}
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Share2 size={14} /> Graph Map
                  </h3>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {graph.entities.map(e => (
                        <span key={e} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-[10px] font-bold flex items-center gap-1">
                          <Bookmark size={10} /> [[{e}]]
                        </span>
                      ))}
                      {graph.mentions.map(m => (
                        <span key={m} className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-bold flex items-center gap-1">
                          <AtSign size={10} /> @{m}
                        </span>
                      ))}
                      {graph.tags.map(t => (
                        <span key={t} className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded text-[10px] font-bold flex items-center gap-1">
                          <Hash size={10} /> #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Transclusion Tool */}
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <LinkIcon size={14} /> Transclusion
                  </h3>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={transclusionTarget}
                      onChange={(e) => setTransclusionTarget(e.target.value)}
                      placeholder="^ID or ^ID:Start-End"
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                    <button 
                      onClick={handleTransclude}
                      className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Search size={16} />
                    </button>
                  </div>
                  {transclusionResult !== null && (
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-serif italic text-slate-600 dark:text-slate-400">
                      {transclusionResult || <span className="opacity-50">No content found for this target.</span>}
                    </div>
                  )}
                </section>

                {/* Manifest / Integrity */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Activity size={14} /> Integrity Manifest
                    </h3>
                  </div>
                  {metadata ? (
                    <div className="space-y-4">
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="text-[8px] font-mono text-slate-400 break-all">HASH: {metadata.hash}</div>
                      </div>

                      {/* Diff Log */}
                      {metadata.diffLog && metadata.diffLog.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-[8px] font-black text-red-500 uppercase tracking-widest">Recent Changes (Diff Log)</h4>
                          <div className="space-y-1">
                            {metadata.diffLog.map((log, i) => (
                              <div key={i} className="p-2 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20 text-[9px] text-red-600 dark:text-red-400">
                                <span className="font-bold">^{log.id}:</span> {log.change}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Anchors</h4>
                        <div className="space-y-1">
                          {metadata.manifest.map(entry => (
                            <div key={entry.id} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 group">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-900 dark:text-white">^{entry.id}</span>
                                  <span className={`text-[8px] px-1 rounded font-black uppercase ${entry.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                    {entry.status}
                                  </span>
                                </div>
                                <div className="text-[10px] font-mono text-slate-400">@{entry.offset}</div>
                              </div>
                              <div className="text-[8px] text-slate-400 italic">"...{entry.fingerprint}"</div>
                              
                              {/* Ranges */}
                              {entry.ranges && Object.keys(entry.ranges).length > 0 && (
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                                  {Object.entries(entry.ranges).map(([key, range]) => (
                                    <div key={key} className="flex items-center justify-between text-[8px]">
                                      <span className="text-slate-500 font-mono">Range {key}</span>
                                      <span className={`px-1 rounded font-black uppercase ${range.status === 'active' ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {range.status}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-400 italic text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      No metadata found. Click "Heal" to generate.
                    </div>
                  )}
                </section>
              </aside>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4">
              <Database size={48} className="opacity-10" />
              <p className="text-sm italic">Select or create a semantic document to begin.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
