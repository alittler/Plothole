import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Location, TimelineEvent, Character } from '../../types';
interface MapViewProps {
  locations: Location[];
  onLocationClick?: (id: string) => void;
  onMapClick?: (x: number, y: number) => void;
  onLocationPlace?: (id: string, x: number, y: number) => void;
  onDimensionsDetected?: (width: number, height: number) => void;
  rootMapImage?: string;
  mapScale?: number;
  mapUnit?: string;
  zoomInRef?: React.MutableRefObject<(() => void) | null>;
  zoomOutRef?: React.MutableRefObject<(() => void) | null>;
}

export const MapView: React.FC<MapViewProps> = ({ 
  locations, onLocationClick, onMapClick, onLocationPlace, onDimensionsDetected, rootMapImage, mapScale, mapUnit, zoomInRef, zoomOutRef
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapBoundsRef = useRef<L.LatLngBounds | null>(null);
  const [isReady, setIsReady] = useState(false);

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
      minZoom: 0,
      maxZoom: 4,
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: false 
    });

    // Custom Scale with more padding via CSS (added later in return)
    L.control.scale({ 
      imperial: mapUnit !== 'km', 
      metric: mapUnit === 'km', 
      position: 'bottomleft' 
    }).addTo(map);
    
    mapRef.current = map;
    setIsReady(true);

    return () => {
      setIsReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, [mapUnit]); // Recreate scale control if unit changes

  // 2. Image Loading & Sync
  useEffect(() => {
    const map = mapRef.current;
    if (!isReady || !map || !rootMapImage) return;

    const img = new Image();
    img.onload = () => {
      if (!mapRef.current || !containerRef.current) return;
      
      try {
        const w = img.width;
        const h = img.height;
        
        // Report dimensions back to parent for scale calculation
        if (onDimensionsDetected) onDimensionsDetected(w, h);

        const southWest = map.unproject([0, h], map.getMaxZoom());
        const northEast = map.unproject([w, 0], map.getMaxZoom());
        const bounds = new L.LatLngBounds(southWest, northEast);
        mapBoundsRef.current = bounds;

        L.imageOverlay(rootMapImage, bounds).addTo(map);
        map.setMaxBounds(bounds.pad(0.1));
        map.fitBounds(bounds);
        
        const minZoom = map.getBoundsZoom(bounds, true);
        map.setMinZoom(minZoom);
      } catch (err) {
        console.warn("Leaflet image sync failed:", err);
      }
    };
    img.src = rootMapImage;

    map.on('click', (e) => {
      onMapClick?.(e.latlng.lng, e.latlng.lat);
    });

    return () => {
      map.off('click');
    };
  }, [isReady, rootMapImage, onMapClick]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const map = mapRef.current;
    if (!isReady || !map || !containerRef.current) return;
    
    const locationId = e.dataTransfer.getData('locationId');
    if (!locationId || !onLocationPlace) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const point = L.point(x, y);
    const latlng = map.containerPointToLatLng(point);
    
    onLocationPlace(locationId, latlng.lng, latlng.lat);
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
            icon: L.divIcon({
              className: 'custom-marker',
              html: `<div class="w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-lg ${loc.type === 'Region' ? 'scale-[2.5] opacity-30 blur-[1px]' : ''}"></div>`
            })
          }).addTo(mapRef.current!);

          marker.on('click', () => onLocationClick?.(loc.id));
          marker.bindTooltip(loc.name, { permanent: false, direction: 'top' });
        }
      });
    } catch (err) {
      console.warn("Leaflet marker update failed:", err);
    }
  }, [locations, onLocationClick]);

  return (
    <div className="w-full h-full relative group/map">
      <style>{`
        .leaflet-control-scale {
          margin-bottom: 24px !important;
          margin-left: 24px !important;
        }
        .leaflet-control-scale-line {
          background: rgba(255, 255, 255, 0.8) !important;
          border: 2px solid #334155 !important;
          border-top: none !important;
          color: #0f172a !important;
          font-weight: 900 !important;
          font-size: 10px !important;
          padding: 2px 8px !important;
          backdrop-filter: blur(4px);
          border-radius: 0 0 4px 4px;
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
