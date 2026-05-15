import React, { useState } from 'react';
import { ProjectData } from '../../types';
import { Sparkles, Search, Moon, Sun, Stars, Telescope, ChevronRight } from 'lucide-react';
import { LunarChart } from '../Calendar2/LunarChart';
import { calculateMoonPhase, getMoonEmoji } from '../../services/calendarEngine';
import { ViewHeader } from '../Layout/ViewHeader';

interface CelestialViewProps {
  projectData: ProjectData;
}

export const CelestialView: React.FC<CelestialViewProps> = ({ projectData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const config = projectData.calendarConfig;

  if (!config) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-950 font-serif italic text-lg text-center p-12">
        Initialize a calendar system to unlock Celestial Analytics.
      </div>
    );
  }

  const moons = config.moons.slice(0, config.n_moons);
  const currentDayInYear = 1; // Sample day

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <ViewHeader
        icon={Telescope}
        title="Celestial Analytics"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Track star patterns..."
      />

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-12 pb-40">
          
          {/* Current Status Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-slate-900 rounded-[3rem] p-12 relative overflow-hidden group border border-slate-800 shadow-2xl">
              <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity">
                <Stars size={200} className="text-indigo-400 animate-pulse" />
              </div>
              
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl">
                    <Sun size={24} />
                  </div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Current Conjunction</h2>
                </div>
                
                <p className="text-slate-400 font-serif italic text-lg max-w-xl">
                  The celestial bodies are in transition. The current year {config.year} consists of {config.year_len} cycles across {config.n_months} months.
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8">
                  {moons.map(moon => {
                    const phase = calculateMoonPhase(currentDayInYear, moon, config);
                    return (
                      <div key={moon} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
                        <span className="text-4xl">{getMoonEmoji(phase)}</span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{moon}</span>
                        <span className="text-[8px] text-indigo-400 font-bold uppercase">Phase {Math.round(phase * 100)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-indigo-600 rounded-[3rem] p-10 flex flex-col justify-between text-white shadow-xl shadow-indigo-600/20">
              <div className="space-y-4">
                <Moon size={48} className="text-indigo-200" />
                <h3 className="text-2xl font-black uppercase tracking-tight">Lunar Dominion</h3>
                <p className="text-indigo-100/70 text-sm font-medium leading-relaxed">
                  Your world is influenced by {config.n_moons} active celestial bodies, dictating the flow of magic, tides, and temporal navigation.
                </p>
              </div>
              
              <div className="space-y-2 pt-8">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60">
                  <span>Week Cycle</span>
                  <span>{config.week_len} Days</span>
                </div>
                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-2/3" />
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Analytics */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Orbital Cycles</h2>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mt-1">Mathematical projections of lunar behavior.</p>
              </div>
            </div>
            
            <LunarChart config={config} />
          </section>

          {/* Celestial Lore */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                <Stars size={20} className="text-amber-500" /> Astronomical Records
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-serif leading-relaxed italic">
                Ancient stargazers noted that {moons[0] || 'the primary moon'} completes a full revolution every {config.lunar_cyc[moons[0]] || 29.5} cycles.
              </p>
            </div>
            
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                <Sparkles size={20} className="text-indigo-500" /> Astral Influence
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-serif leading-relaxed italic">
                The intersection of week length ({config.week_len}) and lunar cycles creates unique temporal resonance points.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
