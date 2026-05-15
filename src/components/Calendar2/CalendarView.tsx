import React from 'react';
import { CalendarConfig } from '../../types';
import { calculateMoonPhase, getMoonEmoji, getDateKey } from '../../services/calendarEngine';

interface CalendarViewProps {
  config: CalendarConfig;
  currentMonthIndex: number;
  onSelectDay: (monthIdx: number, day: number) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ 
  config, 
  currentMonthIndex,
  onSelectDay 
}) => {
  const monthName = config.months[currentMonthIndex];
  const daysInMonth = config.month_len[monthName] || 30;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Calculate start day of week for current month
  const yearsPassed = (config.year || 1) - 1;
  const daysFromFullYears = yearsPassed * config.year_len;
  
  let daysInPrevMonthsOfCurrentYear = 0;
  for (let i = 0; i < currentMonthIndex; i++) {
    daysInPrevMonthsOfCurrentYear += config.month_len[config.months[i]] || 30;
  }
  
  const totalDaysPassedSinceYearOne = daysFromFullYears + daysInPrevMonthsOfCurrentYear;
  const startDayOfWeek = (config.first_day + totalDaysPassedSinceYearOne) % config.week_len;
  const daysPassedInYearBeforeThisMonth = daysInPrevMonthsOfCurrentYear;

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${config.week_len}, minmax(0, 1fr))` }}>
        {/* Weekday headers */}
        {config.weekdays.map(d => (
          <div key={d} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 py-4">
            {d}
          </div>
        ))}
        
        {/* Empty cells for leading days */}
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="h-32 md:h-40"></div>
        ))}
        
        {/* Calendar days */}
        {days.map(day => {
          const dateKey = getDateKey(currentMonthIndex, day);
          const calendarEvents = config.events[dateKey] || [];
          const note = config.notes[dateKey];
          
          const moons = config.moons.slice(0, config.n_moons).map(moon => {
            const phase = calculateMoonPhase(daysPassedInYearBeforeThisMonth + day, moon, config);
            return getMoonEmoji(phase);
          });

          return (
            <div
              key={day}
              onClick={() => onSelectDay(currentMonthIndex, day)}
              className="h-32 md:h-40 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-xs text-slate-700 dark:text-slate-300 flex flex-col gap-1 overflow-hidden cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-all border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/30 hover:shadow-xl hover:shadow-indigo-500/5 group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-black text-slate-400 dark:text-slate-600 group-hover:text-indigo-600 transition-colors">{day}</span>
                <div className="flex gap-0.5 text-base">{moons.join('')}</div>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar-thin">
                {calendarEvents.map((e, i) => (
                  <div key={i} className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-lg truncate font-medium border border-indigo-100 dark:border-indigo-800/50">
                    {e}
                  </div>
                ))}
                {note && (
                  <div className="text-[9px] px-1 py-0.5 italic text-slate-500 dark:text-slate-400 leading-tight">
                    {note}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
