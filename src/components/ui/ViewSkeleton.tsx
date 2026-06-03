import React from 'react';

export const ViewSkeleton: React.FC = () => {
  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 animate-pulse">
      {/* Header Skeleton */}
      <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
            <div className="space-y-2">
              <div className="w-48 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="w-64 h-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-32 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="w-32 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
        </div>
      </header>

      {/* Content Skeleton */}
      <main className="flex-1 p-4 md:p-8 overflow-hidden">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Grid of Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="w-3/4 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                  <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="w-full h-4 bg-slate-50 dark:bg-slate-800/50 rounded" />
                  <div className="w-5/6 h-4 bg-slate-50 dark:bg-slate-800/50 rounded" />
                  <div className="w-4/6 h-4 bg-slate-50 dark:bg-slate-800/50 rounded" />
                </div>
                <div className="pt-4 flex gap-2">
                  <div className="w-16 h-4 bg-slate-100 dark:bg-slate-800 rounded" />
                  <div className="w-16 h-4 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
