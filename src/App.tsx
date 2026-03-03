import React, { useState, useEffect, useCallback, useMemo } from 'react';
import JSZip from 'jszip';
import { 
  ProjectData, ProjectMetadata, User, ViewType, Note, 
  AppPrompts, ToolboxLink, Idea
} from './types';
import { 
  getAllProjectsMetadata, loadProjectById, saveProjectData, 
  deleteProject, getAllGlobalNotes, saveGlobalNote, 
  deleteGlobalNote, clearDatabase,
  getAllGlobalResources, saveGlobalResource, deleteGlobalResource,
  exportFullArchive,
  getAppPrompts,
  saveAppPrompts,
  generateId
} from './services/storageService';
import { 
  analyzeManuscript, generateBookCover, doubleProcessNote, extractThemesFromNotes,
  DEFAULT_PROMPTS
} from './services/geminiService';

// Components
import { Sidebar } from './components/Layout/Sidebar';
import { BottomNav } from './components/Layout/BottomNav';
import { AiAssistant } from './components/ui/AiAssistant';
import { BookshelfView } from './components/Views/BookshelfView';
import { DashboardView } from './components/Views/DashboardView';
import { ResearchSystemView } from './components/Views/ResearchSystemView';
import { CharacterView } from './components/Views/CharacterView';
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import { WorldSystemView } from './components/Views/WorldSystemView';
import { PlotSystemView } from './components/Views/PlotSystemView';
import { ManuscriptSystemView } from './components/Views/ManuscriptSystemView';
import { SettingsView } from './components/Views/SettingsView';
import { AdminView } from './components/Views/AdminView';
import { ToolboxView } from './components/Views/ToolboxView';
import { BlueprintRescueView } from './components/Views/BlueprintRescueView';
import StenoResearchView from './components/Views/StenoResearchView';
import { SemanticEditorView } from './components/Views/SemanticEditorView';
import { AlertCircle, X, Sparkles, Menu } from 'lucide-react';

const DEMO_USER: User = {
  id: 'user-1',
  name: 'Lead Architect',
  email: 'writer@plothole.ai',
  role: 'admin',
  lastActive: Date.now(),
  themeColor: '59 130 246',
  preferences: { themeMode: 'light', fontSize: 'md', fontFamily: 'sans', landingPage: ViewType.BOOKSHELF, aiVerbosity: 'detailed', colorfulIcons: true, semanticSearchEnabled: false }
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState<User>(DEMO_USER);
  const currentView = (decodeURIComponent(location.pathname.slice(1)) as ViewType) || DEMO_USER.preferences?.landingPage || ViewType.BOOKSHELF;
  const setCurrentView = (view: ViewType) => navigate(`/${view}`);
  
  const [projectsMetadata, setProjectsMetadata] = useState<ProjectMetadata[]>([]);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [globalNotes, setGlobalNotes] = useState<Note[]>([]);
  const [globalResources, setGlobalResources] = useState<ToolboxLink[]>([]);
  const [appPrompts, setAppPromptsState] = useState<AppPrompts>(DEFAULT_PROMPTS);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [activeTasks, setActiveTasks] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [isExtractingThemes, setIsExtractingThemes] = useState(false);
  const [currentMapParentId, setCurrentMapParentId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [rescueData, setRescueData] = useState<any | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);

  const checkApiKey = useCallback(async () => {
    // In this environment, GEMINI_API_KEY is usually available in process.env
    const apiKey = process.env.GEMINI_API_KEY;
    const hasKey = !!apiKey && apiKey.length > 10;
    setHasApiKey(hasKey);
    return hasKey;
  }, []);

  const handleOpenKeySelection = async () => {
    // In AI Studio, we don't have a custom key selection, but we can remind the user
    alert("Please ensure GEMINI_API_KEY is set in your environment secrets.");
  };

  const addTask = (id: string) => setActiveTasks(prev => [...prev, id]);
  const removeTask = (id: string) => setActiveTasks(prev => prev.filter(t => t !== id));

  const refreshMetadata = useCallback(async () => {
    const meta = await getAllProjectsMetadata();
    setProjectsMetadata(meta);
  }, []);

  const handleError = useCallback((err: any) => {
      console.error("App Error:", err);
      const msg = err.message || String(err);
      if (msg.includes("AI_CONFIG_ERROR") || msg.includes("API Key")) {
          setAiError("AI services are unavailable: Please check your environment configuration.");
      } else if (msg.includes("quota") || msg.includes("limit")) {
          setAiError("AI Rate Limit reached. Please wait a moment and try again.");
      } else {
          setAiError(`An unexpected error occurred: ${msg.substring(0, 100)}`);
      }
      setTimeout(() => setAiError(null), 8000);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const [meta, notes, resources, prompts] = await Promise.all([
          getAllProjectsMetadata(),
          getAllGlobalNotes(),
          getAllGlobalResources(),
          getAppPrompts()
        ]);
        setProjectsMetadata(meta);
        setGlobalNotes(notes);
        setGlobalResources(resources);
        if (prompts) setAppPromptsState(prev => ({ ...prev, ...prompts }));

        await checkApiKey();

        setIsLoaded(true);
      } catch (err) {
        console.error("Initialization failed", err);
        setIsLoaded(true);
      }
    };
    init();
  }, [checkApiKey]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', currentUser.themeColor);
    root.classList.toggle('dark', currentUser.preferences?.themeMode === 'dark');
  }, [currentUser]);

  const updateProjectData = useCallback(async (updates: Partial<ProjectData>) => {
    if (!projectData) return;
    const updated = { ...projectData, ...updates, lastModified: Date.now() };
    setProjectData(updated);
    await saveProjectData(updated);
    await refreshMetadata();
  }, [projectData, refreshMetadata]);

  const handleCreateProject = async (title: string, author: string, useSample: boolean, shortName?: string) => {
    const id = generateId();
    let newProject: ProjectData = {
      id, title, shortName, author, summary: '', lastModified: Date.now(), characters: [], locations: [], timeline: [], notes: [], relationships: [], themes: [], calendars: [], artifacts: [], lore: [], chapters: []
    };

    if (useSample) {
      newProject = {
        ...newProject,
        summary: 'A story about a hidden archive.',
        themes: ['Mystery'],
        characters: [{ id: generateId(), name: 'Arthur', role: 'Archivist', description: 'keeper of secrets.', traits: ['Diligent'], source: 'manual' }],
        locations: [{ id: generateId(), name: 'Archives', description: 'Underground library.', type: 'Library', source: 'manual' }]
      };
    }

    await saveProjectData(newProject);
    setProjectData(newProject);
    await refreshMetadata();
    setCurrentView(ViewType.DASHBOARD);
  };

  const handleUploadManuscript = async (file: File) => {
    addTask('analyze-upload');
    setIsAnalyzing(true);
    setAiError(null);

    try {
      let content = "";
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const data = JSON.parse(text);
        setRescueData(data.projectData || data);
        return;
      } else if (file.name.endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file);
        const restoreFile = zip.file("full_system_restore.json");
        if (restoreFile) {
          const text = await restoreFile.async("string");
          setRescueData(JSON.parse(text));
          return;
        }
        content = "Zip upload only supported for system restore.";
      } else {
        content = await file.text();
      }

      const analysis = await analyzeManuscript(content, undefined, {
        extractCharacters: true, extractTimeline: true, extractLocations: true, extractArtifacts: true, extractLore: true
      });

      const newProject: ProjectData = {
        id: generateId(), title: analysis.title || file.name, author: currentUser.name, summary: analysis.summary, coverDescription: analysis.coverDescription,
        lastModified: Date.now(), characters: analysis.characters, locations: analysis.locations, timeline: analysis.timeline, themes: analysis.themes,
        notes: [], relationships: [], calendars: [], artifacts: analysis.artifacts, lore: analysis.lore,
        chapters: [{ 
          id: generateId(), 
          title: 'Import', 
          content, 
          order: 0, 
          status: 'Draft', 
          lastModified: Date.now(),
          scenes: [],
          wordCount: content.trim().split(/\s+/).filter(w => w.length > 0).length
        }]
      };

      await saveProjectData(newProject);
      setProjectData(newProject);
      await refreshMetadata();
      setCurrentView(ViewType.DASHBOARD);
    } catch (err) {
      handleError(err);
    } finally {
      setIsAnalyzing(false);
      removeTask('analyze-upload');
    }
  };

  const handleDoubleProcessNote = async (text: string) => {
    addTask('double-process');
    setAiError(null);
    try {
      const res = await doubleProcessNote(text);
      const newNote: Note = { id: generateId(), content: text, expandedContent: res.expanded, metaSummary: res.summary, tags: res.tags, timestamp: Date.now() };
      setGlobalNotes(prev => [newNote, ...prev]);
      await saveGlobalNote(newNote);
    } catch (e) {
      handleError(e);
      const rawNote: Note = { id: generateId(), content: text, tags: ['#raw'], timestamp: Date.now() };
      setGlobalNotes(prev => [rawNote, ...prev]);
      await saveGlobalNote(rawNote);
    } finally {
      removeTask('double-process');
    }
  };

  const handleAddIdeaToProject = async (projectId: string, content: string, tags: string[]) => {
    if (projectData?.id === projectId) {
      const newIdea: Idea = {
        id: generateId(),
        content,
        tags,
        isCanon: false,
        timestamp: Date.now()
      };
      await updateProjectData({ ideas: [newIdea, ...(projectData.ideas || [])] });
    }
  };

  const handleGenerateCover = async () => {
    if (!projectData) return;
    setIsGeneratingCover(true);
    setAiError(null);
    try {
      const coverUrl = await generateBookCover(projectData.title, projectData.author || '', projectData.summary);
      if (coverUrl) await updateProjectData({ coverImage: coverUrl });
    } catch (e) {
      handleError(e);
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const handleToggleCanon = async (noteId: string, isCanon: boolean) => {
    // Check global notes
    const globalNote = globalNotes.find(n => n.id === noteId);
    if (globalNote) {
      const updated = globalNotes.map(n => n.id === noteId ? { ...n, isCanon } : n);
      setGlobalNotes(updated);
      await saveGlobalNote({ ...globalNote, isCanon });
      return;
    }

    // Check project notes (ideas)
    if (projectData?.ideas) {
      const idea = projectData.ideas.find(n => n.id === noteId);
      if (idea) {
        const updated = projectData.ideas.map(n => n.id === noteId ? { ...n, isCanon } : n);
        await updateProjectData({ ideas: updated });
      }
    }
  };

  const viewContent = useMemo(() => {
    if (!isLoaded) return <div className="h-full flex items-center justify-center text-primary animate-pulse font-bold uppercase tracking-widest">Initialising Core Engines...</div>;

    if (!projectData && ![ViewType.BOOKSHELF, ViewType.TOOLBOX, ViewType.ADMIN, ViewType.SETTINGS, ViewType.NOTES, ViewType.STENO_RESEARCH].includes(currentView)) {
        return <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-950 font-serif italic text-lg text-center p-12">Initialize a story world to unlock drafting tools.</div>;
    }

    switch (currentView) {
      case ViewType.BOOKSHELF: 
        return <BookshelfView projects={projectsMetadata} activeProjectId={projectData?.id || ''} currentUser={currentUser} onSelectProject={async (id) => { const d = await loadProjectById(id); if (d) { setProjectData(d); setCurrentView(ViewType.DASHBOARD); } }} onCreateProject={handleCreateProject} onUploadProject={handleUploadManuscript} onDeleteProject={async id => { await deleteProject(id); await refreshMetadata(); if (projectData?.id === id) setProjectData(null); }} onOpenDashboard={() => setCurrentView(ViewType.DASHBOARD)} isAnalyzing={isAnalyzing} />;

      case ViewType.NOTES: 
        return <ResearchSystemView currentView={currentView} onChangeView={setCurrentView} data={{...projectData, notes: globalNotes} as any} onAddNote={async n => { setGlobalNotes(prev => [n, ...prev]); await saveGlobalNote(n); }} onAddIdeaToProject={handleAddIdeaToProject} onToggleCanon={handleToggleCanon} onDeleteNote={async id => { setGlobalNotes(prev => prev.filter(n => n.id !== id)); await deleteGlobalNote(id); }} onLinkClick={(type, id) => { if (type === 'character') setCurrentView(ViewType.CHARACTERS); else if (type === 'dashboard') setCurrentView(ViewType.DASHBOARD); else { setCurrentMapParentId(id); setCurrentView(ViewType.MAP); } }} onAddDoubleProcessedNote={handleDoubleProcessNote} activeTasks={activeTasks} onUpdateProject={updateProjectData} semanticSearchEnabled={currentUser.preferences?.semanticSearchEnabled} />;

      case ViewType.CHARACTERS: 
        return <CharacterView projectTitle={projectData?.title || ''} characters={projectData?.characters || []} locations={projectData?.locations || []} timeline={projectData?.timeline || []} artifacts={projectData?.artifacts || []} themes={projectData?.themes || []} notes={globalNotes} manuscriptHistory={projectData?.manuscriptHistory || []} onUpdateCharacter={(c) => updateProjectData({ characters: projectData?.characters.map(ch => ch.id === c.id ? c : ch) })} onAddCharacter={(c) => updateProjectData({ characters: [...(projectData?.characters || []), c] })} onLinkClick={(type, id) => { if (type === 'location') { setCurrentMapParentId(id); setCurrentView(ViewType.MAP); } }} characterLimit={projectData?.characterLimit} onChangeView={setCurrentView} onExtractThemesFromNotes={async () => { 
            if (!projectData) return;
            setIsExtractingThemes(true);
            try {
              const themes = await extractThemesFromNotes(globalNotes);
              if (themes.length > 0) await updateProjectData({ themes: Array.from(new Set([...projectData.themes, ...themes])) });
            } catch (e) { handleError(e); } finally { setIsExtractingThemes(false); }
          }} 
          isExtractingThemes={isExtractingThemes} />;

      case ViewType.DASHBOARD:
        return projectData ? <DashboardView projectData={projectData} globalNotes={globalNotes} onFileUpload={() => {}} onUpdateManuscript={handleUploadManuscript} onRescanManuscript={handleUploadManuscript} onExportManuscript={() => {}} onImportManuscript={handleUploadManuscript} onLoadSample={() => {}} isAnalyzing={isAnalyzing} error={null} onUpdateMetadata={(t, a) => updateProjectData({ title: t, author: a })} onExport={() => exportFullArchive(globalNotes)} onAnalyzeText={(t) => {
            analyzeManuscript(t, undefined, { extractCharacters: true, extractTimeline: true, extractLocations: true, extractArtifacts: true, extractLore: true })
            .then(a => updateProjectData({ summary: a.summary, themes: a.themes }))
            .catch(handleError);
        }} onRestoreHistory={() => {}} onGenerateCover={handleGenerateCover} isGeneratingCover={isGeneratingCover} /> : null;

      case ViewType.TIMELINE:
      case ViewType.BOARD:
      case ViewType.MATRIX:
      case ViewType.PLOT_ANALYSIS:
      case ViewType.CALENDAR:
        return projectData ? <PlotSystemView currentView={currentView} onChangeView={setCurrentView} data={projectData} onUpdateCalendar={(c) => updateProjectData({ calendars: projectData.calendars.map(cal => cal.id === c.id ? c : cal) })} onSetActiveCalendar={(id) => updateProjectData({ activeCalendarId: id })} onLinkClick={(type, id) => { if (type === 'character') setCurrentView(ViewType.CHARACTERS); else { setCurrentMapParentId(id); setCurrentView(ViewType.MAP); } }} onAddTimelineEvent={(e) => updateProjectData({ timeline: [...projectData.timeline, e] })} onUpdateTimelineEvent={(e) => updateProjectData({ timeline: projectData.timeline.map(ev => ev.id === e.id ? e : ev) })} onAnalyzePlot={() => {}} onUpdateProject={updateProjectData} /> : null;

      case ViewType.MAP:
      case ViewType.LOCATIONS:
      case ViewType.ENCYCLOPEDIA:
      case ViewType.INVENTORY:
      case ViewType.DICTIONARY:
      case ViewType.GALLERY:
        return projectData ? <WorldSystemView currentView={currentView} onChangeView={setCurrentView} data={projectData} onUpdateLocation={(l) => updateProjectData({ locations: projectData.locations.map(loc => loc.id === l.id ? l : loc) })} onAddLocation={(l) => updateProjectData({ locations: [...projectData.locations, l] })} onUpdateRootMap={(u) => updateProjectData({ rootMapImage: u })} onUpdateRootMapData={(s, u) => updateProjectData({ mapScale: s, mapUnit: u })} onLinkClick={(type, id) => { if (type === 'character') setCurrentView(ViewType.CHARACTERS); }} onUpdateMapOrder={() => {}} currentMapParentId={currentMapParentId} onMapChange={setCurrentMapParentId} onUpdateProject={updateProjectData} onAddArtifact={(a) => updateProjectData({ artifacts: [...(projectData.artifacts || []), a] })} onUpdateArtifact={(a) => updateProjectData({ artifacts: projectData.artifacts?.map(ar => ar.id === a.id ? a : ar) })} onDeleteArtifact={(id) => updateProjectData({ artifacts: projectData.artifacts?.filter(ar => ar.id !== id) })} onAddLore={(l) => updateProjectData({ lore: [...(projectData.lore || []), l] })} onDeleteLore={(id) => updateProjectData({ lore: projectData.lore?.filter(lo => lo.id !== id) })} /> : null;

      case ViewType.MANUSCRIPT:
      case ViewType.PROCESSOR:
      case ViewType.SOURCE_READER:
      case ViewType.TABLE:
        return projectData ? <ManuscriptSystemView currentView={currentView} onChangeView={setCurrentView} data={projectData} onUpdateChapters={(c) => updateProjectData({ chapters: c })} onAddNote={async n => { setGlobalNotes(prev => [n, ...prev]); await saveGlobalNote(n); }} onAddLocation={(l) => updateProjectData({ locations: [...projectData.locations, l] })} onAddCharacter={(c) => updateProjectData({ characters: [...projectData.characters, c] })} /> : null;

      case ViewType.TOOLBOX:
        return <ToolboxView bakedResources={globalResources} onAddResource={async (l) => { setGlobalResources(prev => [...prev, l]); await saveGlobalResource(l); }} onDeleteResource={async (id) => { setGlobalResources(prev => prev.filter(r => r.id !== id)); await deleteGlobalResource(id); }} />;

      case ViewType.ADMIN:
        return <AdminView data={projectData} appPrompts={appPrompts} onSavePrompts={async (p) => { setAppPromptsState(p); await saveAppPrompts(p); }} onUpdateProject={updateProjectData} onFullArchive={() => exportFullArchive(globalNotes)} globalResources={[]} onAddGlobalResource={async () => {}} onDeleteGlobalResource={async () => {}} onToggleViewVisibility={() => {}} projectsMetadata={projectsMetadata} />;

      case ViewType.SETTINGS:
        return <SettingsView projectData={projectData} globalNotes={globalNotes} onImportProject={async d => { await saveProjectData(d); await refreshMetadata(); }} onFactoryReset={async () => { await clearDatabase(); window.location.reload(); }} currentUser={currentUser} onUpdateUser={u => setCurrentUser(prev => ({...prev, ...u}))} onUpdateProject={d => updateProjectData(d)} />;

      case ViewType.STENO_RESEARCH:
        return projectData ? <StenoResearchView projectData={projectData} onUpdateProject={updateProjectData} /> : <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-950 font-serif italic text-lg text-center p-12">Initialize a story world to unlock Steno Research.</div>;

      case ViewType.SEMANTIC_EDITOR:
        return projectData ? <SemanticEditorView projectData={projectData} onUpdateProject={updateProjectData} /> : <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-950 font-serif italic text-lg text-center p-12">Initialize a story world to unlock Semantic Engine.</div>;

      default: 
        return <div className="h-full flex items-center justify-center text-slate-400">View not found.</div>;
    }
  }, [isLoaded, currentView, projectData, projectsMetadata, globalNotes, isAnalyzing, isGeneratingCover, isExtractingThemes, currentUser, appPrompts, globalResources, activeTasks, updateProjectData, currentMapParentId, refreshMetadata, handleCreateProject, handleUploadManuscript, handleGenerateCover, handleDoubleProcessNote, handleError]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        isOpen={isMobileSidebarOpen} 
        isCollapsed={isSidebarCollapsed} 
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
        onClose={() => setIsMobileSidebarOpen(false)} 
        hasActiveProject={!!projectData} 
        onToggleAi={() => setIsAiOpen(!isAiOpen)} 
        isAiOpen={isAiOpen} 
        currentUser={currentUser} 
        isProcessing={activeTasks.length > 0} 
        activeProjectTitle={projectData?.title}
        onQuickNote={async (text) => {
          const n: Note = { id: generateId(), content: text, tags: ['admin_note'], timestamp: Date.now() };
          setGlobalNotes(prev => [n, ...prev]);
          await saveGlobalNote(n);
        }}
      />
      <main className="flex-1 h-full relative overflow-hidden flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="w-10" /> {/* Spacer */}
          <span className="font-black tracking-tighter text-slate-900 dark:text-white">PLOTHOLE</span>
          <button onClick={() => setIsAiOpen(!isAiOpen)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-indigo-600">
            <Sparkles size={24} />
          </button>
        </div>

        {!hasApiKey && (
          <div className="bg-indigo-600 text-white px-6 py-3 flex items-center justify-between shadow-lg z-[1001]">
            <div className="flex items-center gap-3 text-sm font-bold">
              <Sparkles size={18} className="animate-pulse" />
              <span>Connect your Gemini API Key to unlock AI story analysis features.</span>
            </div>
            <button 
              onClick={handleOpenKeySelection}
              className="px-4 py-1.5 bg-white text-indigo-600 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-colors shadow-sm"
            >
              Connect Key
            </button>
          </div>
        )}
        {aiError && (
          <div className="bg-amber-500 text-white px-6 py-4 flex items-center justify-between shadow-2xl animate-in slide-in-from-top duration-300 z-[1000] border-b border-amber-600/50">
            <div className="flex items-center gap-4 font-bold text-sm">
              <AlertCircle size={22} className="animate-pulse" />
              {aiError}
            </div>
            <button onClick={() => setAiError(null)} className="p-2 hover:bg-black/10 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-hidden relative pb-24 lg:pb-0">
          {viewContent}
        </div>
        
        {/* Mobile Floating Nav */}
        <BottomNav 
          currentView={currentView} 
          onChangeView={setCurrentView} 
          onOpenSidebar={() => setIsMobileSidebarOpen(true)}
          hasActiveProject={!!projectData}
        />

        {rescueData && (
          <BlueprintRescueView 
            rawData={rescueData} 
            onCommit={async (migrated) => {
              await saveProjectData(migrated);
              setProjectData(migrated);
              await refreshMetadata();
              setRescueData(null);
              setCurrentView(ViewType.DASHBOARD);
            }} 
            onCancel={() => setRescueData(null)} 
          />
        )}
      </main>
      <AiAssistant projectData={projectData} isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} onToggle={() => setIsAiOpen(!isAiOpen)} />
    </div>
  );
};

export default App;
