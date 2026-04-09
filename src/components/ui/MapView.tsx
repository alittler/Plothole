import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, ChevronRight, Edit2, Trash2, Lock, Unlock, X as CloseIcon, Maximize2, Ruler, Globe, Activity } from 'lucide-react';
import { Location, TimelineEvent, Character, MapPath } from '../../types';
import { generateId } from '../../services/storageService';

interface MapViewProps {
  locations: Location[];
  paths?: MapPath[];
  onAddPath?: (path: MapPath) => void;
  onUpdatePath?: (path: MapPath) => void;
  onDeletePath?: (id: string) => void;
  onLocationClick?: (id: string) => void;
  onMapClick?: (x: number, y: number) => void;
  onLocationPlace?: (id: string, x: number, y: number) => void;
  onLocationMove?: (id: string, x: number, y: number) => void;
  onLocationUnplace?: (id: string) => void;
  onLocationUndo?: (id: string) => void;
  onLocationReset?: (id: string) => void;
  onLocationLock?: (id: string, isLocked: boolean) => void;
  onDimensionsDetected?: (width: number, height: number) => void;
  onLinkClick?: (type: string, id: string) => void;
  rootMapImage?: string;
  mapScale?: number;
  mapUnit?: string;
  defaultView?: { x: number, y: number, zoom: number };
  zoomInRef?: React.MutableRefObject<(() => void) | null>;
  zoomOutRef?: React.MutableRefObject<(() => void) | null>;
  centerMapRef?: React.MutableRefObject<((coords?: { x: number, y: number }) => void) | null>;
  fitAllLocationsRef?: React.MutableRefObject<(() => void) | null>;
  getViewStateRef?: React.MutableRefObject<(() => { x: number, y: number, zoom: number } | null) | null>;
  onViewChange?: (view: { x: number, y: number, zoom: number }) => void;
  onScaleCalibrated?: (newScale: number) => void;
  isRealWorld?: boolean;
}

export const MapView: React.FC<MapViewProps> = ({ 
  locations, paths = [], onAddPath, onUpdatePath, onDeletePath, onLocationClick, onMapClick, onLocationPlace, onLocationMove, onLocationUnplace, onLocationUndo, onLocationReset, onLocationLock, onDimensionsDetected, onLinkClick, rootMapImage, mapScale, mapUnit, defaultView, zoomInRef, zoomOutRef, centerMapRef, fitAllLocationsRef, getViewStateRef, onViewChange, onScaleCalibrated,
  isRealWorld = false
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapBoundsRef = useRef<L.LatLngBounds | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const pathLayersRef = useRef<{ [key: string]: L.LayerGroup }>({});
  const measureMarkersRef = useRef<L.Marker[]>([]);
  const [imgWidth, setImgWidth] = useState<number>(0);
  const [isReady, setIsReady] = useState(false);
  const [shortcuts, setShortcuts] = useState<{ name: string, bounds: L.LatLngBounds, count: number, type: string }[]>([]);

  // Ledger Draggable State
  const [ledgerPos, setLedgerPos] = useState({ x: 0, y: 0 });
  const [isDraggingLedger, setIsDraggingLedger] = useState(false);
  const ledgerRef = useRef<HTMLDivElement>(null);

  // Snapping distance (pixels)
  const SNAP_PIXELS = 25;

  const findNearestLocation = (latlng: L.LatLng) => {
    if (!mapRef.current) return null;
    const point = mapRef.current.latLngToLayerPoint(latlng);
    let nearest = null;
    let minDist = Infinity;
    locations.forEach(loc => {
      if (loc.x === undefined || loc.y === undefined) return;
      const locLatLng = L.latLng(loc.y, loc.x);
      const locPoint = mapRef.current!.latLngToLayerPoint(locLatLng);
      const dist = point.distanceTo(locPoint);
      if (dist < SNAP_PIXELS && dist < minDist) {
        minDist = dist;
        nearest = { ...loc, latlng: locLatLng };
      }
    });
    return nearest;
  };

  const locationsRef = useRef(locations);
  useEffect(() => { locationsRef.current = locations; }, [locations]);

  const updateShortcuts = React.useCallback(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;
    try {
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      const isZoomedOut = isRealWorld ? zoom <= 6 : zoom <= 0;
      const allPlaced = locationsRef.current.filter(l => l.x !== undefined && l.y !== undefined);
      if (allPlaced.length === 0) { setShortcuts([]); return; }
      const clusters: Record<string, { locs: Location[], name: string }> = {};
      allPlaced.forEach(loc => {
        let region = 'Remote';
        if (loc.address) { const parts = loc.address.split(',').map(p => p.trim()); region = parts[parts.length - 1]; }
        else if (isRealWorld) { region = `Area ${Math.round(loc.x! / 10)},${Math.round(loc.y! / 10)}`; }
        else { const grid = imgWidth * 0.3 || 1000; region = `Sector ${Math.round(loc.x! / grid)},${Math.round(loc.y! / grid)}`; }
        if (!clusters[region]) clusters[region] = { locs: [], name: region };
        clusters[region].locs.push(loc);
      });
      const newShortcuts = Object.values(clusters).map(c => {
        const clusterBounds = L.latLngBounds(c.locs.map(l => L.latLng(l.y!, l.x!)));
        const isOffScreen = !bounds.contains(clusterBounds.getCenter());
        const clusterWidth = Math.abs(clusterBounds.getEast() - clusterBounds.getWest());
        const viewWidth = Math.abs(bounds.getEast() - bounds.getWest());
        const isSmallGroup = clusterWidth < (viewWidth * 0.3);
        const displayName = (c.name === 'Remote' || c.name.startsWith('Area') || c.name.startsWith('Sector')) ? (c.locs.length === 1 ? c.locs[0].name : `${c.locs[0].name} & ${c.locs.length - 1}+`) : c.name;
        return { name: displayName, bounds: clusterBounds, count: c.locs.length, type: c.locs[0].type, isOffScreen, shouldShow: isOffScreen || (isZoomedOut && isSmallGroup) };
      }).filter(s => (s as any).shouldShow);
      setShortcuts(newShortcuts.sort((a, b) => b.count - a.count).slice(0, 4));
    } catch (e) { console.warn("Shortcut update failed", e); }
  }, [isReady, isRealWorld, imgWidth]);

  useEffect(() => { if (isReady) updateShortcuts(); }, [isReady, locations, updateShortcuts]);

  const MAP_ICONS: Record<string, string> = {
    castle: '<path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6"/><path d="M21 11v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V11"/><path d="M15 11V8a3 3 0 0 0-6 0v3"/><path d="M9 11h6"/><path d="M7 11V8"/><path d="M17 11V8"/><path d="M12 3v2"/>',
    city: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
    town: '<path d="M3 10v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10L12 3Z"/><path d="M9 22v-4h6v4"/>',
    seaport: '<path d="M12 22V2"/><path d="M5 12h14"/><path d="M19 12a7 7 0 0 1-7 7 7 7 0 0 1-7-7"/>',
    ruins: '<path d="M3 21h18"/><path d="M3 7v14"/><path d="M21 7v14"/><path d="M6 3h12"/><path d="M6 3v4"/><path d="M18 3v4"/><path d="M10 7v4"/><path d="M14 7v4"/>',
    mountain: '<path d="m8 3 4 8 5-5 5 15H2L8 3Z"/>',
    forest: '<path d="M12 22v-5"/><path d="m8 13 4-5 4 5H8Z"/><path d="m5 18 7-7 7 7H5Z"/>',
    cave: '<path d="M22 21v-4a2 2 0 0 0-2-2h-3.17a2 2 0 0 1-1.41-.59l-2.83-2.82a2 2 0 0 0-1.41-.59H7a2 2 0 0 0-2 2v6"/><path d="M2 21h20"/><path d="M12 3v2"/>',
    landmark: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'
  };

  const getMarkerStyle = (loc: Location) => {
    const type = loc.type.toLowerCase();
    const iconName = (loc.icon || type).toLowerCase();
    let iconKey = 'landmark';
    let color = 'bg-emerald-500';
    if (iconName.includes('castle') || iconName.includes('fort')) { iconKey = 'castle'; color = 'bg-slate-700'; }
    else if (iconName.includes('city')) { iconKey = 'city'; color = 'bg-indigo-600'; }
    else if (iconName.includes('town') || iconName.includes('village')) { iconKey = 'town'; color = 'bg-amber-600'; }
    else if (iconName.includes('port') || iconName.includes('dock') || iconName.includes('seaport')) { iconKey = 'seaport'; color = 'bg-blue-500'; }
    else if (iconName.includes('ruin')) { iconKey = 'ruins'; color = 'bg-stone-500'; }
    else if (iconName.includes('forest') || iconName.includes('wood')) { iconKey = 'forest'; color = 'bg-green-700'; }
    else if (iconName.includes('mountain')) { iconKey = 'mountain'; color = 'bg-slate-400'; }
    else if (iconName.includes('cave')) { iconKey = 'cave'; color = 'bg-orange-900'; }
    return { color, svg: MAP_ICONS[iconKey] || MAP_ICONS['landmark'] };
  };

  const onDimensionsDetectedRef = useRef(onDimensionsDetected);
  const onLocationPlaceRef = useRef(onLocationPlace);
  const onLocationMoveRef = useRef(onLocationMove);
  const onLocationUnplaceRef = useRef(onLocationUnplace);
  const onLocationLockRef = useRef(onLocationLock);
  const onLocationClickRef = useRef(onLocationClick);
  const onLinkClickRef = useRef(onLinkClick);
  const onViewChangeRef = useRef(onViewChange);
  const onUpdatePathRef = useRef(onUpdatePath);
  const onDeletePathRef = useRef(onDeletePath);
  const onScaleCalibratedRef = useRef(onScaleCalibrated);

  useEffect(() => { onDimensionsDetectedRef.current = onDimensionsDetected; }, [onDimensionsDetected]);
  useEffect(() => { onLocationPlaceRef.current = onLocationPlace; }, [onLocationPlace]);
  useEffect(() => { onLocationMoveRef.current = onLocationMove; }, [onLocationMove]);
  useEffect(() => { onLocationUnplaceRef.current = onLocationUnplace; }, [onLocationUnplace]);
  useEffect(() => { onLocationLockRef.current = onLocationLock; }, [onLocationLock]);
  useEffect(() => { onLocationClickRef.current = onLocationClick; }, [onLocationClick]);
  useEffect(() => { onLinkClickRef.current = onLinkClick; }, [onLinkClick]);
  useEffect(() => { onViewChangeRef.current = onViewChange; }, [onViewChange]);
  useEffect(() => { onUpdatePathRef.current = onUpdatePath; }, [onUpdatePath]);
  useEffect(() => { onDeletePathRef.current = onDeletePath; }, [onDeletePath]);
  useEffect(() => { onScaleCalibratedRef.current = onScaleCalibrated; }, [onScaleCalibrated]);

  // Measurement Tool State
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [tempMeasureB, setTempMeasureB] = useState<L.LatLng | null>(null);
  const [points, setPoints] = useState<{ x: number; y: number; locationId?: string }[]>([]);
  const measureLineRef = useRef<L.Polyline | null>(null);

  // Path Naming Dialog State
  const [pendingPath, setPendingPath] = useState<MapPath | null>(null);
  const [pathName, setPathName] = useState('');
  const [showPathNameDialog, setShowPathNameDialog] = useState(false);


  const getDistance = (p1: L.LatLng, p2: L.LatLng) => {
    if (isRealWorld) {
      const R = 6371;
      const dLat = (p2.lat - p1.lat) * Math.PI / 180;
      const dLon = (p2.lng - p1.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c * 1000;
    } else {
      const dist = p1.distanceTo(p2);
      if (imgWidth && mapScale) return (dist / imgWidth) * mapScale * 1000;
      return dist;
    }
  };

  const getGreatCircleArc = (p1: L.LatLng, p2: L.LatLng, numPoints = 50) => {
    const coords: L.LatLngExpression[] = [];
    const lat1 = p1.lat * Math.PI / 180; const lon1 = p1.lng * Math.PI / 180;
    const lat2 = p2.lat * Math.PI / 180; const lon2 = p2.lng * Math.PI / 180;
    const d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((lat1 - lat2) / 2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon1 - lon2) / 2), 2)));
    if (isNaN(d) || d === 0) return [[p1.lat, p1.lng], [p2.lat, p2.lng]];
    for (let i = 0; i <= numPoints; i++) {
      const f = i / numPoints;
      const A = Math.sin((1 - f) * d) / Math.sin(d); const B = Math.sin(f * d) / Math.sin(d);
      const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
      const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
      const z = A * Math.sin(lat1) + B * Math.sin(lat2);
      const lat = Math.atan2(z, Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2))) * 180 / Math.PI;
      const lon = Math.atan2(y, x) * 180 / Math.PI;
      if (!isNaN(lat) && !isNaN(lon)) coords.push([lat, lon]);
    }
    return coords;
  };

  const handleToggleMeasuring = () => {
    if (isMeasuring && points.length >= 2) {
      let totalMeters = 0;
      for (let i = 0; i < points.length - 1; i++) totalMeters += getDistance(L.latLng(points[i].y, points[i].x), L.latLng(points[i+1].y, points[i+1].x));
      const label = mapUnit || 'km';
      const distance = label === 'mi' ? (totalMeters / 1000) * 0.621371 : totalMeters / 1000;
      const newPath: MapPath = { id: generateId(), name: `Path Log ${paths.length + 1}`, points: points, isRealWorld: !!isRealWorld, distance: Number(distance.toFixed(2)), unit: label };
      // Show naming dialog instead of directly adding the path
      setPendingPath(newPath);
      setPathName(newPath.name);
      setShowPathNameDialog(true);
    }
    setIsMeasuring(!isMeasuring);
    setPoints([]);
    setTempMeasureB(null);
  };

  const handleConfirmPathName = () => {
    if (pendingPath && pathName.trim()) {
      const namedPath = { ...pendingPath, name: pathName.trim() };
      onAddPath?.(namedPath);
      setShowPathNameDialog(false);
      setPendingPath(null);
      setPathName('');
    }
  };

  const finalizeMeasurement = () => {
    if (points.length < 2) {
      setIsMeasuring(false);
      setPoints([]);
      setTempMeasureB(null);
      return;
    }
    handleToggleMeasuring();
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      crs: isRealWorld ? L.CRS.EPSG3857 : L.CRS.Simple,
      minZoom: isRealWorld ? 2 : -2,
      maxZoom: 19,
      zoomControl: false,
      attributionControl: isRealWorld,
      fadeAnimation: false,
      maxBoundsViscosity: 1.0,
      worldCopyJump: false
    });

    if (isRealWorld) {
      tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', noWrap: true }).addTo(map);
      const worldBounds = L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180));
      map.setMaxBounds(worldBounds);
      const minZoom = map.getBoundsZoom(worldBounds, true);
      map.setMinZoom(minZoom);
      map.setView([20, 0], Math.max(minZoom, 2));
    } else {
      map.setView([0, 0], 0);
    }

    mapRef.current = map;
    setIsReady(true);

    return () => {
      setIsReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, [isRealWorld]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;

    const clickHandler = (e: L.LeafletMouseEvent) => {
      if (isMeasuring) {
        // If clicking close to an existing point (especially the last one), finalize
        const point = map.latLngToLayerPoint(e.latlng);
        let clickedExisting = false;
        points.forEach(p => {
          const pt = map.latLngToLayerPoint(L.latLng(p.y, p.x));
          if (point.distanceTo(pt) < 15) clickedExisting = true;
        });

        if (clickedExisting && points.length >= 2) {
          finalizeMeasurement();
          return;
        }

        const nearest = findNearestLocation(e.latlng);
        const snappedLatLng = nearest ? nearest.latlng : e.latlng;
        const locationId = nearest ? nearest.id : undefined;
        setPoints(prev => [...prev, { x: snappedLatLng.lng, y: snappedLatLng.lat, locationId }]);
        setTempMeasureB(null);
      } else {
        onMapClick?.(e.latlng.lng, e.latlng.lat);
      }
    };

    const mouseMoveHandler = (e: L.LeafletMouseEvent) => { if (isMeasuring && points.length > 0) setTempMeasureB(e.latlng); };

    const viewHandler = () => {
      updateShortcuts();
      const center = map.getCenter();
      onViewChangeRef.current?.({ x: center.lng, y: center.lat, zoom: map.getZoom() });
    };

    map.on('click', clickHandler);
    map.on('mousemove', mouseMoveHandler);
    map.on('moveend zoomend', viewHandler);

    return () => {
      map.off('click', clickHandler);
      map.off('mousemove', mouseMoveHandler);
      map.off('moveend zoomend', viewHandler);
    };
  }, [isReady, isMeasuring, points]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;

    if (zoomInRef) zoomInRef.current = () => map.zoomIn();
    if (zoomOutRef) zoomOutRef.current = () => map.zoomOut();
    if (getViewStateRef) getViewStateRef.current = () => { const center = map.getCenter(); return { x: center.lng, y: center.lat, zoom: map.getZoom() }; };
    if (centerMapRef) centerMapRef.current = (coords?: { x: number, y: number }) => {
      if (coords) map.setView([coords.y, coords.x], map.getZoom(), { animate: true, duration: 1.5 });
      else if (defaultView) map.setView([defaultView.y, defaultView.x], defaultView.zoom, { animate: true, duration: 1.5 });
      else if (map.options.maxBounds) map.fitBounds(map.options.maxBounds as L.LatLngBounds, { animate: true, padding: [20, 20], duration: 1.5 });
    };

    if (fitAllLocationsRef) fitAllLocationsRef.current = () => {
      const placed = locationsRef.current.filter(l => l.x !== undefined && l.y !== undefined);
      if (placed.length === 0) return;
      const bounds = L.latLngBounds(placed.map(l => L.latLng(l.y!, l.x!)));
      map.fitBounds(bounds, { animate: true, padding: [50, 50], duration: 1.5, maxZoom: 15 });
    };
  }, [isReady, defaultView]);

  // Render Persistent Paths
  useEffect(() => {
    if (!mapRef.current || !isReady) return;
    const map = mapRef.current;
    Object.values(pathLayersRef.current).forEach(layer => layer.remove());
    pathLayersRef.current = {};
    paths.forEach(path => {
      const layerGroup = L.layerGroup().addTo(map);
      pathLayersRef.current[path.id] = layerGroup;
      const resolvedPoints = path.points.map(p => {
        if (p.locationId) {
          const loc = locations.find(l => l.id === p.locationId);
          if (loc && loc.x !== undefined && loc.y !== undefined) return L.latLng(loc.y, loc.x);
        }
        return L.latLng(p.y, p.x);
      });
      if (resolvedPoints.length < 2) return;

      const pathColor = path.color || '#6366f1';
      for (let i = 0; i < resolvedPoints.length - 1; i++) {
        const p1 = resolvedPoints[i]; const p2 = resolvedPoints[i+1];
        if (isNaN(p1.lat) || isNaN(p1.lng) || isNaN(p2.lat) || isNaN(p2.lng)) continue;
        L.polyline([p1, p2], { color: pathColor, weight: 1, dashArray: '5, 10', opacity: 0.4, interactive: false }).addTo(layerGroup);
        if (path.isRealWorld) {
          const arcPoints = getGreatCircleArc(p1, p2);
          L.polyline(arcPoints, { color: pathColor, weight: 2, opacity: 0.6, interactive: false }).addTo(layerGroup);
        }
      }

      const validPoints = resolvedPoints.filter(p => !isNaN(p.lat) && !isNaN(p.lng));
      if (validPoints.length < 2) return;
      const hitArea = L.polyline(validPoints, { weight: 20, opacity: 0, interactive: true }).addTo(layerGroup);

      hitArea.bindPopup(`
        <div class="p-4 min-w-[200px] space-y-3 bg-white dark:bg-slate-900 rounded-2xl">
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pathway</div>
            <Activity size={12} class="text-indigo-500" />
          </div>
          <div class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">${path.name}</div>
          <div class="text-[10px] text-slate-500 font-mono">${path.distance} ${path.unit}</div>
          <div class="flex gap-2 pt-2">
            <button class="edit-path-btn flex-1 px-3 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20">Manage</button>
            <button class="remove-path-btn px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center">Delete</button>
          </div>
        </div>
      `, { className: 'custom-map-popup', closeButton: false, offset: [0, -10] });

      hitArea.on('popupopen', (e) => {
        const popup = e.popup.getElement();
        if (popup) {
          const editBtn = popup.querySelector('.edit-path-btn');
          const removeBtn = popup.querySelector('.remove-path-btn');
          if (editBtn) L.DomEvent.on(editBtn as HTMLElement, 'click', (ev) => { L.DomEvent.stopPropagation(ev); onLinkClickRef.current?.('admin', path.id); mapRef.current?.closePopup(); });
          if (removeBtn) L.DomEvent.on(removeBtn as HTMLElement, 'click', (ev) => { L.DomEvent.stopPropagation(ev); if (confirm(`Delete pathway "${path.name}"?`)) { onDeletePathRef.current?.(path.id); mapRef.current?.closePopup(); } });
        }
      });
    });
  }, [paths, locations, isReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady || !isMeasuring) return;
    if (measureLineRef.current) map.removeLayer(measureLineRef.current);
    measureMarkersRef.current.forEach(m => m.remove());
    measureMarkersRef.current = [];
    
    if (points.length < 1) return;
    const layerGroup = L.layerGroup().addTo(map);
    measureLineRef.current = layerGroup as any;

    const resolvedPoints = points.map(p => L.latLng(p.y, p.x));
    points.forEach((p, idx) => {
      if (isNaN(p.y) || isNaN(p.x)) return;
      const marker = L.marker([p.y, p.x], {
        draggable: true,
        icon: L.divIcon({
          className: 'measure-node',
          html: `<div class="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center hover:bg-amber-500/40 transition-colors cursor-move">
                  <div class="w-5 h-5 bg-amber-500 rounded-full border-2 border-white shadow-xl flex items-center justify-center">
                    <div class="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        })
      }).addTo(map);
      marker.on('drag', (e) => {
        const newPos = e.target.getLatLng();
        setPoints(prev => prev.map((pt, i) => i === idx ? { ...pt, x: newPos.lng, y: newPos.lat } : pt));
      });
      measureMarkersRef.current.push(marker);
    });

    if (tempMeasureB) resolvedPoints.push(tempMeasureB);
    if (resolvedPoints.length < 2) return;

    for (let i = 0; i < resolvedPoints.length - 1; i++) {
      const p1 = resolvedPoints[i]; const p2 = resolvedPoints[i+1];
      if (isNaN(p1.lat) || isNaN(p1.lng) || isNaN(p2.lat) || isNaN(p2.lng)) continue;
      L.polyline([p1, p2], { color: '#6366f1', weight: 1, dashArray: '5, 10', opacity: 0.5 }).addTo(layerGroup);
      if (isRealWorld) {
        const arcPoints = getGreatCircleArc(p1, p2);
        L.polyline(arcPoints, { color: '#fbbf24', weight: 3, opacity: 0.8 }).addTo(layerGroup);
      }
    }
    return () => { if (measureLineRef.current) map.removeLayer(measureLineRef.current); measureMarkersRef.current.forEach(m => m.remove()); };
  }, [points, tempMeasureB, isRealWorld, isReady, isMeasuring]);

  useEffect(() => {
    const map = mapRef.current;
    if (!isReady || !map || !rootMapImage || isRealWorld) return;
    const img = new Image();
    img.onload = () => {
      if (!mapRef.current) return;
      const w = img.width; const h = img.height;
      setImgWidth(w);
      onDimensionsDetectedRef.current?.(w, h);
      const bounds = new L.LatLngBounds(L.latLng(-h/2, -w/2), L.latLng(h/2, w/2));
      mapBoundsRef.current = bounds;
      map.eachLayer(l => { if (l instanceof L.ImageOverlay) map.removeLayer(l); });
      L.imageOverlay(rootMapImage, bounds).addTo(map);
      map.setMaxBounds(bounds);
      map.options.maxBoundsViscosity = 1.0;
      if (defaultView) map.setView([defaultView.y, defaultView.x], defaultView.zoom, { animate: false });
      else map.fitBounds(bounds, { animate: false });
      map.setMinZoom(map.getBoundsZoom(bounds, true));
    };
    img.src = rootMapImage;
  }, [isReady, rootMapImage, isRealWorld]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const map = mapRef.current;
    if (!isReady || !map || !containerRef.current) return;
    const locationId = e.dataTransfer.getData('locationId');
    if (!locationId || !onLocationPlaceRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const latlng = map.containerPointToLatLng(L.point(e.clientX - rect.left, e.clientY - rect.top));
    onLocationPlaceRef.current(locationId, latlng.lng, latlng.lat);
  };

  const [debugCoords, setDebugCoords] = useState<{ lat: number, lng: number, zoom: number } | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;
    const handleMove = () => { const center = map.getCenter(); setDebugCoords({ lat: center.lat, lng: center.lng, zoom: map.getZoom() }); };
    if (isRealWorld) { map.on('move zoom', handleMove); handleMove(); }
    return () => { map.off('move zoom', handleMove); };
  }, [isReady, isRealWorld]);

  const renderScaleBar = () => {
    if (!mapRef.current) return null;
    const map = mapRef.current;
    let displayDist = 0;
    let label = mapUnit || 'km';
    if (isRealWorld) {
      const center = map.getCenter();
      const p1 = center;
      const p2 = map.unproject(map.project(center, map.getZoom()).add(L.point(100, 0)), map.getZoom());
      displayDist = getDistance(p1, p2) / 1000;
      if (mapUnit === 'mi') displayDist *= 0.621371;
    } else {
      if (!imgWidth) return null;
      const currentScale = mapScale || 1000;
      const p1 = map.unproject(L.point(0, 0), map.getZoom());
      const p2 = map.unproject(L.point(100, 0), map.getZoom());
      const pixelDist = Math.abs(p2.lng - p1.lng);
      displayDist = (pixelDist / imgWidth) * currentScale;
    }
    if (displayDist < 1) { displayDist = displayDist * 1000; label = (mapUnit === 'mi' || label === 'mi') ? 'ft' : 'm'; }
    return (
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none flex flex-col items-center gap-2">
        {isRealWorld && debugCoords && (
          <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[10px] font-mono text-emerald-400 mb-2 shadow-2xl flex items-center gap-4">
            <div className="flex items-center gap-2"><span className="opacity-50 uppercase tracking-widest text-[8px]">Lat</span><span className="min-w-[70px]">{debugCoords.lat.toFixed(6)}</span></div>
            <div className="flex items-center gap-2 border-l border-white/10 pl-4"><span className="opacity-50 uppercase tracking-widest text-[8px]">Lng</span><span className="min-w-[70px]">{debugCoords.lng.toFixed(6)}</span></div>
            <div className="flex items-center gap-2 border-l border-white/10 pl-4"><span className="opacity-50 uppercase tracking-widest text-[8px]">Zoom</span><span className="text-white font-bold">{debugCoords.zoom.toFixed(1)}x</span></div>
          </div>
        )}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-2xl border border-white/20 flex flex-col gap-1 border-b-4 border-b-emerald-500">
          <div className="flex items-center justify-between w-[100px] border-b-2 border-l-2 border-r-2 border-slate-900 dark:border-white h-1.5" />
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white text-center">{displayDist.toFixed(displayDist < 10 ? 1 : 0)} {label}</div>
        </div>
      </div>
    );
  };

  const renderMeasurementResults = () => {
    if (points.length < 1) return null;
    let totalMeters = 0;
    const resolvedPoints = points.map(p => L.latLng(p.y, p.x));
    if (tempMeasureB) resolvedPoints.push(tempMeasureB);
    if (resolvedPoints.length < 2) return null;
    for (let i = 0; i < resolvedPoints.length - 1; i++) {
      const p1 = resolvedPoints[i]; const p2 = resolvedPoints[i+1];
      if (!isNaN(p1.lat) && !isNaN(p1.lng) && !isNaN(p2.lat) && !isNaN(p2.lng)) totalMeters += getDistance(p1, p2);
    }
    let totalPixels = 0;
    for (let i = 0; i < resolvedPoints.length - 1; i++) {
      const p1 = resolvedPoints[i]; const p2 = resolvedPoints[i+1];
      if (!isNaN(p1.lat) && !isNaN(p1.lng) && !isNaN(p2.lat) && !isNaN(p2.lng)) totalPixels += p1.distanceTo(p2);
    }
    const distKm = totalMeters / 1000;
    const handleCalibrate = () => {
      const label = mapUnit || 'km';
      const val = window.prompt(`Current distance is ${distKm.toFixed(2)} ${label}.\n\nWhat is the ACTUAL distance between these points?`, distKm.toFixed(2));
      if (val) {
        const expectedDist = parseFloat(val);
        if (!isNaN(expectedDist) && expectedDist > 0 && imgWidth > 0 && totalPixels > 0) {
          const newScale = (expectedDist * imgWidth) / totalPixels;
          onScaleCalibratedRef.current?.(newScale);
          alert(`Atlas scale synchronized to ${newScale.toFixed(2)} ${label} per image width.`);
        }
      }
    };

    return (
      <div 
        ref={ledgerRef}
        style={{ transform: `translate(${ledgerPos.x}px, ${ledgerPos.y}px)` }}
        className={`absolute top-24 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-500 ${isDraggingLedger ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          setIsDraggingLedger(true);
          const startX = e.clientX - ledgerPos.x;
          const startY = e.clientY - ledgerPos.y;
          const handleMouseMove = (mv: MouseEvent) => { setLedgerPos({ x: mv.clientX - startX, y: mv.clientY - startY }); };
          const handleMouseUp = () => { setIsDraggingLedger(false); window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
        }}
      >
        <div className="relative paper-texture p-6 shadow-2xl border border-amber-900/20 max-w-sm rotate-1">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-amber-900/10 pb-2">
              <h4 className="text-[10px] font-black text-amber-900/60 uppercase tracking-[0.2em]">Distance Ledger</h4>
              <button onClick={() => { setPoints([]); setTempMeasureB(null); }} className="text-amber-900/40 hover:text-rose-600 transition-colors"><CloseIcon size={14} /></button>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <span className="text-[8px] font-black text-amber-900/40 uppercase block mb-1">Total (Metric)</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-serif italic text-amber-900">{distKm.toFixed(1)}</span>
                  <span className="text-[10px] font-bold text-amber-900/60">{mapUnit || 'km'}</span>
                </div>
              </div>
              <div className="border-l border-amber-900/10 pl-6 flex flex-col justify-center">
                {isRealWorld && (
                  <button onClick={handleCalibrate} className="flex items-center gap-1.5 px-2 py-1.5 bg-amber-900/10 hover:bg-amber-900/20 text-amber-900/70 rounded-lg transition-all text-[9px] font-black uppercase tracking-widest border border-amber-900/10"><Ruler size={10} /> Sync Scale</button>
                )}
              </div>
            </div>
            <div className="bg-amber-900/5 p-3 rounded italic text-[10px] text-amber-900/70 font-serif border-l-2 border-amber-900/20">Total path length across {resolvedPoints.length - 1} segments.</div>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (!isReady || !mapRef.current) return;
    const map = mapRef.current;
    try {
      map.eachLayer(l => { if (l instanceof L.Marker && !(l.options.icon?.options as any).className?.includes('measure-node')) map.removeLayer(l); });
      locations.forEach(loc => {
        if (loc.x !== undefined && loc.y !== undefined) {
          const latlng = L.latLng(loc.y, loc.x);
          const isLocLocked = loc.isLocked ?? (loc.matchedX !== undefined);
          if (!isRealWorld && mapBoundsRef.current && !mapBoundsRef.current.contains(latlng)) return;
          const style = getMarkerStyle(loc);
          const marker = L.marker(latlng, {
            draggable: !isLocLocked,
            icon: L.divIcon({
              className: 'custom-marker',
              iconSize: [32, 40],
              iconAnchor: [16, 40],
              html: `<div class="group/marker relative flex flex-col items-center">
                <div class="relative transition-transform duration-300 group-hover/marker:scale-110 ${loc.type === 'Region' ? 'opacity-40' : ''}">
                  <div class="w-8 h-10 relative flex items-center justify-center filter drop-shadow-xl">
                    <svg viewBox="0 0 24 30" class="w-full h-full fill-current ${style.color.replace('bg-', 'text-')}" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 18 12 18s12-9 12-18c0-6.63-5.37-12-12-12z" fill="currentColor" stroke="white" stroke-width="1" />
                    </svg>
                    <div class="absolute top-[6px] w-4 h-4 flex items-center justify-center text-white">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full">${style.svg}</svg>
                    </div>
                  </div>
                </div>
              </div>`
            })
          }).addTo(map);
          marker.bindPopup(`<div class="p-4 min-w-[200px] space-y-3 bg-white dark:bg-slate-900 rounded-2xl"><div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2"><div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${loc.type}</div><button class="lock-toggle-map p-1.5 rounded-lg transition-all ${isLocLocked ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-500'}">${isLocLocked ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' : '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>'}</button></div><div class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">${loc.name}</div><div class="flex gap-2 pt-2"><button class="edit-map-btn flex-1 px-3 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20">Edit</button><button class="remove-map-btn px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center">Remove</button></div></div>`, { className: 'custom-map-popup', closeButton: false, offset: [0, -30] });
          marker.on('popupopen', (e) => {
            const popup = e.popup.getElement();
            if (popup) {
              const editBtn = popup.querySelector('.edit-map-btn');
              const unplaceBtn = popup.querySelector('.remove-map-btn');
              const lockBtn = popup.querySelector('.lock-toggle-map');
              if (editBtn) L.DomEvent.on(editBtn as HTMLElement, 'click', (ev) => { L.DomEvent.stopPropagation(ev); onLinkClickRef.current?.('admin', loc.id); map.closePopup(); });
              if (unplaceBtn) L.DomEvent.on(unplaceBtn as HTMLElement, 'click', (ev) => { L.DomEvent.stopPropagation(ev); if (confirm(`Remove "${loc.name}" from the map?`)) { onLocationUnplaceRef.current?.(loc.id); map.closePopup(); } });
              if (lockBtn) L.DomEvent.on(lockBtn as HTMLElement, 'click', (ev) => { L.DomEvent.stopPropagation(ev); onLocationLockRef.current?.(loc.id, !isLocLocked); });
            }
          });
          marker.on('click', (e) => { L.DomEvent.stopPropagation(e); onLocationClickRef.current?.(loc.id); });
          marker.on('dragend', (e) => { const newPos = e.target.getLatLng(); onLocationMoveRef.current?.(loc.id, newPos.lng, newPos.lat); });
        }
      });
    } catch (err) { console.warn("Marker update error:", err); }
  }, [locations, isRealWorld, isReady]);

  const renderTargetPreview = (bounds: L.LatLngBounds, isOffScreen: boolean) => {
    const fullBounds = isRealWorld ? L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180)) : mapBoundsRef.current;
    if (!fullBounds) return null;
    const center = bounds.getCenter();
    if (isRealWorld) {
      const zoom = 15;
      const x = Math.floor((center.lng + 180) / 360 * Math.pow(2, zoom));
      const y = Math.floor((1 - Math.log(Math.tan(center.lat * Math.PI / 180) + 1 / Math.cos(center.lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
      const tileUrl = `https://a.tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
      return (
        <div className="relative w-full h-full bg-slate-200 dark:bg-slate-800 overflow-hidden shadow-inner">
          <img src={tileUrl} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-in-out scale-125" style={{ filter: isOffScreen ? 'grayscale(0.5) brightness(0.8)' : 'none' }} alt="" onError={(e) => { (e.target as HTMLImageElement).src = `https://b.tile.openstreetmap.org/${zoom}/${x}/${y}.png`; }} />
          <div className="absolute inset-0 border-[3px] border-white/20 rounded-xl" />
          <div className="absolute inset-0 bg-blue-500/10 pointer-events-none" />
        </div>
      );
    }
    const getPos = (lat: number, lng: number) => {
      const w = fullBounds.getEast() - fullBounds.getWest();
      const h = fullBounds.getNorth() - fullBounds.getSouth();
      return { x: ((lng - fullBounds.getWest()) / w) * 100, y: (1 - (lat - fullBounds.getSouth()) / h) * 100 };
    };
    if (rootMapImage) {
      const pos = getPos(center.lat, center.lng);
      const zoomFactor = 6.6;
      return (
        <div className="relative w-full h-full bg-slate-900 overflow-hidden shadow-inner">
          <img src={rootMapImage} className="absolute max-w-none transition-transform duration-700 ease-in-out" style={{ width: `${zoomFactor * 100}%`, height: 'auto', left: `${50 - (pos.x * zoomFactor)}%`, top: `${50 - (pos.y * zoomFactor)}%`, filter: isOffScreen ? 'grayscale(0.5) brightness(0.8)' : 'none' }} alt="" />
          <div className="absolute inset-0 border-[3px] border-white/20 rounded-xl" />
        </div>
      );
    }
    return (
      <div className={`relative w-full h-full flex items-center justify-center shadow-inner ${isOffScreen ? 'bg-gradient-to-br from-indigo-500 to-violet-600' : 'bg-gradient-to-br from-emerald-400 to-teal-500'}`}>
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        {isOffScreen ? <MapPin size={20} className="text-white drop-shadow-md" /> : <Maximize2 size={20} className="text-white drop-shadow-md" />}
      </div>
    );
  };

  return (
    <div className={`w-full h-full relative group/map ${isMeasuring ? 'cursor-crosshair' : ''}`}>
      <style>{`
        .custom-map-popup .leaflet-popup-content-wrapper { background: white; border-radius: 24px; padding: 0; border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25); }
        .dark .custom-map-popup .leaflet-popup-content-wrapper { background: #0f172a; border: 1px solid rgba(255,255,255,0.1); }
        .custom-map-popup .leaflet-popup-content { margin: 0; }
        .custom-map-popup .leaflet-popup-tip { background: white; }
        .dark .custom-map-popup .leaflet-popup-tip { background: #0f172a; }
      `}</style>
      <div ref={containerRef} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} className="w-full h-full rounded-3xl overflow-hidden shadow-inner bg-slate-100 dark:bg-slate-900 z-0 relative" />
      {isReady && renderScaleBar()}
      {isReady && renderMeasurementResults()}
      <div className="absolute top-48 right-6 z-40 flex flex-col gap-2 pointer-events-auto">
        <button onClick={(e) => { e.stopPropagation(); handleToggleMeasuring(); }} className={`p-3 rounded-2xl shadow-2xl border backdrop-blur-md transition-all ${isMeasuring ? 'bg-amber-500 text-white border-amber-400 ring-4 ring-amber-500/20' : 'bg-white/95 dark:bg-slate-900/95 text-slate-600 dark:text-slate-300 border-white/20 hover:bg-white'}`} title="Measurement Tool"><Ruler size={20} /></button>
      </div>
      {isMeasuring && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] bg-amber-600 text-white px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl animate-pulse pointer-events-none">
          {points.length === 0 ? "Mark Point A" : "Click to add segments (click node to save)"}
        </div>
      )}
      <div className="absolute top-3 md:top-6 left-3 md:left-6 flex flex-col gap-4 z-40 pointer-events-none items-start">
        {shortcuts.map((s: any, i) => (
          <button key={i} onClick={(e) => { e.stopPropagation(); mapRef.current?.fitBounds(s.bounds, { animate: true, padding: [100, 100], duration: 1.5, maxZoom: 15 }); }} className="flex items-center gap-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl pointer-events-auto hover:scale-105 transition-all group active:scale-95 overflow-hidden">
            <div className="w-12 h-12 relative shrink-0 overflow-hidden m-1 rounded-xl shadow-lg border border-black/5 dark:border-white/10">{renderTargetPreview(s.bounds, s.isOffScreen)}</div>
            <div className="max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-500 ease-in-out flex items-center overflow-hidden">
              <div className="px-4 py-2 text-left border-l border-white/10 overflow-hidden">
                <div className={`text-[8px] font-black uppercase tracking-[0.2em] leading-none mb-1.5 whitespace-nowrap ${s.isOffScreen ? 'text-indigo-500 dark:text-indigo-400' : 'text-emerald-500'}`}>{s.isOffScreen ? 'Jump to' : 'Dive into'}</div>
                <div className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-[140px]">{s.name}</div>
              </div>
              <div className={`pr-3 pl-1 transition-colors shrink-0 ${s.isOffScreen ? 'text-slate-300 group-hover:text-indigo-500' : 'text-slate-300 group-hover:text-emerald-500'}`}><ChevronRight size={16} /></div>
            </div>
          </button>
        ))}
      </div>
      
      {/* Path Naming Dialog */}
      {showPathNameDialog && (
        <div className="absolute inset-0 flex items-center justify-center z-[200] bg-black/30 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-white/20 p-8 w-96 max-w-[90vw] animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Name Your Path</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Distance: {pendingPath?.distance.toFixed(2)} {pendingPath?.unit}
            </p>
            <input
              type="text"
              value={pathName}
              onChange={(e) => setPathName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmPathName(); }}
              placeholder="e.g., Trade Route to Eastern Lands"
              className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-6"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPathNameDialog(false);
                  setPendingPath(null);
                  setPathName('');
                }}
                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPathName}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
              >
                Save Path
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
