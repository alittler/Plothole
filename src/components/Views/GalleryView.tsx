import React, { useState, useMemo } from 'react';
import { ProjectData } from '../../types';
import { LayoutGrid, Search, Image as ImageIcon, Maximize2, ExternalLink, Filter, User, MapPin, Box } from 'lucide-react';
import { ViewHeader } from '../Layout/ViewHeader';

interface GalleryViewProps {
  projectData: ProjectData;
  onLinkClick: (type: string, id: string) => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({ projectData, onLinkClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Characters' | 'Locations' | 'Items' | 'Assets'>('All');

  const allImages = useMemo(() => {
    const images: any[] = [];

    // Character images
    (projectData.characters || []).forEach(char => {
      (char.images || []).forEach(img => {
        images.push({
          url: img.url,
          title: char.name,
          subtitle: char.role || 'Character',
          type: 'Characters',
          id: char.id,
          entityType: 'character'
        });
      });
    });

    // Location images
    (projectData.locations || []).forEach(loc => {
      if (loc.mapImage) {
        images.push({
          url: loc.mapImage,
          title: loc.name,
          subtitle: loc.type || 'Location',
          type: 'Locations',
          id: loc.id,
          entityType: 'location'
        });
      }
    });

    // Asset images
    (projectData.assets || []).forEach(asset => {
      if (asset.filename.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
        images.push({
          url: `/api/upload/${asset.filename}`,
          title: asset.filename,
          subtitle: asset.description || 'Asset',
          type: 'Assets',
          id: asset.entity_id || '',
          entityType: 'asset'
        });
      }
    });

    // Entity images
    (projectData.entities || []).forEach(ent => {
      (ent.images || []).forEach(img => {
        images.push({
          url: img.url,
          title: ent.name,
          subtitle: ent.type || 'Entity',
          type: 'Items',
          id: ent.id,
          entityType: 'entity'
        });
      });
    });

    return images;
  }, [projectData]);

  const filteredImages = useMemo(() => {
    return allImages.filter(img => {
      const matchesSearch = 
        img.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        img.subtitle.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = activeFilter === 'All' || img.type === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [allImages, searchTerm, activeFilter]);

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <ViewHeader
        icon={LayoutGrid}
        title="Visual Gallery"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Browse visual records..."
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-8 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {(['All', 'Characters', 'Locations', 'Items', 'Assets'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeFilter === filter 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {filteredImages.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <ImageIcon size={48} className="mb-4 opacity-20" />
                <p className="font-serif italic text-lg">No visual records found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredImages.map((img, idx) => (
                  <div 
                    key={`${img.url}-${idx}`}
                    className="group relative aspect-square bg-slate-200 dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all border border-slate-200 dark:border-slate-800"
                  >
                    <img 
                      src={img.url} 
                      alt={img.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                      <div className="flex items-center gap-2 mb-1">
                        {img.type === 'Characters' && <User size={10} className="text-indigo-400" />}
                        {img.type === 'Locations' && <MapPin size={10} className="text-emerald-400" />}
                        {img.type === 'Items' && <Box size={10} className="text-amber-400" />}
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">{img.subtitle}</span>
                      </div>
                      <h3 className="text-sm font-black text-white uppercase tracking-tight truncate mb-3">{img.title}</h3>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => window.open(img.url, '_blank')}
                          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                          title="View Original"
                        >
                          <Maximize2 size={14} />
                        </button>
                        {img.id && (
                          <button 
                            onClick={() => onLinkClick(img.entityType, img.id)}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                            title="Go to Entity"
                          >
                            <ExternalLink size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
