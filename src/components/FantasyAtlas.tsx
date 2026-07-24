import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Plus,
  Trash2,
  Layers,
  Upload,
  Download,
  RotateCcw,
  CheckCircle,
  Loader,
  Compass,
  Eye,
  EyeOff,
  Sparkles,
  Info,
  X,
  FileCode,
  Check,
  Copy,
  Castle,
  Tent,
  Skull,
  Anchor,
  Shield,
  Trees,
  Grid,
  Ruler,
  Calculator,
  BookOpen,
  Route,
  Waypoints,
  Navigation,
  Edit2,
  Play,
  PanelRightClose,
  PanelRightOpen,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { AtlasLocation, AtlasMapState, AtlasPath, AtlasPathPoint } from '../types';
import { buildSingleFileMarkdown } from '../utils/markdownExporter';
import { getAccessToken, uploadToGoogleDrive } from '../lib/firebase';
import { saveAtlasStateToStorage, loadAtlasStateFromStorage } from '../utils/atlasStorage';

interface FantasyAtlasProps {
  user: any;
  initialAtlasState?: AtlasMapState | null;
  onSaveAtlasState?: (state: AtlasMapState) => Promise<void> | void;
}

// Sample high quality Parchment Fantasy World Map SVG generated as Data URL for default map
const DEFAULT_FANTASY_MAP_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000"><rect width="1600" height="1000" fill="%23f4ecd8"/><path d="M0 0 L1600 0 L1600 1000 L0 1000 Z" fill="none" stroke="%238c6d46" stroke-width="20"/><circle cx="800" cy="500" r="450" fill="%23ebd8b0" opacity="0.5"/><path d="M 200 300 Q 400 150 700 250 T 1200 200 T 1400 500 T 1100 800 T 500 750 T 200 500 Z" fill="%23d8c49d" stroke="%23735332" stroke-width="4"/><path d="M 300 400 Q 500 350 700 450 T 1000 380 T 1200 600 T 800 700 T 400 650 Z" fill="%23ebd8b0" opacity="0.6"/><path d="M 450 350 L 480 300 L 510 350 L 540 290 L 570 350 M 800 450 L 830 390 L 860 450 M 900 600 L 930 540 L 960 600" fill="none" stroke="%23593e22" stroke-width="3" stroke-linecap="round"/><path d="M 350 480 Q 550 500 850 430 T 1250 520" fill="none" stroke="%232b506e" stroke-width="4" stroke-dasharray="8 4"/><text x="800" y="120" font-family="Georgia, serif" font-size="36" font-weight="bold" fill="%23422a14" text-anchor="middle" letter-spacing="4">THE KNOWN REALMS OF ELDRORIA</text><text x="800" y="150" font-family="Georgia, serif" font-size="16" italic="true" fill="%236e4b2a" text-anchor="middle">Cartographer's Codex & Atlas</text><g transform="translate(1420, 820)"><circle cx="0" cy="0" r="60" fill="none" stroke="%23593e22" stroke-width="3"/><path d="M 0 -50 L 0 50 M -50 0 L 50 0" stroke="%23593e22" stroke-width="2"/><text x="0" y="-55" font-family="serif" font-size="14" font-weight="bold" fill="%23593e22" text-anchor="middle">N</text></g></svg>`;

const CATEGORIES: Array<AtlasLocation['category']> = [
  'Cities',
  'Dungeons',
  'Roads',
  'Landmarks',
  'Ruins',
  'Outposts',
  'Taverns'
];

const ICON_OPTIONS: Array<{ key: AtlasLocation['icon']; label: string; symbol: string }> = [
  { key: 'castle', label: 'Castle / City', symbol: '🏰' },
  { key: 'tent', label: 'Camp / Outpost', symbol: '⛺' },
  { key: 'dragon', label: 'Lair / Boss', symbol: '🐉' },
  { key: 'skull', label: 'Dungeon / Danger', symbol: '💀' },
  { key: 'map-pin', label: 'Landmark', symbol: '📍' },
  { key: 'anchor', label: 'Port / Harbor', symbol: '⚓' },
  { key: 'shield', label: 'Fortress', symbol: '🛡️' },
  { key: 'tree', label: 'Enchanted Forest', symbol: '🌲' },
  { key: 'sparkles', label: 'Magic Portal', symbol: '✨' },
  { key: 'compass', label: 'Waypoint', symbol: '🧭' }
];

const PATH_COLORS = [
  { key: '#d97706', name: 'Amber Gold' },
  { key: '#dc2626', name: 'Crimson Red' },
  { key: '#2563eb', name: 'Royal Blue' },
  { key: '#059669', name: 'Emerald Green' },
  { key: '#7c3aed', name: 'Mystic Purple' },
  { key: '#1e293b', name: 'Obsidian Slate' }
];

export const FantasyAtlas: React.FC<FantasyAtlasProps> = ({
  user,
  initialAtlasState,
  onSaveAtlasState
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const imageOverlayRef = useRef<L.ImageOverlay | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);
  const gridGroupRef = useRef<L.LayerGroup | null>(null);
  const rulerGroupRef = useRef<L.LayerGroup | null>(null);
  const pathGroupRef = useRef<L.LayerGroup | null>(null);
  const pathDraftGroupRef = useRef<L.LayerGroup | null>(null);

  // Helper to resolve initial atlas state from props or localStorage fallback
  const getInitialAtlasData = () => {
    if (initialAtlasState) return initialAtlasState;
    try {
      const saved = localStorage.getItem('plothole_fantasy_atlas');
      if (saved) {
        return JSON.parse(saved) as AtlasMapState;
      }
    } catch (e) {
      console.error("Failed to parse saved atlas state from localStorage", e);
    }
    return null;
  };

  const loadedAtlas = getInitialAtlasData();

  // Map state
  const [mapTitle, setMapTitle] = useState(loadedAtlas?.mapTitle || 'World of Eldroria');
  const [imageUrl, setImageUrl] = useState(loadedAtlas?.imageUrl || DEFAULT_FANTASY_MAP_SVG);
  const [imageWidth, setImageWidth] = useState(loadedAtlas?.imageWidth || 1600);
  const [imageHeight, setImageHeight] = useState(loadedAtlas?.imageHeight || 1000);

  // Distance Scale & Visual Grid Overlay State
  const [showGridOverlay, setShowGridOverlay] = useState(true);
  const [gridSpacing, setGridSpacing] = useState(200); // pixels per grid square
  const [realWorldWidth, setRealWorldWidth] = useState(25000); // e.g. 25,000 km
  const [realWorldUnit, setRealWorldUnit] = useState<'km' | 'miles'>('km');

  // Interactive Ruler / Distance Measurement
  const [isMeasuringMode, setIsMeasuringMode] = useState(false);
  const [measurePointA, setMeasurePointA] = useState<{ x: number; y: number; name: string } | null>(null);
  const [measurePointB, setMeasurePointB] = useState<{ x: number; y: number; name: string } | null>(null);

  // Cartography Math Tutor Modal
  const [showScaleMathModal, setShowScaleMathModal] = useState(false);

  // Sidebar Tab Mode
  const [sidebarTab, setSidebarTab] = useState<'locations' | 'paths'>('locations');

  // Locations state
  const [locations, setLocations] = useState<AtlasLocation[]>(loadedAtlas?.locations || [
    {
      id: 'loc_1',
      name: 'Highgarden Citadel',
      category: 'Cities',
      icon: 'castle',
      x: 500,
      y: 800,
      description: 'The ancient capital seat of kings and scholars.',
      addedAt: new Date().toISOString()
    },
    {
      id: 'loc_2',
      name: 'Sunken Citadel Labyrinth',
      category: 'Dungeons',
      icon: 'skull',
      x: 350,
      y: 400,
      description: 'A subterranean labyrinth filled with forgotten relic traps.',
      addedAt: new Date().toISOString()
    },
    {
      id: 'loc_3',
      name: 'Dragontooth Peak',
      category: 'Landmarks',
      icon: 'dragon',
      x: 650,
      y: 1100,
      description: 'Towering mountain where the elder wyrm sleeps.',
      addedAt: new Date().toISOString()
    }
  ]);

  // Saved Paths & Routes state
  const [paths, setPaths] = useState<AtlasPath[]>(loadedAtlas?.paths || [
    {
      id: 'path_1',
      name: "The Royal Trade Highway",
      color: '#d97706',
      style: 'dashed',
      waypoints: [
        { x: 500, y: 800, name: 'Highgarden Citadel' },
        { x: 450, y: 600, name: 'Middle River Crossing' },
        { x: 350, y: 400, name: 'Sunken Citadel' }
      ],
      description: 'The primary paved stone road connecting the capital to the western marches.',
      category: 'Trade Route',
      visible: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'path_2',
      name: "Smuggler's Mountain Pass",
      color: '#2563eb',
      style: 'dotted',
      waypoints: [
        { x: 350, y: 400, name: 'Sunken Citadel' },
        { x: 520, y: 750, name: 'Hidden Ridge' },
        { x: 650, y: 1100, name: 'Dragontooth Peak' }
      ],
      description: 'Uncharted high-altitude trail bypassing royal sentry towers.',
      category: 'Mountain Trail',
      visible: true,
      createdAt: new Date().toISOString()
    }
  ]);

  // Route Drawing Draft state
  const [isDrawingPath, setIsDrawingPath] = useState(false);
  const [pathDraftWaypoints, setPathDraftWaypoints] = useState<AtlasPathPoint[]>([]);
  const [pathDraftName, setPathDraftName] = useState('');
  const [pathDraftColor, setPathDraftColor] = useState('#d97706');
  const [pathDraftStyle, setPathDraftStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [pathDraftDesc, setPathDraftDesc] = useState('');
  const [showSavePathModal, setShowSavePathModal] = useState(false);
  const [editingPath, setEditingPath] = useState<AtlasPath | null>(null);

  const [activeCategories, setActiveCategories] = useState<string[]>(
    initialAtlasState?.activeCategories || CATEGORIES
  );

  // Mode states for Location adding
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ x: number; y: number } | null>(null);
  const [newLocName, setNewLocName] = useState('');
  const [newLocCategory, setNewLocCategory] = useState<AtlasLocation['category']>('Cities');
  const [newLocIcon, setNewLocIcon] = useState<AtlasLocation['icon']>('castle');
  const [newLocDesc, setNewLocDesc] = useState('');
  const [selectedLoc, setSelectedLoc] = useState<AtlasLocation | null>(null);

  // Roll away sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Dynamic Map Scale state
  const [currentZoomLevel, setCurrentZoomLevel] = useState<number>(0);
  const [currentScaleBarVal, setCurrentScaleBarVal] = useState<number>(100);
  const [scaleBarWidthPx, setScaleBarWidthPx] = useState<number>(120);

  // Undo Stack & Auto-Save
  const [undoStack, setUndoStack] = useState<AtlasLocation[][]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<{ message: string; actionLabel?: string; onAction?: () => void } | null>(null);
  const [showMarkdownExport, setShowMarkdownExport] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Distance helper
  const calculatePathDistance = (waypoints: AtlasPathPoint[]): number => {
    if (waypoints.length < 2) return 0;
    let totalPx = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const dx = waypoints[i + 1].x - waypoints[i].x;
      const dy = waypoints[i + 1].y - waypoints[i].y;
      totalPx += Math.sqrt(dx * dx + dy * dy);
    }
    const scale = realWorldWidth / imageWidth;
    return totalPx * scale;
  };

  // Auto-save & Sync
  const triggerAutoSave = async (
    newLocations?: AtlasLocation[],
    newPaths?: AtlasPath[],
    toastMessage?: string,
    overrideImageMeta?: { imageUrl?: string; imageWidth?: number; imageHeight?: number; mapTitle?: string }
  ) => {
    const targetLocations = newLocations !== undefined ? newLocations : locations;
    const targetPaths = newPaths !== undefined ? newPaths : paths;
    const targetImageUrl = overrideImageMeta?.imageUrl !== undefined ? overrideImageMeta.imageUrl : imageUrl;
    const targetImageWidth = overrideImageMeta?.imageWidth !== undefined ? overrideImageMeta.imageWidth : imageWidth;
    const targetImageHeight = overrideImageMeta?.imageHeight !== undefined ? overrideImageMeta.imageHeight : imageHeight;
    const targetMapTitle = overrideImageMeta?.mapTitle !== undefined ? overrideImageMeta.mapTitle : mapTitle;

    setSaveStatus('saving');

    const stateToSave: AtlasMapState = {
      id: 'default_atlas',
      mapTitle: targetMapTitle,
      imageUrl: targetImageUrl,
      imageWidth: targetImageWidth,
      imageHeight: targetImageHeight,
      locations: targetLocations,
      paths: targetPaths,
      activeCategories,
      center: leafletMapRef.current ? [leafletMapRef.current.getCenter().lat, leafletMapRef.current.getCenter().lng] : [targetImageHeight / 2, targetImageWidth / 2],
      zoom: leafletMapRef.current ? leafletMapRef.current.getZoom() : 0,
      updatedAt: new Date().toISOString()
    };

    try {
      if (onSaveAtlasState) {
        await onSaveAtlasState(stateToSave);
      }
      await saveAtlasStateToStorage(stateToSave);
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      if (toastMessage) {
        setToastNotice({ message: toastMessage });
        setTimeout(() => setToastNotice(null), 3000);
      }
    } catch (e) {
      console.error("Auto save failed:", e);
      setSaveStatus('saved');
    }
  };

  // Load from IndexedDB on initial mount if available
  useEffect(() => {
    loadAtlasStateFromStorage().then((idbState) => {
      if (idbState && idbState.imageUrl && idbState.imageUrl !== imageUrl) {
        setImageUrl(idbState.imageUrl);
        if (idbState.imageWidth) setImageWidth(idbState.imageWidth);
        if (idbState.imageHeight) setImageHeight(idbState.imageHeight);
        if (idbState.mapTitle) setMapTitle(idbState.mapTitle);
        if (idbState.locations) setLocations(idbState.locations);
        if (idbState.paths) setPaths(idbState.paths);
      }
    }).catch((err) => {
      console.error('Failed loading atlas from IndexedDB:', err);
    });
  }, []);

  // Initialize Leaflet map with L.CRS.Simple & strict bounds
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        crs: L.CRS.Simple,
        minZoom: -2,
        maxZoom: 4,
        zoomControl: false,
        attributionControl: false,
        maxBoundsViscosity: 1.0 // Strict edge snapping so map cannot drag past bounds!
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      leafletMapRef.current = map;
      markerGroupRef.current = L.layerGroup().addTo(map);
      gridGroupRef.current = L.layerGroup().addTo(map);
      rulerGroupRef.current = L.layerGroup().addTo(map);
      pathGroupRef.current = L.layerGroup().addTo(map);
      pathDraftGroupRef.current = L.layerGroup().addTo(map);

      // Handle map clicks for markers, distance ruler, or drawing routes
      map.on('click', (e: L.LeafletMouseEvent) => {
        const latlng = e.latlng;
        const coords = { x: Math.round(latlng.lat), y: Math.round(latlng.lng) };

        if ((window as any)._atlasDrawingPathMode) {
          const currentWaypoints = (window as any)._atlasPathDraftWaypoints || [];
          const newWp: AtlasPathPoint = {
            x: coords.x,
            y: coords.y,
            name: `Waypoint ${currentWaypoints.length + 1}`
          };
          const updated = [...currentWaypoints, newWp];
          (window as any)._atlasPathDraftWaypoints = updated;
          setPathDraftWaypoints(updated);
        } else if ((window as any)._atlasMeasuringMode) {
          const ptName = `Grid (${coords.x}, ${coords.y})`;
          const currentA = (window as any)._atlasMeasurePointA;
          if (!currentA || (window as any)._atlasMeasurePointB) {
            (window as any)._atlasMeasurePointA = { ...coords, name: ptName };
            (window as any)._atlasMeasurePointB = null;
            setMeasurePointA({ ...coords, name: ptName });
            setMeasurePointB(null);
          } else {
            (window as any)._atlasMeasurePointB = { ...coords, name: ptName };
            setMeasurePointB({ ...coords, name: ptName });
          }
        } else {
          setPendingCoords(coords);
        }
      });
    }

    const map = leafletMapRef.current;
    const bounds: L.LatLngBoundsExpression = [[0, 0], [imageHeight, imageWidth]];

    if (imageOverlayRef.current) {
      map.removeLayer(imageOverlayRef.current);
    }

    const overlay = L.imageOverlay(imageUrl, bounds).addTo(map);
    imageOverlayRef.current = overlay;

    // Restrict map panning and zoom out limit to strictly match map image dimensions!
    map.setMaxBounds(bounds);
    const fitZoom = map.getBoundsZoom(bounds, true);
    map.setMinZoom(fitZoom);
    map.fitBounds(bounds);

    const updateDynamicScale = () => {
      if (!leafletMapRef.current) return;
      const zoom = leafletMapRef.current.getZoom();
      setCurrentZoomLevel(zoom);

      // In L.CRS.Simple, 1 map coordinate unit = 2^zoom container screen pixels.
      const realPerMapPixel = realWorldWidth / imageWidth;
      const targetScreenBarPx = 130;
      const mapUnitsInTargetBar = targetScreenBarPx / Math.pow(2, zoom);
      const rawRealDist = mapUnitsInTargetBar * realPerMapPixel;

      // Pick nice human-readable distance values
      const niceSteps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 25000, 50000];
      let chosenVal = niceSteps[0];
      for (const step of niceSteps) {
        if (step <= rawRealDist) {
          chosenVal = step;
        } else {
          break;
        }
      }

      const neededMapUnits = chosenVal / realPerMapPixel;
      const calculatedPx = neededMapUnits * Math.pow(2, zoom);

      setCurrentScaleBarVal(chosenVal);
      setScaleBarWidthPx(Math.max(35, Math.min(220, Math.round(calculatedPx))));
    };

    updateDynamicScale();
    map.on('zoom zoomend move resize', updateDynamicScale);

    const handleResize = () => {
      if (!leafletMapRef.current) return;
      leafletMapRef.current.invalidateSize();
      const b: L.LatLngBoundsExpression = [[0, 0], [imageHeight, imageWidth]];
      const minZ = leafletMapRef.current.getBoundsZoom(b, true);
      leafletMapRef.current.setMinZoom(minZ);
      updateDynamicScale();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      map.off('zoom zoomend move resize', updateDynamicScale);
    };
  }, [imageUrl, imageWidth, imageHeight, realWorldWidth, realWorldUnit]);

  // Sync state variables to window ref for Leaflet event listener closure
  useEffect(() => {
    (window as any)._atlasMeasuringMode = isMeasuringMode;
    (window as any)._atlasMeasurePointA = measurePointA;
    (window as any)._atlasMeasurePointB = measurePointB;
    (window as any)._atlasDrawingPathMode = isDrawingPath;
    (window as any)._atlasPathDraftWaypoints = pathDraftWaypoints;
  }, [isMeasuringMode, measurePointA, measurePointB, isDrawingPath, pathDraftWaypoints]);

  // Render Visual Grid Overlay Layer
  useEffect(() => {
    if (!leafletMapRef.current) return;
    if (!gridGroupRef.current) {
      gridGroupRef.current = L.layerGroup().addTo(leafletMapRef.current);
    }

    gridGroupRef.current.clearLayers();

    if (!showGridOverlay) return;

    const step = gridSpacing || 200;
    const gridColor = '#d97706';

    // Vertical grid lines
    for (let y = step; y < imageWidth; y += step) {
      const line = L.polyline([[0, y], [imageHeight, y]], {
        color: gridColor,
        weight: 1,
        opacity: 0.35,
        dashArray: '5, 5'
      });

      const realWorldYVal = ((y / imageWidth) * realWorldWidth).toFixed(0);
      const labelIcon = L.divIcon({
        className: 'grid-coord-label',
        html: `<div style="font-family: monospace; font-size: 9px; font-weight: bold; color: #b45309; background: rgba(254, 243, 199, 0.85); padding: 1px 4px; border-radius: 4px; border: 1px solid #fde68a;">Y:${y} (${realWorldYVal}${realWorldUnit})</div>`,
        iconSize: [60, 16],
        iconAnchor: [30, 0]
      });
      const labelMarker = L.marker([imageHeight - 15, y], { icon: labelIcon });

      gridGroupRef.current.addLayer(line);
      gridGroupRef.current.addLayer(labelMarker);
    }

    // Horizontal grid lines
    for (let x = step; x < imageHeight; x += step) {
      const line = L.polyline([[x, 0], [x, imageWidth]], {
        color: gridColor,
        weight: 1,
        opacity: 0.35,
        dashArray: '5, 5'
      });

      const labelIcon = L.divIcon({
        className: 'grid-coord-label',
        html: `<div style="font-family: monospace; font-size: 9px; font-weight: bold; color: #b45309; background: rgba(254, 243, 199, 0.85); padding: 1px 4px; border-radius: 4px; border: 1px solid #fde68a;">X:${x}</div>`,
        iconSize: [50, 16],
        iconAnchor: [0, 8]
      });
      const labelMarker = L.marker([x, 15], { icon: labelIcon });

      gridGroupRef.current.addLayer(line);
      gridGroupRef.current.addLayer(labelMarker);
    }
  }, [showGridOverlay, gridSpacing, imageWidth, imageHeight, realWorldWidth, realWorldUnit]);

  // Render Distance Ruler Line between Point A and Point B
  useEffect(() => {
    if (!leafletMapRef.current) return;
    if (!rulerGroupRef.current) {
      rulerGroupRef.current = L.layerGroup().addTo(leafletMapRef.current);
    }

    rulerGroupRef.current.clearLayers();

    if (measurePointA) {
      const ptAIcon = L.divIcon({
        className: 'ruler-pt-icon',
        html: `<div style="background: #dc2626; color: white; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">A</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });
      rulerGroupRef.current.addLayer(L.marker([measurePointA.x, measurePointA.y], { icon: ptAIcon }));
    }

    if (measurePointB) {
      const ptBIcon = L.divIcon({
        className: 'ruler-pt-icon',
        html: `<div style="background: #2563eb; color: white; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">B</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });
      rulerGroupRef.current.addLayer(L.marker([measurePointB.x, measurePointB.y], { icon: ptBIcon }));
    }

    if (measurePointA && measurePointB) {
      const polyline = L.polyline(
        [[measurePointA.x, measurePointA.y], [measurePointB.x, measurePointB.y]],
        { color: '#dc2626', weight: 3, opacity: 0.9, dashArray: '6, 6' }
      );
      rulerGroupRef.current.addLayer(polyline);

      const midX = (measurePointA.x + measurePointB.x) / 2;
      const midY = (measurePointA.y + measurePointB.y) / 2;

      const dx = measurePointB.x - measurePointA.x;
      const dy = measurePointB.y - measurePointA.y;
      const pixelDistance = Math.sqrt(dx * dx + dy * dy);

      const scaleFactor = realWorldWidth / imageWidth;
      const realDistance = pixelDistance * scaleFactor;

      const midBadge = L.divIcon({
        className: 'ruler-dist-badge',
        html: `<div style="background: #0f172a; color: #f59e0b; border: 1.5px solid #f59e0b; font-family: sans-serif; font-weight: bold; font-size: 11px; padding: 4px 8px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); white-space: nowrap;">
                📏 ${realDistance.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${realWorldUnit} (${pixelDistance.toFixed(0)} px)
               </div>`,
        iconSize: [120, 24],
        iconAnchor: [60, 12]
      });

      rulerGroupRef.current.addLayer(L.marker([midX, midY], { icon: midBadge }));
    }
  }, [measurePointA, measurePointB, realWorldWidth, imageWidth, realWorldUnit]);

  // Render Saved Visible Paths on Map
  useEffect(() => {
    if (!leafletMapRef.current) return;
    if (!pathGroupRef.current) {
      pathGroupRef.current = L.layerGroup().addTo(leafletMapRef.current);
    }

    pathGroupRef.current.clearLayers();

    paths.filter(p => p.visible).forEach((path) => {
      if (path.waypoints.length < 2) return;

      const latLngs: L.LatLngExpression[] = path.waypoints.map(w => [w.x, w.y]);

      let dashArray: string | undefined = undefined;
      if (path.style === 'dashed') dashArray = '8, 8';
      if (path.style === 'dotted') dashArray = '3, 6';

      const polyline = L.polyline(latLngs, {
        color: path.color || '#d97706',
        weight: 4,
        opacity: 0.85,
        dashArray
      });

      const dist = calculatePathDistance(path.waypoints).toFixed(1);

      polyline.bindTooltip(
        `<div style="font-family: sans-serif; font-weight: bold; font-size: 11px; padding: 4px 8px; background: #0f172a; color: white; border-radius: 6px; border: 1px solid ${path.color};">
          🛤️ ${path.name}<br/>
          <span style="color: #f59e0b; font-size: 10px;">${dist} ${realWorldUnit} (${path.waypoints.length} waypoints)</span>
        </div>`,
        { sticky: true }
      );

      pathGroupRef.current?.addLayer(polyline);

      path.waypoints.forEach((wp, idx) => {
        const iconHtml = `<div style="background: ${path.color}; color: white; font-weight: bold; font-size: 9px; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.4);">${idx + 1}</div>`;
        const icon = L.divIcon({
          className: 'path-wp-badge',
          html: iconHtml,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
        const wpMarker = L.marker([wp.x, wp.y], { icon });
        wpMarker.bindTooltip(`<strong>${path.name}</strong><br/>Node ${idx + 1}: ${wp.name || `(${wp.x}, ${wp.y})`}`);
        pathGroupRef.current?.addLayer(wpMarker);
      });
    });
  }, [paths, realWorldWidth, imageWidth, realWorldUnit]);

  // Render Active Path Drafting Layer
  useEffect(() => {
    if (!leafletMapRef.current) return;
    if (!pathDraftGroupRef.current) {
      pathDraftGroupRef.current = L.layerGroup().addTo(leafletMapRef.current);
    }

    pathDraftGroupRef.current.clearLayers();

    if (!isDrawingPath || pathDraftWaypoints.length === 0) return;

    const latLngs: L.LatLngExpression[] = pathDraftWaypoints.map(w => [w.x, w.y]);

    if (latLngs.length >= 2) {
      let dashArray: string | undefined = undefined;
      if (pathDraftStyle === 'dashed') dashArray = '8, 8';
      if (pathDraftStyle === 'dotted') dashArray = '3, 6';

      const draftPolyline = L.polyline(latLngs, {
        color: pathDraftColor,
        weight: 4,
        opacity: 0.9,
        dashArray
      });

      pathDraftGroupRef.current.addLayer(draftPolyline);
    }

    pathDraftWaypoints.forEach((wp, idx) => {
      const icon = L.divIcon({
        className: 'draft-wp-badge',
        html: `<div style="background: ${pathDraftColor}; color: white; font-weight: bold; font-size: 10px; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.5);">${idx + 1}</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      pathDraftGroupRef.current?.addLayer(L.marker([wp.x, wp.y], { icon }));
    });
  }, [isDrawingPath, pathDraftWaypoints, pathDraftColor, pathDraftStyle]);

  // Update Markers on map when locations or active categories change
  useEffect(() => {
    if (!leafletMapRef.current || !markerGroupRef.current) return;

    markerGroupRef.current.clearLayers();

    locations.forEach((loc) => {
      if (!activeCategories.includes(loc.category)) return;

      const iconOption = ICON_OPTIONS.find((i) => i.key === loc.icon) || ICON_OPTIONS[0];

      const customDivIcon = L.divIcon({
        className: 'custom-fantasy-marker',
        html: `<div class="fantasy-badge" title="${loc.name} [${loc.category}]">
                <span class="fantasy-icon">${iconOption.symbol}</span>
                <span class="fantasy-label">${loc.name}</span>
               </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker([loc.x, loc.y], { icon: customDivIcon });

      const popupContent = `
        <div style="font-family: serif; min-width: 180px; padding: 4px;">
          <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #b45309; margin-bottom: 2px;">
            ${loc.category} • X:${loc.x}, Y:${loc.y}
          </div>
          <h4 style="font-size: 15px; font-weight: bold; color: #1e293b; margin: 0 0 6px 0;">
            ${iconOption.symbol} ${loc.name}
          </h4>
          <p style="font-size: 12px; color: #475569; margin: 0; line-height: 1.4;">
            ${loc.description || 'No detailed description recorded.'}
          </p>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => setSelectedLoc(loc));

      markerGroupRef.current?.addLayer(marker);
    });
  }, [locations, activeCategories]);

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) return;

      const img = new Image();
      img.onload = async () => {
        setImageWidth(img.width);
        setImageHeight(img.height);
        setImageUrl(result);

        // Attempt Google Drive file upload if user is authenticated with Google
        const accessToken = getAccessToken();
        if (accessToken) {
          try {
            setToastNotice({ message: 'Uploading map file to Google Drive...' });
            const driveRes = await uploadToGoogleDrive(accessToken, file.name, file.type || 'image/png', file);
            setToastNotice({ message: `Saved to Google Drive: "${driveRes.name}"!` });
          } catch (err: any) {
            console.error('Google Drive upload error:', err);
            setToastNotice({ message: `Map image loaded locally.` });
          }
        } else {
          setToastNotice({ message: `Map image loaded! Connect Google Drive to auto-sync uploads.` });
        }
        setTimeout(() => setToastNotice(null), 4000);

        // Auto-save immediately with newly uploaded map image parameters
        triggerAutoSave(locations, paths, 'Custom map image uploaded and auto-saved!', {
          imageUrl: result,
          imageWidth: img.width,
          imageHeight: img.height
        });
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  // Add Location Handler
  const handleConfirmAddLocation = () => {
    if (!pendingCoords || !newLocName.trim()) return;

    const newLoc: AtlasLocation = {
      id: `loc_${Date.now()}`,
      name: newLocName.trim(),
      category: newLocCategory,
      icon: newLocIcon,
      x: pendingCoords.x,
      y: pendingCoords.y,
      description: newLocDesc.trim(),
      addedAt: new Date().toISOString()
    };

    const updated = [newLoc, ...locations];
    setLocations(updated);
    setPendingCoords(null);
    setNewLocName('');
    setNewLocDesc('');
    setIsAddingMode(false);

    triggerAutoSave(updated, paths, `Placed marker "${newLoc.name}"!`);
  };

  // Delete Location Handler
  const handleDeleteLocation = (id: string) => {
    const target = locations.find((l) => l.id === id);
    const updated = locations.filter((l) => l.id !== id);
    setLocations(updated);
    if (selectedLoc?.id === id) setSelectedLoc(null);

    triggerAutoSave(updated, paths, target ? `Removed landmark "${target.name}"` : 'Marker removed');
  };

  // Save / Add Custom Path Handler
  const handleSaveDraftPath = () => {
    if (pathDraftWaypoints.length < 2) return;

    const nameToUse = pathDraftName.trim() || `Route ${paths.length + 1}`;

    if (editingPath) {
      // Update existing path
      const updatedPaths = paths.map((p) =>
        p.id === editingPath.id
          ? {
              ...p,
              name: nameToUse,
              color: pathDraftColor,
              style: pathDraftStyle,
              waypoints: pathDraftWaypoints,
              description: pathDraftDesc.trim(),
              category: 'Custom Route'
            }
          : p
      );
      setPaths(updatedPaths);
      setEditingPath(null);
      triggerAutoSave(locations, updatedPaths, `Updated route "${nameToUse}"!`);
    } else {
      // Create new path
      const newPath: AtlasPath = {
        id: `path_${Date.now()}`,
        name: nameToUse,
        color: pathDraftColor,
        style: pathDraftStyle,
        waypoints: pathDraftWaypoints,
        description: pathDraftDesc.trim(),
        category: 'Custom Route',
        visible: true,
        createdAt: new Date().toISOString()
      };
      const updatedPaths = [newPath, ...paths];
      setPaths(updatedPaths);
      triggerAutoSave(locations, updatedPaths, `Saved route "${newPath.name}"!`);
    }

    // Reset draft state
    setIsDrawingPath(false);
    setPathDraftWaypoints([]);
    setPathDraftName('');
    setPathDraftDesc('');
    setShowSavePathModal(false);
  };

  // Delete Path Handler
  const handleDeletePath = (pathId: string) => {
    const target = paths.find(p => p.id === pathId);
    const updatedPaths = paths.filter(p => p.id !== pathId);
    setPaths(updatedPaths);
    triggerAutoSave(locations, updatedPaths, target ? `Deleted route "${target.name}"` : 'Route deleted');
  };

  // Focus Map on Location or Path
  const handleFocusLocation = (loc: AtlasLocation) => {
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([loc.x, loc.y], 1);
    }
  };

  const handleFocusPath = (path: AtlasPath) => {
    if (!leafletMapRef.current || path.waypoints.length === 0) return;
    const latLngs: L.LatLngExpression[] = path.waypoints.map(w => [w.x, w.y]);
    const polyline = L.polyline(latLngs);
    leafletMapRef.current.fitBounds(polyline.getBounds(), { padding: [40, 40] });
  };

  // Toggle category
  const toggleCategory = (cat: string) => {
    setActiveCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // Generate Markdown Payload for Export
  const generateMarkdownPayload = () => {
    const mockState: AtlasMapState = {
      id: 'default_atlas',
      mapTitle,
      imageUrl,
      imageWidth,
      imageHeight,
      locations,
      paths,
      activeCategories,
      center: leafletMapRef.current ? [leafletMapRef.current.getCenter().lat, leafletMapRef.current.getCenter().lng] : [imageHeight / 2, imageWidth / 2],
      zoom: leafletMapRef.current ? leafletMapRef.current.getZoom() : 0,
      updatedAt: new Date().toISOString()
    };
    return buildSingleFileMarkdown([], mapTitle, mockState);
  };

  return (
    <div className="space-y-4 animate-fade-in text-slate-800">
      {/* HEADER CONTROLS BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-6 h-6 text-amber-600" />
            <input
              type="text"
              value={mapTitle}
              onChange={(e) => setMapTitle(e.target.value)}
              onBlur={() => triggerAutoSave(locations, paths)}
              className="text-lg font-extrabold text-slate-900 bg-transparent border-b border-transparent hover:border-amber-300 focus:border-amber-600 focus:outline-none transition-all px-1 py-0.5"
              placeholder="Map Title..."
            />
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span>Dimensions: {imageWidth} x {imageHeight} px</span>
            <span>•</span>
            <span>{locations.length} Landmarks</span>
            <span>•</span>
            <span>{paths.length} Saved Routes</span>
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* VISUAL DISTANCE GRID OVERLAY CHECKBOX */}
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 bg-amber-50/80 border border-amber-300/80 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-amber-100/80 transition-all select-none">
            <input
              type="checkbox"
              checked={showGridOverlay}
              onChange={(e) => setShowGridOverlay(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
            />
            <Grid className="w-4 h-4 text-amber-600" />
            <span>Show Distance Grid</span>
          </label>

          {/* Grid Spacing Selector */}
          {showGridOverlay && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Grid Step:</span>
              <select
                value={gridSpacing}
                onChange={(e) => setGridSpacing(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-amber-900 focus:outline-none cursor-pointer"
              >
                <option value={100}>100 px</option>
                <option value={200}>200 px</option>
                <option value={500}>500 px</option>
                <option value={1000}>1000 px</option>
              </select>
            </div>
          )}

          {/* Scale Math Guide Modal Trigger */}
          <button
            onClick={() => setShowScaleMathModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg transition-all cursor-pointer shadow-2xs"
            title="Learn how Scale Factor & Pythagorean distance math works"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-700" />
            <span>Scale Math Tutor</span>
          </button>

          {/* Auto-save badge */}
          {saveStatus === 'saving' ? (
            <span className="flex items-center gap-1.5 text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full text-xs font-bold shadow-2xs">
              <Loader className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span>Saving...</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-bold shadow-2xs" title={`Saved at ${lastSavedTime || 'recently'}`}>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Saved</span>
            </span>
          )}

          {/* Custom Map Image Upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-all cursor-pointer shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Upload Map Image</span>
          </button>

          {/* Roll Away Sidebar Toggle */}
          <button
            onClick={() => {
              const next = !isSidebarCollapsed;
              setIsSidebarCollapsed(next);
              setTimeout(() => leafletMapRef.current?.invalidateSize(), 300);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg transition-all cursor-pointer shadow-2xs"
            title={isSidebarCollapsed ? "Unroll Sidebar" : "Roll Away Sidebar"}
          >
            {isSidebarCollapsed ? (
              <>
                <PanelRightOpen className="w-3.5 h-3.5 text-amber-700" />
                <span>Unroll Sidebar</span>
              </>
            ) : (
              <>
                <PanelRightClose className="w-3.5 h-3.5 text-amber-700" />
                <span>Roll Away Sidebar</span>
              </>
            )}
          </button>

          {/* Markdown & JSON Export */}
          <button
            onClick={() => setShowMarkdownExport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-all cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Atlas Data</span>
          </button>
        </div>
      </div>

      {/* MAIN WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {/* MAP STAGE CONTAINER - FILLS AVAILABLE WINDOW & BOUNDS ZOOM OUT TO IMAGE SIZE */}
        <div className={`${isSidebarCollapsed ? 'lg:col-span-4' : 'lg:col-span-3'} bg-[#f4ecd8] border border-amber-900/30 rounded-2xl overflow-hidden shadow-xl relative cursor-crosshair z-0 min-h-[620px] h-[calc(100vh-210px)] w-full transition-all duration-300`}>
          {/* LEAFLET CONTAINER */}
          <div
            ref={mapContainerRef}
            className="w-full h-full"
            style={{ backgroundColor: '#f4ecd8' }}
          />

          {/* Dynamic Real-World Scale Bar (Updates live as user zooms in & out) */}
          <div className="absolute bottom-4 left-4 z-30 bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl shadow-2xl border border-amber-500/50 flex flex-col gap-1 pointer-events-none select-none">
            <div className="flex items-center justify-between text-[10px] font-mono text-amber-300 font-bold gap-4">
              <span className="tracking-wider flex items-center gap-1">
                <Ruler className="w-3 h-3 text-amber-400" />
                DYNAMIC SCALE
              </span>
              <span className="text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                Zoom {currentZoomLevel >= 0 ? `+${currentZoomLevel.toFixed(1)}` : currentZoomLevel.toFixed(1)}x
              </span>
            </div>
            <div className="flex items-center gap-2.5 mt-0.5">
              <div className="flex flex-col items-center">
                <div 
                  style={{ width: `${scaleBarWidthPx}px` }} 
                  className="h-2.5 border-b-2 border-x-2 border-amber-400 bg-amber-400/25 rounded-b-xs transition-all duration-150 shadow-inner"
                />
                <span className="text-[11px] font-mono font-bold text-amber-200 mt-1 drop-shadow-sm">
                  {currentScaleBarVal.toLocaleString()} {realWorldUnit}
                </span>
              </div>
              <span className="text-[9px] text-slate-400 font-mono self-end pb-1">
                ({(currentScaleBarVal / (realWorldWidth / imageWidth)).toFixed(0)} px)
              </span>
            </div>
          </div>

          {/* Floating Unroll Sidebar Button when collapsed */}
          {isSidebarCollapsed && (
            <button
              onClick={() => {
                setIsSidebarCollapsed(false);
                setTimeout(() => leafletMapRef.current?.invalidateSize(), 300);
              }}
              className="absolute top-4 right-4 z-30 bg-slate-900/90 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl shadow-2xl border border-amber-500/60 flex items-center gap-2 text-xs font-bold transition-all cursor-pointer animate-fade-in"
            >
              <PanelRightOpen className="w-4 h-4 text-amber-400" />
              <span>Unroll Sidebar</span>
            </button>
          )}

          {/* MAP OVERLAY FLOATING CONTROLS */}
          <div className="absolute top-4 left-4 z-30 flex flex-col gap-2">
            {/* Toggle Adding Mode Button */}
            <button
              onClick={() => {
                setIsAddingMode(!isAddingMode);
                if (isDrawingPath) setIsDrawingPath(false);
                if (isMeasuringMode) setIsMeasuringMode(false);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer border ${
                isAddingMode
                  ? 'bg-amber-600 border-amber-700 text-white ring-2 ring-amber-400/50'
                  : 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-800 hover:bg-white'
              }`}
            >
              <Plus className="w-4 h-4 text-amber-500" />
              <span>{isAddingMode ? 'Click Map to Place Landmark' : 'Add Landmark'}</span>
            </button>

            {/* Toggle Route Drawing Mode Button */}
            <button
              onClick={() => {
                const nextDrawing = !isDrawingPath;
                setIsDrawingPath(nextDrawing);
                if (nextDrawing) {
                  setIsAddingMode(false);
                  setIsMeasuringMode(false);
                  setPathDraftWaypoints([]);
                  setSidebarTab('paths');
                }
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer border ${
                isDrawingPath
                  ? 'bg-amber-700 border-amber-800 text-white ring-2 ring-amber-400/50'
                  : 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-800 hover:bg-white'
              }`}
            >
              <Route className="w-4 h-4 text-amber-600" />
              <span>{isDrawingPath ? 'Drawing Route Active' : 'Draw New Route / Path'}</span>
            </button>
          </div>

          {/* ACTIVE ROUTE DRAWING FLOATING CONTROL BANNER */}
          {isDrawingPath && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-500/50 flex items-center gap-4 animate-bounce-in max-w-lg w-full">
              <div className="flex-1 space-y-0.5">
                <div className="text-amber-400 font-bold text-xs flex items-center gap-1.5">
                  <Waypoints className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Drawing Custom Route / Path</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Click map to add waypoints • <strong>{pathDraftWaypoints.length} nodes</strong> ({calculatePathDistance(pathDraftWaypoints).toFixed(1)} {realWorldUnit})
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setPathDraftWaypoints(prev => prev.slice(0, prev.length - 1))}
                  disabled={pathDraftWaypoints.length === 0}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  title="Remove last waypoint"
                >
                  Undo Node
                </button>
                <button
                  onClick={() => {
                    if (pathDraftWaypoints.length < 2) {
                      setToastNotice({ message: 'Click at least 2 points on the map to draw a route!' });
                      setTimeout(() => setToastNotice(null), 3000);
                      return;
                    }
                    setShowSavePathModal(true);
                  }}
                  disabled={pathDraftWaypoints.length < 2}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Route</span>
                </button>
                <button
                  onClick={() => {
                    setIsDrawingPath(false);
                    setPathDraftWaypoints([]);
                  }}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs transition-all cursor-pointer"
                  title="Cancel route drawing"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PENDING LANDMARK CREATION FORM OVERLAY */}
          {pendingCoords && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md border border-amber-300 p-5 rounded-2xl shadow-2xl z-40 w-80 space-y-3 animate-fade-in">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-amber-600" />
                  <span>New Landmark at ({pendingCoords.x}, {pendingCoords.y})</span>
                </h4>
                <button
                  onClick={() => setPendingCoords(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Landmark Title</label>
                <input
                  type="text"
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  placeholder="e.g. Whispering Ruins"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={newLocCategory}
                    onChange={(e) => setNewLocCategory(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Icon Style</label>
                  <select
                    value={newLocIcon}
                    onChange={(e) => setNewLocIcon(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {ICON_OPTIONS.map((i) => (
                      <option key={i.key} value={i.key}>{i.symbol} {i.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Lore / Description</label>
                <textarea
                  rows={3}
                  value={newLocDesc}
                  onChange={(e) => setNewLocDesc(e.target.value)}
                  placeholder="Brief historical background or campaign notes..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleConfirmAddLocation}
                  disabled={!newLocName.trim()}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs py-2 rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Place Marker
                </button>
                <button
                  onClick={() => setPendingCoords(null)}
                  className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR PANEL: LOCATIONS, ROUTES, & DISTANCE SCALE (Can roll away) */}
        {!isSidebarCollapsed && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-210px)] min-h-[620px] animate-fade-in">
          {/* SIDEBAR TAB SWITCHER */}
          <div className="p-2 border-b border-slate-200 bg-slate-50 grid grid-cols-2 gap-1">
            <button
              onClick={() => setSidebarTab('locations')}
              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                sidebarTab === 'locations'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Landmarks ({locations.length})</span>
            </button>
            <button
              onClick={() => setSidebarTab('paths')}
              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                sidebarTab === 'paths'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Route className="w-3.5 h-3.5" />
              <span>Routes ({paths.length})</span>
            </button>
          </div>

          {/* DISTANCE SCALE & RULER PANEL */}
          <div className="p-3 border-b border-slate-200 bg-amber-50/40 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-amber-600" />
                <span>Map Scale & Ruler</span>
              </h3>
              <button
                onClick={() => setShowScaleMathModal(true)}
                className="text-[10px] text-amber-700 underline hover:text-amber-900 font-bold cursor-pointer"
              >
                Math Guide
              </button>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-amber-200/80 shadow-2xs space-y-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Real-World Map Width:
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    value={realWorldWidth}
                    onChange={(e) => setRealWorldWidth(Math.max(1, Number(e.target.value)))}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <select
                    value={realWorldUnit}
                    onChange={(e) => setRealWorldUnit(e.target.value as 'km' | 'miles')}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="km">km</option>
                    <option value="miles">miles</option>
                  </select>
                </div>
              </div>

              <div className="bg-amber-50 p-2 rounded-lg border border-amber-200/60 font-mono text-[11px] text-amber-900 flex justify-between font-bold">
                <span>Scale Factor:</span>
                <span>{(realWorldWidth / imageWidth).toFixed(4)} {realWorldUnit}/px</span>
              </div>

              {/* Point-to-Point Distance Measure */}
              <button
                onClick={() => {
                  const nextMode = !isMeasuringMode;
                  setIsMeasuringMode(nextMode);
                  if (nextMode) {
                    setIsAddingMode(false);
                    setIsDrawingPath(false);
                  } else {
                    setMeasurePointA(null);
                    setMeasurePointB(null);
                  }
                }}
                className={`w-full py-1.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  isMeasuringMode
                    ? 'bg-red-600 border-red-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                }`}
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>{isMeasuringMode ? 'Exit Ruler Mode' : 'Measure Point A → B'}</span>
              </button>

              {measurePointA && measurePointB && (
                <div className="p-2 bg-slate-900 text-white rounded-lg text-[11px] font-mono space-y-1 animate-fade-in">
                  <div className="text-amber-400 font-bold flex justify-between border-b border-slate-800 pb-1">
                    <span>Straight Distance:</span>
                    <span>
                      {(
                        Math.sqrt(
                          Math.pow(measurePointB.x - measurePointA.x, 2) +
                          Math.pow(measurePointB.y - measurePointA.y, 2)
                        ) * (realWorldWidth / imageWidth)
                      ).toLocaleString(undefined, { maximumFractionDigits: 1 })}{' '}
                      {realWorldUnit}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TAB CONTENT 1: LOCATIONS LIST */}
          {sidebarTab === 'locations' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3 select-scrollbar">
              {/* Category Filter Chips */}
              <div className="flex flex-wrap gap-1">
                {CATEGORIES.map((cat) => {
                  const active = activeCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer border ${
                        active
                          ? 'bg-amber-100 border-amber-300 text-amber-900'
                          : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Locations Cards */}
              <div className="space-y-2">
                {locations.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    No landmarks recorded yet. Click "Add Landmark" to place one!
                  </p>
                ) : (
                  locations.map((loc) => {
                    const iconOpt = ICON_OPTIONS.find((i) => i.key === loc.icon) || ICON_OPTIONS[0];
                    return (
                      <div
                        key={loc.id}
                        className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl hover:border-amber-300 hover:bg-amber-50/40 transition-all group relative space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{iconOpt.symbol}</span>
                            <span>{loc.name}</span>
                          </span>
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                            <button
                              onClick={() => handleFocusLocation(loc)}
                              className="p-1 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-100 cursor-pointer"
                              title="Center on map"
                            >
                              <Compass className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteLocation(loc.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                              title="Delete landmark"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                          <span className="bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded uppercase font-sans font-bold">
                            {loc.category}
                          </span>
                          <span>X: {loc.x}, Y: {loc.y}</span>
                        </div>

                        {loc.description && (
                          <p className="text-[11px] text-slate-600 line-clamp-2">
                            {loc.description}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB CONTENT 2: SAVED ROUTES & PATHS */}
          {sidebarTab === 'paths' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3 select-scrollbar">
              <button
                onClick={() => {
                  setIsDrawingPath(true);
                  setIsAddingMode(false);
                  setIsMeasuringMode(false);
                  setPathDraftWaypoints([]);
                }}
                className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <Route className="w-4 h-4" />
                <span>Draw New Custom Route</span>
              </button>

              <div className="space-y-2">
                {paths.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    No custom routes saved yet. Click "Draw New Custom Route" to connect waypoints on your map!
                  </p>
                ) : (
                  paths.map((path) => {
                    const dist = calculatePathDistance(path.waypoints).toFixed(1);
                    return (
                      <div
                        key={path.id}
                        className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl hover:border-amber-300 transition-all space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: path.color }}
                            />
                            <span className="text-xs font-bold text-slate-900">
                              {path.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Toggle visibility */}
                            <button
                              onClick={() => {
                                const updated = paths.map(p => p.id === path.id ? { ...p, visible: !p.visible } : p);
                                setPaths(updated);
                                triggerAutoSave(locations, updated);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                              title={path.visible ? "Hide route" : "Show route"}
                            >
                              {path.visible ? <Eye className="w-3.5 h-3.5 text-amber-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                            </button>

                            {/* Focus map on route */}
                            <button
                              onClick={() => handleFocusPath(path)}
                              className="p-1 text-slate-400 hover:text-amber-600 cursor-pointer"
                              title="Center route on map"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Path */}
                            <button
                              onClick={() => {
                                setEditingPath(path);
                                setPathDraftName(path.name);
                                setPathDraftColor(path.color);
                                setPathDraftStyle(path.style);
                                setPathDraftWaypoints(path.waypoints);
                                setPathDraftDesc(path.description || '');
                                setShowSavePathModal(true);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer"
                              title="Edit route details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Path */}
                            <button
                              onClick={() => handleDeletePath(path.id)}
                              className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                              title="Delete route"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                          <span className="bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                            {dist} {realWorldUnit}
                          </span>
                          <span>{path.waypoints.length} Waypoints</span>
                          <span className="capitalize">{path.style} line</span>
                        </div>

                        {path.description && (
                          <p className="text-[11px] text-slate-600 line-clamp-2">
                            {path.description}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* SAVE / EDIT ROUTE MODAL */}
      {showSavePathModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-amber-200 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Route className="w-4 h-4 text-amber-600" />
                <span>{editingPath ? 'Edit Saved Route' : 'Save Custom Route'}</span>
              </h3>
              <button
                onClick={() => {
                  setShowSavePathModal(false);
                  setEditingPath(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Route Name</label>
                <input
                  type="text"
                  value={pathDraftName}
                  onChange={(e) => setPathDraftName(e.target.value)}
                  placeholder="e.g. The King's Trade Highway"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-900"
                  autoFocus
                />
              </div>

              {/* Color selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Line Color</label>
                <div className="flex items-center gap-2">
                  {PATH_COLORS.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setPathDraftColor(c.key)}
                      className={`w-7 h-7 rounded-full transition-all cursor-pointer border-2 ${
                        pathDraftColor === c.key ? 'scale-110 border-slate-900 shadow-md' : 'border-white hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.key }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Style Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Line Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['solid', 'dashed', 'dotted'] as const).map((styleOpt) => (
                    <button
                      key={styleOpt}
                      onClick={() => setPathDraftStyle(styleOpt)}
                      className={`py-1.5 px-2 rounded-lg font-bold text-xs capitalize border cursor-pointer transition-all ${
                        pathDraftStyle === styleOpt
                          ? 'bg-amber-600 text-white border-amber-700'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {styleOpt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Route Summary Stats */}
              <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200/70 font-mono text-[11px] text-amber-900 flex justify-between">
                <span>Waypoints: {pathDraftWaypoints.length}</span>
                <span>Distance: {calculatePathDistance(pathDraftWaypoints).toFixed(1)} {realWorldUnit}</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Route Lore / Notes</label>
                <textarea
                  rows={2}
                  value={pathDraftDesc}
                  onChange={(e) => setPathDraftDesc(e.target.value)}
                  placeholder="Historical trade importance or travel dangers..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={handleSaveDraftPath}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-2 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                {editingPath ? 'Update Route' : 'Save Route to Atlas'}
              </button>
              <button
                onClick={() => {
                  setShowSavePathModal(false);
                  setEditingPath(null);
                }}
                className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MARKDOWN EXPORT MODAL */}
      {showMarkdownExport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <FileCode className="w-4 h-4 text-amber-400" />
                <span>Fantasy Atlas Markdown & JSON Export</span>
              </h3>
              <button
                onClick={() => setShowMarkdownExport(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto bg-slate-950 font-mono text-xs text-emerald-300 whitespace-pre-wrap select-scrollbar">
              {generateMarkdownPayload()}
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end gap-2 bg-slate-900">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateMarkdownPayload());
                  setCopiedMd(true);
                  setTimeout(() => setCopiedMd(false), 3000);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-all border border-slate-700"
              >
                {copiedMd ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedMd ? 'Copied to Clipboard!' : 'Copy Raw Markdown'}</span>
              </button>
              <button
                onClick={() => setShowMarkdownExport(false)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CARTOGRAPHER'S SCALE MATH TUTOR MODAL */}
      {showScaleMathModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-amber-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 bg-amber-900 text-amber-50 flex justify-between items-center border-b border-amber-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-300" />
                <h3 className="text-base font-bold tracking-wide">Cartographer's Codex: Scale Factor & Distance Math Guide</h3>
              </div>
              <button
                onClick={() => setShowScaleMathModal(false)}
                className="text-amber-300 hover:text-white p-1 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-xs leading-relaxed select-scrollbar bg-slate-50/50">
              {/* Part 1: Mathematical Formula */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm border-b border-slate-100 pb-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs">1</span>
                  <h4>The Scale Factor Formula</h4>
                </div>
                <p className="text-slate-600">
                  To convert map image pixels into real-world geographic distances (in kilometers or miles), calculate the <strong className="text-amber-900">Scale Factor ($S$)</strong>:
                </p>
                <div className="bg-amber-50/90 border border-amber-200 p-3 rounded-lg font-mono text-center text-amber-950 font-bold text-xs">
                  Scale Factor = Real_World_Width / Image_Width_Pixels
                </div>
                <p className="text-slate-500 text-[11px]">
                  <strong>Unit:</strong> Kilometers per Pixel (<code className="text-amber-800">km/px</code>) or Miles per Pixel (<code className="text-amber-800">mi/px</code>).
                </p>
              </div>

              {/* Part 2: Step-by-Step Example */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm border-b border-slate-100 pb-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs">2</span>
                  <h4>Step-by-Step Scenario Calculation</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Image Width:</span>
                    <strong className="text-slate-900 text-xs">25,000 pixels</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block">Real World Width:</span>
                    <strong className="text-slate-900 text-xs">25,000 km</strong>
                  </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-emerald-900 text-xs font-mono">
                  <strong>Calculation:</strong><br />
                  Scale Factor = 25,000 km / 25,000 pixels = <strong>1.0 km per pixel</strong><br />
                  <span className="text-[11px] text-emerald-800 font-sans">
                    ✨ Result: Each 1 pixel on your custom map image equals exactly 1.0 km in real-world distance!
                  </span>
                </div>
              </div>

              {/* Part 3: Distance Between Two Points */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm border-b border-slate-100 pb-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs">3</span>
                  <h4>Point-to-Point Distance Calculation (Pythagorean Theorem)</h4>
                </div>
                <p className="text-slate-600">
                  To find the straight-line distance between Point A ($x_1, y_1$) and Point B ($x_2, y_2$):
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-700 font-mono text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <li>Find Delta X: <code className="text-blue-700 font-bold">Δx = x₂ - x₁</code></li>
                  <li>Find Delta Y: <code className="text-blue-700 font-bold">Δy = y₂ - y₁</code></li>
                  <li>Pixel Span (Pythagorean): <code className="text-emerald-700 font-bold">d_pixels = √(Δx² + Δy²)</code></li>
                  <li>Real Distance: <code className="text-amber-800 font-bold">Real_Distance = d_pixels × Scale_Factor</code></li>
                </ol>

                <div className="p-3 bg-amber-50/80 rounded-lg border border-amber-200 text-[11px] text-amber-900">
                  <strong>Example:</strong> Point A (100, 200) to Point B (400, 600)<br />
                  • Δx = 400 - 100 = 300 px &nbsp;|&nbsp; Δy = 600 - 200 = 400 px<br />
                  • d_pixels = √(300² + 400²) = √(90,000 + 160,000) = √250,000 = <strong>500 pixels</strong><br />
                  • Real Distance = 500 px × 1.0 km/px = <strong>500 km</strong>
                </div>
              </div>

              {/* Part 4: Handling Aspect Ratio */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm border-b border-slate-100 pb-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs">4</span>
                  <h4>Handling Non-Square Aspect Ratios</h4>
                </div>
                <p className="text-slate-600">
                  If the map image height in pixels doesn't match its width proportionally to real-world height:
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-slate-700 text-[11px]">
                  <li>
                    <strong>Isotropic Scale (Standard Cartography):</strong> Keep 1 pixel = 1 pixel square ($S_x = S_y$). Calculate Real-World Height as: <code className="text-amber-800 font-mono">Real_Height = Image_Height_Pixels × Scale_Factor</code>.
                  </li>
                  <li>
                    <strong>Anisotropic Scale (Stretching):</strong> If horizontal and vertical real-world scales differ ($S_x \neq S_y$), use anisotropic distance:
                    <div className="font-mono bg-slate-50 p-2 rounded mt-1 text-[10px] text-slate-800 border border-slate-200">
                      Real_Distance = √((Δx × S_x)² + (Δy × S_y)²)
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowScaleMathModal(false)}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                Close Cartography Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOAST NOTICE */}
      {toastNotice && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 text-xs border border-slate-700 animate-bounce-in">
          <span className="font-medium text-slate-200">{toastNotice.message}</span>
          {toastNotice.actionLabel && toastNotice.onAction && (
            <button
              onClick={toastNotice.onAction}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{toastNotice.actionLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
