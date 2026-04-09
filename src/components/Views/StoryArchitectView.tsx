import React, { useState } from 'react';
import { ProjectData, Character, Location, ViewType } from '../../types';
import { Upload, FileText, BookOpen, Users, MapPin, Clock, Download, Save, Trash2, Zap } from 'lucide-react';
import { analyzeStoryText } from '../../services/geminiService';
import { saveProjectData, generateId } from '../../services/storageService';

interface StoryArchitectViewProps {
  onUpdateProject: (updates: Partial<ProjectData>) => void;
  projectsMetadata: any[];
  onSelectProject: (id: string) => void;
  currentUser: any;
}

export const StoryArchitectView: React.FC<StoryArchitectViewProps> = ({ 
  onUpdateProject, projectsMetadata, onSelectProject, currentUser 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Partial<ProjectData> | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setPreviewData(null);
    
    try {
      const text = await file.text();
      if (text.length === 0) {
        throw new Error("The uploaded file is empty.");
      }

      const analysis = await analyzeStoryText(text, undefined, {
        extractCharacters: true,
        extractTimeline: true,
        extractLocations: true,
        extractArtifacts: true,
        extractLore: true
      });

      const newProject: Partial<ProjectData> = {
        id: generateId(),
        title: file.name.replace(/\.[^/.]+$/, ""),
        author: currentUser.name,
        summary: analysis.summary,
        lastModified: Date.now(),
        characters: analysis.characters.map(c => ({ ...c, id: generateId(), source: 'ai' as const })),
        locations: analysis.locations.map(l => ({ ...l, id: generateId(), source: 'ai' as const })),
        timeline: analysis.timeline.map(e => ({ ...e, id: generateId(), source: 'ai' as const })),
        themes: analysis.themes,
        artifacts: analysis.artifacts.map(a => ({ ...a, id: generateId(), source: 'ai' as const })),
        lore: analysis.lore.map(l => ({ ...l, id: generateId(), source: 'ai' as const })),
        chapters: [{
          id: generateId(),
          title: 'Imported Chapter',
          content: text,
          order: 0,
          status: 'Draft' as const,
          lastModified: Date.now(),
          scenes: [],
          wordCount: text.split(/\s+/).filter(w => w.length > 0).length
        }]
      };

      setPreviewData(newProject);
    } catch (err) {
      console.error("Error processing file:", err);
      setError(`Failed to process the story file: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCommitProject = async () => {
    if (!previewData) return;
    try {
      await saveProjectData(previewData as ProjectData);
      onSelectProject(previewData.id!);
    } catch (err) {
      setError("Failed to save project.");
    }
  };

  const handleDownloadPreview = () => {
    if (!previewData) return;
    const blob = new Blob([JSON.stringify(previewData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${previewData.title || 'story'}_blueprint.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleJsonUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      setPreviewData(data);
    } catch (err) {
      setError("Failed to parse JSON blueprint.");
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-stone-50 dark:bg-slate-950 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 md:p-0">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
              <Zap size={32} />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">Story Architect</h1>
              <p className="text-slate-500 dark:text-slate-400">Transform raw manuscripts into structured story databases.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-2 border border-slate-200 dark:border-slate-700">
              <Upload size={14} /> <span className="hidden sm:inline">Upload JSON</span>
              <input type="file" className="hidden" accept=".json" onChange={handleJsonUpload} />
            </label>
            {previewData && (
              <>
                <button 
                  onClick={handleDownloadPreview}
                  className="px-4 py-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-800 flex items-center gap-2 hidden sm:flex"
                >
                  <Download size={14} /> Download JSON
                </button>
                <button 
                  onClick={handleCommitProject}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                >
                  <Save size={16} /> <span className="hidden sm:inline">Commit to Library</span>
                </button>
              </>
            )}
          </div>
        </header>

        {!previewData ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900 p-8 shadow-sm border border-slate-200 dark:border-slate-800">
            <label className="flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-all group">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 transition-colors">
                  <Upload className="h-8 w-8 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <div className="space-y-1">
                  <span className="block font-black text-sm text-slate-900 dark:text-white uppercase tracking-widest">Upload Manuscript</span>
                  <span className="block text-xs text-slate-500">Supports .txt, .md, and .json</span>
                </div>
              </div>
              <input type="file" className="hidden" accept=".txt,.md,.json" onChange={handleFileUpload} />
            </label>
            {loading && (
              <div className="mt-8 flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-black text-indigo-600 uppercase tracking-widest animate-pulse">Architecting Story World...</p>
              </div>
            )}
            {error && <p className="mt-6 text-center text-red-500 font-bold text-sm bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30">{error}</p>}
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-8 shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{previewData.title}</h2>
                <div className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">Preview Mode</div>
              </div>
              <p className="text-slate-500 dark:text-slate-400 italic mb-4">by {previewData.author}</p>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{previewData.summary}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Characters" value={previewData.characters?.length || 0} color="text-blue-500" />
              <StatCard icon={MapPin} label="Locations" value={previewData.locations?.length || 0} color="text-emerald-500" />
              <StatCard icon={Clock} label="Timeline" value={previewData.timeline?.length || 0} color="text-amber-500" />
              <StatCard icon={BookOpen} label="Chapters" value={previewData.chapters?.length || 0} color="text-indigo-500" />
            </div>

            <section className="space-y-6">
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Users size={24} className="text-blue-500" /> Character Blueprints
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {previewData.characters?.map((char: Character) => (
                  <div key={char.id} className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">{char.name}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{char.role}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">{char.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {char.traits.map(trait => (
                        <span key={trait} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest rounded-lg">{trait}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-6">
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <MapPin size={24} className="text-emerald-500" /> Geographic Anchors
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {previewData.locations?.map((loc: Location) => (
                  <div key={loc.id} className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">{loc.name}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{loc.type}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">{loc.description}</p>
                  </div>
                ))}
              </div>
            </section>
            
            <div className="flex justify-center pt-8">
              <button 
                onClick={() => setPreviewData(null)}
                className="px-6 py-2 text-slate-400 hover:text-red-500 font-black text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} /> Discard Preview
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4">
    <div className={`p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 ${color} shadow-inner`}>
      <Icon size={20} />
    </div>
    <div>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{label}</span>
      <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{value}</span>
    </div>
  </div>
);
