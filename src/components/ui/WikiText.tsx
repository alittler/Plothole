import React, { useState } from 'react';
import { ProjectData, ProjectMetadata } from '../../types';

interface WikiTextProps {
  text: string;
  projectData?: ProjectData | null;
  projectsMetadata?: ProjectMetadata[];
  onLinkClick?: (type: string, id: string) => void;
  onTagClick?: (tag: string) => void;
}

export const WikiText: React.FC<WikiTextProps> = ({ text, projectData, projectsMetadata, onLinkClick, onTagClick }) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);

  if (!text) return null;

  const normalizeTagName = (name: string): string => {
    const ARTICLES = ['the', 'a', 'an', 'der', 'die', 'das', 'ein', 'eine', 'le', 'la', 'les', 'el', 'los', 'las'];
    let normalized = name.toLowerCase().trim();
    
    for (const article of ARTICLES) {
      const prefix = article + ' ';
      if (normalized.startsWith(prefix)) {
        normalized = normalized.substring(prefix.length);
        break;
      }
    }
    return normalized.trim();
  };

  const regex = /(@\w+|\[\[.*?\]\]|#\w+|\+\w+|!\w+|%\w+|\?\w+)/g;
  const parts = text.split(regex);

  const handleMouseEnter = (e: React.MouseEvent, type: string, item: any, projectName?: string) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    let content = null;


    if (type === 'character') {
      content = (
        <div className="space-y-1">
          <div className="font-bold flex items-center gap-2">
            {item.name}
            {projectName && <span className="text-[10px] opacity-50 uppercase tracking-widest">[{projectName}]</span>}
          </div>
          <div className="text-xs text-slate-300">{item.role}</div>
          {item.description && <div className="text-xs mt-1 line-clamp-3">{item.description}</div>}
        </div>
      );
    } else if (type === 'location') {
      content = (
        <div className="space-y-1">
          <div className="font-bold flex items-center gap-2">
            {item.name}
            {projectName && <span className="text-[10px] opacity-50 uppercase tracking-widest">[{projectName}]</span>}
          </div>
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
    } else if (type === 'tag') {
      content = (
        <div className="space-y-1">
          <div className="font-bold text-sm">#{item}</div>
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
      <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        {parts.map((part, i) => {
          if (part.startsWith('@')) {
            const name = part.slice(1);
            const normalizedName = normalizeTagName(name);
            
            // Search in current project first
            let char: any = projectData?.characters?.find(c => normalizeTagName(c.name).includes(normalizedName));
            let foundProjectName = projectData?.title;
            let isExternal = false;

            // If not found, search in other projects
            if (!char && projectsMetadata) {
              for (const proj of projectsMetadata) {
                if (proj.id === projectData?.id) continue;
                const found = (proj as any).characters?.find((c: any) => normalizeTagName(c.name).includes(normalizedName));
                if (found) {
                  char = found;
                  // Add missing properties for display if needed
                  if (!char.role) char.role = 'Character';
                  foundProjectName = proj.title;
                  isExternal = true;
                  break;
                }
              }
            }

            if (char) {
              const initials = foundProjectName ? foundProjectName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '';
              
              return (
                <span
                  key={i}
                  className="text-amber-600 dark:text-amber-400 font-semibold cursor-pointer hover:underline"
                  onClick={() => onLinkClick?.('character', char!.id)}
                  onMouseEnter={(e) => handleMouseEnter(e, 'character', char, isExternal ? initials : undefined)}
                  onMouseLeave={handleMouseLeave}
                >
                  {part}
                  {isExternal && <span className="text-[10px] opacity-50 ml-0.5">[{initials}]</span>}
                </span>
              );
            }
          } else if (part.startsWith('+')) {
            const name = part.slice(1);
            const normalizedName = normalizeTagName(name);
            
            // Search for Location first
            let loc: any = projectData?.locations?.find(l => normalizeTagName(l.name).includes(normalizedName));
            let foundProjectName = projectData?.title;
            let isExternal = false;

            if (!loc && projectsMetadata) {
              for (const proj of projectsMetadata) {
                if (proj.id === projectData?.id) continue;
                const found = (proj as any).locations?.find((l: any) => normalizeTagName(l.name).includes(normalizedName));
                if (found) {
                  loc = found;
                  if (!loc.type) loc.type = 'Location';
                  foundProjectName = proj.title;
                  isExternal = true;
                  break;
                }
              }
            }

            if (loc) {
               const initials = foundProjectName ? foundProjectName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '';
               return (
                <span
                  key={i}
                  className="text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer hover:underline"
                  onClick={() => onLinkClick?.('location', loc!.id)}
                  onMouseEnter={(e) => handleMouseEnter(e, 'location', loc, isExternal ? initials : undefined)}
                  onMouseLeave={handleMouseLeave}
                >
                  {part}
                  {isExternal && <span className="text-[10px] opacity-50 ml-0.5">[{initials}]</span>}
                </span>
              );
            }

            // Fallback to Search by Book/Project
            if (projectsMetadata) {
              const proj = projectsMetadata.find(p => normalizeTagName(p.shortName || p.title).includes(normalizedName));
              if (proj) {
                return (
                  <span
                    key={i}
                    className="text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer hover:underline"
                    onClick={() => {
                      if (proj.id === 'global-notebook') onLinkClick?.('notepad', '');
                      else onLinkClick?.('dashboard', proj.id);
                    }}
                  >
                    {part}
                  </span>
                );
              }
            }
          } else if (part.startsWith('[[') && part.endsWith(']]')) {
            const raw = part.slice(2, -2);
            let linkText = raw;
            let targetId = raw;

            if (raw.includes('|')) {
              [linkText, targetId] = raw.split('|');
            }

            // Strip leading # if present for ID matching
            const cleanId = targetId.startsWith('#') ? targetId.slice(1) : targetId;

            // 1. Search by ID (The new 8-char hash)
            let item: any = null;
            let type: string = '';
            
            const findInProject = (proj: any) => {
              const char = proj.characters?.find((c: any) => c.id === cleanId);
              if (char) return { item: char, type: 'character' };
              const loc = proj.locations?.find((l: any) => l.id === cleanId);
              if (loc) return { item: loc, type: 'location' };
              const artifact = proj.artifacts?.find((a: any) => a.id === cleanId);
              if (artifact) return { item: artifact, type: 'artifact' };
              const lore = proj.lore?.find((l: any) => l.id === cleanId);
              if (lore) return { item: lore, type: 'lore' };
              const source = proj.sources?.find((s: any) => s.id === cleanId);
              if (source) return { item: source, type: 'source' };
              return null;
            };

            const result = projectData ? findInProject(projectData) : null;
            if (result) {
              item = result.item;
              type = result.type;
            }

            // 2. Fallback to Search by Name if not found by ID
            if (!item) {
              const nameLower = targetId.toLowerCase();
              const char = projectData?.characters?.find(c => c.name.toLowerCase() === nameLower);
              if (char) { item = char; type = 'character'; }
              else {
                const loc = projectData?.locations?.find(l => l.name.toLowerCase() === nameLower);
                if (loc) { item = loc; type = 'location'; }
                else {
                  const lore = projectData?.lore?.find(l => l.term.toLowerCase() === nameLower);
                  if (lore) { item = lore; type = 'lore'; }
                }
              }
            }

            if (item) {
              const colorClass = {
                character: 'text-indigo-600 dark:text-indigo-400',
                location: 'text-emerald-600 dark:text-emerald-400',
                artifact: 'text-amber-600 dark:text-amber-400',
                lore: 'text-amber-600 dark:text-amber-400',
                source: 'text-blue-600 dark:text-blue-400'
              }[type] || 'text-slate-600';

              return (
                <span
                  key={i}
                  className={`${colorClass} font-semibold cursor-pointer hover:underline inline-flex items-center gap-0.5`}
                  onClick={() => onLinkClick?.(type, item.id)}
                  onMouseEnter={(e) => handleMouseEnter(e, type, item)}
                  onMouseLeave={handleMouseLeave}
                >
                  {linkText}
                  <span className="text-[8px] opacity-30 font-mono">#{item.id}</span>
                </span>
              );
            }

            return <span key={i} className="text-red-400 border-b border-dotted border-red-400/50" title="Broken Link">{part}</span>;
          } else if (part.startsWith('#')) {
            const tag = part.slice(1);
            const normalizedTag = normalizeTagName(tag);

            const bookSimple = normalizeTagName(projectData?.shortName || projectData?.title || '');
            const isBook = normalizedTag === bookSimple;

            // Legacy/Fallback check for location if not using + (optional, but keeping for better UX)
            let loc: any = projectData?.locations?.find(l => normalizeTagName(l.name) === normalizedTag);

            if (loc) {
               return (
                <span
                  key={i}
                  className="text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer hover:underline"
                  onClick={() => onLinkClick?.('location', loc!.id)}
                  onMouseEnter={(e) => handleMouseEnter(e, 'location', loc)}
                  onMouseLeave={handleMouseLeave}
                >
                  {part}
                </span>
              );
            }

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
 else if (part.startsWith('!')) {
            return (
              <span
                key={i}
                className="text-amber-600 dark:text-amber-400 font-bold cursor-help"
                onMouseEnter={(e) => handleMouseEnter(e, 'tag', part.slice(1))}
                onMouseLeave={handleMouseLeave}
              >
                {part}
              </span>
            );
          } else if (part.startsWith('%')) {
            return (
              <span
                key={i}
                className="text-blue-600 dark:text-blue-400 font-bold cursor-help"
                onMouseEnter={(e) => handleMouseEnter(e, 'tag', part.slice(1))}
                onMouseLeave={handleMouseLeave}
              >
                {part}
              </span>
            );
          } else if (part.startsWith('?')) {
            return (
              <span
                key={i}
                className="text-purple-600 dark:text-purple-400 font-bold cursor-help"
                onMouseEnter={(e) => handleMouseEnter(e, 'tag', part.slice(1))}
                onMouseLeave={handleMouseLeave}
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
