import React, { useState, useRef } from 'react';
import { Sparkles, ExternalLink, Loader2, Download, Save, X, Eye } from 'lucide-react';
import { GeneratedMap } from '../../types';
import { generateId } from '../../services/storageService';

interface CreateMapTabProps {
  onMapGenerated?: (map: GeneratedMap) => void;
  onMapSaved?: (map: GeneratedMap) => void;
  savedMaps?: GeneratedMap[];
}

export const CreateMapTab: React.FC<CreateMapTabProps> = ({ onMapGenerated, onMapSaved, savedMaps = [] }) => {
  const [townName, setTownName] = useState('');
  const [populationSize, setPopulationSize] = useState<number | string>('5000');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<{ townName: string; population: number } | null>(null);
  const [showMapBuilder, setShowMapBuilder] = useState(false);
  const [currentMap, setCurrentMap] = useState<GeneratedMap | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
      demographicParams: {
        population: results.population,
      } as any,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setCurrentMap(newMap);
    setShowMapBuilder(true);
  };

  const handleSaveMap = async () => {
    if (!currentMap) return;

    // Try to capture iframe state if possible
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
    onMapSaved?.(currentMap);
    setShowMapBuilder(false);
    alert(`Town "${currentMap.kingdomName}" saved!`);
  };

  const handleExportMap = () => {
    if (!currentMap) return;

    // Export map data as JSON
    const dataStr = JSON.stringify(currentMap, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `town-${currentMap.kingdomName.replace(/\s+/g, '-').toLowerCase()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleCloseBuilder = () => {
    setShowMapBuilder(false);
    setCurrentMap(null);
  };

  return (
    <div className="p-6 space-y-8">
      {!showMapBuilder ? (
        <>
          {/* Town Generator Form */}
          <div className="max-w-2xl">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
              <Sparkles className="inline mr-2" size={28} /> Generate Town
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Create a procedurally-generated town layout with the Town Generator.
            </p>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
              {/* Town Name */}
              <div>
                <label className="block text-sm font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 mb-2">
                  Town Name
                </label>
                <input
                  type="text"
                  value={townName}
                  onChange={(e) => setTownName(e.target.value)}
                  placeholder="e.g., Millhaven, Silverford"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Population */}
              <div>
                <label className="block text-sm font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 mb-2">
                  Population
                </label>
                <input
                  type="number"
                  value={populationSize}
                  onChange={(e) => setPopulationSize(e.target.value)}
                  placeholder="5000"
                  min="100"
                  step="500"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-1">Town population size (used by generator for scale)</p>
              </div>

              {/* Generate Button */}
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
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {results.townName}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <ExternalLink size={20} /> Generate & Build Town
              </button>
            </div>
          )}

          {/* Saved Towns */}
          {savedMaps && savedMaps.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Saved Towns
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedMaps.map((map) => (
                  <div
                    key={map.id}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3"
                  >
                    {map.image && (
                      <img
                        src={map.image}
                        alt={map.kingdomName}
                        className="w-full h-40 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">{map.kingdomName}</h4>
                      <p className="text-xs text-slate-500">
                        Created {new Date(map.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setCurrentMap(map);
                        setShowMapBuilder(true);
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye size={14} /> View/Edit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Map Builder Modal */
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-6xl h-screen max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {currentMap?.kingdomName} - Town Generator
              </h2>
              <button
                onClick={handleCloseBuilder}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={24} className="text-slate-900 dark:text-white" />
              </button>
            </div>

            {/* Map Builder Content */}
            <div className="flex-1 overflow-hidden">
              <iframe
                ref={iframeRef}
                src="https://watabou.github.io/TownGeneratorOS/"
                title="Town Generator"
                className="w-full h-full border-0"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              />
            </div>

            {/* Footer Actions */}
            <div className="border-t border-slate-200 dark:border-slate-700 p-6 flex gap-4 justify-end bg-slate-50 dark:bg-slate-800">
              <button
                onClick={handleCloseBuilder}
                className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-bold uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExportMap}
                className="px-6 py-2 rounded-lg bg-slate-600 hover:bg-slate-700 text-white font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
              >
                <Download size={16} /> Export
              </button>
              <button
                onClick={handleSaveMap}
                className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
              >
                <Save size={16} /> Save Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
