import React, { useState } from 'react';
import { ViewType, ProjectData, Location, Artifact, LoreEntry } from '../../types';
import { Plus, Minus, Map as MapIcon, Box, Book, Search, Edit2, Trash2, Maximize2, FileText, Clock, Upload, Layout, Sparkles, ChevronRight, CheckCircle, X, Save, Target, Globe, Loader2, MapPin, Activity, RotateCcw } from 'lucide-react';

import { MapView } from '../ui/MapView';
import { WikiText } from '../ui/WikiText';
import { generateId } from '../../services/storageService';

interface WorldSystemViewProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  data: ProjectData;
  onAddLocation: (l: Location) => void;
  onAddArtifact: (a: Artifact) => void;
  onUpdateArtifact: (a: Artifact) => void;
  onAddLore: (l: LoreEntry) => void;
  onUpdateLocation: (l: Location) => void;
  onLocationUndo: (id: string) => void;
  onLocationReset: (id: string) => void;
  onUpdateRootMap: (u: string) => void;
  onUpdateRootMapData: (s: number, u: string) => void;
  onUpdateMapOrder: () => void;
  onDeleteArtifact: (id: string) => void;
  onDeleteLore: (id: string) => void;
  onUpdateProject: (updates: Partial<ProjectData>) => void;
  currentMapParentId: string | null;
  onMapChange: (id: string | null) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onLinkClick: (type: string, id: string) => void;
}

enum WorldTab {
  ATLAS = 'Atlas',
  LOCATIONS = 'Locations',
  INVENTORY = 'Inventory',
  ENCYCLOPEDIA = 'Encyclopedia',
  DICTIONARY = 'Dictionary',
  COSMOLOGY = 'Cosmology'
}

export const WorldSystemView: React.FC<WorldSystemViewProps> = ({
  currentView, onChangeView, data, onAddLocation, onAddArtifact, onUpdateArtifact, onAddLore, onUpdateLocation, onLocationUndo, onLocationReset, onUpdateRootMap, onUpdateRootMapData, onUpdateMapOrder, onDeleteArtifact, onDeleteLore, onUpdateProject, currentMapParentId, onMapChange, isFullscreen, onToggleFullscreen, onLinkClick
}) => {
  const [activeTab, setActiveTab] = useState<WorldTab>(WorldTab.ATLAS);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [showOriginPulse, setShowOriginPulse] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isScaleOpen, setIsScaleOpen] = useState(false);
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  const [isMatching, setIsMatching] = useState(false);
  const [isMapMenuOpen, setIsMapMenuOpen] = useState(false);
  const [isWorldExpanded, setIsWorldExpanded] = useState(false);
  const [isWorldListOpen, setIsWorldListOpen] = useState(false);
  const [isManagerTabPlaced, setIsManagerTabPlaced] = useState(false);
  const [editingMapId, setEditingMapId] = useState<string | null>(null);
  const [editingMapName, setEditingMapName] = useState('');

  // Auto-generate shortIds for locations that don't have them
  React.useEffect(() => {
    const locationsWithoutShortId = data.locations.filter(l => !l.shortId);
    if (locationsWithoutShortId.length > 0) {
      const updated = data.locations.map(l => {
        if (l.shortId) return l;
        return { ...l, shortId: Math.random().toString(36).substring(2, 10) };
      });
      onUpdateProject({ locations: updated });
    }
  }, [data.locations]);
  
  // Local Scale Calibration State
  const [localScale, setLocalScale] = useState(data.mapScale || 100);
  const [localUnit, setLocalUnit] = useState(data.mapUnit || 'km');

  const zoomInRef = React.useRef<(() => void) | null>(null);
  const zoomOutRef = React.useRef<(() => void) | null>(null);
  const centerMapRef = React.useRef<((coords?: { x: number, y: number }) => void) | null>(null);
  const getViewStateRef = React.useRef<(() => { x: number, y: number, zoom: number } | null) | null>(null);

  const DEFAULT_MAP = `data:image/svg+xml,%3Csvg width='800' height='600' viewBox='0 0 800 600' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='%23f5f1e6'/%3E%3Cpath d='M0 0l800 600M800 0L0 600' stroke='%23e2e8f0' stroke-width='1'/%3E%3Ccircle cx='400' cy='300' r='100' fill='none' stroke='%23cbd5e1' stroke-dasharray='10,10'/%3E%3Ctext x='400' y='310' font-family='serif' font-size='24' fill='%2394a3b8' text-anchor='middle' font-style='italic'%3EUncharted Territory%3C/text%3E%3C/svg%3E`;

  const locationQueue = data.locations.filter(l => l.x === undefined || l.y === undefined);

  const handleMapUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Upload failed');
      const result = await response.json();
      if (currentMapParentId) {
        onUpdateProject({ locations: data.locations.map(l => l.id === currentMapParentId ? { ...l, mapImage: result.url } : l) });
      } else {
        onUpdateProject({ rootMapImage: result.url, isRealWorldMap: false });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to upload map to server.");
    }
  };

  const handleAutoMatch = async () => {
    if (!confirm("Attempt to match ALL locations to real-world coordinates using Earth data? This may overwrite existing positions.")) return;
    setIsMatching(true);
    const updatedLocations = [...data.locations];
    let matchedCount = 0;
    for (let i = 0; i < updatedLocations.length; i++) {
      const loc = updatedLocations[i];
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(loc.name)}&limit=1`);
        const results = await res.json();
        if (results && results.length > 0) {
          const lon = parseFloat(results[0].lon);
          const lat = parseFloat(results[0].lat);
          updatedLocations[i] = { ...loc, x: lon, y: lat, matchedX: lon, matchedY: lat };
          matchedCount++;
        }
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        console.error(`Failed to match ${loc.name}:`, err);
      }
    }
    if (matchedCount > 0) {
      onUpdateProject({ locations: updatedLocations });
      alert(`Successfully matched ${matchedCount} locations to Earth.`);
    } else {
      alert("No matches found.");
    }
    setIsMatching(false);
  };

  const filteredLocations = data.locations.filter(l => l.x !== undefined && l.y !== undefined && l.parentId === (currentMapParentId || undefined));
  const parentLocation = data.locations.find(l => l.id === currentMapParentId);

  return (
    <div className="h-full w-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <div className={`transition-all duration-700 ease-in-out overflow-hidden shrink-0 ${isFullscreen ? 'max-h-0 opacity-0' : 'max-h-64 opacity-100'}`}>
        <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-left">
              <h1 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">WORLD HUB</h1>
              <p className="hidden md:block text-xs md:text-sm text-slate-500 dark:text-slate-400">Geography, artifacts, and the lore of your universe.</p>
            </div>
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto no-scrollbar w-full md:w-auto">
              {Object.values(WorldTab).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 md:px-4 py-1.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </header>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden relative">
        <div className="h-full w-full flex flex-col items-center p-4 md:p-8 relative">
          <div className={`h-full w-full flex flex-col ${isFullscreen ? 'max-w-none' : 'max-w-6xl'} ${activeTab !== WorldTab.ATLAS ? 'space-y-12 overflow-y-auto pb-12' : ''}`}>
            
            {activeTab === WorldTab.ATLAS && (
              <div className="flex-1 min-h-0 relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-slate-100 dark:bg-slate-900 w-full flex flex-col">
                
                {/* Initial Choice State */}
                {(!data.rootMapImage && !data.isRealWorldMap && !currentMapParentId) ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
                    <div className="space-y-2">
                      <div className="w-20 h-20 bg-indigo-600 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-600/20 mb-6">
                        <MapIcon size={40} />
                      </div>
                      <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Initialize Atlas</h2>
                      <p className="text-slate-500 max-w-md mx-auto font-serif italic text-lg">Define the cartographic foundation of your universe.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                      <button 
                        onClick={() => onUpdateProject({ isRealWorldMap: true })}
                        className="group p-8 bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-xl hover:border-blue-500 transition-all flex flex-col items-center gap-4 text-center"
                      >
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-3xl group-hover:scale-110 transition-transform">
                          <Globe size={32} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase">Real World</h3>
                          <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-widest">Earth Settings (OpenStreetMap)</p>
                        </div>
                      </button>

                      <label className="group p-8 bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-xl hover:border-emerald-500 transition-all flex flex-col items-center gap-4 text-center cursor-pointer">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-3xl group-hover:scale-110 transition-transform">
                          <MapIcon size={32} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase">Fantasy Map</h3>
                          <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-widest">Custom Image Upload</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={handleMapUpload} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <>
                    <MapView 
                      locations={filteredLocations} 
                      rootMapImage={parentLocation?.mapImage || data.rootMapImage || DEFAULT_MAP} 
                      mapUnit={data.mapUnit}
                      mapScale={data.mapScale}
                      defaultView={data.mapDefaultView}
                      zoomInRef={zoomInRef}
                      zoomOutRef={zoomOutRef}
                      centerMapRef={centerMapRef}
                      getViewStateRef={getViewStateRef}
                      onDimensionsDetected={(width, height) => setMapDimensions({ width, height })}
                      isRealWorld={currentMapParentId ? parentLocation?.isRealWorld : data.isRealWorldMap}
                      onLocationClick={(id) => {
                        setSelectedLocationId(id);
                        const loc = data.locations.find(l => l.id === id);
                        if (loc && loc.mapImage) onMapChange(loc.id);
                      }}
                      onLocationPlace={(id, x, y) => {
                        const loc = data.locations.find(l => l.id === id);
                        if (loc) onUpdateLocation({ ...loc, x, y, prevX: loc.x, prevY: loc.y, parentId: currentMapParentId || undefined, mapId: currentMapParentId || 'root' });
                      }}
                      onLocationMove={(id, x, y) => {
                        const loc = data.locations.find(l => l.id === id);
                        if (loc) onUpdateLocation({ ...loc, x, y, prevX: loc.x, prevY: loc.y, mapId: currentMapParentId || 'root' });
                      }}
                      onLocationUnplace={(id) => {
                        const loc = data.locations.find(l => l.id === id);
                        if (loc) onUpdateLocation({ ...loc, x: undefined, y: undefined, parentId: undefined });
                      }}
                      onLocationUndo={(id) => {
                        const loc = data.locations.find(l => l.id === id);
                        if (loc && loc.prevX !== undefined && loc.prevY !== undefined) onUpdateLocation({ ...loc, x: loc.prevX, y: loc.prevY, prevX: undefined, prevY: undefined });
                      }}
                      onLocationReset={(id) => {
                        const loc = data.locations.find(l => l.id === id);
                        if (loc && loc.matchedX !== undefined && loc.matchedY !== undefined) onUpdateLocation({ ...loc, x: loc.matchedX, y: loc.matchedY });
                      }}
                      onLocationLock={(id, isLocked) => {
                        const loc = data.locations.find(l => l.id === id);
                        if (loc) onUpdateLocation({ ...loc, isLocked });
                      }}
                      onMapClick={() => {
                        setIsMapMenuOpen(false);
                        setIsScaleOpen(false);
                      }}
                    />

                    {showOriginPulse && (
                      <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
                        <div className="w-32 h-32 border-4 border-rose-500 rounded-full animate-ping opacity-75" />
                        <div className="absolute bg-rose-600 text-white px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest animate-bounce shadow-2xl">
                          View Saved as Default
                        </div>
                      </div>
                    )}

                    <div className="absolute top-3 md:top-6 left-3 md:left-6 right-3 md:right-6 flex items-start justify-between pointer-events-none z-30">
                      <div className="flex flex-col gap-2 md:gap-3 pointer-events-auto">
                        <div className="relative group/breadcrumbs">
                          <div className="flex items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1 rounded-xl md:rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                            <button 
                              onClick={() => { if (!currentMapParentId) setIsWorldExpanded(!isWorldExpanded); setIsWorldListOpen(!isWorldListOpen); }} 
                              className={`h-10 md:h-12 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg md:rounded-xl transition-all px-3 ${isWorldExpanded || currentMapParentId ? 'min-w-[100px]' : 'w-10 md:w-12'} ${!currentMapParentId ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-500'}`}
                            >
                              <MapIcon size={20} className="md:w-6 md:h-6 shrink-0" />
                              <div className={`overflow-hidden transition-all duration-500 ease-in-out flex items-center ${isWorldExpanded || currentMapParentId ? 'max-w-[100px] opacity-100 ml-2' : 'max-w-0 opacity-0'}`}>
                                <span className="text-xs font-black uppercase tracking-widest whitespace-nowrap">Atlas</span>
                              </div>
                            </button>
                            {parentLocation && (
                              <div className="flex items-center gap-1.5 md:gap-2 pr-2 animate-in slide-in-from-left-4 duration-500">
                                <div className="h-4 md:h-6 w-px bg-slate-200 dark:bg-slate-800" />
                                <ChevronRight size={12} className="text-slate-400" />
                                <span className="text-[10px] md:text-sm text-slate-900 dark:text-white font-black uppercase tracking-tight truncate max-w-[120px] md:max-w-none">{parentLocation.name}</span>
                              </div>
                            )}
                          </div>

                          {isWorldListOpen && (
                            <div className="absolute top-full left-0 mt-3 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-800 min-w-[320px] animate-in fade-in slide-in-from-top-4 duration-300 z-[100]">
                              <div className="flex items-center justify-between mb-4 px-2">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atlas</h3>
                                <div className="flex items-center gap-1">
                                  <button 
                                    onClick={() => {
                                      if (!confirm("RESET ATLAS: This will clear ALL placements and reset to initial map selection. Continue?")) return;
                                      const resetLocs = data.locations.map(l => ({ ...l, x: undefined, y: undefined, parentId: undefined, mapId: undefined, mapImage: undefined, isRealWorld: false, isLocked: false }));
                                      onUpdateProject({ isRealWorldMap: false, rootMapImage: undefined, mapScale: undefined, mapDefaultView: undefined, locations: resetLocs });
                                      onMapChange(null);
                                      setIsWorldListOpen(false);
                                    }}
                                    className="p-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
                                    title="Reset Atlas"
                                  >
                                    <RotateCcw size={14} />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const name = prompt("Enter new map name:", "New Map Layer");
                                      if (!name) return;
                                      const isReal = confirm("Is this a Real World (Earth) map? (Cancel for Custom Fantasy map)");
                                      onAddLocation({ id: generateId(), name, description: '', type: 'Region', source: 'manual', shortId: Math.random().toString(36).substring(2, 10), mapImage: DEFAULT_MAP, isRealWorld: isReal });
                                      setIsWorldListOpen(false);
                                    }}
                                    className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                    title="Add New Root Map"
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                              </div>
                              
                              <div className="space-y-1 max-h-[400px] overflow-y-auto no-scrollbar pr-1">
                                <div className="flex items-center gap-1 group/root">
                                  <button 
                                    onClick={() => { onMapChange(null); setIsWorldListOpen(false); }}
                                    className={`flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${!currentMapParentId ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <Globe size={14} className={!currentMapParentId ? 'text-emerald-500' : 'text-slate-400'} />
                                      {data.isRealWorldMap ? 'Earth (Global)' : 'Fantasy (Global)'}
                                    </div>
                                    <span className="text-[8px] font-mono opacity-40 uppercase tracking-tighter">Root</span>
                                  </button>
                                  
                                  <div className="flex items-center gap-1">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const name = prompt("Enter sub-layer name:", "New Sub-Layer");
                                        if (!name) return;
                                        const isReal = confirm("Is this a Real World (Earth) map? (Cancel for Custom Fantasy map)");
                                        onAddLocation({ id: generateId(), name, description: '', type: 'Region', source: 'manual', shortId: Math.random().toString(36).substring(2, 10), mapImage: DEFAULT_MAP, isRealWorld: isReal });
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-emerald-600"
                                      title="Add Sub-layer to Root"
                                    >
                                      <Plus size={12} />
                                    </button>
                                    {data.isRealWorldMap && (
                                      <button onClick={(e) => { e.stopPropagation(); handleAutoMatch(); }} disabled={isMatching} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Auto-match ALL to Earth">{isMatching ? <Loader2 size={12} className="animate-spin" /> : <Target size={12} />}</button>
                                    )}
                                    <button 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        const locsOnRoot = data.locations.filter(l => !l.parentId && l.x !== undefined);
                                        if (locsOnRoot.length > 0) {
                                          if (!confirm(`Switching to ${!data.isRealWorldMap ? 'Earth' : 'Fantasy'} mode will remove all ${locsOnRoot.length} locations currently placed on this map layer. Continue?`)) return;
                                          const updatedLocs = data.locations.map(l => !l.parentId ? { ...l, x: undefined, y: undefined, isRealWorld: !data.isRealWorldMap } : l);
                                          onUpdateProject({ isRealWorldMap: !data.isRealWorldMap, locations: updatedLocs });
                                        } else {
                                          onUpdateProject({ isRealWorldMap: !data.isRealWorldMap }); 
                                        }
                                      }}
                                      className={`p-1.5 rounded-lg transition-colors ${data.isRealWorldMap ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'}`}
                                      title={data.isRealWorldMap ? "Switch to Fantasy Map" : "Switch to Earth Map"}
                                    >
                                      {data.isRealWorldMap ? <MapIcon size={12} /> : <Globe size={12} />}
                                    </button>
                                  </div>
                                </div>

                                {(() => {
                                  const renderMapLevel = (parentId: string | null, depth = 0) => {
                                    return data.locations
                                      .filter(l => l.parentId === (parentId || undefined) && l.mapImage)
                                      .map(mapLoc => (
                                        <React.Fragment key={mapLoc.id}>
                                          <div className="flex items-center gap-1 group/item">
                                            <div className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${currentMapParentId === mapLoc.id ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`} style={{ marginLeft: `${depth * 0.5}rem` }}>
                                              {editingMapId === mapLoc.id ? (
                                                <input type="text" value={editingMapName} autoFocus onChange={e => setEditingMapName(e.target.value)} onBlur={() => { if (editingMapName.trim()) onUpdateLocation({ ...mapLoc, name: editingMapName }); setEditingMapId(null); }} onKeyDown={e => { if (e.key === 'Enter') { if (editingMapName.trim()) onUpdateLocation({ ...mapLoc, name: editingMapName }); setEditingMapId(null); } }} className="bg-white dark:bg-slate-800 border-none rounded px-1 py-0.5 w-full outline-none ring-1 ring-emerald-500" />
                                              ) : (
                                                <>
                                                  <div onClick={() => { onMapChange(mapLoc.id); setIsWorldListOpen(false); }} className="flex items-center gap-3 truncate cursor-pointer flex-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/30" />
                                                    <span className="truncate">{mapLoc.name}</span>
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    <button 
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        const name = prompt("Enter sub-layer name:", "New Sub-Layer");
                                                        if (!name) return;
                                                        const isReal = confirm("Is this a Real World (Earth) map? (Cancel for Custom Fantasy map)");
                                                        onAddLocation({ id: generateId(), name, description: '', type: 'Region', source: 'manual', parentId: mapLoc.id, mapId: mapLoc.id, shortId: Math.random().toString(36).substring(2, 10), mapImage: DEFAULT_MAP, isRealWorld: isReal });
                                                      }}
                                                      className="p-1 text-slate-400 hover:text-emerald-600"
                                                      title="Add Sub-layer"
                                                    >
                                                      <Plus size={10} />
                                                    </button>
                                                    <button 
                                                      onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        const locsOnMap = data.locations.filter(l => l.parentId === mapLoc.id && l.x !== undefined);
                                                        if (locsOnMap.length > 0) {
                                                          if (!confirm(`Switching to ${!mapLoc.isRealWorld ? 'Earth' : 'Fantasy'} mode will remove all ${locsOnMap.length} locations currently placed on this map layer. Continue?`)) return;
                                                          const updated = data.locations.map(l => l.id === mapLoc.id ? { ...l, isRealWorld: !l.isRealWorld } : (l.parentId === mapLoc.id ? { ...l, x: undefined, y: undefined } : l));
                                                          onUpdateProject({ locations: updated });
                                                        } else {
                                                          onUpdateLocation({ ...mapLoc, isRealWorld: !mapLoc.isRealWorld });
                                                        }
                                                      }}
                                                      className={`p-1 rounded transition-colors ${mapLoc.isRealWorld ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'}`}
                                                      title={mapLoc.isRealWorld ? "Switch to Fantasy Map" : "Switch to Earth Map"}
                                                    >
                                                      {mapLoc.isRealWorld ? <MapIcon size={10} /> : <Globe size={10} />}
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); setEditingMapId(mapLoc.id); setEditingMapName(mapLoc.name); }} className="p-1 opacity-0 group-hover/item:opacity-100 hover:text-indigo-500 transition-all"><Edit2 size={10} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete map layer "${mapLoc.name}"?`)) onUpdateLocation({ ...mapLoc, mapImage: undefined }); }} className="p-1 opacity-0 group-hover/item:opacity-100 hover:text-red-500 transition-all"><Trash2 size={10} /></button>
                                                    <span className="text-[8px] font-mono opacity-60 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase ml-1">{mapLoc.shortId}</span>
                                                  </div>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                          {renderMapLevel(mapLoc.id, depth + 1)}
                                        </React.Fragment>
                                      ));
                                  };
                                  return renderMapLevel(null);
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 md:gap-3 items-end pointer-events-auto">
                        <div className="flex items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl md:rounded-2xl shadow-xl border border-white/20 transition-all duration-500 ease-in-out overflow-hidden">
                          <div className={`flex items-center transition-all duration-500 ease-in-out ${isMapMenuOpen ? 'max-w-[600px] opacity-100 px-2 gap-1 md:gap-2' : 'max-w-0 opacity-0 pointer-events-none'}`}>
                            <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggleFullscreen?.(); }} className={`p-1.5 md:p-2 rounded-lg md:rounded-xl transition-colors ${isFullscreen ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-500 hover:text-indigo-600'}`} title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}><Maximize2 size={16} className="md:w-5 md:h-5" /></button>
                            <div className="w-px h-4 md:h-6 bg-slate-200 dark:bg-slate-800 self-center" />
                            <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (getViewStateRef.current) { const view = getViewStateRef.current(); if (view) { onUpdateProject({ mapDefaultView: view }); setShowOriginPulse(true); setTimeout(() => setShowOriginPulse(false), 2000); } } }} className="p-1.5 md:p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg md:rounded-xl transition-colors" title="Save current view as default"><Activity size={16} className="md:w-5 md:h-5" /></button>
                            <div className="w-px h-4 md:h-6 bg-slate-200 dark:bg-slate-800 self-center" />
                            <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIsQueueOpen(!isQueueOpen); }} className={`p-1.5 md:p-2 rounded-lg md:rounded-xl transition-colors ${isQueueOpen ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-500 hover:text-indigo-600'}`} title="Location Manager"><MapPin size={16} className="md:w-5 md:h-5" /></button>
                            <div className="w-px h-4 md:h-6 bg-slate-200 dark:bg-slate-800 self-center" />
                            <label className="p-1.5 md:p-2 text-slate-500 hover:text-indigo-600 cursor-pointer rounded-lg md:rounded-xl transition-colors" title="Change Map" onClick={(e) => e.stopPropagation()}><Upload size={16} className="md:w-5 md:h-5" /><input type="file" className="hidden" accept="image/*" onChange={handleMapUpload} /></label>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIsMapMenuOpen(!isMapMenuOpen); }} className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg md:rounded-xl transition-all ${isMapMenuOpen ? 'bg-emerald-600 text-white rotate-180 shadow-lg' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><MapIcon size={20} className="md:w-6 md:h-6 shrink-0" /></button>
                        </div>
                      </div>
                    </div>

                    {isScaleOpen && (
                      <div className="absolute bottom-24 left-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-[2rem] shadow-2xl border border-white/20 w-64 space-y-3 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest"><Search size={12} /> Scale Calibration</div>
                          <button onClick={() => setIsScaleOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={14} /></button>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase font-bold"><span>Image Width:</span><span className="font-mono">{mapDimensions.width}px</span></div>
                          <div className="flex items-center gap-2">
                            <input type="number" value={localScale} onChange={(e) => setLocalScale(parseInt(e.target.value) || 0)} className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Width value" />
                            <select value={localUnit} onChange={(e) => setLocalUnit(e.target.value)} className="bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-2 py-1.5 text-[10px] font-black uppercase text-indigo-600 outline-none"><option value="km">KM</option><option value="mi">mi</option></select>
                          </div>
                          <button onClick={() => { onUpdateProject({ mapScale: localScale, mapUnit: localUnit }); setIsScaleOpen(false); }} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"><CheckCircle size={12} /> Apply Calibration</button>
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-30 pointer-events-none">
                      <div className="flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl shadow-xl border border-white/20 overflow-hidden pointer-events-auto">
                        <button onClick={() => zoomInRef.current?.()} className="p-3 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800" title="Zoom In"><Plus size={20} /></button>
                        <button onClick={() => zoomOutRef.current?.()} className="p-3 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" title="Zoom Out"><Minus size={20} /></button>
                      </div>
                    </div>

                    <aside className={`absolute top-24 bottom-6 right-6 z-40 w-80 bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border border-white/20 dark:border-slate-800 shadow-2xl transition-all duration-500 ease-in-out rounded-3xl p-6 flex flex-col space-y-6 ${isQueueOpen ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-12 opacity-0 scale-95 pointer-events-none'}`}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={14} /> Location Manager</h3>
                        <button onClick={() => setIsQueueOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"><X size={16} /></button>
                      </div>
                      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); setIsWorldExpanded(false); }} className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${!isWorldExpanded ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Unplaced ({locationQueue.length})</button>
                        <button onClick={(e) => { e.stopPropagation(); setIsWorldExpanded(true); }} className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${isWorldExpanded ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Placed ({filteredLocations.length})</button>
                      </div>
                      <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                        {!isWorldExpanded ? (
                          locationQueue.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-center space-y-3 p-4 py-12"><CheckCircle size={24} className="text-slate-300" /><p className="text-xs text-slate-400 italic">All locations placed.</p></div>) : (
                            locationQueue.map(loc => (
                              <div key={loc.id} draggable onDragStart={(e) => e.dataTransfer.setData('locationId', loc.id)} className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm cursor-grab active:cursor-grabbing group hover:border-indigo-500/50 transition-all hover:shadow-md">
                                <div className="flex items-center justify-between mb-1"><span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{loc.type}</span><Edit2 size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 cursor-pointer" onClick={() => onLinkClick('admin', loc.id)} /></div>
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm break-words">{loc.name}</h4>
                                <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 italic">Drag icon to place on current map</p>
                              </div>
                            ))
                          )
                        ) : (
                          filteredLocations.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-center space-y-3 p-4 py-12"><MapPin size={24} className="text-slate-200" /><p className="text-xs text-slate-400 italic">No locations on this layer.</p></div>) : (
                            filteredLocations.map(loc => (
                              <div key={loc.id} className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm group hover:border-emerald-500/50 transition-all">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{loc.type}</span>
                                  <div className="flex items-center gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); onUpdateLocation({ ...loc, isLocked: !(loc.isLocked ?? (loc.matchedX !== undefined)) }); }} className={`p-1 rounded transition-colors ${ (loc.isLocked ?? (loc.matchedX !== undefined)) ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:bg-slate-50'}`} title={(loc.isLocked ?? (loc.matchedX !== undefined)) ? "Unlock Marker" : "Lock Marker"}>{ (loc.isLocked ?? (loc.matchedX !== undefined)) ? <MapPin size={12} /> : <Sparkles size={12} /> }</button>

                                    {loc.prevX !== undefined && (
                                      <button onClick={() => onLocationUndo(loc.id)} className="p-1 text-slate-400 hover:text-indigo-600" title="Undo Move">
                                        <RotateCcw size={12} />
                                      </button>
                                    )}

                                    {loc.matchedX !== undefined && (
                                      <button onClick={() => onLocationReset(loc.id)} className="p-1 text-slate-400 hover:text-blue-600" title="Reset to Earth">
                                        <Globe size={12} />
                                      </button>
                                    )}

                                    <Edit2 size={12} className="text-slate-300 hover:text-indigo-500 cursor-pointer" onClick={() => onLinkClick?.('admin', loc.id)} />

                                    <button onClick={() => onUpdateLocation({ ...loc, x: undefined, y: undefined, parentId: undefined, mapId: undefined, mapImage: undefined })}><Trash2 size={12} className="text-slate-300 hover:text-red-500 cursor-pointer" /></button>
                                  </div>
                                </div>
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm break-words">{loc.name}</h4>
                                <span className="text-[8px] font-mono text-slate-400 uppercase">COORD: {loc.x?.toFixed(1)}, {loc.y?.toFixed(1)}</span>
                              </div>
                            ))
                          )
                        )}
                      </div>
                    </aside>
                  </>
                )}
              </div>
            )}

            {activeTab === WorldTab.LOCATIONS && (
              <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl"><MapIcon size={24} /></div>
                    <div><h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Geographic Roster</h2><p className="text-sm text-slate-500 uppercase font-bold tracking-widest">Points of Interest and Regional Bounds</p></div>
                  </div>
                  <button onClick={() => onAddLocation({ id: generateId(), name: 'New Location', description: '', type: 'City', source: 'manual' })} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"><Plus size={18} /> New Location</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.locations.map(loc => (
                    <div key={loc.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group relative">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{loc.type}</span>
                        <div className="flex items-center gap-2 transition-opacity">
                          {!loc.mapImage && <button onClick={() => onUpdateLocation({ ...loc, mapImage: DEFAULT_MAP, type: 'Region' })} className="text-slate-400 hover:text-emerald-500 transition-colors" title="Turn into Map Link"><MapIcon size={14} /></button>}
                          <button onClick={() => onLinkClick?.('admin', loc.id)} className="text-slate-400 hover:text-indigo-500 transition-colors"><Edit2 size={14} /></button>
                          <button onClick={() => onUpdateLocation({ ...loc, x: undefined, y: undefined, parentId: undefined, mapId: undefined, mapImage: undefined })} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{loc.name}</h3>
                      <p className="text-sm text-slate-500 line-clamp-2 mt-2 font-serif italic">{loc.description || 'No description yet.'}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === WorldTab.INVENTORY && (
              <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl"><Box size={24} /></div>
                    <div><h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Inventory</h2><p className="text-sm text-slate-500 uppercase font-bold tracking-widest">Artifacts and Objects</p></div>
                  </div>
                  <button onClick={() => onAddArtifact({ id: generateId(), name: 'New Artifact', type: 'Relic', description: '', source: 'manual' })} className="px-4 py-2 bg-amber-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20"><Plus size={18} /> New Artifact</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.artifacts?.map(art => (
                    <div key={art.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group relative">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{art.type}</span>
                        <div className="flex items-center gap-2 transition-opacity">
                          <button onClick={() => onLinkClick?.('admin', art.id)} className="text-slate-400 hover:text-indigo-500 transition-colors"><Edit2 size={14} /></button>
                          <button onClick={() => onDeleteArtifact(art.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{art.name}</h3>
                      <p className="text-sm text-slate-500 line-clamp-2 mt-2 font-serif italic">{art.description || 'No description.'}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === WorldTab.ENCYCLOPEDIA && (
              <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl"><Book size={24} /></div>
                    <div><h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Encyclopedia</h2><p className="text-sm text-slate-500 uppercase font-bold tracking-widest">Lore and Narrative Grounds</p></div>
                  </div>
                  <button onClick={() => onAddLore({ id: generateId(), term: 'New Entry', definition: '', category: 'General', source: 'manual' })} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"><Plus size={18} /> New Entry</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {data.lore?.filter(l => l.category !== 'Dictionary').map(entry => (
                    <div key={entry.id} className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative group">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{entry.category}</span>
                        <div className="flex items-center gap-2 transition-opacity">
                          <button onClick={() => onLinkClick?.('admin', entry.id)} className="text-slate-400 hover:text-indigo-500 transition-colors"><Edit2 size={16} /></button>
                          <button onClick={() => onDeleteLore(entry.id)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-2">{entry.term}</h3>
                      <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-serif"><WikiText text={entry.definition} projectData={data} onLinkClick={onLinkClick} /></div>
                    </div>
                  )) || <p className="p-8 text-center text-slate-400 italic">No encyclopedia entries yet.</p>}
                </div>
              </section>
            )}

            {activeTab === WorldTab.DICTIONARY && (
              <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl"><FileText size={24} /></div>
                    <div><h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Lexicon</h2><p className="text-sm text-slate-500 uppercase font-bold tracking-widest">Constructed Language and Terminology</p></div>
                  </div>
                  <button onClick={() => onAddLore({ id: generateId(), term: 'New Word', definition: '', category: 'Dictionary', source: 'manual' })} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"><Plus size={18} /> New Word</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-8">
                  {data.lore?.filter(l => l.category === 'Dictionary').map(entry => (
                    <div key={entry.id} className="border-b border-slate-100 dark:border-slate-800 pb-4 group relative">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">{entry.term}</h3>
                        <div className="flex items-center gap-2 transition-opacity">
                          <button onClick={() => onLinkClick?.('admin', entry.id)} className="text-slate-400 hover:text-indigo-500 transition-colors"><Edit2 size={14} /></button>
                          <button onClick={() => onDeleteLore(entry.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{entry.definition}</p>
                    </div>
                  )) || <p className="col-span-2 p-8 text-center text-slate-400 italic">No dictionary entries yet.</p>}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
