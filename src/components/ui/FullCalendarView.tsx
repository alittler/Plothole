import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { CalendarSystem, TimelineEvent } from '../../types';

interface FullCalendarViewProps {
  calendar: CalendarSystem;
  events: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
  onDateClick?: (date: Date) => void;
}

export const FullCalendarView: React.FC<FullCalendarViewProps> = ({
  calendar,
  events,
  onEventClick,
  onDateClick
}) => {
  // Map our TimelineEvents to FullCalendar events
  const fcEvents = events.map(ev => ({
    id: ev.id,
    title: ev.title,
    start: ev.startDate || ev.date, // This might need better parsing for UEI
    description: ev.description,
    extendedProps: { ...ev }
  }));

  return (
    <div className="full-calendar-container bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,listWeek'
        }}
        events={fcEvents}
        eventClick={(info) => {
          if (onEventClick) {
            onEventClick(info.event.extendedProps as TimelineEvent);
          }
        }}
        dateClick={(info) => {
          if (onDateClick) {
            onDateClick(info.date);
          }
        }}
        height="auto"
        themeSystem="standard"
      />
      <style jsx global>{`
        .fc {
          --fc-border-color: rgba(226, 232, 240, 0.1);
          --fc-daygrid-event-dot-width: 8px;
        }
        .dark .fc {
          --fc-page-bg-color: #0f172a;
          --fc-neutral-bg-color: #1e293b;
          --fc-list-event-hover-bg-color: #1e293b;
        }
        .fc-header-toolbar {
          padding: 1rem;
        }
        .fc-toolbar-title {
          font-size: 1.25rem !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
          letter-spacing: -0.025em !important;
        }
        .fc-button-primary {
          background-color: #4f46e5 !important;
          border-color: #4f46e5 !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          font-size: 0.75rem !important;
          letter-spacing: 0.05em !important;
          border-radius: 0.75rem !important;
        }
        .fc-button-primary:hover {
          background-color: #4338ca !important;
          border-color: #4338ca !important;
        }
        .fc-button-active {
          background-color: #3730a3 !important;
          border-color: #3730a3 !important;
        }
      `}</style>
    </div>
  );
};
