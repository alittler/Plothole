import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, MessageSquare, X, Plus, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ProjectData, Note, User } from '../../types';

interface OracleFloatingButtonProps {
  data: ProjectData & { notes: Note[] };
  currentUser?: User;
}

export const OracleFloatingButton: React.FC<OracleFloatingButtonProps> = ({ data, currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: "Hello! I'm The Oracle. I've been watching your story world grow. How can I assist your creative process today?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, isChatLoading]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const allNotes = data?.notes || [];
      const contextText = allNotes.map(n => n.content).join('\n---\n');
      
      const response = await fetch('/api/narrative/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manuscriptText: contextText || "No notes available.",
          customPrompt: `You are The Oracle, a creative writing assistant for a story world. 
          
Context (User's Notes):
${contextText.substring(0, 10000)}

User's Question:
${userMsg}

Please provide a helpful, creative, and insightful response based on their notes. Use a supportive and slightly mystical tone.`,
          existingEntities: data?.entities || []
        })
      });

      if (!response.ok) throw new Error('Failed to reach AI Brain');
      
      const result = await response.json();
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result.worldType || "I've analyzed your notes. How else can I help?" 
      }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I'm having trouble connecting to my creative centers right now. Please try again in a moment." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4">
      {isOpen && (
        <div className={`flex flex-col bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all duration-300 ease-in-out ${isMinimized ? 'h-16 w-64' : 'h-[600px] w-[400px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-8rem)]'}`}>
          {/* Header */}
          <div className="p-4 bg-indigo-600 border-b border-indigo-500 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-white">
              <Sparkles size={18} />
              <span className="font-black uppercase tracking-widest text-xs">The Oracle</span>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50 dark:bg-slate-950"
              >
                {chatMessages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[90%] p-3 md:p-4 rounded-2xl shadow-sm border font-serif text-sm leading-relaxed
                      ${msg.role === 'user' 
                        ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none' 
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 rounded-tl-none'}`}
                    >
                      <div className={msg.role === 'user' ? '' : 'prose prose-slate dark:prose-invert prose-sm max-w-none'}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start animate-pulse">
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-xl rounded-tl-none border border-slate-200 dark:border-slate-700">
                      <Loader2 size={14} className="animate-spin text-indigo-500" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <div className="relative group">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask The Oracle..."
                    className="w-full bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-indigo-500 rounded-2xl py-3 pl-4 pr-12 text-sm font-serif resize-none shadow-inner transition-all"
                    rows={1}
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isChatLoading}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-xl shadow-md disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
                  >
                    {isChatLoading ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (isMinimized) setIsMinimized(false);
        }}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-500 hover:scale-110 active:scale-95 
          ${isOpen ? 'bg-indigo-600 text-white rotate-90' : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'}`}
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} className="animate-pulse" />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500"></span>
          </span>
        )}
      </button>
    </div>
  );
};
