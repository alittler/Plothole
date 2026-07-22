import React from 'react';
import { Sparkles } from 'lucide-react';

interface TokenUsageWidgetProps {
  usage: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export default function TokenUsageWidget({ usage }: TokenUsageWidgetProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white p-4 rounded-lg shadow-xl border border-slate-700 font-mono text-xs flex flex-col gap-1">
      <div className="flex items-center gap-2 mb-1 text-slate-300">
        <Sparkles size={14} />
        <span className="font-semibold text-[10px] uppercase tracking-wider">Session Tokens</span>
      </div>
      <div className="flex justify-between gap-4">
        <span>Prompt:</span>
        <span className="text-emerald-400">{usage.prompt.toLocaleString()}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span>Completion:</span>
        <span className="text-amber-400">{usage.completion.toLocaleString()}</span>
      </div>
      <div className="flex justify-between gap-4 pt-1 mt-1 border-t border-slate-700">
        <span className="font-bold">Total:</span>
        <span className="font-bold text-white">{usage.total.toLocaleString()}</span>
      </div>
    </div>
  );
}
