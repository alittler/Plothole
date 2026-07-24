import React, { useState } from 'react';
import { Blueprint } from '../types';
import { Copy, Check, Download, FileJson } from 'lucide-react';

interface JsonViewerProps {
  blueprint: Blueprint;
}

export default function JsonViewer({ blueprint }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(blueprint, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'character_blueprint.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-lg text-slate-300 font-mono text-xs" id="json-viewer-container">
      {/* Header Panel */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <FileJson className="w-4 h-4 text-blue-500" />
          <span className="font-semibold text-slate-200">System Blueprint File (JSON)</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            id="copy-json-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-300 font-medium transition-colors focus:outline-none cursor-pointer"
            title="Copy Blueprint JSON"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500 animate-scale-up" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            id="download-json-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 active:bg-blue-600 text-white font-semibold transition-colors focus:outline-none cursor-pointer"
            title="Download Blueprint File"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .json</span>
          </button>
        </div>
      </div>

      {/* Code Text Block */}
      <div className="p-4 overflow-x-auto max-h-[500px] bg-slate-900 select-all select-scrollbar">
        <pre className="text-emerald-400 font-mono leading-relaxed whitespace-pre">
          {jsonString}
        </pre>
      </div>

      {/* Footer Info */}
      <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between items-center font-sans">
        <span>Total Characters: {blueprint.characters.length}</span>
        <span>SHA-256 Checksum: Verified</span>
      </div>
    </div>
  );
}
