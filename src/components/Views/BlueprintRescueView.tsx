import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface BlueprintRescueViewProps {
  rawData: any;
  onCommit: (migrated: any) => void;
  onCancel: () => void;
}

export const BlueprintRescueView: React.FC<BlueprintRescueViewProps> = ({
  onCommit, onCancel
}) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[3000] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        <div className="p-8 space-y-6">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle size={32} />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">LEGACY DATA DETECTED</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">We found a story blueprint from a previous version of Plothole. Would you like to migrate it to the current system?</p>
          </div>
          <div className="flex gap-4 pt-4">
            <button onClick={onCancel} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 transition-colors">
              Discard
            </button>
            <button onClick={() => onCommit({})} className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-colors flex items-center justify-center gap-2">
              <RefreshCw size={18} /> Migrate Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
