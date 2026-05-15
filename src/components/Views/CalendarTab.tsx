import React, { useState, useMemo } from 'react';
import { CalendarConfig, defaultCalendarConfig, TimelineEvent } from '../../types';
import { calendarPresets, getMoonEmoji, getDateKey, calculateMoonPhase } from '../../services/calendarEngine';
import { formatDateDisplay, parseYear, parseTimelineDate, dateToCalendarInfo } from '../../services/anchorsService';
import { Plus, Download, Upload, Settings, RefreshCw, X, ArrowLeftToLine, ArrowRightToLine, ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarTabProps {
  config: CalendarConfig;
  onConfigChange: (config: CalendarConfig) => void;
  timelineEvents?: TimelineEvent[];
}

// Helper to convert date key to human-readable format with year
const formatDateKey = (dateKey: string, config: CalendarConfig): string => {
  const [monthIndex, day] = dateKey.split('-').map(Number);
  if (!monthIndex || !day || monthIndex < 1 || monthIndex > config.months.length) {
    return dateKey;
  }
  const monthName = config.months[monthIndex - 1];
  return `${monthName} ${day}, ${config.year}`;
};

// Find the earliest year from timeline events
const findEarliestYear = (events?: TimelineEvent[]): number => {
  if (!events || events.length === 0) return 1;
  
  const years = events
    .map(e => {
      const dateStr = e.startDate || e.date || '';
      return parseYear(dateStr);
    })
    .filter((y): y is number => y !== null);
  
  if (years.length === 0) return 1;
  return Math.min(...years);
};

// Find the latest year from timeline events
const findLatestYear = (events?: TimelineEvent[]): number => {
  if (!events || events.length === 0) return 1;
  
  const years = events
    .map(e => {
      const dateStr = e.startDate || e.date || '';
      return parseYear(dateStr);
    })
    .filter((y): y is number => y !== null);
  
  if (years.length === 0) return 1;
  return Math.max(...years);
};

export const CalendarTab: React.FC<CalendarTabProps> = ({ config, onConfigChange, timelineEvents }) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [initializationDone, setInitializationDone] = useState(false);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  const [isEditingMonth, setIsEditingMonth] = useState(false);
  const [isEditingYear, setIsEditingYear] = useState(false);

  // Initialize calendar year from earliest timeline event on first load
  React.useEffect(() => {
    if (!initializationDone && timelineEvents && timelineEvents.length > 0) {
      const earliestYear = findEarliestYear(timelineEvents);
      
      // Only update if year is different and we haven't set it yet
      if (config.year === 1 && earliestYear !== 1) {
        onConfigChange({ ...config, year: earliestYear });
      }
      
      setInitializationDone(true);
    }
  }, [timelineEvents, initializationDone, config, onConfigChange]);

  const handleJumpToEarliest = () => {
    const earliestYear = findEarliestYear(timelineEvents);
    onConfigChange({ ...config, year: earliestYear });
  };

  const handleJumpToLatest = () => {
    const latestYear = findLatestYear(timelineEvents);
    onConfigChange({ ...config, year: latestYear });
  };

  const handlePrevMonth = () => {
    if (currentMonthIndex > 0) {
      setCurrentMonthIndex(currentMonthIndex - 1);
    } else {
      setCurrentMonthIndex(config.n_months - 1);
      onConfigChange({ ...config, year: config.year - 1 });
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex < config.n_months - 1) {
      setCurrentMonthIndex(currentMonthIndex + 1);
    } else {
      setCurrentMonthIndex(0);
      onConfigChange({ ...config, year: config.year + 1 });
    }
  };

  const handleMonthSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentMonthIndex(parseInt(e.target.value));
    setIsEditingMonth(false);
  };

  // Map timeline events by their date keys for calendar display, filtered by current year
  const timelineEventsByDate = useMemo(() => {
    const mapped: Record<string, TimelineEvent[]> = {};
    if (!timelineEvents) return mapped;
    
    timelineEvents.forEach(event => {
      // Priority 1: Explicitly set month and day
      if (event.month !== undefined && event.day !== undefined) {
        const dateKey = getDateKey(event.month - 1, event.day);
        if (!mapped[dateKey]) mapped[dateKey] = [];
        mapped[dateKey].push(event);
        return;
      }

      // Priority 2: Parsed from date string
      const dateStr = event.startDate || event.date || '';
      if (!dateStr || dateStr === 'Unknown Date') return;

      const totalDays = parseTimelineDate(dateStr);
      if (totalDays !== null) {
        const info = dateToCalendarInfo(totalDays, config);
        // Only show if it matches the current year in view
        if (info.year === config.year) {
          const dateKey = getDateKey(info.monthIndex, info.day);
          if (!mapped[dateKey]) mapped[dateKey] = [];
          mapped[dateKey].push(event);
        }
      }
    });
    return mapped;
  }, [timelineEvents, config.year, config.month_len, config.months, config.year_len]);

  // Auto-populate calendar events from timeline on sync
  // This combines timeline events with calendar events
  const getCalendarEventsForDate = (dateKey: string): string[] => {
    const calendarEvents = config.events[dateKey] || [];
    const timelineEventsForDate = timelineEventsByDate[dateKey] || [];
    
    // Get timeline event titles that aren't already in calendar events
    const timelineEventTitles = timelineEventsForDate.map(e => e.title);
    const combined = [...new Set([...calendarEvents, ...timelineEventTitles])];
    
    return combined;
  };

  const handleAddEvent = (dateKey: string) => {
    const eventName = prompt('Event name:');
    if (eventName) {
      const events = config.events[dateKey] || [];
      onConfigChange({
        ...config,
        events: {
          ...config.events,
          [dateKey]: [...events, eventName]
        }
      });
    }
  };

  const handleRemoveEvent = (dateKey: string, index: number) => {
    const events = config.events[dateKey] || [];
    onConfigChange({
      ...config,
      events: {
        ...config.events,
        [dateKey]: events.filter((_, i) => i !== index)
      }
    });
  };

  const handleAddNote = (dateKey: string) => {
    const note = prompt('Note:');
    if (note) {
      onConfigChange({
        ...config,
        notes: {
          ...config.notes,
          [dateKey]: note
        }
      });
    }
  };

  const handleApplyPreset = (presetName: string) => {
    setSelectedPreset(presetName);
    const preset = calendarPresets[presetName];
    if (preset) {
      onConfigChange({ ...config, ...preset.config, year: config.year });
    }
  };

  const handleYearChange = (newYear: number) => {
    onConfigChange({ ...config, year: newYear });
  };

  const handleExportConfig = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "calendar_config.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string) as CalendarConfig;
          onConfigChange(json);
        } catch (error) {
          alert("Invalid JSON file");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSyncTimeline = () => {
    if (!timelineEvents || timelineEvents.length === 0) {
      alert('No timeline events to sync');
      return;
    }
    
    const syncedEvents = { ...config.events };
    timelineEvents.forEach(event => {
      const dateStr = event.startDate || event.date || '';
      if (dateStr && dateStr !== 'Unknown Date') {
        const totalDays = parseTimelineDate(dateStr);
        if (totalDays !== null) {
          const info = dateToCalendarInfo(totalDays, config);
          const dateKey = getDateKey(info.monthIndex, info.day);
          
          if (!syncedEvents[dateKey]) syncedEvents[dateKey] = [];
          const eventName = event.title;
          if (!syncedEvents[dateKey].includes(eventName)) {
            syncedEvents[dateKey].push(eventName);
          }
        }
      }
    });
    
    onConfigChange({
      ...config,
      events: syncedEvents
    });
    alert('Timeline events synced to calendar');
  };

  let currentDayOfWeek = config.first_day;
  let daysPassedInYear = 0;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button 
                onClick={handlePrevMonth}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="text-center min-w-[150px]">
                {isEditingMonth ? (
                  <select
                    autoFocus
                    value={currentMonthIndex}
                    onChange={handleMonthSelect}
                    onBlur={() => setIsEditingMonth(false)}
                    className="ph-input text-lg font-black text-center"
                  >
                    {config.months.slice(0, config.n_months).map((m, i) => (
                      <option key={m} value={i}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <h3 
                    onClick={() => setIsEditingMonth(true)}
                    className="text-2xl font-black text-slate-900 dark:text-white cursor-pointer hover:text-indigo-600 transition-colors"
                  >
                    {config.months[currentMonthIndex]}
                  </h3>
                )}
                <div className="flex items-center justify-center gap-2 mt-1">
                  {isEditingYear ? (
                    <input
                      type="number"
                      autoFocus
                      value={config.year}
                      onChange={(e) => handleYearChange(parseInt(e.target.value))}
                      onBlur={() => setIsEditingYear(false)}
                      onKeyDown={(e) => e.key === 'Enter' && setIsEditingYear(false)}
                      className="ph-input text-sm font-black w-24 text-center"
                    />
                  ) : (
                    <p 
                      onClick={() => setIsEditingYear(true)}
                      className="text-sm font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-indigo-600 transition-colors"
                    >
                      Year {config.year}
                    </p>
                  )}
                  <div className="flex items-center gap-0.5">
                    <button 
                      onClick={handleJumpToEarliest}
                      className="p-1 hover:text-indigo-600 text-slate-400 transition-colors"
                      title="Jump to Earliest"
                    >
                      <ArrowLeftToLine size={12} />
                    </button>
                    <button 
                      onClick={handleJumpToLatest}
                      className="p-1 hover:text-indigo-600 text-slate-400 transition-colors"
                      title="Jump to Latest"
                    >
                      <ArrowRightToLine size={12} />
                    </button>
                  </div>
                </div>
              </div>
              <button 
                onClick={handleNextMonth}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {timelineEvents && timelineEvents.length > 0 && (
              <button
                onClick={handleSyncTimeline}
                className="ph-button-secondary flex items-center gap-2"
              >
                <RefreshCw size={16} /> Sync Timeline
              </button>
            )}
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="ph-button-secondary flex items-center gap-2"
            >
              <Settings size={16} /> Settings
            </button>
            <button
              onClick={handleExportConfig}
              className="ph-button-secondary flex items-center gap-2"
            >
              <Download size={16} /> Export
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {settingsOpen && (
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800 max-h-96 overflow-y-auto">
            {/* Preset */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-2">Calendar Preset</label>
              <select
                value={selectedPreset}
                onChange={(e) => handleApplyPreset(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              >
                <option value="">Select a preset...</option>
                {Object.keys(calendarPresets).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              {selectedPreset && calendarPresets[selectedPreset] && (
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 italic">
                  {calendarPresets[selectedPreset].description}
                </p>
              )}
            </div>

            {/* Quick Settings - Row 1: Year, Year Length, Number of Months */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-1">Year</label>
                <input
                  type="number"
                  value={config.year}
                  onChange={(e) => handleYearChange(parseInt(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-1">Year Length</label>
                <input
                  type="number"
                  value={config.year_len}
                  onChange={(e) => onConfigChange({ ...config, year_len: parseInt(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-1">Months</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={config.n_months}
                  onChange={(e) => onConfigChange({ ...config, n_months: parseInt(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                />
              </div>
            </div>

            {/* Quick Settings - Row 2: Week Length, First Day, Number of Moons */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-1">Week Len</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.week_len}
                  onChange={(e) => onConfigChange({ ...config, week_len: parseInt(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-1">First Day</label>
                <input
                  type="number"
                  min="0"
                  max={config.week_len - 1}
                  value={config.first_day}
                  onChange={(e) => onConfigChange({ ...config, first_day: parseInt(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-1">Moons</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={config.n_moons}
                  onChange={(e) => onConfigChange({ ...config, n_moons: parseInt(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                />
              </div>
            </div>

            {/* Month Names */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-1">Month Names</label>
              <input
                type="text"
                value={config.months.join(', ')}
                onChange={(e) => {
                  const months = e.target.value.split(',').map(s => s.trim());
                  onConfigChange({ ...config, months });
                }}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono text-xs"
              />
            </div>

            {/* Month Days */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-1">Month Days (in order)</label>
              <input
                type="text"
                value={config.months.map(m => config.month_len[m] || 30).join(', ')}
                onChange={(e) => {
                  const values = e.target.value.split(',').map(s => parseInt(s.trim()));
                  const newLen: Record<string, number> = {};
                  config.months.forEach((m, i) => {
                    newLen[m] = !isNaN(values[i]) ? values[i] : 30;
                  });
                  onConfigChange({ ...config, month_len: newLen });
                }}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono text-xs"
              />
            </div>

            {/* Weekday Names */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-1">Weekday Names</label>
              <input
                type="text"
                value={config.weekdays.join(', ')}
                onChange={(e) => {
                  const weekdays = e.target.value.split(',').map(s => s.trim());
                  onConfigChange({ ...config, weekdays });
                }}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono text-xs"
              />
            </div>

            {/* Moon Names */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-1">Moon Names</label>
              <input
                type="text"
                value={config.moons.join(', ')}
                onChange={(e) => {
                  const moons = e.target.value.split(',').map(s => s.trim());
                  const newCyc: Record<string, number> = {};
                  const newShf: Record<string, number> = {};
                  moons.forEach(m => {
                    newCyc[m] = config.lunar_cyc[m] || 29.53;
                    newShf[m] = config.lunar_shf[m] || 0;
                  });
                  onConfigChange({ ...config, moons, lunar_cyc: newCyc, lunar_shf: newShf });
                }}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono text-xs"
              />
            </div>

            {/* Lunar Cycles and Shifts - Side by side */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-1">Lunar Cycles</label>
                <input
                  type="text"
                  value={config.moons.map(m => config.lunar_cyc[m] || 29.53).join(', ')}
                  onChange={(e) => {
                    const values = e.target.value.split(',').map(s => parseFloat(s.trim()));
                    const newCyc: Record<string, number> = {};
                    config.moons.forEach((m, i) => {
                      newCyc[m] = !isNaN(values[i]) ? values[i] : 29.53;
                    });
                    onConfigChange({ ...config, lunar_cyc: newCyc });
                  }}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-1">Lunar Shifts</label>
                <input
                  type="text"
                  value={config.moons.map(m => config.lunar_shf[m] || 0).join(', ')}
                  onChange={(e) => {
                    const values = e.target.value.split(',').map(s => parseFloat(s.trim()));
                    const newShf: Record<string, number> = {};
                    config.moons.forEach((m, i) => {
                      newShf[m] = !isNaN(values[i]) ? values[i] : 0;
                    });
                    onConfigChange({ ...config, lunar_shf: newShf });
                  }}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="space-y-6">
        {(() => {
          // Calculate start day of week for current month
          // To do this accurately for any month/year, we need to know how many days passed since Year 1
          const yearsPassed = config.year - 1;
          const daysFromFullYears = yearsPassed * config.year_len;
          
          let daysInPrevMonthsOfCurrentYear = 0;
          for (let i = 0; i < currentMonthIndex; i++) {
            daysInPrevMonthsOfCurrentYear += config.month_len[config.months[i]] || 30;
          }
          
          const totalDaysPassedSinceYearOne = daysFromFullYears + daysInPrevMonthsOfCurrentYear;
          const startDayOfWeek = (config.first_day + totalDaysPassedSinceYearOne) % config.week_len;
          const daysPassedInYearBeforeThisMonth = daysInPrevMonthsOfCurrentYear;

          const monthName = config.months[currentMonthIndex];
          const daysInMonth = config.month_len[monthName] || 30;
          const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

          return (
            <div key={monthName} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${config.week_len}, minmax(0, 1fr))` }}>
                {/* Weekday headers */}
                {config.weekdays.map(d => (
                  <div key={d} className="text-center text-xs font-bold text-slate-500 dark:text-slate-400 py-2">
                    {d}
                  </div>
                ))}
                
                {/* Empty cells for leading days */}
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-28"></div>
                ))}
                
                {/* Calendar days */}
                {days.map(day => {
                  const dateKey = getDateKey(currentMonthIndex, day);
                  const calendarEvents = config.events[dateKey] || [];
                  const timelineEventsForDate = timelineEventsByDate[dateKey] || [];
                  const note = config.notes[dateKey];
                  
                  const moons = config.moons.slice(0, config.n_moons).map(moon => {
                    const phase = calculateMoonPhase(daysPassedInYearBeforeThisMonth + day, moon, config);
                    return getMoonEmoji(phase);
                  });

                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDate(dateKey)}
                      className="h-28 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 flex flex-col gap-1 overflow-hidden cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                    >
                      <div className="font-bold text-slate-900 dark:text-white">{day}</div>
                      <div className="flex gap-0.5 text-sm">{moons.join('')}</div>
                      <div className="flex-1 overflow-y-auto space-y-0.5">
                        {timelineEventsForDate.map((e, i) => (
                          <div key={`timeline-${i}`} className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 p-0.5 rounded truncate font-semibold" title={e.title}>
                            {e.title}
                          </div>
                        ))}
                        {calendarEvents.map((e, i) => (
                          <div key={`calendar-${i}`} className="text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 p-0.5 rounded truncate">
                            {e}
                          </div>
                        ))}
                        {note && <div className="text-[10px] p-0.5 italic text-slate-500 dark:text-slate-400 truncate">{note}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Date Editor Modal */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl w-full max-w-sm space-y-4 border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">{formatDateKey(selectedDate, config)}</h3>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Events */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">Events</label>
                <button
                  onClick={() => handleAddEvent(selectedDate)}
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 text-xs font-bold"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
              <div className="space-y-2">
                {(config.events[selectedDate] || []).map((event, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded text-sm text-slate-700 dark:text-slate-300"
                  >
                    <span>{event}</span>
                    <button
                      onClick={() => handleRemoveEvent(selectedDate, idx)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-2">Note</label>
              <input
                type="text"
                value={config.notes[selectedDate] || ""}
                onChange={(e) => {
                  onConfigChange({
                    ...config,
                    notes: {
                      ...config.notes,
                      [selectedDate]: e.target.value
                    }
                  });
                }}
                placeholder="Add a note for this date..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
              {!config.notes[selectedDate] && (
                <button
                  onClick={() => handleAddNote(selectedDate)}
                  className="mt-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 text-xs font-bold flex items-center gap-1"
                >
                  <Plus size={12} /> Add Note
                </button>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setSelectedDate(null)}
              className="w-full ph-button-primary"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
