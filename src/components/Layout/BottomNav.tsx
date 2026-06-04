import React from 'react';
import { ViewType } from '../../types';
import { Book, Search, Zap, LayoutGrid, Menu, FileText, Users, Map, Clock, X, HelpCircle, Settings, Shield, Wrench, Wand2, BookOpen } from 'lucide-react';

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
  const [hasBottomAddressBar, setHasBottomAddressBar] = React.useState(false);

  React.useEffect(() => {
    const checkAddressBar = () => {
      // Method 1: Check safe area inset (iOS Safari specific)
      const div = document.createElement('div');
      div.style.paddingBottom = 'env(safe-area-inset-bottom)';
      document.body.appendChild(div);
      const insetBottom = parseInt(window.getComputedStyle(div).paddingBottom);
      document.body.removeChild(div);

      // Method 2: Compare visual viewport to layout viewport
      const isCramped = window.visualViewport
        ? window.visualViewport.height < document.documentElement.clientHeight - 20
        : false;

      setHasBottomAddressBar(insetBottom > 50 || isCramped);
    };

    checkAddressBar();
    window.visualViewport?.addEventListener('resize', checkAddressBar);
    window.addEventListener('resize', checkAddressBar);
    return () => {
      window.visualViewport?.removeEventListener('resize', checkAddressBar);
      window.removeEventListener('resize', checkAddressBar);
    };
  }, []);

  const defaultOrder = [ViewType.RESEARCH, ViewType.CODEX_HUB, ViewType.WORLD_HUB];
  const order = bottomNavOrder || defaultOrder;

  const getViewLabel = (view: ViewType) => {
    switch (view) {
      case ViewType.BOOKSHELF: return 'Library';
      case ViewType.NOTEPAD: return 'Notebook';
      case ViewType.RESEARCH: return 'Notebook';
      case ViewType.CHARACTERS: return 'Characters';
      case ViewType.MAP: return 'Map';
      case ViewType.TIMELINE: return 'Timeline';
      case ViewType.PLOT_HUB: return 'Plot';
      case ViewType.WORLD_HUB: return 'Map';
      case ViewType.NARRATIVE_ARCHITECT: return 'Architect';
      case ViewType.CODEX_HUB: return 'Characters';
      case ViewType.TOOLBOX: return 'Toolbox';
      case ViewType.SETTINGS: return 'Settings';
      case ViewType.ADMIN: return 'Admin';
      default: return 'Page';
    }
  };

  const getViewIcon = (view: ViewType, isActive: boolean, iconSize: number = 24) => {
    const size = iconSize;
    switch (view) {
      case ViewType.BOOKSHELF: return <Book size={size} />;
      case ViewType.NOTEPAD: return <FileText size={size} />;
      case ViewType.RESEARCH: return <Zap size={size} />;
      case ViewType.CHARACTERS: return <Users size={size} />;
      case ViewType.MAP: return <Map size={size} />;
      case ViewType.TIMELINE: return <Clock size={size} />;
      case ViewType.PLOT_HUB: return <Clock size={size} />;
      case ViewType.WORLD_HUB: return <Map size={size} />;
      case ViewType.NARRATIVE_ARCHITECT: return <LayoutGrid size={size} />;
      case ViewType.CODEX_HUB: return <BookOpen size={size} />;
      case ViewType.TOOLBOX: return <Wrench size={size} />;
      case ViewType.SETTINGS: return <Settings size={size} />;
      case ViewType.ADMIN: return <Shield size={size} />;
      default: return <Zap size={size} />;
    }
  };

  // Reduce 1.3rem padding by 1/3 (to ~0.9rem) if bottom address bar is detected
  const extraPadding = hasBottomAddressBar ? '0.9rem' : '1.3rem';

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-[1000] lg:hidden transition-transform duration-500 ease-in-out ${isSidebarOpen ? 'translate-y-1/3' : 'translate-y-0'}`}>
      <div
        data-section="bottom-navbar"
        style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + ${extraPadding})` }}
        className="bg-slate-900/90 dark:bg-white/90 backdrop-blur-2xl border-t border-white/20 dark:border-black/10 px-4 pt-3 flex items-start justify-around rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.3)]"
      >

        {order.map((view, index) => {
          const isActive = currentView === view;
          const isProjectOnly = [ViewType.CHARACTERS, ViewType.MAP, ViewType.TIMELINE, ViewType.CODEX_HUB, ViewType.PLOT_HUB, ViewType.WORLD_HUB, ViewType.NARRATIVE_ARCHITECT].includes(view);
          const isDisabled = isProjectOnly && !hasActiveProject;
          const isNotebookView = view === ViewType.NOTEPAD || view === ViewType.RESEARCH;
          const visibleItems = order.filter(v => {
            const isProjOnly = [ViewType.CHARACTERS, ViewType.MAP, ViewType.TIMELINE, ViewType.CODEX_HUB, ViewType.PLOT_HUB, ViewType.WORLD_HUB, ViewType.NARRATIVE_ARCHITECT].includes(v);
            return !(isProjOnly && !hasActiveProject);
          });
          const isMiddle = visibleItems.length > 0 && visibleItems[Math.floor(visibleItems.length / 2)] === view;

          if (isDisabled) return null;

          if (isNotebookView) {
            return (
              <button
                key={`nav-${view}`}
                onClick={() => onChangeView(view)}
                title={getViewLabel(view)}
                className={`flex items-center justify-center -translate-y-4 w-14 h-14 rounded-full transition-all shadow-[0_15px_30px_rgba(0,0,0,0.5)] ${isActive
                    ? 'text-white bg-indigo-600 scale-110 ring-4 ring-white dark:ring-slate-900 shadow-indigo-600/50'
                    : 'text-slate-950 bg-amber-400 dark:bg-amber-500 ring-4 ring-amber-400/20 dark:ring-amber-500/20 hover:scale-105'
                  }`}
              >
                <FileText size={28} strokeWidth={1.5} />
              </button>
            );
          }

          if (isMiddle) {
            return (
              <button
                key={`nav-${view}`}
                onClick={() => onChangeView(view)}
                title={getViewLabel(view)}
                className={`flex items-center justify-center -translate-y-4 w-14 h-14 rounded-full transition-all shadow-[0_15px_30px_rgba(0,0,0,0.5)] ${isActive
                    ? 'text-white bg-indigo-600 scale-110 ring-4 ring-white dark:ring-slate-900 shadow-indigo-600/50'
                    : 'text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 ring-4 ring-slate-200/20 dark:ring-slate-700/20 hover:scale-105'
                  }`}
              >
                {getViewIcon(view, isActive, 24)}
              </button>
            );
          }

          return (
            <button
              key={`nav-${view}`}
              onClick={() => onChangeView(view)}
              title={getViewLabel(view)}
              className={`flex items-center justify-center p-2 rounded-2xl transition-all ${isActive ? 'text-white bg-indigo-600 shadow-lg shadow-indigo-600/40 scale-110' : 'text-slate-400 hover:text-slate-300 dark:hover:text-slate-600'}`}
            >
              {getViewIcon(view, isActive, 20)}
            </button>
          );
        })}

        <button
          key="nav-menu"
          onClick={onToggleSidebar}
          className={`flex items-center justify-center p-2 rounded-2xl transition-all ${isSidebarOpen ? 'text-white bg-indigo-500' : 'text-slate-400 hover:text-slate-300 dark:hover:text-slate-600'}`}
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

      </div>
    </div>
  );
};
