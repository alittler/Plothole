import React, { useState, useEffect } from 'react';
import { ProjectData, User as AppUser } from '../../types';
import { Shield, Sparkles as SparklesIcon, Tag as TagIcon, Hash as HashIcon, Layout as LayoutIcon, X as XIcon, Map as MapIcon, Maximize2 as Maximize2Icon, ChevronRight as ChevronRightIcon, User as UserIconLucide, Heart as HeartIcon, Ruler as RulerIcon, Info as InfoIcon, Image as ImageIcon, Trash2, Link as LinkIcon, Upload, Plus, Copy, Check, Loader2, Clock, Book, PenTool, FileText, Settings } from 'lucide-react';
import { generateId } from '../../services/storageService';

interface MasterBlueprintEditorProps {
  isOpen: boolean;
  onClose: () => void;
  projectData: ProjectData;
  editingCard: { id: string; type: string; data: any } | null;
  onUpdateProject: (updates: Partial<ProjectData>) => void;
  onQuickUpdate: (type: string, id: string, key: string, value: any) => void;
  appPrompts: any;
  currentUser: AppUser;
}

export const MasterBlueprintEditor: React.FC<MasterBlueprintEditorProps> = ({
  isOpen, onClose, projectData, editingCard, onUpdateProject, onQuickUpdate, appPrompts, currentUser
}) => {
  const [previewPromptKey, setPreviewPromptKey] = useState<string | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !editingCard) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingCard) return;

    const currentImages = editingCard.data.images || [];
    if (currentImages.length >= 5) {
      alert("Maximum 5 images allowed.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      
      const result = await response.json();
      const newImages = [...currentImages, { id: generateId(), url: result.url, timestamp: Date.now() }];
      onQuickUpdate(editingCard.type, editingCard.id, 'images', newImages);
    } catch (err) {
      console.error(err);
      alert("Failed to upload image to server.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim() || !editingCard) return;
    const currentImages = editingCard.data.images || [];
    if (currentImages.length >= 5) {
      alert("Maximum 5 images allowed.");
      return;
    }
    const newImages = [...currentImages, { id: generateId(), url: imageUrlInput.trim(), timestamp: Date.now() }];
    onQuickUpdate(editingCard.type, editingCard.id, 'images', newImages);
    setImageUrlInput('');
  };

  const handleRemoveImage = (imgId: string) => {
    if (!editingCard) return;
    const currentImages = editingCard.data.images || [];
    const newImages = currentImages.filter((img: any) => img.id !== imgId);
    onQuickUpdate(editingCard.type, editingCard.id, 'images', newImages);
  };

  const compilePrompt = (template: string, itemData?: any) => {
    if (!projectData) return template;
    
    const charList = projectData.characters?.map(c => `- ${c.name} (${c.role}${c.job ? `, ${c.job}` : ''}): ${c.description}`).join('\n') || 'No characters defined.';
    const locList = projectData.locations?.map(l => `- ${l.name} [${l.type}] (X: ${l.x?.toFixed(1) || '0.0'}, Y: ${l.y?.toFixed(1) || '0.0' }): ${l.description}`).join('\n') || 'No locations defined.';
    const timeList = projectData.timeline?.map(e => `- ${e.date}: ${e.title} - ${e.description}`).join('\n') || 'No timeline events.';
    const loreList = projectData.lore?.map(l => `- ${l.term} [${l.category}]: ${l.definition}`).join('\n') || 'No lore defined.';
    const ledgerList = projectData.ledger?.map(n => `[${new Date(n.timestamp).toLocaleDateString()}] ${n.content}`).join('\n\n') || 'No ledger entries.';
    const themeList = projectData.themes?.join(', ') || 'No themes defined.';
    
    let compiled = template
      .replace(/{title}/g, projectData.title)
      .replace(/{author}/g, projectData.author || 'Unknown')
      .replace(/{summary}/g, projectData.summary || 'No summary.')
      .replace(/{characters}/g, charList)
      .replace(/{locations}/g, locList)
      .replace(/{timeline}/g, timeList)
      .replace(/{ledger}/g, ledgerList)
      .replace(/{lore}/g, loreList)
      .replace(/{themes}/g, themeList)
      .replace(/{user_context}/g, currentUser.name)
      .replace(/{tasks}/g, 'No active tasks.')
      .replace(/{referenceUrls}/g, itemData?.referenceUrls?.join(', ') || 'No Reference URLs.');

    if (itemData) {
      compiled = compiled
        .replace(/{name}/g, itemData.name || itemData.title || itemData.term || 'Untitled')
        .replace(/{type}/g, itemData.type || 'Object')
        .replace(/{role}/g, itemData.role || '')
        .replace(/{job}/g, itemData.job || '')
        .replace(/{x}/g, String(itemData.x || '0.0'))
        .replace(/{y}/g, String(itemData.y || '0.0'))
        .replace(/{description}/g, itemData.description || itemData.definition || itemData.content || '')
        .replace(/{familyName}/g, itemData.familyName || '')
        .replace(/{nickname}/g, itemData.nickname || '')
        .replace(/{age}/g, itemData.age || '')
        .replace(/{birthday}/g, itemData.birthday || '')
        .replace(/{birthplace}/g, itemData.birthplace || '')
        .replace(/{residence}/g, itemData.residence || '')
        .replace(/{height}/g, itemData.height || '')
        .replace(/{weight}/g, itemData.weight || '')
        .replace(/{physicalFeatures}/g, itemData.physicalFeatures || '')
        .replace(/{style}/g, itemData.style || '')
        .replace(/{strengths}/g, itemData.strengths || '')
        .replace(/{weaknesses}/g, itemData.weaknesses || '')
        .replace(/{referenceUrls}/g, itemData.referenceUrls?.join(', ') || '');
    }

    return compiled;
  };

  // ==========================================
  // THE UNIVERSAL SCHEMA
  // Every entity sees every variable, always.
  // ==========================================
  const universalCategories = [
    {
      name: 'Core Identity',
      icon: <InfoIcon size={14} />,
      fields: ['id', 'name', 'title', 'term', 'type', 'category', 'source', 'order', 'status'],
      bg: 'bg-indigo-500/5',
      border: 'border-indigo-500/10'
    },
    {
      name: 'Content & Description',
      icon: <FileText size={14} />,
      fields: ['description', 'definition', 'summary', 'content', 'history', 'significance'],
      bg: 'bg-slate-500/5',
      border: 'border-slate-500/10'
    },
    {
      name: 'Character Details',
      icon: <UserIconLucide size={14} />,
      fields: ['familyName', 'nickname', 'role', 'job', 'species', 'archetype', 'age', 'birthday', 'birthplace', 'residence', 'livingStatus'],
      bg: 'bg-blue-500/5',
      border: 'border-blue-500/10'
    },
    {
      name: 'Physical Traits',
      icon: <RulerIcon size={14} />,
      fields: ['height', 'weight', 'physicalFeatures', 'style', 'strengths', 'weaknesses'],
      bg: 'bg-pink-500/5',
      border: 'border-pink-500/10'
    },
    {
      name: 'Spatial Data',
      icon: <MapIcon size={14} />,
      fields: ['x', 'y', 'lat', 'lng', 'location', 'parentId', 'icon'],
      bg: 'bg-emerald-500/5',
      border: 'border-emerald-500/10'
    },
    {
      name: 'Temporal Data',
      icon: <Clock size={14} />,
      fields: ['date', 'uei', 'lastModified', 'isSoftAnchor', 'referenceEventId', 'timelineEventId'],
      bg: 'bg-amber-500/5',
      border: 'border-amber-500/10'
    },
    {
      name: 'Metrics & System',
      icon: <HashIcon size={14} />,
      fields: ['wordCount', 'score', 'label', 'charactersInvolved', 'relatedIds'],
      bg: 'bg-slate-500/5',
      border: 'border-slate-500/10'
    },
    {
      name: 'Assets & Links',
      icon: <LinkIcon size={14} />,
      fields: ['imageUrl', 'mapImage', 'referenceUrls', 'metadata'],
      bg: 'bg-indigo-500/5',
      border: 'border-indigo-500/10'
    }
  ];

  const renderField = (key: string, value: any) => {
    // Handle arrays (specifically string arrays like referenceUrls)
    if (Array.isArray(value)) {
      if (key === 'referenceUrls' || value.every(v => typeof v === 'string')) {
        const stringArray = value as string[];
        return (
          <div key={key} className="space-y-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{key === 'referenceUrls' ? 'Reference URLs' : key}</label>
              <button 
                onClick={() => {
                  const newItem = window.prompt(`Add new value to ${key === 'referenceUrls' ? 'Reference URLs' : key}:`);
                  if (newItem) onQuickUpdate(editingCard.type, editingCard.id, key, [...stringArray, newItem]);
                }}
                className="p-1 text-indigo-500 hover:text-indigo-600"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-1">
              {stringArray.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center group">
                  <input 
                    type="text" 
                    value={item}
                    onChange={(e) => {
                      const newArr = [...stringArray];
                      newArr[idx] = e.target.value;
                      onQuickUpdate(editingCard.type, editingCard.id, key, newArr);
                    }}
                    className="flex-1 bg-white dark:bg-slate-900 border-none rounded-lg px-2 py-1 text-[10px] font-mono shadow-sm"
                  />
                  <button 
                    onClick={() => {
                      const newArr = stringArray.filter((_, i) => i !== idx);
                      onQuickUpdate(editingCard.type, editingCard.id, key, newArr);
                    }}
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {stringArray.length === 0 && <p className="text-[9px] text-slate-400 italic">No entries yet.</p>}
            </div>
          </div>
        );
      }
      // If it's a complex array and not handled above, fall through to object rendering
    }

    // Render complex objects/arrays as JSON
    if (typeof value === 'object' && value !== null) {
      return (
        <div key={key} className="space-y-1 col-span-1 md:col-span-2">
          <div className="flex justify-between items-center px-1">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</label>
            <code className="text-amber-500 text-[9px] font-mono">{`{${key}}`} (JSON)</code>
          </div>
          <textarea 
            value={JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onQuickUpdate(editingCard.type, editingCard.id, key, parsed);
              } catch (err) {
                // Ignore parse errors while typing, but this means it only updates when valid JSON
              }
            }}
            className="w-full h-32 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-[10px] font-mono leading-relaxed focus:ring-2 focus:ring-amber-500 resize-y shadow-inner outline-none"
          />
        </div>
      );
    }

    return (
      <div key={key} className="space-y-1">
        <div className="flex justify-between items-center px-1">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</label>
          <code className="text-emerald-500 text-[9px] font-mono">{`{${key}}`}</code>
        </div>
        
        {key === 'role' && editingCard.type === 'Character' ? (
          <select 
            value={value}
            onChange={(e) => onQuickUpdate(editingCard.type, editingCard.id, key, e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="Protagonist">Protagonist</option>
            <option value="Antagonist">Antagonist</option>
            <option value="Supporting">Supporting</option>
            <option value="Minor">Minor</option>
          </select>
        ) : typeof value === 'boolean' ? (
          <button 
            onClick={() => onQuickUpdate(editingCard.type, editingCard.id, key, !value)}
            className={`w-full p-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${value ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
          >
            {value ? 'Active / True' : 'Inactive / False'}
          </button>
        ) : (key === 'description' || key === 'content' || key === 'definition' || key === 'summary' || key === 'physicalFeatures' || key === 'style' || key === 'strengths' || key === 'weaknesses' || key === 'goals') ? (
          <textarea 
            value={String(value === undefined ? '' : value)}
            onChange={(e) => onQuickUpdate(editingCard.type, editingCard.id, key, e.target.value)}
            className="w-full h-24 bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-xs leading-relaxed focus:ring-2 focus:ring-emerald-500 resize-none shadow-inner outline-none"
          />
        ) : (
          <input 
            type={typeof value === 'number' ? 'number' : 'text'}
            value={String(value === undefined ? '' : value)}
            readOnly={key === 'id'}
            onChange={(e) => {
              const val = typeof value === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
              onQuickUpdate(editingCard.type, editingCard.id, key, val);
            }}
            className={`w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-xs font-mono shadow-inner focus:ring-2 focus:ring-emerald-500 outline-none ${key === 'id' ? 'opacity-50 grayscale' : ''}`}
          />
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 md:p-8">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full h-full bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300 text-slate-900 dark:text-white">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-6">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
              <HashIcon size={24} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-0.5">
                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full text-[9px] font-black uppercase tracking-widest">
                  {editingCard.type} Blueprint
                </span>
                <span className="text-[9px] font-mono text-slate-400">#{editingCard.id}</span>
              </div>
              <h2 className="text-xl font-black tracking-tighter uppercase">Master Blueprint Editor</h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <XIcon size={24} />
          </button>
        </div>

        {/* Editor Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12">
          <div className="max-w-5xl mx-auto">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
              <TagIcon size={12} /> Master Variable Blueprint
            </h3>

            {(() => {
              const itemKeys = Object.keys(editingCard.data);
              const handledKeys = new Set(universalCategories.flatMap(c => c.fields));
              const unhandledKeys = itemKeys.filter(k => !handledKeys.has(k));

              const finalCategories = [...universalCategories];
              
              if (unhandledKeys.length > 0) {
                finalCategories.push({
                  name: 'Custom Variables',
                  icon: <TagIcon size={14} />,
                  fields: unhandledKeys,
                  bg: 'bg-slate-500/5',
                  border: 'border-slate-500/10'
                });
              }

              return (
                <div className="space-y-12">
                  {finalCategories.map(cat => {
                    return (
                      <div key={cat.name} className={`p-6 rounded-3xl border ${cat.bg} ${cat.border} space-y-6`}>
                        <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-2">
                          <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                            {cat.icon}
                          </div>
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">{cat.name}</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {cat.fields.map(field => renderField(field, editingCard.data[field]))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-4 shrink-0">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
          >
            Sync Blueprint & Close
          </button>
        </div>
      </div>
    </div>
  );
};
