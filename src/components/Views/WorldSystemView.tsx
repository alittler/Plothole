import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ViewType, ProjectData, Location, Artifact, LoreEntry, Note, ProseDocument, User, ProjectMetadata, MapPath } from '../../types';
import { Plus, Minus, Map as MapIcon, Box, Book, Search, Edit2, Trash2, Maximize2, FileText, Clock, Upload, Layout, Sparkles, ChevronRight, CheckCircle, X, Save, Target, Globe, Loader2, MapPin, Activity, RotateCcw, Ruler, Layers } from 'lucide-react';

import { MapView } from '../ui/MapView';
import { WikiText } from '../ui/WikiText';
import { generateId } from '../../services/storageService';
import { RichEditor } from '../ui/RichEditor';
import { Modal } from '../ui/Modal';

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
  projectsMetadata?: ProjectMetadata[];
  currentUser?: User;
}

enum WorldTab {
  MAP = 'Interactive Map',
  LOCATIONS = 'Locations & Paths',
  INVENTORY = 'Inventory',
  RECIPE_BOOK = 'Recipe Book'
}

// Parse directional coordinates like "51.5280° N, 123.1207° W" to +/- format
function parseDirectionalCoordinates(input: string): { lat: number; lng: number } | null {
  const coordRegex = /(\d+\.?\d*)\s*°?\s*([NSns])?[,\s]+(\d+\.?\d*)\s*°?\s*([EWew])?/;
  const match = input.trim().match(coordRegex);
  
  if (!match) return null;
  
  let lat = parseFloat(match[1]);
  const latDir = match[2]?.toUpperCase();
  let lng = parseFloat(match[3]);
  const lngDir = match[4]?.toUpperCase();
  
  // Apply direction to latitude
  if (latDir === 'S') lat = -lat;
  // Apply direction to longitude
  if (lngDir === 'W') lng = -lng;
  
  return { lat, lng };
}

export const WorldSystemView: React.FC<WorldSystemViewProps> = ({
  data, 
  onUpdateProject, 
  onLinkClick,
  isFullscreen,
  onToggleFullscreen,
  currentMapParentId,
  onMapChange,
  onUpdateLocation,
  onAddLocation,
  onLocationUndo,
  onLocationReset,
  onAddArtifact,
  onDeleteArtifact,
  onAddLore,
  onDeleteLore,
  onUpdateRootMap,
  projectsMetadata,
  currentUser
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as WorldTab) || WorldTab.MAP;
  const setActiveTab = (tab: WorldTab) => setSearchParams({ tab });

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [showOriginPulse, setShowOriginPulse] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isScaleOpen, setIsScaleOpen] = useState(false);
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  const [isMatching, setIsMatching] = useState(false);
  const [isMapMenuOpen, setIsMapMenuOpen] = useState(false);
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [isWorldExpanded, setIsWorldExpanded] = useState(false);
  const [editingMapId, setEditingMapId] = useState<string | null>(null);
  const [editingMapName, setEditingMapName] = useState("");
  const [localScale, setLocalScale] = useState(data.mapScale || 100);
  const [localUnit, setLocalUnit] = useState(data.mapUnit || "km");

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [editingArtifact, setEditingArtifact] = useState<Artifact | null>(null);
  const [editingPath, setEditingPath] = useState<MapPath | null>(null);

  // Add Location Dialog State
  const [showAddLocationDialog, setShowAddLocationDialog] = useState(false);
  const [addLocationMethod, setAddLocationMethod] = useState<'search' | 'coords' | 'xy' | null>(null);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationLat, setLocationLat] = useState('');
  const [locationLng, setLocationLng] = useState('');
  const [locationX, setLocationX] = useState('');
  const [locationY, setLocationY] = useState('');
  const [locationName, setLocationName] = useState('');

  const zoomInRef = useRef<() => void>(null);
  const zoomOutRef = useRef<() => void>(null);
  const fitAllLocationsRef = useRef<() => void>(null);
  const centerMapRef = useRef<() => void>(null);
  const getViewStateRef = useRef<() => any>(null);

  useEffect(() => {
    const locationsWithoutShortId = data.locations.filter((l) => !l.shortId);
    if (locationsWithoutShortId.length > 0) {
      const updated = data.locations.map((l) => {
        if (l.shortId) return l;
        return { ...l, shortId: Math.random().toString(36).substring(2, 10) };
      });
      onUpdateProject({ locations: updated });
    }
  }, [data.locations]);

  const DEFAULT_MAP = `data:image/svg+xml,%3Csvg width='800' height='600' viewBox='0 0 800 600' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='%23f5f1e6'/%3E%3Cpath d='M0 0l800 600M800 0L0 600' stroke='%23e2e8f0' stroke-width='1'/%3E%3Ccircle cx='400' cy='300' r='100' fill='none' stroke='%23cbd5e1' stroke-dasharray='10,10'/%3E%3Ctext x='400' y='310' font-family='serif' font-size='24' fill='%2394a3b8' text-anchor='middle' font-style='italic'%3EUncharted Territory%3C/text%3E%3C/svg%3E`;

  const locationQueue = data.locations.filter((l) => l.x === undefined || l.y === undefined);
  const filteredLocations = data.locations.filter((l) => l.x !== undefined && l.y !== undefined && l.parentId === (currentMapParentId || undefined));
  const parentLocation = data.locations.find((l) => l.id === currentMapParentId);

  const handleMapUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);
    try {
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Upload failed");
      const result = await response.json();
      if (currentMapParentId) {
        onUpdateLocation({ ...data.locations.find(l => l.id === currentMapParentId)!, mapImage: result.url, isRealWorld: false });
      } else {
        onUpdateProject({ rootMapImage: result.url, isRealWorldMap: false });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to upload map image.");
    }
  };

  const handleOpenLocationEdit = (loc: Location) => {
    setEditingLocation({ ...loc });
    setEditingArtifact(null);
    setEditingPath(null);
    setIsEditModalOpen(true);
  };

  const handleOpenArtifactEdit = (art: Artifact) => {
    setEditingArtifact({ ...art });
    setEditingLocation(null);
    setEditingPath(null);
    setIsEditModalOpen(true);
  };

  const handleOpenPathEdit = (path: MapPath) => {
    setEditingPath({ ...path });
    setEditingLocation(null);
    setEditingArtifact(null);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingLocation) {
      const sanitized = {
        ...editingLocation,
        x: editingLocation.x !== undefined ? Number(editingLocation.x.toFixed(6)) : undefined,
        y: editingLocation.y !== undefined ? Number(editingLocation.y.toFixed(6)) : undefined
      };
      onUpdateLocation(sanitized);
    } else if (editingArtifact) {
      onUpdateProject({ artifacts: (data.artifacts || []).map(a => a.id === editingArtifact.id ? editingArtifact : a) });
    } else if (editingPath) {
      onUpdateProject({ paths: (data.paths || []).map(p => p.id === editingPath.id ? editingPath : p) });
    }
    setIsEditModalOpen(false);
    setEditingLocation(null);
    setEditingArtifact(null);
    setEditingPath(null);
  };

  const handleLocationPlace = (id: string, x: number, y: number) => {
    const loc = data.locations.find(l => l.id === id);
    if (loc) {
      onUpdateLocation({ ...loc, x, y, prevX: loc.x, prevY: loc.y, parentId: currentMapParentId || undefined, mapId: currentMapParentId || 'root' });
      setIsQueueOpen(false); // Close location manager on drop
    }
  };

  const isCurrentMapRealWorld = (() => {
    if (currentMapParentId) {
      const parent = data.locations.find(l => l.id === currentMapParentId);
      return !!parent?.isRealWorld;
    }
    return !!data.isRealWorldMap;
  })();

  return (
    <div className="h-full w-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <div className={`transition-all duration-700 ease-in-out overflow-hidden shrink-0 ${isFullscreen ? 'max-h-0 opacity-0' : 'max-h-64 opacity-100'}`}>
        <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md z-10">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left hidden sm:block">
              <h1 className="ph-section-title text-2xl md:text-3xl flex items-center justify-center md:justify-start gap-3">
                <Globe size={32} className="text-indigo-600" /> World Atlas
              </h1>
              <p className="ph-section-subtitle">Map the geography and artifacts of your story world.</p>
            </div>
            <div className="ph-tab-container w-full md:w-auto overflow-x-auto no-scrollbar flex items-center gap-2">
              <div className="sm:hidden flex items-center gap-2 shrink-0">
                <Globe size={24} className="text-indigo-600" />
              </div>
              {Object.values(WorldTab).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`ph-tab ${activeTab === tab ? "ph-tab-active" : "ph-tab-inactive"}`}
                  title={tab}
                >
                  {tab === WorldTab.MAP && <MapIcon size={14} />}
                  {tab === WorldTab.LOCATIONS && <MapPin size={14} />}
                  {tab === WorldTab.INVENTORY && <Box size={14} />}
                  {tab === WorldTab.RECIPE_BOOK && <Book size={14} />}
                  <span className="hidden sm:inline">{tab}</span>
                </button>
              ))}
            </div>
          </div>
        </header>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden relative">
        <div className="h-full w-full flex flex-col items-center p-4 md:p-8 relative">
          <div className={`h-full w-full flex flex-col ${isFullscreen ? 'max-w-none' : 'max-w-6xl'} ${activeTab !== WorldTab.MAP ? 'space-y-12 overflow-y-auto pb-40' : ''}`}>
            
            {activeTab === WorldTab.MAP && (
              <div className="flex-1 min-h-0 relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-slate-100 dark:bg-slate-900 w-full flex flex-col">
                
                {(!data.rootMapImage && !data.isRealWorldMap && !currentMapParentId) ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
                    <div className="space-y-2">
                      <div className="w-20 h-20 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-indigo-600/20 mb-6">
                        <MapIcon size={40} />
                      </div>
                      <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Initialize Atlas</h2>
                      <p className="text-slate-500 max-w-md mx-auto font-serif italic text-lg">Define the cartographic foundation of your universe.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                      <button 
                        onClick={() => onUpdateProject({ isRealWorldMap: true })}
                        className="group p-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl hover:border-blue-500 transition-all flex flex-col items-center gap-4 text-center"
                      >
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-3xl group-hover:scale-110 transition-transform">
                          <Globe size={32} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase">Real World</h3>
                          <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-widest">Earth Settings (OpenStreetMap)</p>
                        </div>
                      </button>

                      <label className="group p-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl hover:border-emerald-500 transition-all flex flex-col items-center gap-4 text-center cursor-pointer">
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
                      paths={data.paths}
                      onAddPath={(path) => onUpdateProject({ paths: [...(data.paths || []), path] })}
                      onUpdatePath={(path) => onUpdateProject({ paths: (data.paths || []).map(p => p.id === path.id ? path : p) })}
                      onDeletePath={(id) => onUpdateProject({ paths: (data.paths || []).filter(p => p.id !== id) })}
                      onScaleCalibrated={(newScale) => {
                        onUpdateProject({ mapScale: Number(newScale.toFixed(2)) });
                        setLocalScale(Number(newScale.toFixed(2)));
                      }}
                      rootMapImage={parentLocation?.mapImage || data.rootMapImage || DEFAULT_MAP} 
                      mapUnit={data.mapUnit}
                      mapScale={data.mapScale}
                      defaultView={data.mapDefaultView}
                      zoomInRef={zoomInRef}
                      zoomOutRef={zoomOutRef}
                      centerMapRef={centerMapRef}
                      fitAllLocationsRef={fitAllLocationsRef}
                      getViewStateRef={getViewStateRef}
                      onViewChange={(view) => onUpdateProject({ mapDefaultView: view })}
                      onDimensionsDetected={(width, height) => setMapDimensions({ width, height })}
                      onLinkClick={(type, id) => {
                        if (type === 'admin') {
                          const loc = data.locations.find(l => l.id === id);
                          if (loc) { handleOpenLocationEdit(loc); return; }
                          const path = data.paths?.find(p => p.id === id);
                          if (path) { handleOpenPathEdit(path); return; }
                          const art = data.artifacts?.find(a => a.id === id);
                          if (art) { handleOpenArtifactEdit(art); return; }
                        } else {
                          onLinkClick(type, id);
                        }
                      }}
                      isRealWorld={isCurrentMapRealWorld}
                      onLocationClick={(id) => {
                        setSelectedLocationId(id);
                        const loc = data.locations.find(l => l.id === id);
                        if (loc && loc.mapImage) onMapChange(loc.id);
                      }}
                      onLocationPlace={handleLocationPlace}
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
                      <div className="flex flex-col gap-4 pointer-events-auto items-start">
                        {parentLocation && (
                          <div className="flex items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-2 px-4 rounded-2xl shadow-xl border border-white/20">
                            <span className="text-[10px] md:text-sm text-slate-900 dark:text-white font-black uppercase tracking-tight truncate max-w-[120px] md:max-w-none">{parentLocation.name}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 md:gap-3 items-end pointer-events-auto">
                        <div className="flex items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl md:rounded-2xl shadow-xl border border-white/20 transition-all duration-500 ease-in-out overflow-hidden">
                          <div className={`flex items-center transition-all duration-500 ease-in-out ${isMapMenuOpen ? 'max-w-[600px] opacity-100 px-2 gap-1 md:gap-2' : 'max-w-0 opacity-0 pointer-events-none'}`}>
                            <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggleFullscreen?.(); }} className={`p-1.5 md:p-2 rounded-lg md:rounded-xl transition-colors ${isFullscreen ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-500 hover:text-indigo-600'}`} title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}><Maximize2 size={16} className="md:w-5 md:h-5" /></button>
                            <div className="w-px h-4 md:h-6 bg-slate-200 dark:bg-slate-800 self-center" />
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); e.preventDefault(); 
                                if (getViewStateRef.current) { 
                                  const view = getViewStateRef.current(); 
                                  if (view) { onUpdateProject({ mapDefaultView: view }); setShowOriginPulse(true); setTimeout(() => setShowOriginPulse(false), 2000); } 
                                } 
                              }} 
                              className="p-1.5 md:p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg md:rounded-xl transition-colors" 
                              title="Save current view as default"
                            >
                              <Target size={16} className="md:w-5 md:h-5" />
                            </button>
                            <div className="w-px h-4 md:h-6 bg-slate-200 dark:bg-slate-800 self-center" />
                            <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIsQueueOpen(!isQueueOpen); }} className={`p-1.5 md:p-2 rounded-lg md:rounded-xl transition-colors ${isQueueOpen ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-500 hover:text-indigo-600'}`} title="Location Manager"><MapPin size={16} className="md:w-5 md:h-5" /></button>
                            <div className="w-px h-4 md:h-6 bg-slate-200 dark:bg-slate-800 self-center" />
                            {!isCurrentMapRealWorld && (
                              <>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIsScaleOpen(!isScaleOpen); }} 
                                  className={`p-1.5 md:p-2 rounded-lg md:rounded-xl transition-all ${isScaleOpen ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' : 'text-slate-500 hover:text-emerald-600'}`} 
                                  title="Scale Calibration"
                                >
                                  <Ruler size={16} className="md:w-5 md:h-5" />
                                </button>
                                <div className="w-px h-4 md:h-6 bg-slate-200 dark:bg-slate-800 self-center" />
                                <label className="p-1.5 md:p-2 text-slate-500 hover:text-indigo-600 cursor-pointer rounded-lg md:rounded-xl transition-colors" title="Change Map" onClick={(e) => e.stopPropagation()}><Upload size={16} className="md:w-5 md:h-5" /><input type="file" className="hidden" accept="image/*" onChange={handleMapUpload} /></label>
                              </>
                            )}
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setIsMapMenuOpen(!isMapMenuOpen); }} className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg md:rounded-xl transition-all ${isMapMenuOpen ? 'bg-emerald-600 text-white rotate-180 shadow-lg' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><MapIcon size={20} className="md:w-6 md:h-6 shrink-0" /></button>
                        </div>

                        <div className="flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl md:rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                          <button onClick={() => setShowAddLocationDialog(true)} className="p-3 text-slate-500 hover:text-emerald-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800" title="Add Location"><Plus size={20} /></button>
                          <button onClick={() => onToggleFullscreen?.()} className={`p-3 transition-colors border-b border-slate-100 dark:border-slate-800 ${isFullscreen ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}><Maximize2 size={20} /></button>
                          <button onClick={() => zoomOutRef.current?.()} className="p-3 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" title="Zoom Out"><Minus size={20} /></button>
                        </div>
                      </div>
                    </div>

                    {isScaleOpen && (
                      <div className="absolute bottom-24 left-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-white/20 w-64 space-y-3 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
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

                    <div className="absolute bottom-6 left-6 z-[100] pointer-events-auto flex items-end gap-2">
                      <button 
                        onClick={() => setIsLayersOpen(!isLayersOpen)}
                        className={`group relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shadow-2xl ${isLayersOpen ? 'border-emerald-500 ring-4 ring-emerald-500/20' : 'border-white dark:border-slate-800 hover:border-emerald-400'}`}
                        title="Atlas Layers"
                      >
                        <div className="w-full h-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                          {(() => {
                            const currentImg = currentMapParentId ? data.locations.find(l => l.id === currentMapParentId)?.mapImage : data.rootMapImage;
                            return (currentImg && !isCurrentMapRealWorld) ? <img src={currentImg} className="w-full h-full object-cover" alt="" /> : <Globe className="w-6 h-6 text-emerald-500" />;
                          })()}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm py-0.5 text-[9px] font-black text-white uppercase tracking-tighter text-center">Layers</div>
                      </button>

                      {isLayersOpen && (
                        <div className="flex items-center gap-2 animate-in slide-in-from-left-4 duration-300">
                          {currentMapParentId && (
                            <button 
                              onClick={() => { onMapChange(null); setIsLayersOpen(false); }}
                              className="group relative w-12 h-12 rounded-xl overflow-hidden border border-white/20 shadow-xl transition-all hover:scale-105"
                              title="Switch to Root Map"
                            >
                              <div className="w-full h-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                                {data.rootMapImage ? <img src={data.rootMapImage} className="w-full h-full object-cover opacity-60 group-hover:opacity-100" alt="" /> : <Globe className="w-5 h-5 text-slate-400" />}
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-[9px] font-black text-white uppercase text-center">Root</div>
                            </button>
                          )}
                          {data.locations.filter(l => l.mapImage && l.id !== currentMapParentId).map(mapLoc => (
                            <button 
                              key={mapLoc.id}
                              onClick={() => { onMapChange(mapLoc.id); setIsLayersOpen(false); }}
                              className="group relative w-12 h-12 rounded-xl overflow-hidden border border-white/20 shadow-xl transition-all hover:scale-105"
                              title={`Switch to ${mapLoc.name}`}
                            >
                              <div className="w-full h-full bg-slate-200 dark:bg-slate-800">
                                <img src={mapLoc.mapImage} className="w-full h-full object-cover opacity-60 group-hover:opacity-100" alt="" />
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-[9px] font-black text-white uppercase text-center truncate px-1">{mapLoc.name}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <aside className={`absolute top-24 bottom-6 right-[88px] z-40 w-80 bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border border-white/20 dark:border-slate-800 shadow-2xl transition-all duration-500 ease-in-out rounded-3xl p-6 flex flex-col space-y-6 ${isQueueOpen ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-12 opacity-0 scale-95 pointer-events-none'}`}>
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
                                <div className="flex items-center justify-between mb-1"><span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{loc.type}</span><Edit2 size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 cursor-pointer" onClick={() => handleOpenLocationEdit(loc)} /></div>
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
                                      <button onClick={() => onLocationUndo(loc.id)} className="p-1 text-slate-400 hover:text-indigo-600" title="Undo Move"><RotateCcw size={12} /></button>
                                    )}
                                    {loc.matchedX !== undefined && (
                                      <button onClick={() => onLocationReset(loc.id)} className="p-1 text-slate-400 hover:text-blue-600" title="Reset to Earth"><Globe size={12} /></button>
                                    )}
                                    <Edit2 size={12} className="text-slate-300 hover:text-indigo-500 cursor-pointer" onClick={() => handleOpenLocationEdit(loc)} />
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Column 1: Locations */}
                <section className="space-y-8">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl"><MapIcon size={24} /></div>
                      <div><h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Geographic Roster</h2><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Points of Interest</p></div>
                    </div>
                    <button onClick={() => onAddLocation({ id: generateId(), name: 'New Location', description: '', type: 'City', source: 'manual' })} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"><Plus size={14} /> New Location</button>
                  </div>
                  <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {/* Manuscript Locations Group */}
                    {data.locations.filter(l => l.source === 'ai').length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 pl-1">📚 From Manuscript</h4>
                        <div className="space-y-3">
                          {data.locations.filter(l => l.source === 'ai').map(loc => (
                            <div key={loc.id} className="bg-blue-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-blue-200 dark:border-slate-700 shadow-sm group relative hover:shadow-md transition-all">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{loc.type}</span>
                                <div className="flex items-center gap-2">
                                  {!loc.mapImage && <button onClick={() => onUpdateLocation({ ...loc, mapImage: DEFAULT_MAP, type: 'Region' })} className="text-slate-400 hover:text-blue-500 transition-colors" title="Turn into Map Link"><MapIcon size={14} /></button>}
                                  <button onClick={() => handleOpenLocationEdit(loc)} className="text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={14} /></button>
                                </div>
                              </div>
                              <h3 className="font-bold text-slate-900 dark:text-white text-sm">{loc.name}</h3>
                              <p className="text-xs text-slate-500 line-clamp-2 mt-2 font-serif italic">{loc.description || 'No description yet.'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Manual Locations Group */}
                    {data.locations.filter(l => l.source !== 'ai').length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 pl-1">✋ Custom Locations</h4>
                        <div className="space-y-3">
                          {data.locations.filter(l => l.source !== 'ai').map(loc => (
                            <div key={loc.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group relative hover:shadow-md transition-all">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{loc.type}</span>
                                <div className="flex items-center gap-2">
                                  {!loc.mapImage && <button onClick={() => onUpdateLocation({ ...loc, mapImage: DEFAULT_MAP, type: 'Region' })} className="text-slate-400 hover:text-emerald-500 transition-colors" title="Turn into Map Link"><MapIcon size={14} /></button>}
                                  <button onClick={() => handleOpenLocationEdit(loc)} className="text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={14} /></button>
                                  <button 
                                    onClick={(e) => {
                                      try {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onUpdateProject({ locations: data.locations.filter(l => l.id !== loc.id) });
                                      } catch (err) {
                                        console.error('Error deleting location:', err);
                                      }
                                    }} 
                                    className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                              <h3 className="font-bold text-slate-900 dark:text-white text-sm">{loc.name}</h3>
                              <p className="text-xs text-slate-500 line-clamp-2 mt-2 font-serif italic">{loc.description || 'No description yet.'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {data.locations.length === 0 && (
                      <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                        <MapIcon size={32} className="text-slate-300" />
                        <p className="text-slate-400 font-serif italic text-sm">No locations yet. Add one from your manuscript or create a custom location.</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Column 2: Paths */}
                <section className="space-y-8">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl"><Activity size={24} /></div>
                      <div><h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Distance Logs</h2><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Recorded Pathmeasurements</p></div>
                    </div>
                  </div>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {(data.paths || []).length === 0 ? (
                      <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                        <Ruler size={32} className="text-slate-300" />
                        <p className="text-slate-400 font-serif italic text-sm px-6">No paths recorded yet. Use the Ruler tool on the map to save pathmeasurements.</p>
                      </div>
                    ) : (
                      data.paths?.map(path => (
                        <div key={path.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group relative hover:shadow-md transition-all">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{path.isRealWorld ? 'Real World' : 'Local Map'}</span>
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleOpenPathEdit(path)} className="text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={14} /></button>
                              <button onClick={() => onUpdateProject({ paths: data.paths?.filter(p => p.id !== path.id) })} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                            </div>
                          </div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm">{path.name}</h3>
                          <div className="mt-3 flex items-baseline gap-1">
                            <span className="text-xl font-black text-indigo-600">{path.distance}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{path.unit}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-2 italic">Points: {path.points.length} • Anchors: {path.points.filter(p => p.locationId).length}</p>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
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
                    <div key={art.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group relative hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{art.type}</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleOpenArtifactEdit(art)} className="text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={14} /></button>
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

            {activeTab === WorldTab.RECIPE_BOOK && (
              <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl"><Book size={24} /></div>
                    <div><h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Recipe Book</h2><p className="text-sm text-slate-500 uppercase font-bold tracking-widest">Meals, Drinks & Culinary Creations</p></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Herb Roasted Chicken */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🍗</span>
                        <h3 className="font-bold text-slate-900 dark:text-white">Herb Roasted Chicken</h3>
                      </div>
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded">Main</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 font-serif italic">A classic savory dish with rosemary, thyme, and garlic.</p>
                    <div className="space-y-2 mb-3">
                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Ingredients:</p>
                      <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                        <li>• 1 whole chicken</li>
                        <li>• Fresh rosemary & thyme</li>
                        <li>• 4 cloves garlic</li>
                        <li>• Butter, salt & pepper</li>
                      </ul>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1">Source:</p>
                      <a href="https://www.simplyrecipes.com" target="_blank" rel="noopener noreferrer" className="text-[11px] text-indigo-500 hover:text-indigo-600 break-all">simplyrecipes.com</a>
                    </div>
                  </div>

                  {/* Wild Berry Tart */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🫐</span>
                        <h3 className="font-bold text-slate-900 dark:text-white">Wild Berry Tart</h3>
                      </div>
                      <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 dark:bg-rose-900/30 px-2 py-1 rounded">Dessert</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 font-serif italic">Elegant pastry filled with fresh berries and cream.</p>
                    <div className="space-y-2 mb-3">
                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Ingredients:</p>
                      <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                        <li>• Puff pastry sheet</li>
                        <li>• Mixed fresh berries</li>
                        <li>• Heavy cream</li>
                        <li>• Honey & vanilla</li>
                      </ul>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1">Source:</p>
                      <a href="https://www.foodnetwork.com" target="_blank" rel="noopener noreferrer" className="text-[11px] text-indigo-500 hover:text-indigo-600 break-all">foodnetwork.com</a>
                    </div>
                  </div>

                  {/* Spiced Apple Mead */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🍷</span>
                        <h3 className="font-bold text-slate-900 dark:text-white">Spiced Apple Mead</h3>
                      </div>
                      <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded">Drink</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 font-serif italic">Honey wine infused with cinnamon, cloves, and apple.</p>
                    <div className="space-y-2 mb-3">
                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Ingredients:</p>
                      <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                        <li>• Honey & water</li>
                        <li>• Apple juice</li>
                        <li>• Cinnamon stick</li>
                        <li>• Whole cloves</li>
                      </ul>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1">Source:</p>
                      <a href="https://www.homebrewing.com" target="_blank" rel="noopener noreferrer" className="text-[11px] text-indigo-500 hover:text-indigo-600 break-all">homebrewing.com</a>
                    </div>
                  </div>

                  {/* Mushroom Soup */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🍲</span>
                        <h3 className="font-bold text-slate-900 dark:text-white">Mushroom Soup</h3>
                      </div>
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded">Starter</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 font-serif italic">Creamy woodland mushroom soup with fresh herbs.</p>
                    <div className="space-y-2 mb-3">
                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Ingredients:</p>
                      <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                        <li>• Mixed mushrooms</li>
                        <li>• Heavy cream</li>
                        <li>• Vegetable stock</li>
                        <li>• Onions & garlic</li>
                      </ul>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1">Source:</p>
                      <a href="https://www.bonappetit.com" target="_blank" rel="noopener noreferrer" className="text-[11px] text-indigo-500 hover:text-indigo-600 break-all">bonappetit.com</a>
                    </div>
                  </div>

                  {/* Honey Bread */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🍞</span>
                        <h3 className="font-bold text-slate-900 dark:text-white">Honey Bread</h3>
                      </div>
                      <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded">Bread</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 font-serif italic">Sweet, golden loaf sweetened with wildflower honey.</p>
                    <div className="space-y-2 mb-3">
                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Ingredients:</p>
                      <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                        <li>• All-purpose flour</li>
                        <li>• Honey & butter</li>
                        <li>• Eggs & milk</li>
                        <li>• Yeast & salt</li>
                      </ul>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1">Source:</p>
                      <a href="https://www.kingarthurbaking.com" target="_blank" rel="noopener noreferrer" className="text-[11px] text-indigo-500 hover:text-indigo-600 break-all">kingarthurbaking.com</a>
                    </div>
                  </div>

                  {/* Mint Tea */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🍵</span>
                        <h3 className="font-bold text-slate-900 dark:text-white">Mint Tea</h3>
                      </div>
                      <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest bg-cyan-50 dark:bg-cyan-900/30 px-2 py-1 rounded">Drink</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 font-serif italic">Refreshing herbal infusion of fresh mint and honey.</p>
                    <div className="space-y-2 mb-3">
                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Ingredients:</p>
                      <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                        <li>• Fresh mint leaves</li>
                        <li>• Hot water</li>
                        <li>• Honey</li>
                        <li>• Lemon (optional)</li>
                      </ul>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1">Source:</p>
                      <a href="https://www.thespruceeats.com" target="_blank" rel="noopener noreferrer" className="text-[11px] text-indigo-500 hover:text-indigo-600 break-all">thespruceeats.com</a>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">📖 About Your Recipe Book</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Keep track of recipes found throughout your story world. Each recipe includes basic ingredients and a source URL for reference. Perfect for worldbuilding - what do people in your world eat and drink?
                  </p>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Unified Universal Edit Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)}
        onConfirm={handleSaveEdit}
        title={editingLocation ? "Edit Location" : editingArtifact ? "Edit Artifact" : "Edit Path"}
        footer={
          <>
            <button onClick={() => setIsEditModalOpen(false)} className="ph-button-secondary px-6 py-2 text-xs">Cancel</button>
            <button onClick={handleSaveEdit} className="ph-button px-6 py-2 text-xs">Save Changes</button>
          </>
        }
      >
        <div className="space-y-6">
          {editingLocation && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Name</label>
                  <input type="text" value={editingLocation.name} onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })} className="ph-input w-full" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Type</label>
                  <select value={editingLocation.type} onChange={(e) => setEditingLocation({ ...editingLocation, type: e.target.value })} className="ph-input w-full">
                    <option>City</option><option>Town</option><option>Village</option><option>Fortress</option><option>Landmark</option><option>Region</option><option>Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
                <textarea value={editingLocation.description} onChange={(e) => setEditingLocation({ ...editingLocation, description: e.target.value })} className="ph-input w-full h-32 resize-none font-serif italic" />
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest"><Globe size={12} /> Coordinates</div></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Longitude (X)</label><input type="number" step="0.000001" value={editingLocation.x ?? ''} onChange={(e) => setEditingLocation({ ...editingLocation, x: parseFloat(e.target.value) || 0 })} className="ph-input w-full font-mono text-xs" /></div>
                  <div><label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Latitude (Y)</label><input type="number" step="0.000001" value={editingLocation.y ?? ''} onChange={(e) => setEditingLocation({ ...editingLocation, y: parseFloat(e.target.value) || 0 })} className="ph-input w-full font-mono text-xs" /></div>
                </div>
              </div>
            </>
          )}

          {editingArtifact && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Name</label>
                  <input type="text" value={editingArtifact.name} onChange={(e) => setEditingArtifact({ ...editingArtifact, name: e.target.value })} className="ph-input w-full" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Type</label>
                  <input type="text" value={editingArtifact.type} onChange={(e) => setEditingArtifact({ ...editingArtifact, type: e.target.value })} className="ph-input w-full" placeholder="Relic, Weapon, etc." />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
                <textarea value={editingArtifact.description} onChange={(e) => setEditingArtifact({ ...editingArtifact, description: e.target.value })} className="ph-input w-full h-32 resize-none font-serif italic" />
              </div>
            </>
          )}

          {editingPath && (
            <>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Path Name</label>
                <input type="text" value={editingPath.name} onChange={(e) => setEditingPath({ ...editingPath, name: e.target.value })} className="ph-input w-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Distance</label>
                  <div className="flex items-center gap-2">
                    <input type="number" value={editingPath.distance} onChange={(e) => setEditingPath({ ...editingPath, distance: parseFloat(e.target.value) || 0 })} className="ph-input flex-1 font-mono text-xs" />
                    <span className="text-[10px] font-black text-slate-400 uppercase">{editingPath.unit}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Color</label>
                  <input type="color" value={editingPath.color || '#6366f1'} onChange={(e) => setEditingPath({ ...editingPath, color: e.target.value })} className="ph-input w-full h-10 p-1" />
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Technical Info</p>
                <div className="text-[9px] text-slate-500 space-y-1 font-mono">
                  <p>Points: {editingPath.points.length}</p>
                  <p>System: {editingPath.isRealWorld ? 'Real-World Geodesic' : 'Euclidean Plane'}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Add Location Dialog */}
      {showAddLocationDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-[200] bg-black/30 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-white/20 p-8 w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
            {!addLocationMethod ? (
              <>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">Add Location</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => { setAddLocationMethod('search'); setLocationSearchQuery(''); }}
                    className="w-full px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 text-left"
                  >
                    🔍 Search Location
                  </button>
                  <button
                    onClick={() => { setAddLocationMethod('coords'); setLocationLat(''); setLocationLng(''); }}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 text-left"
                  >
                    🌍 By Coordinates (Lat/Lng)
                  </button>
                  <button
                    onClick={() => { setAddLocationMethod('xy'); setLocationX(''); setLocationY(''); }}
                    className="w-full px-4 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-colors shadow-lg shadow-purple-600/20 text-left"
                  >
                    📍 By Position (X/Y)
                  </button>
                </div>
                <button
                  onClick={() => setShowAddLocationDialog(false)}
                  className="w-full mt-6 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">
                  {addLocationMethod === 'search' && '🔍 Search Location'}
                  {addLocationMethod === 'coords' && '🌍 By Coordinates'}
                  {addLocationMethod === 'xy' && '📍 By Position'}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Location Name</label>
                    <input
                      type="text"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="e.g., Capital City"
                      className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {addLocationMethod === 'search' && (
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Search Query</label>
                      <input
                        type="text"
                        value={locationSearchQuery}
                        onChange={(e) => setLocationSearchQuery(e.target.value)}
                        placeholder="e.g., Paris, France"
                        className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <p className="text-[10px] text-slate-500 mt-2">Search uses Nominatim (OpenStreetMap)</p>
                    </div>
                  )}

                  {addLocationMethod === 'coords' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Latitude (N/S)</label>
                        <input
                          type="text"
                          value={locationLat}
                          onChange={(e) => {
                            const input = e.target.value.trim();
                            // Try parsing as directional coordinates first
                            const directionalResult = parseDirectionalCoordinates(input);
                            if (directionalResult) {
                              setLocationLat(directionalResult.lat.toString());
                              setLocationLng(directionalResult.lng.toString());
                            } else if (input.includes(',')) {
                              // Parse comma-separated coordinates: "lat, lng" or just "lat"
                              const parts = input.split(',').map(s => s.trim());
                              const lat = parseFloat(parts[0]);
                              const lng = parseFloat(parts[1]);
                              if (!isNaN(lat)) setLocationLat(lat.toString());
                              if (!isNaN(lng)) setLocationLng(lng.toString());
                            } else {
                              setLocationLat(input);
                            }
                          }}
                          placeholder="e.g., 48.8566 or 51.5280° N, 123.1207° W"
                          className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Longitude (E/W)</label>
                        <input
                          type="text"
                          value={locationLng}
                          onChange={(e) => {
                            const input = e.target.value.trim();
                            setLocationLng(input);
                          }}
                          placeholder="e.g., 2.3522"
                          className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                       <p className="text-[10px] text-slate-500 mt-2">Latitude uses N (North) / S (South), Longitude uses E (East) / W (West). Supports "lat, lng" or directional format like "51.5280° N, 123.1207° W".</p>
                    </div>
                  )}

                  {addLocationMethod === 'xy' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">X Position</label>
                        <input
                          type="number"
                          step="1"
                          value={locationX}
                          onChange={(e) => setLocationX(e.target.value)}
                          placeholder="e.g., 500"
                          className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Y Position</label>
                        <input
                          type="number"
                          step="1"
                          value={locationY}
                          onChange={(e) => setLocationY(e.target.value)}
                          placeholder="e.g., 300"
                          className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2">For fictional maps using Euclidean plane coordinates</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setAddLocationMethod(null)}
                    className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (!locationName.trim()) {
                        alert('Please enter a location name');
                        return;
                      }
                      
                      // Validate based on method
                      if (addLocationMethod === 'coords') {
                        const lat = parseFloat(locationLat);
                        const lng = parseFloat(locationLng);
                        if (isNaN(lat) || isNaN(lng)) {
                          alert('Please enter valid latitude and longitude values');
                          return;
                        }
                        if (lat < -90 || lat > 90) {
                          alert('Latitude must be between -90 and 90');
                          return;
                        }
                        if (lng < -180 || lng > 180) {
                          alert('Longitude must be between -180 and 180');
                          return;
                        }
                      } else if (addLocationMethod === 'xy') {
                        const x = parseFloat(locationX);
                        const y = parseFloat(locationY);
                        if (isNaN(x) || isNaN(y)) {
                          alert('Please enter valid X and Y positions');
                          return;
                        }
                      }
                      
                      const newLocation: Location = {
                        id: generateId(),
                        name: locationName.trim(),
                        description: '',
                        type: 'City',
                        source: 'manual'
                      };

                      // Add coordinates based on method
                      if (addLocationMethod === 'coords' && locationLat && locationLng) {
                        // Limit to 15 decimal places
                        const lat = parseFloat(locationLat);
                        const lng = parseFloat(locationLng);
                        newLocation.x = parseFloat(lng.toFixed(15));
                        newLocation.y = parseFloat(lat.toFixed(15));
                      } else if (addLocationMethod === 'xy' && locationX && locationY) {
                        newLocation.x = parseFloat(locationX);
                        newLocation.y = parseFloat(locationY);
                      }
                      // Search method: location will be added with just name (user needs to place on map)

                      onAddLocation(newLocation);
                      
                      // Reset and close
                      setShowAddLocationDialog(false);
                      setAddLocationMethod(null);
                      setLocationName('');
                      setLocationSearchQuery('');
                      setLocationLat('');
                      setLocationLng('');
                      setLocationX('');
                      setLocationY('');
                    }}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
                  >
                    Add Location
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
