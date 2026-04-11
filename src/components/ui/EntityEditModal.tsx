import React, { useState, useEffect } from 'react';
import { HierarchicalEntity, EntityTier } from '../../types';
import { Modal } from './Modal';
import { Save, Trash2, X, Plus } from 'lucide-react';

interface EntityEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: HierarchicalEntity | null;
  onSave: (updatedEntity: HierarchicalEntity) => void;
  onDelete?: (id: string) => void;
}

export const EntityEditModal: React.FC<EntityEditModalProps> = ({
  isOpen,
  onClose,
  entity,
  onSave,
  onDelete
}) => {
  const [formData, setFormData] = useState<HierarchicalEntity | null>(null);

  useEffect(() => {
    if (entity) {
      setFormData({ ...entity });
    } else {
      setFormData(null);
    }
  }, [entity, isOpen]);

  if (!formData) return null;

  const handleChange = (field: keyof HierarchicalEntity, value: any) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleTraitChange = (index: number, value: string) => {
    const newTraits = [...(formData.traits || [])];
    newTraits[index] = value;
    handleChange('traits', newTraits);
  };

  const addTrait = () => {
    handleChange('traits', [...(formData.traits || []), '']);
  };

  const removeTrait = (index: number) => {
    handleChange('traits', (formData.traits || []).filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (formData) {
      onSave(formData);
      onClose();
    }
  };

  const footer = (
    <div className="flex justify-between w-full">
      {onDelete && entity?.id && (
        <button
          onClick={() => {
            if (confirm('Are you sure you want to delete this character?')) {
              onDelete(entity.id);
              onClose();
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all"
        >
          <Trash2 size={16} /> Delete Character
        </button>
      )}
      <div className="flex gap-3 ml-auto">
        <button onClick={onClose} className="ph-button-ghost">
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
        >
          <Save size={18} /> Save Changes
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={entity?.id ? `Edit ${formData.name}` : 'New Character'}
      footer={footer}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-8 py-4">
        {/* Basic Info Section */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800 pb-2">
            Basic Identification
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Species / Ethnicity</label>
              <input
                type="text"
                value={formData.species || ''}
                onChange={e => handleChange('species', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Role / Job Title</label>
              <input
                type="text"
                value={formData.role || formData.jobTitle || ''}
                onChange={e => handleChange('role', e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Narrative Tier</label>
              <select
                value={formData.tier}
                onChange={e => handleChange('tier', parseInt(e.target.value) as EntityTier)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value={1}>Tier 1 (Core Protagonist)</option>
                <option value={2}>Tier 2 (Supporting Cast)</option>
                <option value={3}>Tier 3 (Background / Minor)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Narrative Section */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800 pb-2">
            Narrative Profile
          </h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">General Description</label>
              <textarea
                value={formData.description || ''}
                onChange={e => handleChange('description', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Goals & Motivation</label>
              <textarea
                value={formData.motivation || ''}
                onChange={e => handleChange('motivation', e.target.value)}
                rows={2}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Internal / External Conflict</label>
              <textarea
                value={formData.conflict || ''}
                onChange={e => handleChange('conflict', e.target.value)}
                rows={2}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>
          </div>
        </section>

        {/* Details & Traits */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800 pb-2">
              Personal Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Age</label>
                <input
                  type="text"
                  value={formData.age || ''}
                  onChange={e => handleChange('age', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nationality</label>
                <input
                  type="text"
                  value={formData.nationality || ''}
                  onChange={e => handleChange('nationality', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                <input
                  type="text"
                  value={formData.gender || ''}
                  onChange={e => handleChange('gender', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Residence</label>
                <input
                  type="text"
                  value={formData.homeLocation || ''}
                  onChange={e => handleChange('homeLocation', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Character Traits
              </h3>
              <button onClick={addTrait} className="text-indigo-600 hover:text-indigo-700 p-1">
                <Plus size={16} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(formData.traits || []).map((trait, index) => (
                <div key={index} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <input
                    type="text"
                    value={trait}
                    onChange={e => handleTraitChange(index, e.target.value)}
                    className="bg-transparent border-none text-[10px] font-bold uppercase tracking-widest outline-none w-24"
                    autoFocus={trait === ''}
                  />
                  <button onClick={() => removeTrait(index)} className="text-slate-400 hover:text-rose-500">
                    <X size={12} />
                  </button>
                </div>
              ))}
              <button onClick={addTrait} className="px-3 py-1.5 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-indigo-500 hover:text-indigo-500 transition-all">
                + Add Trait
              </button>
            </div>
          </div>
        </section>
      </div>
    </Modal>
  );
};
