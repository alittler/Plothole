import React, { useState } from 'react';
import { ViewType, ProjectData, CalendarSystem, TimelineEvent } from '../../types';
import { Calendar, Clock, Plus, Sparkles, Edit2, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';

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
  onUpdateProject: (updates: Partial<ProjectData>) => void;
}

export const PlotSystemView: React.FC<PlotSystemViewProps> = ({
  data, onAddTimelineEvent, onUpdateTimelineEvent, onUpdateProject
}) => {
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);

  const handleSave = () => {
    if (editingEvent) {
      onUpdateTimelineEvent(editingEvent);
      setEditingEvent(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      onUpdateProject({ timeline: data.timeline.filter(e => e.id !== id) });
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">CHRONOLOGY & PLOT</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">The sequence of events that define your story.</p>
          </div>
          <button onClick={() => onAddTimelineEvent({ id: Math.random().toString(), date: 'Year 1', title: 'New Event', description: '', charactersInvolved: [], location: '', source: 'manual' })} className="px-6 py-2 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-colors flex items-center gap-2">
            <Plus size={18} /> Add Event
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative border-l-2 border-slate-200 dark:border-slate-800 pl-8 space-y-12">
            {data.timeline.map((event, idx) => (
              <div key={event.id} className="relative group">
                <div className="absolute -left-[41px] top-0 w-4 h-4 rounded-full bg-amber-500 border-4 border-white dark:border-slate-950 shadow-sm" />
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-amber-600 uppercase tracking-widest">{event.date}</span>
                    <div className="flex items-center gap-2">
                      {event.source === 'ai' && <Sparkles size={14} className="text-amber-400" />}
                      <button onClick={() => setEditingEvent(event)} className="p-1 text-slate-300 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(event.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{event.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{event.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {event.charactersInvolved.map(char => (
                      <span key={char} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-[10px] font-bold">
                        {char}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        isOpen={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        title="Edit Event"
        footer={
          <button onClick={handleSave} className="px-6 py-2 bg-amber-600 text-white rounded-xl font-bold">
            Save Event
          </button>
        }
      >
        {editingEvent && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Date / Time</label>
                <input
                  type="text"
                  value={editingEvent.date}
                  onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Title</label>
                <input
                  type="text"
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Description</label>
              <textarea
                value={editingEvent.description}
                onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                className="w-full h-32 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Characters Involved (comma separated)</label>
              <input
                type="text"
                value={editingEvent.charactersInvolved.join(', ')}
                onChange={(e) => setEditingEvent({ ...editingEvent, charactersInvolved: e.target.value.split(',').map(t => t.trim()) })}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
