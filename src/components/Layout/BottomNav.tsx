import React from 'react';
import { ViewType } from '../../types';
import { Book, Search, Zap, LayoutGrid, Menu, FileText, Users, Map, Calendar } from 'lucide-react';

interface BottomNavProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  onOpenSidebar: () => void;
  hasActiveProject: boolean;
  bottomNavOrder?: ViewType[];
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView, onChangeView, onOpenSidebar, hasActiveProject, bottomNavOrder
}) => {
  const defaultOrder = [ViewType.BOOKSHELF, ViewType.DASHBOARD, ViewType.NOTEPAD, ViewType.RESEARCH];
  const order = bottomNavOrder || defaultOrder;

  const getViewIcon = (view: ViewType) => {
    const size = view === order[2] ? 32 : 24;
    switch (view) {
      case ViewType.BOOKSHELF: return <Book size={size} />;
      case ViewType.DASHBOARD: return <LayoutGrid size={size} />;
      case ViewType.NOTEPAD: return <FileText size={size} />;
      case ViewType.RESEARCH: return <Zap size={size} />;
      case ViewType.CHARACTERS: return <Users size={size} />;
      case ViewType.MAP: return <Map size={size} />;
      case ViewType.TIMELINE: return <Calendar size={size} />;
      case ViewType.TOOLBOX: return <Search size={size} />;
      default: return <Zap size={size} />;
    }
  };

  const isCenter = (idx: number) => idx === 2;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[1000] lg:hidden">
      <div className="bg-slate-900/95 backdrop-blur-xl border-t border-white/10 px-2 py-2 flex items-center justify-around pb-safe">
        
        {order.slice(0, 4).map((view, idx) => {
          const isActive = currentView === view;
          const isDashboard = view === ViewType.DASHBOARD;
          const isDisabled = isDashboard && !hasActiveProject;

          if (isDisabled) return <div key={idx} className="w-[48px]" />;

          if (isCenter(idx)) {
            return (
              <button
                key={view}
                onClick={() => onChangeView(view)}
                className={`flex items-center justify-center p-4 rounded-2xl transition-all shadow-xl -mt-6 ${isActive ? 'text-white bg-indigo-500 shadow-indigo-500/30' : 'text-white bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'}`}
              >
                {getViewIcon(view)}
              </button>
            );
          }

          return (
            <button
              key={view}
              onClick={() => onChangeView(view)}
              className={`flex items-center justify-center p-3 rounded-xl transition-all ${isActive ? 'text-white bg-indigo-600 shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
            >
              {getViewIcon(view)}
            </button>
          );
        })}

        <button
          onClick={onOpenSidebar}
          className="flex items-center justify-center p-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
        >
          <Menu size={24} />
        </button>
        
      </div>
    </div>
  );
};
