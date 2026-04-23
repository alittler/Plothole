import React, { useState, useEffect } from 'react';
import { CatalogEntity } from '../../types';
import { Save, X } from 'lucide-react';

interface EntityFormProps {
  entity: CatalogEntity;
  onUpdate: (entity: CatalogEntity) => Promise<void>;
  isSaving?: boolean;
}

export default function EntityForm({ entity, onUpdate, isSaving = false }: EntityFormProps) {
  const [formData, setFormData] = useState<CatalogEntity>(entity);
  const [customFields, setCustomFields] = useState<string[]>([]);

  useEffect(() => {
    setFormData(entity);
    // Identify custom fields (not in standard set)
    const standardFields = ['id', 'type', 'name', 'description', 'tier'];
    const custom = Object.keys(entity).filter(key => !standardFields.includes(key));
    setCustomFields(custom);
  }, [entity]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddField = () => {
    const fieldName = prompt('Field name:');
    if (fieldName) {
      setFormData(prev => ({
        ...prev,
        [fieldName]: ''
      }));
      setCustomFields(prev => [...prev, fieldName]);
    }
  };

  const handleRemoveField = (field: string) => {
    const newData = { ...formData };
    delete newData[field];
    setFormData(newData);
    setCustomFields(prev => prev.filter(f => f !== field));
  };

  const handleSave = async () => {
    await onUpdate(formData);
  };

  const standardFields = ['id', 'type', 'name', 'description', 'tier'];

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Standard Fields */}
      <div className="space-y-3">
        {/* ID (read-only) */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">ID</label>
          <input
            type="text"
            value={formData.id}
            disabled
            className="w-full px-3 py-2 bg-slate-800 text-slate-500 border border-slate-600 rounded cursor-not-allowed"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Type</label>
          <input
            type="text"
            value={formData.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 text-white border border-slate-600 rounded focus:border-blue-500 focus:outline-none"
            placeholder="e.g., Character, Location, Item"
          />
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 text-white border border-slate-600 rounded focus:border-blue-500 focus:outline-none"
            placeholder="Entity name"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 bg-slate-800 text-white border border-slate-600 rounded focus:border-blue-500 focus:outline-none resize-none"
            placeholder="Entity description"
          />
        </div>

        {/* Tier */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Tier</label>
          <select
            value={formData.tier || 1}
            onChange={(e) => handleChange('tier', parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-slate-800 text-white border border-slate-600 rounded focus:border-blue-500 focus:outline-none"
          >
            <option value={1}>Tier 1 (Core)</option>
            <option value={2}>Tier 2 (Supporting)</option>
            <option value={3}>Tier 3 (Background)</option>
          </select>
        </div>
      </div>

      {/* Custom Fields */}
      {customFields.length > 0 && (
        <div className="pt-4 border-t border-slate-700">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Custom Fields</h3>
          <div className="space-y-3">
            {customFields.map(field => (
              <div key={field} className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm text-slate-400 mb-1">{field}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData[field] || ''}
                      onChange={(e) => handleChange(field, e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-800 text-white border border-slate-600 rounded focus:border-blue-500 focus:outline-none text-sm"
                    />
                    <button
                      onClick={() => handleRemoveField(field)}
                      className="px-2 py-2 text-red-400 hover:bg-red-900/20 rounded transition"
                      title="Remove field"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Field Button */}
      <div className="pt-4 border-t border-slate-700">
        <button
          onClick={handleAddField}
          className="text-sm text-blue-400 hover:text-blue-300 transition"
        >
          + Add Custom Field
        </button>
      </div>

      {/* Save Button */}
      <div className="flex gap-2 pt-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded transition"
        >
          <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
