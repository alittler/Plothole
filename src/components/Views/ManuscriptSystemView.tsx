import React, { useState } from 'react';
import { ViewType, ProjectData, ProjectMetadata, Chapter, Note } from '../../types';
import { PenTool, Plus, Save, Sparkles, FileText, Eye, Edit3, List, BarChart2, Users, Hash } from 'lucide-react';
import { WikiText } from '../ui/WikiText';

interface ManuscriptSystemViewProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  data: ProjectData;
  projectsMetadata?: ProjectMetadata[];
  onUpdateChapters: (c: Chapter[]) => void;
  onAddNote: (n: Note) => void;
  onAddLocation: (l: any) => void;
  onAddCharacter: (c: any) => void;
  isAnalyzing?: boolean;
}

enum ManuscriptTab {
  EDITOR = 'Editor',
  OUTLINE = 'Outline',
  ANALYSIS = 'Analysis'
}

export const ManuscriptSystemView: React.FC<ManuscriptSystemViewProps> = ({
  data, projectsMetadata, onUpdateChapters, onChangeView, isAnalyzing
}) => {
  const [activeTab, setActiveTab] = useState<ManuscriptTab>(ManuscriptTab.EDITOR);
  const [activeChapterId, setActiveChapterId] = React.useState(data.chapters?.[0]?.id || '');
  const activeChapter = data.chapters?.find(c => c.id === activeChapterId);
  const [isPreview, setIsPreview] = useState(false);

  const extractTags = (text: string) => {
    const matches = text.match(/#\w+/g);
    return matches ? Array.from(new Set(matches.map(t => t.slice(1)))) : [];
  };

  const tags = activeChapter ? extractTags(activeChapter.content) : [];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-950">
      <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">MANUSCRIPT & DRAFTING</h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Write and refine your narrative content.</p>
          </div>
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            {[ManuscriptTab.EDITOR, ManuscriptTab.OUTLINE, ManuscriptTab.ANALYSIS].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                {tab === ManuscriptTab.EDITOR && <Edit3 size={16} />}
                {tab === ManuscriptTab.OUTLINE && <List size={16} />}
                {tab === ManuscriptTab.ANALYSIS && <BarChart2 size={16} />}
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {activeTab === ManuscriptTab.EDITOR && (
          <>
            <aside className="w-72 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-900/50">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Chapters</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {data.chapters?.map(chapter => (
                  <button
                    key={chapter.id}
                    onClick={() => setActiveChapterId(chapter.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all ${activeChapterId === chapter.id ? 'bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
                  >
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Chapter {chapter.order + 1}</div>
                    <div className="font-bold text-slate-900 dark:text-white line-clamp-1">{chapter.title}</div>
                  </button>
                ))}
                <button 
                  onClick={() => {
                    const newChapter = {
                      id: Math.random().toString(),
                      title: 'New Chapter',
                      content: '',
                      order: data.chapters?.length || 0,
                      status: 'Draft',
                      lastModified: Date.now(),
                      scenes: [],
                      wordCount: 0
                    };
                    onUpdateChapters([...(data.chapters || []), newChapter as any]);
                    setActiveChapterId(newChapter.id);
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-all"
                >
                  <Plus size={18} /> Add Chapter
                </button>
              </div>
            </aside>

            <main className="flex-1 flex flex-col relative">
              {activeChapter ? (
                <>
                  <header className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950">
                    <input
                      type="text"
                      value={activeChapter.title}
                      onChange={(e) => {
                        const updated = data.chapters?.map(c => c.id === activeChapter.id ? { ...c, title: e.target.value } : c) || [];
                        onUpdateChapters(updated);
                      }}
                      className="text-2xl font-black text-slate-900 dark:text-white bg-transparent border-none focus:ring-0 p-0"
                    />
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setIsPreview(!isPreview)}
                        className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-xs font-bold uppercase"
                      >
                        {isPreview ? <><Edit3 size={16} /> Edit</> : <><Eye size={16} /> Preview</>}
                      </button>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{activeChapter.wordCount} Words</span>
                      <button className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                        <Save size={18} />
                      </button>
                    </div>
                  </header>
                  <div className="flex-1 overflow-y-auto p-12">
                    {isPreview ? (
                      <div className="w-full h-full text-lg leading-relaxed text-slate-800 dark:text-slate-200 font-serif">
                        <WikiText 
                          text={activeChapter.content} 
                          projectData={data} 
                          projectsMetadata={projectsMetadata}
                          onLinkClick={(type, id) => {
                            if (type === 'character') onChangeView(ViewType.CHARACTERS);
                            else if (type === 'location' || type === 'lore') onChangeView(ViewType.MAP);
                          }} 
                        />
                      </div>
                    ) : (
                      <textarea
                        value={activeChapter.content}
                        onChange={(e) => {
                          const updated = data.chapters?.map(c => c.id === activeChapter.id ? { ...c, content: e.target.value } : c) || [];
                          onUpdateChapters(updated);
                        }}
                        className="w-full h-full bg-transparent border-none focus:ring-0 text-lg leading-relaxed text-slate-800 dark:text-slate-200 resize-none font-serif"
                        placeholder="Once upon a time..."
                      />
                    )}
                  </div>
                  {tags.length > 0 && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-wrap gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center mr-2">Tags:</span>
                      {tags.map(tag => (
                        <button 
                          key={tag}
                          onClick={() => onChangeView(ViewType.NOTEPAD)} // Or some search view
                          className="px-3 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-full text-xs font-bold hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-colors"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 italic">Select a chapter to begin writing.</div>
              )}
            </main>
          </>
        )}

        {activeTab === ManuscriptTab.OUTLINE && (
          <div className="flex-1 flex items-center justify-center text-slate-400 italic border-2 border-dashed border-slate-200 dark:border-slate-800 m-8 rounded-3xl">
            Chapter outline feature coming soon.
          </div>
        )}

        {activeTab === ManuscriptTab.ANALYSIS && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-6xl mx-auto space-y-12">
              {/* Narrative Heatmaps Section */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <BarChart2 size={24} className="text-indigo-600" /> Narrative Heatmaps
                  </h2>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Density Analysis by Chapter
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 space-y-8">
                  {/* Character Density */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Users size={14} /> Character Density (@)
                    </h3>
                    <div className="flex items-end gap-1 h-32">
                      {data.chapters?.map((chapter, idx) => {
                        const mentions = (chapter.content.match(/@\w+/g) || []).length;
                        const height = Math.min(100, (mentions / 10) * 100);
                        return (
                          <div key={idx} className="flex-1 group relative">
                            <div 
                              className="w-full bg-indigo-500/20 group-hover:bg-indigo-500 rounded-t-sm transition-all" 
                              style={{ height: `${height}%` }} 
                            />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                              Ch {idx + 1}: {mentions} mentions
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Theme Density */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Hash size={14} /> Theme Density (#)
                    </h3>
                    <div className="flex items-end gap-1 h-32">
                      {data.chapters?.map((chapter, idx) => {
                        const tags = (chapter.content.match(/#\w+/g) || []).length;
                        const height = Math.min(100, (tags / 10) * 100);
                        return (
                          <div key={idx} className="flex-1 group relative">
                            <div 
                              className="w-full bg-pink-500/20 group-hover:bg-pink-500 rounded-t-sm transition-all" 
                              style={{ height: `${height}%` }} 
                            />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                              Ch {idx + 1}: {tags} tags
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-4">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
                  <Sparkles size={32} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">AI Manuscript Analysis</h2>
                  <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Upload your latest draft to automatically extract characters, plot points, locations, and world details.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <label className={`w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700 cursor-pointer'}`}>
                    <FileText size={20} />
                    {isAnalyzing ? 'Processing Analysis...' : 'Upload Manuscript (.txt, .md)'}
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".txt,.md" 
                      disabled={isAnalyzing}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const event = new CustomEvent('manuscript-upload', { detail: file });
                          window.dispatchEvent(event);
                        }
                      }}
                    />
                  </label>
                  <button 
                    disabled={isAnalyzing}
                    onClick={() => {
                      // Logic for analyzing CURRENT editor text
                      const fullText = data.chapters?.sort((a, b) => a.order - b.order).map(c => c.content).join('\n\n') || '';
                      const event = new CustomEvent('manuscript-analyze-current', { detail: fullText });
                      window.dispatchEvent(event);
                    }}
                    className={`w-full sm:w-auto px-8 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    <Sparkles size={20} className={isAnalyzing ? 'animate-spin' : 'text-amber-500'} />
                    {isAnalyzing ? 'Architecting...' : 'Analyze Current Editor'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Latest Insights</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0">
                        <Users size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">Character Consistency</div>
                        <p className="text-xs text-slate-500">Run analysis to check if character traits remain consistent across chapters.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center shrink-0">
                        <BarChart2 size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">Pacing & Flow</div>
                        <p className="text-xs text-slate-500">Visualise the emotional arc and pacing of your narrative.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">World Sync</h3>
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Analysis automatically creates and updates Character Cards, Location Pins, and Timeline Events based on your prose.
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {[1,2,3].map(i => (
                          <div key={i} className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800" />
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Synchronised Entities</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
