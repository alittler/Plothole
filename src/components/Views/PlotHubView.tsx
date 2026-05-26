import React, { useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ViewType, ProjectData, TimelineEvent, defaultCalendarConfig, CalendarConfig } from '../../types';
import { parseYear } from '../../services/anchorsService';
import { Clock, Plus, Sparkles, Edit2, List, FileText, Search, Download, Calendar as CalendarIcon } from 'lucide-react';
import { CardActions } from '../ui/CardActions';
import { useEditModal } from '../../contexts/EditModalContext';
import { CalendarTab } from './CalendarTab';
import { AnchorSyncModal } from './AnchorSyncModal';
import { TimelineEventEditModal } from './TimelineEventEditModal';

interface PlotHubViewProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  data: ProjectData;
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
  AUDIT = 'Audit'
}

export const PlotHubView: React.FC<PlotHubViewProps> = ({
  data, onAddTimelineEvent, onUpdateProject, onExtractSoftAnchors, onScanContinuity, isAnalyzing, onLinkClick
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openEditor } = useEditModal();
  const activeTab = (searchParams.get('tab') as PlotTab) || PlotTab.TIMELINE;
  const setActiveTab = (tab: PlotTab) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    router.push(`?${params.toString()}`);
  };

  const [manuscriptSearch, setManuscriptSearch] = useState('');
  const [showAnchorSync, setShowAnchorSync] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [showEventEditor, setShowEventEditor] = useState(false);

  // Helper to sync timeline events to calendar config
  const syncTimelineToCalendarConfig = (timeline: TimelineEvent[], calendarConfig: CalendarConfig): CalendarConfig => {
    const updatedEvents = { ...calendarConfig.events };
    
    // Add all timeline events that have month/day to calendar
    timeline.forEach(event => {
      if (event.month !== undefined && event.day !== undefined) {
        const dateKey = `${event.month}-${event.day}`;
        if (!updatedEvents[dateKey]) {
          updatedEvents[dateKey] = [];
        }
        if (!updatedEvents[dateKey].includes(event.title)) {
          updatedEvents[dateKey] = [...updatedEvents[dateKey], event.title];
        }
      }
    });
    
    return { ...calendarConfig, events: updatedEvents };
  };

  // Helper to remove deleted timeline events from calendar config
  const removeDeletedEventFromCalendarConfig = (deletedEvent: TimelineEvent, calendarConfig: CalendarConfig): CalendarConfig => {
    if (deletedEvent.month === undefined || deletedEvent.day === undefined) {
      return calendarConfig;
    }
    
    const dateKey = `${deletedEvent.month}-${deletedEvent.day}`;
    const updatedEvents = { ...calendarConfig.events };
    
    if (updatedEvents[dateKey]) {
      updatedEvents[dateKey] = updatedEvents[dateKey].filter(title => title !== deletedEvent.title);
      if (updatedEvents[dateKey].length === 0) {
        delete updatedEvents[dateKey];
      }
    }
    
    return { ...calendarConfig, events: updatedEvents };
  };

  const handleDelete = (id: string) => {
    const deletedEvent = data.timeline.find(e => e.id === id);
    const updatedTimeline = data.timeline.filter(e => e.id !== id);
    
    let updatedCalendarConfig = data.calendarConfig || defaultCalendarConfig;
    if (deletedEvent) {
      updatedCalendarConfig = removeDeletedEventFromCalendarConfig(deletedEvent, updatedCalendarConfig);
    }
    
    onUpdateProject({ 
      timeline: updatedTimeline,
      calendarConfig: updatedCalendarConfig
    });
  };

  const handleAnchorSync = (updatedEvents: TimelineEvent[]) => {
    console.log('[PlotSystemView] Anchor sync received updated events:', updatedEvents);
    console.log('[PlotSystemView] Calling onUpdateProject with timeline:', updatedEvents.map(e => ({ id: e.id, title: e.title, date: e.startDate || e.date })));
    
    const updatedCalendarConfig = syncTimelineToCalendarConfig(
      updatedEvents, 
      data.calendarConfig || defaultCalendarConfig
    );
    
    onUpdateProject({ 
      timeline: updatedEvents,
      calendarConfig: updatedCalendarConfig
    });
  };

  const handleSaveEventEdit = (updatedEvent: TimelineEvent) => {
    const updatedTimeline = data.timeline.map(e => e.id === updatedEvent.id ? updatedEvent : e);
    const updatedCalendarConfig = syncTimelineToCalendarConfig(
      updatedTimeline,
      data.calendarConfig || defaultCalendarConfig
    );
    
    onUpdateProject({ 
      timeline: updatedTimeline,
      calendarConfig: updatedCalendarConfig
    });
    setShowEventEditor(false);
    setEditingEvent(null);
  };

  // Pre-calculate and sort timeline chronologically
  const sortedTimeline = useMemo(() => {
    const timeline = [...(data.timeline || [])];
    return timeline.sort((a, b) => {
      const yearA = parseYear(a.startDate || a.date || '');
      const yearB = parseYear(b.startDate || b.date || '');
      
      if (yearA !== null && yearB !== null) {
        return yearA - yearB;
      }
      
      // If one has no date, keep original relative order or put at the end
      if (yearA === null && yearB === null) return 0;
      return yearA === null ? 1 : -1;
    });
  }, [data.timeline]);

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-10 shrink-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-0 hidden sm:block">
              <h1 className="ph-section-title text-2xl md:text-3xl flex items-center gap-3">
                <Clock size={32} className="text-indigo-600" /> Plot & Timeline
              </h1>
            </div>
            <div className="flex items-center gap-4 ml-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={manuscriptSearch}
                  onChange={(e) => setManuscriptSearch(e.target.value)}
                  className="ph-input pl-12 w-48 lg:w-64"
                />
              </div>
            </div>
          </div>
          <div className="ph-tab-container overflow-x-auto no-scrollbar flex items-center gap-2">
            <div className="sm:hidden flex items-center gap-2 shrink-0">
              <Clock size={24} className="text-indigo-600" />
            </div>
            {Object.values(PlotTab).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`ph-tab ${activeTab === tab ? "ph-tab-active" : "ph-tab-inactive"}`}
                title={tab}
              >
                {tab === PlotTab.TIMELINE && <List size={14} />}
                {tab === PlotTab.CALENDAR && <CalendarIcon size={14} />}
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
                  onClick={() => setShowAnchorSync(true)}
                  disabled={isAnalyzing || data.timeline.length === 0}
                  className="ph-button-secondary w-full sm:w-auto"
                >
                  <Sparkles size={16} /> Sync Anchors
                </button>
                <button onClick={() => {
                  const newEvent: TimelineEvent = { 
                    id: Math.random().toString(), 
                    date: 'Year 1', 
                    title: 'New Event', 
                    description: '', 
                    charactersInvolved: [], 
                    location: '', 
                    source: 'manual',
                    event_type: 'other',
                    significance: 'minor',
                    real_world_sort_key: 0,
                    is_flashback: false,
                    participants: [],
                    field_notes: []
                  };
                  onAddTimelineEvent(newEvent);
                  
                  // Sync new event to calendar config
                  const updatedCalendarConfig = syncTimelineToCalendarConfig(
                    [...data.timeline, newEvent],
                    data.calendarConfig || defaultCalendarConfig
                  );
                  onUpdateProject({ calendarConfig: updatedCalendarConfig });
                }} className="ph-button-primary w-full sm:w-auto">
                  <Plus size={16} /> Add Event
                </button>
              </div>
              <div className="relative border-l-2 border-slate-200 dark:border-slate-800 pl-4 md:pl-8 space-y-8 md:space-y-12">
                {sortedTimeline.map((event) => (
                  <div key={event.id} className="relative group">
                    <div className={`absolute -left-[17px] md:-left-[41px] top-0 w-3 md:h-4 md:w-4 h-3 rounded-full border-2 md:border-4 border-white dark:border-slate-950 shadow-sm ${event.isSoftAnchor ? 'bg-indigo-400 border-dashed' : 'bg-amber-500'}`} />
                    <div 
                      className={`p-4 md:p-6 rounded-2xl shadow-sm border hover:shadow-md transition-all cursor-pointer ${event.isSoftAnchor ? 'bg-indigo-50/30 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black uppercase tracking-widest ${event.isSoftAnchor ? 'text-indigo-500' : 'text-amber-600'}`}>{event.date || event.startDate || 'No date'}</span>
                          {event.isSoftAnchor && <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded uppercase tracking-widest font-black flex items-center gap-1"><Clock size={10} /> Soft Anchor</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          {event.source === 'ai' && <Sparkles size={14} className={event.isSoftAnchor ? 'text-indigo-400' : 'text-amber-400'} />}
                          <CardActions
                            itemName={event.title}
                            onEdit={() => {
                              setEditingEvent(event);
                              setShowEventEditor(true);
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
            <div className="animate-in fade-in duration-500">
              <CalendarTab 
                config={data.calendarConfig || defaultCalendarConfig}
                onConfigChange={(newConfig) => {
                  onUpdateProject({ calendarConfig: newConfig });
                }}
                timelineEvents={data.timeline}
              />
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

      {/* Anchor Sync Modal */}
      <AnchorSyncModal
        events={sortedTimeline}
        isOpen={showAnchorSync}
        onClose={() => setShowAnchorSync(false)}
        onSync={handleAnchorSync}
      />

      {/* Timeline Event Edit Modal */}
      {editingEvent && (
        <TimelineEventEditModal
          event={editingEvent}
          isOpen={showEventEditor}
          onClose={() => {
            setShowEventEditor(false);
            setEditingEvent(null);
          }}
          onSave={handleSaveEventEdit}
        />
      )}
    </div>
  );
};
