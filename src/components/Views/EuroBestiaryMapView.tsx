import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Book } from 'lucide-react';

interface Creature {
  id: number;
  name: string;
  category: string;
  alignment: string;
  lat: number;
  lon: number;
  lore: string;
}

interface EuroBestiaryMapViewProps {
  selectedCreatureId?: number;
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

export const EuroBestiaryMapView: React.FC<EuroBestiaryMapViewProps> = ({ selectedCreatureId }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [filteredCreatures, setFilteredCreatures] = useState<Creature[]>([]);
  const [selectedCreature, setSelectedCreature] = useState<Creature | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [alignmentFilter, setAlignmentFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);

  // Load creatures data
  useEffect(() => {
    const loadCreatures = async () => {
      try {
        const response = await fetch('/data/creatures.json');
        const data: Creature[] = await response.json();
        setCreatures(data);
        setFilteredCreatures(data);
        
        const uniqueCategories = [...new Set(data.map(c => c.category))].sort();
        setCategories(uniqueCategories);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading creatures:', error);
        setIsLoading(false);
      }
    };

    loadCreatures();
  }, []);

  // Filter creatures
  useEffect(() => {
    let filtered = creatures;

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.lore.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(c => c.category === categoryFilter);
    }

    if (alignmentFilter) {
      filtered = filtered.filter(c => c.alignment === alignmentFilter);
    }

    setFilteredCreatures(filtered);
  }, [searchTerm, categoryFilter, alignmentFilter, creatures]);

  // Initialize map with Leaflet
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current || creatures.length === 0) return;

    // Dynamically load Leaflet to avoid SSR issues
    import('leaflet').then(({ default: L }) => {
      // Initialize map
      const map = L.map(mapContainer.current).setView([54.5260, 15.2551], 3);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add markers for creatures
      creatures.forEach((creature) => {
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

      mapInstance.current = map;
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [creatures]);

  // Update map when selected creature changes
  useEffect(() => {
    if (selectedCreatureId && mapInstance.current) {
      const creature = creatures.find(c => c.id === selectedCreatureId);
      if (creature) {
        setSelectedCreature(creature);
        mapInstance.current.setView([creature.lat, creature.lon], 6);
      }
    }
  }, [selectedCreatureId, creatures]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-slate-600 dark:text-slate-400">Loading creatures...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <MapPin size={24} className="text-indigo-600" />
          European Mythical Creatures Map
        </h2>

        {/* Search and filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search creatures..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Alignment filter */}
          <select
            value={alignmentFilter}
            onChange={(e) => setAlignmentFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Alignments</option>
            {Object.keys(ALIGNMENT_COLORS).map((alignment) => (
              <option key={alignment} value={alignment}>
                {alignment}
              </option>
            ))}
          </select>
        </div>

        {/* Info */}
        <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">
          Showing {filteredCreatures.length} of {creatures.length} creatures
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Map */}
        <div className="flex-1 min-w-0">
          <div ref={mapContainer} className="w-full h-full rounded-lg overflow-hidden bg-white dark:bg-slate-900" />
        </div>

        {/* Sidebar - Selected creature details */}
        {selectedCreature && (
          <div className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto">
            <div className="p-6 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{CATEGORY_ICONS[selectedCreature.category]}</span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {selectedCreature.name}
                  </h3>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-slate-600 dark:text-slate-400">
                    <span className="font-semibold">Category:</span> {selectedCreature.category}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="font-semibold">Alignment:</span>
                    <span
                      className="px-2 py-1 rounded-full text-white text-xs font-semibold"
                      style={{ backgroundColor: ALIGNMENT_COLORS[selectedCreature.alignment] }}
                    >
                      {selectedCreature.alignment}
                    </span>
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">
                    <span className="font-semibold">Location:</span> {selectedCreature.lat.toFixed(2)}°, {selectedCreature.lon.toFixed(2)}°
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <div className="flex items-start gap-2">
                  <Book size={16} className="mt-1 text-indigo-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white mb-2 text-sm">Lore</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {selectedCreature.lore}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
