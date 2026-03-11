import React, { useState } from 'react';
import { Search, Upload, FileText, Trash2, Loader2, Cpu, Clipboard, Sparkles, ExternalLink, Globe, Image as ImageIcon, BookOpen, Edit2 } from 'lucide-react';
import { Source } from '../../../types';
import * as pdfjsLib from 'pdfjs-dist';
import { generateSourceGuide as generateSourceGuideAi, smartExtractSources, performOCR } from '../../../services/geminiService';
import { generateId } from '../../../services/storageService';
import { Modal } from '../../ui/Modal';

// Initialize PDF.js worker using unpkg which is more reliable for specific versions
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface StenoSourcesPanelProps {
  sources: Source[];
  setSources: React.Dispatch<React.SetStateAction<Source[]>>;
  isFullScreen?: boolean;
}

export const StenoSourcesPanel: React.FC<StenoSourcesPanelProps> = ({
  sources,
  setSources,
  isFullScreen = false
}) => {
  const [isSmartPasteOpen, setIsSmartPasteOpen] = useState(false);
  const [smartPasteInput, setSmartPasteInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <BookOpen size={16} />;
      case 'web': return <Globe size={16} />;
      case 'image': return <ImageIcon size={16} />;
      default: return <FileText size={16} />;
    }
  };

  const handleSmartPaste = async () => {
    if (!smartPasteInput.trim()) return;
    setIsExtracting(true);
    try {
      const extractions = await smartExtractSources(smartPasteInput);
      const newSources: Source[] = extractions.map(ex => ({
        id: generateId(),
        name: ex.title || (ex.url ? `Web: ${ex.url}` : 'Untitled Source'),
        content: ex.content || `Source content for ${ex.title}`,
        author: ex.author,
        citation: ex.citation,
        url: ex.url,
        type: ex.type || 'text',
        timestamp: Date.now(),
        isAnalyzing: false
      }));
      setSources(prev => [...newSources, ...prev]);
      setIsSmartPasteOpen(false);
      setSmartPasteInput('');
    } catch (err) {
      console.error("Smart Paste Error:", err);
    } finally {
      setIsExtracting(false);
    }
  };

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
    let type: 'text' | 'pdf' | 'image' = 'text';

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
    } else if (file.type.startsWith('image/')) {
      type = 'image';
      // Temporarily set placeholder while OCR runs
      content = "Extracting text from image...";
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const extractedText = await performOCR(base64);
        setSources(prev => prev.map(s => s.id === id ? { ...s, content: extractedText, isAnalyzing: false } : s));
        generateSourceGuide(id, extractedText);
      };
      reader.readAsDataURL(file);
    } else {
      content = await file.text();
    }

    const newSource: Source = {
      id,
      name: file.name,
      content,
      type,
      timestamp: Date.now(),
      isAnalyzing: type === 'image' ? true : true // Both trigger guide generation
    };

    setSources(prev => [newSource, ...prev]);
    if (type !== 'image') {
      generateSourceGuide(id, content);
    }
  };
  const handleSaveEdit = () => {
    if (editingSource) {
      setSources(prev => prev.map(s => s.id === editingSource.id ? editingSource : s));
      setEditingSource(null);
    }
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
          {sources.length > 0 && (
            <button 
              onClick={() => { if (confirm('Clear all sources?')) setSources([]); }}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              title="Clear All"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button 
            onClick={() => setIsSmartPasteOpen(true)}
            className="p-2 bg-slate-100 dark:bg-slate-800 text-indigo-600 rounded-xl hover:bg-slate-200 transition-colors"
            title="Smart-Paste Extract"
          >
            <Clipboard size={18} />
          </button>
          <label className={`px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer ${isFullScreen ? 'px-6 py-2 text-sm' : ''}`}>
            <Upload size={16} /> {isFullScreen ? 'Upload Files' : 'Upload'}
            <input type="file" className="hidden" accept=".txt,.md,.json,.csv,.pdf,image/*" onChange={handleFileUpload} />
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
                  {source.isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : getSourceIcon(source.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-bold text-slate-900 dark:text-white truncate ${isFullScreen ? 'text-sm mb-1' : ''}`}>
                    {source.url ? (
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors inline-flex items-center gap-1">
                        {source.name} <ExternalLink size={10} className="shrink-0" />
                      </a>
                    ) : source.name}
                  </div>
                  <div className="text-[10px] text-slate-400">{new Date(source.timestamp).toLocaleDateString()} {isFullScreen && `• ${source.type} • ${Math.ceil(source.content.length / 6)} words`}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => setEditingSource(source)}
                  className="p-1 text-slate-300 hover:text-indigo-500 transition-colors"
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={() => handleDeleteSource(source.id)}
                  className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
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

          </div>
        ))}
      </div>

      <Modal 
        isOpen={isSmartPasteOpen} 
        onClose={() => setIsSmartPasteOpen(false)} 
        title="Smart-Paste Source Extraction"
        footer={
          <button 
            onClick={handleSmartPaste}
            disabled={isExtracting || !smartPasteInput.trim()}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
          >
            {isExtracting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {isExtracting ? 'Extracting...' : 'Extract & Link'}
          </button>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed italic">
            Paste research blurbs, book summaries, or scriptural verses. Merlin will automatically extract titles, authors, and link them as sources.
          </p>
          <textarea
            value={smartPasteInput}
            onChange={(e) => setSmartPasteInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSmartPaste();
              }
            }}
            placeholder="Paste raw text here..."
            className="w-full h-48 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>
      </Modal>

      <Modal
        isOpen={!!editingSource}
        onClose={() => setEditingSource(null)}
        title="Edit Source Content"
        footer={
          <button 
            onClick={handleSaveEdit}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold"
          >
            Save Changes
          </button>
        }
      >
        {editingSource && (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Title / Name</label>
              <input 
                type="text"
                value={editingSource.name}
                onChange={(e) => setEditingSource({ ...editingSource, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Content</label>
              <textarea
                value={editingSource.content}
                onChange={(e) => setEditingSource({ ...editingSource, content: e.target.value })}
                className="w-full h-64 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
