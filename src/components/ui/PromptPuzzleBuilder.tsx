import React, { useState } from 'react';
import { PromptPiece } from '../../types';
import { Edit2, Save, X, Copy, Check } from 'lucide-react';

interface PromptPuzzleBuilderProps {
  pieces: PromptPiece[];
  onPiecesChange: (pieces: PromptPiece[]) => void;
}

export const PromptPuzzleBuilder: React.FC<PromptPuzzleBuilderProps> = ({ pieces, onPiecesChange }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleToggle = (id: string) => {
    const updated = pieces.map(p => 
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    onPiecesChange(updated);
  };

  const handleEdit = (id: string) => {
    const piece = pieces.find(p => p.id === id);
    if (piece) {
      setEditingId(id);
      setEditText(piece.prompt);
    }
  };

  const handleSave = (id: string) => {
    const updated = pieces.map(p =>
      p.id === id ? { ...p, prompt: editText } : p
    );
    onPiecesChange(updated);
    setEditingId(null);
    setEditText('');
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditText('');
  };

  const getFinalPrompt = () => {
    return pieces
      .filter(p => p.enabled)
      .map(p => `[${p.label.toUpperCase()}]\n${p.prompt}`)
      .join('\n\n---\n\n');
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(getFinalPrompt());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const enabledCount = pieces.filter(p => p.enabled).length;

  return (
    <div className="space-y-8">
      {/* Puzzle Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Extraction Puzzle Pieces</h3>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
            {enabledCount}/{pieces.length} enabled
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {pieces.map(piece => (
            <div
              key={piece.id}
              className={`relative rounded-2xl p-6 border-2 transition-all ${
                editingId === piece.id
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
                  : piece.enabled
                  ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 hover:shadow-lg'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 opacity-50'
              }`}
            >

              {editingId === piece.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    className="w-full h-32 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(piece.id)}
                      className="flex-1 py-2 bg-emerald-600 text-white rounded-lg font-bold flex items-center justify-center gap-1 hover:bg-emerald-700 transition-colors text-xs"
                    >
                      <Save size={14} /> Save
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex-1 py-2 bg-slate-400 text-white rounded-lg font-bold flex items-center justify-center gap-1 hover:bg-slate-500 transition-colors text-xs"
                    >
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide">
                        {piece.label}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
                        {piece.prompt}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={piece.enabled}
                        onChange={() => handleToggle(piece.id)}
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        {piece.enabled ? 'ON' : 'OFF'}
                      </span>
                    </label>
                  </div>

                  <button
                    onClick={() => handleEdit(piece.id)}
                    className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold flex items-center justify-center gap-1 hover:bg-indigo-700 transition-colors text-xs"
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Final Prompt Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Final Combined Prompt</h3>
          <button
            onClick={handleCopyPrompt}
            className="py-2 px-4 bg-slate-700 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors text-xs"
          >
            {copied ? (
              <>
                <Check size={14} /> Copied!
              </>
            ) : (
              <>
                <Copy size={14} /> Copy
              </>
            )}
          </button>
        </div>

        <textarea
          value={getFinalPrompt()}
          readOnly
          className="w-full h-64 bg-slate-900 text-emerald-400 border border-slate-700 rounded-2xl p-4 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-none leading-relaxed"
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-600 dark:text-slate-400 font-bold">
          <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded">
            <div className="font-black text-slate-900 dark:text-slate-100">{pieces.length}</div>
            <div>Total Pieces</div>
          </div>
          <div className="bg-blue-100 dark:bg-blue-900/30 px-3 py-2 rounded">
            <div className="font-black text-blue-600 dark:text-blue-400">{enabledCount}</div>
            <div>Enabled</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded">
            <div className="font-black text-slate-900 dark:text-slate-100">{pieces.length - enabledCount}</div>
            <div>Disabled</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded">
            <div className="font-black text-slate-900 dark:text-slate-100">{Math.round(getFinalPrompt().length / 4)}</div>
            <div>Est. Tokens</div>
          </div>
        </div>
      </div>
    </div>
  );
};
