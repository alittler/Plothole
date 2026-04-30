import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Folder, File, Loader2 } from 'lucide-react';
import { safeResponseJson } from '@/utils/jsonUtils';

interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}

interface FileExplorerProps {
  onSelectFile: (category: string, filename: string) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ onSelectFile }) => {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['data']));

  useEffect(() => {
    loadFileTree();
  }, []);

  async function loadFileTree() {
    setLoading(true);
    try {
      const res = await fetch('/api/data/tree', {
        method: 'GET'
      });
      const result = await safeResponseJson(res);
      
      if (!result) {
        console.error('Error loading file tree: Failed to parse response');
      } else if (result.error) {
        console.error('Error loading file tree:', result.error);
      } else {
        setTree(result.tree || []);
      }
    } catch (err) {
      console.error('Error loading file tree:', err);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpanded(path: string) {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  }

  function renderNode(node: FileNode, depth: number = 0): JSX.Element {
    const isExpanded = expandedPaths.has(node.path);
    const isFile = !node.isDir;
    
    // Extract category from path (e.g., "data/characters/file.json" -> "characters")
    const pathParts = node.path.split('/');
    const category = pathParts.length > 1 ? pathParts[1] : null;
    const isDataFile = isFile && category && ['characters', 'locations', 'items', 'events', 'lore'].includes(category);

    return (
      <div key={node.path}>
        <div
          className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-gray-100 rounded ${
            isFile && isDataFile ? 'hover:bg-blue-50' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {node.isDir ? (
            <>
              <button
                onClick={() => toggleExpanded(node.path)}
                className="p-0 hover:bg-gray-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              <Folder className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">{node.name}</span>
            </>
          ) : (
            <>
              <div className="w-4" />
              <File className="w-4 h-4 text-gray-400" />
              <button
                onClick={() => {
                  if (isDataFile && category) {
                    onSelectFile(category, node.name);
                  }
                }}
                className={`text-sm ${isDataFile ? 'text-blue-600 hover:underline' : 'text-gray-600'}`}
              >
                {node.name}
              </button>
            </>
          )}
        </div>

        {node.isDir && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="ml-2">Loading file tree...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-sm">
      {tree.length === 0 ? (
        <div className="text-gray-500 text-center p-8">No files found</div>
      ) : (
        tree.map(node => renderNode(node))
      )}
    </div>
  );
};
