import React, { useState, useRef, useEffect } from 'react';
import { CalendarConfig, ProjectData, defaultCalendarConfig } from '../../types';
import { CalendarView } from '../Calendar2/CalendarView';
import { TimelineView } from '../Calendar2/TimelineView';
import { WeekView } from '../Calendar2/WeekView';
import { LunarChart } from '../Calendar2/LunarChart';
import { 
  Download, 
  Upload, 
  Calendar as CalendarIcon, 
  Clock, 
  Layout, 
  X, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface Calendar2ViewProps {
  data: ProjectData;
  onUpdateProject: (updates: Partial<ProjectData>) => void;
}

export const Calendar2View: React.FC<Calendar2ViewProps> = ({
  data,
  onUpdateProject
}) => {
  const config = data.calendarConfig || defaultCalendarConfig;

  // Merge timeline events into config for display
  const mergedConfig = {
    ...config,
    events: { ...config.events }
  };

  data.timeline.forEach(event => {
    if (event.month !== undefined && event.day !== undefined) {
      // Calculate global day index based on month/day
      let globalDayIdx = 0;
      for (let i = 0; i < event.month - 1; i++) {
        const monthName = config.months[i];
        if (monthName) {
          const daysInMonth = config.month_len[monthName] ?? 30;
          globalDayIdx += daysInMonth;
        }
      }
      globalDayIdx += (event.day - 1);
      
      const key = globalDayIdx.toString();
      if (!mergedConfig.events[key]) {
        mergedConfig.events[key] = [];
      }
      
      // Only add if not already present to avoid duplication
      if (!mergedConfig.events[key].includes(event.title)) {
        mergedConfig.events[key] = [...mergedConfig.events[key], event.title];
      }
    }
  });

  // Helper to convert global day index to month/day
  const globalDayToMonthDay = (globalDayIdx: number) => {
    let runningDay = 0;
    for (let i = 0; i < config.months.length; i++) {
      const monthName = config.months[i];
      const daysInMonth = config.month_len[monthName] ?? 30;
      if (runningDay + daysInMonth > globalDayIdx) {
        return {
          month: i + 1, // 1-indexed
          day: globalDayIdx - runningDay + 1 // 1-indexed
        };
      }
      runningDay += daysInMonth;
    }
    return { month: 1, day: 1 };
  };

  // Helper to sync calendar events to timeline (add new ones, remove deleted ones)
  const syncCalendarEventsToTimeline = (oldConfig: CalendarConfig, newConfig: CalendarConfig) => {
    let updatedTimeline = [...data.timeline];
    
    // Find events that were deleted from calendar
    Object.entries(oldConfig.events).forEach(([dayKey, eventTitles]) => {
      if (newConfig.events[dayKey]) {
        // Check which events were deleted
        eventTitles.forEach(title => {
          if (!newConfig.events[dayKey]?.includes(title)) {
            // This event was deleted, remove from timeline
            updatedTimeline = updatedTimeline.filter(e => 
              !(e.title === title && e.month !== undefined && e.day !== undefined)
            );
          }
        });
      } else {
        // Entire day was removed, remove all events from that day
        eventTitles.forEach(title => {
          updatedTimeline = updatedTimeline.filter(e => 
            !(e.title === title && e.month !== undefined && e.day !== undefined)
          );
        });
      }
    });
    
    return updatedTimeline;
  };

  const setConfig = (newConfig: CalendarConfig | ((prev: CalendarConfig) => CalendarConfig)) => {
    const updatedConfig = typeof newConfig === 'function' ? newConfig(config) : newConfig;
    const updatedTimeline = syncCalendarEventsToTimeline(config, updatedConfig);
    onUpdateProject({ 
      calendarConfig: updatedConfig,
      timeline: updatedTimeline
    });
  };
  
  const [view, setView] = useState<'calendar' | 'timeline' | 'week'>('calendar');
  const [selectedDay, setSelectedDay] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jumpDay, setJumpDay] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleDaySelect = (dayIdx: number) => {
    setSelectedDay(dayIdx);
    setIsModalOpen(true);
  };
  
  const [newEvent, setNewEvent] = useState('');
  const [editingEventIdx, setEditingEventIdx] = useState<number | null>(null);
  const [editedEventValue, setEditedEventValue] = useState('');
  
  const [note, setNote] = useState('');

  // Sync note when selectedDay changes
  useEffect(() => {
    setNote(config.notes[selectedDay.toString()] || '');
  }, [selectedDay, config.notes]);

  const saveNote = () => {
    setConfig(prev => ({
      ...prev,
      notes: {
        ...prev.notes,
        [selectedDay.toString()]: note
      }
    }));
  };

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.shortName || 'project'}_calendar_config.json`;
    a.click();
  };

  const importConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          setConfig(parsed);
        } catch (e) { alert('Invalid File'); }
      };
      reader.readAsText(file);
    }
  };

  const addEvent = () => {
    if (newEvent.trim()) {
      const { month, day } = globalDayToMonthDay(selectedDay);
      
      // Check if event already exists in timeline
      const existingEvent = data.timeline.find(e => 
        e.title === newEvent && e.month === month && e.day === day
      );
      
      // Add to calendar config - this will also sync to timeline via setConfig
      setConfig(prev => ({
        ...prev,
        events: {
          ...prev.events,
          [selectedDay.toString()]: [...(prev.events[selectedDay.toString()] || []), newEvent]
        }
      }));
      
      // Only add to timeline if it doesn't already exist
      if (!existingEvent) {
        const newTimelineEvent = {
          id: `evt-${Date.now()}`,
          title: newEvent,
          month,
          day,
          description: '',
          charactersInvolved: [],
          location: '',
          source: 'manual' as const,
          event_type: 'other'
        };
        onUpdateProject({ 
          timeline: [...data.timeline, newTimelineEvent]
        });
      }
      
      setNewEvent('');
    }
  };

  const startEdit = (idx: number, val: string) => {
    setEditingEventIdx(idx);
    setEditedEventValue(val);
  };

  const saveEdit = (idx: number) => {
      const oldEventTitle = (config.events[selectedDay.toString()] || [])[idx];
      const { month, day } = globalDayToMonthDay(selectedDay);
      
      // Update calendar config and timeline in one call
      const updatedEvents = [...(config.events[selectedDay.toString()] || [])];
      updatedEvents[idx] = editedEventValue;
      
      const updatedTimeline = data.timeline.map(e => {
        if (e.title === oldEventTitle && e.month === month && e.day === day) {
          return { ...e, title: editedEventValue };
        }
        return e;
      });
      
      onUpdateProject({ 
        calendarConfig: {
          ...config,
          events: { ...config.events, [selectedDay.toString()]: updatedEvents }
        },
        timeline: updatedTimeline
      });
      
      setEditingEventIdx(null);
      setEditedEventValue('');
  };

  const deleteEvent = (idx: number) => {
    const eventTitle = (config.events[selectedDay.toString()] || [])[idx];
    
    // Remove from calendar config
    const updatedEvents = [...(config.events[selectedDay.toString()] || [])];
    updatedEvents.splice(idx, 1);
    
    // Update config and timeline in one call to avoid duplication
    const { month, day } = globalDayToMonthDay(selectedDay);
    const updatedTimeline = data.timeline.filter(e => 
      !(e.title === eventTitle && e.month === month && e.day === day)
    );
    
    onUpdateProject({ 
      calendarConfig: {
        ...config,
        events: { ...config.events, [selectedDay.toString()]: updatedEvents }
      },
      timeline: updatedTimeline
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 ph-container">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20 ph-header">
        <div className="px-4 md:px-8 py-4 md:py-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0 hidden sm:block">
              <h1 className="ph-section-title text-2xl md:text-3xl flex items-center gap-3">
                <CalendarIcon size={32} className="text-indigo-600" /> Chronos Explorer
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={exportConfig} 
                className="ph-button-secondary py-2"
                title="Export Configuration"
              >
                <Download size={16} /> <span className="hidden lg:inline ml-2">Export</span>
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="ph-button-secondary py-2"
                title="Import Configuration"
              >
                <Upload size={16} /> <span className="hidden lg:inline ml-2">Import</span>
              </button>
              <input type="file" ref={fileInputRef} onChange={importConfig} className="hidden" accept=".json" />
              
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 ml-2">
                  <input 
                    type="number" 
                    value={jumpDay} 
                    onChange={(e) => setJumpDay(parseInt(e.target.value))} 
                    className="bg-transparent border-none text-xs font-black w-16 px-2 focus:ring-0 text-slate-700 dark:text-slate-300" 
                    placeholder="Day..."
                  />
                  <button 
                    onClick={() => handleDaySelect(jumpDay - 1)} 
                    className="bg-indigo-600 text-white p-1.5 rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20"
                  >
                    <ChevronRight size={14} />
                  </button>
              </div>
            </div>
          </div>
          
          <div className="ph-tab-container overflow-x-auto no-scrollbar flex items-center gap-2">
            <button 
              onClick={() => setView('calendar')} 
              className={`ph-tab ${view === 'calendar' ? 'ph-tab-active' : 'ph-tab-inactive'}`}
            >
              <Layout size={14} /> <span>Calendar</span>
            </button>
            <button 
              onClick={() => setView('timeline')} 
              className={`ph-tab ${view === 'timeline' ? 'ph-tab-active' : 'ph-tab-inactive'}`}
            >
              <Clock size={14} /> <span>Timeline</span>
            </button>
            <button 
              onClick={() => setView('week')} 
              className={`ph-tab ${view === 'week' ? 'ph-tab-active' : 'ph-tab-inactive'}`}
            >
              <CalendarIcon size={14} /> <span>Week</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-8 pb-32">
          {view === 'calendar' && <CalendarView config={mergedConfig} onSelectDay={handleDaySelect} />}
          {view === 'timeline' && <TimelineView config={mergedConfig} />}
          {view === 'week' && <WeekView config={mergedConfig} selectedDay={selectedDay} />}
          
          <LunarChart config={mergedConfig} />
        </div>
      </main>
      
      {/* Day Manager Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Day Manager</h2>
                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1">Global Cycle Day {selectedDay + 1}</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors text-slate-400"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-2">
              {/* Notes Section */}
              <section className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-500" /> Archivist Log
                  </h3>
                  <textarea 
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500/20 transition-all font-serif italic"
                      rows={4}
                      placeholder="Record observations for this cycle day..."
                  />
                  <button 
                    onClick={saveNote} 
                    className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-950/10"
                  >
                    <Save size={16} /> Commit Log Entry
                  </button>
              </section>

              {/* Events Section */}
              <section className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Clock size={14} className="text-indigo-500" /> Narrative Events
                </h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newEvent} 
                    onChange={(e) => setNewEvent(e.target.value)}
                    className="flex-grow bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    placeholder="Describe new event..."
                  />
                  <button 
                    onClick={addEvent} 
                    className="bg-indigo-600 text-white px-6 rounded-2xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="space-y-3 pt-2">
                  {(config.events[selectedDay.toString()] || []).length === 0 ? (
                    <p className="text-center py-8 text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                      No events recorded
                    </p>
                  ) : (
                    (config.events[selectedDay.toString()] || []).map((ev, i) => (
                      <div key={i} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 group transition-all hover:border-indigo-200 dark:hover:border-indigo-900/30">
                        {editingEventIdx === i ? (
                          <div className="flex-1 flex gap-2">
                            <input
                              value={editedEventValue}
                              onChange={(e) => setEditedEventValue(e.target.value)}
                              className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl p-2 flex-grow text-sm font-medium"
                              autoFocus
                            />
                            <button onClick={() => saveEdit(i)} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg">
                              <Save size={18} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{ev}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => startEdit(i, ev)} 
                                className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => deleteEvent(i)} 
                                className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
               <button 
                onClick={() => setIsModalOpen(false)}
                className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
               >
                Dismiss Manager
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
