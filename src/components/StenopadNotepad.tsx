import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Sparkles, 
  Tag as TagIcon, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  UserCheck, 
  MapPin, 
  Bookmark, 
  Search, 
  Copy, 
  Check, 
  Download, 
  RefreshCw, 
  HelpCircle,
  ExternalLink,
  Zap,
  CheckCircle2,
  AlertCircle,
  Info,
  PenTool,
  Sliders,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { CharacterProfile, AtlasMapState, StenopadNote, ExtractedWikiTag } from '../types';

interface StenopadNotepadProps {
  characters?: CharacterProfile[];
  atlasState?: AtlasMapState | null;
  manuscriptTitle?: string;
  onOpenCharacterModal?: (charName: string) => void;
  onOpenAtlasLocation?: (locName: string) => void;
}

const DEFAULT_STENO_NOTES: StenopadNote[] = [
  {
    id: 'steno_page_1',
    title: 'Chapter 3 Scene & Character Notes',
    content: `Meeting in the Whispering Tavern with #Gandalf and #Aragorn to discuss the cursed relic found near #TheShire. 

Key details:
- #Gandalf suspects the dark magic traces back to the #MistyMountains.
- #Aragorn brought the broken blade fragments.
- Need a #PlotTwist where the spy reveals themselves before midnight!
- Mention the ancient dragon lore from #Rivendell archives.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pageNumber: 1,
    paperStyle: 'yellow_legal'
  },
  {
    id: 'steno_page_2',
    title: 'Worldbuilding Scratchpad & Relics',
    content: `Brainstorming magic system limits:
1. Spells require focus runes forged in #Eldroria.
2. #Elrond warned that overuse causes shadow sickness.
3. Check location map for distance between #Highgarden Citadel and the #ShadowPass.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pageNumber: 2,
    paperStyle: 'cream_lined'
  }
];

export function StenopadNotepad({
  characters = [],
  atlasState = null,
  manuscriptTitle = 'Active Manuscript',
  onOpenCharacterModal,
  onOpenAtlasLocation
}: StenopadNotepadProps) {
  // Load notes state from localStorage
  const [notes, setNotes] = useState<StenopadNote[]>(() => {
    try {
      const saved = localStorage.getItem('plothole_stenopad_notes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((n: StenopadNote, idx: number) => ({
            ...n,
            id: n.id || `steno_page_${Date.now()}_${idx}`
          }));
        }
      }
    } catch (e) {
      console.error('Failed to parse stenopad notes from localStorage', e);
    }
    return DEFAULT_STENO_NOTES;
  });

  const [activeNoteId, setActiveNoteId] = useState<string>(() => {
    return notes[0]?.id || DEFAULT_STENO_NOTES[0].id;
  });
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [paperTheme, setPaperTheme] = useState<'yellow_legal' | 'cream_lined' | 'grid_white' | 'vintage_aged'>('yellow_legal');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedNote, setCopiedNote] = useState(false);
  const [showTagPromptSpecs, setShowTagPromptSpecs] = useState(false);
  const [selectedEntityPreview, setSelectedEntityPreview] = useState<{ name: string; type: string; info: string } | null>(null);
  const [noteToDeleteId, setNoteToDeleteId] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0] || DEFAULT_STENO_NOTES[0];
  const activeNoteIndex = Math.max(0, notes.findIndex((n) => n.id === activeNote.id));

  // Prepare Existing Entities Database format specified in user prompt:
  // [{"name": "Gandalf", "type": "Character", "id": 101}, {"name": "TheShire", "type": "Location", "id": 205}]
  const existingEntitiesDB = React.useMemo(() => {
    const db: Array<{ name: string; type: string; id: string | number }> = [];

    // 1. Add Characters
    (characters || []).forEach((char, idx) => {
      if (char?.core?.name) {
        const charId = (char as any).id || `char_${idx + 100}`;
        db.push({
          name: char.core.name.replace(/\s+/g, ''), // normalize spaced names into hashtag style
          type: 'Character',
          id: charId
        });
        // also add exact original name
        if (char.core.name.includes(' ')) {
          db.push({
            name: char.core.name,
            type: 'Character',
            id: charId
          });
        }
      }
    });

    // 2. Add Atlas Locations
    if (atlasState && Array.isArray(atlasState.locations)) {
      atlasState.locations.forEach((loc, idx) => {
        if (loc?.name) {
          db.push({
            name: loc.name.replace(/\s+/g, ''),
            type: 'Location',
            id: loc.id || `loc_${idx + 200}`
          });
        }
      });
    }

    // 3. Fallback sample entities if database is empty
    if (db.length === 0) {
      db.push(
        { name: 'Gandalf', type: 'Character', id: 101 },
        { name: 'Aragorn', type: 'Character', id: 102 },
        { name: 'Elrond', type: 'Character', id: 103 },
        { name: 'TheShire', type: 'Location', id: 205 },
        { name: 'Rivendell', type: 'Location', id: 206 },
        { name: 'Highgarden Citadel', type: 'Location', id: 207 },
        { name: 'Eldroria', type: 'Location', id: 208 }
      );
    }

    return db;
  }, [characters, atlasState]);

  // Save notes to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem('plothole_stenopad_notes', JSON.stringify(notes));
    } catch (e) {
      console.error('Failed saving stenopad notes:', e);
    }
  }, [notes]);

  // Run Wiki Tag Extraction on note content change or via manual trigger
  const runWikiTagExtraction = async (targetNoteId: string = activeNote.id, noteTextOverride?: string) => {
    const textToAnalyze = noteTextOverride !== undefined ? noteTextOverride : activeNote.content;
    if (!textToAnalyze || textToAnalyze.trim().length === 0) {
      updateActiveNoteTags(targetNoteId, []);
      return;
    }

    setIsExtracting(true);

    try {
      const response = await fetch('/api/extract-wiki-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteText: textToAnalyze,
          existingEntities: existingEntitiesDB
        })
      });

      const data = await response.json();

      if (data.success && Array.isArray(data.tags)) {
        updateActiveNoteTags(targetNoteId, data.tags);
      } else {
        // Deterministic Regex fallback if server parsing returns empty
        performLocalRegexExtraction(targetNoteId, textToAnalyze);
      }
    } catch (err) {
      console.error('Extraction API error, using local fallback:', err);
      performLocalRegexExtraction(targetNoteId, textToAnalyze);
    } finally {
      setIsExtracting(false);
    }
  };

  const performLocalRegexExtraction = (targetNoteId: string, text: string) => {
    const tagMatches = text.match(/#[A-Za-z0-9_]+/g) || [];
    const uniqueTags = Array.from(new Set(tagMatches));
    const extracted: ExtractedWikiTag[] = uniqueTags.map((tagStr) => {
      const cleanName = tagStr.replace('#', '');
      const match = existingEntitiesDB.find(
        (e) => e.name.toLowerCase() === cleanName.toLowerCase() || e.name.replace(/\s+/g, '').toLowerCase() === cleanName.toLowerCase()
      );
      if (match) {
        return {
          tag: tagStr,
          name: cleanName,
          type: match.type,
          entity_id: match.id,
          status: 'linked'
        };
      }
      return {
        tag: tagStr,
        name: cleanName,
        type: 'Custom',
        entity_id: null,
        status: 'unlinked'
      };
    });
    updateActiveNoteTags(targetNoteId, extracted);
  };

  const updateActiveNoteTags = (targetNoteId: string, tags: ExtractedWikiTag[]) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === targetNoteId ? { ...n, extractedTags: tags, updatedAt: new Date().toISOString() } : n))
    );
  };

  // Auto-extract tags on note change debounced
  useEffect(() => {
    const currentId = activeNote?.id;
    const currentContent = activeNote?.content;
    if (!currentId) return;

    const timer = setTimeout(() => {
      if (currentContent) {
        runWikiTagExtraction(currentId, currentContent);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [activeNote?.id, activeNote?.content]);

  // Handle note content updates
  const handleContentChange = (newContent: string) => {
    const currentId = activeNote.id;
    setNotes((prev) =>
      prev.map((n) => (n.id === currentId ? { ...n, content: newContent, updatedAt: new Date().toISOString() } : n))
    );
  };

  const handleTitleChange = (newTitle: string) => {
    const currentId = activeNote.id;
    setNotes((prev) =>
      prev.map((n) => (n.id === currentId ? { ...n, title: newTitle, updatedAt: new Date().toISOString() } : n))
    );
  };

  const addNewPage = () => {
    const newPageNum = notes.length + 1;
    const newId = `steno_page_${Date.now()}`;
    const newNote: StenopadNote = {
      id: newId,
      title: `Stenopad Page ${newPageNum}`,
      content: `New note details for #${manuscriptTitle.replace(/\s+/g, '')}...\n\n#Notes #Idea`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pageNumber: newPageNum,
      paperStyle: paperTheme
    };
    setNotes((prev) => [...prev, newNote]);
    setActiveNoteId(newId);
  };

  const handleDeleteNoteRequest = (id?: string) => {
    const targetId = id || activeNote?.id;
    if (!targetId) return;
    if (notes.length <= 1) {
      setNoticeMessage('You must keep at least one Stenopad page.');
      setTimeout(() => setNoticeMessage(null), 3000);
      return;
    }
    setNoteToDeleteId(targetId);
  };

  const confirmDeleteNote = () => {
    if (!noteToDeleteId) return;
    if (notes.length <= 1) {
      setNoteToDeleteId(null);
      setNoticeMessage('You must keep at least one Stenopad page.');
      setTimeout(() => setNoticeMessage(null), 3000);
      return;
    }

    const noteToDelete = notes.find((n) => n.id === noteToDeleteId);
    const deletedTitle = noteToDelete?.title || 'Note page';
    const deletedIndex = notes.findIndex((n) => n.id === noteToDeleteId);
    const remainingNotes = notes.filter((n) => n.id !== noteToDeleteId);

    // If deleting currently active note, switch active note ID to remaining adjacent note
    if (activeNoteId === noteToDeleteId) {
      const nextActiveNote = remainingNotes[deletedIndex] || remainingNotes[deletedIndex - 1] || remainingNotes[0];
      if (nextActiveNote) {
        setActiveNoteId(nextActiveNote.id);
      }
    }

    setNotes(remainingNotes);
    setNoteToDeleteId(null);
    setNoticeMessage(`"${deletedTitle}" deleted.`);
    setTimeout(() => setNoticeMessage(null), 2500);
  };

  const insertTagAtCursor = (tagName: string) => {
    const tagToInsert = tagName.startsWith('#') ? tagName : `#${tagName.replace(/\s+/g, '')}`;
    const newContent = `${activeNote.content} ${tagToInsert} `;
    handleContentChange(newContent);
  };

  // Paper Theme CSS mappings
  const paperThemeStyles = {
    yellow_legal: 'bg-[#fffde7] text-slate-900 border-amber-200/80',
    cream_lined: 'bg-[#fcfaf2] text-slate-900 border-stone-200',
    grid_white: 'bg-white text-slate-900 border-slate-200',
    vintage_aged: 'bg-[#f5ebd7] text-amber-950 border-amber-300/60'
  };

  const filteredNotes = (notes || []).filter(n => 
    (n?.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (n?.content || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fade-in" id="stenopad-notepad-container">
      {/* HEADER BAR */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl flex items-center justify-between flex-wrap gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-bold shadow-inner">
            <PenTool className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-serif tracking-wide text-amber-100">Stenopad Reporter's Pad</h2>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
                Wiki Tag AI Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Flip-top notebook with real-time <code className="text-amber-300 bg-slate-800 px-1 py-0.5 rounded">#WikiTag</code> entity extraction & linking
            </p>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Paper Style Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 text-[11px] hidden sm:inline">Paper:</span>
            <select
              value={paperTheme}
              onChange={(e) => setPaperTheme(e.target.value as any)}
              className="bg-transparent text-amber-200 font-semibold focus:outline-none cursor-pointer text-xs"
            >
              <option value="yellow_legal" className="bg-slate-900">Yellow Legal Pad</option>
              <option value="cream_lined" className="bg-slate-900">Cream Classic Lined</option>
              <option value="grid_white" className="bg-slate-900">White Grid Paper</option>
              <option value="vintage_aged" className="bg-slate-900">Vintage Parchment</option>
            </select>
          </div>

          {/* Prompt Specs Modal Button */}
          <button
            onClick={() => setShowTagPromptSpecs(true)}
            className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            title="View Extraction Prompt Specifications"
          >
            <TagIcon className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Prompt Specs</span>
          </button>

          {/* Manual Run Extraction */}
          <button
            onClick={() => runWikiTagExtraction()}
            disabled={isExtracting}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isExtracting ? 'animate-spin' : ''}`} />
            <span>Extract Tags</span>
          </button>
        </div>
      </div>

      {/* STENOPAD WORKSPACE LAYOUT (SIDEBAR PAGES + MAIN FLIP PAD) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* SIDEBAR PAGE INDEX */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 font-serif">
              <Bookmark className="w-4 h-4 text-amber-600" />
              Stenopad Pages ({notes.length})
            </h3>
            <button
              onClick={addNewPage}
              className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Page</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stenopad notes or #tags..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* PAGE LIST */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredNotes.map((note) => {
              const actualIdx = notes.findIndex(n => n.id === note.id);
              const isActive = note.id === activeNote.id;
              const tagCount = note.extractedTags?.length || 0;
              const linkedCount = note.extractedTags?.filter(t => t.status === 'linked').length || 0;

              return (
                <div
                  key={note.id}
                  onClick={() => setActiveNoteId(note.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1 relative group ${
                    isActive
                      ? 'bg-amber-500/10 border-amber-400 text-amber-950 shadow-xs'
                      : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200/80 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs truncate max-w-[150px] sm:max-w-[180px] font-serif">
                      Page {actualIdx + 1}: {note.title}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNoteRequest(note.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all cursor-pointer opacity-70 group-hover:opacity-100"
                        title="Delete Stenopad Page"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-2 font-mono">
                    {note.content || 'Empty note page...'}
                  </p>

                  {tagCount > 0 && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono font-bold">
                        #{tagCount} Tags
                      </span>
                      {linkedCount > 0 && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold">
                          ✓ {linkedCount} Linked
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* QUICK ENTITY INSERTION CHIPS */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono block">
              Quick Tag Inserts:
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto">
              {existingEntitiesDB.slice(0, 10).map((ent, idx) => (
                <button
                  key={idx}
                  onClick={() => insertTagAtCursor(ent.name)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                    ent.type === 'Character'
                      ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                  title={`Click to insert #${ent.name} into active note`}
                >
                  +#{ent.name.replace(/\s+/g, '')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* MAIN FLIP-TOP STENOPAD CANVAS */}
        <div className="lg:col-span-8 space-y-4">
          {/* THE STENOPAD HARDCOVER CONTAINER */}
          <div className="bg-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl border-4 border-slate-900 relative">
            
            {/* TOP METALLIC SPIRAL RING BINDING COILS */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 -mt-8 mb-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-2.5 h-6 bg-gradient-to-r from-slate-400 via-slate-100 to-slate-500 rounded-full shadow-lg border border-slate-600" />
                  <div className="w-2 h-2 bg-slate-900 rounded-full -mt-1 shadow-inner" />
                </div>
              ))}
            </div>

            {/* FLIP PAGE HEADER TOOLBAR */}
            <div className="flex items-center justify-between text-white pb-3 border-b border-slate-700/80 mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (activeNoteIndex > 0 && notes[activeNoteIndex - 1]) {
                      setActiveNoteId(notes[activeNoteIndex - 1].id);
                    }
                  }}
                  disabled={activeNoteIndex === 0}
                  className="p-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded-lg text-amber-300 transition-all cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono text-xs font-bold text-amber-300">
                  Page {activeNoteIndex + 1} of {(notes || []).length}
                </span>
                <button
                  onClick={() => {
                    if (activeNoteIndex < (notes || []).length - 1 && notes[activeNoteIndex + 1]) {
                      setActiveNoteId(notes[activeNoteIndex + 1].id);
                    }
                  }}
                  disabled={activeNoteIndex === (notes || []).length - 1}
                  className="p-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded-lg text-amber-300 transition-all cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Title Input */}
              <input
                type="text"
                value={activeNote?.title || ''}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Note Title..."
                className="bg-slate-900/80 border border-slate-700 text-amber-100 text-sm font-bold font-serif px-3 py-1 rounded-lg focus:outline-none focus:border-amber-400 w-full sm:w-64"
              />

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(activeNote?.content || '');
                    setCopiedNote(true);
                    setTimeout(() => setCopiedNote(false), 2000);
                  }}
                  className="p-1.5 text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-all cursor-pointer"
                  title="Copy Note Text"
                >
                  {copiedNote ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => handleDeleteNoteRequest(activeNote?.id)}
                  className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all cursor-pointer"
                  title="Delete Page"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* REALISTIC STENOPAD LINED PAPER SHEET */}
            <div className={`relative rounded-xl p-6 sm:p-8 shadow-inner border min-h-[420px] ${paperThemeStyles[paperTheme]} transition-colors`}>
              
              {/* RED VERTICAL MARGIN LINE (CLASSIC STENOPAD STYLE) */}
              <div className="absolute left-10 sm:left-14 top-0 bottom-0 w-0.5 bg-red-400/40 pointer-events-none" />

              {/* FAINT HORIZONTAL BLUE RULED LINES BACKDROP */}
              <div 
                className="absolute inset-0 pointer-events-none rounded-xl" 
                style={{
                  backgroundImage: 'linear-gradient(to bottom, transparent 27px, rgba(147, 197, 253, 0.35) 28px)',
                  backgroundSize: '100% 28px'
                }} 
              />

              {/* REAL-TIME TEXTAREA WITH LINED ALIGNMENT */}
              <textarea
                value={activeNote?.content || ''}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Type your scene details, lore scratchpad, and hashtag wiki tags here (e.g. #Gandalf, #TheShire)..."
                className="w-full h-80 bg-transparent text-slate-900 font-serif text-base leading-[28px] focus:outline-none resize-none pl-6 relative z-10 font-medium placeholder-slate-400"
                style={{ lineHeight: '28px' }}
              />

              {/* FOOTER STATS STRIP ON PAPER */}
              <div className="pt-3 border-t border-slate-300/60 flex items-center justify-between text-xs font-mono text-slate-600 relative z-10 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span>{(activeNote?.content || '').length} chars</span>
                  <span>•</span>
                  <span>{(activeNote?.content || '').trim().split(/\s+/).filter(Boolean).length} words</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                  <span>Last auto-saved: {new Date(activeNote.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>

            {/* EXTRACTED WIKI TAGS BADGE DISPLAY PANEL */}
            <div className="mt-4 bg-slate-900 rounded-xl p-4 border border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TagIcon className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wider font-mono">
                    Extracted Wiki Tags ({activeNote.extractedTags?.length || 0})
                  </h4>
                </div>
                {isExtracting && (
                  <span className="text-[11px] text-amber-300 font-mono animate-pulse flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Analyzing tags...
                  </span>
                )}
              </div>

              {/* TAG PILLS */}
              {activeNote.extractedTags && activeNote.extractedTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {activeNote.extractedTags.map((t, idx) => {
                    const isLinked = t.status === 'linked';
                    const isChar = t.type === 'Character';
                    const isLoc = t.type === 'Location';

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (isLinked) {
                            setSelectedEntityPreview({
                              name: t.name,
                              type: t.type,
                              info: `Linked ${t.type} in project database (Entity ID: ${t.entity_id})`
                            });
                          } else {
                            setSelectedEntityPreview({
                              name: t.name,
                              type: 'Unlinked Tag',
                              info: `Custom hashtag #${t.name}. Click below to convert into a Character or Location!`
                            });
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs ${
                          isLinked
                            ? isChar
                              ? 'bg-purple-900/60 border-purple-500 text-purple-200 hover:bg-purple-900'
                              : isLoc
                              ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200 hover:bg-emerald-900'
                              : 'bg-blue-900/60 border-blue-500 text-blue-200 hover:bg-blue-900'
                            : 'bg-amber-950/60 border-amber-600/80 text-amber-300 hover:bg-amber-900'
                        }`}
                      >
                        <span>{t.tag}</span>
                        <span className="text-[10px] opacity-80 px-1 py-0.2 rounded bg-black/40">
                          {isLinked ? `✓ ${t.type}` : 'Unlinked'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  No hashtags detected yet. Type words starting with <code className="text-amber-300">#</code> (e.g., #Gandalf) to auto-extract wiki tags!
                </p>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ENTITY QUICK PREVIEW MODAL */}
      {selectedEntityPreview && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <TagIcon className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-slate-900 font-serif">
                  #{selectedEntityPreview.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEntityPreview(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-mono bg-slate-50 p-3 rounded-xl border border-slate-200">
              {selectedEntityPreview.info}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedEntityPreview(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROMPT SPECIFICATIONS MODAL FOR USER COMPLIANCE */}
      {showTagPromptSpecs && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <PenTool className="w-6 h-6 text-amber-600" />
                <h3 className="text-lg font-bold font-serif text-slate-900">
                  Wiki Tag Extraction Engine Prompt Specifications
                </h3>
              </div>
              <button
                onClick={() => setShowTagPromptSpecs(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
              <pre>{`You are an intelligent metadata extraction engine for a fantasy writing application. Your task is to analyze a user's note text and extract all "Wiki Tags" (words starting with a hash symbol, e.g., #Gandalf, #TheShire).

INPUT DATA:
1. Note Text: "{{NOTE_TEXT}}"
2. Existing Entities Database: {{EXISTING_ENTITIES_JSON}}
   (Format: [{"name": "Gandalf", "type": "Character", "id": 101}, {"name": "TheShire", "type": "Location", "id": 205}])

INSTRUCTIONS:
1. Identify every instance of a tag in the format #[Word] within the Note Text.
2. For each tag found:
   - Normalize the name (remove special characters, keep case as is).
   - Search the "Existing Entities Database" for a match (case-insensitive).
   - If a match is found:
     - Return the tag name, the matched Entity Type (Character/Location/Book), and the Entity ID.
     - Mark this as a "Linked Tag".
   - If NO match is found:
     - Return the tag name and type "Custom".
     - Mark this as "Unlinked Tag".
3. Do NOT output the full text of the note. Only output a JSON list of the extracted tags.

OUTPUT FORMAT:
Return ONLY a valid JSON array. Do not include markdown formatting, explanations, or extra text.`}</pre>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowTagPromptSpecs(false)}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE NOTE CONFIRMATION MODAL */}
      {noteToDeleteId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-bold text-base text-slate-800 font-serif">Delete Stenopad Page?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-800 font-serif">"{notes.find(n => n.id === noteToDeleteId)?.title}"</strong>? This note page will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setNoteToDeleteId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteNote}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Page</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATION TOAST NOTICE */}
      {noticeMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-amber-200 border border-amber-500/30 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-mono font-bold flex items-center gap-2 animate-fade-in">
          <Info className="w-4 h-4 text-amber-400" />
          <span>{noticeMessage}</span>
        </div>
      )}
    </div>
  );
}
