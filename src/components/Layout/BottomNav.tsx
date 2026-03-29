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
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 px-2 py-2 flex items-center justify-around pb-safe">
        
        {order.map((view) => {
          const isActive = currentView === view;
          const isProjectOnly = [ViewType.DASHBOARD, ViewType.RESEARCH, ViewType.CHARACTERS, ViewType.MAP, ViewType.TIMELINE, ViewType.CODEX].includes(view);
          const isDisabled = isProjectOnly && !hasActiveProject;

          if (isDisabled) return null;

          return (
            <button
              key={view}
              onClick={() => onChangeView(view)}
              className={`flex items-center justify-center p-3 rounded-2xl transition-all ${isActive ? 'text-white bg-indigo-600 shadow-lg shadow-indigo-600/20 scale-110' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'}`}
            >
              {getViewIcon(view, isActive)}
            </button>
          );
        })}

        <button
          onClick={onToggleSidebar}
          className={`flex items-center justify-center p-3 rounded-2xl transition-all ${isSidebarOpen ? 'text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'}`}
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        
      </div>
    </div>
  );
};
