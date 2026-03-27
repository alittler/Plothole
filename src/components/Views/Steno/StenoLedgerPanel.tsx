import React, { useState } from 'react';
import { BookOpen, Trash2, Download, Save, Zap, Check, Copy, Edit3, X } from 'lucide-react';
import { ProjectData, Note, ProjectMetadata, User } from '../../../types';
import { StackedPaper } from '../../ui/StackedPaper';
import { WikiText } from '../../ui/WikiText';
import { generateId } from '../../../services/storageService';

interface StenoLedgerPanelProps {
  projectData: ProjectData;
  onUpdateProject: (data: Partial<ProjectData>) => void;
  onDeleteNote?: (id: string) => Promise<void>;
  currentUser?: User;
  projectsMetadata?: ProjectMetadata[];
  onLinkClick?: (type: string, id: string) => void;
  isFullScreen?: boolean;
}

export const StenoLedgerPanel: React.FC<StenoLedgerPanelProps> = ({
  projectData,
  onUpdateProject,
  onDeleteNote,
  currentUser,
  projectsMetadata,
  onLinkClick,
  isFullScreen = false
}) => {
  const [ledgerInput, setLedgerInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const ledgerEntries = projectData.ledger || [];

  const handleAddLedgerNote = () => {
    if (!ledgerInput.trim()) return;
    const newNote: Note = {
      id: generateId(),
      content: ledgerInput.trim(),
      tags: [],
      timestamp: Date.now(),
      isCanon: true,
      isSavedInLedger: true
    };
    onUpdateProject({ ledger: [newNote, ...ledgerEntries] });
    setLedgerInput('');
  };

  const handleDeleteNote = (id: string) => {
    if (confirm('Delete this ledger entry permanently?')) {
      if (onDeleteNote) {
        onDeleteNote(id);
      } else {
        const updatedLedger = ledgerEntries.filter(n => n.id !== id);
        onUpdateProject({ ledger: updatedLedger });
      }
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={`flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden ${isFullScreen ? 'h-full' : 'h-full'}`}>
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <BookOpen size={14} /> Project Ledger
        </h3>
        {isFullScreen && (
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors">
              <Download size={14} /> Export Ledger
            </button>
          </div>
        )}
      </div>

      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isFullScreen ? 'max-w-4xl mx-auto w-full' : ''}`}>
        {ledgerEntries.length === 0 && (
          <div className="p-8 text-center text-slate-400 italic text-xs">No entries in ledger. Mark notes as Canon to add them.</div>
        )}
        {ledgerEntries.map(entry => (
          <div key={entry.id} className={`relative group ${isFullScreen ? '' : 'p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800'}`}>
            {isFullScreen ? (
              <StackedPaper className="group">
                 <div className="absolute top-8 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                    {renderActions(entry)}
                 </div>
                 <div className="p-8 relative z-20">
                    {renderEntryContent(entry)}
                 </div>
              </StackedPaper>
            ) : (
              <>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {renderActions(entry)}
                </div>
                {renderEntryContent(entry)}
              </>
            )}
          </div>
        ))}
      </div>

      <div className={`p-4 border-t border-slate-100 dark:border-slate-800 ${isFullScreen ? 'max-w-4xl mx-auto w-full' : ''}`}>
        <textarea 
          value={ledgerInput}
          onChange={(e) => setLedgerInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAddLedgerNote();
            }
          }}
          placeholder="Type a note... (Enter to submit, Shift+Enter for newline)"
          className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 resize-none h-24"
        />
      </div>
    </div>
  );

  function renderActions(entry: Note) {
    return (
      <>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLinkClick?.('admin', entry.id);
          }}
          className="p-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-lg shadow-sm hover:text-indigo-600 transition-colors"
          title="Edit Note"
        >
          <Edit3 size={14} />
        </button>        
        <button 
          onClick={() => handleDeleteNote(entry.id)}
          className="p-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-lg shadow-sm hover:text-red-500 transition-colors"
          title="Delete Permanently"
        >
          <Trash2 size={14} />
        </button>

        <button 
          onClick={() => copyToClipboard(entry.content, entry.id)}
          className="p-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-lg shadow-sm hover:text-indigo-500 transition-colors"
          title="Copy Content"
        >
          {copiedId === entry.id ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </>
    );
  }

  function renderEntryContent(entry: Note) {
    return (
      <>
        <div className="flex items-center gap-2 mb-2">
          <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
            {isFullScreen ? `ENTRY // ${new Date(entry.timestamp).toLocaleString()}` : new Date(entry.timestamp).toLocaleDateString()}
          </div>
          {currentUser?.role === 'admin' && (
            <span className="font-mono text-[9px] opacity-50 select-all">ID: {entry.id}</span>
          )}
        </div>
        
        <div className={`text-sm text-slate-700 dark:text-slate-300 font-serif leading-relaxed break-words [overflow-wrap:anywhere] ${isFullScreen ? 'text-lg' : ''}`}>
          <WikiText text={entry.content} projectData={projectData} projectsMetadata={projectsMetadata} onLinkClick={onLinkClick} />
        </div>
      </>
    );
  }
};
