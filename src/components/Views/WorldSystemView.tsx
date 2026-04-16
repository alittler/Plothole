// SEED MONSTERS UPDATE
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import { ViewType, ProjectData, Location, Artifact, LoreEntry, Note, ProseDocument, User, ProjectMetadata, MapPath, Character } from '../../types';
import { Plus, Minus, Map as MapIcon, Box, Book, Search, Edit2, Trash2, Maximize2, FileText, Clock, Upload, Layout, Sparkles, ChevronRight, CheckCircle, X, Save, Target, Globe, Loader2, MapPin, Activity, RotateCcw, Ruler, Layers, Footprints as PawPrint, Lock, Unlock, BookOpen } from 'lucide-react';

import { WikiText } from '../ui/WikiText';
import { generateId } from '../../services/storageService';
import { RichEditor } from '../ui/RichEditor';
import { Modal } from '../ui/Modal';

interface WorldSystemViewProps {
  currentView: ViewType;
  onChangeView: (view: ViewType, params?: { creatureId?: number }) => void;
  data: ProjectData;
  onAddLocation: (l: Location) => void;
  onAddArtifact: (a: Artifact) => void;
  onUpdateArtifact: (a: Artifact) => void;
  onAddLore: (l: LoreEntry) => void;
  onUpdateLocation: (l: Location) => void;
  onUpdateCharacter: (c: Character) => void;
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
  MAP = 'Map',
  MAP2 = 'Map2',
  LOCATIONS = 'Locations & Paths',
  INVENTORY = 'Inventory',
  RECIPE_BOOK = 'Recipe Book'
}

interface Creature {
  id: number;
  name: string;
  category: string;
  alignment: string;
  lat: number;
  lon: number;
  lore: string;
}

const ALIGNMENT_COLORS: Record<string, string> = {
  'Benevolent': '#22c55e',
  'Neutral': '#8b5cf6',
  'Malicious': '#ef4444',
  'Ambivalent': '#f59e0b',
};

const CATEGORY_ICONS: Record<string, string> = {
  'Anthromorphic': '👤',
  'Zoomorphic': '🦁',
  'Hybrids': '🐉',
  'Dragons': '🐲',
  'Other': '✨',
};

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
  onUpdateCharacter,
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
  const [entityManagerTab, setEntityManagerTab] = useState<'locations' | 'characters'>('locations');
  const [editingMapId, setEditingMapId] = useState<string | null>(null);
  const [editingMapName, setEditingMapName] = useState("");
  const [localScale, setLocalScale] = useState(data.mapScale || 100);
  const [localUnit, setLocalUnit] = useState(data.mapUnit || "km");

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [editingArtifact, setEditingArtifact] = useState<Artifact | null>(null);
  const [editingPath, setEditingPath] = useState<MapPath | null>(null);

  // Bestiary State
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [filteredCreatures, setFilteredCreatures] = useState<Creature[]>([]);
  const [selectedCreature, setSelectedCreature] = useState<Creature | null>(null);
  const [creatureSearchTerm, setCreatureSearchTerm] = useState('');
  const [creatureCategoryFilter, setCreatureCategoryFilter] = useState<string>('');
  const [creatureAlignmentFilter, setCreatureAlignmentFilter] = useState<string>('');
  const [isCreaturesLoading, setIsCreaturesLoading] = useState(true);
  const [creatureCategories, setCreatureCategories] = useState<string[]>([]);
  const [isPlacingLocationOnCreatureMap, setIsPlacingLocationOnCreatureMap] = useState(false);
  const [creatureMapLocationMarkers, setCreatureMapLocationMarkers] = useState<Map<string, any>>(new Map());
  const [isCreatureSearchOpen, setIsCreatureSearchOpen] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [visibleLayers, setVisibleLayers] = useState({ creatures: true, locations: true });
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // Locations Map (MAP2) State
  const [selectedLocationForMap, setSelectedLocationForMap] = useState<Location | null>(null);
  const [locationSearchTerm, setLocationSearchTermForMap] = useState('');
  const locationsMapContainerRef = useRef<HTMLDivElement>(null);
  const locationsMapInstanceRef = useRef<any>(null);

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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isScaleOpen) {
        setIsScaleOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isScaleOpen]);

  // Load creatures data
  useEffect(() => {
    const loadCreatures = async () => {
      try {
        const response = await fetch('/data/creatures.json');
        const data: Creature[] = await response.json();
        setCreatures(data);
        setFilteredCreatures(data);
        
        const uniqueCategories = [...new Set(data.map(c => c.category))].sort();
        setCreatureCategories(uniqueCategories);
        setIsCreaturesLoading(false);
      } catch (error) {
        console.error('Error loading creatures:', error);
        setIsCreaturesLoading(false);
      }
    };

    loadCreatures();
  }, []);

  // Filter creatures by search only
  useEffect(() => {
    let filtered = creatures;

    if (creatureSearchTerm) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(creatureSearchTerm.toLowerCase()) ||
        c.lore.toLowerCase().includes(creatureSearchTerm.toLowerCase())
      );
    }

    setFilteredCreatures(filtered);
  }, [creatureSearchTerm, creatures]);

  // Initialize bestiary map with Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current || creatures.length === 0 || activeTab !== WorldTab.MAP) return;

    import('leaflet').then(({ default: L }) => {
      const map = L.map(mapContainerRef.current!).setView([54.5260, 15.2551], 3);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      creatures.forEach((creature) => {
        if (!visibleLayers.creatures) return;
        
        const color = ALIGNMENT_COLORS[creature.alignment] || '#6b7280';
        const marker = L.circleMarker([creature.lat, creature.lon], {
          radius: 8,
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        });

        const popupContent = `
          <div style="font-weight: bold; font-size: 0.875rem;">${CATEGORY_ICONS[creature.category]} ${creature.name}</div>
          <div style="font-size: 0.75rem; color: #666;">${creature.category}</div>
          <div style="font-size: 0.75rem; margin-top: 0.25rem;">${creature.lore}</div>
        `;

        marker.bindPopup(popupContent);
        marker.on('click', () => {
          setSelectedCreature(creature);
        });

        marker.addTo(map);
      });

      // Add location markers if any have been placed
      const locationsWithCoords = data.locations.filter(l => l.x !== undefined && l.y !== undefined);
      const newMarkers = new Map<string, any>();
      
      locationsWithCoords.forEach((location) => {
        if (!visibleLayers.locations) return;
        
        const locationMarker = L.circleMarker([location.y, location.x], {
          radius: 10,
          fillColor: '#10b981',
          color: '#fff',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.7,
          dashArray: '5, 5'
        });

        locationMarker.bindPopup(`<div style="font-weight: bold; font-size: 0.875rem;">${location.name}</div>`);
        locationMarker.addTo(map);
        newMarkers.set(location.id, locationMarker);
      });

      setCreatureMapLocationMarkers(newMarkers);

      // Handle map clicks for placement mode
      map.on('click', (e: any) => {
        if (isPlacingLocationOnCreatureMap && selectedCreature) {
          const { lat, lng } = e.latlng;
          // Create new location at clicked coordinates
          const newLocation: Location = {
            id: generateId(),
            name: `Location near ${selectedCreature.name}`,
            description: `Found near ${selectedCreature.name}`,
            type: 'Notable Site',
            x: lng,
            y: lat,
            source: 'manual',
          };
          onAddLocation(newLocation);
          setIsPlacingLocationOnCreatureMap(false);
        }
      });

      // Store refs for zoom controls
      zoomInRef.current = () => map.zoomIn();
      zoomOutRef.current = () => map.zoomOut();
      centerMapRef.current = () => map.setView([54.5260, 15.2551], 3);
      fitAllLocationsRef.current = () => {
        if (locationsWithCoords.length > 0) {
          const group = L.featureGroup(locationsWithCoords.map(loc => L.marker([loc.y, loc.x])));
          map.fitBounds(group.getBounds().pad(0.1));
        }
      };

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [creatures, data.locations, activeTab, isPlacingLocationOnCreatureMap, selectedCreature, onAddLocation, visibleLayers]);

  // Initialize locations map (MAP2) with Leaflet
  useEffect(() => {
    if (!locationsMapContainerRef.current || locationsMapInstanceRef.current || data.locations.length === 0 || activeTab !== WorldTab.MAP2) return;

    // Filter locations that have coordinates
    const locationsWithCoords = data.locations.filter(l => l.x !== undefined && l.y !== undefined);
    if (locationsWithCoords.length === 0) return;

    import('leaflet').then(({ default: L }) => {
      const map = L.map(locationsMapContainerRef.current!).setView([54.5260, 15.2551], 3);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      locationsWithCoords.forEach((location) => {
        const marker = L.circleMarker([location.y, location.x], {
          radius: 8,
          fillColor: '#3b82f6',
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        });

        const popupContent = `
          <div style="font-weight: bold; font-size: 0.875rem;">${location.name}</div>
          <div style="font-size: 0.75rem; color: #666;">${location.type}</div>
          ${location.description ? `<div style="font-size: 0.75rem; margin-top: 0.25rem;">${location.description}</div>` : ''}
        `;

        marker.bindPopup(popupContent);
        marker.on('click', () => {
          setSelectedLocationForMap(location);
        });

        marker.addTo(map);
      });

      locationsMapInstanceRef.current = map;
    });

    return () => {
      if (locationsMapInstanceRef.current) {
        locationsMapInstanceRef.current.remove();
        locationsMapInstanceRef.current = null;
      }
    };
  }, [data.locations, activeTab]);

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

  const [showLocations, setShowLocations] = useState(true);
  const [showCharacters, setShowCharacters] = useState(true);
  const [showPaths, setShowPaths] = useState(true);

  const handleCharacterPlace = (id: string, x: number, y: number) => {
    const char = data.characters.find(c => c.id === id);
    if (char) {
      onUpdateCharacter({ ...char, x, y, parentId: currentMapParentId || 'root' });
      setIsQueueOpen(false);
    }
  };

  const handleCharacterMove = (id: string, x: number, y: number) => {
    const char = data.characters.find(c => c.id === id);
    if (char) {
      onUpdateCharacter({ ...char, x, y });
    }
  };

  const handleCharacterUnplace = (id: string) => {
    const char = data.characters.find(c => c.id === id);
    if (char) {
      const { x, y, parentId, isLocked, ...rest } = char;
      onUpdateCharacter(rest);
    }
  };

  const handleCharacterLock = (id: string, isLocked: boolean) => {
    const char = data.characters.find(c => c.id === id);
    if (char) {
      onUpdateCharacter({ ...char, isLocked });
    }
  };

  const filteredCharacters = data.characters.filter((c) => c.x !== undefined && c.y !== undefined && (c.parentId === (currentMapParentId || 'root')));



  const isCurrentMapRealWorld = (() => {
    if (currentMapParentId) {
      const parent = data.locations.find(l => l.id === currentMapParentId);
      return !!parent?.isRealWorld;
    }
    return !!data.isRealWorldMap;
  })();

  return (
    <div className="h-full w-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <div className={`transition-all duration-700 ease-in-out overflow-hidden shrink-0 ${isFullscreen ? 'max-h-0 opacity-0' : 'max-h-0 lg:max-h-64 opacity-0 lg:opacity-100 hidden lg:block'}`}>
        <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md z-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-0 hidden sm:block">
                <h1 className="ph-section-title text-2xl md:text-3xl flex items-center gap-3">
                  <Globe size={32} className="text-indigo-600" /> World Atlas
                </h1>
              </div>
              <div className="relative ml-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search..."
                  className="ph-input pl-12 w-64"
                />
              </div>
            </div>
            <div className="ph-tab-container overflow-x-auto no-scrollbar flex items-center gap-2">
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
                  {tab === WorldTab.MAP && <Globe size={14} />}
                  {tab === WorldTab.MAP2 && <MapIcon size={14} />}
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
        <div className="h-full w-full flex flex-col items-center p-0 lg:p-8 relative">
          <div className={`h-full w-full flex flex-col ${activeTab === WorldTab.MAP ? '' : `${isFullscreen ? 'max-w-none' : 'max-w-6xl'} space-y-12 overflow-y-auto pb-40`} px-4 md:px-8`}>
            
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
                  <button onClick={() => onAddArtifact({ id: generateId(), name: 'New Artifact', type: 'Relic', description: '', source: 'manual' })} className="px-4 py-2 bg-amber-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"><Plus size={18} /> New Artifact</button>
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

            {activeTab === WorldTab.MAP && (
              <section className="h-full w-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700 overflow-hidden">
                {isCreaturesLoading ? (
                  <div className="flex items-center justify-center h-96 text-slate-600 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={32} className="animate-spin" />
                      <p>Loading creatures...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Toolbar - Fixed at top */}
                    <div className="flex gap-3 px-4 md:px-6 pt-4 md:pt-6 pb-3 flex-wrap items-center border-b border-slate-200 dark:border-slate-800 shrink-0">
                      <button
                        onClick={() => setIsCreatureSearchOpen(!isCreatureSearchOpen)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors"
                        title="Search creatures"
                      >
                        <Search size={16} />
                        <span className="hidden sm:inline">Search</span>
                      </button>

                      <button
                        onClick={() => setVisibleLayers({ ...visibleLayers, creatures: !visibleLayers.creatures })}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          visibleLayers.creatures
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                            : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                        title="Toggle creatures layer"
                      >
                        🐉 <span className="hidden sm:inline">Creatures</span>
                      </button>

                      <button
                        onClick={() => setVisibleLayers({ ...visibleLayers, locations: !visibleLayers.locations })}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          visibleLayers.locations
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                            : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                        title="Toggle locations layer"
                      >
                        📍 <span className="hidden sm:inline">Locations</span>
                      </button>

                      <div className="flex-1" />

                      <button
                        onClick={() => onAddLocation({ id: generateId(), name: 'New Location from Manuscript', description: 'Added from manuscript analysis', type: 'Notable Site', source: 'ai' })}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors"
                        title="Add location from manuscript"
                      >
                        <Plus size={16} />
                        <span className="hidden sm:inline">Add Location</span>
                      </button>

                      <button
                        onClick={() => setIsMapFullscreen(!isMapFullscreen)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm font-semibold transition-colors"
                        title="Toggle fullscreen"
                      >
                        <Maximize2 size={16} />
                        <span className="hidden sm:inline">Fullscreen</span>
                      </button>
                    </div>

                    {/* Search Panel */}
                    {isCreatureSearchOpen && (
                      <div className="px-4 md:px-6 pb-3 shrink-0 border-b border-slate-200 dark:border-slate-800">
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex gap-2 items-center">
                            <Search size={18} className="text-slate-600 dark:text-slate-400 flex-shrink-0" />
                            <input
                              type="text"
                              placeholder="Search creatures by name or lore..."
                              value={creatureSearchTerm}
                              onChange={(e) => setCreatureSearchTerm(e.target.value)}
                              autoFocus
                              className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                              onClick={() => setIsCreatureSearchOpen(false)}
                              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                              <X size={18} className="text-slate-600 dark:text-slate-400" />
                            </button>
                          </div>
                          {creatureSearchTerm && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                              Found {filteredCreatures.length} of {creatures.length} creatures
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Map and Details */}
                    <div className="flex-1 flex gap-4 overflow-hidden min-h-0 p-4 md:p-6">
                      {/* Map Container */}
                      <div className="flex-1 min-w-0 relative">
                        <div ref={mapContainerRef} className="w-full h-full rounded-lg overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800" />
                        
                        {/* Map Controls */}
                        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                          <button
                            onClick={() => zoomInRef.current?.()}
                            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                            title="Zoom in"
                          >
                            <Plus size={18} className="text-slate-600 dark:text-slate-300" />
                          </button>
                          <button
                            onClick={() => zoomOutRef.current?.()}
                            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                            title="Zoom out"
                          >
                            <Minus size={18} className="text-slate-600 dark:text-slate-300" />
                          </button>
                          <button
                            onClick={() => fitAllLocationsRef.current?.()}
                            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                            title="Fit all locations"
                          >
                            <Maximize2 size={18} className="text-slate-600 dark:text-slate-300" />
                          </button>
                        </div>
                      </div>

                      {/* Sidebar - Selected creature details card */}
                      {selectedCreature && (
                        <div className="w-96 border-l border-slate-200 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 overflow-y-auto shadow-lg">
                          <div className="p-6 space-y-6">
                            {/* Header */}
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="text-4xl">{CATEGORY_ICONS[selectedCreature.category]}</div>
                                  <div className="flex-1">
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                                      {selectedCreature.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest mt-1">
                                      Creature of Legend
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Classification */}
                            <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 space-y-3">
                              <div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase font-bold tracking-widest mb-1">Category</p>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedCreature.category}</p>
                              </div>
                              <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase font-bold tracking-widest mb-2">Alignment</p>
                                <div className="flex items-center gap-2">
                                  <span
                                    className="px-3 py-1.5 rounded-full text-white text-xs font-bold uppercase tracking-widest inline-block"
                                    style={{ backgroundColor: ALIGNMENT_COLORS[selectedCreature.alignment] }}
                                  >
                                    {selectedCreature.alignment}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Geographic Location */}
                            <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                              <div className="flex items-start gap-3">
                                <MapPin size={18} className="mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-xs text-slate-600 dark:text-slate-400 uppercase font-bold tracking-widest mb-2">Geographic Location</p>
                                  <p className="text-sm font-mono text-slate-900 dark:text-white">
                                    {selectedCreature.lat.toFixed(4)}°N, {selectedCreature.lon.toFixed(4)}°E
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                    {Math.abs(selectedCreature.lat).toFixed(2)}° {selectedCreature.lat >= 0 ? 'North' : 'South'}, {Math.abs(selectedCreature.lon).toFixed(2)}° {selectedCreature.lon >= 0 ? 'East' : 'West'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Lore/Description */}
                            <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                              <div className="flex items-start gap-3">
                                <Book size={18} className="mt-0.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="font-bold text-slate-900 dark:text-white mb-2 text-sm">Lore & Legend</p>
                                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-serif italic">
                                    {selectedCreature.lore}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Creature ID */}
                            <div className="text-xs text-slate-500 dark:text-slate-500 text-center py-2 border-t border-slate-200 dark:border-slate-800">
                              Creature ID: {selectedCreature.id}
                            </div>

                            {/* Action Buttons */}
                            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
                              <p className="font-semibold text-slate-900 dark:text-white text-sm uppercase tracking-widest">Map Tools</p>
                              <button
                                onClick={() => setIsPlacingLocationOnCreatureMap(!isPlacingLocationOnCreatureMap)}
                                className={`w-full py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors ${
                                  isPlacingLocationOnCreatureMap
                                    ? 'bg-emerald-500 text-white shadow-lg'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-700'
                                }`}
                              >
                                {isPlacingLocationOnCreatureMap ? '✓ Click map to place' : '+ Place Location'}
                              </button>
                              <button
                                onClick={() => centerMapRef.current?.()}
                                className="w-full py-2.5 px-3 rounded-lg text-sm font-semibold bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                              >
                                📍 Center on Creature
                              </button>
                            </div>
                           </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
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

      {/* MAP2 Tab - Locations Map (Leaflet/OSM) */}
      {activeTab === WorldTab.MAP2 && (
        <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 h-full flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl"><MapIcon size={24} /></div>
              <div><h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Project Locations Map</h2><p className="text-sm text-slate-500 uppercase font-bold tracking-widest">Interactive map</p></div>
            </div>
          </div>

          {data.locations.filter(l => l.x !== undefined && l.y !== undefined).length === 0 ? (
            <div className="flex items-center justify-center h-96 text-slate-600 dark:text-slate-400">
              <div className="flex flex-col items-center gap-2 text-center">
                <MapPin size={32} />
                <p>No locations with coordinates to display</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
              {/* Map */}
              <div className="flex-1 min-w-0">
                <div ref={locationsMapContainerRef} className="w-full h-full rounded-lg overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800" />
              </div>

              {/* Sidebar - Selected location details */}
              {selectedLocationForMap && (
                <div className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto">
                  <div className="p-6 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin size={20} className="text-blue-600" />
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                          {selectedLocationForMap.name}
                        </h3>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="text-slate-600 dark:text-slate-400">
                          <span className="font-semibold">Type:</span> {selectedLocationForMap.type}
                        </p>
                        <p className="text-slate-600 dark:text-slate-400">
                          <span className="font-semibold">Source:</span> {selectedLocationForMap.source === 'ai' ? '📚 Manuscript' : '✏️ Manual'}
                        </p>
                        {selectedLocationForMap.x !== undefined && selectedLocationForMap.y !== undefined && (
                          <p className="text-slate-600 dark:text-slate-400">
                            <span className="font-semibold">Coordinates:</span> {selectedLocationForMap.y.toFixed(2)}°, {selectedLocationForMap.x.toFixed(2)}°
                          </p>
                        )}
                      </div>
                    </div>

                    {selectedLocationForMap.description && (
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                        <div className="flex items-start gap-2">
                          <FileText size={16} className="mt-1 text-blue-600 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white mb-2 text-sm">Description</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                              {selectedLocationForMap.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
