import L from 'leaflet';

/**
 * Maps A1-H7 grid cells to approximate Lat/Lon coordinates.
 * Bounds: North 70, South 32, West -22, East 50.
 * 
 * Grid layout:
 * Row 1: Latitude 70
 * Row 2: Latitude 64
 * Row 3: Latitude 57
 * Row 4: Latitude 50
 * Row 5: Latitude 44
 * Row 6: Latitude 38
 * Row 7: Latitude 32
 * 
 * Col A: Longitude -22
 * Col B: Longitude -10
 * Col C: Longitude -1
 * Col D: Longitude 9
 * Col E: Longitude 19
 * Col F: Longitude 30
 * Col G: Longitude 40
 * Col H: Longitude 50
 */
export function gridToLatLon(grid: string): [number, number] {
  const lngMap: Record<string, number> = { A: -22, B: -10, C: -1, D: 9, E: 19, F: 30, G: 40, H: 50 };
  const latMap: Record<string, number> = { 1: 70, 2: 64, 3: 57, 4: 50, 5: 44, 6: 38, 7: 32 };

  if (grid.includes("Greece")) return [38.5, 23.5];
  
  const col = grid.charAt(0).toUpperCase();
  const row = grid.match(/\d/)?.[0] || "4";

  return [latMap[row] || 50, lngMap[col] || 15];
}

/**
 * Creates a grid layer for the map showing A1-H7 cells as rectangles
 * Bounds: North 70, South 32, West -22, East 50
 */
export function createGridLayer(): L.LayerGroup {
  const layerGroup = L.layerGroup();
  
  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const rows = [1, 2, 3, 4, 5, 6, 7];
  
  // Direct coordinate mappings
  const lngMap: Record<string, number> = { A: -22, B: -10, C: -1, D: 9, E: 19, F: 30, G: 40, H: 50 };
  const latMap: Record<string, number> = { 1: 70, 2: 64, 3: 57, 4: 50, 5: 44, 6: 38, 7: 32 };
  
  const colKeys = Object.keys(lngMap) as (keyof typeof lngMap)[];
  const rowKeys = Object.keys(latMap) as (keyof typeof latMap)[];
  
  // Create rectangles for each grid cell
  colKeys.forEach((col, colIndex) => {
    rowKeys.forEach((row, rowIndex) => {
      const cellName = `${col}${row}`;
      
      // Get coordinates for this cell
      const lng = lngMap[col];
      const lat = latMap[row];
      
      // Calculate bounds to next cell (or edge)
      const nextLng = colKeys[colIndex + 1] ? lngMap[colKeys[colIndex + 1]] : 60;
      const nextLat = rowKeys[rowIndex + 1] ? latMap[rowKeys[rowIndex + 1]] : 28;
      
      const west = lng;
      const east = nextLng;
      const south = nextLat;
      const north = lat;
      
      const bounds = L.latLngBounds(
        L.latLng(south, west),
        L.latLng(north, east)
      );
      
      // Create rectangle
      const rectangle = L.rectangle(bounds, {
        color: '#6366f1',
        weight: 1,
        opacity: 0.3,
        fill: true,
        fillColor: '#6366f1',
        fillOpacity: 0.05,
        interactive: true,
        className: 'grid-cell'
      });
      
      // Add tooltip with grid cell name
      rectangle.bindTooltip(cellName, {
        permanent: false,
        direction: 'center',
        className: 'grid-tooltip',
        offset: L.point(0, 0)
      });
      
      rectangle.addTo(layerGroup);
    });
  });
  
  // Add grid labels at cell centers
  colKeys.forEach((col, colIndex) => {
    rowKeys.forEach((row) => {
      const cellName = `${col}${row}`;
      const lng = lngMap[col];
      const lat = latMap[row];
      
      // Calculate center of cell
      const nextLng = colKeys[colIndex + 1] ? lngMap[colKeys[colIndex + 1]] : 60;
      const nextRowIdx = Object.keys(latMap).indexOf(row as any) + 1;
      const nextLat = nextRowIdx < Object.keys(latMap).length ? latMap[Object.keys(latMap)[nextRowIdx] as any] : 28;
      
      const centerLat = (lat + nextLat) / 2;
      const centerLng = (lng + nextLng) / 2;
      
      // Create text label using a marker with custom icon
      const label = L.marker(L.latLng(centerLat, centerLng), {
        icon: L.divIcon({
          className: 'grid-label',
          html: `<div style="font-size: 11px; font-weight: bold; color: #6366f1; user-select: none; pointer-events: none;">${cellName}</div>`,
          iconSize: [30, 20],
          iconAnchor: [15, 10]
        }),
        interactive: false
      });
      
      label.addTo(layerGroup);
    });
  });
  
  return layerGroup;
}
