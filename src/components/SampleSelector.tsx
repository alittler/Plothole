import React from 'react';
import { SAMPLE_MANUSCRIPTS, SampleManuscript } from '../data/samples';
import { BookOpen, Sparkles } from 'lucide-react';

interface SampleSelectorProps {
  onSelectSample: (excerpt: string) => void;
  selectedId: string | null;
}

export default function SampleSelector({ onSelectSample, selectedId }: SampleSelectorProps) {
  return (
    <div className="space-y-4" id="sample-selector-container">
      <div className="flex items-center gap-2 text-slate-800 font-medium">
        <BookOpen className="w-4 h-4 text-blue-600" />
        <span className="text-sm">Select a pre-loaded manuscript scene:</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3" id="sample-grid">
        {SAMPLE_MANUSCRIPTS.map((sample) => {
          const isSelected = selectedId === sample.id;
          return (
            <button
              key={sample.id}
              id={`sample-btn-${sample.id}`}
              onClick={() => onSelectSample(sample.excerpt)}
              className={`text-left p-4 rounded-lg border transition-all duration-200 focus:outline-none ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                  : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/50 bg-white'
              }`}
            >
              <div className="flex justify-between items-start gap-2 mb-1">
                <h4 className="font-semibold text-slate-900 text-sm truncate">{sample.title}</h4>
                <span className="inline-block text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {sample.genre}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-2">by {sample.author}</p>
              <p className="text-xs text-slate-600 line-clamp-3 italic bg-slate-50/40 p-2 rounded border border-slate-100/60 font-serif">
                "{sample.excerpt.substring(0, 140)}..."
              </p>
              {isSelected && (
                <div className="flex items-center gap-1.5 text-[11px] text-blue-700 font-medium mt-1">
                  <Sparkles className="w-3 h-3 animate-pulse" />
                  <span>Selected</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
