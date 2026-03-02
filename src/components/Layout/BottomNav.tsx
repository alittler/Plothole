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
  const navItems = [
    { id: ViewType.BOOKSHELF, label: 'Library', icon: Book },
    { id: ViewType.NOTES, label: 'Notebook', icon: Search },
    { id: ViewType.STENO_RESEARCH, label: 'Research', icon: Zap },
    ...(hasActiveProject ? [{ id: ViewType.DASHBOARD, label: 'Dash', icon: LayoutGrid }] : []),
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] lg:hidden w-[90%] max-w-md">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 flex items-center justify-around">
        {navItems.map(item => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${isActive ? 'text-white bg-indigo-600 shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={onOpenSidebar}
          className="flex flex-col items-center gap-1 p-2 rounded-xl text-slate-400 hover:text-slate-200"
        >
          <Menu size={20} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">More</span>
        </button>
      </div>
    </div>
  );
};
