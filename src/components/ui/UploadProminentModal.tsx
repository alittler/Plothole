import React from 'react';
import { Modal } from './Modal';
import { Loader2, Sparkles, Download, Clock, Info } from 'lucide-react';

interface UploadProminentModalProps {
  isOpen: boolean;
  status: string | null;
  fileName?: string;
  onClose: () => void;
}

export const UploadProminentModal: React.FC<UploadProminentModalProps> = ({ isOpen, status, fileName, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Architecting Story World"
      maxWidth="max-w-xl"
    >
      <div className="py-8 flex flex-col items-center text-center space-y-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="text-indigo-600 animate-pulse" size={32} />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
            {status || 'Processing Manuscript...'}
          </h3>
          {fileName && (
            <p className="text-sm font-medium text-slate-500 flex items-center justify-center gap-2">
              Uploading: <span className="font-mono text-indigo-600 dark:text-indigo-400">{fileName}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center gap-2">
            <Clock size={20} className="text-amber-500" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estimated Time</h4>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              30 - 90 seconds
            </p>
            <p className="text-[9px] text-slate-500 leading-tight">
              Large manuscripts require deep archival analysis.
            </p>
          </div>

          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 flex flex-col items-center text-center gap-2">
            <Download size={20} className="text-indigo-600" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Recommendation</h4>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Download Blueprint
            </p>
            <p className="text-[9px] text-slate-500 leading-tight">
              Keep a local copy of your story world configuration.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30 text-left">
          <Info size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[10px] text-amber-800 dark:text-amber-400 leading-relaxed font-medium">
            Plothole is currently extracting characters, locations, and narrative threads from your manuscript. Please do not close this window until the architecture is complete.
          </p>
        </div>
      </div>
    </Modal>
  );
};
