import React, { useState, useMemo } from 'react';
import { ProjectData, Note, TimelineEvent, ViewType } from '../../types';
import { 
  Zap, 
  Sparkles, 
  Clock, 
  Link as LinkIcon, 
  GitMerge, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  ChevronRight,
  Database,
  Search
} from 'lucide-react';

interface NarrativeIndex {
  clusters: Array<{ title: string; noteIds: string[]; logic: string }>;
  suggestedTimeline: Array<{ noteId: string; relativePosition: string; reasoning: string }>;
  causalLinks: Array<{ noteId: string; eventId: string; type: 'setup' | 'payoff' | 'thematic'; description: string }>;
}

interface NarrativeArchitectViewProps {
  projectData: ProjectData;
  globalNotes: Note[];
  onUpdateProject: (updates: Partial<ProjectData>) => void;
}

export const NarrativeArchitectView: React.FC<NarrativeArchitectViewProps> = ({
  projectData,
  globalNotes,
  onUpdateProject
}) => {
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<NarrativeIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const allRelevantNotes = useMemo(() => {
    const combined = [...(projectData.notes || []), ...globalNotes];
    // Deduplicate by ID
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

  const handleSelectAll = () => {
    if (selectedNoteIds.length === filteredNotes.length) {
      setSelectedNoteIds([]);
    } else {
      setSelectedNoteIds(filteredNotes.map(n => n.id));
    }
  };

  const handleProcess = async () => {
    if (selectedNoteIds.length === 0) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const rawNotes = allRelevantNotes
        .filter(n => selectedNoteIds.includes(n.id))
        .map(n => ({
          NoteID: n.id,
          Text: n.content,
          Timestamp: n.timestamp
        }));
      
      const existingStructure = (projectData.timeline || []).map(e => ({
        ID: e.id,
        Title: e.title,
        Summary: e.description
      }));

      const prompt = `Act as a Narrative Data Architect. Your goal is to process unstructured content from a "Notepad" and map it into a structured "Index" for a Writer's OS.

### INPUT DATA
1. EXISTING_STRUCTURE: ${JSON.stringify(existingStructure)}
2. RAW_NOTES: ${JSON.stringify(rawNotes)}

### TASK
Analyze the RAW_NOTES to find latent narrative connections that have not been explicitly linked by the user. 

### LOGICAL REQUIREMENTS
- CLUSTERING: Group notes that share a common thematic or character-driven thread.
- SEQUENCING: Determine where a note logically falls within the EXISTING_STRUCTURE based on causality (e.g., if a note mentions a 'black arrow,' it must be indexed before 'Smaug's Demise').
- LINKING: Identify three specific link types:
    1. PROVENANCE: Where an idea likely originated.
    2. DEPENDENCY: A note that provides a necessary setup for a plot point.
    3. CONFLICT: A note that contradicts an existing plot point.

### OUTPUT SCHEMA
Return a JSON object that satisfies this interface:

interface NarrativeIndex {
  clusters: Array<{ title: string; noteIds: string[]; logic: string }>;
  suggestedTimeline: Array<{ noteId: string; relativePosition: string; reasoning: string }>;
  causalLinks: Array<{ noteId: string; eventId: string; type: 'setup' | 'payoff' | 'thematic'; description: string }>;
}

Return ONLY the JSON. Do not include prose, markdown formatting, or explanations.`;

      const response = await fetch('/api/narrative/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          context: "Architecting narrative structure from notepad content."
        })
      });

      if (!response.ok) throw new Error('Failed to process notes');
      
      const data = await response.json();
      
      let narrativeIndex: NarrativeIndex;
      if (typeof data.result === 'string') {
        // Clean markdown if AI included it
        const jsonStr = data.result.replace(/```json\n?|\n?```/g, '').trim();
        narrativeIndex = JSON.parse(jsonStr);
      } else if (data.result) {
        narrativeIndex = data.result;
      } else {
        throw new Error('Unexpected response format from AI');
      }

      setResults(narrativeIndex);
    } catch (err) {
      console.error(err);
      setError('Failed to architect narrative index. Ensure your notes have clear content.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      <header className="p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 shadow-sm z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
              <GitMerge size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">Narrative Architect</h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">Map latent connections & plot dependencies</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search notes..."
                className="ph-input pl-10 w-48 md:w-64"
              />
            </div>
            <button 
              onClick={handleProcess}
              disabled={selectedNoteIds.length === 0 || isProcessing}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {isProcessing ? 'Architecting...' : 'Process Index'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Note Selection */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Database size={14} /> Source Notepad ({selectedNoteIds.length}/{filteredNotes.length})
              </h2>
              <button 
                onClick={handleSelectAll}
                className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
              >
                {selectedNoteIds.length === filteredNotes.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
              {filteredNotes.map(note => (
                <button
                  key={note.id}
                  onClick={() => handleToggleNote(note.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 group ${
                    selectedNoteIds.includes(note.id)
                      ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800 shadow-sm'
                      : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      selectedNoteIds.includes(note.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                    }`}>
                      {selectedNoteIds.includes(note.id) && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-relaxed line-clamp-3 font-serif ${
                        selectedNoteIds.includes(note.id) ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {note.content}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {note.tags.map(tag => (
                          <span key={tag} className="text-[9px] font-black uppercase tracking-widest text-slate-400">#{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-8">
            {isProcessing ? (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse">
                <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-full mb-6">
                  <Zap size={48} className="text-indigo-600 animate-bounce" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">Analyzing Latent Connections</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm italic">The Architect is cross-referencing your notepad with the existing story structure to find causal dependencies...</p>
              </div>
            ) : error ? (
              <div className="p-8 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-3xl flex items-center gap-4 text-red-600 dark:text-red-400">
                <AlertCircle size={24} />
                <p className="font-bold text-sm uppercase tracking-wide">{error}</p>
              </div>
            ) : results ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                
                {/* Clusters Section */}
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-500" /> Thematic Clusters
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.clusters.map((cluster, i) => (
                      <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-lg mb-2">{cluster.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic mb-4">{cluster.logic}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-[10px] font-black px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg uppercase tracking-widest">
                            {cluster.noteIds.length} Linked Notes
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Suggested Timeline Section */}
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Clock size={14} className="text-emerald-500" /> Sequencing Recommendations
                  </h3>
                  <div className="space-y-3">
                    {results.suggestedTimeline.map((item, i) => {
                      const note = allRelevantNotes.find(n => n.id === item.noteId);
                      return (
                        <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-6">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] font-black px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg uppercase tracking-widest">
                                {item.relativePosition}
                              </span>
                            </div>
                            <p className="text-sm font-serif text-slate-700 dark:text-slate-300 italic">"{note?.content.substring(0, 150)}..."</p>
                          </div>
                          <div className="md:w-1/2 flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                            <ArrowRight size={16} className="text-slate-400 mt-1 shrink-0" />
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed uppercase tracking-wide">
                              {item.reasoning}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Causal Links Section */}
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <LinkIcon size={14} className="text-indigo-500" /> Causal Dependencies
                  </h3>
                  <div className="space-y-3">
                    {results.causalLinks.map((link, i) => {
                      const note = allRelevantNotes.find(n => n.id === link.noteId);
                      const event = projectData.timeline.find(e => e.id === link.eventId);
                      return (
                        <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                           <div className={`p-2 rounded-xl shrink-0 ${
                             link.type === 'setup' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' :
                             link.type === 'payoff' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' :
                             'bg-amber-50 text-amber-600 dark:bg-amber-900/20'
                           }`}>
                             <GitMerge size={20} />
                           </div>
                           <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2 mb-1">
                               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate max-w-[100px]">Note</span>
                               <ChevronRight size={10} className="text-slate-300" />
                               <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 truncate max-w-[150px]">{event?.title || 'Unknown Event'}</span>
                             </div>
                             <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">{link.description}</p>
                           </div>
                           <div className="shrink-0 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-400">
                             {link.type}
                           </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-white/50 dark:bg-slate-900/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-full mb-6">
                  <Database size={48} className="text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter mb-2">No Index Generated</h3>
                <p className="text-slate-400 max-w-sm italic">Select notes from the left and click "Process Index" to architect your narrative structure.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
