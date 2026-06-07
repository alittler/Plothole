import React, { useState, useEffect } from 'react';
import { ProjectData, Character } from '../../types';
import { ArrowLeft, Loader2, AlertCircle, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ManuscriptAnalyzerViewProps {
  projectData: ProjectData;
  onBack?: () => void;
  onSaveCharacters?: (characters: Character[]) => Promise<void>;
}

export const ManuscriptAnalyzerView: React.FC<ManuscriptAnalyzerViewProps> = ({ 
  projectData, 
  onBack,
  onSaveCharacters
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [extractedCharacters, setExtractedCharacters] = useState<Character[]>([]);

  useEffect(() => {
    console.log('[ManuscriptAnalyzerView] Component mounted, projectData.id:', projectData.id);
    analyzeManuscript();
  }, [projectData.id]);

  const analyzeManuscript = async () => {
    console.log('[ManuscriptAnalyzerView] analyzeManuscript called');
    console.log('[ManuscriptAnalyzerView] projectData.manuscript length:', projectData.manuscript?.length || 0);
    console.log('[ManuscriptAnalyzerView] projectData.notes length:', projectData.notes?.length || 0);
    setIsAnalyzing(true);
    setError('');
    setAnalysis('');

    try {
      // For now, use manuscript property if available, otherwise use notes
      const manuscriptText = projectData.manuscript || 
        projectData.notes.map(n => n.content).join('\n\n');

      console.log('[ManuscriptAnalyzerView] manuscriptText length:', manuscriptText?.length || 0);
      if (!manuscriptText || manuscriptText.trim().length === 0) {
        setError('No manuscript text found. Please add notes or manuscript content to analyze.');
        setIsAnalyzing(false);
        return;
      }

      console.log('[ManuscriptAnalyzerView] Calling API with manuscript text length:', manuscriptText.length);
      const response = await fetch('/api/narrative/analyze-manuscript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manuscriptText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      
      // Parse and extract characters from the analysis markdown
      if (data.characters && Array.isArray(data.characters)) {
        console.log('[ManuscriptAnalyzer] Extracted characters:', data.characters);
        setExtractedCharacters(data.characters);
        // Auto-save characters immediately
        if (onSaveCharacters) {
          try {
            await onSaveCharacters(data.characters);
            console.log('[ManuscriptAnalyzer] Characters auto-saved');
          } catch (err) {
            console.error('[ManuscriptAnalyzer] Failed to auto-save characters:', err);
          }
        }
      } else {
        console.log('[ManuscriptAnalyzer] No characters in response:', data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Manuscript analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      <header className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Character Analysis</h1>
            <p className="text-sm text-slate-500">Analyzing characters from: {projectData.title}</p>
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
        <div className="max-w-4xl mx-auto">
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 size={48} className="text-indigo-600 dark:text-indigo-400 animate-spin" />
              <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                Analyzing manuscript for characters...
              </p>
              <p className="text-sm text-slate-500">This may take a minute depending on manuscript length</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 flex gap-4">
              <AlertCircle size={24} className="text-red-600 dark:text-red-400 shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-red-900 dark:text-red-200 mb-2">Analysis Error</h3>
                <p className="text-red-800 dark:text-red-300 mb-4">{error}</p>
                <button
                  onClick={analyzeManuscript}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-all"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : analysis ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h3: ({ children }) => (
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-8 mb-4 first:mt-0">
                      {children}
                    </h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-4 mb-2">
                      {children}
                    </h4>
                  ),
                  ul: ({ children }) => (
                    <ul className="space-y-2 list-none pl-0 my-4">
                      {children}
                    </ul>
                  ),
                  li: ({ children }) => (
                    <li className="text-slate-700 dark:text-slate-300 border-l-2 border-indigo-500 pl-4">
                      {children}
                    </li>
                  ),
                  p: ({ children }) => (
                    <p className="text-slate-700 dark:text-slate-300 my-3 leading-relaxed">
                      {children}
                    </p>
                  ),
                }}
              >
                {analysis}
              </ReactMarkdown>
              
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex gap-4">
                <button
                  onClick={analyzeManuscript}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                >
                  Re-analyze
                </button>
                {extractedCharacters.length > 0 && onSaveCharacters && (
                  <button
                    onClick={async () => {
                      try {
                        console.log('[ManuscriptAnalyzer] Saving characters:', extractedCharacters);
                        await onSaveCharacters(extractedCharacters);
                        console.log('[ManuscriptAnalyzer] Characters saved successfully');
                        alert(`Saved ${extractedCharacters.length} characters to project!`);
                      } catch (err) {
                        console.error('[ManuscriptAnalyzer] Failed to save characters:', err);
                        alert(`Failed to save characters: ${err instanceof Error ? err.message : 'Unknown error'}`);
                      }
                    }}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                  >
                    <Download size={16} />
                    Save {extractedCharacters.length} Characters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400">No analysis yet. Click the button above to analyze.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
