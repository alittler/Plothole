import React, { useState } from 'react';
import { ProjectData } from '../../types';

interface WikiTextProps {
  text: string;
  projectData?: ProjectData | null;
  onLinkClick?: (type: string, id: string) => void;
  onTagClick?: (tag: string) => void;
}

export const WikiText: React.FC<WikiTextProps> = ({ text, projectData, onLinkClick, onTagClick }) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);

  if (!text) return null;

  // Regex to match @name, [[name]], and #category
  const regex = /(@\w+|\[\[.*?\]\]|#\w+)/g;
  const parts = text.split(regex);

  const handleMouseEnter = (e: React.MouseEvent, type: string, item: any) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    let content = null;

    if (type === 'character') {
      content = (
        <div className="space-y-1">
          <div className="font-bold">{item.name}</div>
          <div className="text-xs text-slate-300">{item.role}</div>
          {item.description && <div className="text-xs mt-1 line-clamp-3">{item.description}</div>}
        </div>
      );
    } else if (type === 'location') {
      content = (
        <div className="space-y-1">
          <div className="font-bold">{item.name}</div>
          <div className="text-xs text-slate-300">{item.type}</div>
          {item.description && <div className="text-xs mt-1 line-clamp-3">{item.description}</div>}
        </div>
      );
    } else if (type === 'lore') {
      content = (
        <div className="space-y-1">
          <div className="font-bold">{item.term}</div>
          <div className="text-xs text-slate-300">{item.category}</div>
          {item.definition && <div className="text-xs mt-1 line-clamp-3">{item.definition}</div>}
        </div>
      );
    }

    if (content) {
      setTooltip({ x: rect.left, y: rect.top - 10, content });
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  return (
    <>
      <span className="whitespace-pre-wrap">
        {parts.map((part, i) => {
          if (part.startsWith('@')) {
            const name = part.slice(1).toLowerCase();
            const char = projectData?.characters?.find(c => c.name.toLowerCase().includes(name));
            if (char) {
              return (
                <span
                  key={i}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer hover:underline"
                  onClick={() => onLinkClick?.('character', char.id)}
                  onMouseEnter={(e) => handleMouseEnter(e, 'character', char)}
                  onMouseLeave={handleMouseLeave}
                >
                  {part}
                </span>
              );
            }
          } else if (part.startsWith('[[') && part.endsWith(']]')) {
            const name = part.slice(2, -2).toLowerCase();
            const loc = projectData?.locations?.find(l => l.name.toLowerCase().includes(name));
            const lore = projectData?.lore?.find(l => l.term.toLowerCase().includes(name));
            
            if (loc) {
              return (
                <span
                  key={i}
                  className="text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer hover:underline"
                  onClick={() => onLinkClick?.('location', loc.id)}
                  onMouseEnter={(e) => handleMouseEnter(e, 'location', loc)}
                  onMouseLeave={handleMouseLeave}
                >
                  {part}
                </span>
              );
            } else if (lore) {
              return (
                <span
                  key={i}
                  className="text-amber-600 dark:text-amber-400 font-semibold cursor-pointer hover:underline"
                  onClick={() => onLinkClick?.('lore', lore.id)}
                  onMouseEnter={(e) => handleMouseEnter(e, 'lore', lore)}
                  onMouseLeave={handleMouseLeave}
                >
                  {part}
                </span>
              );
            }
          } else if (part.startsWith('#')) {
            const tag = part.slice(1);
            const isBook = tag.toLowerCase() === (projectData?.shortName || projectData?.title || '').replace(/[^\w\s]/g, '').replace(/\s+/g, '_').toLowerCase();
            
            return (
              <span
                key={i}
                className={`font-semibold cursor-pointer hover:underline ${isBook ? 'text-indigo-600 dark:text-indigo-400' : 'text-pink-600 dark:text-pink-400'}`}
                onClick={() => {
                  if (isBook) onLinkClick?.('dashboard', '');
                  else onTagClick?.(tag);
                }}
              >
                {part}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </span>

      {tooltip && (
        <div
          className="fixed z-[9999] bg-slate-900 text-white p-3 rounded-xl shadow-2xl border border-slate-700 max-w-xs pointer-events-none transform -translate-y-full -translate-x-1/2"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.content}
        </div>
      )}
    </>
  );
};
