import React, { useState, useMemo } from 'react';
import { ProjectData, HierarchicalEntity } from '../../types';
import { Box, Search, Plus, Filter, Package, Shield, Sword, FlaskConical, Coins, ChevronRight } from 'lucide-react';
import { WikiText } from '../ui/WikiText';
import { ViewHeader } from '../Layout/ViewHeader';

interface InventoryViewProps {
  projectData: ProjectData;
  onLinkClick: (type: string, id: string) => void;
  onUpdateProject: (updates: Partial<ProjectData>) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ projectData, onLinkClick, onUpdateProject }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeType, setActiveType] = useState<string>('All');

  const entities = projectData.entities || [];
  
  // Filter for item-like entities
  const items = useMemo(() => {
    const itemTypes = ['Item', 'Artifact', 'Weapon', 'Armor', 'Consumable', 'Currency', 'Relic'];
    return entities.filter(e => 
      itemTypes.includes(e.type || '') || 
      e.role?.toLowerCase().includes('item') ||
      e.role?.toLowerCase().includes('artifact')
    );
  }, [entities]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(items.map(i => i.type || 'Other'));
    return ['All', ...Array.from(types)].sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = activeType === 'All' || item.type === activeType;

      return matchesSearch && matchesType;
    });
  }, [items, searchTerm, activeType]);

  const getIcon = (type?: string) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('weapon') || t.includes('sword')) return Sword;
    if (t.includes('armor') || t.includes('shield')) return Shield;
    if (t.includes('consumable') || t.includes('potion')) return FlaskConical;
    if (t.includes('currency') || t.includes('coin')) return Coins;
    return Package;
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <ViewHeader
        icon={Box}
        title="Artifact Inventory"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Locate artifact..."
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
          <div className="max-w-7xl mx-auto">
            {filteredItems.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Package size={48} className="mb-4 opacity-20" />
                <p className="font-serif italic text-lg">No items found in the treasury.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map(item => {
                  const Icon = getIcon(item.type);
                  return (
                    <div 
                      key={item.id}
                      onClick={() => onLinkClick('admin', item.id)}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-xl transition-all group cursor-pointer border-t-4"
                      style={{ borderTopColor: item.type === 'Artifact' ? '#818cf8' : '#cbd5e1' }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 group-hover:text-indigo-500 transition-colors">
                          <Icon size={18} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.type || 'Item'}</span>
                      </div>
                      
                      <h3 className="text-md font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2 truncate group-hover:text-indigo-600 transition-colors">
                        {item.name}
                      </h3>
                      
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 font-serif italic leading-relaxed">
                        {item.description || 'No description recorded.'}
                      </p>
                      
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600 uppercase">Tier {item.tier || 3}</span>
                        <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition-all group-hover:translate-x-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
