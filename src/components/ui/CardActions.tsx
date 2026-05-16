import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Edit2, Trash2 } from 'lucide-react';

interface CardActionsProps {
  onEdit?: () => void;
  onEditJSON?: () => void;
  onDelete?: () => void;
  itemName?: string;
  className?: string;
}

export const CardActions: React.FC<CardActionsProps> = ({ 
  onEdit, 
  onEditJSON,
  onDelete, 
  itemName = 'this item',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
  }, [isOpen]);

  // Handle keyboard shortcuts in delete confirmation dialog
  useEffect(() => {
    if (!showDeleteConfirm) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDeleteConfirm(false);
      } else if (e.key === 'Enter') {
        handleConfirmDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteConfirm]);

  const handleEdit = () => {
    setIsOpen(false);
    onEdit?.();
  };

  const handleEditJSON = () => {
    setIsOpen(false);
    onEditJSON?.();
  };

  const handleDeleteClick = () => {
    setIsOpen(false);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete?.();
  };

  return (
    <>
      <div className={`relative ${className}`}>
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          title="More options"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      {isOpen && menuPos && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
          <div 
            className="fixed w-40 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-[9999]"
            style={{ top: `${menuPos.top}px`, left: `${menuPos.left}px` }}
          >
            {onEdit && (
              <button
                onClick={handleEdit}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
              >
                <Edit2 size={14} />
                Edit
              </button>
            )}
            {onEditJSON && (
              <button
                onClick={handleEditJSON}
                className="w-full px-4 py-2 text-left text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-2 transition-colors"
              >
                <Edit2 size={14} />
                Edit JSON
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDeleteClick}
                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
          </div>
        </>,
        document.body
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-[200] bg-black/30 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 w-96 max-w-[90vw] animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete {itemName}?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-semibold text-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
