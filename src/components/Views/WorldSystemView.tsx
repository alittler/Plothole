import React, { useState } from 'react';
import { ViewType, ProjectData, Location, Artifact, LoreEntry } from '../../types';
import { Plus, Map as MapIcon, Box, Book, Search, Edit2, Trash2, Maximize2, FileText } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { MapView } from '../ui/MapView';
import { generateId } from '../../services/storageService';

interface WorldSystemViewProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  data: ProjectData;
  onUpdateLocation: (l: Location) => void;
  onAddLocation: (l: Location) => void;
  onUpdateRootMap: (u: string) => void;
  onUpdateRootMapData: (s: number, u: string) => void;
  onLinkClick: (type: string, id: string) => void;
  onUpdateMapOrder: () => void;
  currentMapParentId: string | null;
  onMapChange: (id: string | null) => void;
  onUpdateProject: (updates: Partial<ProjectData>) => void;
  onAddArtifact: (a: Artifact) => void;
  onUpdateArtifact: (a: Artifact) => void;
  onDeleteArtifact: (id: string) => void;
  onAddLore: (l: LoreEntry) => void;
  onDeleteLore: (id: string) => void;
}

enum WorldTab {
  ATLAS = 'Atlas',
  LOCATIONS = 'Locations',
  INVENTORY = 'Inventory',
  ENCYCLOPEDIA = 'Encyclopedia',
  DICTIONARY = 'Dictionary',
  GALLERY = 'Gallery'
}

export const WorldSystemView: React.FC<WorldSystemViewProps> = ({
  data, onAddLocation, onAddArtifact, onAddLore, onUpdateLocation, onUpdateArtifact, onDeleteArtifact, onDeleteLore, onUpdateProject, currentView, onChangeView
}) => {
  const [activeTab, setActiveTab] = useState<WorldTab>(WorldTab.ATLAS);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [editingArtifact, setEditingArtifact] = useState<Artifact | null>(null);

  const handleSaveLocation = () => {
    if (editingLocation) {
      onUpdateLocation(editingLocation);
      setEditingLocation(null);
    }
  };

  const handleSaveArtifact = () => {
    if (editingArtifact) {
      onUpdateArtifact(editingArtifact);
      setEditingArtifact(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="p-4 md:p-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">WORLD HUB</h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Geography, artifacts, and the lore of your universe.</p>
          </div>
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto no-scrollbar">
            {[WorldTab.ATLAS, WorldTab.LOCATIONS, WorldTab.INVENTORY, WorldTab.ENCYCLOPEDIA, WorldTab.DICTIONARY, WorldTab.GALLERY].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-12">
          {activeTab === WorldTab.ATLAS && (
            <div className="h-[600px] w-full">
              <MapView 
                locations={data.locations} 
                rootMapImage={data.rootMapImage} 
                onLocationClick={(id) => {
                  const loc = data.locations.find(l => l.id === id);
                  if (loc) setEditingLocation(loc);
                }}
              />
            </div>
          )}

          {activeTab === WorldTab.LOCATIONS && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <MapIcon size={20} className="text-emerald-500" /> Locations
                </h2>
                <button onClick={() => onAddLocation({ id: Math.random().toString(), name: 'New Location', description: '', type: 'City', source: 'manual' })} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors flex items-center gap-2">
                  <Plus size={16} /> Add Location
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.locations.map(loc => (
                  <div key={loc.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{loc.type}</span>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingLocation(loc)} className="text-slate-300 hover:text-indigo-500"><Edit2 size={14} /></button>
                        <button onClick={() => onUpdateProject({ locations: data.locations.filter(l => l.id !== loc.id) })} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{loc.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{loc.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === WorldTab.INVENTORY && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Box size={20} className="text-amber-500" /> Artifacts
                </h2>
                <button onClick={() => onAddArtifact({ id: Math.random().toString(), name: 'New Artifact', type: 'Relic', description: '', source: 'manual' })} className="px-4 py-2 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-colors flex items-center gap-2">
                  <Box size={16} /> Add Artifact
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.artifacts?.map(art => (
                  <div key={art.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{art.type}</span>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingArtifact(art)} className="text-slate-300 hover:text-indigo-500"><Edit2 size={14} /></button>
                        <button onClick={() => onDeleteArtifact(art.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{art.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{art.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === WorldTab.ENCYCLOPEDIA && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Book size={20} className="text-indigo-500" /> Encyclopedia
                </h2>
                <button 
                  onClick={() => onAddLore({ id: generateId(), term: 'New Entry', definition: '', category: 'General', source: 'manual' })}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <Plus size={16} /> Add Entry
                </button>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
                {data.lore?.filter(l => l.category !== 'Dictionary').map(entry => (
                  <div key={entry.id} className="p-6 flex items-start justify-between group">
                    <div>
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{entry.category}</span>
                      <h4 className="font-bold text-slate-900 dark:text-white text-lg">{entry.term}</h4>
                      <p className="text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">{entry.definition}</p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onDeleteLore(entry.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                  </div>
                )) || <p className="p-8 text-center text-slate-400 italic">No encyclopedia entries yet.</p>}
              </div>
            </section>
          )}

          {activeTab === WorldTab.DICTIONARY && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <FileText size={20} className="text-emerald-500" /> Dictionary
                </h2>
                <button 
                  onClick={() => onAddLore({ id: generateId(), term: 'New Word', definition: '', category: 'Dictionary', source: 'manual' })}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                  <Plus size={16} /> Add Word
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.lore?.filter(l => l.category === 'Dictionary').map(entry => (
                  <div key={entry.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Term</span>
                      <button onClick={() => onDeleteLore(entry.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-xl font-serif italic">{entry.term}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{entry.definition}</p>
                  </div>
                )) || <p className="col-span-2 p-8 text-center text-slate-400 italic">No dictionary entries yet.</p>}
              </div>
            </section>
          )}

          {activeTab === WorldTab.GALLERY && (
            <div className="h-full flex items-center justify-center text-slate-400 italic">
              Gallery feature coming soon.
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={!!editingLocation} onClose={() => setEditingLocation(null)} title="Edit Location" footer={<button onClick={handleSaveLocation} className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold">Save</button>}>
        {editingLocation && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Name</label><input type="text" value={editingLocation.name} onChange={e => setEditingLocation({...editingLocation, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2" /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Type</label><input type="text" value={editingLocation.type} onChange={e => setEditingLocation({...editingLocation, type: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2" /></div>
            </div>
            <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Description</label><textarea value={editingLocation.description} onChange={e => setEditingLocation({...editingLocation, description: e.target.value})} className="w-full h-32 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 resize-none" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Map X</label><input type="number" value={editingLocation.x || 0} onChange={e => setEditingLocation({...editingLocation, x: parseFloat(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2" /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Map Y</label><input type="number" value={editingLocation.y || 0} onChange={e => setEditingLocation({...editingLocation, y: parseFloat(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2" /></div>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!editingArtifact} onClose={() => setEditingArtifact(null)} title="Edit Artifact" footer={<button onClick={handleSaveArtifact} className="px-6 py-2 bg-amber-600 text-white rounded-xl font-bold">Save</button>}>
        {editingArtifact && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Name</label><input type="text" value={editingArtifact.name} onChange={e => setEditingArtifact({...editingArtifact, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2" /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Type</label><input type="text" value={editingArtifact.type} onChange={e => setEditingArtifact({...editingArtifact, type: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2" /></div>
            </div>
            <div className="space-y-1"><label className="text-xs font-bold text-slate-400 uppercase">Description</label><textarea value={editingArtifact.description} onChange={e => setEditingArtifact({...editingArtifact, description: e.target.value})} className="w-full h-32 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 resize-none" /></div>
          </div>
        )}
      </Modal>
    </div>
  );
};
