import React, { useState, useCallback } from 'react';
import { X, Save, RotateCcw, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import {
  getValueType,
  flattenJSON,
  setNestedValue,
  coerceValue,
  validateJSON,
} from '../../utils/dynamicFormUtils';

export interface DynamicEditModalProps {
  isOpen: boolean;
  data: any;
  entityType: string;
  entityId: string;
  title?: string;
  onClose: () => void;
  onSave?: (data: any) => Promise<void>;
}

export const DynamicEditModal: React.FC<DynamicEditModalProps> = ({
  isOpen,
  data: initialData,
  entityType,
  entityId,
  title = `Edit ${entityType}`,
  onClose,
  onSave,
}) => {
  const [editedData, setEditedData] = useState(initialData);
  const [flatData, setFlatData] = useState(() => flattenJSON(initialData, 2));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFieldChange = useCallback((path: string, value: string) => {
    try {
      setError(null);
      const valueType = getValueType(getNestedValue(editedData, path));
      const coercedValue = coerceValue(value, valueType);
      const updated = setNestedValue({ ...editedData }, path, coercedValue);
      setEditedData(updated);
      setFlatData(flattenJSON(updated, 2));
    } catch (err) {
      setError(`Error updating field: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [editedData]);

  const handleReset = () => {
    setEditedData(initialData);
    setFlatData(flattenJSON(initialData, 2));
    setError(null);
    setSuccess(false);
  };

  const handleSave = async () => {
    try {
      setError(null);
      setSuccess(false);

      const validation = validateJSON(editedData);
      if (!validation.valid) {
        setError(validation.errors.join(', '));
        return;
      }

      setIsSaving(true);

      if (onSave) {
        await onSave(editedData);
      } else {
        // Default: use /api/save-json
        const response = await fetch('/api/save-json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType,
            entityId,
            data: editedData,
            format: 'yaml',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to save');
        }
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
            <p className="text-xs text-slate-500 mt-1">
              {entityType} / {entityId}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="px-6 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="px-6 py-3 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 flex items-start gap-3">
            <CheckCircle size={18} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700 dark:text-green-300">Saved successfully!</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-3">
            {flatData.length > 0 ? (
              flatData.map((field) => (
                <div key={field.path} className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      {field.path}
                    </code>
                  </label>
                  {field.value.includes('[') ? (
                    <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400 font-mono">
                      {field.value}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => handleFieldChange(field.path, e.target.value)}
                      disabled={isSaving}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                      placeholder={`Enter ${getValueType(field.value)}`}
                    />
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 italic">No editable fields found</p>
            )}
          </div>

          {/* Raw JSON View (collapsible) */}
          <details className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
              Raw JSON View
            </summary>
            <pre className="mt-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs overflow-auto max-h-48 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {JSON.stringify(editedData, null, 2)}
            </pre>
          </details>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            onClick={handleReset}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function to get nested value
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
