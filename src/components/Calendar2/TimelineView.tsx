import { CalendarConfig } from '../../types';

interface TimelineViewProps {
  config: CalendarConfig;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ config }) => {
  // Convert events record to sorted array of [dayIndex, events], deduplicating by dayIdx
  const eventsByDay = Object.entries(config.events)
    .map(([dayIdx, events]) => ({ dayIdx: parseInt(dayIdx), events }))
    .filter(({ events }) => events && events.length > 0);
  
  // Deduplicate by dayIdx (keep first occurrence, merge events)
  const eventDaysMap = new Map<number, string[]>();
  eventsByDay.forEach(({ dayIdx, events }) => {
    if (eventDaysMap.has(dayIdx)) {
      // Merge events for this day
      const existing = eventDaysMap.get(dayIdx)!;
      const merged = [...existing];
      events.forEach(e => {
        if (!merged.includes(e)) {
          merged.push(e);
        }
      });
      eventDaysMap.set(dayIdx, merged);
    } else {
      eventDaysMap.set(dayIdx, events);
    }
  });
  
  // Convert back to sorted array
  const eventDays = Array.from(eventDaysMap.entries())
    .map(([dayIdx, events]) => ({ dayIdx, events }))
    .sort((a, b) => a.dayIdx - b.dayIdx);
  
  if (eventDays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
        <p className="text-slate-500 dark:text-slate-400 font-serif italic text-lg">No scheduled events in the tapestry of time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {eventDays.map(({ dayIdx, events }) => (
        <div key={dayIdx} className="flex gap-6 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 w-24 shrink-0 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 transition-colors">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Cycle Day</span>
            <span className="font-mono font-black text-2xl text-slate-900 dark:text-white">{dayIdx + 1}</span>
          </div>
          <div className="flex-1 space-y-3 pt-2">
            <ul className="space-y-2">
              {events.map((event, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                  <span className="text-sm font-medium leading-relaxed">{event}</span>
                </li>
              ))}
            </ul>
            {config.notes[dayIdx.toString()] && (
              <div className="mt-4 p-3 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg text-xs italic text-amber-800 dark:text-amber-400">
                <span className="font-bold uppercase tracking-tighter mr-2 not-italic opacity-50">Log:</span>
                {config.notes[dayIdx.toString()]}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
