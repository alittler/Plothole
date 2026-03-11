import React from 'react';
import { ViewType } from '../../types';
import { Book, Search, Zap, LayoutGrid, Menu } from 'lucide-react';

interface BottomNavProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  onOpenSidebar: () => void;
  hasActiveProject: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView, onChangeView, onOpenSidebar, hasActiveProject
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[1000] lg:hidden">
      <div className="bg-slate-900/95 backdrop-blur-xl border-t border-white/10 px-2 py-2 flex items-center justify-around pb-safe">
        
        <button
          onClick={() => onChangeView(ViewType.BOOKSHELF)}
          className={`flex items-center justify-center p-3 rounded-xl transition-all ${currentView === ViewType.BOOKSHELF ? 'text-white bg-indigo-600 shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
        >
          <Book size={24} />
        </button>

        {hasActiveProject ? (
          <button
            onClick={() => onChangeView(ViewType.DASHBOARD)}
            className={`flex items-center justify-center p-3 rounded-xl transition-all ${currentView === ViewType.DASHBOARD ? 'text-white bg-indigo-600 shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
          >
            <LayoutGrid size={24} />
          </button>
        ) : (
          <div className="w-[48px]" />
        )}

        <button
          onClick={() => onChangeView(ViewType.NOTEPAD)}
          className={`flex items-center justify-center p-4 rounded-2xl transition-all shadow-xl -mt-6 ${currentView === ViewType.NOTEPAD ? 'text-white bg-indigo-500 shadow-indigo-500/30' : 'text-white bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'}`}
        >
          <Search size={32} />
        </button>

        <button
          onClick={() => onChangeView(ViewType.RESEARCH)}
          className={`flex items-center justify-center p-3 rounded-xl transition-all ${currentView === ViewType.RESEARCH ? 'text-white bg-indigo-600 shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
        >
          <Zap size={24} />
        </button>

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
