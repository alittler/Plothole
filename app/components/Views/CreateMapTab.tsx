import React, { useState } from 'react';
import { Sparkles, ExternalLink, Loader2 } from 'lucide-react';
import { calculateDemographics, DemographicParameters, DemographicResults } from '../../services/medievalDemographicsService';

interface CreateMapTabProps {
  onMapGenerated?: (results: DemographicResults) => void;
}

const DENSITY_PRESETS = [
  { value: 'Desolate' as const, label: 'Desolate', description: '~1 person/sq mi (wilderness)' },
  { value: 'Low' as const, label: 'Low', description: '~5 people/sq mi (sparse)' },
  { value: 'Settled' as const, label: 'Settled', description: '~10 people/sq mi (frontier)' },
  { value: 'Average' as const, label: 'Average', description: '~20 people/sq mi (civilized)' },
  { value: 'High' as const, label: 'High', description: '~30 people/sq mi (densely settled)' },
  { value: 'Maximum' as const, label: 'Maximum', description: '~40 people/sq mi (highly developed)' },
];

export const CreateMapTab: React.FC<CreateMapTabProps> = ({ onMapGenerated }) => {
  const [kingdomName, setKingdomName] = useState('');
  const [physicalArea, setPhysicalArea] = useState<number | string>('10000');
  const [density, setDensity] = useState<'Desolate' | 'Low' | 'Settled' | 'Average' | 'High' | 'Maximum'>('Average');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<DemographicResults | null>(null);

  const handleGenerate = () => {
    const name = kingdomName.trim() || 'Unnamed Kingdom';
    const area = parseFloat(physicalArea as string);

    if (isNaN(area) || area <= 0) {
      alert('Please enter a valid physical area (in square miles)');
      return;
    }

    setIsGenerating(true);
    
    // Simulate processing
    setTimeout(() => {
      const params: DemographicParameters = {
        kingdomName: name,
        physicalAreaSqMiles: area,
        populationDensity: density,
      };

      const calculatedResults = calculateDemographics(params);
      setResults(calculatedResults);
      onMapGenerated?.(calculatedResults);
      setIsGenerating(false);
    }, 500);
  };

  const handleOpenInAzgaar = () => {
    if (!results) {
      alert('Generate demographics first');
      return;
    }

    // Open Azgaar's Fantasy Map Generator in a new tab
    // You can pass parameters via URL if Azgaar supports them, or just open the main tool
    window.open('https://azgaar.github.io/Fantasy-Map-Generator/', '_blank');
  };

  return (
    <div className="p-6 space-y-8">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
          <Sparkles className="inline mr-2" size={28} /> Create Map
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Generate fantasy map demographics based on kingdom parameters. Results calculate population, settlements, and castles using medieval demographic formulas.
        </p>

        {/* Input Form */}
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
            {/* Total Population */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
              <div className="text-xs font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300 mb-1">
                Total Population
              </div>
              <div className="text-3xl font-black text-blue-900 dark:text-blue-100">
                {results.totalPopulation.toLocaleString()}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {results.physicalAreaSqMiles.toLocaleString()} sq mi @ {results.populationDensity}
              </div>
            </div>

            {/* Urban vs Rural */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-xl p-4 border border-emerald-200 dark:border-emerald-700">
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300 mb-1">
                Urban Population
              </div>
              <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
                {results.townPopulation.toLocaleString()}
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                Rural: {results.ruralPopulation.toLocaleString()}
              </div>
            </div>

            {/* Settlements */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 rounded-xl p-4 border border-amber-200 dark:border-amber-700">
              <div className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300 mb-1">
                Total Settlements
              </div>
              <div className="text-3xl font-black text-amber-900 dark:text-amber-100">
                {results.numSettlements}
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {results.numCities} cities, {results.numTowns} towns
              </div>
            </div>

            {/* Settlement Breakdown */}
            <div className="md:col-span-2 lg:col-span-1 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
              <div className="text-xs font-bold uppercase tracking-widest text-purple-700 dark:text-purple-300 mb-3">
                Settlement Types
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-purple-700 dark:text-purple-300">Villages:</span> <span className="font-bold text-purple-900 dark:text-purple-100">{results.numVillages}</span></div>
                <div className="flex justify-between"><span className="text-purple-700 dark:text-purple-300">Hamlets:</span> <span className="font-bold text-purple-900 dark:text-purple-100">{results.numHamlets}</span></div>
              </div>
            </div>

            {/* Castles */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 rounded-xl p-4 border border-red-200 dark:border-red-700">
              <div className="text-xs font-bold uppercase tracking-widest text-red-700 dark:text-red-300 mb-1">
                Castles/Strongholds
              </div>
              <div className="text-3xl font-black text-red-900 dark:text-red-100">
                {results.numCastles}
              </div>
            </div>

            {/* Farms */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-4 border border-green-200 dark:border-green-700">
              <div className="text-xs font-bold uppercase tracking-widest text-green-700 dark:text-green-300 mb-1">
                Farms
              </div>
              <div className="text-3xl font-black text-green-900 dark:text-green-100">
                {results.numFarms}
              </div>
            </div>
          </div>

          {/* Open in Azgaar Button */}
          <button
            onClick={handleOpenInAzgaar}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-lg"
          >
            <ExternalLink size={20} /> Open in Azgaar's Fantasy Map Generator
          </button>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Use these demographics to populate your map with settlements and castles. Adjust the generated map to suit your world.
          </p>
        </div>
      )}
    </div>
  );
};
