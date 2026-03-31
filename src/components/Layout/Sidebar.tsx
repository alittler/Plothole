import React from 'react';
import { ViewType, User } from '../../types';
import { LayoutGrid, Book, Users, Map, Calendar, Settings, Shield, PenTool, Search, HelpCircle, ChevronLeft, ChevronRight, Sparkles, Zap, X, Database, LogOut, FileText, Hash, GitBranch, Wrench } from 'lucide-react';
import { UserButton, useClerk } from '@clerk/clerk-react';

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
  appName?: string;
  sidebarOrder?: ViewType[];
  onOpenLicenses?: () => void;
  hideDesktopActions?: boolean;
  isFullscreen?: boolean;
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
  currentView, onChangeView, isOpen, isCollapsed, onToggleCollapse, onClose, hasActiveProject, onToggleAi, isAiOpen, currentUser, isProcessing, processingStatus, activeProjectTitle, onQuickNote, appName = 'PLOTHOLE',
  sidebarOrder, onOpenLicenses, hideDesktopActions = false, isFullscreen = false
}) => {
  const { signOut } = useClerk();

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
    { id: ViewType.RESEARCH, label: 'Research', icon: Search, projectOnly: true },
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
        items: allNavItems.filter(i => [ViewType.NOTEPAD, ViewType.RESEARCH, ViewType.BOOKSHELF].includes(i.id))
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

      <aside className={`
        fixed inset-x-0 top-0 z-[1001] lg:relative lg:inset-y-0 lg:left-0 shrink-0
        bg-slate-950 text-slate-400 flex flex-col transition-all duration-500 ease-in-out border-b lg:border-b-0 lg:border-r border-slate-800/50
        ${isOpen ? 'translate-y-0 pointer-events-auto max-h-[80vh]' : '-translate-y-full lg:translate-y-0 pointer-events-none lg:pointer-events-auto lg:max-h-none'}
        ${isFullscreen ? 'lg:w-0 lg:opacity-0 lg:overflow-hidden lg:border-none' : isCollapsed ? 'lg:w-20' : 'lg:w-64 md:w-72'}
      `}>
        {/* Mobile Safe Area Forehead */}
        <div className="lg:hidden h-[env(safe-area-inset-top)] bg-black w-full shrink-0" />

        <div className="p-6 border-b border-slate-800/50 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            {!isCollapsed && <span className="font-black text-2xl tracking-tighter text-white uppercase">{appName.replace(' — Your Story, Decoded', '')}</span>}
            <div className="flex items-center gap-2">
              <button onClick={onToggleCollapse} className="hidden lg:block p-2 hover:bg-slate-900 rounded-xl transition-colors text-slate-500 hover:text-white">
                {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>
              <div className="lg:hidden">
                <UserButton afterSignOutUrl={window.location.origin} />
              </div>
            </div>
          </div>
          {!isCollapsed && activeProjectTitle && (
            <div className="flex items-center gap-2 px-1 animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">{activeProjectTitle}</span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {sections.map((section, sIdx) => {
            const visibleItems = section.items.filter(item => {
              if (item.adminOnly && currentUser.role !== 'admin') return false;
              if (item.projectOnly && !hasActiveProject) return false;
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
                        onClick={() => {
                          if (!isDisabled) {
                            onChangeView(item.id);
                            if (window.innerWidth < 1024) onClose();
                          }
                        }}
                        disabled={isDisabled}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group 
                          ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : ''}
                          ${!isActive && !isDisabled ? 'hover:bg-slate-900 hover:text-slate-200' : ''}
                          ${isDisabled ? 'opacity-30 cursor-not-allowed grayscale' : ''}
                        `}
                      >
                        <item.icon size={18} className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'} transition-colors`} />
                        {!isCollapsed && <span className="font-bold text-sm">{item.label}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Persistent Footer Items */}
          <div className="space-y-1 pt-4 border-t border-slate-800/50">
            <button
              onClick={() => signOut()}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-500 hover:bg-rose-900/20 hover:text-rose-400 transition-all group ${isCollapsed ? 'justify-center px-0' : ''}`}
              title="Sign Out"
            >
              <LogOut size={18} className="text-slate-500 group-hover:text-rose-400 transition-colors" />
              {!isCollapsed && <span className="font-bold text-sm">Sign Out</span>}
            </button>

            <div className="pt-2 flex flex-col gap-0.5">
              <a
                href="https://github.com/alittler/Plothole"
                target="_blank"
                rel="noreferrer"
                className={`w-full flex items-center gap-3 px-4 py-1.5 rounded-lg text-slate-600 hover:text-slate-400 transition-all group ${isCollapsed ? 'justify-center px-0' : ''}`}
                title="GitHub Repository"
              >
                <GitBranch size={14} className="text-slate-700 group-hover:text-indigo-400 transition-colors" />
                {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">GitHub</span>}
              </a>

              <button
                onClick={onOpenLicenses}
                className={`w-full flex items-center gap-3 px-4 py-1.5 rounded-lg text-slate-600 hover:text-slate-400 transition-all group ${isCollapsed ? 'justify-center px-0' : ''}`}
                title="Open Source Licenses"
              >
                <Shield size={14} className="text-slate-700 group-hover:text-indigo-400 transition-colors" />
                {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">Licenses</span>}
              </button>
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800/50">
          <div className={`flex items-center gap-3 px-4 py-2 ${isCollapsed ? 'justify-center px-0' : ''}`}>
            {!isCollapsed && (
              <div className="flex-1 flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate">{currentUser.name}</span>
                <span className="text-[10px] text-slate-500 truncate uppercase tracking-tighter">{currentUser.role} Account</span>
              </div>
            )}
            <div className={`${isCollapsed ? '' : 'shrink-0'}`}>
              <UserButton afterSignOutUrl={window.location.origin} />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
