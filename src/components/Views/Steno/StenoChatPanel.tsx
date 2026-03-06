import React, { useRef, useEffect } from 'react';
import { MessageSquare, Sparkles, User as UserIcon, Pin, ArrowRight, Loader2, Send } from 'lucide-react';
import Markdown from 'react-markdown';
import { Note, Source } from '../../../types';
import { chatWithAssistant } from '../../../services/geminiService';

interface StenoChatPanelProps {
  chatMessages: { role: 'user' | 'model', text: string }[];
  setChatMessages: React.Dispatch<React.SetStateAction<{ role: 'user' | 'model', text: string }[]>>;
  chatInput: string;
  setChatInput: React.Dispatch<React.SetStateAction<string>>;
  isChatLoading: boolean;
  setIsChatLoading: React.Dispatch<React.SetStateAction<boolean>>;
  onSaveIdea: (content: string) => void;
  onCommitToLedger: (content: string) => void;
  sources: Source[];
  ideas: Note[];
  isFullScreen?: boolean;
}

export const StenoChatPanel: React.FC<StenoChatPanelProps> = ({
  chatMessages,
  setChatMessages,
  chatInput,
  setChatInput,
  isChatLoading,
  setIsChatLoading,
  onSaveIdea,
  onCommitToLedger,
  sources,
  ideas,
  isFullScreen = false
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async (msg?: string) => {
    const userMsg = msg || chatInput.trim();
    if (!userMsg || isChatLoading) return;
    
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    if (!msg) setChatInput('');
    setIsChatLoading(true);

    try {
      const canonIdeas = ideas.filter(i => i.isCanon).map(i => `Canon Idea: ${i.content}`).join('\n\n');
      const context = sources.map(s => `Source: ${s.name}\n${s.content}`).join('\n\n') + 
        (canonIdeas ? `\n\n${canonIdeas}` : '') +
        `\n\nINSTRUCTIONS: When answering, you MUST cite your sources inline using the exact format [Source: Source Name].`;
      
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

  return (
    <div className={`flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden ${isFullScreen ? 'h-full max-w-4xl mx-auto w-full' : 'h-full'}`}>
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <MessageSquare size={14} /> Synthesis Chat
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        {chatMessages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8">
            <Sparkles size={32} className="mb-2 opacity-20" />
            <p className="text-xs italic mb-6">Ask the AI to help synthesize your notes and sources.</p>
            
            {/* Suggested Questions */}
            <div className="w-full space-y-2 max-w-md">
              {sources.flatMap(s => s.guide?.questions || []).slice(0, 4).map((q, i) => (
                <button 
                  key={i}
                  onClick={() => handleSendMessage(q)}
                  className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors text-xs text-slate-600 dark:text-slate-300"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {chatMessages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} w-full`}>
               <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>
                 {msg.role === 'user' ? <UserIcon size={16} /> : <Sparkles size={16} />}
               </div>
               <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
                 <div className="prose prose-slate dark:prose-invert max-w-none">
                   <Markdown
                     components={{
                       p: ({node, children}) => {
                         if (typeof children === 'string' || Array.isArray(children)) {
                           return <p className="mb-2 last:mb-0">{children}</p>;
                         }
                         return <p className="mb-2 last:mb-0">{children}</p>;
                       }
                     }}
                   >
                     {msg.text.replace(/\[Source:\s*(.+?)\]/g, '`[$1]`')}
                   </Markdown>
                 </div>
                 {msg.role === 'model' && (
                   <div className="mt-4 pt-4 border-t border-slate-200/20 dark:border-slate-700/50 flex justify-end gap-4">
                     <button 
                       onClick={() => onSaveIdea(msg.text)}
                       className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500 flex items-center gap-1 transition-colors"
                     >
                       <Pin size={10} /> Save as Idea
                     </button>
                     <button 
                       onClick={() => onCommitToLedger(msg.text)}
                       className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                     >
                       Commit to Ledger <ArrowRight size={10} />
                     </button>
                   </div>
                 )}
               </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className={`p-4 border-t border-slate-100 dark:border-slate-800 flex gap-2 items-end ${isFullScreen ? 'sticky bottom-0 bg-white dark:bg-slate-900 z-10' : ''}`}>
        <textarea 
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Ask anything..."
          rows={1}
          className="flex-1 bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-4 py-3 text-base text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 resize-none"
        />
        <button 
          onClick={() => handleSendMessage()}
          disabled={isChatLoading || !chatInput.trim()}
          className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {isChatLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
};
