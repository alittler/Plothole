import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Location, TimelineEvent, Character } from '../../types';

interface MapViewProps {
  locations: Location[];
  onLocationClick?: (id: string) => void;
  onMapClick?: (x: number, y: number) => void;
  onLocationPlace?: (id: string, x: number, y: number) => void;
  onLocationMove?: (id: string, x: number, y: number) => void;
  onLocationUnplace?: (id: string) => void;
  onLocationUndo?: (id: string) => void;
  onLocationReset?: (id: string) => void;
  onLocationLock?: (id: string, isLocked: boolean) => void;
  onDimensionsDetected?: (width: number, height: number) => void;
  rootMapImage?: string;
  mapScale?: number;
  mapUnit?: string;
  defaultView?: { x: number, y: number, zoom: number };
  zoomInRef?: React.MutableRefObject<(() => void) | null>;
  zoomOutRef?: React.MutableRefObject<(() => void) | null>;
  centerMapRef?: React.MutableRefObject<((coords?: { x: number, y: number }) => void) | null>;
  getViewStateRef?: React.MutableRefObject<(() => { x: number, y: number, zoom: number } | null) | null>;
  isRealWorld?: boolean;
}

export const MapView: React.FC<MapViewProps> = ({ 
  locations, onLocationClick, onMapClick, onLocationPlace, onLocationMove, onLocationUnplace, onLocationUndo, onLocationReset, onLocationLock, onDimensionsDetected, rootMapImage, mapScale, mapUnit, defaultView, zoomInRef, zoomOutRef, centerMapRef, getViewStateRef,
  isRealWorld = false
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapBoundsRef = useRef<L.LatLngBounds | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const imgWidthRef = useRef<number>(1);
  const [isReady, setIsReady] = useState(false);

  // Map-style SVG Icons (Lucide-inspired raw paths)
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

  const onMapClickRef = useRef(onMapClick);
  const onDimensionsDetectedRef = useRef(onDimensionsDetected);
  const onLocationPlaceRef = useRef(onLocationPlace);
  const onLocationMoveRef = useRef(onLocationMove);
  const onLocationUnplaceRef = useRef(onLocationUnplace);
  const onLocationUndoRef = useRef(onLocationUndo);
  const onLocationResetRef = useRef(onLocationReset);
  const onLocationLockRef = useRef(onLocationLock);
  const onLocationClickRef = useRef(onLocationClick);
  const mapScaleRef = useRef(mapScale);
  const mapUnitRef = useRef(mapUnit);

  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);
  useEffect(() => { onDimensionsDetectedRef.current = onDimensionsDetected; }, [onDimensionsDetected]);
  useEffect(() => { onLocationPlaceRef.current = onLocationPlace; }, [onLocationPlace]);
  useEffect(() => { onLocationMoveRef.current = onLocationMove; }, [onLocationMove]);
  useEffect(() => { onLocationUnplaceRef.current = onLocationUnplace; }, [onLocationUnplace]);
  useEffect(() => { onLocationUndoRef.current = onLocationUndo; }, [onLocationUndo]);
  useEffect(() => { onLocationResetRef.current = onLocationReset; }, [onLocationReset]);
  useEffect(() => { onLocationLockRef.current = onLocationLock; }, [onLocationLock]);
  useEffect(() => { onLocationClickRef.current = onLocationClick; }, [onLocationClick]);
  useEffect(() => { mapScaleRef.current = mapScale; }, [mapScale]);
  useEffect(() => { mapUnitRef.current = mapUnit; }, [mapUnit]);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, {
      crs: isRealWorld ? L.CRS.EPSG3857 : L.CRS.Simple,
      minZoom: isRealWorld ? 2 : -2,
      maxZoom: isRealWorld ? 19 : 4,
      zoomControl: false,
      attributionControl: isRealWorld,
      fadeAnimation: false,
      maxBoundsViscosity: 1.0,
      worldCopyJump: false
    });

    if (isRealWorld) {
      tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        noWrap: true
      }).addTo(map);
      const worldBounds = L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180));
      map.setMaxBounds(worldBounds);
      const minZoom = map.getBoundsZoom(worldBounds, true);
      map.setMinZoom(minZoom);
      map.setView([20, 0], Math.max(minZoom, 2));
    } else {
      map.setView([0, 0], 0);
    }

    const CalibratedScale = L.Control.extend({
      options: { position: 'bottomleft' },
      onAdd: function(map: L.Map) {
        const container = L.DomUtil.create('div', 'leaflet-control-scale');
        const line = L.DomUtil.create('div', 'leaflet-control-scale-line', container);
        const updateScale = () => {
          if (isRealWorld) { container.style.display = 'none'; return; }
          const currentScale = mapScaleRef.current || 1000;
          const currentUnit = mapUnitRef.current || 'km';
          const imgWidth = imgWidthRef.current || 1000;
          try {
            const containerWidth = map.getSize().x;
            const bounds = map.getBounds();
            const viewWidthProjected = Math.abs(map.project(bounds.getSouthEast()).x - map.project(bounds.getSouthWest()).x);
            const targetPx = 100;
            const unitsInBar = (viewWidthProjected / containerWidth) * targetPx * (currentScale / imgWidth);
            let displayValue = unitsInBar >= 10 ? Math.round(unitsInBar).toString() : unitsInBar.toFixed(unitsInBar >= 1 ? 1 : 2);
            line.style.width = targetPx + 'px';
            line.style.borderLeft = '2px solid white';
            line.style.borderRight = '2px solid white';
            line.style.borderBottom = '2px solid white';
            line.style.height = '8px';
            line.innerHTML = `<span style="position: absolute; left: calc(100% + 8px); white-space: nowrap; font-weight: 900; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: white !important; text-shadow: 0 0 1px rgba(0,0,0,0.5);">${displayValue}${currentUnit}${!mapScaleRef.current ? '*' : ''}</span>`;
            container.style.display = 'block';
          } catch (e) { container.style.display = 'none'; }
        };
        map.on('zoomend moveend resize', updateScale);
        setTimeout(updateScale, 100);
        return container;
      }
    });
    new (CalibratedScale as any)().addTo(map);
    mapRef.current = map;
    
    if (zoomInRef) zoomInRef.current = () => map.zoomIn();
    if (zoomOutRef) zoomOutRef.current = () => map.zoomOut();
    if (getViewStateRef) getViewStateRef.current = () => {
      const center = map.getCenter();
      return { x: center.lng, y: center.lat, zoom: map.getZoom() };
    };
    if (centerMapRef) centerMapRef.current = (coords?: { x: number, y: number }) => {
      if (coords) map.setView([coords.y, coords.x], map.getZoom(), { animate: true, duration: 1.5 });
      else if (defaultView) map.setView([defaultView.y, defaultView.x], defaultView.zoom, { animate: true, duration: 1.5 });
      else map.fitBounds(map.options.maxBounds as L.LatLngBounds, { animate: true, padding: [20, 20], duration: 1.5 });
    };

    setIsReady(true);
    return () => {
      setIsReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, [isRealWorld]);

  useEffect(() => {
    const map = mapRef.current;
    if (!isReady || !map || !rootMapImage || isRealWorld) return;
    const img = new Image();
    img.onload = () => {
      if (!mapRef.current) return;
      const w = img.width; const h = img.height;
      imgWidthRef.current = w;
      onDimensionsDetectedRef.current?.(w, h);
      const bounds = new L.LatLngBounds(L.latLng(-h/2, -w/2), L.latLng(h/2, w/2));
      mapBoundsRef.current = bounds;
      map.eachLayer(l => { if (l instanceof L.ImageOverlay) map.removeLayer(l); });
      L.imageOverlay(rootMapImage, bounds).addTo(map);
      map.setMaxBounds(bounds);
      map.options.maxBoundsViscosity = 1.0;
      if (defaultView) map.setView([defaultView.y, defaultView.x], defaultView.zoom, { animate: false });
      else map.fitBounds(bounds, { animate: false });
      const minZoom = map.getBoundsZoom(bounds, true);
      map.setMinZoom(minZoom);
      if (!defaultView || map.getZoom() < minZoom) map.setZoom(minZoom);
    };
    img.src = rootMapImage;
  }, [isReady, rootMapImage]);

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

  useEffect(() => {
    if (!isReady || !mapRef.current || !containerRef.current) return;
    const resizeObserver = new ResizeObserver(() => { mapRef.current?.invalidateSize(); });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [isReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!isReady || !map) return;
    try {
      map.eachLayer(l => { if (l instanceof L.Marker) map.removeLayer(l); });
      locations.forEach(loc => {
        if (loc.x !== undefined && loc.y !== undefined) {
          const latlng = L.latLng(loc.y, loc.x);
          const isLocked = loc.isLocked ?? (loc.matchedX !== undefined);
          if (!isRealWorld && mapBoundsRef.current && !mapBoundsRef.current.contains(latlng)) return;
          const style = getMarkerStyle(loc);
          const marker = L.marker(latlng, {
            draggable: !isLocked,
            icon: L.divIcon({
              className: 'custom-marker',
              html: `<div class="group/marker relative">
                <div class="relative flex flex-col items-center group-hover/marker:scale-110 transition-transform duration-300 ${loc.type === 'Region' ? 'scale-[2.5] opacity-30' : ''}">
                  <!-- Teardrop Bulb -->
                  <div class="w-10 h-10 ${style.color} rounded-full border-2 border-white shadow-xl flex items-center justify-center relative z-10">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">${style.svg}</svg>
                  </div>
                  <!-- Teardrop Point -->
                  <div class="w-4 h-4 ${style.color} border-r-2 border-b-2 border-white rotate-45 -mt-2 shadow-lg relative z-0"></div>
                  
                  <!-- Clickable Padlock -->
                  ${isLocked ? `
                    <button class="lock-toggle-indicator absolute -top-1 -right-1 bg-slate-900 rounded-full p-1 border-2 border-white shadow-lg pointer-events-auto hover:bg-rose-600 transition-colors z-20" title="Click to Unlock">
                      <svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke="white" stroke-width="3">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </button>
                  ` : ''}
                </div>
                <!-- Label (Always visible on hover) -->
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-xl pointer-events-none opacity-0 group-hover/marker:opacity-100 transition-opacity whitespace-nowrap border border-white/20 z-[100]">
                  ${loc.name}
                </div>
              </div>`
            })
          }).addTo(map);
          
          marker.on('add', () => {
            const el = marker.getElement();
            if (el) {
              const lockBtn = el.querySelector('.lock-toggle-indicator');
              if (lockBtn) {
                L.DomEvent.on(lockBtn as HTMLElement, 'click', (e) => {
                  L.DomEvent.stopPropagation(e);
                  onLocationLockRef.current?.(loc.id, false);
                });
              }
            }
          });

          marker.on('click', (e) => { L.DomEvent.stopPropagation(e); onLocationClickRef.current?.(loc.id); });
          marker.on('dragend', (e) => { const newPos = e.target.getLatLng(); onLocationMoveRef.current?.(loc.id, newPos.lng, newPos.lat); });
        }
      });
    } catch (err) { console.warn("Marker update error:", err); }
  }, [locations, isRealWorld, isReady]);

  return (
    <div className="w-full h-full relative group/map">
      <style>{`
        .leaflet-control-scale { margin-bottom: 24px !important; margin-left: 24px !important; display: none; background: none !important; border: none !important; pointer-events: none; }
        .leaflet-control-scale-line { background: none !important; color: white !important; mix-blend-mode: difference !important; margin-bottom: 8px !important; margin-left: 8px !important; display: flex; align-items: center; justify-content: center; position: relative; }
        .dark .leaflet-control-scale-line { color: white !important; mix-blend-mode: difference !important; }
      `}</style>
      <div ref={containerRef} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} className="w-full h-full rounded-3xl overflow-hidden shadow-inner bg-slate-100 dark:bg-slate-900 z-0 relative" />
    </div>
  );
};
