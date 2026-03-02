import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Location } from '../../types';

interface MapViewProps {
  locations: Location[];
  onLocationClick?: (id: string) => void;
  rootMapImage?: string;
  mapScale?: number;
  mapUnit?: string;
}

export const MapView: React.FC<MapViewProps> = ({ locations, onLocationClick, rootMapImage }) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      crs: L.CRS.Simple,
      minZoom: -2,
      maxZoom: 4,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    if (rootMapImage) {
      const img = new Image();
      img.onload = () => {
        const w = img.width;
        const h = img.height;
        const southWest = map.unproject([0, h], map.getMaxZoom() - 1);
        const northEast = map.unproject([w, 0], map.getMaxZoom() - 1);
        const bounds = new L.LatLngBounds(southWest, northEast);

        L.imageOverlay(rootMapImage, bounds).addTo(map);
        map.setMaxBounds(bounds);
        map.fitBounds(bounds);
      };
      img.src = rootMapImage;
    } else {
      map.setView([0, 0], 2);
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [rootMapImage]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Add new markers
    locations.forEach(loc => {
      if (loc.x !== undefined && loc.y !== undefined) {
        const marker = L.marker([loc.y, loc.x], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: `<div class="w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-lg"></div>`
          })
        }).addTo(mapRef.current!);

        marker.on('click', () => onLocationClick?.(loc.id));
        marker.bindTooltip(loc.name, { permanent: false, direction: 'top' });
      }
    });
  }, [locations, onLocationClick]);

  return (
    <div ref={containerRef} className="w-full h-full rounded-3xl overflow-hidden shadow-inner bg-slate-100 dark:bg-slate-900" />
  );
};
