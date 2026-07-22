import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  Send, 
  BookOpen, 
  UserCheck, 
  FileText, 
  Compass, 
  AlertTriangle, 
  Info, 
  Copy, 
  Check, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  HelpCircle,
  Code,
  List,
  Search,
  RefreshCw,
  Cpu
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { 
  CharacterProfile, 
  ResearchNotebook, 
  AtlasMapState, 
  OracleMessage, 
  OracleSourceCitation 
} from '../types';

interface OracleChatProps {
  user: any;
  manuscriptText?: string;
  manuscriptTitle?: string;
  characters?: CharacterProfile[];
  notebooks?: ResearchNotebook[];
  atlasState?: AtlasMapState | null;
}

export function OracleChat({
  user,
  manuscriptText = '',
  manuscriptTitle = 'Active Manuscript',
  characters = [],
  notebooks = [],
  atlasState = null
}: OracleChatProps) {
  const safeChars = characters || [];
  const safeNotebooks = notebooks || [];
  const safeManuscriptText = manuscriptText || '';

  // Input state
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeChapterFilter, setActiveChapterFilter] = useState('ALL');
  const [showArchDocModal, setShowArchDocModal] = useState(false);
  const [expandedCitationMsgId, setExpandedCitationMsgId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Extract chapters from manuscript for filter dropdown
  const chaptersList = React.useMemo(() => {
    if (!safeManuscriptText) return ['ALL'];
    const matches = safeManuscriptText.match(/(?:Chapter|CHAPTER|Act|ACT|Scene|SCENE|\n#{1,3}\s+)[^\n]+/g);
    if (!matches || matches.length === 0) return ['ALL', 'Chapter 1', 'Chapter 2', 'Chapter 3'];
    return ['ALL', ...Array.from(new Set(matches.map(m => m.trim().slice(0, 40))))];
  }, [safeManuscriptText]);

  // Initial welcome message with sample setup
  const [messages, setMessages] = useState<OracleMessage[]>([
    {
      id: 'oracle_init_1',
      role: 'assistant',
      content: `Greetings, Author. I am **The Oracle** — your story world's continuity editor and analytical intelligence.

I analyze your story data using a strict **3-Tiered Priority Strategy**:
1. **Primary Source (Highest Priority):** Manuscript Text (plot events, active chapter actions, scenes).
2. **Secondary Source (Supporting Detail):** Character Cards & Dossiers (core traits, goals, relationships).
3. **Tertiary Source (Context & Lore):** Research Notes, NotebookLM sources, and Fantasy Atlas map locations.

> ⚠️ **Contradiction Alert Engine:** If events in your Manuscript conflict with details in a Character Dossier or Lore Note, I will automatically flag the discrepancy for you!

Select a sample query below or type any question about plot, character positions, motives, or continuity.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      citations: [
        {
          id: 'cite_demo_1',
          tier: 'primary_manuscript',
          title: 'Manuscript Index',
          sourceTypeLabel: 'Primary Source',
          snippet: safeManuscriptText ? `${safeManuscriptText.slice(0, 140)}...` : 'Sample Manuscript indexed and ready.'
        },
        {
          id: 'cite_demo_2',
          tier: 'secondary_dossier',
          title: `Dossiers (${safeChars.length} Loaded)`,
          sourceTypeLabel: 'Secondary Source',
          snippet: safeChars.length > 0 ? safeChars.map(c => c.core?.name || 'Unnamed').join(', ') : 'No dossiers registered.'
        }
      ]
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Example Prompt Chips requested in specs
  const exampleQueries = [
    {
      label: '📍 Location Check',
      query: `Where is ${safeChars[0]?.core?.name || 'the main character'} right now based on the last 5 chapters?`
    },
    {
      label: '🎯 Motivations Query',
      query: `What are the motivations of ${safeChars[0]?.core?.name || 'Character A'} according to their dossier?`
    },
    {
      label: '🤝 Relationship Summary',
      query: safeChars.length >= 2 
        ? `Summarize the relationship between ${safeChars[0]?.core?.name || 'Character A'} and ${safeChars[1]?.core?.name || 'Character B'} based on the manuscript.`
        : 'Summarize the relationship between the main character and secondary character based on the manuscript.'
    },
    {
      label: '🏰 Chapter Locations',
      query: 'List all locations mentioned in Chapter 4 (or the latest chapter).'
    },
    {
      label: '⚠️ Contradiction Check',
      query: `Check if character details or actions in Chapter 2 contradict the character card for ${safeChars[0]?.core?.name || 'the protagonist'}.`
    }
  ];

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: OracleMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-8).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/api/oracle/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
          manuscriptText: manuscriptText,
          manuscriptTitle: manuscriptTitle,
          activeChapterFilter: activeChapterFilter,
          characters: characters,
          notebooks: notebooks,
          atlasState: atlasState
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to query The Oracle');
      }

      const assistantMsg: OracleMessage = {
        id: `oracle_${Date.now()}`,
        role: 'assistant',
        content: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: data.citations || [],
        contradictions: data.contradictions || [],
        tokens: data.tokens
      };

      setMessages(prev => [...prev, assistantMsg]);

    } catch (err: any) {
      console.error('Oracle Error:', err);
      const errorMsg: OracleMessage = {
        id: `oracle_err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **The Oracle encountered an issue:** ${err.message || 'Unable to connect to the intelligence engine.'}\n\nPlease verify your Gemini API configuration or check your network connection.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-170px)] min-h-[680px] bg-slate-50 rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-fade-in" id="oracle-chat-container">
      {/* HEADER BAR */}
      <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between flex-wrap gap-3 border-b border-indigo-900/60 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 p-0.5 shadow-lg flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              <Bot className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide font-serif">The Oracle</h2>
              <span className="bg-indigo-950 text-indigo-300 border border-indigo-700/60 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider">
                Gemini 3.6 Flash
              </span>
            </div>
            <p className="text-xs text-slate-300 flex items-center gap-2">
              <span>Continuity Editor & RAG Story Analyst</span>
              <span className="text-slate-600">•</span>
              <span className="text-amber-300/90 font-mono text-[11px]">Strict 3-Tier Hierarchy</span>
            </p>
          </div>
        </div>

        {/* RIGHT HEADER CONTROLS */}
        <div className="flex items-center gap-3">
          {/* Chapter Focus Filter */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-lg text-xs">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-300 text-[11px] font-medium hidden sm:inline">Scope:</span>
            <select
              value={activeChapterFilter}
              onChange={(e) => setActiveChapterFilter(e.target.value)}
              className="bg-transparent text-amber-300 font-semibold focus:outline-none cursor-pointer text-xs"
            >
              {chaptersList.map((ch, idx) => (
                <option key={idx} value={ch} className="bg-slate-900 text-slate-100">
                  {ch === 'ALL' ? 'Entire Project Scope' : ch}
                </option>
              ))}
            </select>
          </div>

          {/* System Architecture Modal Button */}
          <button
            onClick={() => setShowArchDocModal(true)}
            className="flex items-center gap-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            title="View System Prompt & RAG Architecture Documentation"
          >
            <Code className="w-3.5 h-3.5 text-indigo-300" />
            <span className="hidden md:inline">Arch Specs</span>
          </button>

          {/* Clear History */}
          <button
            onClick={() => {
              if (confirm('Clear Oracle conversation history?')) {
                setMessages([messages[0]]);
              }
            }}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* RAG INDEXING STATUS BADGE STRIP */}
      <div className="bg-slate-800/95 text-slate-300 text-[11px] px-5 py-2 flex items-center justify-between border-b border-slate-700/80 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-emerald-400 font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            RAG Indexed
          </span>
          <span className="flex items-center gap-1 text-slate-300">
            <BookOpen className="w-3 h-3 text-emerald-400" />
            <strong>Primary:</strong> {safeManuscriptText ? `${(safeManuscriptText.length / 1000).toFixed(1)}k chars` : '0 chars'}
          </span>
          <span className="flex items-center gap-1 text-slate-300">
            <UserCheck className="w-3 h-3 text-purple-400" />
            <strong>Secondary:</strong> {safeChars.length} Dossiers
          </span>
          <span className="flex items-center gap-1 text-slate-300">
            <FileText className="w-3 h-3 text-amber-400" />
            <strong>Tertiary:</strong> {safeNotebooks.reduce((acc, nb) => acc + (nb?.sources?.length || 0), 0)} Notes
          </span>
          {atlasState && (
            <span className="flex items-center gap-1 text-slate-300">
              <Compass className="w-3 h-3 text-blue-400" />
              <strong>Atlas:</strong> {atlasState.locations?.length || 0} Locations
            </span>
          )}
        </div>

        <div className="text-slate-400 text-[10px] font-mono">
          Priority: Manuscript &gt; Dossiers &gt; Notes/Atlas
        </div>
      </div>

      {/* CHAT MESSAGES STREAM */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#fcfbfa]">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isCitationsExpanded = expandedCitationMsgId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-fade-in`}
            >
              {/* SENDER LABEL & TIMESTAMP */}
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className={`text-[11px] font-bold ${isUser ? 'text-indigo-700' : 'text-slate-700 flex items-center gap-1'}`}>
                  {!isUser && <Bot className="w-3.5 h-3.5 text-amber-600" />}
                  {isUser ? 'Author' : 'The Oracle'}
                </span>
                <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
              </div>

              {/* MESSAGE CARD */}
              <div
                className={`max-w-3xl w-full rounded-2xl p-4 sm:p-5 shadow-sm border text-sm leading-relaxed ${
                  isUser
                    ? 'bg-indigo-600 text-white border-indigo-700 rounded-tr-none'
                    : 'bg-white text-slate-800 border-slate-200/90 rounded-tl-none'
                }`}
              >
                {/* CONTRADICTION ALERT BANNER IF DETECTED */}
                {msg.contradictions && msg.contradictions.length > 0 && (
                  <div className="mb-4 bg-amber-50 border-2 border-amber-500/80 rounded-xl p-3.5 text-amber-900 shadow-sm flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900 font-mono">
                        ⚠️ Continuity Contradiction Detected
                      </h4>
                      {msg.contradictions.map((c, idx) => (
                        <p key={idx} className="text-xs leading-normal font-medium text-amber-800">
                          {c}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* MARKDOWN CONTENT */}
                <div className={isUser ? 'prose prose-invert max-w-none text-white' : 'prose prose-slate max-w-none text-slate-800'}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>

                {/* CITATIONS & SOURCES DRAWER FOR ASSISTANT MESSAGES */}
                {!isUser && msg.citations && msg.citations.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => setExpandedCitationMsgId(isCitationsExpanded ? null : msg.id)}
                      className="flex items-center justify-between w-full text-xs font-semibold text-indigo-700 hover:text-indigo-900 py-1 transition-all cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 font-mono">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        Inspected RAG Sources ({msg.citations.length} Chunks)
                      </span>
                      {isCitationsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isCitationsExpanded && (
                      <div className="mt-3 space-y-2 text-xs animate-fade-in">
                        {msg.citations.map((cite) => {
                          const isPrimary = cite.tier === 'primary_manuscript';
                          const isSecondary = cite.tier === 'secondary_dossier';

                          return (
                            <div
                              key={cite.id}
                              className={`p-2.5 rounded-lg border text-xs ${
                                isPrimary
                                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                                  : isSecondary
                                  ? 'bg-purple-50/80 border-purple-200 text-purple-950'
                                  : 'bg-amber-50/80 border-amber-200 text-amber-950'
                              }`}
                            >
                              <div className="flex items-center justify-between font-bold mb-1">
                                <span className="flex items-center gap-1">
                                  {isPrimary && <BookOpen className="w-3 h-3 text-emerald-600" />}
                                  {isSecondary && <UserCheck className="w-3 h-3 text-purple-600" />}
                                  {!isPrimary && !isSecondary && <FileText className="w-3 h-3 text-amber-600" />}
                                  {cite.title}
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/80 border border-slate-200/60">
                                  {cite.sourceTypeLabel}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 line-clamp-2 italic font-serif">
                                "{cite.snippet}"
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* FOOTER ACTIONS (TOKEN USAGE + COPY) */}
                {!isUser && (
                  <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                    <span>
                      {msg.tokens ? `Tokens: ${msg.tokens.totalTokens.toLocaleString()}` : 'Oracle Response'}
                    </span>
                    <button
                      onClick={() => copyToClipboard(msg.content, msg.id)}
                      className="flex items-center gap-1 hover:text-slate-700 transition-all cursor-pointer font-medium"
                    >
                      {copiedMsgId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Response</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* LOADING INDICATOR */}
        {isLoading && (
          <div className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm w-fit animate-pulse">
            <Cpu className="w-5 h-5 text-indigo-600 animate-spin" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-800">
                The Oracle is querying project data sources...
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                Matching Manuscript Text &gt; Character Cards &gt; Research Notes &gt; Continuity Audit
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* QUICK EXAMPLE PROMPT CHIPS */}
      <div className="bg-slate-100/90 border-t border-slate-200 px-4 py-2.5 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
        <span className="text-[11px] font-bold text-slate-500 shrink-0 font-mono uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-600" />
          Quick Prompts:
        </span>
        {exampleQueries.map((ex, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(ex.query)}
            disabled={isLoading}
            className="shrink-0 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-900 px-3 py-1 rounded-full text-xs transition-all cursor-pointer shadow-2xs font-medium"
          >
            {ex.label}
          </button>
        ))}
      </div>

      {/* INPUT FORM */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask The Oracle about plot events, character status, location timelines, or lore..."
            disabled={isLoading}
            className="flex-1 bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold px-5 py-3 rounded-xl transition-all flex items-center gap-2 text-sm shadow-md cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Query</span>
          </button>
        </form>
      </div>

      {/* SYSTEM ARCHITECTURE & PROMPT SPECIFICATIONS MODAL */}
      {showArchDocModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 space-y-6 animate-fade-in text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <Bot className="w-7 h-7 text-indigo-600" />
                <div>
                  <h2 className="text-xl font-bold font-serif text-slate-900">
                    The Oracle Architecture & RAG Specifications
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    System Prompt Template, Logic Flow & Contradiction Engine
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowArchDocModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold p-2 text-lg"
              >
                ✕
              </button>
            </div>

            {/* DELIVERABLE 1: SYSTEM PROMPT TEMPLATE */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-2 font-mono">
                <Code className="w-4 h-4 text-indigo-600" />
                1. System Prompt Template
              </h3>
              <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
                <pre>{`You are "The Oracle", an elite AI literary analyst and continuity editor.

STRICT DATA HIERARCHY RULES:
1. PRIMARY SOURCE (Highest Authority): Current Manuscript Text.
   - Events, dialogue, character positions, and actions occurring in the Manuscript override all other sources regarding current plot reality.
2. SECONDARY SOURCE (Supporting Detail): Character Cards & Dossiers.
   - Defines character profiles, stated motivations, traits, and background profiles.
3. TERTIARY SOURCE (Context & Lore): Research Notes & Fantasy Atlas Map.
   - Defines magic systems, world rules, historical notes, and geographic locations.

CRITICAL DIRECTIVE - CONTRADICTION DETECTION:
- Compare facts across sources! If the Manuscript text contradicts details in a Character Card or Research Note:
  You MUST explicitly flag this discrepancy using:
  "⚠️ CONTRADICTION DETECTED: [Describe conflict between Chapter X and Character Card/Lore Note]."

CITATION REQUIREMENTS:
- Cite source origins inline using exact bracketed labels:
  - [Based on Chapter X]
  - [From Character Dossier: <Name>]
  - [From Research Note: <Title>]
  - [From Fantasy Atlas: <Location>]`}</pre>
              </div>
            </div>

            {/* DELIVERABLE 2: STEP-BY-STEP LOGIC FLOW */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-2 font-mono">
                <List className="w-4 h-4 text-indigo-600" />
                2. Step-by-Step Backend Query Logic Flow
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl space-y-1">
                  <span className="font-bold text-emerald-900 font-mono">Step 1: Chunking & Parsing</span>
                  <p className="text-emerald-950">
                    Manuscripts are chunked by Chapter/Scene regex. Character profiles and notes are converted into structured key-value arrays.
                  </p>
                </div>
                <div className="bg-purple-50 border border-purple-200 p-3.5 rounded-xl space-y-1">
                  <span className="font-bold text-purple-900 font-mono">Step 2: Multi-Tier Context Assembly</span>
                  <p className="text-purple-950">
                    Primary Manuscript blocks are injected first, followed by Secondary Character Dossiers, then Tertiary Research Notes & Atlas Maps.
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl space-y-1">
                  <span className="font-bold text-amber-900 font-mono">Step 3: Contradiction & Gemini Inference</span>
                  <p className="text-amber-950">
                    Gemini 3.6 Flash evaluates co-occurrences, audits cross-source collisions, formats citations, and outputs response.
                  </p>
                </div>
              </div>
            </div>

            {/* DELIVERABLE 3 & 4: EXAMPLE USER QUERIES & EXPECTED STRUCTURED RESPONSES */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-2 font-mono">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                3. Sample User Queries & Ideal Structured Responses
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-slate-900 font-mono">Q1: "Where is [Character Name] right now based on the last 5 chapters?"</span>
                  <p className="text-slate-600 italic">
                    Answer format: States exact location based on Chapter 5 text [Based on Chapter 5], citing the scene arrival, and noting any prior travel route from the dossier or map.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-slate-900 font-mono">Q2: "What are the motivations of [Character Name] according to their dossier?"</span>
                  <p className="text-slate-600 italic">
                    Answer format: Cites primary goals from [From Character Dossier: Character X] and compares them against recent actions in the manuscript.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-slate-900 font-mono">Q3: "Check for contradictions between Chapter 2 and Character Cards."</span>
                  <p className="text-slate-600 italic">
                    Answer format: Flags ⚠️ CONTRADICTION DETECTED: [Chapter 2 states Character X was injured in Chapter 2, but Dossier states they were absent until Chapter 4].
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowArchDocModal(false)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl text-xs transition-all cursor-pointer"
              >
                Close Documentation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
