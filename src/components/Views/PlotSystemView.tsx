import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ViewType, ProjectData, CalendarSystem, TimelineEvent } from '../../types';
import { Calendar, Clock, Plus, Sparkles, Edit2, Trash2, List, ChevronLeft, ChevronRight, FileText, Search, Download } from 'lucide-react';
import { calculateUEI, getDateFromUEI, parseDateToUEI } from '../../utils/calendarUtils';
import { FantasyCalendarEngine } from '../../utils/FantasyCalendarEngine';
import { CardActions } from '../ui/CardActions';

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
  onScanContinuity: () => void;
  onUpdateProject: (updates: Partial<ProjectData>) => void;
  isAnalyzing?: boolean;
}

enum PlotTab {
  TIMELINE = 'Timeline',
  CALENDAR = 'Calendar',
  REVISIONS = 'Revisions',
  AUDIT = 'Audit'
}

export const PlotSystemView: React.FC<PlotSystemViewProps> = ({
  data, onAddTimelineEvent, onUpdateProject, onExtractSoftAnchors, onScanContinuity, isAnalyzing, onLinkClick, onUpdateCalendar
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') as PlotTab) || PlotTab.TIMELINE;
  const setActiveTab = (tab: PlotTab) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    router.push(`?${params.toString()}`);
  };

  const [manuscriptSearch, setManuscriptSearch] = useState('');

  // Calendar State
  const rawActiveCalendar = data.calendars?.find(c => c.id === data.activeCalendarId) || data.calendars?.[0];
  
  const activeCalendar = useMemo(() => {
    if (rawActiveCalendar?.type === 'fantasy-calendar' && rawActiveCalendar.fantasyData) {
      const fd = rawActiveCalendar.fantasyData;
      return {
        ...rawActiveCalendar,
        months: fd.static_data.months.map(m => ({ id: String(m.id), name: m.name, days: m.length })),
        weekDays: (fd.static_data.weekdays as any[]).map(w => typeof w === 'string' ? w : w.name),
        daysPerWeek: fd.static_data.weekdays.length,
        hoursPerDay: fd.static_data.clock.hours,
        currentEpochDay: fd.dynamic_data.epoch
      };
    }
    return rawActiveCalendar || {
      id: 'default',
      name: 'Standard Calendar',
      weekDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      daysPerWeek: 7,
      hoursPerDay: 24,
      months: [{ id: '1', name: 'January', days: 30 }],
      eras: [{ id: '1', name: 'First Age', abbreviation: 'FA', startYear: 0 }],
      currentEpochDay: 0
    };
  }, [rawActiveCalendar]);

  const [currentYear, setCurrentYear] = useState<number>(1);
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(0);

  // Sync internal state with active calendar if it's fantasy
  useEffect(() => {
    if (rawActiveCalendar?.type === 'fantasy-calendar' && rawActiveCalendar.fantasyData) {
      const fd = rawActiveCalendar.fantasyData;
      setCurrentYear(fd.dynamic_data.year);
      const mIdx = fd.static_data.months.findIndex(m => Number(m.id) === fd.dynamic_data.month_id);
      setCurrentMonthIndex(mIdx >= 0 ? mIdx : 0);
    }
  }, [rawActiveCalendar]);

  const handleImportFantasyCalendar = () => {
    const json = prompt('Paste your Fantasy Calendar JSON export:');
    if (!json) return;
    try {
      const parsed = JSON.parse(json);
      if (!parsed.static_data || !parsed.dynamic_data) {
        alert('Invalid Fantasy Calendar JSON format.');
        return;
      }

      const newCalendar: CalendarSystem = {
        id: Math.random().toString(36).substring(7),
        name: parsed.name || 'Imported Fantasy Calendar',
        type: 'fantasy-calendar',
        fantasyData: parsed,
        months: [], // Will be derived
        eras: parsed.static_data.eras || []
      };

      onUpdateProject({ 
        calendars: [...(data.calendars || []), newCalendar],
        activeCalendarId: newCalendar.id
      });
      alert('Fantasy Calendar imported successfully!');
    } catch (e) {
      alert('Failed to parse JSON: ' + (e as Error).message);
    }
  };

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

  // Pre-calculate and sort timeline
  const sortedTimeline = useMemo(() => {
    return [...(data.timeline || [])].sort((a, b) => {
      const ueiA = a.uei !== undefined ? a.uei : (parseDateToUEI(activeCalendar, a.startDate || a.date) ?? -1);
      const ueiB = b.uei !== undefined ? b.uei : (parseDateToUEI(activeCalendar, b.startDate || b.date) ?? -1);
      return ueiA - ueiB;
    });
  }, [data.timeline, activeCalendar]);

  // Pre-calculate UEI for calendar map
  const eventsByUEI = useMemo(() => {
    const map = new Map<number, TimelineEvent[]>();
    sortedTimeline.forEach(event => {
       if (event.uei !== undefined) {
         const list = map.get(event.uei) || [];
         list.push(event);
         map.set(event.uei, list);
       }
    });
    return map;
  }, [sortedTimeline]);

  const currentMonth = activeCalendar.months[currentMonthIndex] || { name: 'Unknown', days: 30 };
  const daysPerWeek = activeCalendar.daysPerWeek || 7;

  // Use engine for true month length if fantasy
  const trueMonthLength = useMemo(() => {
    if (rawActiveCalendar?.type === 'fantasy-calendar' && rawActiveCalendar.fantasyData) {
      const monthId = Number(rawActiveCalendar.fantasyData.static_data.months[currentMonthIndex]?.id);
      return FantasyCalendarEngine.getMonthLength(rawActiveCalendar.fantasyData, monthId, currentYear);
    }
    return currentMonth.days;
  }, [rawActiveCalendar, currentMonthIndex, currentYear]);

  const gridCells = Array.from({ length: trueMonthLength }, (_, i) => i + 1);

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
      <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-10 shrink-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-0 hidden sm:block">
              <h1 className="ph-section-title text-2xl md:text-3xl flex items-center gap-3">
                <Calendar size={32} className="text-indigo-600" /> Plot & Timeline
              </h1>
            </div>
            <div className="flex items-center gap-4 ml-auto">
              <button 
                onClick={handleImportFantasyCalendar}
                className="ph-button-secondary text-[10px] py-2"
                title="Import from fantasy-calendar.com"
              >
                <Download size={14} /> Import Fantasy
              </button>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search..."
                  className="ph-input pl-12 w-48 lg:w-64"
                />
              </div>
            </div>
          </div>
          <div className="ph-tab-container overflow-x-auto no-scrollbar flex items-center gap-2">
            <div className="sm:hidden flex items-center gap-2 shrink-0">
              <Calendar size={24} className="text-indigo-600" />
            </div>
            {Object.values(PlotTab).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`ph-tab ${activeTab === tab ? "ph-tab-active" : "ph-tab-inactive"}`}
                title={tab}
              >
                {tab === PlotTab.TIMELINE && <List size={14} />}
                {tab === PlotTab.CALENDAR && <Clock size={14} />}
                {tab === PlotTab.REVISIONS && <FileText size={14} />}
                {tab === PlotTab.AUDIT && <Sparkles size={14} />}
                <span className="hidden sm:inline">{tab}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-0 md:p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto px-4 md:px-0 pt-8 md:pt-0 min-h-full pb-40">
          {activeTab === PlotTab.TIMELINE && (
            <>
              <div className="flex flex-col sm:flex-row justify-end gap-3 md:gap-4 mb-8">
                <button 
                  onClick={onExtractSoftAnchors} 
                  disabled={isAnalyzing}
                  className="ph-button-secondary w-full sm:w-auto"
                >
                  <Sparkles size={16} /> Sync Anchors
                </button>
                <button onClick={() => onAddTimelineEvent({ id: Math.random().toString(), date: 'Year 1', title: 'New Event', description: '', charactersInvolved: [], location: '', source: 'manual' })} className="ph-button-primary w-full sm:w-auto">
                  <Plus size={16} /> Add Event
                </button>
              </div>
              <div className="relative border-l-2 border-slate-200 dark:border-slate-800 pl-4 md:pl-8 space-y-8 md:space-y-12">
                {sortedTimeline.map((event, idx) => (
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
                          <span className="text-[8px] font-mono opacity-30">UEI: {event.uei !== undefined ? event.uei : parseDateToUEI(activeCalendar, event.startDate || event.date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {event.source === 'ai' && <Sparkles size={14} className={event.isSoftAnchor ? 'text-indigo-400' : 'text-amber-400'} />}
                          <CardActions
                            itemName={event.title}
                            onEdit={() => {
                              handleSelectEvent(event);
                              onLinkClick('admin', event.id);
                            }}
                            onDelete={() => handleDelete(event.id)}
                          />
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
                    let uei = calculateUEI(activeCalendar, currentYear, currentMonthIndex, day);
                    let weekdayName = activeCalendar.weekDays[((uei % daysPerWeek) + daysPerWeek) % daysPerWeek];
                    
                    if (rawActiveCalendar?.type === 'fantasy-calendar' && rawActiveCalendar.fantasyData) {
                       const monthId = Number(rawActiveCalendar.fantasyData.static_data.months[currentMonthIndex]?.id);
                       const tempFD = { 
                         ...rawActiveCalendar.fantasyData, 
                         dynamic_data: { 
                           ...rawActiveCalendar.fantasyData.dynamic_data, 
                           year: currentYear, 
                           month_id: monthId, 
                           day 
                         } 
                       };
                       uei = FantasyCalendarEngine.calculateEpoch(tempFD);
                       weekdayName = FantasyCalendarEngine.getWeekday(rawActiveCalendar.fantasyData, uei);
                    }

                    const isToday = uei === activeCalendar.currentEpochDay;
                    const dayEvents = eventsByUEI.get(uei) || [];

                    return (
                      <div 
                        key={day} 
                        className={`min-h-[120px] p-2 border-r border-b border-slate-100 dark:border-slate-800 relative group transition-colors ${isToday ? 'bg-amber-50/50 dark:bg-amber-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-amber-500 text-white' : 'text-slate-500'}`}>
                            {day}
                          </div>
                          <span className="text-[8px] font-black text-slate-300 uppercase truncate px-1">{weekdayName}</span>
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

          {activeTab === PlotTab.AUDIT && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Continuity Scan</h2>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Identify factual contradictions in the world.</p>
                </div>
                <button 
                  onClick={onScanContinuity}
                  disabled={isAnalyzing}
                  className="ph-button-primary w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? <span className="animate-spin inline-block">⏳</span> : <Sparkles size={16} />} 
                  {isAnalyzing ? "Scanning..." : "Perform AI Audit"}
                </button>
              </div>

              <div className="space-y-4">
                {(!data.continuityErrors || data.continuityErrors.length === 0) ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Sparkles size={48} className="text-slate-200" />
                    <p className="text-slate-400 font-serif italic text-sm px-6">No continuity errors detected yet. Run a scan to find inconsistencies.</p>
                  </div>
                ) : (
                  data.continuityErrors.map(error => (
                    <div key={error.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border-l-8 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md" style={{ borderLeftColor: error.severity === 'high' ? '#ef4444' : error.severity === 'medium' ? '#f59e0b' : '#3b82f6' }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                            error.severity === 'high' ? 'bg-red-100 text-red-600' : 
                            error.severity === 'medium' ? 'bg-amber-100 text-amber-600' : 
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {error.severity} priority
                          </span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{error.type}</span>
                        </div>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 font-bold mb-2">{error.message}</p>
                      <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl text-xs font-mono text-slate-500 border border-slate-100 dark:border-slate-800 italic">
                        "{error.context}"
                      </div>
                      {error.entityIds && error.entityIds.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {error.entityIds.map(id => (
                            <button 
                              key={id}
                              onClick={() => onLinkClick('admin', id)}
                              className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-500 rounded hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
                            >
                              Explore {id.substring(0, 8)}...
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
