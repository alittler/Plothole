import React, { useState, useRef } from 'react';
import { Sparkles, ExternalLink, Loader2, Download, Save, X, Eye } from 'lucide-react';
import { calculateDemographics, DemographicParameters, DemographicResults } from '../../services/medievalDemographicsService';
import { GeneratedMap } from '../../types';
import { generateId } from '../../services/storageService';

interface CreateMapTabProps {
  onMapGenerated?: (map: GeneratedMap) => void;
  onMapSaved?: (map: GeneratedMap) => void;
  savedMaps?: GeneratedMap[];
}

const DENSITY_PRESETS = [
  { value: 'Desolate' as const, label: 'Desolate', description: '~1 person/sq mi (wilderness)' },
  { value: 'Low' as const, label: 'Low', description: '~5 people/sq mi (sparse)' },
  { value: 'Settled' as const, label: 'Settled', description: '~10 people/sq mi (frontier)' },
  { value: 'Average' as const, label: 'Average', description: '~20 people/sq mi (civilized)' },
  { value: 'High' as const, label: 'High', description: '~30 people/sq mi (densely settled)' },
  { value: 'Maximum' as const, label: 'Maximum', description: '~40 people/sq mi (highly developed)' },
];

export const CreateMapTab: React.FC<CreateMapTabProps> = ({ onMapGenerated, onMapSaved, savedMaps = [] }) => {
  const [kingdomName, setKingdomName] = useState('');
  const [physicalArea, setPhysicalArea] = useState<number | string>('10000');
  const [density, setDensity] = useState<'Desolate' | 'Low' | 'Settled' | 'Average' | 'High' | 'Maximum'>('Average');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<DemographicResults | null>(null);
  const [showMapBuilder, setShowMapBuilder] = useState(false);
  const [currentMap, setCurrentMap] = useState<GeneratedMap | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleGenerate = () => {
    const name = kingdomName.trim() || 'Unnamed Kingdom';
    const area = parseFloat(physicalArea as string);

    if (isNaN(area) || area <= 0) {
      alert('Please enter a valid physical area (in square miles)');
      return;
    }

    setIsGenerating(true);
    
    setTimeout(() => {
      const params: DemographicParameters = {
        kingdomName: name,
        physicalAreaSqMiles: area,
        populationDensity: density,
      };

      const calculatedResults = calculateDemographics(params);
      setResults(calculatedResults);
      setIsGenerating(false);
    }, 500);
  };

  const handleBuildMap = () => {
    if (!results) {
      alert('Generate demographics first');
      return;
    }

    const newMap: GeneratedMap = {
      id: generateId(),
      kingdomName: results.kingdomName,
      demographicParams: {
        physicalAreaSqMiles: results.physicalAreaSqMiles,
        populationDensity: results.populationDensity as any,
        totalPopulation: results.totalPopulation,
        numSettlements: results.numSettlements,
        numCities: results.numCities,
        numCastles: results.numCastles,
      },
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
        // Azgaar's tool doesn't expose state easily, but we can capture the canvas
        const canvas = iframeRef.current.contentDocument?.querySelector('canvas') as HTMLCanvasElement;
        if (canvas) {
          currentMap.image = canvas.toDataURL('image/png');
        }
      }
    } catch (e) {
      console.warn('Could not capture map image from iframe:', e);
    }

    currentMap.updatedAt = Date.now();
    onMapSaved?.(currentMap);
    setShowMapBuilder(false);
    alert(`Map "${currentMap.kingdomName}" saved!`);
  };

  const handleExportMap = () => {
    if (!currentMap) return;

    // Export map data as JSON
    const dataStr = JSON.stringify(currentMap, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `map-${currentMap.kingdomName.replace(/\s+/g, '-').toLowerCase()}.json`;

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
          {/* Demographics Form */}
          <div className="max-w-2xl">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
              <Sparkles className="inline mr-2" size={28} /> Create Map
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Generate fantasy map demographics, then use the embedded map builder to create your world.
            </p>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
              {/* Kingdom Name */}
              <div>
                <label className="block text-sm font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 mb-2">
                  Kingdom Name
                </label>
                <input
                  type="text"
                  value={kingdomName}
                  onChange={(e) => setKingdomName(e.target.value)}
                  placeholder="e.g., Eldoria, Westmarch"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Physical Area */}
              <div>
                <label className="block text-sm font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 mb-2">
                  Physical Area (Square Miles)
                </label>
                <input
                  type="number"
                  value={physicalArea}
                  onChange={(e) => setPhysicalArea(e.target.value)}
                  placeholder="10000"
                  min="100"
                  step="1000"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-1">Typical kingdom: 5,000-50,000 sq miles</p>
              </div>

              {/* Population Density */}
              <div>
                <label className="block text-sm font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 mb-3">
                  Population Density
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {DENSITY_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setDensity(preset.value)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        density === preset.value
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                          : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:border-indigo-300'
                      }`}
                    >
                      <div className="font-bold text-slate-900 dark:text-white">{preset.label}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">{preset.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Calculating...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Generate Demographics
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results */}
          {results && (
            <div className="space-y-6">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {results.kingdomName} Demographics
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
                  <div className="text-xs font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300 mb-1">Total Population</div>
                  <div className="text-3xl font-black text-blue-900 dark:text-blue-100">{results.totalPopulation.toLocaleString()}</div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-xl p-4 border border-emerald-200 dark:border-emerald-700">
                  <div className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300 mb-1">Urban Population</div>
                  <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100">{results.townPopulation.toLocaleString()}</div>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 rounded-xl p-4 border border-amber-200 dark:border-amber-700">
                  <div className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300 mb-1">Total Settlements</div>
                  <div className="text-3xl font-black text-amber-900 dark:text-amber-100">{results.numSettlements}</div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 rounded-xl p-4 border border-red-200 dark:border-red-700">
                  <div className="text-xs font-bold uppercase tracking-widest text-red-700 dark:text-red-300 mb-1">Castles</div>
                  <div className="text-3xl font-black text-red-900 dark:text-red-100">{results.numCastles}</div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-4 border border-green-200 dark:border-green-700">
                  <div className="text-xs font-bold uppercase tracking-widest text-green-700 dark:text-green-300 mb-1">Farms</div>
                  <div className="text-3xl font-black text-green-900 dark:text-green-100">{results.numFarms}</div>
                </div>
              </div>

              <button
                onClick={handleBuildMap}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-lg"
              >
                <ExternalLink size={20} /> Build Map in Plothole
              </button>
            </div>
          )}

          {/* Saved Maps */}
          {savedMaps && savedMaps.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Saved Maps
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
                {currentMap?.kingdomName} - Map Builder
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
                src="https://azgaar.github.io/Fantasy-Map-Generator/"
                title="Fantasy Map Generator"
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
