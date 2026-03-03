import React from 'react';
import { ViewType, User } from '../../types';
import { LayoutGrid, Book, Users, Map, Calendar, Settings, Shield, PenTool, Search, HelpCircle, ChevronLeft, ChevronRight, Sparkles, Zap, X, Database } from 'lucide-react';

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
  currentView, onChangeView, isOpen, isCollapsed, onToggleCollapse, onClose, hasActiveProject, onToggleAi, isAiOpen, currentUser, isProcessing, activeProjectTitle, onQuickNote
}) => {
  const sections: SidebarSection[] = [
    {
      title: 'Workspace',
      items: [
        { id: ViewType.BOOKSHELF, label: 'Library', icon: Book, always: true },
        { id: ViewType.NOTES, label: 'Notebook', icon: Search, always: true },
        { id: ViewType.STENO_RESEARCH, label: 'Steno Research', icon: Zap, always: true },
        { id: ViewType.SEMANTIC_EDITOR, label: 'Semantic Engine', icon: Database, always: true },
        { id: ViewType.DASHBOARD, label: 'Dashboard', icon: LayoutGrid, projectOnly: true },
      ]
    },
    {
      title: 'Story',
      items: [
        { id: ViewType.CHARACTERS, label: 'Characters', icon: Users, projectOnly: true },
        { id: ViewType.MAP, label: 'World Hub', icon: Map, projectOnly: true },
        { id: ViewType.TIMELINE, label: 'Continuity', icon: Calendar, projectOnly: true },
        { id: ViewType.MANUSCRIPT, label: 'Manuscript', icon: PenTool, projectOnly: true },
      ]
    },
    {
      title: 'System',
      items: [
        { id: ViewType.TOOLBOX, label: 'Toolbox', icon: HelpCircle, always: true },
        { id: ViewType.SETTINGS, label: 'Settings', icon: Settings, always: true },
        { id: ViewType.ADMIN, label: 'Admin', icon: Shield, adminOnly: true },
      ]
    }
  ];

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
        bg-slate-950 text-slate-400 flex flex-col transition-all duration-300 border-r border-slate-800/50
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-20' : 'w-64'}
      `}>
        <div className="p-6 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            {!isCollapsed && <span className="font-black text-2xl tracking-tighter text-white">PLOTHOLE</span>}
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
      </nav>

      <div className="p-4 mt-auto space-y-2">
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
      </div>
    </aside>
    </>
  );
};
