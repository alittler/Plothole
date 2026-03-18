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
  onDimensionsDetected?: (width: number, height: number) => void;
  rootMapImage?: string;
  mapScale?: number;
  mapUnit?: string;
  defaultView?: { x: number, y: number, zoom: number };
  zoomInRef?: React.MutableRefObject<(() => void) | null>;
  zoomOutRef?: React.MutableRefObject<(() => void) | null>;
  centerMapRef?: React.MutableRefObject<((coords?: { x: number, y: number }) => void) | null>;
  getViewStateRef?: React.MutableRefObject<(() => { x: number, y: number, zoom: number } | null) | null>;
  }  export const MapView: React.FC<MapViewProps> = ({ 
  locations, onLocationClick, onMapClick, onLocationPlace, onLocationMove, onLocationUnplace, onDimensionsDetected, rootMapImage, mapScale, mapUnit, defaultView, zoomInRef, zoomOutRef, centerMapRef, getViewStateRef
  }) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapBoundsRef = useRef<L.LatLngBounds | null>(null);
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

  // Helper to get icon color/style based on type or explicit icon name
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

    return { 
      color, 
      svg: MAP_ICONS[iconKey] || MAP_ICONS['landmark']
    };
  };

  // Use refs for callbacks to prevent effect re-triggering
  const onMapClickRef = useRef(onMapClick);
  const onDimensionsDetectedRef = useRef(onDimensionsDetected);
  const onLocationPlaceRef = useRef(onLocationPlace);
  const onLocationMoveRef = useRef(onLocationMove);
  const onLocationUnplaceRef = useRef(onLocationUnplace);
  const onLocationClickRef = useRef(onLocationClick);
  const mapScaleRef = useRef(mapScale);
  const mapUnitRef = useRef(mapUnit);

  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);
  useEffect(() => { onDimensionsDetectedRef.current = onDimensionsDetected; }, [onDimensionsDetected]);
  useEffect(() => { onLocationPlaceRef.current = onLocationPlace; }, [onLocationPlace]);
  useEffect(() => { onLocationMoveRef.current = onLocationMove; }, [onLocationMove]);
  useEffect(() => { onLocationUnplaceRef.current = onLocationUnplace; }, [onLocationUnplace]);
  useEffect(() => { onLocationClickRef.current = onLocationClick; }, [onLocationClick]);
  useEffect(() => { mapScaleRef.current = mapScale; }, [mapScale]);
  useEffect(() => { mapUnitRef.current = mapUnit; }, [mapUnit]);

  // Force scale update when props change
  useEffect(() => {
    if (isReady && mapRef.current) {
      mapRef.current.fire('resize');
    }
  }, [mapScale, mapUnit, isReady]);

  // Expose methods to parent
  useEffect(() => {
    if (zoomInRef) zoomInRef.current = () => mapRef.current?.zoomIn();
    if (zoomOutRef) zoomOutRef.current = () => mapRef.current?.zoomOut();
    if (getViewStateRef) getViewStateRef.current = () => {
      if (!mapRef.current) return null;
      const center = mapRef.current.getCenter();
      return { x: center.lng, y: center.lat, zoom: mapRef.current.getZoom() };
    };
    if (centerMapRef) centerMapRef.current = (coords?: { x: number, y: number }) => {
      if (!mapRef.current) return;
      if (coords) {
        mapRef.current.setView([coords.y, coords.x], mapRef.current.getZoom(), { animate: true, duration: 1.5 });
      } else if (defaultView) {
        mapRef.current.setView([defaultView.y, defaultView.x], defaultView.zoom, { animate: true, duration: 1.5 });
      } else if (mapBoundsRef.current) {
        mapRef.current.fitBounds(mapBoundsRef.current, { animate: true, padding: [20, 20], duration: 1.5 });
      }
    };
  }, [zoomInRef, zoomOutRef, centerMapRef, getViewStateRef, defaultView]);

  // 1. Initial Map Creation & Cleanup
  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      crs: L.CRS.Simple,
      minZoom: -2,
      maxZoom: 4,
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: false,
      maxBoundsViscosity: 1.0
    });

    // Custom Calibrated Scale Control
    const CalibratedScale = L.Control.extend({
      options: { position: 'bottomleft' },
      onAdd: function(map: L.Map) {
        const container = L.DomUtil.create('div', 'leaflet-control-scale');
        const line = L.DomUtil.create('div', 'leaflet-control-scale-line', container);
        
        const updateScale = () => {
          if (!mapBoundsRef.current || !mapScaleRef.current || imgWidthRef.current <= 1) {
            container.style.display = 'none';
            return;
          }
          
          try {
            // Current width of the map container in pixels
            const containerWidth = map.getSize().x;
            // Current width of the map view in 'projected' pixels at current zoom
            const bounds = map.getBounds();
            const se = map.project(bounds.getSouthEast());
            const sw = map.project(bounds.getSouthWest());
            const viewWidthProjected = Math.abs(se.x - sw.x);
            
            // We want to show a scale bar that is roughly 100px wide
            const targetPx = 100;
            // How many 'real world' units per projected pixel?
            // (mapScale units / imagePixelWidth)
            const unitsPerPx = mapScaleRef.current / imgWidthRef.current;
            const unitsInBar = (viewWidthProjected / containerWidth) * targetPx * unitsPerPx;
            
            // Nice rounding
            let displayValue = "";
            if (unitsInBar >= 10) displayValue = Math.round(unitsInBar).toString();
            else if (unitsInBar >= 1) displayValue = unitsInBar.toFixed(1);
            else displayValue = unitsInBar.toFixed(2);
            
            line.style.width = targetPx + 'px';
            line.innerHTML = `${displayValue} ${mapUnitRef.current || 'units'}`;
            container.style.display = 'block';
          } catch (e) {
            container.style.display = 'none';
          }
        };

        map.on('zoomend moveend resize', updateScale);
        // Initial update after map settles
        setTimeout(updateScale, 1000);
        return container;
      }
    });

    new (CalibratedScale as any)().addTo(map);
    
    // Set a default view so the map is considered "loaded" immediately
    map.setView([0, 0], 0);

    mapRef.current = map;
    setIsReady(true);

    return () => {
      setIsReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, []); // Remove mapUnit from deps

  useEffect(() => {
    const map = mapRef.current;
    if (!isReady || !map) return;

    const clickHandler = (e: L.LeafletMouseEvent) => {
      onMapClickRef.current?.(e.latlng.lng, e.latlng.lat);
    };

    map.on('click', clickHandler);
    return () => {
      map.off('click', clickHandler);
    };
  }, [isReady]);

  // 3. Image Loading & Sync
  const lastImageRef = useRef<string | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!isReady || !map || !rootMapImage) return;
    if (lastImageRef.current === rootMapImage) return; // Already syncing this image
    
    lastImageRef.current = rootMapImage;

    const img = new Image();
    img.onload = () => {
      if (!mapRef.current || !containerRef.current) return;
      
      try {
        const w = img.width;
        const h = img.height;
        imgWidthRef.current = w;
        
        // Report dimensions back to parent for scale calculation
        onDimensionsDetectedRef.current?.(w, h);

        // Coordinate System: 0,0 is the center of the image
        // Top Left: -w/2, h/2
        // Bottom Right: w/2, -h/2
        const southWest = L.latLng(-h/2, -w/2);
        const northEast = L.latLng(h/2, w/2);
        const bounds = new L.LatLngBounds(southWest, northEast);
        mapBoundsRef.current = bounds;

        // Clear existing overlays
        map.eachLayer((layer) => {
          if (layer instanceof L.ImageOverlay) {
            map.removeLayer(layer);
          }
        });

        L.imageOverlay(rootMapImage, bounds).addTo(map);
        
        // Tight constraints with padding
        const paddedBounds = bounds.pad(0.1);
        map.setMaxBounds(paddedBounds);
        
        if (defaultView) {
          map.setView([defaultView.y, defaultView.x], defaultView.zoom, { animate: false });
        } else {
          // Calculate the zoom level that fits the bounds exactly within the container
          map.fitBounds(bounds, { animate: false, padding: [20, 20] });
        }
        
        const minZoom = map.getBoundsZoom(bounds, true);
        map.setMinZoom(minZoom); 
        if (!defaultView) map.setZoom(minZoom);
      } catch (err) {
        console.warn("Leaflet image sync failed:", err);
      }
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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const point = L.point(x, y);
    const latlng = map.containerPointToLatLng(point);
    
    onLocationPlaceRef.current(locationId, latlng.lng, latlng.lat);
  };

  useEffect(() => {
    if (!isReady || !mapRef.current || !containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!isReady || !mapRef.current || !containerRef.current) return;

    try {
      // Clear existing markers
      mapRef.current.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          mapRef.current?.removeLayer(layer);
        }
      });

      // 1. Add static Location markers
      locations.forEach(loc => {
        if (loc.x !== undefined && loc.y !== undefined) {
          const latlng = L.latLng(loc.y, loc.x);
          
          // Only add marker if it falls within the image bounds (if bounds are set)
          if (mapBoundsRef.current && !mapBoundsRef.current.contains(latlng)) {
            return;
          }

          const style = getMarkerStyle(loc);

          const marker = L.marker(latlng, {
            draggable: true,
            icon: L.divIcon({
              className: 'custom-marker',
              html: `
                <div class="group/marker relative">
                  <div class="w-10 h-10 ${style.color} border-2 border-white rounded-xl shadow-xl cursor-grab active:cursor-grabbing flex items-center justify-center transform transition-all hover:scale-125 hover:z-50 ${loc.type === 'Region' ? 'scale-[2.5] opacity-30 blur-[1px]' : ''}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6">
                      ${style.svg}
                    </svg>
                  </div>
                  
                  <!-- Hover Label -->
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full opacity-0 group-hover/marker:opacity-100 pointer-events-none transition-all pb-2 z-[100] group-hover/marker:-translate-y-[110%]">
                    <div class="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-xl whitespace-nowrap border border-white/20">
                      ${loc.name}
                    </div>
                  </div>

                  <!-- Hover Actions -->
                  <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full opacity-0 group-hover/marker:opacity-100 transition-all z-[100] flex gap-1 group-hover/marker:translate-y-[10%]">
                    <button class="edit-marker-btn p-1.5 bg-white dark:bg-slate-800 text-indigo-600 rounded-lg shadow-lg border border-slate-100 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </button>
                    <button class="remove-marker-btn p-1.5 bg-white dark:bg-slate-800 text-red-500 rounded-lg shadow-lg border border-slate-100 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
              `
            })
          }).addTo(mapRef.current!);

          marker.on('dragend', () => {
            const newPos = marker.getLatLng();
            onLocationMoveRef.current?.(loc.id, newPos.lng, newPos.lat);
          });

          marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            onLocationClickRef.current?.(loc.id);
          });

          // Attach listeners to custom buttons
          marker.on('add', () => {
            const element = marker.getElement();
            if (element) {
              const editBtn = element.querySelector('.edit-marker-btn');
              const removeBtn = element.querySelector('.remove-marker-btn');
              
              if (editBtn) {
                L.DomEvent.on(editBtn as HTMLElement, 'click', (e) => {
                  L.DomEvent.stopPropagation(e);
                  onLocationClickRef.current?.(loc.id);
                });
              }
              
              if (removeBtn) {
                L.DomEvent.on(removeBtn as HTMLElement, 'click', (e) => {
                  L.DomEvent.stopPropagation(e);
                  onLocationUnplaceRef.current?.(loc.id);
                });
              }
            }
          });
        }
      });
    } catch (err) {
      console.warn("Leaflet marker update failed:", err);
    }
  }, [locations]);

  return (
    <div className="w-full h-full relative group/map">
      <style>{`
        .leaflet-control-scale {
          margin-bottom: 24px !important;
          margin-left: 24px !important;
          display: none; /* Hidden until calibrated */
        }
        .leaflet-control-scale-line {
          background: rgba(255, 255, 255, 0.9) !important;
          border: 2px solid #0f172a !important;
          border-top: none !important;
          color: #0f172a !important;
          font-weight: 900 !important;
          font-size: 10px !important;
          padding: 2px 8px !important;
          backdrop-filter: blur(4px);
          border-radius: 0 0 4px 4px;
          white-space: nowrap;
          text-align: center;
        }
        .dark .leaflet-control-scale-line {
          background: rgba(15, 23, 42, 0.9) !important;
          border: 2px solid #6366f1 !important;
          border-top: none !important;
          color: #e2e8f0 !important;
        }
      `}</style>
      <div 
        ref={containerRef} 
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="w-full h-full rounded-3xl overflow-hidden shadow-inner bg-slate-100 dark:bg-slate-900 z-0 relative" 
      />
    </div>
  );
};
