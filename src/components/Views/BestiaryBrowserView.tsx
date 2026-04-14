import React, { useState, useEffect } from 'react';
import L from 'leaflet';
import { Search, ChevronDown, ChevronUp, MapPin, Wand2, Download } from 'lucide-react';
import creaturesData from '@alittler/creatures';

interface Creature {
  id: number;
  name: string;
  category: string;
  alignment: string;
  lat: number;
  lon: number;
  lore: string;
}

interface BestiaryBrowserViewProps {
  onImportCreature?: (creature: Creature) => void;
  selectedCreatureId?: number | null;
}

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export const BestiaryBrowserView: React.FC<BestiaryBrowserViewProps> = ({ onImportCreature, selectedCreatureId }) => {
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [filteredCreatures, setFilteredCreatures] = useState<Creature[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedAlignment, setSelectedAlignment] = useState<string>('All');
  const [selectedCreature, setSelectedCreature] = useState<Creature | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [alignments, setAlignments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCreatureId, setExpandedCreatureId] = useState<string | null>(null);

  const mapRef = React.useRef<L.Map | null>(null);
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const markerLayerRef = React.useRef<L.LayerGroup | null>(null);
  const markersRef = React.useRef<{ [key: string]: L.Marker }>({});

  // Load creatures data from package
  useEffect(() => {
    try {
      setCreatures(creaturesData);
      
      // Extract unique categories and alignments
      const uniqueCategories = ['All', ...Array.from(new Set(creaturesData.map(c => c.category)))];
      const uniqueAlignments = ['All', ...Array.from(new Set(creaturesData.map(c => c.alignment)))];
      
      setCategories(uniqueCategories);
      setAlignments(uniqueAlignments);
      setFilteredCreatures(creaturesData);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading creatures:', error);
      setIsLoading(false);
    }
  }, []);

  // Handle selectedCreatureId from parent
  useEffect(() => {
    if (selectedCreatureId && creatures.length > 0) {
      const creature = creatures.find(c => c.id === selectedCreatureId);
      if (creature) {
        setSelectedCreature(creature);
        setExpandedCreatureId(creature.id.toString());
        // Scroll sidebar to show the creature
        const element = document.getElementById(`creature-${creature.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-purple-500');
          setTimeout(() => element.classList.remove('ring-2', 'ring-purple-500'), 2000);
        }
      }
    }
  }, [selectedCreatureId, creatures]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([54.5260, 15.2551], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Create and add marker layer
    const markerLayer = L.layerGroup();
    markerLayer.addTo(map);
    markerLayerRef.current = markerLayer;

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  // Update markers on map
  useEffect(() => {
    if (!mapRef.current || !markerLayerRef.current) return;

    // Clear old markers
    markerLayerRef.current.clearLayers();
    markersRef.current = {};

    // Add new markers
    filteredCreatures.forEach(creature => {
      if (creature.lat && creature.lon) {
        const marker = L.marker([creature.lat, creature.lon])
          .bindPopup(`
            <div style="font-weight: bold; margin-bottom: 5px; font-size: 14px;">${creature.name}</div>
            <div style="font-size: 12px; color: #666;">
              <div><strong>Category:</strong> ${creature.category || 'N/A'}</div>
              <div><strong>Alignment:</strong> ${creature.alignment || 'N/A'}</div>
              ${creature.lore ? `<div style="margin-top: 5px; font-size: 11px; max-width: 200px;">${creature.lore.substring(0, 150)}...</div>` : ''}
            </div>
          `)
          .on('click', () => setSelectedCreature(creature))
          .addTo(markerLayerRef.current!);

        markersRef.current[creature.id] = marker;
      }
    });

    // Fit bounds if creatures exist
    if (filteredCreatures.length > 0 && Object.keys(markersRef.current).length > 0) {
      const group = new L.FeatureGroup(Object.values(markersRef.current));
      mapRef.current.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  }, [filteredCreatures]);

  // Filter creatures
  useEffect(() => {
    let filtered = creatures;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(query) ||
        (c.lore && c.lore.toLowerCase().includes(query))
      );
    }

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(c => c.category === selectedCategory);
    }

    if (selectedAlignment !== 'All') {
      filtered = filtered.filter(c => c.alignment === selectedAlignment);
    }

    setFilteredCreatures(filtered);
  }, [searchQuery, selectedCategory, selectedAlignment, creatures]);

  return (
    <div className="h-full w-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header */}
      <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Wand2 className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">European Bestiary</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Explore 213 mythical creatures from European folklore & legend</p>
            </div>
          </div>
          {/* Attribution */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dataset sourced from{' '}
              <a
                href="https://github.com/alittler/euro-bestiary"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
              >
                alittler/euro-bestiary
              </a>
              {' '}on GitHub
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full w-full flex gap-4 p-4 md:p-8">
          {/* Map */}
          <div className="flex-1 min-w-0 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg bg-white dark:bg-slate-900">
            {isLoading ? (
              <div className="h-full w-full flex items-center justify-center text-slate-500 dark:text-slate-400">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-slate-300 dark:border-slate-600 border-t-purple-600 dark:border-t-purple-400 rounded-full mx-auto mb-3"></div>
                  <p>Loading creatures...</p>
                </div>
              </div>
            ) : (
              <div ref={mapContainerRef} className="h-full w-full" />
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full md:w-96 flex flex-col bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden">
            {/* Search & Filters */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-4 flex-shrink-0">
              {/* Search */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search creatures..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Alignment Filter */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Alignment</label>
                <select
                  value={selectedAlignment}
                  onChange={(e) => setSelectedAlignment(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
                >
                  {alignments.map(align => (
                    <option key={align} value={align}>{align}</option>
                  ))}
                </select>
              </div>

              {/* Stats */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-600 dark:text-slate-400">
                <p>Showing <strong className="text-slate-900 dark:text-white">{filteredCreatures.length}</strong> of <strong className="text-slate-900 dark:text-white">{creatures.length}</strong> creatures</p>
              </div>
            </div>

            {/* Creatures List */}
            <div className="flex-1 overflow-y-auto">
              {filteredCreatures.length === 0 ? (
                <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                  <p>No creatures found</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredCreatures.map(creature => (
                    <div
                      id={`creature-${creature.id}`}
                      key={creature.id}
                      className={`p-3 cursor-pointer transition-colors ${
                        selectedCreature?.id === creature.id
                          ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-600'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                      onClick={() => {
                        setSelectedCreature(creature);
                        if (creature.lat && creature.lon) {
                          mapRef.current?.setView([creature.lat, creature.lon], 8);
                          markersRef.current[creature.id]?.openPopup();
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white text-sm">{creature.name}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{creature.category} • {creature.alignment}</p>
                          {creature.lore && expandedCreatureId === creature.id && (
                            <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">{creature.lore}</p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCreatureId(expandedCreatureId === creature.id ? null : creature.id);
                          }}
                          className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0"
                        >
                          {expandedCreatureId === creature.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {onImportCreature && expandedCreatureId === creature.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onImportCreature(creature);
                          }}
                          className="mt-2 w-full px-3 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors flex items-center justify-center gap-2"
                        >
                          <Download className="w-3 h-3" />
                          Import to Project
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
