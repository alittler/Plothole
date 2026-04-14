import React, { useState, useRef } from 'react';
import { ToolboxLink, ProjectData, GeneratedMap } from '../../types';
import { Wrench, Plus, ExternalLink, Trash2, RotateCcw, Link as LinkIcon, Sparkles, Loader2, Save, Download, X } from 'lucide-react';
import { generateId } from '../../services/storageService';

interface ToolboxViewProps {
  data: ProjectData;
  defaultResources: ToolboxLink[];
  onUpdateProject: (updates: Partial<ProjectData>) => void;
}

export const ToolboxView: React.FC<ToolboxViewProps> = ({
  data, defaultResources, onUpdateProject
}) => {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [townName, setTownName] = useState('');
  const [populationSize, setPopulationSize] = useState<number | string>('5000');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<{ townName: string; population: number } | null>(null);
  const [showMapBuilder, setShowMapBuilder] = useState(false);
  const [currentMap, setCurrentMap] = useState<GeneratedMap | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [selectedTab, setSelectedTab] = useState<'resources' | 'town-generator'>('resources');

  const userLinks = data.userToolboxLinks || defaultResources;

  const handleAdd = () => {
    if (!url.trim() || !label.trim()) return;
    const newLink: ToolboxLink = { 
      id: generateId(), 
      label: label.trim(), 
      url: url.trim(), 
      category: 'Personal' 
    };
    onUpdateProject({ userToolboxLinks: [...userLinks, newLink] });
    setUrl('');
    setLabel('');
  };

  const handleDelete = (id: string) => {
    onUpdateProject({ userToolboxLinks: userLinks.filter(l => l.id !== id) });
  };

  const handleReset = () => {
    if (!confirm('Reset your toolbox to system defaults? This will remove your personal links.')) return;
    onUpdateProject({ userToolboxLinks: undefined });
  };

  const handleGenerate = () => {
    const name = townName.trim() || 'Unnamed Town';
    const population = parseFloat(populationSize as string);

    if (isNaN(population) || population <= 0) {
      alert('Please enter a valid population size');
      return;
    }

    setIsGenerating(true);
    
    setTimeout(() => {
      const calculatedResults = {
        townName: name,
        population: population,
      };
      setResults(calculatedResults);
      setIsGenerating(false);
    }, 500);
  };

  const handleBuildMap = () => {
    if (!results) {
      alert('Enter a town name and population first');
      return;
    }

    const newMap: GeneratedMap = {
      id: generateId(),
      kingdomName: results.townName,
      population: results.population,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setCurrentMap(newMap);
    setShowMapBuilder(true);
  };

  const handleSaveMap = async () => {
    if (!currentMap) return;

    try {
      if (iframeRef.current?.contentWindow) {
        const canvas = iframeRef.current.contentDocument?.querySelector('canvas') as HTMLCanvasElement;
        if (canvas) {
          currentMap.image = canvas.toDataURL('image/png');
        }
      }
    } catch (e) {
      console.warn('Could not capture town layout (cross-origin restriction)');
    }

    currentMap.updatedAt = Date.now();
    onUpdateProject({ 
      generatedMaps: [...(data.generatedMaps || []), currentMap] 
    });
    setShowMapBuilder(false);
    alert(`Town "${currentMap.kingdomName}" saved!`);
  };

  const handleExportMap = () => {
    if (!currentMap) return;

    const dataStr = JSON.stringify(currentMap, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `town-${currentMap.kingdomName.replace(/\s+/g, '-').toLowerCase()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleResetGenerator = () => {
    setTownName('');
    setPopulationSize('5000');
    setResults(null);
    setCurrentMap(null);
    setShowMapBuilder(false);
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 pb-40">
      <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mb-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg">
                <Wrench size={32} />
              </div>
              <div className="space-y-1 hidden sm:block">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">WRITER'S TOOLBOX</h1>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">A collection of resources to aid your creative process.</p>
              </div>
            </div>
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors hidden sm:flex"
            >
              <RotateCcw size={14} /> Reset to Defaults
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setSelectedTab('resources')}
              className={`px-4 py-3 font-semibold text-sm transition-colors flex items-center gap-2 ${
                selectedTab === 'resources'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
              }`}
            >
              <LinkIcon size={16} /> Resources
            </button>
            <button
              onClick={() => setSelectedTab('town-generator')}
              className={`px-4 py-3 font-semibold text-sm transition-colors flex items-center gap-2 ${
                selectedTab === 'town-generator'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
              }`}
            >
              <Sparkles size={16} /> Town Generator
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 pb-12">
        {/* Resources Tab */}
        {selectedTab === 'resources' && (
          <div className="space-y-12 mt-8">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Resource Name (e.g. RhymeZone)"
                  className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Resource URL (https://...)"
                  className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={handleAdd}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                <Plus size={18} /> Add to My Toolbox
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userLinks.map(resource => (
                <div key={resource.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400">
                      <LinkIcon size={24} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-white truncate">{resource.label}</h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-widest truncate">{resource.category}</p>
                      {resource.description && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-1 line-clamp-1">{resource.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <a href={resource.url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-indigo-500 transition-colors">
                      <ExternalLink size={18} />
                    </a>
                    <button onClick={() => handleDelete(resource.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Town Generator Tab */}
        {selectedTab === 'town-generator' && (
          <div className="space-y-8 mt-8">
            {!showMapBuilder ? (
              <>
                {/* Town Generator Form */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <Sparkles className="text-indigo-600" size={28} />
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Procedural Town Generator</h2>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Create a procedurally-generated town layout with the Town Generator. Specify a name and population size to begin.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Town Name</label>
                      <input
                        type="text"
                        value={townName}
                        onChange={(e) => setTownName(e.target.value)}
                        placeholder="Enter town name..."
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Population Size</label>
                      <input
                        type="number"
                        value={populationSize}
                        onChange={(e) => setPopulationSize(e.target.value)}
                        placeholder="e.g. 5000"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 size={18} className="animate-spin" /> Initializing...
                        </>
                      ) : (
                        <>
                          <Sparkles size={18} /> Generate Town
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Results */}
                {results && (
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">
                        {results.townName}
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
                          <div className="text-xs font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300 mb-1">Population</div>
                          <div className="text-3xl font-black text-blue-900 dark:text-blue-100">{results.population.toLocaleString()}</div>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-xl p-4 border border-emerald-200 dark:border-emerald-700">
                          <div className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300 mb-1">Status</div>
                          <div className="text-xl font-black text-emerald-900 dark:text-emerald-100">Ready to Generate</div>
                        </div>
                      </div>

                      <button
                        onClick={handleBuildMap}
                        className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-lg"
                      >
                        <Sparkles size={20} /> Generate & Build Town
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Map Builder</h3>
                  <button
                    onClick={() => setShowMapBuilder(false)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleSaveMap}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Save size={16} /> Save Town
                  </button>
                  <button
                    onClick={handleExportMap}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download size={16} /> Export as JSON
                  </button>
                  <button
                    onClick={handleResetGenerator}
                    className="w-full py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <RotateCcw size={16} /> Reset
                  </button>
                </div>

                {currentMap && (
                  <iframe
                    ref={iframeRef}
                    src="/town-builder.html"
                    className="w-full border-2 border-slate-300 dark:border-slate-700 rounded-lg"
                    style={{ height: '600px' }}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
