import React, { useState, useCallback, useEffect } from 'react';
import { ProjectData, ViewType } from '../../types';
import {
  Upload, FileText, Zap, BookOpen, Users, MapPin, Calendar, Sparkles,
  Trash2, Download, ArrowLeft, CheckCircle2, AlertCircle, Loader2, RefreshCw
} from 'lucide-react';

export enum Bookshelf2Tab {
  UPLOAD = 'Upload',
  SOURCES = 'Sources',
  ANALYSIS = 'Analysis',
  ENTITIES = 'Entities'
}

interface Bookshelf2ViewProps {
  projectData: ProjectData | null;
  onUpdateProject: (updates: Partial<ProjectData>) => Promise<void>;
  onChangeView?: (view: ViewType) => void;
  isAnalyzing?: boolean;
  onMergeAnalysis?: (analysis: any, content?: string) => Promise<void>;
  onExtractRelationships?: () => Promise<void>;
  onExtractSoftAnchors?: () => Promise<void>;
  fetchWithAuth?: (url: string, options?: RequestInit) => Promise<Response>;
}

interface UploadedSource {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'text';
  uploadedAt: number;
  size: number;
  content?: string;
  status: 'pending' | 'extracting' | 'extracted' | 'error';
  error?: string;
}

interface AnalysisResult {
  characters: Array<{ name: string; role: string; description: string; traits: string[] }>;
  locations: Array<{ name: string; description: string }>;
  timeline: Array<{ title: string; date?: string; description: string }>;
  themes: string[];
  artifacts: Array<{ name: string; description: string }>;
  lore: Array<{ term: string; definition: string }>;
  summary: string;
}

export const Bookshelf2View: React.FC<Bookshelf2ViewProps> = ({
  projectData,
  onUpdateProject,
  onChangeView,
  isAnalyzing = false,
  onMergeAnalysis,
  onExtractRelationships,
  onExtractSoftAnchors,
  fetchWithAuth
}) => {
  const [activeTab, setActiveTab] = useState<Bookshelf2Tab>(Bookshelf2Tab.UPLOAD);
  const [uploadedSources, setUploadedSources] = useState<UploadedSource[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const generateId = (): string => {
    return 'src-' + Math.random().toString(36).substr(2, 9);
  };

  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!projectData) return;
    
    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = generateId();

      // Determine file type
      let type: 'pdf' | 'image' | 'text' = 'text';
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        type = 'pdf';
      } else if (file.type.startsWith('image/')) {
        type = 'image';
      }

      // Create initial source entry
      const source: UploadedSource = {
        id,
        name: file.name,
        type,
        uploadedAt: Date.now(),
        size: file.size,
        status: 'pending'
      };

      setUploadedSources(prev => [...prev, source]);
      setUploadProgress(prev => ({ ...prev, [id]: 0 }));

      try {
        setUploadProgress(prev => ({ ...prev, [id]: 30 }));

        // Use the actual S3 upload endpoint
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', projectData.id);
        
        let uploadEndpoint = '/api/upload';
        const response = await (fetchWithAuth ? fetchWithAuth(uploadEndpoint, {
          method: 'POST',
          body: formData
        }) : fetch(uploadEndpoint, {
          method: 'POST',
          body: formData
        }));

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const data = await response.json();

        setUploadProgress(prev => ({ ...prev, [id]: 100 }));

        // Update source with uploaded status
        setUploadedSources(prev =>
          prev.map(s =>
            s.id === id
              ? { 
                  ...s, 
                  content: data.url || file.name,
                  status: 'extracted'
                }
              : s
          )
        );
      } catch (error) {
        setUploadedSources(prev =>
          prev.map(s =>
            s.id === id
              ? {
                ...s,
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
              }
              : s
          )
        );
      }
    }

    setIsUploading(false);
  }, [projectData, fetchWithAuth]);

  const extractCharactersFromText = (text: string): AnalysisResult['characters'] => {
    // Simple character extraction based on common patterns
    const characters: AnalysisResult['characters'] = [];
    
    // Look for capitalized words that might be names (simplistic approach)
    const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
    const matches = text.match(namePattern);
    
    if (matches) {
      const uniqueNames = Array.from(new Set(matches));
      uniqueNames.slice(0, 10).forEach((name, i) => {
        // Determine role based on position (first mentioned are usually main)
        const role = i === 0 ? 'Protagonist' : i < 3 ? 'Major Character' : 'Supporting Character';
        characters.push({
          name,
          role,
          description: `A ${role.toLowerCase()} in the story`,
          traits: []
        });
      });
    }
    
    return characters;
  };

  const extractLocationsFromText = (text: string): AnalysisResult['locations'] => {
    // Look for location-related words
    const locationKeywords = ['kingdom', 'city', 'village', 'forest', 'mountain', 'castle', 'realm', 'land'];
    const locations: AnalysisResult['locations'] = [];
    
    locationKeywords.forEach(keyword => {
      const regex = new RegExp(`(?:the\\s+)?([A-Z][a-z]*(?:\\s+${keyword})?)`, 'gi');
      const matches = text.match(regex);
      if (matches && matches.length > 0) {
        const uniqueName = matches[0];
        locations.push({
          name: uniqueName,
          description: `A location mentioned in the manuscript`
        });
      }
    });
    
    return locations.slice(0, 10);
  };

  const extractTimelineFromText = (text: string): AnalysisResult['timeline'] => {
    // Look for time-related words and events
    const timelineEvents: AnalysisResult['timeline'] = [];
    const lines = text.split('\n').filter(l => l.length > 20);
    
    // Take first few significant lines as events
    lines.slice(0, 5).forEach((line, i) => {
      timelineEvents.push({
        title: `Event ${i + 1}`,
        description: line.substring(0, 100).trim()
      });
    });
    
    return timelineEvents;
  };

  const extractThemesFromText = (text: string): string[] => {
    const themeKeywords = [
      'redemption', 'courage', 'love', 'betrayal', 'discovery', 'power', 'sacrifice',
      'revenge', 'justice', 'freedom', 'destiny', 'survival', 'friendship', 'ambition'
    ];
    
    const themes: string[] = [];
    themeKeywords.forEach(theme => {
      if (text.toLowerCase().includes(theme)) {
        themes.push(theme.charAt(0).toUpperCase() + theme.slice(1));
      }
    });
    
    return themes.slice(0, 8);
  };

  const extractArtifactsFromText = (text: string): AnalysisResult['artifacts'] => {
    const artifactKeywords = ['sword', 'ring', 'staff', 'amulet', 'book', 'crown', 'artifact', 'relic'];
    const artifacts: AnalysisResult['artifacts'] = [];
    
    artifactKeywords.forEach(keyword => {
      if (text.toLowerCase().includes(keyword)) {
        artifacts.push({
          name: `${keyword.charAt(0).toUpperCase()}${keyword.slice(1)}`,
          description: `An important object mentioned in the manuscript`
        });
      }
    });
    
    return artifacts.slice(0, 8);
  };

  const extractLoreFromText = (text: string): AnalysisResult['lore'] => {
    const loreTerms: AnalysisResult['lore'] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.length > 30);
    
    // Extract first few sentences as lore definitions
    sentences.slice(0, 5).forEach((sentence, i) => {
      const words = sentence.trim().split(/\s+/);
      if (words.length > 3) {
        loreTerms.push({
          term: words.slice(0, 3).join(' '),
          definition: sentence.trim().substring(0, 100)
        });
      }
    });
    
    return loreTerms;
  };

  const handleAnalyzeSource = useCallback(async (sourceId: string) => {
    const source = uploadedSources.find(s => s.id === sourceId);
    if (!source || !source.content) return;

    try {
      const text = source.content;
      
      const analysis: AnalysisResult = {
        characters: extractCharactersFromText(text),
        locations: extractLocationsFromText(text),
        timeline: extractTimelineFromText(text),
        themes: extractThemesFromText(text),
        artifacts: extractArtifactsFromText(text),
        lore: extractLoreFromText(text),
        summary: text.substring(0, 200) + '...'
      };

      setAnalysisResult(analysis);
      setActiveTab(Bookshelf2Tab.ANALYSIS);
      setSelectedSourceId(sourceId);
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  }, [uploadedSources]);

  const getTierFromRole = (role: string): 1 | 2 | 3 => {
    const mainRoles = ['protagonist', 'antagonist', 'main character', 'hero', 'villain'];
    const supportingRoles = ['supporting', 'major', 'secondary'];
    
    const lowerRole = role.toLowerCase();
    
    if (mainRoles.some(r => lowerRole.includes(r))) return 1;
    if (supportingRoles.some(r => lowerRole.includes(r))) return 2;
    return 3;
  };

  const autoGenerateDescription = (character: AnalysisResult['characters'][0]): string => {
    const roles = {
      'Protagonist': 'A central figure driving the story forward',
      'Antagonist': 'A formidable force opposing the protagonist',
      'Major Character': 'An important supporting character with significant influence',
      'Supporting Character': 'A character who provides context and depth to the narrative'
    };
    
    return roles[character.role as keyof typeof roles] || 'A character in the story';
  };

  const handleMergeToProject = useCallback(async () => {
    if (!projectData || !onMergeAnalysis) return;
    
    setIsProcessing(true);
    try {
      // Call the real merge analysis function from App.tsx
      await onMergeAnalysis(analysisResult, selectedSourceId);
      setAnalysisResult(null);
      setSelectedSourceId(null);
      setActiveTab(Bookshelf2Tab.ENTITIES);
    } catch (error) {
      console.error('Merge failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [analysisResult, projectData, selectedSourceId, onMergeAnalysis]);

  const handleExtractRelationships = useCallback(async () => {
    if (!onExtractRelationships) return;
    
    setIsProcessing(true);
    setFeedback(null);
    try {
      await onExtractRelationships();
      setFeedback({ type: 'success', message: 'Relationships extracted successfully!' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to extract relationships';
      console.error('Relationship extraction failed:', error);
      setFeedback({ type: 'error', message });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  }, [onExtractRelationships]);

  const handleExtractAnchors = useCallback(async () => {
    if (!onExtractSoftAnchors) return;
    
    setIsProcessing(true);
    setFeedback(null);
    try {
      await onExtractSoftAnchors();
      setFeedback({ type: 'success', message: 'Timeline anchors extracted successfully!' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to extract timeline anchors';
      console.error('Anchor extraction failed:', error);
      setFeedback({ type: 'error', message });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  }, [onExtractSoftAnchors]);

  const handleDeleteSource = useCallback((id: string) => {
    setUploadedSources(prev => prev.filter(s => s.id !== id));
  }, []);

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md z-10 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          {onChangeView && (
            <button
              onClick={() => onChangeView(ViewType.BOOKSHELF)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="p-2 md:p-4 bg-purple-600 text-white rounded-2xl shadow-lg shrink-0">
            <Sparkles size={20} className="md:w-8 md:h-8" />
          </div>
          <div className="space-y-1">
            <h1 className="ph-section-title text-xl md:text-3xl">Manuscript Repository</h1>
            <p className="ph-section-subtitle text-xs md:text-sm">Upload and analyze source documents</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex gap-1 overflow-x-auto">
          {Object.values(Bookshelf2Tab).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-semibold text-sm md:text-base transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab
                  ? 'text-purple-600 dark:text-purple-400 border-purple-600'
                  : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          {/* Upload Tab */}
          {activeTab === Bookshelf2Tab.UPLOAD && (
            <div className="space-y-6">
              <div
                className="border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-xl p-8 md:p-12 text-center bg-purple-50 dark:bg-purple-950/20 cursor-pointer transition-colors hover:border-purple-400"
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  handleFileUpload(e.dataTransfer.files);
                }}
              >
                <Upload size={32} className="mx-auto mb-3 text-purple-600 dark:text-purple-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Upload Sources</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Drag and drop PDFs, images, or text files here, or click to select
                </p>
                <label className="inline-block">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.gif"
                    onChange={e => e.target.files && handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                  <span className="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors cursor-pointer">
                    Choose Files
                  </span>
                </label>
              </div>

              {uploadedSources.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 dark:text-white">Uploaded Sources ({uploadedSources.length})</h3>
                  {uploadedSources.map(source => (
                    <div
                      key={source.id}
                      className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <FileText size={20} className="text-purple-600 dark:text-purple-400 mt-1 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">{source.name}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {(source.size / 1024).toFixed(1)} KB • {source.type}
                          </p>
                          {source.status === 'extracted' && (
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs mt-1">
                              <CheckCircle2 size={14} /> Extracted
                            </div>
                          )}
                          {source.status === 'error' && (
                            <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs mt-1">
                              <AlertCircle size={14} /> {source.error}
                            </div>
                          )}
                        </div>
                      </div>

                      {source.status === 'pending' && (
                        <Loader2 size={20} className="text-purple-600 animate-spin shrink-0" />
                      )}

                      {source.status === 'extracted' && (
                        <button
                          onClick={() => handleAnalyzeSource(source.id)}
                          disabled={isAnalyzing}
                          className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors shrink-0"
                        >
                          Analyze
                        </button>
                      )}

                      {source.status !== 'pending' && (
                        <button
                          onClick={() => handleDeleteSource(source.id)}
                          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded transition-colors shrink-0"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sources Tab */}
          {activeTab === Bookshelf2Tab.SOURCES && (
            <div>
              {uploadedSources.length === 0 ? (
                <div className="text-center py-12">
                  <FileText size={48} className="mx-auto mb-3 text-slate-400" />
                  <p className="text-slate-600 dark:text-slate-400">No sources uploaded yet</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {uploadedSources.map(source => (
                    <div
                      key={source.id}
                      className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-slate-900 dark:text-white">{source.name}</h3>
                        <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                          {source.type}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                        Uploaded {new Date(source.uploadedAt).toLocaleDateString()}
                      </p>
                      {source.content && (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-purple-600 dark:text-purple-400 hover:text-purple-700">
                            Preview content
                          </summary>
                          <pre className="mt-2 p-2 bg-slate-100 dark:bg-slate-900 rounded text-xs max-h-64 overflow-auto whitespace-pre-wrap break-words">
                            {source.content.substring(0, 500)}
                            {source.content.length > 500 ? '...' : ''}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Analysis Tab */}
          {activeTab === Bookshelf2Tab.ANALYSIS && (
            <div className="space-y-6">
              {projectData ? (
                <>
                  {feedback && (
                    <div className={`p-4 rounded-lg border flex items-center gap-3 ${
                      feedback.type === 'success' 
                        ? 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-700' 
                        : 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-700'
                    }`}>
                      {feedback.type === 'success' ? (
                        <CheckCircle2 size={20} className="text-green-600 dark:text-green-400 shrink-0" />
                      ) : (
                        <AlertCircle size={20} className="text-red-600 dark:text-red-400 shrink-0" />
                      )}
                      <span className={feedback.type === 'success' ? 'text-green-900 dark:text-green-200' : 'text-red-900 dark:text-red-200'}>
                        {feedback.message}
                      </span>
                    </div>
                  )}
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Manuscript Analysis Tools</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                      Extract relationships, timeline anchors, and other story elements from your manuscript chapters and notes.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        onClick={handleExtractRelationships}
                        disabled={isProcessing || isAnalyzing}
                        className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border-2 border-indigo-300 dark:border-indigo-700 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 disabled:opacity-50 transition-colors text-left"
                      >
                        <div className="flex items-start gap-3">
                          {(isProcessing || isAnalyzing) ? (
                            <Loader2 size={20} className="text-indigo-600 dark:text-indigo-400 mt-1 animate-spin shrink-0" />
                          ) : (
                            <Users size={20} className="text-indigo-600 dark:text-indigo-400 mt-1 shrink-0" />
                          )}
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white">Extract Relationships</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                              Analyze character interactions and connections from your manuscript
                            </p>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={handleExtractAnchors}
                        disabled={isProcessing || isAnalyzing}
                        className="p-4 bg-green-50 dark:bg-green-950/20 border-2 border-green-300 dark:border-green-700 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 disabled:opacity-50 transition-colors text-left"
                      >
                        <div className="flex items-start gap-3">
                          {(isProcessing || isAnalyzing) ? (
                            <Loader2 size={20} className="text-green-600 dark:text-green-400 mt-1 animate-spin shrink-0" />
                          ) : (
                            <Calendar size={20} className="text-green-600 dark:text-green-400 mt-1 shrink-0" />
                          )}
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white">Extract Timeline Anchors</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                              Identify and extract important story events from your manuscript
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {uploadedSources.filter(s => s.status === 'extracted').length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-300 dark:border-blue-700 rounded-lg p-4">
                      <p className="text-sm text-blue-900 dark:text-blue-200">
                        <Sparkles size={16} className="inline mr-2" />
                        {uploadedSources.filter(s => s.status === 'extracted').length} source document(s) ready for analysis. Use the tools above to extract story elements.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <BookOpen size={48} className="mx-auto mb-3 text-slate-400" />
                  <p className="text-slate-600 dark:text-slate-400">Select a project to access analysis tools</p>
                </div>
              )}
            </div>
          )}

          {/* Entities Tab */}
          {activeTab === Bookshelf2Tab.ENTITIES && (
            <div>
              {projectData ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                      <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <Users size={20} /> Characters
                      </h3>
                      <p className="text-3xl font-black text-purple-600 dark:text-purple-400">
                        {projectData.characters?.length || 0}
                      </p>
                      <div className="mt-4 space-y-2 text-sm">
                        {projectData.characters && projectData.characters.length > 0 && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Tier 1 (Core)</span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {projectData.characters.filter(c => c.tier === 1).length}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Tier 2 (Supporting)</span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {projectData.characters.filter(c => c.tier === 2).length}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Tier 3 (Background)</span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {projectData.characters.filter(c => c.tier === 3).length}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                      <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <MapPin size={20} /> Locations
                      </h3>
                      <p className="text-3xl font-black text-purple-600 dark:text-purple-400">
                        {projectData.locations?.length || 0}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-4">
                        Locations in project
                      </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                      <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <Calendar size={20} /> Timeline Events
                      </h3>
                      <p className="text-3xl font-black text-purple-600 dark:text-purple-400">
                        {projectData.timeline?.length || 0}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-4">
                        Events in timeline
                      </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                      <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <Sparkles size={20} /> Story Elements
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Themes</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {projectData.themes?.length || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Artifacts</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {projectData.artifacts?.length || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Lore Entries</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {projectData.lore?.length || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Relationships</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {projectData.relationships?.length || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen size={48} className="mx-auto mb-3 text-slate-400" />
                  <p className="text-slate-600 dark:text-slate-400">Select a project to view entities</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
