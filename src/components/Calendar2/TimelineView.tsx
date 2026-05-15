import React from 'react';
import { CalendarConfig } from '../../types';
import { parseDateKey } from '../../services/calendarEngine';
import { Sparkles, Clock } from 'lucide-react';

interface TimelineViewProps {
  config: CalendarConfig;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ config }) => {
  // Convert events record to sorted array of [dateKey, events]
  const eventDays = Object.entries(config.events)
    .filter(([_, events]) => events && events.length > 0)
    .map(([dateKey, events]) => {
      const { month, day } = parseDateKey(dateKey);
      
      // Calculate a sort score for chronological ordering
      let sortScore = 0;
      for (let i = 0; i < month - 1; i++) {
        sortScore += config.month_len[config.months[i]] || 30;
      }
      sortScore += day;

      return { dateKey, events, month, day, sortScore };
    })
    .sort((a, b) => a.sortScore - b.sortScore);
  
  if (eventDays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
        <p className="text-slate-500 dark:text-slate-400 font-serif italic text-lg">No scheduled events in the tapestry of time.</p>
      </div>
    );
  }

  return (
    <div className="relative border-l-2 border-slate-200 dark:border-slate-800 pl-4 md:pl-8 space-y-8 md:space-y-12 max-w-4xl mx-auto py-8">
      {eventDays.map(({ dateKey, events, month, day }) => (
        <div key={dateKey} className="relative group">
          {/* Vertical Timeline Dot */}
          <div className="absolute -left-[17px] md:-left-[41px] top-0 w-3 md:h-4 md:w-4 h-3 rounded-full border-2 md:border-4 border-white dark:border-slate-950 shadow-sm bg-indigo-500" />
          
          <div className="p-4 md:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-indigo-500">
                  {config.months[month - 1]} {day}, Year {config.year || 1}
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              {events.map((event, i) => (
                <div key={i} className="group/item flex items-start gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover/item:bg-indigo-500 transition-colors" />
                  <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                    {event}
                  </h3>
                </div>
              ))}
            </div>

            {config.notes[dateKey] && (
              <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 italic">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={12} className="text-amber-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Archivist Log</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-serif">
                  {config.notes[dateKey]}
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
