import { CalendarConfig } from '../../types';
import { getDateKey } from '../../services/calendarEngine';

interface WeekViewProps {
  config: CalendarConfig;
  selectedDay: number; // Linear day index
}

export const WeekView: React.FC<WeekViewProps> = ({ 
  config, 
  selectedDay 
}) => {
  const weekStart = Math.floor(selectedDay / config.week_len) * config.week_len;
  const weekDays = Array.from({ length: config.week_len }, (_, i) => weekStart + i);

  // Helper to convert global day index to month/day key
  const globalDayToKey = (globalDayIdx: number) => {
    let runningDay = 0;
    for (let i = 0; i < config.months.length; i++) {
      const monthName = config.months[i];
      const daysInMonth = config.month_len[monthName] ?? 30;
      if (runningDay + daysInMonth > globalDayIdx) {
        return getDateKey(i, globalDayIdx - runningDay + 1);
      }
      runningDay += daysInMonth;
    }
    return '1-1';
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Week View</h3>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-1">Cycle Day {weekStart + 1} — {weekStart + config.week_len}</p>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4">
        {weekDays.map((dayIdx) => {
          const dateKey = globalDayToKey(dayIdx);
          const events = config.events[dateKey] || [];
          const hasNote = !!config.notes[dateKey];
          const isSelected = dayIdx === selectedDay;

          return (
            <div 
              key={dayIdx} 
              className={`flex-1 p-5 rounded-2xl border transition-all ${
                isSelected 
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/50 shadow-inner' 
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className={`text-xs font-black uppercase tracking-widest ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  {dateKey}
                </span>
                {hasNote && (
                  <div className="w-2 h-2 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                )}
              </div>
              <div className="space-y-2">
                {events.length > 0 ? (
                  events.map((ev, i) => (
                    <div key={i} className="text-[11px] bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-sm font-medium">
                      {ev}
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-300 dark:text-slate-600 uppercase font-bold tracking-widest">No Events</span>
                  </div>
                )}
              </div>
              
              {hasNote && isSelected && (
                <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-900/30 text-[10px] text-indigo-800/70 dark:text-indigo-400/70 italic leading-relaxed">
                  <span className="font-black not-italic text-indigo-600 dark:text-indigo-500 mr-1 opacity-100">NOTE:</span>
                  {config.notes[dateKey]}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
