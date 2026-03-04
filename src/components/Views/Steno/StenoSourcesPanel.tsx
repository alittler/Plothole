import React from 'react';
import { Search, Upload, FileText, Trash2, Loader2, Cpu } from 'lucide-react';
import { Source } from '../../../types';
import * as pdfjsLib from 'pdfjs-dist';
import { generateSourceGuide as generateSourceGuideAi } from '../../../services/geminiService';
import { generateId } from '../../../services/storageService';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface StenoSourcesPanelProps {
  sources: Source[];
  setSources: React.Dispatch<React.SetStateAction<Source[]>>;
  onArchitect: (content: string) => void;
  isFullScreen?: boolean;
}

export const StenoSourcesPanel: React.FC<StenoSourcesPanelProps> = ({
  sources,
  setSources,
  onArchitect,
  isFullScreen = false
}) => {

  const generateSourceGuide = async (sourceId: string, content: string) => {
    try {
      setSources(prev => prev.map(s => s.id === sourceId ? { ...s, isAnalyzing: true } : s));
      const guide = await generateSourceGuideAi(content);
      setSources(prev => prev.map(s => s.id === sourceId ? { ...s, guide, isAnalyzing: false } : s));
    } catch (err) {
      console.error("Failed to generate source guide:", err);
      setSources(prev => prev.map(s => s.id === sourceId ? { ...s, isAnalyzing: false } : s));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const id = generateId();
    let content = '';
    let type: 'text' | 'pdf' = 'text';

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      type = 'pdf';
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      content = fullText;
    } else {
      content = await file.text();
    }

    const newSource: Source = {
      id,
      name: file.name,
      content,
      type,
      timestamp: Date.now(),
      isAnalyzing: true
    };
    
    setSources(prev => [newSource, ...prev]);
    generateSourceGuide(id, content);
  };

  const handleDeleteSource = (id: string) => {
    setSources(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className={`flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden ${isFullScreen ? 'h-full' : 'h-full'}`}>
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex flex-col">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Search size={14} /> Source Directory
          </h3>
          {isFullScreen && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Contextual grounding for the AI Architect.</p>}
        </div>
        <div className="flex gap-2">
          <label className={`px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer ${isFullScreen ? 'px-6 py-2 text-sm' : ''}`}>
            <Upload size={16} /> {isFullScreen ? 'Upload Files' : 'Upload'}
            <input type="file" className="hidden" accept=".txt,.md,.json,.csv,.pdf" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isFullScreen ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 space-y-0' : ''}`}>
        {sources.length === 0 && (
          <div className={`col-span-full p-8 text-center text-slate-400 italic text-xs ${isFullScreen ? 'p-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl' : ''}`}>
            {isFullScreen ? 'No sources found. Upload documents or convert notes to ground your AI.' : 'No sources uploaded yet.'}
          </div>
        )}
        {sources.map(source => (
          <div key={source.id} className={`p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors group flex flex-col gap-2 border border-slate-100 dark:border-slate-800 ${isFullScreen ? 'bg-white dark:bg-slate-900 p-6 rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500/50' : ''}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 ${isFullScreen ? 'w-10 h-10' : ''}`}>
                  {source.isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-bold text-slate-900 dark:text-white truncate ${isFullScreen ? 'text-sm mb-1' : ''}`}>{source.name}</div>
                  <div className="text-[10px] text-slate-400">{new Date(source.timestamp).toLocaleDateString()} {isFullScreen && `• ${source.type} • ${Math.ceil(source.content.length / 6)} words`}</div>
                </div>
              </div>
              <button 
                onClick={() => handleDeleteSource(source.id)}
                className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={16} />
              </button>
            </div>
            
            {source.guide && (
              <div className={`space-y-2 ${isFullScreen ? 'mb-4' : 'pl-11 pr-2 pb-2'}`}>
                <p className={`text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 ${isFullScreen ? 'text-xs' : ''}`}>
                  {source.guide.summary}
                </p>
                <div className="flex flex-wrap gap-1">
                  {source.guide.topics.slice(0, 3).map((t, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-[8px] font-bold uppercase tracking-wider truncate max-w-[100px]">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {isFullScreen && !source.guide && !source.isAnalyzing && (
               <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 font-serif italic mb-4">
                 "{source.content.substring(0, 150)}..."
               </div>
            )}

            <button 
              onClick={() => onArchitect(source.content)}
              className="w-full py-2 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
            >
              <Cpu size={12} /> Send to Architect
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
