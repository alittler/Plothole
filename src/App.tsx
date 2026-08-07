'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Menu, X, Search, PenTool, Trash2, 
  Loader2, Sparkles, Database, Layout, 
  Plus, Upload, Shield, Stars, Book,
  Wrench, Settings, LogOut, ChevronRight,
  BookOpen, RefreshCw
} from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

import { 
  ViewType, 
  Note, 
  ProjectData, 
  Character,
  ProjectMetadata, 
  User, 
  AppPrompts, 
  AppSettings, 
  ToolboxLink, 
  BackupStatus, 
  Commit,
  HierarchicalEntity,
  EntityTier,
  ProjectManifest,
  AssetMetadata,
  Idea
} from './types';

import { 
  exportProjectPlothole, 
  exportFullArchive, 
  clearDatabase, 
  isCloudStorageActive, 
  saveAppSettings, 
  saveAppPrompts,
  saveGlobalNote,
  saveAllGlobalNotes,
  deleteGlobalNote,
  exportVaultAsZip,
  saveProjectData
} from './services/storageService';
import { generateId } from './services/storageService';
import { safeResponseJson } from './utils/jsonUtils';

import { useProjectData, populateDataCatalog } from './hooks/useProjectData';
import { useAppInitialization } from './hooks/useAppInitialization';
import { EditModalProvider, useEditModal } from './contexts/EditModalContext';

// Components
import { Sidebar } from './components/Layout/Sidebar';
import { BottomNav } from './components/Layout/BottomNav';
import { OracleFloatingButton } from './components/ui/OracleFloatingButton';
import { ActiveArchitect } from './components/ui/ActiveArchitect';
import { Modal } from './components/ui/Modal';
import { LicenseModal } from './components/Modals/LicenseModal';
import { UploadProminentModal } from './components/ui/UploadProminentModal';

// Dynamic View Imports
const BookshelfView = dynamic(() => import('./components/Views/BookshelfView').then(mod => mod.BookshelfView), { ssr: false });
const DashboardView = dynamic(() => import('./components/Views/DashboardView').then(mod => mod.DashboardView), { ssr: false });
const ManuscriptAnalyzerView = dynamic(() => import('./components/Views/ManuscriptAnalyzerView').then(mod => mod.ManuscriptAnalyzerView), { ssr: false });
const ResearchHubView = dynamic(() => import('./components/Views/ResearchHubView').then(mod => mod.ResearchHubView), { ssr: false });
const WorldSystemView = dynamic(() => import('./components/Views/WorldSystemView').then(mod => mod.WorldSystemView), { ssr: false });
const NarrativeArchitectView = dynamic(() => import('./components/Views/NarrativeArchitectView').then(mod => mod.NarrativeArchitectView), { ssr: false });
const OutlineView = dynamic(() => import('./components/Views/OutlineView').then(mod => mod.OutlineView), { ssr: false });
const ToolboxView = dynamic(() => import('./components/Views/ToolboxView').then(mod => mod.ToolboxView), { ssr: false });
const CharactersView = dynamic(() => import('./components/Views/CharactersView').then(mod => mod.CharactersView), { ssr: false });
const AdminView = dynamic(() => import('./components/Views/AdminView').then(mod => mod.AdminView), { ssr: false });
const SettingsView = dynamic(() => import('./components/Views/SettingsView').then(mod => mod.SettingsView), { ssr: false });

const DynamicEditModal = dynamic(() => import('./components/ui/DynamicEditModal').then(mod => mod.DynamicEditModal), { ssr: false });

const App: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasAutoLoaded = useRef(false);

  const [activeTasks, setActiveTasks] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Initialize currentView from URL if possible
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (viewParam && Object.values(ViewType).includes(viewParam as ViewType)) {
        return viewParam as ViewType;
      }
    }
    return ViewType.BOOKSHELF;
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAdminNoteOpen, setIsAdminNoteOpen] = useState(false);
  const [isLicensesOpen, setIsLicensesOpen] = useState(false);
  const [adminNoteDraft, setAdminNoteDraft] = useState('');
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string | undefined>(undefined);

  // Define handleViewChange early so it can be used by other hooks/functions
  const handleViewChange = useCallback((v: ViewType) => {
    setCurrentView(v);
    setIsMobileSidebarOpen(false);
    
    // Sync with URL and clear any "tab" parameter that might be stuck from a previous view
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('view', v);
      params.delete('tab');
      router.push(`?${params.toString()}`);
    }
  }, [router]);

  const addTask = useCallback((id: string) => setActiveTasks(prev => [...prev, id]), []);
  const removeTask = useCallback((id: string) => setActiveTasks(prev => prev.filter(t => t !== id)), []);

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    try {
      const headers = { ...options.headers } as Record<string, string>;
      return await fetch(url, { ...options, headers });
    } catch (err) {
      console.error(`Error in fetch for ${url}:`, err);
      throw err;
    }
  }, []);

  const {
    globalNotes,
    setGlobalNotes,
    globalResources,
    appPrompts,
    setAppPromptsState,
    appSettings,
    setAppSettings,
    currentUser,
    setCurrentUser,
    isServerConnected,
    isLoaded,
    loadingProgress,
    loadingStage
  } = useAppInitialization();

  const {
    projectsMetadata,
    projectData,
    setProjectData,
    refreshMetadata,
    updateProjectData,
    loadProject,
    handleManualSave,
    handleDeleteProject,
    handleEditProject,
    handleCreateProject,
    handleUploadProject,
    handleRestoreCommit,
    handleAuditThreads,
    handleScanContinuity,
    handleExtractSoftAnchors,
    handleDoubleProcessNote,
    handleDeleteNote,
    handleAddIdeaToProject,
    handleToggleCanon,
    handleQuickUpdate,
    handleExtractRelationships
  } = useProjectData(
    true,
    fetchWithAuth, 
    addTask, 
    removeTask, 
    setIsAnalyzing, 
    globalNotes, 
    setGlobalNotes
  );

  const handleExportVault = async () => {
    addTask('Exporting Vault');
    try {
      await exportVaultAsZip(globalNotes, 'vault_' + Math.random().toString(36).substring(7), currentUser.name, projectsMetadata);
    } catch (err) {
      console.error("Vault export failed", err);
    } finally {
      removeTask('Exporting Vault');
    }
  };

  const handleCancelUpload = () => {
    removeTask('uploading-project');
    setUploadingFileName(undefined);
    setProcessingStatus(null);
  };

  const [currentMapParentId, setCurrentMapParentId] = useState<string | null>(null);
  const [adminTargetId, setAdminTargetId] = useState<string | null>(null);

  const handleLinkClick = useCallback((type: string, id: string) => {
    if (type === 'admin') {
      setAdminTargetId(id);
      handleViewChange(ViewType.ADMIN);
    } else if (type === 'character') {
      handleViewChange(ViewType.CHARACTERS);
    } else if (type === 'location') {
      setCurrentMapParentId(id);
      handleViewChange(ViewType.MAP);
    } else if (type === 'bestiary') {
      handleViewChange(ViewType.CODEX_HUB);
    } else if (type === 'dashboard') {
      handleViewChange(ViewType.NOTEPAD);
    }
  }, [handleViewChange]);

  useEffect(() => {
    if (isLoaded && projectsMetadata.length > 0 && !projectData && !hasAutoLoaded.current) {
      const sortedMeta = [...projectsMetadata].sort((a, b) => b.lastModified - a.lastModified);
      const firstId = sortedMeta[0].id;
      loadProject(firstId).then(project => {
        if (project && (!pathname || pathname === '/')) {
          handleViewChange(ViewType.NOTEPAD);
        }
      });
      hasAutoLoaded.current = true;
    }
  }, [isLoaded, projectsMetadata, projectData, loadProject, pathname, router, handleViewChange]);

  const handleUpdateCharacter = useCallback(async (updatedChar: Character) => {
    if (!projectData) return;

    const oldChar = (projectData.characters || []).find(c => c.id === updatedChar.id);
    if (!oldChar) return;

    // Identify what changed for the log
    const changes: string[] = [];
    if (oldChar.name !== updatedChar.name) changes.push(`name to "${updatedChar.name}"`);
    if (oldChar.role !== updatedChar.role) changes.push(`role to "${updatedChar.role}"`);
    if (oldChar.description !== updatedChar.description) changes.push('description');
    if (oldChar.motivation !== updatedChar.motivation) changes.push('goals/motivation');
    if (oldChar.physical_description !== updatedChar.physical_description) changes.push('physical description');
    if (oldChar.species !== updatedChar.species) changes.push(`species to "${updatedChar.species}"`);
    if (oldChar.age !== updatedChar.age) changes.push(`age to "${updatedChar.age}"`);

    // Check field_notes (Analysis Details)
    const oldNotesStr = JSON.stringify(oldChar.field_notes || []);
    const newNotesStr = JSON.stringify(updatedChar.field_notes || []);
    if (oldNotesStr !== newNotesStr) changes.push('analysis details');

    // Only log if there are meaningful changes
    let newProjectNotes = projectData.projectNotes || [];
    if (changes.length > 0) {
      const logEntry = {
        id: `pnote-${Date.now()}`,
        content: `Updated character "${updatedChar.name}": Changed ${changes.join(', ')}.`,
        timestamp: Date.now(),
        category: 'edit' as const
      };
      newProjectNotes = [logEntry, ...newProjectNotes];
    }

    await updateProjectData({
      characters: (projectData.characters || []).map(c => c.id === updatedChar.id ? updatedChar : c),
      projectNotes: newProjectNotes
    });
  }, [projectData, updateProjectData]);

  const viewContent = React.useMemo(() => {
    if (!isLoaded) return null;

    switch (currentView) {
      case ViewType.BOOKSHELF:
        return <BookshelfView
          projects={projectsMetadata}
          activeProjectId={projectData?.id || ''}
          currentUser={currentUser}
          globalNotes={globalNotes}
          onRefreshMetadata={refreshMetadata}
          fetchWithAuth={fetchWithAuth}
          onSelectProject={async (id) => {
            await loadProject(id);
            handleViewChange(ViewType.DASHBOARD);
          }}
          onAnalyzeManuscript={async (id) => {
            await loadProject(id);
            handleViewChange(ViewType.MANUSCRIPT_ANALYZER);
          }}
          onDeselectProject={() => setProjectData(null)}
          onCreateProject={async (title, author, useSample, shortName) => { 
            const newProj = await handleCreateProject(title, author, useSample, shortName); 
            if (newProj) {
              await loadProject(newProj.id);
              handleViewChange(ViewType.NOTEPAD);
            }
          }}
          onUploadProject={async (file) => {
            const project = await handleUploadProject(file);
            if (project) {
              handleViewChange(ViewType.MANUSCRIPT_ANALYZER);
            }
          }}
          onDeleteProject={handleDeleteProject}
          onEditProject={handleEditProject}
          isAnalyzing={isAnalyzing}
        />;

      case ViewType.DASHBOARD:
        return projectData ? <DashboardView
          projectData={projectData}
          globalNotes={globalNotes}
          onBack={() => handleViewChange(ViewType.BOOKSHELF)}
          onNavigate={handleViewChange}
          onUpdateProject={updateProjectData}
        /> : null;
      case ViewType.MANUSCRIPT_ANALYZER:
        return projectData ? <ManuscriptAnalyzerView 
          projectData={projectData}
          onBack={() => handleViewChange(ViewType.BOOKSHELF)}
          onSaveCharacters={async (newCharacters) => {
            if (!projectData) return;
            
            const existingChars = projectData.characters || [];
            const existingIds = new Set(existingChars.map(c => c.id));
            
            const uniqueNewChars = newCharacters.filter(nc => !existingIds.has(nc.id));
            const updatedCharacters = [...existingChars, ...uniqueNewChars];
            
            await updateProjectData({ 
              characters: updatedCharacters
            });
            
            await handleManualSave();
            handleViewChange(ViewType.CHARACTERS);
          }}
        /> : null;

      case ViewType.NOTEPAD:
      case ViewType.RESEARCH:
        {
          const isNotepadView = currentView === ViewType.NOTEPAD || !projectData;
          return <ResearchHubView
            currentView={currentView}
            onChangeView={handleViewChange}
            data={(isNotepadView ? { 
              notes: globalNotes,
              id: '',
              title: 'Global Notebook',
              author: currentUser.name,
              characters: [],
              locations: [],
              timeline: [],
              artifacts: [],
              lore: [],
              ideas: [],
              commits: [],
              backups: [],
              corkboardNotes: projectData?.corkboardNotes || []
            } : projectData) as any}
            projectsMetadata={projectsMetadata}
            currentUser={currentUser}
            activeTasks={activeTasks}
            fetchWithAuth={fetchWithAuth}
            onAddNote={async n => {
              if (isNotepadView) {
                const updated = [n, ...globalNotes];
                setGlobalNotes(updated);
                await saveGlobalNote(n);
              } else if (projectData) {
                await updateProjectData({ notes: [n, ...(projectData.notes || [])] });
              }
            }}
            onImportNotes={async (newNotes) => {
              if (isNotepadView) {
                const combined = [...newNotes, ...globalNotes];
                setGlobalNotes(combined);
                await saveAllGlobalNotes(combined);
              } else if (projectData) {
                await updateProjectData({ notes: [...newNotes, ...(projectData.notes || [])] });
              }
            }}
            onAddIdeaToProject={handleAddIdeaToProject}
            onToggleCanon={handleToggleCanon}
            onDeleteNote={handleDeleteNote}
            onDeleteAllNotes={async () => {
              if (isNotepadView) {
                setGlobalNotes([]);
                await clearDatabase();
              } else if (projectData) {
                await updateProjectData({ notes: [] });
              }
            }}
            onLinkClick={handleLinkClick}
            onAddDoubleProcessedNote={handleDoubleProcessNote}
            onUpdateProject={updateProjectData}
            semanticSearchEnabled={currentUser.preferences?.semanticSearchEnabled}
            onCreateProject={async (title, author, useSample, shortName) => { await handleCreateProject(title, author, useSample, shortName); }}
            onUploadProject={handleUploadProject}
            onDeleteProject={handleDeleteProject}
            onSelectProject={async (id) => { await loadProject(id); handleViewChange(ViewType.NOTEPAD); }}
            isAnalyzing={isAnalyzing}
          />;
        }


      case ViewType.WORLD_HUB:
      case ViewType.MAP:
        if (!projectData) return null;
        return <WorldSystemView
          currentView={currentView}
          onChangeView={handleViewChange}
          data={projectData} 
          onUpdateLocation={(l) => updateProjectData({ locations: (projectData.locations || []).map(loc => loc.id === l.id ? l : loc) })}
          onUpdateCharacter={handleUpdateCharacter}
          onAddLocation={(l) => updateProjectData({ locations: [...(projectData.locations || []), l] })}
          onUpdateRootMap={(u) => updateProjectData({ rootMapImage: u })}
          onUpdateRootMapData={(s, u) => updateProjectData({ mapScale: s, mapUnit: u })}
          onLinkClick={handleLinkClick}
          onUpdateMapOrder={() => {}}
          currentMapParentId={currentMapParentId}
          onMapChange={setCurrentMapParentId}
          onUpdateProject={updateProjectData}
          onAddArtifact={(a) => updateProjectData({ artifacts: [...(projectData.artifacts || []), a] })}
          onUpdateArtifact={(a) => updateProjectData({ artifacts: projectData.artifacts?.map(ar => ar.id === a.id ? a : ar) })}
          onDeleteArtifact={(id) => updateProjectData({ artifacts: projectData.artifacts?.filter(ar => ar.id !== id) })}
          onAddLore={(l) => updateProjectData({ lore: [...(projectData.lore || []), l] })}
          onDeleteLore={(id) => updateProjectData({ lore: projectData.lore?.filter(lo => lo.id !== id) })}
          isFullscreen={isMapFullscreen}
          onToggleFullscreen={() => setIsMapFullscreen(!isMapFullscreen)}
          onLocationUndo={(id) => {
            const loc = (projectData.locations || []).find(l => l.id === id);
            if (loc && loc.prevX !== undefined) updateProjectData({ locations: (projectData.locations || []).map(l => l.id === id ? { ...l, x: loc.prevX, y: loc.prevY, prevX: undefined, prevY: undefined } : l) });
          }}
          onLocationReset={(id) => {
            const loc = (projectData.locations || []).find(l => l.id === id);
            if (loc && loc.matchedX !== undefined) updateProjectData({ locations: (projectData.locations || []).map(l => l.id === id ? { ...l, x: loc.matchedX, y: loc.matchedY } : l) });
          }}
          currentUser={currentUser}
          projectsMetadata={projectsMetadata}
        />;

      case ViewType.CHARACTERS:
        if (!projectData) return null;
        return <CharactersView
          data={projectData}
          onUpdateCharacter={handleUpdateCharacter}
          onAddCharacter={(c) => updateProjectData({ characters: [...(projectData.characters || []), c] })}
          onDeleteCharacter={(id) => updateProjectData({ characters: (projectData.characters || []).filter(c => c.id !== id) })}
          onLinkClick={handleLinkClick}
          fetchWithAuth={fetchWithAuth}
        />;

      case ViewType.TOOLBOX:
        return projectData ? <ToolboxView data={projectData} defaultResources={appSettings.defaultToolboxLinks || []} onUpdateProject={updateProjectData} /> : null;

      case ViewType.ADMIN:
        return <AdminView
          data={projectData}
          globalNotes={globalNotes}
          appPrompts={appPrompts}
          appSettings={appSettings}
          onSaveSettings={async (s) => { setAppSettings(s); await saveAppSettings(s); }}
          onSavePrompts={async (p) => { setAppPromptsState(p); await saveAppPrompts(p); }}
          onUpdateProject={updateProjectData}
          projectsMetadata={projectsMetadata}
          onDeleteGlobalNote={async id => {
            setGlobalNotes(globalNotes.filter(n => n.id !== id));
            await deleteGlobalNote(id);
          }}
          onLinkClick={handleLinkClick}
          onChangeView={handleViewChange}
          currentUser={currentUser}
        />;

      case ViewType.SETTINGS:
        return <SettingsView
          projectData={projectData}
          globalNotes={globalNotes}
          onImportProject={async d => { await saveProjectData(d); await refreshMetadata(); }}
          onFactoryReset={async () => { 
            if (confirm('Are you absolutely sure? This will wipe ALL your data from this account FOREVER.')) {
              try {
                await fetch('/api/projects', { method: 'DELETE' });
              } catch (e) {
                console.error('Failed to wipe cloud data:', e);
              }
              await clearDatabase(); 
              window.location.reload(); 
            }
          }}
          onClearGlobalNotes={async () => { setGlobalNotes([]); await clearDatabase(); }}
          currentUser={currentUser}
          onUpdateUser={u => setCurrentUser({ ...currentUser, ...u })}
          onUpdateProject={updateProjectData}
          onChangeView={handleViewChange}
          onLinkClick={handleLinkClick}
          fetchWithAuth={fetchWithAuth}
          appSettings={appSettings}
        />;

      default:
        return <div className="h-full flex items-center justify-center text-slate-400">View not found.</div>;
    }
  }, [isLoaded, currentView, projectData, projectsMetadata, globalNotes, isAnalyzing, currentUser, appSettings, appPrompts, activeTasks, currentMapParentId, loadProject, refreshMetadata, updateProjectData, handleUpdateCharacter, handleViewChange, handleDeleteProject, handleEditProject, handleCreateProject, handleUploadProject, handleManualSave, handleDeleteNote, handleAddIdeaToProject, handleToggleCanon, handleDoubleProcessNote, handleLinkClick, isMapFullscreen, pathname, setGlobalNotes, setAppSettings, setAppPromptsState, fetchWithAuth]);

  const renderAppContent = () => {
    if (!isLoaded) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 space-y-6">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-indigo-500" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">{loadingStage}</h2>
            <div className="w-64 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-300" 
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{loadingProgress}% Complete</p>
          </div>
        </div>
      );
    }

    if (activeTasks.includes('Initializing Project')) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Opening Dossier...</p>
        </div>
      );
    }

    return (
      <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
        <Sidebar
          currentView={currentView}
          onChangeView={handleViewChange}
          isOpen={isMobileSidebarOpen}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onClose={() => setIsMobileSidebarOpen(false)}
          hasActiveProject={!!projectData}
          currentUser={currentUser}
          isAnalyzing={isAnalyzing}
          isGuest={true}
          appName={appSettings.appName}
          isFullscreen={isMapFullscreen}
          activeProjectTitle={projectData?.title}
          activeProjectCoverColor={projectData?.coverColor}
        />

        <main className="flex-1 h-full relative overflow-hidden flex flex-col">
          <div className="lg:hidden z-[2000] fixed top-0 left-0 right-0 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4">
            <button onClick={() => setIsMobileSidebarOpen(true)} className="p-2 text-slate-600 dark:text-slate-400"><Menu size={20} /></button>
            <span className="font-black text-sm uppercase tracking-tighter dark:text-white">{appSettings.appName}</span>
            <button onClick={() => setIsMobileSidebarOpen(true)} className="p-2 text-slate-600 dark:text-slate-400"><Search size={20} /></button>
          </div>

          <div className="flex-1 overflow-hidden relative lg:pt-0 pt-14">
            <React.Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>}>
              {viewContent}
            </React.Suspense>
          </div>

          <BottomNav 
            currentView={currentView} 
            onChangeView={handleViewChange} 
            hasActiveProject={!!projectData} 
            isSidebarOpen={isMobileSidebarOpen}
            onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          />
          
          <ActiveArchitect tasks={activeTasks} />
          
          <UploadProminentModal 
            isOpen={activeTasks.includes('uploading-project')} 
            status={processingStatus}
            fileName={uploadingFileName}
            onClose={handleCancelUpload}
          />

          {projectData && <OracleFloatingButton data={{ ...projectData, notes: globalNotes } as any} currentUser={currentUser} />}
        </main>

        <AnimatePresence>
          {isAdminNoteOpen && (
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-[2001]">
              <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h2 className="font-black text-sm uppercase tracking-tighter dark:text-white">Admin Notes</h2>
                <button onClick={() => setIsAdminNoteOpen(false)}><X size={20} /></button>
              </header>
              <div className="flex-1 overflow-y-auto p-4">
                <textarea 
                  value={adminNoteDraft} 
                  onChange={(e) => setAdminNoteDraft(e.target.value)}
                  placeholder="Quick note..."
                  className="w-full h-32 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm mb-4"
                />
                <button 
                  onClick={async () => {
                    const n = { id: generateId(), content: adminNoteDraft, tags: ['admin'], timestamp: Date.now() };
                    setGlobalNotes([n, ...globalNotes]);
                    await saveGlobalNote(n);
                    setAdminNoteDraft('');
                  }}
                  className="w-full py-2 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-tighter"
                >
                  Save Note
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <LicenseModal isOpen={isLicensesOpen} onClose={() => setIsLicensesOpen(false)} />
      </div>
    );
  };

  return (
    <EditModalProvider>
      <AppWithEditor>{renderAppContent()}</AppWithEditor>
    </EditModalProvider>
  );
};

const AppWithEditor: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOpen, modalState, closeEditor } = useEditModal();
  return (
    <>
      {children}
      <DynamicEditModal 
        isOpen={isOpen} 
        onClose={closeEditor} 
        data={modalState.data || {}}
        entityType={modalState.entityType || ''}
        entityId={modalState.entityId || ''}
        title={modalState.title}
      />
    </>
  );
};

export default App;
