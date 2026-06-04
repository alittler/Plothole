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
import { useAuth0 } from '@auth0/auth0-react';
import { useRouter, usePathname } from 'next/navigation';

import { 
  ViewType, 
  Note, 
  ProjectData, 
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
  saveProjectData,
  exportVaultAsZip,
  saveGlobalNote,
  saveAllGlobalNotes,
  deleteGlobalNote,
  generateId
} from './services/storageService';

import { useProjectData, populateDataCatalog } from './hooks/useProjectData';
import { useAppInitialization } from './hooks/useAppInitialization';
import { EditModalProvider, useEditModal } from './contexts/EditModalContext';

// Components
import { Sidebar } from './components/Layout/Sidebar';
import { BottomNav } from './components/Layout/BottomNav';
import { OracleFloatingButton } from './components/ui/OracleFloatingButton';
import { ActiveArchitect } from './components/ui/ActiveArchitect';
import { Modal } from './components/ui/Modal';
import { SignInPage } from './components/Auth/SignInPage';
import { LicenseModal } from './components/Modals/LicenseModal';
import { UploadProminentModal } from './components/ui/UploadProminentModal';

// Dynamic View Imports
const BookshelfView = dynamic(() => import('./components/Views/BookshelfView').then(mod => mod.BookshelfView), { ssr: false });
const ResearchHubView = dynamic(() => import('./components/Views/ResearchHubView').then(mod => mod.ResearchHubView), { ssr: false });
const PlotHubView = dynamic(() => import('./components/Views/PlotHubView').then(mod => mod.PlotHubView), { ssr: false });
const WorldSystemView = dynamic(() => import('./components/Views/WorldSystemView').then(mod => mod.WorldSystemView), { ssr: false });
const CodexHubView = dynamic(() => import('./components/Views/CodexHubView').then(mod => mod.CodexHubView), { ssr: false });
const NarrativeArchitectView = dynamic(() => import('./components/Views/NarrativeArchitectView').then(mod => mod.NarrativeArchitectView), { ssr: false });
const OutlineView = dynamic(() => import('./components/Views/OutlineView').then(mod => mod.OutlineView), { ssr: false });
const ToolboxView = dynamic(() => import('./components/Views/ToolboxView').then(mod => mod.ToolboxView), { ssr: false });
const AdminView = dynamic(() => import('./components/Views/AdminView').then(mod => mod.AdminView), { ssr: false });
const SettingsView = dynamic(() => import('./components/Views/SettingsView').then(mod => mod.SettingsView), { ssr: false });

const DynamicEditModal = dynamic(() => import('./components/ui/DynamicEditModal').then(mod => mod.DynamicEditModal), { ssr: false });

const App: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user: auth0User, isAuthenticated, isLoading: isAuthLoading, getAccessTokenSilently } = useAuth0();
  const hasAutoLoaded = useRef(false);

  const [activeTasks, setActiveTasks] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.BOOKSHELF);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAdminNoteOpen, setIsAdminNoteOpen] = useState(false);
  const [isLicensesOpen, setIsLicensesOpen] = useState(false);
  const [adminNoteDraft, setAdminNoteDraft] = useState('');
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string | undefined>(undefined);

  // Clean up Auth0 callback parameters from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('code') && searchParams.has('state')) {
      // Auth0 has returned with authorization code, clean it up
      window.history.replaceState({}, document.title, '/');
    }
  }, []);

  const addTask = useCallback((id: string) => setActiveTasks(prev => [...prev, id]), []);
  const removeTask = useCallback((id: string) => setActiveTasks(prev => prev.filter(t => t !== id)), []);

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    try {
      let token: string | undefined;
      try {
        token = await getAccessTokenSilently({
          authorizationParams: {
            audience: 'https://dev-t0pa1ah6r1n2wc4a.us.auth0.com/api/v2/',
            scope: 'openid profile email offline_access'
          }
        });
      } catch (tokenErr) {
        console.warn(`[Auth] Could not get access token silently`, tokenErr);
      }

      const headers = { ...options.headers } as Record<string, string>;
      if (token) headers['Authorization'] = `Bearer ${token}`;

      return await fetch(url, { ...options, headers });
    } catch (err) {
      console.error(`[Auth] Error in fetchWithAuth for ${url}:`, err);
      throw err;
    }
  }, [getAccessTokenSilently]);

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
  } = useAppInitialization(auth0User, isAuthLoading, getAccessTokenSilently);

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
    isAuthenticated, 
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
      setCurrentView(ViewType.ADMIN);
    } else if (type === 'character') {
      setCurrentView(ViewType.CHARACTERS);
    } else if (type === 'location') {
      setCurrentMapParentId(id);
      setCurrentView(ViewType.MAP);
    } else if (type === 'bestiary') {
      setCurrentView(ViewType.CODEX_HUB);
    } else if (type === 'dashboard') {
      setCurrentView(ViewType.NOTEPAD);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && projectsMetadata.length > 0 && !projectData && !hasAutoLoaded.current) {
      const sortedMeta = [...projectsMetadata].sort((a, b) => b.lastModified - a.lastModified);
      const firstId = sortedMeta[0].id;
      loadProject(firstId).then(project => {
        if (project && (!pathname || pathname === '/')) {
          setCurrentView(ViewType.NOTEPAD);
        }
      });
      hasAutoLoaded.current = true;
    }
  }, [isLoaded, projectsMetadata, projectData, loadProject, pathname, router]);

  const viewContent = React.useMemo(() => {
    if (!isLoaded) return null;

    switch (currentView) {
      case ViewType.BOOKSHELF:
        return <BookshelfView
          projects={projectsMetadata}
          activeProjectId={projectData?.id || ''}
          currentUser={currentUser}
          onRefreshMetadata={refreshMetadata}
          fetchWithAuth={fetchWithAuth}
          onSelectProject={async (id) => {
            await loadProject(id);
            setCurrentView(ViewType.NOTEPAD);
          }}
          onDeselectProject={() => setProjectData(null)}
          onCreateProject={async (title, author, useSample, shortName) => { 
            const newProj = await handleCreateProject(title, author, useSample, shortName); 
            if (newProj) {
              await loadProject(newProj.id);
              setCurrentView(ViewType.NOTEPAD);
            }
          }}
          onUploadProject={handleUploadProject}
          onDeleteProject={handleDeleteProject}
          onEditProject={handleEditProject}
          isAnalyzing={isAnalyzing}
        />;

      case ViewType.NOTEPAD:
      case ViewType.RESEARCH:
        {
          const isNotepadView = currentView === ViewType.NOTEPAD || !projectData;
          return <ResearchHubView
            currentView={currentView}
            onChangeView={setCurrentView}
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
            onSelectProject={async (id) => { await loadProject(id); setCurrentView(ViewType.NOTEPAD); }}
            isAnalyzing={isAnalyzing}
          />;
        }

      case ViewType.PLOT_HUB:
      case ViewType.TIMELINE:
        return projectData ? <PlotHubView 
          currentView={currentView} 
          onChangeView={setCurrentView} 
          data={projectData} 
          onLinkClick={handleLinkClick} 
          onAddTimelineEvent={(e) => updateProjectData({ timeline: [...projectData.timeline, e] })} 
          onUpdateTimelineEvent={(e) => updateProjectData({ timeline: projectData.timeline.map(ev => ev.id === e.id ? e : ev) })} 
          onAnalyzePlot={() => {}} 
          onExtractSoftAnchors={handleExtractSoftAnchors} 
          onScanContinuity={handleScanContinuity} 
          onUpdateProject={updateProjectData} 
          isAnalyzing={isAnalyzing} 
        /> : null;

      case ViewType.WORLD_HUB:
      case ViewType.MAP:
        if (!projectData) return null;
        return <WorldSystemView
          currentView={currentView}
          onChangeView={setCurrentView}
          data={projectData} 
          onUpdateLocation={(l) => updateProjectData({ locations: projectData.locations.map(loc => loc.id === l.id ? l : loc) })}
          onUpdateCharacter={(c) => updateProjectData({ characters: projectData.characters.map(char => char.id === c.id ? c : char) })}
          onAddLocation={(l) => updateProjectData({ locations: [...projectData.locations, l] })}
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
            const loc = projectData.locations.find(l => l.id === id);
            if (loc && loc.prevX !== undefined) updateProjectData({ locations: projectData.locations.map(l => l.id === id ? { ...l, x: loc.prevX, y: loc.prevY, prevX: undefined, prevY: undefined } : l) });
          }}
          onLocationReset={(id) => {
            const loc = projectData.locations.find(l => l.id === id);
            if (loc && loc.matchedX !== undefined) updateProjectData({ locations: projectData.locations.map(l => l.id === id ? { ...l, x: loc.matchedX, y: loc.matchedY } : l) });
          }}
          currentUser={currentUser}
          projectsMetadata={projectsMetadata}
        />;

      case ViewType.CHARACTERS:
      case ViewType.CODEX_HUB:
        return projectData ? <CodexHubView projectData={projectData} onLinkClick={handleLinkClick} onUpdateProject={updateProjectData} /> : null;

      case ViewType.NARRATIVE_ARCHITECT:
        return projectData ? <NarrativeArchitectView projectData={projectData} globalNotes={globalNotes} onUpdateProject={updateProjectData} /> : null;

      case ViewType.OUTLINE:
        return projectData ? <OutlineView projectData={projectData} globalNotes={globalNotes} onUpdateProject={updateProjectData} /> : null;

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
          onChangeView={setCurrentView}
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
          onChangeView={setCurrentView}
          onLinkClick={handleLinkClick}
          fetchWithAuth={fetchWithAuth}
          appSettings={appSettings}
        />;

      default:
        return <div className="h-full flex items-center justify-center text-slate-400">View not found.</div>;
    }
  }, [isLoaded, currentView, projectData, projectsMetadata, globalNotes, isAnalyzing, currentUser, appSettings, appPrompts, activeTasks, currentMapParentId, loadProject, refreshMetadata, updateProjectData, handleCreateProject, handleUploadProject, handleRestoreCommit, handleAuditThreads, handleScanContinuity, handleExtractSoftAnchors, handleDoubleProcessNote, handleDeleteNote, handleAddIdeaToProject, handleToggleCanon, handleQuickUpdate, handleLinkClick, handleManualSave, handleDeleteProject, handleEditProject, fetchWithAuth, router]);

  const handleViewChange = useCallback((v: ViewType) => {
    setCurrentView(v);
    setIsMobileSidebarOpen(false);
  }, []);

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
                className="h-full bg-indigo-500 transition-all duration-300 ease-out" 
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{loadingProgress}% Complete</p>
            
            {loadingProgress === 100 && (
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-tighter transition-all"
              >
                <RefreshCw size={14} />
                Reload Application
              </button>
            )}
          </div>
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
          isGuest={!isAuthenticated}
          appName={appSettings.appName}
          isFullscreen={isMapFullscreen}
        />

        <main className="flex-1 h-full relative overflow-hidden flex flex-col">
          <div className="lg:hidden z-[2000] fixed top-0 left-0 right-0 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4">
            <button onClick={() => setIsMobileSidebarOpen(true)} className="p-2 text-slate-600 dark:text-slate-400"><Menu size={20} /></button>
            <span className="font-black text-sm uppercase tracking-tighter dark:text-white">{appSettings.appName}</span>
            <button onClick={() => handleViewChange(ViewType.ADMIN)} className="p-2 text-slate-600 dark:text-slate-400"><Search size={20} /></button>
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
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-[1500] flex flex-col">
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

  const [isGuest, setIsGuest] = useState(false);

  return (
    <EditModalProvider>
      <AppWithEditor
        isAuthenticated={isAuthenticated}
        isAuthLoading={isAuthLoading}
        isGuest={isGuest}
        setIsGuest={setIsGuest}
        renderAppContent={renderAppContent}
      />
    </EditModalProvider>
  );
};

interface AppWithEditorProps {
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isGuest: boolean;
  setIsGuest: (value: boolean) => void;
  renderAppContent: () => React.ReactNode;
}

const AppWithEditor: React.FC<AppWithEditorProps> = ({
  isAuthenticated,
  isAuthLoading,
  isGuest,
  setIsGuest,
  renderAppContent,
}) => {
  const { modalState, closeEditor } = useEditModal();

  return (
    <>
      {(!isAuthenticated && !isGuest && !isAuthLoading) ? (
        <SignInPage onGuestAccess={() => setIsGuest(true)} />
      ) : (
        renderAppContent()
      )}
      
      <DynamicEditModal
        isOpen={modalState.isOpen}
        data={modalState.data}
        entityType={modalState.entityType}
        entityId={modalState.entityId}
        title={modalState.title}
        onClose={closeEditor}
      />
    </>
  );
};

export default App;
