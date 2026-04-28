import { useState } from 'react';
import { CharacterCard, LocationCard, PlotCard } from '../Weaver/Cards';
import { CHARACTERS, LOCATIONS, PLOT_POINTS, EXTRACTION_PROMPT } from '../../constants/weaver.constants';

export const WaverView = () => {
  const [activeTab, setActiveTab] = useState<'chars' | 'locs' | 'plots' | 'prompt'>('chars');

  const navItems = [
    { id: 'chars' as const, label: 'Characters' },
    { id: 'locs' as const, label: 'Locations' },
    { id: 'plots' as const, label: 'Plot Points' },
    { id: 'prompt' as const, label: 'AI Prompt' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-white">
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-8">
        <h1 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
          <span className="text-slate-400 dark:text-slate-500 font-normal mr-2">Studio /</span> Manuscript Story Weaver
        </h1>
        <button className="bg-slate-900 dark:bg-slate-700 text-white px-4 py-2 rounded-md text-xs font-medium cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-600 transition">
          Process Manuscript
        </button>
      </header>

      <div className="p-8">
        <nav className="flex gap-8 mb-8 border-b border-slate-200 dark:border-slate-700 pb-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`pb-2 text-sm font-semibold transition ${
                activeTab === item.id 
                  ? "text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white" 
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <main>
          {activeTab === 'chars' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {CHARACTERS.map(c => <CharacterCard key={c.id} character={c} />)}
            </div>
          )}
          {activeTab === 'locs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {LOCATIONS.map(l => <LocationCard key={l.id} location={l} />)}
            </div>
          )}
          {activeTab === 'plots' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PLOT_POINTS.map(p => <PlotCard key={p.id} plot={p} />)}
            </div>
          )}
          {activeTab === 'prompt' && (
            <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Prompt Used</h2>
              <pre className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-4 rounded-md font-mono whitespace-pre-wrap">
                {EXTRACTION_PROMPT}
              </pre>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
