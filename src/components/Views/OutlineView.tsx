import React, { useState, useMemo } from 'react';
import { ProjectData, Note, ViewType } from '../../types';
import { 
  Sparkles, 
  Database, 
  Search, 
  Loader2, 
  CheckCircle2, 
  FileText, 
  Layout, 
  GitMerge, 
  Zap,
  Youtube,
  Clipboard,
  Download,
  ArrowRight,
  Plus
} from 'lucide-react';
import Markdown from 'react-markdown';

interface OutlineViewProps {
  projectData: ProjectData;
  globalNotes: Note[];
  onUpdateProject: (updates: Partial<ProjectData>) => void;
}

export const OutlineView: React.FC<OutlineViewProps> = ({
  projectData,
  globalNotes,
  onUpdateProject
}) => {
  const [activeTab, setActiveTab] = useState<'architect' | 'planner' | 'sources'>('architect');
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outline, setOutline] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Planner State
  const [plotInput, setPlotInput] = useState('');
  const [connections, setConnections] = useState<Array<{ title: string; logic: string; motifs: string[] }> | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);

  // Sources State
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isFetchingTranscript, setIsFetchingTranscript] = useState(false);
  const [transcripts, setTranscripts] = useState<Array<{ id: string; url: string; text: string }>>([]);

  const handleFetchTranscript = async () => {
    if (!youtubeUrl.trim()) return;
    setIsFetchingTranscript(true);
    try {
      const response = await fetch('/api/transcripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl })
      });
      const data = await response.json();
      if (data.transcript) {
        setTranscripts(prev => [...prev, { id: data.videoId, url: youtubeUrl, text: data.transcript }]);
        setYoutubeUrl('');
      } else {
        alert(data.error || 'Failed to fetch transcript');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while fetching transcript');
    } finally {
      setIsFetchingTranscript(false);
    }
  };

  const allRelevantNotes = useMemo(() => {
    const combined = [...(projectData.notes || []), ...globalNotes];
    const unique = Array.from(new Map(combined.map(n => [n.id, n])).values());
    return unique.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [projectData.notes, globalNotes]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return allRelevantNotes;
    const q = searchQuery.toLowerCase();
    return allRelevantNotes.filter(n => 
      n.content.toLowerCase().includes(q) || 
      n.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [allRelevantNotes, searchQuery]);

  const handleToggleNote = (id: string) => {
    setSelectedNoteIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleGenerateOutline = async () => {
    if (selectedNoteIds.length === 0 && transcripts.length === 0) return;
    setIsProcessing(true);
    try {
      const selectedNotes = allRelevantNotes.filter(n => selectedNoteIds.includes(n.id));
      const notesContent = selectedNotes.map(n => n.content).join('\n\n---\n\n');
      const transcriptsContent = transcripts.map(t => `[VIDEO TRANSCRIPT - ${t.url}]\n${t.text}`).join('\n\n---\n\n');
      
      const response = await fetch('/api/narrative/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Act as a Narrative Architect. Generate a comprehensive, hierarchical outline for a story based on the provided notes and transcripts.
          
          NOTES:
          ${notesContent}

          TRANSCRIPTS:
          ${transcriptsContent}
          
          STRUCTURE REQUIREMENTS:
          1. Narrative & Synthesis Summary: A high-level overview of the story's core conflict and theme.
          2. Chapter-by-Chapter Core Blueprint: A detailed breakdown of the narrative arc.
          3. Collected Sources & References: A database of key terms, names, and concepts.
          
          Format the output in clean Markdown with H1, H2, and H3 headers.`,
          context: "Generating a structured story outline from selected notes and transcripts."
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[OutlineView] Outline API Error Status:', response.status);
        console.error('[OutlineView] Outline API Error Body:', errorText);
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setOutline(data.result);
    } catch (err: any) {
      console.error('Outline generation error:', err.message || err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateConnections = async () => {
    if (!plotInput.trim()) return;
    setIsPlanning(true);
    try {
      const response = await fetch('/api/narrative/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Act as a Plot Architect. For the following plot point or idea, generate 3 unique "Narrative Connections" or "Plot Arcs" that could follow.
          
          IDEA: ${plotInput}
          
          Return a JSON array of objects with this structure:
          { "title": "Connection Title", "logic": "Description of the connection", "motifs": ["motif1", "motif2"] }
          
          Return ONLY the JSON array.`,
          context: "Generating plot connections for a new idea."
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[OutlineView] Connections API Error Status:', response.status);
        console.error('[OutlineView] Connections API Error Body:', errorText);
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      let parsed;
      if (typeof data.result === 'string') {
        const jsonStr = data.result.replace(/```json\n?|\n?```/g, '').trim();
        parsed = JSON.parse(jsonStr);
      } else {
        parsed = data.result;
      }
      setConnections(parsed);
    } catch (err: any) {
      console.error('Connections generation error:', err.message || err);
    } finally {
      setIsPlanning(false);
    }
  };

  const handleCopyOutline = () => {
    if (outline) {
      navigator.clipboard.writeText(outline);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      <header className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 shadow-sm z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
              <Layout size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">Story Outline</h1>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest">Architect your narrative blueprint</p>
            </div>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('architect')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'architect' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Architect
            </button>
            <button 
              onClick={() => setActiveTab('planner')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'planner' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Planner
            </button>
            <button 
              onClick={() => setActiveTab('sources')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'sources' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sources
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex">
        {activeTab === 'architect' ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Notes Selection */}
            <div className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search notes..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                
                {transcripts.length > 0 && (
                   <div className="mb-4 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                      <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Youtube size={10} /> Active Transcripts
                      </p>
                      <div className="space-y-1">
                        {transcripts.map(t => (
                          <div key={t.id} className="text-[8px] text-slate-500 truncate flex items-center justify-between">
                            <span className="truncate flex-1">{t.url}</span>
                            <button onClick={() => setTranscripts(prev => prev.filter(x => x.id !== t.id))} className="ml-1 text-rose-500">×</button>
                          </div>
                        ))}
                      </div>
                   </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {selectedNoteIds.length} Selected
                  </span>
                  <button 
                    onClick={handleGenerateOutline}
                    disabled={(selectedNoteIds.length === 0 && transcripts.length === 0) || isProcessing}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-indigo-600/10"
                  >
                    {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                    Generate
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {filteredNotes.map(note => (
                  <button
                    key={note.id}
                    onClick={() => handleToggleNote(note.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedNoteIds.includes(note.id)
                        ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800'
                        : 'bg-white border-transparent dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <p className="text-[11px] line-clamp-2 text-slate-600 dark:text-slate-400 font-serif leading-relaxed">
                      {note.content}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {note.tags.slice(0, 2).map(t => (
                        <span key={t} className="text-[8px] font-black uppercase tracking-tighter text-slate-400">#{t}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Outline Result */}
            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-8 custom-scrollbar">
              <div className="max-w-3xl mx-auto">
                {outline ? (
                  <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-indigo-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Narrative Blueprint</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={handleCopyOutline} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors" title="Copy Markdown">
                          <Clipboard size={14} />
                        </button>
                        <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors" title="Download .md">
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="p-10 prose prose-slate dark:prose-invert max-w-none font-serif prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter">
                      <Markdown>{outline}</Markdown>
                    </div>
                  </div>
                ) : (
                  <div className="h-[60vh] flex flex-col items-center justify-center text-center">
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
                      <Sparkles size={48} className="text-slate-200 dark:text-slate-800" />
                    </div>
                    <h2 className="text-xl font-black text-slate-400 uppercase tracking-tighter mb-2">Architect Your Story</h2>
                    <p className="text-slate-400 text-sm italic max-w-xs">Select your research notes and click generate to synthesize a structured story outline.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'planner' ? (
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-slate-950 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <GitMerge className="text-indigo-600" size={24} />
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Plot Connections</h2>
                </div>
                <div className="flex gap-4">
                  <input 
                    type="text" 
                    value={plotInput}
                    onChange={e => setPlotInput(e.target.value)}
                    placeholder="Enter a plot point or core idea (e.g., 'The protagonist finds a letter from the future')"
                    className="flex-1 px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    onKeyDown={e => e.key === 'Enter' && handleGenerateConnections()}
                  />
                  <button 
                    onClick={handleGenerateConnections}
                    disabled={!plotInput.trim() || isPlanning}
                    className="px-8 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isPlanning ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    Connect
                  </button>
                </div>
              </div>

              {isPlanning ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-48 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm" />
                  ))}
                </div>
              ) : connections ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {connections.map((conn, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-black text-xs">
                          {i + 1}
                        </div>
                        <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-sm truncate">{conn.title}</h3>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-serif flex-1 mb-4 italic">
                        {conn.logic}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {conn.motifs.map(motif => (
                          <span key={motif} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[8px] font-black uppercase tracking-widest rounded-lg">
                            {motif}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-slate-950 custom-scrollbar">
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Youtube className="text-rose-600" size={24} />
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">YouTube Transcripts</h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-black mb-4">Fetch verbal content to ground your story architecture</p>
                <div className="flex gap-4">
                  <input 
                    type="text" 
                    value={youtubeUrl}
                    onChange={e => setYoutubeUrl(e.target.value)}
                    placeholder="Paste YouTube URL..."
                    className="flex-1 px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    onKeyDown={e => e.key === 'Enter' && handleFetchTranscript()}
                  />
                  <button 
                    onClick={handleFetchTranscript}
                    disabled={!youtubeUrl.trim() || isFetchingTranscript}
                    className="px-8 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isFetchingTranscript ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    Fetch
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {transcripts.map(t => (
                  <div key={t.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Youtube size={16} className="text-rose-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.id}</span>
                      </div>
                      <button onClick={() => setTranscripts(prev => prev.filter(x => x.id !== t.id))} className="text-rose-500 text-xs font-black uppercase tracking-widest hover:underline">
                        Remove
                      </button>
                    </div>
                    <div className="max-h-40 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 font-serif leading-relaxed custom-scrollbar italic">
                      {t.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
