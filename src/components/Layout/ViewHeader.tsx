import React from 'react';
import { Search, LucideIcon } from 'lucide-react';

interface ViewHeaderProps {
  icon: LucideIcon;
  title: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
}

export const ViewHeader: React.FC<ViewHeaderProps> = ({
  icon: Icon,
  title,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  children,
}) => {
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md z-10 shrink-0">
      <div className="p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4 gap-4">
            {/* Title - Hidden on mobile, shown on sm+ */}
            <div className="hidden sm:block space-y-0 flex-1">
              <h1 className="ph-section-title text-2xl md:text-3xl flex items-center gap-3">
                <Icon size={32} className="text-indigo-600" /> {title}
              </h1>
            </div>

            {/* Desktop Search Bar - Visible on md+ */}
            {onSearchChange && (
              <div className="relative hidden md:block ml-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchValue || ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="ph-input pl-12 w-64"
                />
              </div>
            )}

            {/* Mobile Search Button */}
            {onSearchChange && (
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="md:hidden p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
                title="Search"
              >
                <Search size={20} />
              </button>
            )}
          </div>

          {/* Mobile Search Input - Below header on mobile */}
          {onSearchChange && isSearchOpen && (
            <div className="md:hidden mb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchValue || ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  autoFocus
                  className="ph-input pl-12 w-full"
                />
              </div>
            </div>
          )}

          {/* Icon for mobile title */}
          <div className="sm:hidden flex items-center gap-2 mb-4">
            <Icon size={24} className="text-indigo-600" />
            <span className="text-lg font-semibold dark:text-white">{title}</span>
          </div>

          {/* Tabs/Children */}
          {children}
        </div>
      </div>
    </header>
  );
};
