import React from 'react';
import { Sparkles, Loader2, Zap, BrainCircuit, Search, Palette, Database } from 'lucide-react';

interface ActiveArchitectProps {
  tasks: string[];
}

export const ActiveArchitect: React.FC<ActiveArchitectProps> = ({ tasks }) => {
  if (tasks.length === 0) return null;

  const getTaskIcon = (task: string) => {
    const t = task.toLowerCase();
    if (t.includes('analyz') || t.includes('manuscript')) return <BrainCircuit size={14} className="text-indigo-400" />;
    if (t.includes('cover') || t.includes('image')) return <Palette size={14} className="text-pink-400" />;
    if (t.includes('theme') || t.includes('note')) return <Zap size={14} className="text-amber-400" />;
    if (t.includes('search') || t.includes('scramble')) return <Search size={14} className="text-emerald-400" />;
    return <Database size={14} className="text-blue-400" />;
  };

  return (
    <div className="fixed bottom-24 lg:bottom-8 right-6 z-[2000] flex flex-col items-end gap-3 pointer-events-none">
      {tasks.map((task, idx) => (
        <div 
          key={idx}
          className="flex items-center gap-3 px-4 py-2 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-500"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center">
              {getTaskIcon(task)}
            </div>
            <div className="absolute -top-1 -right-1">
              <Loader2 size={12} className="text-indigo-500 animate-spin" />
            </div>
          </div>
          
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">The Oracle is Thinking</span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white whitespace-nowrap">{task}</span>
              <div className="flex gap-0.5">
                <div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse" />
                <div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse [animation-delay:0.2s]" />
                <div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse [animation-delay:0.4s]" />
              </div>
            </div>
            {task.toLowerCase().includes('analyz') && (
              <span className="text-[9px] text-slate-400 mt-1 italic">This can take a few minutes...</span>
            )}
          </div>

          <div className="ml-2 px-2 py-0.5 bg-indigo-600 rounded-lg">
            <Sparkles size={10} className="text-white animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
};
