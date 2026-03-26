import React, { useState } from 'react';
import { Search, Upload, FileText, Trash2, Loader2, Cpu, Clipboard, Sparkles, ExternalLink, Globe, Image as ImageIcon, BookOpen, Edit2, Save, Copy, Check, Link, Quote, Download, Database, Table, Code } from 'lucide-react';
import { Source } from '../../../types';
import * as pdfjsLib from 'pdfjs-dist';
import { generateSourceGuide as generateSourceGuideAi, smartExtractSources, performOCR } from '../../../services/geminiService';
import { generateId } from '../../../services/storageService';
import { Modal } from '../../ui/Modal';
import { formatCitation, exportAllCitations, CitationStyle } from '../../../utils/citationUtils';

// Initialize PDF.js worker using unpkg which is more reliable for specific versions
// We are now prioritizing server-side extraction with pdf-parse

interface StenoSourcesPanelProps {
  sources: Source[];
  setSources: React.Dispatch<React.SetStateAction<Source[]>>;
  isFullScreen?: boolean;
  onLinkClick?: (type: string, id: string) => void;
}

export const StenoSourcesPanel: React.FC<StenoSourcesPanelProps> = ({
  sources,
  setSources,
  isFullScreen = false,
  onLinkClick
}) => {
  const [isSmartPasteOpen, setIsSmartPasteOpen] = useState(false);
  const [smartPasteInput, setSmartPasteInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [hasCopiedUrls, setHasCopiedUrls] = useState(false);
  const [hasCopiedBib, setHasCopiedBib] = useState(false);
  
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
  const [isBibModalOpen, setIsBibModalOpen] = useState(false);
  const [selectedCitationStyle, setSelectedCitationStyle] = useState<CitationStyle>('APA');
  const [activeCitationSource, setActiveCitationSource] = useState<Source | null>(null);

  // Sync sidecar whenever guide is updated
  const syncSidecar = async (source: Source) => {
    if (!source.filename) return;
    try {
      await fetch('/api/source-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: source.filename.split('/').pop(),
          metadata: {
            id: source.id,
            name: source.name,
            guide: source.guide,
            author: source.author,
            publisher: source.publisher,
            publicationYear: source.publicationYear,
            timestamp: source.timestamp
          }
        })
      });
    } catch (e) {
      console.error("Sidecar sync failed", e);
    }
  };

  const getSourceIcon = (type: string, name?: string) => {
    const ext = name?.split('.').pop()?.toLowerCase() || '';
    
    if (type === 'web') return <Globe size={16} />;
    if (type === 'image' || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return <ImageIcon size={16} />;
    if (type === 'pdf' || ext === 'pdf') return <BookOpen size={16} />;
    
    // Specific format icons
    if (['csv', 'xls', 'xlsx'].includes(ext)) return <Table size={16} />;
    if (['json', 'yaml', 'yml', 'db', 'sqlite'].includes(ext)) return <Database size={16} />;
    if (['js', 'ts', 'tsx', 'py', 'html', 'css'].includes(ext)) return <Code size={16} />;
    
    return <FileText size={16} />;
  };

  const handleSmartPaste = async () => {
    if (!smartPasteInput.trim()) return;
    setIsExtracting(true);
    try {
      const extractions = await smartExtractSources(smartPasteInput);
      const newSources: Source[] = await Promise.all(extractions.map(async ex => {
        let localUrl = '';
        if (ex.url) {
          // 1. Validate Link first
          try {
            const valResp = await fetch('/api/validate-link', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: ex.url })
            });
            const valData = await valResp.json();
            if (!valData.valid) isBroken = true;
          } catch (e) {
            isBroken = true;
          }

          if (!isBroken) {
            try {
              const resp = await fetch('/api/source-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: ex.url, title: ex.title, content: ex.content })
              });
              if (!resp.ok) throw new Error(`Link mirror failed: ${resp.status}`);
              const linkData = await resp.json();
              localUrl = linkData.url;
            } catch (e) {
              console.error("Link sync failed", e);
            }
          }
        }
        
        return {
          id: generateId(),
          name: ex.title || (ex.url ? `Web: ${ex.url}` : 'Untitled Source'),
          content: ex.content || `Source content for ${ex.title}`,
          author: ex.author,
          citation: ex.citation,
          url: ex.url, // Original URL
          filename: localUrl, // Local mirror URL
          type: ex.type || 'text',
          timestamp: Date.now(),
          isAnalyzing: false,
          isBroken
        };
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
      setSources(prev => {
        const updated = prev.map(s => s.id === sourceId ? { ...s, guide, isAnalyzing: false } : s);
        const source = updated.find(s => s.id === sourceId);
        if (source) syncSidecar(source);
        return updated;
      });
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

    // 1. Physical Upload to Server
    console.log('Starting source upload for:', file.name);
    const formData = new FormData();
    formData.append('file', file);
    
    let uploadData;
    try {
      const uploadResp = await fetch('/api/source-upload', {
        method: 'POST',
        body: formData
      });
      console.log('Upload response status:', uploadResp.status);
      if (!uploadResp.ok) {
        const errorText = await uploadResp.text();
        console.error('Upload failed details:', errorText);
        throw new Error(`Upload failed: ${uploadResp.status}`);
      }
      uploadData = await uploadResp.json();
      console.log('Upload success, server data:', uploadData);
    } catch (err: any) {
      console.error('CRITICAL FETCH ERROR:', err);
      alert(`Connection to server failed: ${err.message}. Ensure the backend is running.`);
      return; // Stop processing if fetch fails
    }

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      type = 'pdf';
      
      if (uploadData.extractedText) {
        console.log('Using server-side extracted text');
        content = uploadData.extractedText;
      } else {
        console.log('Attempting browser-side extraction fallback');
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n';
          }
          content = fullText || "No text could be extracted from this PDF.";
        } catch (err) {
          console.error("PDF Parsing Error:", err);
          content = "Failed to extract text from PDF locally. The file was saved, but the content is unreadable by the browser parser.";
        }
      }
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
      filename: uploadData.url, // Local path in /source/
      isAnalyzing: type !== 'image' // Guide generation will start
    };

    console.log('Adding new source to state:', newSource.name);
    setSources(prev => [newSource, ...prev]);
    
    if (type !== 'image') {
      generateSourceGuide(id, content);
    }
  };

  const handleCopyAllUrls = () => {
    const urls = sources
      .map(s => {
        const parts = [];
        if (s.name) parts.push(`Source: ${s.name}`);
        if (s.url) parts.push(`Original: ${s.url}`);
        if (s.filename) parts.push(`Local Mirror: ${window.location.origin}${s.filename}`);
        return parts.join('\n');
      })
      .join('\n\n---\n\n');
    
    navigator.clipboard.writeText(urls);
    setHasCopiedUrls(true);
    setTimeout(() => setHasCopiedUrls(false), 2000);
  };

  const handleCopyAllCitations = () => {
    const bib = exportAllCitations(sources, 'APA');
    navigator.clipboard.writeText(bib);
    setHasCopiedBib(true);
    setTimeout(() => setHasCopiedBib(false), 2000);
  };

  const handleDeleteSource = (id: string) => {
    setSources(prev => prev.filter(s => s.id !== id));
  };

  const uploadedFiles = sources.filter(s => s.type !== 'web' && !s.isBroken);
  const webLinks = sources.filter(s => s.type === 'web' && !s.isBroken);
  const brokenSources = sources.filter(s => s.isBroken);

  const renderSourceCard = (source: Source) => (
    <div key={source.id} className={`p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors group flex flex-col gap-2 border border-slate-100 dark:border-slate-800 ${isFullScreen ? 'bg-white dark:bg-slate-900 p-6 rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500/50' : ''} ${source.isBroken ? 'opacity-75 grayscale-[0.5]' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 ${source.isBroken ? 'bg-red-50 text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'} rounded-lg flex items-center justify-center ${isFullScreen ? 'w-10 h-10' : ''}`}>
            {source.isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : (source.isBroken ? <AlertCircle size={16} /> : getSourceIcon(source.type, source.name))}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight ${isFullScreen ? 'text-sm mb-1' : ''}`} title={source.name}>
              {source.name}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-[10px] text-slate-400">{new Date(source.timestamp).toLocaleDateString()}</div>
              <div className="flex items-center gap-2">
                {source.url && (
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className={`${source.isBroken ? 'text-red-400' : 'text-slate-400'} hover:text-indigo-600 transition-colors`} title={source.isBroken ? "Broken Link" : "Open Original URL"}>
                    {source.isBroken ? <Link size={12} className="strike-through" /> : <ExternalLink size={12} />}
                  </a>
                )}
                {source.filename && (
                  <a href={source.filename} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-indigo-600 transition-colors" title="Open Local Mirror (HTML)">
                    <Save size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveCitationSource(source);
              setIsCitationModalOpen(true);
            }}
            className="p-1 text-slate-300 hover:text-amber-500 transition-colors"
            title="Generate Citation"
          >
            <Quote size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLinkClick?.('admin', source.id);
            }}
            className="p-1 text-slate-300 hover:text-indigo-600 transition-colors"
            title="Edit Source"
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
            {source.guide.topics?.slice(0, 3).map((t: string, i: number) => (
              <span key={i} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-[8px] font-bold uppercase tracking-wider truncate max-w-[100px]">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden ${isFullScreen ? 'h-full' : 'h-full'}`}>
      {isFullScreen && (
        <div className="bg-indigo-600 text-white p-2 text-center text-[10px] font-black uppercase tracking-widest z-50">
          Source Dashboard: 2/3 Web Mirrors • 1/3 Research Library
        </div>
      )}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex flex-col">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Search size={14} /> Source Directory
          </h3>
          {isFullScreen && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Contextual grounding for the AI Architect.</p>}
        </div>
        <div className="flex gap-2">
          {sources.length > 0 && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-1">
              <button 
                onClick={handleCopyAllUrls}
                className={`p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold ${hasCopiedUrls ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}
                title="Copy All Source URLs"
              >
                {hasCopiedUrls ? <Check size={18} /> : <Copy size={18} />}
              </button>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
              <button 
                onClick={() => setIsBibModalOpen(true)}
                className={`p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold ${hasCopiedBib ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}
                title="Copy All Citations"
              >
                <Quote size={18} />
              </button>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
              <button 
                onClick={() => {
                  const bib = exportAllCitations(sources, 'APA');
                  const blob = new Blob([bib], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'bibliography.txt';
                  a.click();
                }}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 rounded-lg transition-all"
                title="Export Bibliography (APA)"
              >
                <Download size={18} />
              </button>
            </div>
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

      <div className={`flex-1 overflow-y-auto p-4 ${isFullScreen ? 'p-8' : ''}`}>
        {!isFullScreen && sources.length === 0 ? (
          <div className="p-8 text-center text-slate-400 italic text-xs">
            No sources uploaded yet.
          </div>
        ) : (
          <div className={`${isFullScreen ? 'flex flex-col lg:flex-row gap-8 h-full' : 'space-y-8'}`}>
            {/* 2/3 Column: Web Links */}
            <div className={`${isFullScreen ? 'lg:w-[66%]' : 'w-full'} space-y-6`}>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 px-1 border-b border-slate-100 dark:border-slate-800 pb-2">
                <Link size={12} /> Web Links & Mirrors (HTML)
              </h4>
              <div className={`grid grid-cols-1 ${isFullScreen ? 'md:grid-cols-2' : ''} gap-4`}>
                {webLinks.length > 0 ? (
                  webLinks.map(renderSourceCard)
                ) : (
                  <div className="col-span-full py-12 text-center text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    {isFullScreen ? 'No web links linked yet. Use Smart-Paste to mirror URLs.' : 'No web links.'}
                  </div>
                )}
              </div>
            </div>

            {/* Vertical Divider for Desktop */}
            {isFullScreen && (
              <div className="hidden lg:block w-px bg-slate-200 dark:bg-slate-800 self-stretch" />
            )}

            {/* 1/3 Column: Uploaded Files */}
            <div className={`${isFullScreen ? 'lg:w-[33%]' : 'w-full'} space-y-8`}>
              <div className={`${isFullScreen ? 'bg-slate-50/50 dark:bg-slate-800/20 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 h-full' : ''}`}>
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 px-1 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
                      <FileText size={12} /> Research Library
                    </h4>
                    <div className="space-y-4">
                      {uploadedFiles.length > 0 ? (
                        uploadedFiles.map(renderSourceCard)
                      ) : (
                        <div className="py-8 text-center text-slate-400 text-xs italic">
                          No documents.
                        </div>
                      )}
                    </div>
                  </div>

                  {brokenSources.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] flex items-center gap-2 px-1 border-b border-red-100 dark:border-red-900/30 pb-2 mb-4">
                        <AlertCircle size={12} /> Broken Sources
                      </h4>
                      <div className="space-y-4">
                        {brokenSources.map(renderSourceCard)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
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
        isOpen={isBibModalOpen}
        onClose={() => setIsBibModalOpen(false)}
        title="Export Project Bibliography"
      >
        <div className="space-y-6">
          <p className="text-xs text-slate-500 italic">Select a citation style to copy all sources to your clipboard.</p>
          
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['APA', 'MLA', 'Chicago', 'Vancouver'] as CitationStyle[]).map(style => (
              <button
                key={style}
                onClick={() => setSelectedCitationStyle(style)}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedCitationStyle === style ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                {style}
              </button>
            ))}
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 max-h-64 overflow-y-auto custom-scrollbar">
            <pre className="text-[10px] font-serif text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {exportAllCitations(sources, selectedCitationStyle)}
            </pre>
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(exportAllCitations(sources, selectedCitationStyle));
              setHasCopiedBib(true);
              setTimeout(() => setHasCopiedBib(false), 2000);
              setIsBibModalOpen(false);
            }}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
          >
            <Copy size={14} /> Copy Bibliography
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={isCitationModalOpen}
        onClose={() => setIsCitationModalOpen(false)}
        title="Generate Academic Citation"
      >
        <div className="space-y-6">
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['APA', 'MLA', 'Chicago', 'Vancouver'] as CitationStyle[]).map(style => (
              <button
                key={style}
                onClick={() => setSelectedCitationStyle(style)}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedCitationStyle === style ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                {style}
              </button>
            ))}
          </div>

          {activeCitationSource && (
            <div className="space-y-4">
              <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-sm font-serif italic text-slate-700 dark:text-slate-300 leading-relaxed">
                  {formatCitation(activeCitationSource, selectedCitationStyle)}
                </p>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(formatCitation(activeCitationSource, selectedCitationStyle));
                  setIsCitationModalOpen(false);
                }}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                <Quote size={14} /> Copy Citation
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
