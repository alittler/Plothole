import React, { useState, useEffect, useMemo } from 'react';
import { SemanticDocument, ProjectData } from '../../types';
import { SemanticWeaver, SemanticManifest } from '../../services/semanticWeaver';
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
  Zap,
  Plus,
  Trash2
} from 'lucide-react';
import { StackedPaper } from '../ui/StackedPaper';
import Markdown from 'react-markdown';
import { RichEditor } from '../ui/RichEditor';

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

  const handleContentChange = (newContent: string) => {
    if (!activeDocId) return;
    setDocuments(prev => prev.map(d => d.id === activeDocId ? { ...d, content: newContent, lastModified: Date.now() } : d));
  };

  const handleHeal = async () => {
    if (!activeDoc) return;
    setIsHealing(true);
    try {
      const { prose, metadata: oldMetadata } = SemanticWeaver.parseDocument(activeDoc.content);
      const newMetadata = await SemanticWeaver.rebuildMetadata(prose, oldMetadata || undefined);
      const healedContent = SemanticWeaver.formatDocument(prose, newMetadata);
      
      setDocuments(prev => prev.map(d => d.id === activeDocId ? { ...d, content: healedContent, lastModified: Date.now() } : d));
    } finally {
      setIsHealing(false);
    }
  };

  const graph = useMemo(() => {
    if (!activeDoc) return { entities: [], mentions: [], tags: [] };
    const { prose } = SemanticWeaver.parseDocument(activeDoc.content);
    return SemanticWeaver.extractGraph(prose);
  }, [activeDoc?.content]);

  const metadata: SemanticManifest | null = useMemo(() => {
    if (!activeDoc) return null;
    const { metadata } = SemanticWeaver.parseDocument(activeDoc.content);
    return metadata;
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
            onClick={handleHeal}
            disabled={isHealing || !activeDoc}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
             <RefreshCw size={14} className={isHealing ? 'animate-spin' : ''} />
             {isHealing ? 'Healing...' : 'Heal & Reconcile'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden pb-40">
        {/* Sidebar */}
        <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Documents</h2>
            <button onClick={createNewDoc} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
              <Plus size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {documents.map(doc => (
              <button
                key={doc.id}
                onClick={() => setActiveDocId(doc.id)}
                className={`w-full text-left p-3 rounded-xl text-sm transition-colors ${
                  activeDocId === doc.id 
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="truncate">{doc.title}</div>
                <div className="text-[10px] opacity-60 mt-1">{new Date(doc.lastModified).toLocaleDateString()}</div>
              </button>
            ))}
          </div>
        </div>

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
                <RichEditor
                  content={activeDoc.content}
                  onChange={handleContentChange}
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
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {graph.mentions.map(m => (
                        <span key={m} className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded text-[10px] font-bold flex items-center gap-1">
                          <AtSign size={10} /> @{m}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {graph.tags.map(t => (
                        <span key={t} className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded text-[10px] font-bold flex items-center gap-1">
                          <Hash size={10} /> #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Metadata Tail */}
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Database size={14} /> Metadata Tail
                  </h3>
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[10px] text-slate-500 overflow-x-auto">
                    <pre>{JSON.stringify(metadata, null, 2) || 'No metadata generated yet.'}</pre>
                  </div>
                </section>

                {/* Transclusion Test */}
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <LinkIcon size={14} /> Transclusion Test
                  </h3>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={transclusionTarget}
                      onChange={(e) => setTransclusionTarget(e.target.value)}
                      placeholder="^ID or ^ID:Start-End"
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs"
                    />
                    <button 
                      onClick={() => {}}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                    >
                      Fetch
                    </button>
                  </div>
                  {transclusionResult && (
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs border border-indigo-100 dark:border-indigo-900/50">
                      {transclusionResult}
                    </div>
                  )}
                </section>
              </aside>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 font-serif italic">
              Select a document to begin editing
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
