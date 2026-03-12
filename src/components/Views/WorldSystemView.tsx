import React, { useState } from 'react';
import { ViewType, ProjectData, Location, Artifact, LoreEntry } from '../../types';
import { Plus, Map as MapIcon, Box, Book, Search, Edit2, Trash2, Maximize2, FileText, Clock, Upload, Layout, Sparkles, ChevronRight, CheckCircle, X, Save } from 'lucide-react';

import { MapView } from '../ui/MapView';
import { generateId } from '../../services/storageService';

interface WorldSystemViewProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  data: ProjectData;
  onUpdateLocation: (l: Location) => void;
  onAddLocation: (l: Location) => void;
  onUpdateRootMap: (u: string) => void;
  onUpdateRootMapData: (s: number, u: string) => void;
  onLinkClick: (type: string, id: string) => void;
  onUpdateMapOrder: () => void;
  currentMapParentId: string | null;
  onMapChange: (id: string | null) => void;
  onUpdateProject: (updates: Partial<ProjectData>) => void;
  onAddArtifact: (a: Artifact) => void;
  onUpdateArtifact: (a: Artifact) => void;
  onDeleteArtifact: (id: string) => void;
  onAddLore: (l: LoreEntry) => void;
  onDeleteLore: (id: string) => void;
  onOpenBlueprint: (type: string, id: string, data: any) => void;
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
  data, onAddLocation, onAddArtifact, onAddLore, onUpdateLocation, onDeleteArtifact, onDeleteLore, onUpdateProject, currentMapParentId, onMapChange, onOpenBlueprint
}) => {
  const [activeTab, setActiveTab] = useState<WorldTab>(WorldTab.ATLAS);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isScaleOpen, setIsScaleOpen] = useState(false);
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  
  // Local Scale Calibration State
  const [localScale, setLocalScale] = useState(data.mapScale || 100);
  const [localUnit, setLocalUnit] = useState(data.mapUnit || 'km');

  const zoomInRef = React.useRef<(() => void) | null>(null);
  const zoomOutRef = React.useRef<(() => void) | null>(null);

  const activeCalendar = data.calendars?.[0] || {
    id: 'default',
    name: 'Standard Calendar',
    weekDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    months: [{ id: '1', name: 'January', days: 30 }],
    eras: [{ id: '1', name: 'First Age', abbreviation: 'FA', startYear: 0 }],
    currentEpochDay: 0
  };

  const DEFAULT_MAP = `data:image/svg+xml,%3Csvg width='800' height='600' viewBox='0 0 800 600' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='%23f5f1e6'/%3E%3Cpath d='M0 0l800 600M800 0L0 600' stroke='%23e2e8f0' stroke-width='1'/%3E%3Ccircle cx='400' cy='300' r='100' fill='none' stroke='%23cbd5e1' stroke-dasharray='10,10'/%3E%3Ctext x='400' y='310' font-family='serif' font-size='24' fill='%2394a3b8' text-anchor='middle' font-style='italic'%3EUncharted Territory%3C/text%3E%3C/svg%3E`;

  const locationQueue = data.locations.filter(l => l.x === undefined || l.y === undefined);

  const handleMapUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (currentMapParentId) {
        onUpdateProject({ 
          locations: data.locations.map(l => l.id === currentMapParentId ? { ...l, mapImage: base64 } : l) 
        });
      } else {
        onUpdateProject({ rootMapImage: base64 });
      }
    };
    reader.readAsDataURL(file);
  };

  const filteredLocations = data.locations.filter(l => l.parentId === (currentMapParentId || undefined));
  const parentLocation = data.locations.find(l => l.id === currentMapParentId);

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">WORLD HUB</h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Geography, artifacts, and the lore of your universe.</p>
          </div>
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto no-scrollbar">
            {Object.values(WorldTab).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto h-full flex flex-col space-y-12">
          {activeTab === WorldTab.ATLAS && (
            <div className="flex-1 min-h-[600px] relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-slate-100 dark:bg-slate-900 max-w-full">
              {/* Map Component */}
              <MapView 
                locations={filteredLocations} 
                rootMapImage={parentLocation?.mapImage || data.rootMapImage || DEFAULT_MAP} 
                mapUnit={data.mapUnit}
                mapScale={data.mapScale}
                zoomInRef={zoomInRef}
                zoomOutRef={zoomOutRef}
                onDimensionsDetected={(width, height) => setMapDimensions({ width, height })}
                onLocationClick={(id) => {
                  const loc = data.locations.find(l => l.id === id);
                  if (loc) {
                    if (loc.mapImage) onMapChange(loc.id);
                    else onOpenBlueprint('Location', loc.id, loc);
                  }
                }}
                onLocationPlace={(id, x, y) => {
                  const loc = data.locations.find(l => l.id === id);
                  if (loc) {
                    onUpdateLocation({ ...loc, x, y, parentId: currentMapParentId || undefined });
                  }
                }}
                onLocationMove={(id, x, y) => {
                  const loc = data.locations.find(l => l.id === id);
                  if (loc) {
                    onUpdateLocation({ ...loc, x, y });
                  }
                }}
                onMapClick={(x, y) => {
                  console.log("Map Clicked", x, y);
                }}
              />

              {/* Floating Header Controls (Google Maps Style) */}
              <div className="absolute top-6 left-6 right-6 flex items-start justify-between pointer-events-none z-30">
                <div className="flex flex-col gap-3 pointer-events-auto">
                  {/* Breadcrumbs */}
                  <div className="flex items-center gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-white/20">
                    <button onClick={() => onMapChange(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-emerald-600">
                      <MapIcon size={20} />
                    </button>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                      <button onClick={() => onMapChange(null)} className="hover:text-emerald-500">World</button>
                      {parentLocation && (
                        <>
                          <ChevronRight size={14} className="text-slate-400" />
                          <span className="text-slate-900 dark:text-white font-black uppercase tracking-tight">{parentLocation.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 items-end pointer-events-auto">
                  <div className="flex gap-2 p-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20">
                    <button 
                      onClick={() => setIsScaleOpen(!isScaleOpen)}
                      className={`p-2 rounded-xl transition-colors ${isScaleOpen ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-500 hover:text-indigo-600'}`}
                      title="Toggle Scale Calibration"
                    >
                      <Search size={20} />
                    </button>

                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 self-center" />

                    <button 
                      onClick={() => setIsQueueOpen(!isQueueOpen)}
                      className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all ${isQueueOpen ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                    >
                      <Layout size={14} /> {isQueueOpen ? 'Close Queue' : 'Open Queue'}
                      {locationQueue.length > 0 && <span className={`px-1.5 rounded-full ${isQueueOpen ? 'bg-white/20' : 'bg-indigo-100 text-indigo-600'}`}>{locationQueue.length}</span>}
                    </button>
                    
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 self-center" />
                    
                    <label className="p-2 text-slate-500 hover:text-indigo-600 cursor-pointer transition-colors" title="Upload Map">
                      <Upload size={20} />
                      <input type="file" className="hidden" accept="image/*" onChange={handleMapUpload} />
                    </label>
                  </div>

                  {/* Scale Calibration Panel */}
                  {isScaleOpen && (
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/20 w-64 space-y-3 relative animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <Search size={12} /> Scale Calibration
                        </div>
                        <button onClick={() => setIsScaleOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase font-bold">
                          <span>Image Width:</span>
                          <span className="font-mono">{mapDimensions.width}px</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            value={localScale}
                            onChange={(e) => setLocalScale(parseInt(e.target.value) || 0)}
                            className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            placeholder="Width value"
                          />
                          <select 
                            value={localUnit}
                            onChange={(e) => setLocalUnit(e.target.value)}
                            className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2 py-1.5 text-[10px] font-black uppercase text-indigo-600"
                          >
                            <option value="km">KM</option>
                            <option value="mi">mi</option>
                          </select>
                        </div>
                        <button 
                          onClick={() => {
                            onUpdateProject({ mapScale: localScale, mapUnit: localUnit });
                            setIsScaleOpen(false);
                          }}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                        >
                          <CheckCircle size={12} /> Apply Calibration
                        </button>
                        <p className="text-[9px] text-slate-400 leading-tight italic text-center">
                          Define how many {localUnit} the entire width of the image represents.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Floating Zoom Controls (Bottom Right) */}
              <div className="absolute bottom-24 right-6 flex flex-col gap-2 z-30 pointer-events-none">
                <div className="flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl shadow-xl border border-white/20 overflow-hidden pointer-events-auto">
                  <button 
                    onClick={() => zoomInRef.current?.()}
                    className="p-3 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800"
                    title="Zoom In"
                  >
                    <Plus size={20} />
                  </button>
                  <button 
                    onClick={() => zoomOutRef.current?.()}
                    className="p-3 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    title="Zoom Out"
                  >
                    <X size={20} className="rotate-45" />
                  </button>
                </div>
              </div>

              {/* Floating Side Drawer (Location Queue) */}
              <aside className={`
                absolute top-24 bottom-6 right-6 z-40 w-80 bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border border-white/20 dark:border-slate-800 shadow-2xl transition-all duration-500 ease-in-out rounded-3xl p-6 flex flex-col space-y-6
                ${isQueueOpen ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-12 opacity-0 scale-95 pointer-events-none'}
              `}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Layout size={14} /> Location Queue
                  </h3>
                  <button onClick={() => setIsQueueOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                    <X size={16} />
                  </button>
                </div>
                
                <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                  {locationQueue.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-3 p-4">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300">
                        <CheckCircle size={24} />
                      </div>
                      <p className="text-xs text-slate-400 italic">All locations have been spatially placed.</p>
                    </div>
                  ) : (
                    locationQueue.map(loc => (
                      <div 
                        key={loc.id} 
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('locationId', loc.id)}
                        className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm cursor-grab active:cursor-grabbing group hover:border-emerald-500/50 transition-all hover:shadow-md"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{loc.type}</span>
                          <Sparkles size={12} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm break-words">{loc.name}</h4>
                        <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 italic">Drag to place on map</p>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20">
                  <p className="text-[10px] text-indigo-50 font-bold leading-relaxed">
                    <strong>Placement Mode:</strong> Drag cards from this queue and drop them anywhere on the map to define their coordinates.
                  </p>
                </div>
              </aside>
            </div>
          )}

          {activeTab === WorldTab.COSMOLOGY && (
            <section className="space-y-8">
               <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Clock size={20} className="text-indigo-500" /> Cosmology Engine
                </h2>
                <div className="px-4 py-2 bg-slate-900 text-white rounded-xl font-mono text-xs">
                  Day Count: {activeCalendar.currentEpochDay || 0}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Cosmology Content Remains the Same */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                    <span>Temporal Constants</span>
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Days per Week</span>
                      <input type="number" value={activeCalendar.daysPerWeek || 7} onChange={(e) => {
                          onUpdateProject({ calendars: [{ ...activeCalendar, daysPerWeek: parseInt(e.target.value) || 7 }] });
                        }} className="w-20 bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-3 py-1 text-right font-mono" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Hours per Day (Ticks)</span>
                      <input type="number" value={activeCalendar.hoursPerDay || 24} onChange={(e) => {
                          onUpdateProject({ calendars: [{ ...activeCalendar, hoursPerDay: parseInt(e.target.value) || 24 }] });
                        }} className="w-20 bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-3 py-1 text-right font-mono" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === WorldTab.LOCATIONS && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <MapIcon size={20} className="text-emerald-500" /> Locations
                </h2>
                <button onClick={() => onAddLocation({ id: generateId(), name: 'New Location', description: '', type: 'City', source: 'manual' })} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center gap-2">
                  <Plus size={16} /> Add Location
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.locations.map(loc => (
                  <div key={loc.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{loc.type}</span>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onOpenBlueprint('Location', loc.id, loc)} className="text-slate-300 hover:text-indigo-500"><Edit2 size={14} /></button>
                        <button onClick={() => onUpdateProject({ locations: data.locations.filter(l => l.id !== loc.id) })} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <div className="break-words [overflow-wrap:anywhere]">
                      <h3 className="font-bold text-slate-900 dark:text-white">{loc.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{loc.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === WorldTab.INVENTORY && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Box size={20} className="text-amber-500" /> Artifacts
                </h2>
                <button onClick={() => onAddArtifact({ id: generateId(), name: 'New Artifact', type: 'Relic', description: '', source: 'manual' })} className="px-4 py-2 bg-amber-600 text-white rounded-xl font-bold text-sm flex items-center gap-2">
                  <Box size={16} /> Add Artifact
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.artifacts?.map(art => (
                  <div key={art.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{art.type}</span>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onOpenBlueprint('Artifact', art.id, art)} className="text-slate-300 hover:text-indigo-500"><Edit2 size={14} /></button>
                        <button onClick={() => onDeleteArtifact(art.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <div className="break-words [overflow-wrap:anywhere]">
                      <h3 className="font-bold text-slate-900 dark:text-white">{art.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{art.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === WorldTab.ENCYCLOPEDIA && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Book size={20} className="text-indigo-500" /> Encyclopedia
                </h2>
                <button onClick={() => onAddLore({ id: generateId(), term: 'New Entry', definition: '', category: 'General', source: 'manual' })} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2">
                  <Plus size={16} /> Add Entry
                </button>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
                {data.lore?.filter(l => l.category !== 'Dictionary').map(entry => (
                  <div key={entry.id} className="p-6 flex items-start justify-between group">
                    <div className="break-words [overflow-wrap:anywhere] flex-1 min-w-0">
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{entry.category}</span>
                      <h4 className="font-bold text-slate-900 dark:text-white text-lg">{entry.term}</h4>
                      <p className="text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">{entry.definition}</p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onOpenBlueprint('Lore', entry.id, entry)} className="text-slate-300 hover:text-indigo-500"><Edit2 size={14} /></button>
                      <button onClick={() => onDeleteLore(entry.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                  </div>
                )) || <p className="p-8 text-center text-slate-400 italic">No encyclopedia entries yet.</p>}
              </div>
            </section>
          )}

          {activeTab === WorldTab.DICTIONARY && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <FileText size={20} className="text-emerald-500" /> Dictionary
                </h2>
                <button onClick={() => onAddLore({ id: generateId(), term: 'New Word', definition: '', category: 'Dictionary', source: 'manual' })} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center gap-2">
                  <Plus size={16} /> Add Word
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.lore?.filter(l => l.category === 'Dictionary').map(entry => (
                  <div key={entry.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group relative break-words [overflow-wrap:anywhere]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Term</span>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onOpenBlueprint('Lore', entry.id, entry)} className="text-slate-300 hover:text-indigo-500"><Edit2 size={14} /></button>
                        <button onClick={() => onDeleteLore(entry.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-xl font-serif italic">{entry.term}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{entry.definition}</p>
                  </div>
                )) || <p className="col-span-2 p-8 text-center text-slate-400 italic">No dictionary entries yet.</p>}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
