import React, { useState, useCallback } from 'react';
import { ProjectData, EntityCatalog, CatalogEntity } from '../../types';
import EntityForm from '../ui/EntityForm';
import { ChevronDown, Plus, Upload, Trash2, Save } from 'lucide-react';
import { generateId } from '../../services/storageService';

interface DataCatalogViewProps {
  projectData: ProjectData;
  onUpdate: (data: ProjectData) => Promise<void>;
}

export default function DataCatalogView({ projectData, onUpdate }: DataCatalogViewProps) {
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(
    projectData.catalogs?.[0]?.id || null
  );
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [editingEntity, setEditingEntity] = useState<CatalogEntity | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentCatalog = projectData.catalogs?.find(c => c.id === selectedCatalogId);
  const currentEntity = currentCatalog?.entities.find(e => e.id === selectedEntityId);

  const entityTypes = currentCatalog
    ? Array.from(new Set(currentCatalog.entities.map(e => e.type)))
    : [];

  const filteredEntities = currentCatalog
    ? filterType === 'all'
      ? currentCatalog.entities
      : currentCatalog.entities.filter(e => e.type === filterType)
    : [];

  const handleCreateCatalog = useCallback(async () => {
    const catalogId = generateId(8);
    const newCatalog: EntityCatalog = {
      id: catalogId,
      projectId: projectData.id,
      name: `Catalog ${(projectData.catalogs?.length || 0) + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      entities: []
    };

    const updated = { ...projectData, catalogs: [...(projectData.catalogs || []), newCatalog] };
    await onUpdate(updated);
    setSelectedCatalogId(catalogId);
  }, [projectData, onUpdate]);

  const handleDeleteCatalog = useCallback(async (catalogId: string) => {
    if (!confirm('Delete this catalog and all its entities?')) return;

    const updated = {
      ...projectData,
      catalogs: (projectData.catalogs || []).filter(c => c.id !== catalogId)
    };
    await onUpdate(updated);
    setSelectedCatalogId(projectData.catalogs?.[0]?.id || null);
    setSelectedEntityId(null);
  }, [projectData, onUpdate]);

  const handleAddEntity = useCallback(async () => {
    if (!currentCatalog) return;

    const newEntity: CatalogEntity = {
      id: generateId(8),
      type: 'Character',
      name: 'New Entity',
      description: '',
      tier: 1
    };

    const updatedCatalog = {
      ...currentCatalog,
      entities: [...currentCatalog.entities, newEntity],
      updatedAt: Date.now()
    };

    const updated = {
      ...projectData,
      catalogs: (projectData.catalogs || []).map(c => c.id === currentCatalog.id ? updatedCatalog : c)
    };
    await onUpdate(updated);
    setSelectedEntityId(newEntity.id);
    setEditingEntity(newEntity);
  }, [currentCatalog, projectData, onUpdate]);

  const handleUpdateEntity = useCallback(async (entity: CatalogEntity) => {
    setIsSaving(true);
    try {
      if (!currentCatalog) return;

      const updatedCatalog = {
        ...currentCatalog,
        entities: currentCatalog.entities.map(e => e.id === entity.id ? entity : e),
        updatedAt: Date.now()
      };

      const updated = {
        ...projectData,
        catalogs: (projectData.catalogs || []).map(c => c.id === currentCatalog.id ? updatedCatalog : c)
      };
      await onUpdate(updated);
      setEditingEntity(entity);
    } finally {
      setIsSaving(false);
    }
  }, [currentCatalog, projectData, onUpdate]);

  const handleDeleteEntity = useCallback(async (entityId: string) => {
    if (!currentCatalog) return;
    if (!confirm('Delete this entity?')) return;

    const updatedCatalog = {
      ...currentCatalog,
      entities: currentCatalog.entities.filter(e => e.id !== entityId),
      updatedAt: Date.now()
    };

    const updated = {
      ...projectData,
      catalogs: (projectData.catalogs || []).map(c => c.id === currentCatalog.id ? updatedCatalog : c)
    };
    await onUpdate(updated);
    setSelectedEntityId(null);
    setEditingEntity(null);
  }, [currentCatalog, projectData, onUpdate]);

  const handleImportJSON = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.entities || !Array.isArray(data.entities)) {
        alert('Invalid JSON: must have "entities" array');
        return;
      }

      const catalogId = generateId(8);
      const newCatalog: EntityCatalog = {
        id: catalogId,
        projectId: projectData.id,
        name: data.name || file.name.replace('.json', ''),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        entities: data.entities.map((e: any) => ({
          id: e.id || generateId(8),
          type: e.type || 'Unknown',
          name: e.name || 'Untitled',
          description: e.description || '',
          tier: e.tier || 1,
          ...e // Preserve all custom fields
        }))
      };

      const updated = { ...projectData, catalogs: [...(projectData.catalogs || []), newCatalog] };
      await onUpdate(updated);
      setSelectedCatalogId(catalogId);
      setSelectedEntityId(null);
    } catch (err) {
      alert(`Failed to parse JSON: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    e.target.value = ''; // Reset input
  }, [projectData, onUpdate]);

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 p-4">
        <h2 className="text-xl font-bold text-white mb-4">Data Catalog</h2>
        
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleCreateCatalog}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition"
          >
            <Plus size={16} /> New Catalog
          </button>
          
          <label className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm cursor-pointer transition">
            <Upload size={16} /> Import JSON
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>

          {selectedCatalogId && (
            <button
              onClick={() => handleDeleteCatalog(selectedCatalogId)}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition"
            >
              <Trash2 size={16} /> Delete Catalog
            </button>
          )}
        </div>

        {/* Catalog Selector */}
        {projectData.catalogs && projectData.catalogs.length > 0 && (
          <select
            value={selectedCatalogId || ''}
            onChange={(e) => {
              setSelectedCatalogId(e.target.value);
              setSelectedEntityId(null);
              setEditingEntity(null);
            }}
            className="w-full px-3 py-2 bg-slate-800 text-white border border-slate-600 rounded text-sm"
          >
            {projectData.catalogs.map(catalog => (
              <option key={catalog.id} value={catalog.id}>
                {catalog.name} ({catalog.entities.length} entities)
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Entity List */}
        {currentCatalog && (
          <div className="w-64 border-r border-slate-700 bg-slate-950 flex flex-col overflow-hidden">
            {/* Type Filter */}
            <div className="p-3 border-b border-slate-700">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-2 py-1 bg-slate-800 text-white text-sm rounded border border-slate-600"
              >
                <option value="all">All Types</option>
                {entityTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Add Entity Button */}
            <div className="p-3 border-b border-slate-700">
              <button
                onClick={handleAddEntity}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition"
              >
                <Plus size={16} /> Add Entity
              </button>
            </div>

            {/* Entity List */}
            <div className="flex-1 overflow-y-auto">
              {filteredEntities.map(entity => (
                <button
                  key={entity.id}
                  onClick={() => {
                    setSelectedEntityId(entity.id);
                    setEditingEntity(entity);
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-slate-700 transition ${
                    selectedEntityId === entity.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="font-medium text-sm">{entity.name}</div>
                  <div className="text-xs text-slate-400 mt-1">{entity.type}</div>
                  {entity.tier && (
                    <div className="text-xs text-slate-500 mt-1">Tier {entity.tier}</div>
                  )}
                </button>
              ))}
              {filteredEntities.length === 0 && (
                <div className="p-4 text-slate-500 text-sm text-center">No entities</div>
              )}
            </div>
          </div>
        )}

        {/* Entity Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentEntity && editingEntity ? (
            <>
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-white">{editingEntity.name}</h3>
                <button
                  onClick={() => handleDeleteEntity(editingEntity.id)}
                  className="p-2 text-red-400 hover:bg-red-900/20 rounded transition"
                  title="Delete entity"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <EntityForm
                  entity={editingEntity}
                  onUpdate={handleUpdateEntity}
                  isSaving={isSaving}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <p>Select an entity to edit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
