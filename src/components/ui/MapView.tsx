import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, ChevronRight, Edit2, Trash2, Lock, Unlock, X as CloseIcon, Maximize2 } from 'lucide-react';
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
  isRealWorld?: boolean;
}

export const MapView: React.FC<MapViewProps> = ({ 
  locations, onLocationClick, onMapClick, onLocationPlace, onLocationMove, onLocationUnplace, onLocationUndo, onLocationReset, onLocationLock, onDimensionsDetected, onLinkClick, rootMapImage, mapScale, mapUnit, defaultView, zoomInRef, zoomOutRef, centerMapRef, fitAllLocationsRef, getViewStateRef,
  isRealWorld = false
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapBoundsRef = useRef<L.LatLngBounds | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const imgWidthRef = useRef<number>(1);
  const [isReady, setIsReady] = useState(false);
  const [shortcuts, setShortcuts] = useState<{ name: string, bounds: L.LatLngBounds, count: number, type: string }[]>([]);

  const locationsRef = useRef(locations);
  useEffect(() => { locationsRef.current = locations; }, [locations]);

  // Update off-screen and dive-in shortcuts
  const updateShortcuts = React.useCallback(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;

    try {
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      const isZoomedOut = isRealWorld ? zoom <= 6 : zoom <= 0;
      
      const allPlaced = locationsRef.current.filter(l => l.x !== undefined && l.y !== undefined);
      
      if (allPlaced.length === 0) {
        setShortcuts([]);
        return;
      }

      // Smart Clustering by Region
      const clusters: Record<string, { locs: Location[], name: string }> = {};
      
      allPlaced.forEach(loc => {
        let region = 'Remote';
        if (loc.address) {
          const parts = loc.address.split(',').map(p => p.trim());
          region = parts[parts.length - 1];
        } else if (isRealWorld) {
          region = `Area ${Math.round(loc.x! / 10)},${Math.round(loc.y! / 10)}`;
        } else {
          const grid = imgWidthRef.current * 0.3 || 1000;
          region = `Sector ${Math.round(loc.x! / grid)},${Math.round(loc.y! / grid)}`;
        }

        if (!clusters[region]) {
          clusters[region] = { locs: [], name: region };
        }
        clusters[region].locs.push(loc);
      });

      const newShortcuts = Object.values(clusters).map(c => {
        const clusterBounds = L.latLngBounds(c.locs.map(l => L.latLng(l.y!, l.x!)));
        const isOffScreen = !bounds.contains(clusterBounds.getCenter());
        
        // A cluster is a "Dive" candidate if it's on-screen but small relative to the view
        const clusterWidth = Math.abs(clusterBounds.getEast() - clusterBounds.getWest());
        const viewWidth = Math.abs(bounds.getEast() - bounds.getWest());
        const isSmallGroup = clusterWidth < (viewWidth * 0.3); // Occupies less than 30% of view

        const displayName = (c.name === 'Remote' || c.name.startsWith('Area') || c.name.startsWith('Sector'))
          ? (c.locs.length === 1 ? c.locs[0].name : `${c.locs[0].name} & ${c.locs.length - 1}+`)
          : c.name;

        return {
          name: displayName,
          bounds: clusterBounds,
          count: c.locs.length,
          type: c.locs[0].type,
          isOffScreen,
          shouldShow: isOffScreen || (isZoomedOut && isSmallGroup)
        };
      }).filter(s => (s as any).shouldShow);

      setShortcuts(newShortcuts.sort((a, b) => b.count - a.count).slice(0, 4));
    } catch (e) {
      console.warn("Shortcut update failed", e);
    }
  }, [isReady, isRealWorld]);

  useEffect(() => {
    if (isReady) {
      updateShortcuts();
    }
  }, [isReady, locations, updateShortcuts]);

  // Map-style SVG Icons
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

  useEffect(() => { onDimensionsDetectedRef.current = onDimensionsDetected; }, [onDimensionsDetected]);
  useEffect(() => { onLocationPlaceRef.current = onLocationPlace; }, [onLocationPlace]);
  useEffect(() => { onLocationMoveRef.current = onLocationMove; }, [onLocationMove]);
  useEffect(() => { onLocationUnplaceRef.current = onLocationUnplace; }, [onLocationUnplace]);
  useEffect(() => { onLocationLockRef.current = onLocationLock; }, [onLocationLock]);
  useEffect(() => { onLocationClickRef.current = onLocationClick; }, [onLocationClick]);
  useEffect(() => { onLinkClickRef.current = onLinkClick; }, [onLinkClick]);

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

    mapRef.current = map;
    map.on('moveend zoomend', updateShortcuts);
    
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

    if (fitAllLocationsRef) fitAllLocationsRef.current = () => {
      const placed = locationsRef.current.filter(l => l.x !== undefined && l.y !== undefined);
      if (placed.length === 0) return;
      
      const bounds = L.latLngBounds(placed.map(l => L.latLng(l.y!, l.x!)));
      map.fitBounds(bounds, { animate: true, padding: [50, 50], duration: 1.5, maxZoom: isRealWorld ? 15 : undefined });
    };

    setIsReady(true);
    return () => {
      setIsReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, [isRealWorld, updateShortcuts]);

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
      map.setMinZoom(map.getBoundsZoom(bounds, true));
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
                  
                  <!-- Unified Teardrop SVG (Standard Size) -->
                  <div class="w-8 h-10 relative flex items-center justify-center filter drop-shadow-xl">
                    <svg viewBox="0 0 24 30" class="w-full h-full fill-current ${style.color.replace('bg-', 'text-')}" xmlns="http://www.w3.org/2000/svg">
                      <path 
                        d="M12 0C5.37 0 0 5.37 0 12c0 9 12 18 12 18s12-9 12-18c0-6.63-5.37-12-12-12z" 
                        fill="currentColor" 
                        stroke="white" 
                        stroke-width="1" 
                      />
                    </svg>

                    <div class="absolute top-[6px] w-4 h-4 flex items-center justify-center text-white">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full">${style.svg}</svg>
                    </div>
                  </div>
                </div>
              </div>`
            })
          }).addTo(map);

          // Popup Content with Edit/Delete/Lock
          marker.bindPopup(`
            <div class="p-4 min-w-[200px] space-y-3 bg-white dark:bg-slate-900 rounded-2xl">
              <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${loc.type}</div>
                <button class="lock-toggle-map p-1.5 rounded-lg transition-all ${isLocLocked ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-500'}">
                  ${isLocLocked ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' : '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>'}
                </button>
              </div>
              <div class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">${loc.name}</div>
              <div class="flex gap-2 pt-2">
                <button class="edit-map-btn flex-1 px-3 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20">
                  Edit
                </button>
                <button class="remove-map-btn px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center">
                  Remove
                </button>
              </div>
            </div>
          `, {
            className: 'custom-map-popup',
            closeButton: false,
            offset: [0, -30]
          });
          
          marker.on('popupopen', (e) => {
            const popup = e.popup.getElement();
            if (popup) {
              const editBtn = popup.querySelector('.edit-map-btn');
              const unplaceBtn = popup.querySelector('.remove-map-btn');
              const lockBtn = popup.querySelector('.lock-toggle-map');
              
              if (editBtn) L.DomEvent.on(editBtn as HTMLElement, 'click', (ev) => {
                L.DomEvent.stopPropagation(ev);
                onLinkClickRef.current?.('admin', loc.id);
                map.closePopup();
              });
              
              if (unplaceBtn) L.DomEvent.on(unplaceBtn as HTMLElement, 'click', (ev) => {
                L.DomEvent.stopPropagation(ev);
                if (confirm(`Remove "${loc.name}" from the map?`)) {
                  onLocationUnplaceRef.current?.(loc.id);
                  map.closePopup();
                }
              });

              if (lockBtn) L.DomEvent.on(lockBtn as HTMLElement, 'click', (ev) => {
                L.DomEvent.stopPropagation(ev);
                onLocationLockRef.current?.(loc.id, !isLocLocked);
                // Keep popup open as requested
              });
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
        .custom-map-popup .leaflet-popup-content-wrapper { background: white; border-radius: 24px; padding: 0; border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25); }
        .dark .custom-map-popup .leaflet-popup-content-wrapper { background: #0f172a; border: 1px solid rgba(255,255,255,0.1); }
        .custom-map-popup .leaflet-popup-content { margin: 0; }
        .custom-map-popup .leaflet-popup-tip { background: white; }
        .dark .custom-map-popup .leaflet-popup-tip { background: #0f172a; }
      `}</style>
      <div ref={containerRef} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} className="w-full h-full rounded-3xl overflow-hidden shadow-inner bg-slate-100 dark:bg-slate-900 z-0 relative" />

      {/* Smart Portals (Jump & Dive) */}
      <div className="absolute top-24 left-6 flex flex-col gap-4 z-40 pointer-events-none">
        {shortcuts.map((s: any, i) => (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              mapRef.current?.fitBounds(s.bounds, { animate: true, padding: [100, 100], duration: 1.5, maxZoom: isRealWorld ? 15 : undefined });
            }}
            className="flex items-center gap-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl pointer-events-auto hover:scale-105 transition-all group active:scale-95 overflow-hidden"
          >
            <div className={`w-12 h-12 bg-gradient-to-br ${s.isOffScreen ? 'from-indigo-600 to-violet-700' : 'from-emerald-500 to-teal-600'} text-white flex items-center justify-center shadow-inner relative overflow-hidden shrink-0`}>
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
              <div className="relative z-10 flex flex-col items-center">
                {s.isOffScreen ? <MapPin size={14} className="mb-0.5" /> : <Maximize2 size={14} className="mb-0.5" />}
                <span className="text-[10px] font-black">{s.count}</span>
              </div>
            </div>
            <div className="px-4 py-2 text-left border-l border-white/10 overflow-hidden">
              <div className={`text-[8px] font-black uppercase tracking-[0.2em] leading-none mb-1.5 whitespace-nowrap ${s.isOffScreen ? 'text-indigo-500 dark:text-indigo-400' : 'text-emerald-500'}`}>
                {s.isOffScreen ? 'Jump to' : 'Dive into'}
              </div>
              <div className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-[140px]">{s.name}</div>
            </div>
            <div className={`pr-3 pl-1 transition-colors shrink-0 ${s.isOffScreen ? 'text-slate-300 group-hover:text-indigo-500' : 'text-slate-300 group-hover:text-emerald-500'}`}>
              <ChevronRight size={16} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
