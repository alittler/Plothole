import React, { useState, useEffect } from 'react';
import { Loader2, ChevronRight, Folder, RotateCw } from 'lucide-react';
import { DataEditor } from './DataEditor';

const CATEGORIES = [
  { id: 'characters', label: '👤 Characters' },
  { id: 'locations', label: '🗺️ Locations' },
  { id: 'items', label: '📦 Items' },
  { id: 'events', label: '📅 Events' },
  { id: 'lore', label: '📚 Lore' }
];

interface DataBrowserProps {
  onClose?: () => void;
}

export const DataBrowser: React.FC<DataBrowserProps> = ({ onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (selectedCategory) {
      loadFiles(selectedCategory);
    }
  }, [selectedCategory]);

  async function loadFiles(category: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/data/list', {
        method: 'POST',
        body: JSON.stringify({ category })
      });
      const result = await res.json();
      if (result.error) {
        setError(result.error);
        setFiles([]);
      } else {
        setFiles(result.files || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }

  // If viewing a file, show editor
  if (selectedFile && selectedCategory) {
    return (
      <DataEditor
        category={selectedCategory}
        filename={selectedFile}
        onClose={() => setSelectedFile(null)}
      />
    );
  }

  // If category selected, show files
  if (selectedCategory) {
    const categoryLabel = CATEGORIES.find(c => c.id === selectedCategory)?.label || selectedCategory;
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between gap-2 p-4 border-b">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedCategory(null);
                setFiles([]);
              }}
              className="text-blue-600 hover:text-blue-700"
            >
              Data Editor
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="font-semibold">{categoryLabel}</span>
          </div>
          <button
            onClick={() => loadFiles(selectedCategory)}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 disabled:opacity-50"
            title="Refresh file list"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}

          {error && <div className="text-red-600 p-2">{error}</div>}

          {!loading && files.length === 0 && !error && (
            <div className="text-gray-500 text-center p-8">
              No files found in this category
            </div>
          )}

          <div className="space-y-1">
            {files.map(file => (
              <button
                key={file}
                onClick={() => setSelectedFile(file)}
                className="w-full text-left p-3 rounded hover:bg-blue-50 flex items-center gap-2 group"
              >
                <Folder className="w-4 h-4 text-blue-600" />
                <span className="flex-1">{file}</span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show category selector
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-xl font-bold">Data Editor</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
          >
            Close
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {CATEGORIES.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className="w-full text-left p-4 rounded border hover:border-blue-400 hover:bg-blue-50 transition flex items-center justify-between group"
          >
            <span className="font-semibold">{category.label}</span>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
          </button>
        ))}
      </div>

      <div className="p-4 border-t bg-gray-50 text-sm text-gray-600">
        <p className="font-semibold mb-2">📋 About Data Editor</p>
        <p>Load and edit JSON/YAML files from your data directories. Changes are saved immediately.</p>
      </div>
    </div>
  );
};
