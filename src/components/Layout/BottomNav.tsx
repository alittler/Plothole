import React from 'react';
import { ViewType } from '../../types';
import { Book, Search, Zap, LayoutGrid, Menu, FileText, Users, Map, Calendar, X, HelpCircle, Settings, Shield } from 'lucide-react';

interface BottomNavProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  hasActiveProject: boolean;
  bottomNavOrder?: ViewType[];
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView, onChangeView, onToggleSidebar, isSidebarOpen, hasActiveProject, bottomNavOrder
}) => {
  const defaultOrder = [ViewType.BOOKSHELF, ViewType.DASHBOARD, ViewType.NOTEPAD, ViewType.RESEARCH];
  const order = bottomNavOrder || defaultOrder;

  const getViewIcon = (view: ViewType, isActive: boolean) => {
    const size = 24;
    switch (view) {
      case ViewType.BOOKSHELF: return <Book size={size} />;
      case ViewType.DASHBOARD: return <LayoutGrid size={size} />;
      case ViewType.NOTEPAD: return <FileText size={size} />;
      case ViewType.RESEARCH: return <Zap size={size} />;
      case ViewType.CHARACTERS: return <Users size={size} />;
      case ViewType.MAP: return <Map size={size} />;
      case ViewType.TIMELINE: return <Calendar size={size} />;
      case ViewType.TOOLBOX: return <Wrench size={size} />;
      case ViewType.SETTINGS: return <Settings size={size} />;
      case ViewType.ADMIN: return <Shield size={size} />;
      default: return <Zap size={size} />;
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[1000] lg:hidden">
      <div className="bg-slate-900/90 dark:bg-white/90 backdrop-blur-2xl border-t border-white/20 dark:border-black/10 px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] flex items-start justify-around rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        
        {order.map((view) => {
          const isActive = currentView === view;
          const isProjectOnly = [ViewType.DASHBOARD, ViewType.RESEARCH, ViewType.CHARACTERS, ViewType.MAP, ViewType.TIMELINE, ViewType.CODEX].includes(view);
          const isDisabled = isProjectOnly && !hasActiveProject;
          const isNotepad = view === ViewType.NOTEPAD;

          if (isDisabled) return null;

          if (isNotepad) {
            return (
              <button
                key={view}
                onClick={() => onChangeView(view)}
                className={`flex items-center justify-center -translate-y-10 w-16 h-16 rounded-full transition-all shadow-2xl ${isActive ? 'text-white bg-indigo-600 scale-110 shadow-indigo-600/50' : 'text-white bg-slate-800 dark:bg-slate-200 dark:text-slate-900 hover:scale-105'}`}
              >
                <FileText size={32} strokeWidth={1.5} />
              </button>
            );
          }

          return (
            <button
              key={view}
              onClick={() => onChangeView(view)}
              className={`flex items-center justify-center p-3 rounded-2xl transition-all ${isActive ? 'text-white bg-indigo-600 shadow-lg shadow-indigo-600/40 scale-110' : 'text-slate-400 hover:text-slate-300 dark:hover:text-slate-600'}`}
            >
              {getViewIcon(view, isActive)}
            </button>
          );
        })}

        <button
          onClick={onToggleSidebar}
          className={`flex items-center justify-center p-3 rounded-2xl transition-all ${isSidebarOpen ? 'text-white bg-indigo-500' : 'text-slate-400 hover:text-slate-300 dark:hover:text-slate-600'}`}
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        
      </div>
    </div>
  );
};
