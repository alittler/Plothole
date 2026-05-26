import React from 'react';
import { Modal } from '../ui/Modal';
import { FileText } from 'lucide-react';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Open Source Licenses"
    >
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4 custom-scrollbar text-slate-900 dark:text-white">
        <p className="text-xs text-slate-500 italic leading-relaxed">
          Plothole is built upon the incredible work of the open source community. Below is a documentation of our third-party dependencies as per standard archival practices.
        </p>

        <div className="space-y-4">
          {[
            {
              name: 'React Flow (@xyflow/react)',
              maintainer: 'webkid.io / xyflow',
              usage: 'Powers the Relationship Graph visualization in Character View.',
              status: 'Actively Maintained',
              cost: 'Free (MIT License)'
            },
            {
              name: 'Tiptap',
              maintainer: 'überdosis',
              usage: 'Core rich-text engine for the Semantic Editor.',
              status: 'Actively Maintained',
              cost: 'Free (MIT License)'
            },
            {
              name: 'Fuse.js',
              maintainer: 'Kiro Risk',
              usage: 'Advanced fuzzy-search logic for the Entity Explorer.',
              status: 'Actively Maintained',
              cost: 'Free (Apache 2.0)'
            },
            {
              name: 'docx',
              maintainer: 'Volodymyr Baydalka',
              usage: 'Generates Microsoft Word files for manuscript export.',
              status: 'Actively Maintained',
              cost: 'Free (MIT License)'
            },
            {
              name: 'Leaflet',
              maintainer: 'Volodymyr Agafonkin',
              usage: 'Geospatial mapping engine for the World Atlas.',
              status: 'Actively Maintained',
              cost: 'Free (BSD-2)'
            },
            {
              name: 'Lucide',
              maintainer: 'Lucide Contributors',
              usage: 'Provides all iconography across the application interface.',
              status: 'Actively Maintained',
              cost: 'Free (ISC License)'
            },
            {
              name: 'Simple Git',
              maintainer: 'Steve King',
              usage: 'Enables automatic Git versioning for story worlds.',
              status: 'Actively Maintained',
              cost: 'Free (MIT License)'
            },
            {
              name: 'pdf-parse',
              maintainer: 'Nicklas Teigen',
              usage: 'Server-side extraction of text from uploaded PDF research.',
              status: 'Maintained',
              cost: 'Free (MIT License)'
            },
            {
              name: 'JSZip',
              maintainer: 'Stuart Knightley',
              usage: 'Bundles and packages project files for local exports.',
              status: 'Actively Maintained',
              cost: 'Free (MIT / GPLv3)'
            },
            {
              name: 'Express',
              maintainer: 'OpenJS Foundation',
              usage: 'Standard server framework for Plothole storage APIs.',
              status: 'Actively Maintained',
              cost: 'Free (MIT License)'
            },
            {
              name: 'Gemini (Google GenAI)',
              maintainer: 'Google',
              usage: 'Previously used for AI-assisted story analysis (now removed).',
              status: 'Deprecated',
              cost: 'Commercial (Usage-based API costs apply)'
            },
            {
              name: 'Clerk',
              maintainer: 'Clerk, Inc.',
              usage: 'Secure user authentication and session management.',
              status: 'Actively Maintained',
              cost: 'Commercial (Free tier + usage-based costs)'
            }
          ].map((lib) => (
            <div key={lib.name} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-black uppercase tracking-tight">{lib.name}</h4>
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${lib.status === 'Actively Maintained' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                  {lib.status}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 text-[10px]">
                <div><span className="font-black text-slate-400 uppercase tracking-widest mr-2">Maintainer:</span> <span className="font-bold">{lib.maintainer}</span></div>
                <div><span className="font-black text-slate-400 uppercase tracking-widest mr-2">Usage:</span> <span>{lib.usage}</span></div>
                <div><span className="font-black text-slate-400 uppercase tracking-widest mr-2">Cost:</span> <span className={`font-bold ${lib.cost.includes('Free') ? 'text-indigo-500' : 'text-amber-600'}`}>{lib.cost}</span></div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-center">
          <a
            href="/licenses.txt"
            target="_blank"
            rel="noreferrer"
            className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-xl transition-all"
          >
            <FileText size={12} /> View Full Dependency Manifest (.txt)
          </a>
        </div>
      </div>
    </Modal>
  );
};
