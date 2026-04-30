import React from 'react';
import { CalendarSystem, TimelineEvent } from '../../types';
import { ChevronLeft, ChevronRight, List, Calendar as CalendarIcon, Clock, Plus } from 'lucide-react';
import { calculateUEI } from '../../utils/calendarUtils';

interface FantasyFullCalendarViewProps {
  calendar: CalendarSystem;
  events: TimelineEvent[];
  currentYear: number;
  currentMonthIndex: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onEventClick: (event: TimelineEvent) => void;
  onDateClick: (uei: number, day: number) => void;
}

export const FantasyFullCalendarView: React.FC<FantasyFullCalendarViewProps> = ({
  calendar,
  events,
  currentYear,
  currentMonthIndex,
  onPrevMonth,
  onNextMonth,
  onToday,
  onEventClick,
  onDateClick
}) => {
  const currentMonth = calendar.months[currentMonthIndex] || { name: 'Unknown', days: 30 };
  const daysPerWeek = calendar.daysPerWeek || 7;
  const gridCells = Array.from({ length: currentMonth.days }, (_, i) => i + 1);

  // Filter events for this month
  const eventsByUEI = new Map<number, TimelineEvent[]>();
  events.forEach(ev => {
    if (ev.uei !== undefined) {
      const list = eventsByUEI.get(ev.uei) || [];
      list.push(ev);
      eventsByUEI.set(ev.uei, list);
    }
  });

  return (
    <div className="fc fantasy-fc bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* FC-Style Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            <button onClick={onPrevMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all text-slate-600 dark:text-slate-300">
              <ChevronLeft size={16} />
            </button>
            <button onClick={onNextMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all text-slate-600 dark:text-slate-300">
              <ChevronRight size={16} />
            </button>
          </div>
          <button 
            onClick={onToday}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Today
          </button>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
            {currentMonth.name}
          </h2>
          <div className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mt-1">
            Year {currentYear} {calendar.eras?.[0]?.abbreviation || ''}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            <button className="px-3 py-1.5 bg-white dark:bg-slate-700 shadow-sm rounded-lg text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <CalendarIcon size={12} /> Month
            </button>
            <button className="px-3 py-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <List size={12} /> List
            </button>
          </div>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950" style={{ gridTemplateColumns: `repeat(${daysPerWeek}, minmax(0, 1fr))` }}>
        {Array.from({ length: daysPerWeek }).map((_, i) => (
          <div key={i} className="p-3 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest border-r last:border-r-0 border-slate-100 dark:border-slate-800">
            {calendar.weekDays?.[i % calendar.weekDays.length] || `Day ${i + 1}`}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid auto-rows-fr" style={{ gridTemplateColumns: `repeat(${daysPerWeek}, minmax(0, 1fr))` }}>
        {gridCells.map(day => {
          const uei = calculateUEI(calendar, currentYear, currentMonthIndex, day);
          const isToday = uei === calendar.currentEpochDay;
          const dayEvents = eventsByUEI.get(uei) || [];

          return (
            <div 
              key={day} 
              className={`min-h-[120px] p-2 border-r border-b border-slate-100 dark:border-slate-800 relative group transition-colors ${isToday ? 'bg-amber-50/30 dark:bg-amber-900/5' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}`}
              onClick={() => onDateClick(uei, day)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-lg transition-all ${isToday ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'}`}>
                  {day}
                </div>
              </div>
              
              <div className="space-y-1">
                {dayEvents.map(ev => (
                  <div 
                    key={ev.id} 
                    className="text-[10px] p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100/50 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 truncate cursor-pointer hover:border-indigo-400 transition-all shadow-sm flex items-center gap-1.5" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                    <span className="font-bold truncate">{ev.title}</span>
                  </div>
                ))}
              </div>

              {/* Quick Add Button */}
              <button 
                className="absolute bottom-2 right-2 p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  onDateClick(uei, day);
                }}
              >
                <Plus size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* FC-Style Footer / Info */}
      <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
          <div className="flex items-center gap-1.5">
            <Clock size={10} className="text-indigo-500" /> {calendar.hoursPerDay || 24}H Day
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarIcon size={10} className="text-amber-500" /> {calendar.months.length} Months
          </div>
        </div>
        <div className="text-[9px] font-mono text-slate-400 opacity-50">
          UEI: {calendar.currentEpochDay || 0}
        </div>
      </div>
    </div>
  );
};
