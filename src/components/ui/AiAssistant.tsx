import React, { useState, useRef, useEffect } from 'react';
import { ProjectData, User as AppUser } from '../../types';
import { X, Send, Sparkles, User, Bot, Download } from 'lucide-react';
import { chatWithAssistant } from '../../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface AiAssistantProps {
  projectData: ProjectData | null;
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  currentUser: AppUser;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ isOpen, onClose, projectData, currentUser }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: `Hello ${currentUser.name}! I'm your story architect. How can I help you with your narrative today?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const response = await chatWithAssistant(userMsg, projectData, history);
      setMessages(prev => [...prev, { role: 'model', text: response || "I'm sorry, I couldn't process that." }]);
    } catch (error) {
      console.error("AI Assistant Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "I encountered an error. Please check your API key and try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportDiscussion = () => {
    const chatText = messages.map(m => `### ${m.role === 'user' ? currentUser.name : 'Story Assistant'}\n\n${m.text}\n\n---\n`).join('\n');
    const blob = new Blob([chatText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `story_discussion_${new Date().toISOString().split('T')[0]}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-full md:w-[500px] bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col z-[2000] animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm uppercase tracking-tighter">
          <Sparkles size={18} className="text-indigo-500" />
          <span>Story Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportDiscussion}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
            title="Export Discussion"
          >
            <Download size={18} />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
          <div className="flex flex-col min-h-full">
            {messages.map((m, i) => (
              <div key={i} className={`p-8 border-b border-slate-100 dark:border-slate-800/50 ${m.role === 'user' ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/30'}`}>
                <div className="max-w-2xl mx-auto flex gap-6 items-start">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-slate-200 dark:border-slate-800 ${m.role === 'user' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-600'}`}>
                    {m.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${m.role === 'user' ? 'text-indigo-600' : 'text-slate-400'}`}>
                        {m.role === 'user' ? currentUser.name : 'Story Assistant'}
                      </span>
                    </div>
                    <div className="prose prose-slate dark:prose-invert max-w-none prose-sm leading-relaxed">
                      <ReactMarkdown>{m.text}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="p-8 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="max-w-2xl mx-auto flex gap-6 items-start animate-pulse">
                  <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-800">
                    <Bot size={20} className="text-slate-400" />
                  </div>
                  <div className="flex-1 space-y-4 pt-2">
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4" />
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full w-1/2" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about your story..."
            rows={1}
            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 pr-10 focus:ring-2 focus:ring-indigo-500 text-base text-slate-900 dark:text-white resize-none"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-3 text-indigo-500 hover:text-indigo-600 disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
