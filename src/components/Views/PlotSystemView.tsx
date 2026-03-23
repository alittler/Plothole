import React, { useState, useMemo } from 'react';
import { ViewType, ProjectData, CalendarSystem, TimelineEvent } from '../../types';
import { Calendar, Clock, Plus, Sparkles, Edit2, Trash2, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { calculateUEI, getDateFromUEI } from '../../utils/calendarUtils';

interface PlotSystemViewProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  data: ProjectData;
  onUpdateCalendar: (c: CalendarSystem) => void;
  onSetActiveCalendar: (id: string) => void;
  onLinkClick: (type: string, id: string) => void;
  onAddTimelineEvent: (e: TimelineEvent) => void;
  onUpdateTimelineEvent: (e: TimelineEvent) => void;
  onAnalyzePlot: () => void;
  onExtractSoftAnchors: () => void;
  onUpdateProject: (updates: Partial<ProjectData>) => void;
  isAnalyzing?: boolean;
}

enum PlotTab {
  TIMELINE = 'Timeline',
  CALENDAR = 'Calendar'
}

export const PlotSystemView: React.FC<PlotSystemViewProps> = ({
  data, onAddTimelineEvent, onUpdateProject, onExtractSoftAnchors, isAnalyzing, onLinkClick
}) => {
  const [activeTab, setActiveTab] = useState<PlotTab>(PlotTab.TIMELINE);

  // Calendar State
  const activeCalendar = data.calendars?.find(c => c.id === data.activeCalendarId) || data.calendars?.[0] || {
    id: 'default',
    name: 'Standard Calendar',
    weekDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    daysPerWeek: 7,
    hoursPerDay: 24,
    months: [{ id: '1', name: 'January', days: 30 }],
    eras: [{ id: '1', name: 'First Age', abbreviation: 'FA', startYear: 0 }],
    currentEpochDay: 0
  };

  const [currentYear, setCurrentYear] = useState<number>(1);
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(0);

  const handleSelectEvent = (event: TimelineEvent) => {
    // Always find the latest version of this event from data.timeline to ensure sync
    const latestEvent = data.timeline.find(e => e.id === event.id) || event;
    
    if (latestEvent.uei !== undefined) {
      const { year, monthIndex } = getDateFromUEI(activeCalendar, latestEvent.uei);
      setCurrentYear(year);
      setCurrentMonthIndex(monthIndex);
      setActiveTab(PlotTab.CALENDAR);
    }
  };

  const handleDelete = (id: string) => {
    onUpdateProject({ timeline: data.timeline.filter(e => e.id !== id) });
  };

  // Pre-calculate UEI for events
  const eventsByUEI = useMemo(() => {
    const map = new Map<number, TimelineEvent[]>();
    data.timeline.forEach(event => {
       if (event.uei !== undefined) {
         const list = map.get(event.uei) || [];
         list.push(event);
         map.set(event.uei, list);
       }
    });
    return map;
  }, [data.timeline]);

  const currentMonth = activeCalendar.months[currentMonthIndex] || { name: 'Unknown', days: 30 };
  const daysPerWeek = activeCalendar.daysPerWeek || 7;
  const gridCells = Array.from({ length: currentMonth.days }, (_, i) => i + 1);

  const handlePrevMonth = () => {
    if (currentMonthIndex > 0) {
      setCurrentMonthIndex(currentMonthIndex - 1);
    } else if (currentYear > 1) {
      setCurrentYear(currentYear - 1);
      setCurrentMonthIndex(activeCalendar.months.length - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex < activeCalendar.months.length - 1) {
      setCurrentMonthIndex(currentMonthIndex + 1);
    } else {
      setCurrentYear(currentYear + 1);
      setCurrentMonthIndex(0);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">PLOT & TIMELINE</h1>
            <p className="hidden md:block text-xs md:text-sm text-slate-500 dark:text-slate-400">The sequence of events that define your story.</p>
          </div>
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar">
            {[PlotTab.TIMELINE, PlotTab.CALENDAR].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-xl font-bold text-[10px] md:text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                {tab === PlotTab.TIMELINE && <List size={14} />}
                {tab === PlotTab.CALENDAR && <Calendar size={14} />}
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {activeTab === PlotTab.TIMELINE && (
            <>
              <div className="flex flex-col sm:flex-row justify-end gap-3 md:gap-4 mb-8">
                <button 
                  onClick={onExtractSoftAnchors} 
                  disabled={isAnalyzing}
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Sparkles size={16} /> Sync Anchors
                </button>
                <button onClick={() => onAddTimelineEvent({ id: Math.random().toString(), date: 'Year 1', title: 'New Event', description: '', charactersInvolved: [], location: '', source: 'manual' })} className="w-full sm:w-auto px-4 py-2 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-colors flex items-center justify-center gap-2">
                  <Plus size={16} /> Add Event
                </button>
              </div>
              <div className="relative border-l-2 border-slate-200 dark:border-slate-800 pl-4 md:pl-8 space-y-8 md:space-y-12">
                {data.timeline.sort((a,b) => (a.uei || 0) - (b.uei || 0)).map((event, idx) => (
                  <div key={event.id} className="relative group">
                    <div className={`absolute -left-[17px] md:-left-[41px] top-0 w-3 md:h-4 md:w-4 h-3 rounded-full border-2 md:border-4 border-white dark:border-slate-950 shadow-sm ${event.isSoftAnchor ? 'bg-indigo-400 border-dashed' : 'bg-amber-500'}`} />
                    <div 
                      onClick={() => handleSelectEvent(event)}
                      className={`p-4 md:p-6 rounded-2xl shadow-sm border hover:shadow-md transition-all cursor-pointer ${event.isSoftAnchor ? 'bg-indigo-50/30 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black uppercase tracking-widest ${event.isSoftAnchor ? 'text-indigo-500' : 'text-amber-600'}`}>{event.date}</span>
                          {event.isSoftAnchor && <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded uppercase tracking-widest font-black flex items-center gap-1"><Clock size={10} /> Soft Anchor</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          {event.source === 'ai' && <Sparkles size={14} className={event.isSoftAnchor ? 'text-indigo-400' : 'text-amber-400'} />}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onLinkClick('admin', event.id);
                            }}
                            className="p-1 text-slate-300 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"
                            title="Edit Event"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(event.id);
                            }} 
                            className="p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{event.title}</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{event.description}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {event.charactersInvolved?.map(char => (
                          <span key={char} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-[10px] font-bold">
                            {char}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === PlotTab.CALENDAR && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <ChevronLeft size={20} />
                  </button>
                  <div className="text-center w-48">
                    <div className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">{currentMonth.name}</div>
                    <div className="text-xs font-bold text-amber-500 uppercase tracking-widest">
                       Year {currentYear} {activeCalendar.eras.length > 0 ? activeCalendar.eras[0].abbreviation : ''}
                    </div>
                  </div>
                  <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <ChevronRight size={20} />
                  </button>
                </div>
                <div className="text-xs text-slate-500">
                  Universal Epoch: <span className="font-mono font-bold text-slate-900 dark:text-white">{activeCalendar.currentEpochDay || 0}</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="grid border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950" style={{ gridTemplateColumns: `repeat(${daysPerWeek}, minmax(0, 1fr))` }}>
                  {Array.from({ length: daysPerWeek }).map((_, i) => (
                    <div key={i} className="p-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-r last:border-r-0 border-slate-200 dark:border-slate-800">
                      {activeCalendar.weekDays[i % activeCalendar.weekDays.length] || `Day ${i + 1}`}
                    </div>
                  ))}
                </div>
                <div className="grid auto-rows-fr" style={{ gridTemplateColumns: `repeat(${daysPerWeek}, minmax(0, 1fr))` }}>
                  {gridCells.map(day => {
                    const uei = calculateUEI(activeCalendar, currentYear, currentMonthIndex, day);
                    const isToday = uei === activeCalendar.currentEpochDay;
                    const dayEvents = eventsByUEI.get(uei) || [];

                    return (
                      <div 
                        key={day} 
                        className={`min-h-[120px] p-2 border-r border-b border-slate-100 dark:border-slate-800 relative group transition-colors ${isToday ? 'bg-amber-50/50 dark:bg-amber-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                      >
                        <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-amber-500 text-white' : 'text-slate-500'}`}>
                          {day}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.map(ev => (
                            <div 
                              key={ev.id} 
                              className="text-[10px] p-1.5 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 truncate cursor-pointer hover:border-amber-500 transition-colors shadow-sm" 
                              onClick={() => {}}
                            >
                              <span className="font-bold text-amber-600 dark:text-amber-400 mr-1">•</span>
                              {ev.title}
                            </div>
                          ))}
                        </div>
                        <button 
                           onClick={() => onAddTimelineEvent({ id: Math.random().toString(), date: `${day} of ${currentMonth.name}`, uei, title: 'New Event', description: '', charactersInvolved: [], location: '', source: 'manual' })}
                           className="absolute bottom-2 right-2 p-1 bg-amber-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
