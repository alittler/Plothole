import React, { useState, useMemo } from 'react';
import { ProjectData, Location } from '../../types';
import { Map, Search, Plus, MapPin, Globe, Compass, Home, Building2, Mountain, Waves, ChevronRight } from 'lucide-react';
import { WikiText } from '../ui/WikiText';
import { ViewHeader } from '../Layout/ViewHeader';

interface LocationsListViewProps {
  projectData: ProjectData;
  onLinkClick: (type: string, id: string) => void;
  onUpdateProject: (updates: Partial<ProjectData>) => void;
}

export const LocationsListView: React.FC<LocationsListViewProps> = ({ projectData, onLinkClick, onUpdateProject }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeType, setActiveType] = useState<string>('All');

  const locations = projectData.locations || [];
  
  const uniqueTypes = useMemo(() => {
    const types = new Set(locations.map(l => l.type || 'Other'));
    return ['All', ...Array.from(types)].sort();
  }, [locations]);

  const filteredLocations = useMemo(() => {
    return locations.filter(loc => {
      const matchesSearch = 
        loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loc.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = activeType === 'All' || loc.type === activeType;

      return matchesSearch && matchesType;
    });
  }, [locations, searchTerm, activeType]);

  const getIcon = (type?: string) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('city') || t.includes('town')) return Home;
    if (t.includes('region') || t.includes('continent')) return Globe;
    if (t.includes('dungeon') || t.includes('fort')) return Building2;
    if (t.includes('mountain') || t.includes('range')) return Mountain;
    if (t.includes('water') || t.includes('sea')) return Waves;
    return MapPin;
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <ViewHeader
        icon={Map}
        title="Cartographic Registry"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Locate region..."
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-8 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {uniqueTypes.map(type => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeType === type 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto space-y-4">
            {filteredLocations.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Compass size={48} className="mb-4 opacity-20" />
                <p className="font-serif italic text-lg">No locations found in the registry.</p>
              </div>
            ) : (
              filteredLocations.map(loc => {
                const Icon = getIcon(loc.type);
                return (
                  <div 
                    key={loc.id}
                    onClick={() => onLinkClick('location', loc.id)}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-xl transition-all group flex items-start gap-6 cursor-pointer"
                  >
                    <div className="w-24 h-24 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors overflow-hidden shrink-0 border border-slate-100 dark:border-slate-800">
                      {loc.mapImage ? (
                        <img src={loc.mapImage} alt={loc.name} className="w-full h-full object-cover" />
                      ) : (
                        <Icon size={32} />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{loc.type || 'Location'}</span>
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-all group-hover:translate-x-1" />
                      </div>
                      
                      <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2 group-hover:text-indigo-600 transition-colors">
                        {loc.name}
                      </h3>
                      
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 font-serif italic">
                        {loc.description || 'No description recorded.'}
                      </p>
                      
                      {loc.controlling_faction && (
                        <div className="mt-4 flex items-center gap-2">
                          <Shield size={12} className="text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Controlled by {loc.controlling_faction}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
