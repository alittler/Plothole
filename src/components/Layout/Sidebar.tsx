import React from 'react';
import Image from 'next/image';
import { ViewType, User } from '../../types';
import { LayoutGrid, Layout, Book, Users, Map, Clock, Settings, Shield, PenTool, Search, HelpCircle, ChevronLeft, ChevronRight, Sparkles, Zap, X, Database, LogOut, FileText, Hash, Wrench, BookOpen, Lightbulb, Stars, Wand2, Box, BookMarked, GitMerge, Loader2 } from 'lucide-react';
import { useAuth0 } from '@auth0/auth0-react';
import { isCloudStorageActive } from '../../services/storageService';
import { safeResponseJson } from '../../utils/jsonUtils';

interface SidebarProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  isOpen: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClose: () => void;
  hasActiveProject: boolean;
  onToggleAi?: () => void;
  isAiOpen?: boolean;
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
  isAnalyzing?: boolean;
  isServerConnected?: boolean;
  isCloudStorage?: boolean;
  lastModified?: number;
  isGuest?: boolean;
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
  sidebarOrder, onOpenLicenses, hideDesktopActions = false, isFullscreen = false, isAnalyzing = false, isServerConnected = true, isCloudStorage = false, lastModified, isGuest = false
}) => {
  const { logout } = useAuth0();
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [commitHash, setCommitHash] = React.useState<string | null>(null);
  const [sourceHash, setSourceHash] = React.useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

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
        const data = await safeResponseJson(response);
        if (data) {
          setCommitHash(data.commit);
          setSourceHash(data.sourceHash);
        }
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

  // Close mobile sidebar when resizing from mobile to desktop
  React.useEffect(() => {
    const handleResize = () => {
      if (isOpen && window.innerWidth >= 1024) {
        onClose();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, onClose]);

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  const allNavItems: NavItem[] = [
    { id: ViewType.RESEARCH, label: 'Notebook', icon: Zap, always: true },
    { id: ViewType.OUTLINE, label: 'Outline', icon: Layout, projectOnly: true },
    { id: ViewType.NARRATIVE_ARCHITECT, label: 'Architect', icon: GitMerge, projectOnly: true },
    { id: ViewType.CODEX_HUB, label: 'Characters & Lore', icon: Users, projectOnly: true },
    { id: ViewType.WORLD_HUB, label: 'Atlas & Map', icon: Map, projectOnly: true },
    { id: ViewType.PLOT_HUB, label: 'Timeline & Plot', icon: Clock, projectOnly: true },
    { id: ViewType.BOOKSHELF, label: 'Library', icon: Book, always: true },
    { id: ViewType.TOOLBOX, label: 'Toolbox', icon: Wrench, always: true },
    { id: ViewType.SETTINGS, label: 'Settings', icon: Settings, always: true },
    { id: ViewType.ADMIN, label: 'Admin', icon: Shield, adminOnly: true },
  ];

  const sections: SidebarSection[] = React.useMemo(() => {
    const baseSections: SidebarSection[] = [
      {
        title: 'Notebook & Story',
        items: allNavItems.filter(i => [ViewType.RESEARCH, ViewType.OUTLINE, ViewType.NARRATIVE_ARCHITECT].includes(i.id))
      },
      {
        title: 'Codex & Lore',
        items: allNavItems.filter(i => [ViewType.CODEX_HUB].includes(i.id))
      },
      {
        title: 'Atlas & Timeline',
        items: allNavItems.filter(i => [ViewType.WORLD_HUB, ViewType.PLOT_HUB].includes(i.id))
      },
      {
        title: 'System',
        items: allNavItems.filter(i => [ViewType.BOOKSHELF, ViewType.TOOLBOX, ViewType.SETTINGS, ViewType.ADMIN].includes(i.id))
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

  const handleNavItemClick = (item: NavItem) => {
    const isDisabled = item.projectOnly && !hasActiveProject;
    if (!isDisabled) {
      // Switch to the clicked view
      onChangeView(item.id);
      setIsMenuOpen(false);
    }
  };

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
        data-section="sidebar"
        onClick={(e) => {
          // If the user clicks the empty space at the bottom of the sidebar, close it
          if (e.target === e.currentTarget && window.innerWidth < 1024) {
            onClose();
          }
        }}
        className={`
        fixed inset-x-0 top-0 z-[1001] lg:relative lg:inset-y-0 lg:left-0 shrink-0
        ${isGuest ? 'bg-slate-800 border-slate-700' : 'bg-slate-950 border-slate-800/50'} text-slate-400 flex flex-col transition-all duration-500 ease-in-out border-b lg:border-b-0 lg:border-r
        rounded-b-3xl lg:rounded-b-none
        ${isOpen ? 'translate-y-0 pointer-events-auto max-h-[calc(100vh-12rem)]' : '-translate-y-full lg:translate-y-0 pointer-events-none lg:pointer-events-auto lg:max-h-none'}
        ${isFullscreen ? 'lg:w-0 lg:opacity-0 lg:overflow-hidden lg:border-none' : isCollapsed ? 'lg:w-20' : 'lg:w-64 md:w-72'}
      `}>
        {/* Mobile Safe Area Forehead */}
        <div className={`lg:hidden h-[env(safe-area-inset-top)] ${isGuest ? 'bg-slate-800' : 'bg-slate-950'} w-full shrink-0`} />

        <div className="p-6 border-b border-slate-800/50 flex flex-col gap-0.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isCollapsed && <Image src="/logos/plothole_256x256.png" alt="Plothole" width={32} height={32} className="w-8 h-8 rounded-lg" />}
              {!isCollapsed && <span className="font-black text-2xl tracking-tighter text-white uppercase">{appName.replace(' — Your Story, Decoded', '')}</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleCollapse}
                className="hidden lg:block p-2 hover:bg-slate-900 rounded-xl transition-colors text-slate-500 hover:text-white"
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>
              {isCollapsed && (
                <div className="relative hidden lg:block" ref={menuRef}>
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 hover:bg-slate-900 rounded-xl transition-colors text-slate-500 hover:text-white"
                    title="Show Pages"
                  >
                    <Layout size={20} />
                  </button>
                  {isMenuOpen && (
                    <div data-section="page-menu" className="absolute left-full top-0 ml-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 flex flex-col gap-1 p-2 custom-scrollbar">
                      {sections.map((section) => (
                        <div key={section.title} className="flex flex-col gap-1">
                          {section.items.map(item => {
                            const isActive = currentView === item.id;
                            const isDisabled = item.projectOnly && !hasActiveProject;
                            return (
                              <button
                                key={item.id}
                                title={item.label}
                                onClick={() => handleNavItemClick(item)}
                                disabled={isDisabled}
                                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all group ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : ''
                                  } ${!isActive && !isDisabled ? 'hover:bg-slate-800 hover:text-slate-200' : ''
                                  } ${isDisabled ? 'opacity-40 cursor-not-allowed grayscale' : ''
                                  }`}
                              >
                                <item.icon size={18} className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-amber-500'} transition-colors shrink-0`} />
                                <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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

        <nav data-section="sidebar-nav" className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {!isCollapsed && isAnalyzing && (
            <div className="px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-500 shadow-lg shadow-indigo-500/5">
              <div className="flex items-center gap-2">
                <Loader2 className="w-3 h-3 text-indigo-500 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-tight text-indigo-500">
                  AI Analyzing
                </span>
              </div>
            </div>
          )}
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col gap-2">
              {!isCollapsed && <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3">{section.title}</h3>}
              {section.items.map(item => {
                const isDisabled = item.projectOnly && !hasActiveProject;
                if (item.adminOnly && currentUser.role !== 'admin') return null;

                const isActive = currentView === item.id;

                return (
                  <button
                    key={item.id}
                    title={item.label}
                    onClick={() => handleNavItemClick(item)}
                    disabled={isDisabled}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all group 
                      ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : ''}
                      ${!isActive && !isDisabled ? 'hover:bg-slate-900 hover:text-slate-200' : ''}
                      ${isDisabled ? 'opacity-40 cursor-not-allowed grayscale' : ''}
                      ${isCollapsed ? 'justify-center px-0' : ''}
                    `}
                  >
                    <item.icon size={18} className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-amber-500'} transition-colors shrink-0`} />
                    {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>}
                  </button>
                );
              }).filter(Boolean)}
            </div>
          ))}

          {/* Persistent Footer Items */}
          <div className="flex flex-col gap-2 pt-4 border-t border-slate-800">
            <button
              onClick={(e) => { e.stopPropagation(); logout({ logoutParams: { returnTo: window.location.origin } }); }}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-slate-500 hover:bg-rose-900/20 hover:text-rose-400 transition-all group ${isCollapsed ? 'justify-center px-0' : ''}`}
              title="Sign Out"
            >
              <LogOut size={18} className="text-slate-500 group-hover:text-rose-400 transition-colors shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap">Sign Out</span>}
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); onOpenLicenses(); }}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-slate-600 hover:text-slate-400 transition-all group ${isCollapsed ? 'justify-center px-0' : ''}`}
              title="Open Source Licenses"
            >
              <Shield size={18} className="text-slate-700 group-hover:text-amber-500 transition-colors shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap">Licenses</span>}
            </button>
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
              {onToggleAi && (
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
              )}
            </div>
          </div>
          {commitHash && !isCollapsed && (
            <div className="mt-2 px-4 flex items-center gap-2 opacity-30 hover:opacity-100 transition-opacity">
              <Hash size={10} className="text-slate-500" />
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter">
                {commitHash.substring(0, 7)}
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
