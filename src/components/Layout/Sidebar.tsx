import React from 'react';
import { ViewType, User } from '../../types';
import { LayoutGrid, Book, Users, Map, Calendar, Settings, Shield, PenTool, Search, HelpCircle, ChevronLeft, ChevronRight, Sparkles, Zap, X, Database, LogOut, FileText, Hash, GitBranch } from 'lucide-react';
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
  isProcessing: boolean;
  activeProjectTitle?: string;
  onQuickNote?: (text: string) => void;
  appName?: string;
  sidebarOrder?: ViewType[];
}

interface NavItem {
  id: ViewType;
  label: string;
  icon: any;
  always?: boolean;
  projectOnly?: boolean;
  adminOnly?: boolean;
}

interface SidebarSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView, onChangeView, isOpen, isCollapsed, onToggleCollapse, onClose, hasActiveProject, onToggleAi, isAiOpen, currentUser, isProcessing, activeProjectTitle, onQuickNote, appName = 'PLOTHOLE',
  sidebarOrder
}) => {
  const { signOut } = useClerk();
  
  const allNavItems: NavItem[] = [
    { id: ViewType.NOTEPAD, label: 'Notepad', icon: FileText, always: true },
    { id: ViewType.STORY_ARCHITECT, label: 'Story Architect', icon: Zap, always: true },
    { id: ViewType.BOOKSHELF, label: 'Bookshelf', icon: Book, always: true },
    { id: ViewType.DASHBOARD, label: 'Dashboard', icon: LayoutGrid, projectOnly: true },
    { id: ViewType.RESEARCH, label: 'Research', icon: Database, projectOnly: true },
    { id: ViewType.CHARACTERS, label: 'Characters', icon: Users, projectOnly: true },
    { id: ViewType.MAP, label: 'World Hub', icon: Map, projectOnly: true },
    { id: ViewType.TIMELINE, label: 'Plot & Timeline', icon: Calendar, projectOnly: true },
    { id: ViewType.TOOLBOX, label: 'Toolbox', icon: HelpCircle, always: true },
    { id: ViewType.SETTINGS, label: 'Settings', icon: Settings, always: true },
    { id: ViewType.ADMIN, label: 'Admin', icon: Shield, adminOnly: true },
  ];

  const sections: SidebarSection[] = React.useMemo(() => {
    // If we have a custom order, we might want to just show one big section or grouped by original sections
    // For now, let's keep the sections but sort items within them if they are in the order list.
    // Or even better: if custom order is provided, use that order and group them by their original section.
    
    const baseSections: SidebarSection[] = [
      {
        title: 'Workspace',
        items: allNavItems.filter(i => [ViewType.NOTEPAD, ViewType.STORY_ARCHITECT, ViewType.BOOKSHELF, ViewType.DASHBOARD].includes(i.id))
      },
      {
        title: 'Story',
        items: allNavItems.filter(i => [ViewType.RESEARCH, ViewType.CHARACTERS, ViewType.MAP, ViewType.TIMELINE].includes(i.id))
      },
      {
        title: 'System',
        items: allNavItems.filter(i => [ViewType.TOOLBOX, ViewType.SETTINGS, ViewType.ADMIN].includes(i.id))
      }
    ];

    if (!sidebarOrder) return baseSections;

    // Filter out sections that end up empty
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
        fixed inset-y-0 left-0 z-[1001] lg:relative
        bg-slate-950 text-slate-400 flex flex-col transition-all duration-500 ease-in-out border-r border-slate-800/50
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
      `}>
        <div className="p-6 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            {!isCollapsed && <span className="font-black text-2xl tracking-tighter text-white uppercase">{appName.replace(' — Your Story, Decoded', '')}</span>}
            <div className="flex items-center gap-2">
              <button onClick={onToggleCollapse} className="hidden lg:block p-2 hover:bg-slate-900 rounded-xl transition-colors text-slate-500 hover:text-white">
                {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>
              <button onClick={onClose} className="lg:hidden p-2 hover:bg-slate-900 rounded-xl transition-colors text-slate-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
          </div>
          {!isCollapsed && (
            <div className="px-0.5 min-h-[15px]">
              {activeProjectTitle && (
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest truncate block">
                  {activeProjectTitle}
                </span>
              )}
            </div>
          )}
        </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-8 py-4">
        {sections.map((section, sIdx) => {
          const visibleItems = section.items.filter(item => {
            if (item.adminOnly && currentUser.role !== 'admin') return false;
            return true;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={sIdx} className="space-y-2">
              {!isCollapsed && (
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

        <div className="pt-4 space-y-2 border-t border-slate-800/50">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/50 border border-slate-800/50 transition-all ${isCollapsed ? 'justify-center' : ''}`}>
            <UserButton 
              afterSignOutUrl={window.location.origin}
              appearance={{
                elements: {
                  userButtonAvatarBox: "w-8 h-8 rounded-lg",
                  userButtonTrigger: "focus:shadow-none focus:outline-none",
                }
              }}
            />
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold text-white truncate">{currentUser.name}</span>
                <span className="text-[10px] text-slate-500 truncate uppercase tracking-widest font-black">{currentUser.role}</span>
              </div>
            )}
          </div>

          <button
            onClick={onToggleAi}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${isAiOpen ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-900 hover:bg-slate-800 text-slate-300'}`}
          >
            <Sparkles size={18} className={isProcessing ? 'animate-spin' : ''} />
            {!isCollapsed && <span className="font-black text-xs uppercase tracking-widest">AI Architect</span>}
          </button>
          {currentUser.role === 'admin' && onQuickNote && (
            <button
              onClick={() => {
                const note = window.prompt("Admin Note (Edits to make):");
                if (note && note.trim()) {
                  onQuickNote(note.trim());
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all bg-amber-900/20 hover:bg-amber-900/40 text-amber-500"
            >
              <PenTool size={18} />
              {!isCollapsed && <span className="font-black text-xs uppercase tracking-widest">Admin Note</span>}
            </button>
          )}
          <button
            onClick={() => signOut({ redirectUrl: window.location.origin })}
            className="w-full flex lg:hidden items-center gap-3 px-4 py-3 rounded-2xl transition-all bg-red-900/20 hover:bg-red-900/40 text-red-500"
          >
            <LogOut size={18} />
            {!isCollapsed && <span className="font-black text-xs uppercase tracking-widest">Sign Out</span>}
          </button>

          {/* Commit Label */}
          <a 
            href={`https://github.com/alittler/Plothole/commit/${import.meta.env.VITE_GIT_COMMIT_HASH}`}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-2 px-4 py-2 mt-4 transition-all opacity-40 hover:opacity-100 hover:text-white ${isCollapsed ? 'justify-center' : ''}`}
          >
            <GitBranch size={12} className="shrink-0" />
            {!isCollapsed && (
              <span className="text-[9px] font-mono tracking-tighter uppercase font-bold">Build: {import.meta.env.VITE_GIT_COMMIT_HASH}</span>
            )}
            {isCollapsed && (
              <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none border border-white/10 shadow-2xl">
                Build: {import.meta.env.VITE_GIT_COMMIT_HASH}
              </div>
            )}
          </a>
        </div>
      </nav>
    </aside>

    </>
  );
};
