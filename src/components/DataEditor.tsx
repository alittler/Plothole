import React, { useState, useEffect } from 'react';
import { Save, X, Loader2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { safeResponseJson } from '../utils/jsonUtils';

interface EditingData {
  [key: string]: any;
}

interface DataEditorProps {
  category: string;
  filename: string;
  onClose?: () => void;
}

export const DataEditor: React.FC<DataEditorProps> = ({ category, filename, onClose }) => {
  const [data, setData] = useState<EditingData | null>(null);
  const [originalData, setOriginalData] = useState<EditingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    loadFile();
  }, [category, filename]);

  async function loadFile() {
    setLoading(true);
    try {
      const res = await fetch('/api/data/read', {
        method: 'POST',
        body: JSON.stringify({ category, filename })
      });
      const result = await safeResponseJson(res);
      if (!result) {
        setMessage('Error: Failed to load file');
        setMessageType('error');
      } else if (result.error) {
        setMessage(`Error: ${result.error}`);
        setMessageType('error');
      } else {
        setData(result.data);
        setOriginalData(result.data);
      }
    } catch (error) {
      setMessage(`Error loading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  function updateField(key: string, value: any) {
    setData(prev => prev ? { ...prev, [key]: value } : null);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/data/write', {
        method: 'POST',
        body: JSON.stringify({ category, filename, data })
      });
      const result = await safeResponseJson(res);

      if (!result) {
        setMessage('Error: Failed to save file');
        setMessageType('error');
      } else if (result.error) {
        setMessage(`Error: ${result.error}`);
        setMessageType('error');
      } else {
        setMessage('✓ Saved successfully');
        setMessageType('success');
        setOriginalData(data);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setData(originalData);
    setMessage('');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (!data) {
    return <div className="p-4 text-red-600">No data loaded</div>;
  }

  const hasChanges = JSON.stringify(data) !== JSON.stringify(originalData);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-xl font-bold">{filename}</h2>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`p-3 flex items-center gap-2 ${
            messageType === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {messageType === 'error' && <AlertCircle className="w-4 h-4" />}
          {message}
        </div>
      )}

      {/* Form Fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(data).map(([key, value]) => (
          <FormField
            key={key}
            label={formatLabel(key)}
            value={value}
            onChange={(newValue) => updateField(key, newValue)}
          />
        ))}
      </div>

      {/* Buttons */}
      <div className="flex gap-2 p-4 border-t bg-gray-50">
        <button
          onClick={save}
          disabled={saving || !hasChanges}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={cancel}
          className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

interface FormFieldProps {
  label: string;
  value: any;
  onChange: (v: any) => void;
}

function FormField({ label, value, onChange }: FormFieldProps) {
  if (Array.isArray(value)) {
    return (
      <div className="space-y-2">
        <label className="block font-semibold text-sm text-gray-700">{label}</label>
        <div className="space-y-2 pl-4 border-l-2 border-gray-300">
          {value.map((item, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={typeof item === 'string' ? item : JSON.stringify(item)}
                onChange={(e) => {
                  const newArr = [...value];
                  newArr[idx] = e.target.value;
                  onChange(newArr);
                }}
                className="flex-1 p-2 border rounded font-mono text-sm"
              />
              <button
                onClick={() => onChange(value.filter((_, i) => i !== idx))}
                className="p-2 hover:bg-red-50 text-red-600 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => onChange([...value, ''])}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add item
          </button>
        </div>
      </div>
    );
  }

  if (typeof value === 'object' && value !== null) {
    return (
      <div className="space-y-2 pl-4 border-l-2 border-gray-300">
        <label className="block font-semibold text-sm text-gray-700">{label}</label>
        {Object.entries(value).map(([k, v]) => (
          <FormField
            key={k}
            label={formatLabel(k)}
            value={v}
            onChange={(newV) => onChange({ ...value, [k]: newV })}
          />
        ))}
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded"
        />
        <label className="text-sm font-semibold text-gray-700">{label}</label>
      </div>
    );
  }

  if (typeof value === 'number') {
    return (
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full p-2 border rounded font-mono text-sm"
        />
      </div>
    );
  }

  // String
  const lines = value.toString().split('\n').length;
  const isLongText = lines > 3 || value.toString().length > 100;

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      {isLongText ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-2 border rounded font-mono text-sm"
          rows={Math.min(lines, 6)}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-2 border rounded font-mono text-sm"
        />
      )}
    </div>
  );
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}
