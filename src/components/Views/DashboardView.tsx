import React, { useState } from 'react';
import { ProjectData, Note } from '../../types';
import { Download, FileJson, Share2, Save, Calendar, Users, MapPin, BookOpen, ArrowLeft } from 'lucide-react';

interface DashboardViewProps {
  projectData: ProjectData;
  globalNotes: Note[];
  onBack?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ projectData, globalNotes, onBack }) => {
  const [exportFormat, setExportFormat] = useState<'json' | 'md' | 'txt'>('json');

  // Only include notes that are tagged with the project ID or a matching tag
  const projectNotes = globalNotes.filter(note => 
    note.tags?.includes(projectData.id) || 
    note.tags?.includes(projectData.title)
  );

  const handleExport = () => {
    let content = '';
    let filename = '';

    if (exportFormat === 'json') {
      content = JSON.stringify({
        project: projectData,
        notes: projectNotes,
        exportedAt: new Date().toISOString()
      }, null, 2);
      filename = `${projectData.title}-export.json`;
    } else if (exportFormat === 'md') {
      content = `# ${projectData.title}\n\n**By:** ${projectData.author}\n\n## Project Details\n\n- **Characters:** ${projectData.characters?.length || 0}\n- **Locations:** ${projectData.locations?.length || 0}\n- **Timeline Events:** ${projectData.timeline?.length || 0}\n- **Word Count:** ${projectData.wordCount || 0}\n\n## Notes (${projectNotes.length})\n\n`;
      
      projectNotes.forEach((note, idx) => {
        content += `\n### Note ${idx + 1}\n\n${note.content}\n\n**Created:** ${new Date(note.timestamp || 0).toLocaleDateString()}\n\n---\n`;
      });
      
      filename = `${projectData.title}-notes.md`;
    } else {
      content = `${projectData.title}\nBy ${projectData.author}\n\n`;
      content += `NOTES (${projectNotes.length}):\n\n`;
      projectNotes.forEach((note, idx) => {
        content += `\n--- Note ${idx + 1} ---\n${note.content}\n\nCreated: ${new Date(note.timestamp || 0).toLocaleDateString()}\n`;
      });
      filename = `${projectData.title}-notes.txt`;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      <header className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{projectData.title}</h1>
            <p className="text-sm text-slate-500 italic">by {projectData.author}</p>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft size={24} />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Project Details */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Project Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <Users size={24} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Characters</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{projectData.characters?.length || 0}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <MapPin size={24} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Locations</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{projectData.locations?.length || 0}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <Calendar size={24} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Timeline Events</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{projectData.timeline?.length || 0}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <BookOpen size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Associated Notes</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{projectNotes.length}</p>
                </div>
              </div>
            </div>

            {projectData.summary && (
              <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Summary</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3">{projectData.summary}</p>
              </div>
            )}
          </section>

          {/* Export Options */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Export & Download</h2>
            
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => setExportFormat('json')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-widest transition-all ${
                    exportFormat === 'json'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  JSON
                </button>
                <button
                  onClick={() => setExportFormat('md')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-widest transition-all ${
                    exportFormat === 'md'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Markdown
                </button>
                <button
                  onClick={() => setExportFormat('txt')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-widest transition-all ${
                    exportFormat === 'txt'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Text
                </button>
              </div>
              <button
                onClick={handleExport}
                className="ml-auto px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
              >
                <Download size={18} />
                Download
              </button>
            </div>
          </section>

          {/* Associated Notes */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Associated Notes ({projectNotes.length})</h2>
            
            {projectNotes.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No notes associated with this project yet.</p>
            ) : (
              <div className="space-y-4">
                {projectNotes.map((note, idx) => (
                  <div key={note.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Note {idx + 1}</p>
                      <p className="text-xs text-slate-400">{new Date(note.timestamp).toLocaleDateString()}</p>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">{note.content}</p>
                    {note.tags && note.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {note.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                        {note.tags.length > 3 && (
                          <span className="text-[10px] text-slate-500">+{note.tags.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
