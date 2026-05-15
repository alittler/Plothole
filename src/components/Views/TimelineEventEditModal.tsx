import React, { useState, useEffect } from 'react';
import { TimelineEvent } from '../../types';
import { X } from 'lucide-react';

interface TimelineEventEditModalProps {
  event: TimelineEvent;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedEvent: TimelineEvent) => void;
}

export const TimelineEventEditModal: React.FC<TimelineEventEditModalProps> = ({
  event,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<TimelineEvent>(event);

  useEffect(() => {
    setFormData(event);
  }, [event, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof TimelineEvent, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  const handleReset = () => {
    setFormData(event);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[300] bg-black/30 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Edit Event</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={24} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Title
            </label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                Quick Date
              </label>
              <input
                type="text"
                value={formData.date || ''}
                onChange={(e) => handleChange('date', e.target.value)}
                placeholder="e.g., 2010AD, 300YBP"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                Month Index
              </label>
              <input
                type="number"
                min="1"
                value={formData.month || ''}
                onChange={(e) => handleChange('month', parseInt(e.target.value) || undefined)}
                placeholder="1-indexed"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                Day
              </label>
              <input
                type="number"
                min="1"
                value={formData.day || ''}
                onChange={(e) => handleChange('day', parseInt(e.target.value) || undefined)}
                placeholder="Day of month"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Event Type
            </label>
            <input
              type="text"
              value={formData.event_type || ''}
              onChange={(e) => handleChange('event_type', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Significance */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Significance
            </label>
            <select
              value={formData.significance || ''}
              onChange={(e) => handleChange('significance', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="">-- Select --</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Location
            </label>
            <input
              type="text"
              value={formData.location || ''}
              onChange={(e) => handleChange('location', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Is Flashback */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_flashback"
              checked={formData.is_flashback || false}
              onChange={(e) => handleChange('is_flashback', e.target.checked)}
              className="w-4 h-4 rounded border-slate-300"
            />
            <label htmlFor="is_flashback" className="text-sm font-semibold text-slate-900 dark:text-white">
              Is Flashback
            </label>
          </div>

          {/* Is Soft Anchor */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isSoftAnchor"
              checked={formData.isSoftAnchor || false}
              onChange={(e) => handleChange('isSoftAnchor', e.target.checked)}
              className="w-4 h-4 rounded border-slate-300"
            />
            <label htmlFor="isSoftAnchor" className="text-sm font-semibold text-slate-900 dark:text-white">
              Soft Anchor (for date synchronization)
            </label>
          </div>

          {/* Participants */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Participants (comma-separated)
            </label>
            <input
              type="text"
              value={(formData.participants || []).join(', ')}
              onChange={(e) => handleChange('participants', e.target.value.split(',').map(p => p.trim()).filter(p => p))}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Event Status */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Status
            </label>
            <select
              value={formData.eventStatus || ''}
              onChange={(e) => handleChange('eventStatus', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="">-- Select --</option>
              <option value="planned">Planned</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleReset}
            className="flex-1 px-4 py-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg font-semibold text-sm hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
