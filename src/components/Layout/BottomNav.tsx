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
    <div className="fixed bottom-0 left-0 right-0 z-[1000] lg:hidden">
      <div className="bg-slate-900/95 backdrop-blur-xl border-t border-white/10 p-2 flex items-center justify-around pb-safe">
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
