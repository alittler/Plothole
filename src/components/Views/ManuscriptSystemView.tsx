import React, { useState } from 'react';
import { ViewType, ProjectData, ProjectMetadata, Chapter, Note } from '../../types';
import { PenTool, Plus, Save, Sparkles, FileText, Eye, Edit3, List, BarChart2 } from 'lucide-react';
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
}

enum ManuscriptTab {
  EDITOR = 'Editor',
  OUTLINE = 'Outline',
  ANALYSIS = 'Analysis'
}

export const ManuscriptSystemView: React.FC<ManuscriptSystemViewProps> = ({
  data, projectsMetadata, onUpdateChapters, onChangeView
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
          <div className="flex-1 flex items-center justify-center text-slate-400 italic border-2 border-dashed border-slate-200 dark:border-slate-800 m-8 rounded-3xl">
            Manuscript analysis feature coming soon.
          </div>
        )}
      </div>
    </div>
  );
};
