import React, { useState } from 'react';
import { BookOpen, Trash2, Download, Save, Zap, Check, Copy, Edit3, X } from 'lucide-react';
import { ProjectData, Note, ProjectMetadata, User } from '../../../types';
import { StackedPaper } from '../../ui/StackedPaper';
import { WikiText } from '../../ui/WikiText';
import { generateId } from '../../../services/storageService';

interface StenoLedgerPanelProps {
  projectData: ProjectData;
  onUpdateProject: (data: Partial<ProjectData>) => void;
  currentUser?: User;
  projectsMetadata?: ProjectMetadata[];
  onLinkClick?: (type: string, id: string) => void;
  isFullScreen?: boolean;
}

export const StenoLedgerPanel: React.FC<StenoLedgerPanelProps> = ({
  projectData,
  onUpdateProject,
  currentUser,
  projectsMetadata,
  onLinkClick,
  isFullScreen = false
}) => {
  const [ledgerInput, setLedgerInput] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const ledgerEntries = projectData.ledger || [];
  const deadNotesCount = ledgerEntries.filter(n => n.isDead).length;

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

  const handleUpdateNote = (id: string, updates: Partial<Note>) => {
    const updatedLedger = ledgerEntries.map(n => n.id === id ? { ...n, ...updates } : n);
    onUpdateProject({ ledger: updatedLedger });
  };

  const handleDeleteNote = (id: string) => {
    const note = ledgerEntries.find(n => n.id === id);
    if (!note) return;

    if (note.isSavedInLedger) {
      // If saved in ledger, mark as dead but keep
      if (note.isDead) {
        // Already dead, revive it? Or delete permanently?
        // Let's assume delete permanently if already dead and user clicks delete again?
        // Or maybe just toggle dead state.
        // For now, let's just mark as dead if not dead.
        handleUpdateNote(id, { isDead: false }); // Revive
      } else {
        handleUpdateNote(id, { isDead: true }); // Kill
      }
    } else {
      // If not explicitly saved, mark as dead
      handleUpdateNote(id, { isDead: true });
    }
  };

  const handleStartEditing = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  const handleSaveEdit = () => {
    if (editingNoteId) {
      handleUpdateNote(editingNoteId, { content: editingContent });
      setEditingNoteId(null);
      setEditingContent('');
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
            {deadNotesCount > 0 && (
              <button 
                onClick={() => onUpdateProject({ ledger: ledgerEntries.filter(n => !n.isDead) })}
                className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              >
                <Trash2 size={14} /> Clear {deadNotesCount} Dead Note{deadNotesCount !== 1 ? 's' : ''}
              </button>
            )}
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
          <div key={entry.id} className={`relative group ${isFullScreen ? '' : 'p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800'} ${entry.isDead ? 'opacity-50 grayscale' : ''}`}>
            {isFullScreen ? (
              <StackedPaper className={`group ${entry.isDead ? 'opacity-50 grayscale' : ''}`}>
                 <div className="absolute top-8 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                    {/* Actions for Full Screen Mode */}
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
        {!entry.isDead && (
           <button 
             onClick={() => handleStartEditing(entry)}
             className="p-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-lg shadow-sm hover:text-indigo-500 transition-colors"
             title="Edit Note"
           >
             <Edit3 size={14} />
           </button>
        )}
        
        {entry.isDead ? (
          <>
            <button 
              onClick={() => {
                // Save permanently in ledger
                handleUpdateNote(entry.id, { isDead: false, isSavedInLedger: true });
              }}
              className="p-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-lg shadow-sm hover:text-emerald-500 transition-colors"
              title="Save Note in Ledger"
            >
              <Save size={14} />
            </button>
            <button 
              onClick={() => {
                // Restore note (re-canonize)
                handleUpdateNote(entry.id, { isDead: false, isSavedInLedger: false, isCanon: true });
                
                // Also restore to ideas if needed (handled in parent usually, but here we just update ledger state)
                // Ideally we should have a callback for "Restore" to handle global state if needed.
                // But for now, let's just update the ledger entry.
              }}
              className="p-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-lg shadow-sm hover:text-amber-500 transition-colors"
              title="Restore Note"
            >
              <Zap size={14} />
            </button>
          </>
        ) : (
          <button 
            onClick={() => handleDeleteNote(entry.id)}
            className="p-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-lg shadow-sm hover:text-red-500 transition-colors"
            title="Delete / Mark Dead"
          >
            <Trash2 size={14} />
          </button>
        )}

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
    const isEditing = editingNoteId === entry.id;

    return (
      <>
        <div className="flex items-center gap-2 mb-2">
          <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
            {isFullScreen ? `ENTRY // ${new Date(entry.timestamp).toLocaleString()}` : new Date(entry.timestamp).toLocaleDateString()}
          </div>
          {currentUser?.role === 'admin' && (
            <span className="font-mono text-[9px] opacity-50 select-all">ID: {entry.id}</span>
          )}
          {entry.isDead && (
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-200 dark:bg-slate-800 text-slate-500 uppercase tracking-widest">
              DEAD
            </span>
          )}
        </div>
        
        {isEditing ? (
          <div className="relative">
            <textarea
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-indigo-500 rounded-lg p-3 text-sm font-serif leading-relaxed focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[100px]"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-2">
              <button 
                onClick={() => setEditingNoteId(null)}
                className="px-3 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                className="px-3 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className={`text-sm text-slate-700 dark:text-slate-300 font-serif leading-relaxed ${isFullScreen ? 'text-lg' : ''}`}>
            <WikiText text={entry.content} projectData={projectData} projectsMetadata={projectsMetadata} onLinkClick={onLinkClick} />
          </div>
        )}
      </>
    );
  }
};
