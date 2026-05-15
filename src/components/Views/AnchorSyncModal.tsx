import React, { useState } from 'react';
import { TimelineEvent } from '../../types';
import { syncTimelineByAnchor, parseYear, formatDateDisplay, resetUnmarkedToUnknown } from '../../services/anchorsService';
import { X, RotateCcw } from 'lucide-react';

interface AnchorSyncModalProps {
  events: TimelineEvent[];
  isOpen: boolean;
  onClose: () => void;
  onSync: (updatedEvents: TimelineEvent[]) => void;
}

export const AnchorSyncModal: React.FC<AnchorSyncModalProps> = ({ events, isOpen, onClose, onSync }) => {
  const [selectedAnchorId, setSelectedAnchorId] = useState<string>('');
  const [newDate, setNewDate] = useState<string>('');
  const [previewChanges, setPreviewChanges] = useState<boolean>(false);
  const [editingAnchorDate, setEditingAnchorDate] = useState<string>('');
  const [showAnchorDateEditor, setShowAnchorDateEditor] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleResetDates = () => {
    if (window.confirm('This will set all non-anchor events to "Unknown Date". Fixed anchors will be preserved. Continue?')) {
      const updatedEvents = resetUnmarkedToUnknown(events);
      onSync(updatedEvents);
      handleClose();
    }
  };

  const handleSync = () => {
    if (!selectedAnchorId || !newDate) {
      alert('Please select an anchor event and enter a new date');
      return;
    }

    // Validate that we can parse the new date
    const newDateYear = parseYear(newDate);
    if (newDateYear === null) {
      alert(`Could not parse date "${newDate}". Try formats like "2010AD", "300YBP", "July 11, 2016", or "Year 100"`);
      return;
    }

    const anchorEvent = events.find(e => e.id === selectedAnchorId);
    if (!anchorEvent) {
      alert('Anchor event not found');
      return;
    }

    // Use editingAnchorDate if anchor date was just edited, otherwise use existing date
    const oldDate = editingAnchorDate || anchorEvent.startDate || anchorEvent.date;
    if (!oldDate) {
      alert(`Please set the current date for "${anchorEvent.title}" in the date field above, then try again.`);
      return;
    }

    console.log('[AnchorSync] Starting sync:', { selectedAnchorId, newDate, eventCount: events.length });
    
    // If we just edited the anchor date, we need to update the event first
    let eventsToSync = events;
    if (editingAnchorDate) {
      eventsToSync = events.map(e => 
        e.id === selectedAnchorId 
          ? { ...e, date: editingAnchorDate, startDate: editingAnchorDate }
          : e
      );
    }
    
    const updatedEvents = syncTimelineByAnchor(eventsToSync, selectedAnchorId, newDate);
    console.log('[AnchorSync] Updated events:', updatedEvents);
    
    // Count changes
    let changeCount = 0;
    updatedEvents.forEach((event, idx) => {
      const oldEventDate = events[idx]?.startDate || events[idx]?.date;
      const newEventDate = event.startDate || event.date;
      if (oldEventDate !== newEventDate) {
        changeCount++;
        console.log(`[AnchorSync] Changed: ${event.title} from "${oldEventDate}" to "${newEventDate}"`);
      }
    });
    
    if (changeCount === 0) {
      alert('No events were updated (all events may already have matching dates)');
    } else {
      alert(`Timeline synced! ${changeCount} event(s) updated.`);
    }
    
    onSync(updatedEvents);
    handleClose();
  };

  const handleClose = () => {
    setSelectedAnchorId('');
    setNewDate('');
    setPreviewChanges(false);
    setEditingAnchorDate('');
    setShowAnchorDateEditor(false);
    onClose();
  };

  const handleSaveAnchorDate = () => {
    if (!editingAnchorDate) {
      alert('Please enter a date');
      return;
    }
    const yearCheck = parseYear(editingAnchorDate);
    if (yearCheck === null) {
      alert(`Could not parse date "${editingAnchorDate}". Try formats like "2010AD", "300YBP", "July 11, 2016", or "Year 100"`);
      return;
    }
    setShowAnchorDateEditor(false);
  };

  const anchorEvent = events.find(e => e.id === selectedAnchorId);
  const previewUpdates = selectedAnchorId && newDate ? syncTimelineByAnchor(events, selectedAnchorId, newDate) : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sync Timeline Anchors</h2>
          <button onClick={handleClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Event count info */}
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {events.length} timeline event(s) available
          </div>

          {events.length === 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-700 dark:text-red-300">
                No timeline events found. Add some events to your timeline first.
              </p>
            </div>
          )}

          {/* Help Text */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex justify-between items-start gap-4">
              <p className="text-sm text-blue-900 dark:text-blue-300">
                <strong>How it works:</strong> Select an anchor event and set its new date (e.g., "2010AD" or "300YBP"). 
                Unmarked events will shift or interpolate while other soft anchors remain fixed.
              </p>
              <button
                onClick={handleResetDates}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-800/60 text-blue-700 dark:text-blue-300 rounded-md text-xs font-bold transition-colors border border-blue-200 dark:border-blue-700"
                title="Clear all dates from non-anchor events"
              >
                <RotateCcw size={14} /> Reset Unmarked
              </button>
            </div>
          </div>

          {/* Anchor Event Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Select Anchor Event
            </label>
            <div className="flex gap-2">
              <select
                value={selectedAnchorId}
                onChange={(e) => {
                  setSelectedAnchorId(e.target.value);
                  setPreviewChanges(false);
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">-- Choose an event --</option>
                {events.map(event => {
                  const hasDate = event.startDate || event.date;
                  return (
                    <option key={event.id} value={event.id}>
                      {event.title} (Current: {hasDate || 'No date'})
                    </option>
                  );
                })}
              </select>
              <button
                onClick={handleClose}
                className="px-3 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Close modal and reopen to refresh event data"
              >
                ↻ Refresh
              </button>
            </div>
            
            {/* Show selected event's date status with inline editor */}
            {selectedAnchorId && (
              <div className="mt-3 space-y-2">
                {showAnchorDateEditor ? (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <label className="text-xs font-semibold text-blue-900 dark:text-blue-100 block mb-2">
                      Set Current Date for "{anchorEvent?.title}"
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editingAnchorDate}
                        onChange={(e) => setEditingAnchorDate(e.target.value)}
                        placeholder="e.g., 2010AD, 300YBP, July 11 2016"
                        className="flex-1 px-3 py-2 text-sm rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveAnchorDate}
                        className="px-3 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setShowAnchorDateEditor(false);
                          setEditingAnchorDate('');
                        }}
                        className="px-3 py-2 text-xs font-semibold bg-slate-300 dark:bg-slate-600 text-slate-900 dark:text-white rounded hover:bg-slate-400 dark:hover:bg-slate-500 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {(() => {
                      const currentDate = editingAnchorDate || anchorEvent?.startDate || anchorEvent?.date;
                      if (currentDate) {
                        return (
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 p-2 rounded flex items-center justify-between">
                            <span>✓ Current date: {currentDate}</span>
                            <button
                              onClick={() => {
                                setEditingAnchorDate(currentDate);
                                setShowAnchorDateEditor(true);
                              }}
                              className="text-xs px-2 py-1 bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100 rounded hover:bg-green-300 dark:hover:bg-green-700"
                            >
                              Edit
                            </button>
                          </div>
                        );
                      } else {
                        return (
                          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 p-3 rounded">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold">⚠ No date set</span>
                              <button
                                onClick={() => setShowAnchorDateEditor(true)}
                                className="text-xs px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold"
                              >
                                Set Date
                              </button>
                            </div>
                            <p className="text-[11px]">Click "Set Date" to enter the current date for this event, then use it as your anchor point.</p>
                          </div>
                        );
                      }
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* New Date Input */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Set New Date
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                placeholder="e.g., 2010AD, 300YBP, July 11 2016, or Year 100"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Formats: "2010AD", "300YBP", "July 11, 2016", "Year 100", "2010"
              </p>
            </div>
          </div>

          {/* Date Conversion Preview */}
          {newDate && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <strong>Parsed date:</strong> {formatDateDisplay(newDate)}
              </p>
            </div>
          )}

          {/* Preview Toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={previewChanges}
              onChange={(e) => setPreviewChanges(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Preview changes
            </span>
          </label>

          {/* Auto Preview when sync is ready */}
          {selectedAnchorId && newDate && !previewChanges && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                ✓ Ready to sync. Check "Preview changes" above to see what will be updated.
              </p>
            </div>
          )}

          {/* Preview Table */}
          {previewChanges && previewUpdates.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-900 dark:text-white">Event</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-900 dark:text-white">Old Date</th>
                      <th className="px-3 py-2 text-center text-slate-500 dark:text-slate-400">→</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-900 dark:text-white">New Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {previewUpdates.map((event, idx) => {
                      const oldEvent = events.find(e => e.id === event.id);
                      const oldDate = oldEvent?.startDate || oldEvent?.date || '';
                      const newDateVal = event.startDate || event.date || '';
                      return (
                        <tr key={event.id} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-700/50'}>
                          <td className="px-3 py-2 text-slate-900 dark:text-white truncate max-w-xs">
                            {event.title}
                          </td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{oldDate}</td>
                          <td className="px-3 py-2 text-center text-slate-400">→</td>
                          <td className="px-3 py-2 font-medium text-blue-600 dark:text-blue-400">{newDateVal}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={handleSync}
              disabled={!selectedAnchorId || !newDate || events.length === 0}
              className="flex-1 ph-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sync All Dates
            </button>
            <button
              onClick={handleClose}
              className="flex-1 ph-button-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
