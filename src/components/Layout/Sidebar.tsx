import React from 'react';
import { ViewType, User } from '../../types';
import { LayoutGrid, Book, Users, Map, Calendar, Settings, Shield, PenTool, Search, HelpCircle, ChevronLeft, ChevronRight, Sparkles, Zap, X, Database, LogOut, FileText, Hash, Wrench } from 'lucide-react';
import { UserButton, useClerk } from '@clerk/clerk-react';
import { isCloudStorageActive } from '../../services/storageService';

interface SidebarProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  isOpen: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClose: () => void;
  hasActiveProject: boolean;
  onToggleAi: () => void;
  isAiOpen: boolean;
  currentUser: User;
  isProcessing?: boolean;
  processingStatus?: string | null;
  activeProjectTitle?: string;
  onQuickNote?: () => void;
  onSave?: () => Promise<void>;
  appName?: string;
  sidebarOrder?: ViewType[];
  onOpenLicenses?: () => void;
  hideDesktopActions?: boolean;
  isFullscreen?: boolean;
  isServerConnected?: boolean;
  isCloudStorage?: boolean;
  lastModified?: number;
}

interface NavItem {
  id: ViewType;
  label: string;
  icon: any;
  projectOnly?: boolean;
  adminOnly?: boolean;
  always?: boolean;
}

interface SidebarSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView, onChangeView, isOpen, isCollapsed, onToggleCollapse, onClose, hasActiveProject, onToggleAi, isAiOpen, currentUser, isProcessing, processingStatus, activeProjectTitle, onQuickNote, onSave, appName = 'PLOTHOLE',
  sidebarOrder, onOpenLicenses, hideDesktopActions = false, isFullscreen = false, isServerConnected = true, isCloudStorage = false, lastModified
}) => {
  const { signOut } = useClerk();
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [commitHash, setCommitHash] = React.useState<string | null>(null);
  const [sourceHash, setSourceHash] = React.useState<string | null>(null);

  const handleSync = async () => {
    if (!onSave || isSyncing) return;
    setIsSyncing(true);
    try {
      await onSave();
    } finally {
      setTimeout(() => setIsSyncing(false), 1000);
    }
  };

  // Fetch version info on mount
  React.useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await fetch(`/api/version?t=${Date.now()}`);
        const data = await response.json();
        setCommitHash(data.commit);
        setSourceHash(data.sourceHash);
      } catch (err) {
        console.error('Failed to fetch version info:', err);
      }
    };
    fetchVersion();
  }, []);

  // Close mobile sidebar on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  const allNavItems: NavItem[] = [
    { id: ViewType.NOTEPAD, label: 'Notepad', icon: FileText, always: true },
    { id: ViewType.BOOKSHELF, label: 'Bookshelf', icon: Book, always: true },
    { id: ViewType.CHARACTERS, label: 'Characters', icon: Users, projectOnly: true },
    { id: ViewType.MAP, label: 'Atlas', icon: Map, projectOnly: true },
    { id: ViewType.TIMELINE, label: 'History', icon: Calendar, projectOnly: true },
    { id: ViewType.CODEX, label: 'Codex', icon: Book, projectOnly: true },
    { id: ViewType.TOOLBOX, label: 'Toolbox', icon: Wrench, always: true },
    { id: ViewType.SETTINGS, label: 'Settings', icon: Settings, always: true },
    { id: ViewType.ADMIN, label: 'Admin', icon: Shield, adminOnly: true },
    ];

  const sections: SidebarSection[] = React.useMemo(() => {
    const baseSections: SidebarSection[] = [
      {
        title: 'Workspace',
        items: allNavItems.filter(i => [ViewType.NOTEPAD, ViewType.BOOKSHELF].includes(i.id))
      },
      {
        title: 'Story',
        items: allNavItems.filter(i => [ViewType.CHARACTERS, ViewType.MAP, ViewType.TIMELINE, ViewType.CODEX].includes(i.id))
      },
      {
        title: 'System',
        items: allNavItems.filter(i => [ViewType.TOOLBOX, ViewType.SETTINGS, ViewType.ADMIN].includes(i.id))
      }
    ];

    if (!sidebarOrder) return baseSections;

    return baseSections.map(section => ({
      ...section,
      items: [...section.items].sort((a, b) => {
        const idxA = sidebarOrder.indexOf(a.id);
        const idxB = sidebarOrder.indexOf(b.id);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      })
    })).filter(s => s.items.length > 0);
  }, [sidebarOrder]);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[1000] lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <aside 
        onClick={(e) => {
          // If the user clicks the empty space at the bottom of the sidebar, close it
          if (e.target === e.currentTarget && window.innerWidth < 1024) {
            onClose();
          }
        }}
        className={`
        fixed inset-x-0 top-0 z-[1001] lg:relative lg:inset-y-0 lg:left-0 shrink-0
        bg-slate-950 text-slate-400 flex flex-col transition-all duration-500 ease-in-out border-b lg:border-b-0 lg:border-r border-slate-800/50
        rounded-b-3xl lg:rounded-b-none
        ${isOpen ? 'translate-y-0 pointer-events-auto max-h-[calc(100vh-12rem)]' : '-translate-y-full lg:translate-y-0 pointer-events-none lg:pointer-events-auto lg:max-h-none'}
        ${isFullscreen ? 'lg:w-0 lg:opacity-0 lg:overflow-hidden lg:border-none' : isCollapsed ? 'lg:w-20' : 'lg:w-64 md:w-72'}
      `}>
        {/* Mobile Safe Area Forehead */}
        <div className="lg:hidden h-[env(safe-area-inset-top)] bg-slate-950 w-full shrink-0" />

        <div className="p-6 border-b border-slate-800/50 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            {!isCollapsed && <span className="font-black text-2xl tracking-tighter text-white uppercase">{appName.replace(' — Your Story, Decoded', '')}</span>}
            <div className="flex items-center gap-2">
              <button 
                onClick={onToggleCollapse} 
                className="hidden lg:block p-2 hover:bg-slate-900 rounded-xl transition-colors text-slate-500 hover:text-white"
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>
            </div>
          </div>
          {!isCollapsed && activeProjectTitle && (
            <div className="flex items-center gap-2 px-1 animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">{activeProjectTitle}</span>
            </div>
          )}
          {!isCollapsed && !isCloudStorage && (
            <div className="mt-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-500 shadow-lg shadow-amber-500/5">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${!isServerConnected ? 'bg-rose-500' : 'bg-amber-500'}`} />
                <span className={`text-[10px] font-black uppercase tracking-tight ${!isServerConnected ? 'text-rose-500' : 'text-amber-500'}`}>
                  {!isServerConnected ? 'Stuck on Localhost' : 'Local Mode'}
                </span>
              </div>
              <p className="text-[8px] text-slate-500 font-medium leading-tight">
                {!isServerConnected 
                  ? 'Server unreachable. Data is NOT syncing.' 
                  : 'Sign in to enable cloud sync.'}
              </p>
            </div>
          )}

        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {sections.map((section, sIdx) => {
            const visibleItems = section.items.filter(item => {
              if (item.adminOnly && currentUser.role !== 'admin') return false;
              // Don't filter out projectOnly items - show them disabled instead
              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={sIdx} className="space-y-2">
                {!isCollapsed && section.title !== 'Workspace' && (
                  <h3 className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4">
                    {section.title}
                  </h3>
                )}
                <div className="space-y-1">
                  {visibleItems.map(item => {
                    const isActive = currentView === item.id;
                    const isDisabled = item.projectOnly && !hasActiveProject;
                    
                    return (
                      <button
                        key={item.id}
                        title={isCollapsed ? item.label : undefined}
                        onClick={() => {
                          if (!isDisabled) {
                            if (currentView === item.id) {
                              // If clicking the active view, toggle sidebar collapse on desktop or close on mobile
                              if (window.innerWidth >= 1024) {
                                onToggleCollapse();
                              } else {
                                onClose();
                              }
                            } else {
                              // Switch to the clicked view
                              onChangeView(item.id);
                              if (window.innerWidth < 1024) onClose();
                            }
                          }
                        }}
                        disabled={isDisabled}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group 
                          ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : ''}
                          ${!isActive && !isDisabled ? 'hover:bg-slate-900 hover:text-slate-200' : ''}
                          ${isDisabled ? 'opacity-40 cursor-not-allowed grayscale' : ''}
                          ${isCollapsed ? 'justify-center px-0' : ''}
                        `}
                      >
                        <item.icon size={18} className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-amber-500'} transition-colors`} />
                        {!isCollapsed && <span className="font-bold text-sm">{item.label}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Persistent Footer Items */}
          <div 
            onClick={() => window.innerWidth < 1024 && onClose()}
            className="space-y-1 pt-4 border-t border-slate-800/50"
          >
            <button
              onClick={(e) => { e.stopPropagation(); signOut(); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-500 hover:bg-rose-900/20 hover:text-rose-400 transition-all group ${isCollapsed ? 'justify-center px-0' : ''}`}
              title="Sign Out"
            >
              <LogOut size={18} className="text-slate-500 group-hover:text-rose-400 transition-colors" />
              {!isCollapsed && <span className="font-bold text-sm">Sign Out</span>}
            </button>

            <div className="pt-2 flex flex-col gap-0.5">
              <button
                onClick={(e) => { e.stopPropagation(); onOpenLicenses(); }}
                className={`w-full flex items-center gap-3 px-4 py-1.5 rounded-lg text-slate-600 hover:text-slate-400 transition-all group ${isCollapsed ? 'justify-center px-0' : ''}`}
                title="Open Source Licenses"
              >
                <Shield size={14} className="text-slate-700 group-hover:text-amber-500 transition-colors" />
                {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">Licenses</span>}
              </button>

              {!isCollapsed && (
                <div className="text-[10px] text-slate-600 dark:text-slate-500 mt-2 px-4 font-mono flex items-center whitespace-nowrap flex-wrap gap-1">
                  {sourceHash && (
                    <>
                      <span className="text-emerald-400" title="Source/App Last Modified Hash">
                        {sourceHash}
                      </span>
                      <span className="text-slate-700">|</span>
                    </>
                  )}
                  {commitHash && (
                    <a 
                      href={`https://github.com/alittler/Plothole/commit/${commitHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 transition-colors"
                      title="App Build Commit"
                    >
                      {commitHash}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </nav>

        <div 
          onClick={() => window.innerWidth < 1024 && onClose()}
          className="p-4 border-t border-slate-800/50"
        >
          <div className={`flex items-center gap-3 px-4 py-2 ${isCollapsed ? 'justify-center px-0' : ''}`}>
            {!isCollapsed && (
              <div 
                className="flex-1 flex flex-col min-w-0"
              >
                <span className="text-xs font-bold text-white truncate">{currentUser.name}</span>
                <span className="text-[10px] text-slate-500 truncate uppercase tracking-tighter">{currentUser.role} Account</span>
              </div>
            )}
            <div 
              className={`${isCollapsed ? '' : 'shrink-0'} flex items-center gap-2`}
              onClick={(e) => e.stopPropagation()}
            >
              {!isCollapsed && currentUser.role === 'admin' && (
                <button 
                  onClick={() => {
                    // Logic to toggle admin note will be passed from App
                    const event = new CustomEvent('toggleAdminNote');
                    window.dispatchEvent(event);
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg hover:bg-amber-200 transition-colors"
                  title="Admin Notes"
                >
                  <PenTool size={18} />
                </button>
              )}
              <button
                onClick={() => {
                  onToggleAi();
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`lg:hidden p-2 rounded-lg transition-colors ${isAiOpen ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`}
                title="Summon The Oracle"
              >
                <Sparkles size={18} className={isAiOpen ? 'animate-spin' : ''} />
              </button>
              <UserButton afterSignOutUrl={window.location.origin} />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
