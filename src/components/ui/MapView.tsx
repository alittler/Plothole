import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Location, TimelineEvent, Character } from '../../types';
interface MapViewProps {
  locations: Location[];
  onLocationClick?: (id: string) => void;
  onMapClick?: (x: number, y: number) => void;
  onLocationPlace?: (id: string, x: number, y: number) => void;
  onLocationMove?: (id: string, x: number, y: number) => void;
  onDimensionsDetected?: (width: number, height: number) => void;
  rootMapImage?: string;
  mapScale?: number;
  mapUnit?: string;
  zoomInRef?: React.MutableRefObject<(() => void) | null>;
  zoomOutRef?: React.MutableRefObject<(() => void) | null>;
}

export const MapView: React.FC<MapViewProps> = ({ 
  locations, onLocationClick, onMapClick, onLocationPlace, onLocationMove, onDimensionsDetected, rootMapImage, mapScale, mapUnit, zoomInRef, zoomOutRef
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapBoundsRef = useRef<L.LatLngBounds | null>(null);
  const imgWidthRef = useRef<number>(1);
  const [isReady, setIsReady] = useState(false);

  // Use refs for callbacks to prevent effect re-triggering
  const onMapClickRef = useRef(onMapClick);
  const onDimensionsDetectedRef = useRef(onDimensionsDetected);
  const onLocationPlaceRef = useRef(onLocationPlace);
  const onLocationMoveRef = useRef(onLocationMove);
  const onLocationClickRef = useRef(onLocationClick);
  const mapScaleRef = useRef(mapScale);
  const mapUnitRef = useRef(mapUnit);

  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);
  useEffect(() => { onDimensionsDetectedRef.current = onDimensionsDetected; }, [onDimensionsDetected]);
  useEffect(() => { onLocationPlaceRef.current = onLocationPlace; }, [onLocationPlace]);
  useEffect(() => { onLocationMoveRef.current = onLocationMove; }, [onLocationMove]);
  useEffect(() => { onLocationClickRef.current = onLocationClick; }, [onLocationClick]);
  useEffect(() => { mapScaleRef.current = mapScale; }, [mapScale]);
  useEffect(() => { mapUnitRef.current = mapUnit; }, [mapUnit]);

  // Force scale update when props change
  useEffect(() => {
    if (isReady && mapRef.current) {
      mapRef.current.fire('resize');
    }
  }, [mapScale, mapUnit, isReady]);

  // Expose zoom methods to parent
  useEffect(() => {
    if (zoomInRef) zoomInRef.current = () => mapRef.current?.zoomIn();
    if (zoomOutRef) zoomOutRef.current = () => mapRef.current?.zoomOut();
  }, [zoomInRef, zoomOutRef]);

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

  // 2. Handle Map Clicks (Separate from image sync)
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

        const southWest = map.unproject([0, h], map.getMaxZoom());
        const northEast = map.unproject([w, 0], map.getMaxZoom());
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
        const paddedBounds = bounds.pad(0.5);
        map.setMaxBounds(paddedBounds);
        map.fitBounds(bounds, { animate: false, padding: [40, 40] });
        
        // Calculate min zoom such that image fits container perfectly
        const minZoom = map.getBoundsZoom(bounds, true);
        map.setMinZoom(minZoom - 1); // Allow zooming out a bit more
        map.setZoom(minZoom);
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

          const marker = L.marker(latlng, {
            draggable: true,
            icon: L.divIcon({
              className: 'custom-marker',
              html: `<div class="w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-lg cursor-grab active:cursor-grabbing ${loc.type === 'Region' ? 'scale-[2.5] opacity-30 blur-[1px]' : ''}"></div>`
            })
          }).addTo(mapRef.current!);

          marker.on('dragend', () => {
            const newPos = marker.getLatLng();
            onLocationMoveRef.current?.(loc.id, newPos.lng, newPos.lat);
          });

          marker.on('click', () => onLocationClickRef.current?.(loc.id));
          marker.bindTooltip(loc.name, { permanent: false, direction: 'top' });
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
