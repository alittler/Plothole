import React, { useState, useRef, useEffect } from 'react';
import { ProjectData } from '../../types';
import { X, Send, Sparkles, User, Bot } from 'lucide-react';
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
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ isOpen, onClose, projectData }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Hello! I'm your story architect. How can I help you with your narrative today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col z-[2000] animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <Sparkles size={18} className="text-indigo-500" />
          <span>Story Assistant</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded">
          <X size={20} />
        </button>
      </div>

      <div className="relative h-6 z-20 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-full bg-slate-900/10 torn-paper-edge-overlay translate-y-[4px]" />
        <div className="absolute top-0 left-0 right-0 h-full bg-slate-900/10 torn-paper-edge-overlay translate-y-[3px]" />
        <div className="absolute top-0 left-0 right-0 h-full bg-slate-900/10 torn-paper-edge-overlay translate-y-[2px]" />
        <div className="absolute top-0 left-0 right-0 h-full bg-slate-900/10 torn-paper-edge-overlay translate-y-[1px]" />
        <div className="absolute top-0 left-0 right-0 h-full torn-paper-edge" />
      </div>


      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-4xl mx-auto min-h-full relative paper-texture shadow-xl rounded-2xl overflow-hidden p-4 md:pl-24 pt-10">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 mb-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>
                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-700 dark:text-slate-300 rounded-tl-none border border-black/5 dark:border-white/5'}`}>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
              <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-3 rounded-2xl rounded-tl-none flex gap-1 border border-black/5 dark:border-white/5">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
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
