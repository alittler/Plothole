import React, { useState, useEffect } from 'react';
import { ProjectData } from '../../types';
import { Shield, Sparkles as SparklesIcon, Tag as TagIcon, Hash as HashIcon, Layout as LayoutIcon, X as XIcon, Map as MapIcon, Maximize2 as Maximize2Icon, ChevronRight as ChevronRightIcon, User as UserIconLucide, Heart as HeartIcon, Ruler as RulerIcon, Info as InfoIcon, Image as ImageIcon, Trash2, Link as LinkIcon, Upload, Plus, Copy, Check, Loader2 } from 'lucide-react';
import { generateId } from '../../services/storageService';

interface MasterBlueprintEditorProps {
  isOpen: boolean;
  onClose: () => void;
  projectData: ProjectData;
  editingCard: { id: string; type: string; data: any } | null;
  onUpdateProject: (updates: Partial<ProjectData>) => void;
  onQuickUpdate: (type: string, id: string, key: string, value: any) => void;
  appPrompts: any;
}

export const MasterBlueprintEditor: React.FC<MasterBlueprintEditorProps> = ({
  isOpen, onClose, projectData, editingCard, onUpdateProject, onQuickUpdate, appPrompts
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
    
    const charList = projectData.characters?.map(c => `- ${c.name} (${c.role}): ${c.description}`).join('\n') || 'No characters defined.';
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
      .replace(/{user_context}/g, 'Lead Architect')
      .replace(/{tasks}/g, 'No active tasks.');

    if (itemData) {
      compiled = compiled
        .replace(/{name}/g, itemData.name || itemData.title || itemData.term || 'Untitled')
        .replace(/{type}/g, itemData.type || 'Object')
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
        .replace(/{weaknesses}/g, itemData.weaknesses || '');
    }

    return compiled;
  };

  const variables = [
    { title: "Project Title", var: "{title}" },
    { title: "Author Name", var: "{author}" },
    { title: "Full Summary", var: "{summary}" },
    { title: "Character List", var: "{characters}" },
    { title: "World Locations", var: "{locations}" },
    { title: "Timeline Events", var: "{timeline}" },
    { title: "Project Ledger", var: "{ledger}" },
    { title: "Lore & Mythos", var: "{lore}" },
    { title: "Core Themes", var: "{themes}" },
    { title: "User Context", var: "{user_context}" },
    { title: "Active Tasks", var: "{tasks}" },
    { title: "Item Name", var: "{name}" },
    { title: "Item Type", var: "{type}" },
    { title: "Coordinate X", var: "{x}" },
    { title: "Coordinate Y", var: "{y}" },
    { title: "Item Data", var: "{description}" },
    { title: "Family Name", var: "{familyName}" },
    { title: "Nickname", var: "{nickname}" },
    { title: "Age", var: "{age}" },
    { title: "Birthday", var: "{birthday}" },
    { title: "Birthplace", var: "{birthplace}" },
    { title: "Residence", var: "{residence}" },
    { title: "Height", var: "{height}" },
    { title: "Weight", var: "{weight}" },
    { title: "Physical Features", var: "{physicalFeatures}" },
    { title: "Style", var: "{style}" },
    { title: "Strengths", var: "{strengths}" },
    { title: "Weaknesses", var: "{weaknesses}" }
  ];

  const characterCategories = [
    {
      name: 'Identity',
      icon: <UserIconLucide size={14} />,
      fields: ['name', 'familyName', 'nickname', 'role', 'species', 'archetype']
    },
    {
      name: 'Life & Origin',
      icon: <HeartIcon size={14} />,
      fields: ['age', 'birthday', 'birthplace', 'residence', 'livingStatus']
    },
    {
      name: 'Physicality',
      icon: <RulerIcon size={14} />,
      fields: ['height', 'weight', 'physicalFeatures', 'style']
    },
    {
      name: 'Psychology',
      icon: <InfoIcon size={14} />,
      fields: ['description', 'goals', 'strengths', 'weaknesses']
    }
  ];

  const renderField = (key: string, value: any) => {
    if (typeof value === 'object' || Array.isArray(value) || key === 'id' || key === 'timestamp' || key === 'lastModified' || key === 'parentId' || key === 'mapImage' || key === 'imageUrl' || key === 'x' || key === 'y') return null;

    return (
      <div key={key} className="space-y-1">
        <div className="flex justify-between items-center px-1">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</label>
          <code className="text-emerald-500 text-[9px] font-mono">{`{${key}}`}</code>
        </div>
        {key === 'description' || key === 'content' || key === 'definition' || key === 'summary' || key === 'physicalFeatures' || key === 'style' || key === 'strengths' || key === 'weaknesses' || key === 'goals' ? (
          <textarea 
            value={String(value || '')}
            onChange={(e) => onQuickUpdate(editingCard.type, editingCard.id, key, e.target.value)}
            className="w-full h-24 bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-xs leading-relaxed focus:ring-2 focus:ring-emerald-500 resize-none shadow-inner outline-none"
          />
        ) : (
          <input 
            type={typeof value === 'number' ? 'number' : 'text'}
            value={String(value || '')}
            onChange={(e) => {
              const val = typeof value === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
              onQuickUpdate(editingCard.type, editingCard.id, key, val);
            }}
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-xs font-mono shadow-inner focus:ring-2 focus:ring-emerald-500 outline-none"
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
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Left Column: Context & Global Edits */}
          <div className="w-full lg:w-80 p-6 border-r border-slate-100 dark:border-slate-800 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/20 shrink-0">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <LayoutIcon size={12} /> Global Blueprint Context
            </h3>
            
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Project Title</label>
                <input 
                  type="text" 
                  value={projectData.title}
                  onChange={(e) => onUpdateProject({ title: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-xs font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Full Summary</label>
                <textarea 
                  value={projectData.summary || ''}
                  onChange={(e) => onUpdateProject({ summary: e.target.value })}
                  className="w-full h-32 bg-white dark:bg-slate-800 border-none rounded-xl p-3 text-xs leading-relaxed shadow-sm focus:ring-2 focus:ring-indigo-500 resize-none outline-none"
                />
              </div>

              {/* Variable Reference Grid */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Variable Registry</h4>
                <div className="grid grid-cols-1 gap-2">
                  {variables.map(v => (
                    <div key={v.var} className="p-2 bg-slate-100 dark:bg-slate-800/50 rounded-lg flex items-center justify-between group/var hover:bg-white dark:hover:bg-slate-800 transition-colors">
                      <span className="text-[9px] font-bold text-slate-500">{v.title}</span>
                      <code className="text-indigo-500 text-[9px] font-mono">{v.var}</code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Item Specific Edits */}
          <div className="flex-1 p-6 overflow-y-auto">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <TagIcon size={12} /> Item Blueprint Variables
            </h3>

            {editingCard.type === 'Character' && (
              <div className="mb-12 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <ImageIcon size={18} className="text-indigo-500" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Portrait Gallery (Max 5)</h4>
                  </div>
                  <div className="flex gap-2">
                    {isUploading && <Loader2 className="animate-spin text-indigo-500 mr-2" size={18} />}
                    <div className="relative">
                      <input 
                        type="text"
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        placeholder="Paste image URL..."
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-[10px] w-48 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <button 
                        onClick={handleAddImageUrl}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-indigo-500 hover:text-indigo-600"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <label className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer shadow-md">
                      <Upload size={14} />
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-4">
                  {(editingCard.data.images || []).map((img: any) => (
                    <div key={img.id} className="space-y-2">
                      <div className="aspect-square rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-900 relative group/img border border-white/10 shadow-sm">
                        <img src={img.url} alt="Portrait" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => handleRemoveImage(img.id)}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div className="flex items-center gap-1 px-1">
                        <div className="flex-1 min-w-0">
                          <p 
                            className="text-[8px] font-mono text-slate-500 truncate" 
                            title={img.url}
                          >
                            {img.url.startsWith('data:') ? 'Base64 Data' : img.url}
                          </p>
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(img.url);
                            setCopiedId(img.id);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-500 transition-colors shrink-0"
                        >
                          {copiedId === img.id ? <Check size={8} /> : <Copy size={8} />}
                        </button>
                      </div>
                    </div>
                  ))}
                  {Array.from({ length: 5 - (editingCard.data.images?.length || 0) }).map((_, i) => (
                    <div key={i} className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-700">
                      <ImageIcon size={24} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Single Image Fields (Map Image / Card Image) */}
            {(editingCard.data.mapImage !== undefined || editingCard.data.imageUrl !== undefined) && (
              <div className="mb-12 p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <ImageIcon size={18} className="text-emerald-500" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600/70">Master Visual Asset</h4>
                  </div>
                  <div className="flex gap-2">
                    {isUploading && <Loader2 className="animate-spin text-emerald-500 mr-2" size={18} />}
                    <label className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer shadow-md text-[10px] font-bold uppercase tracking-widest">
                      <Upload size={14} /> Upload New
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsUploading(true);
                          const formData = new FormData();
                          formData.append('image', file);
                          try {
                            const res = await fetch('/api/upload', { method: 'POST', body: formData });
                            const result = await res.json();
                            const field = editingCard.data.mapImage !== undefined ? 'mapImage' : 'imageUrl';
                            onQuickUpdate(editingCard.type, editingCard.id, field, result.url);
                          } catch (err) { alert("Upload failed"); }
                          finally { setIsUploading(false); }
                        }} 
                      />
                    </label>
                  </div>
                </div>

                <div className="flex gap-6 items-start">
                  <div className="w-32 h-32 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-900 border border-emerald-500/20 shadow-inner flex-shrink-0">
                    {(editingCard.data.mapImage || editingCard.data.imageUrl) ? (
                      <img 
                        src={editingCard.data.mapImage || editingCard.data.imageUrl} 
                        className="w-full h-full object-cover" 
                        alt="Preview" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 italic text-[10px]">No Asset</div>
                    )}
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase px-1">Asset URL Reference</label>
                      <input 
                        type="text"
                        value={editingCard.data.mapImage || editingCard.data.imageUrl || ''}
                        onChange={(e) => {
                          const field = editingCard.data.mapImage !== undefined ? 'mapImage' : 'imageUrl';
                          onQuickUpdate(editingCard.type, editingCard.id, field, e.target.value);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border-none rounded-xl p-3 font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Paste or upload to generate URL..."
                      />
                    </div>
                    <button 
                      onClick={() => {
                        const field = editingCard.data.mapImage !== undefined ? 'mapImage' : 'imageUrl';
                        onQuickUpdate(editingCard.type, editingCard.id, field, '');
                      }}
                      className="text-[9px] font-bold text-red-500 uppercase px-1 hover:text-red-600 transition-colors"
                    >
                      Remove Asset
                    </button>
                  </div>
                </div>
              </div>
            )}

            {editingCard.type === 'Character' ? (
              <div className="space-y-10">
                {characterCategories.map(cat => (
                  <div key={cat.name} className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                        {cat.icon}
                      </div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{cat.name}</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {cat.fields.map(field => {
                        const value = editingCard.data[field];
                        return renderField(field, value !== undefined ? value : '');
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(editingCard.data).map(([key, value]) => {
                  return renderField(key, value);
                })}
              </div>
            )}

            {/* Special Coordinate Grid - ALWAYS SHOW */}
            <div className="mt-8 p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/20">
              <div className="flex items-center gap-3 mb-4">
                <MapIcon size={16} className="text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest">Spatial Blueprinting</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-emerald-600/70 uppercase px-1">X Coordinate {`{x}`}</label>
                  <input 
                    type="number" 
                    value={editingCard.data.x || 0}
                    onChange={(e) => onQuickUpdate(editingCard.type, editingCard.id, 'x', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white dark:bg-slate-900 border-none rounded-xl p-3 font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-emerald-600/70 uppercase px-1">Y Coordinate {`{y}`}</label>
                  <input 
                    type="number" 
                    value={editingCard.data.y || 0}
                    onChange={(e) => onQuickUpdate(editingCard.type, editingCard.id, 'y', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white dark:bg-slate-900 border-none rounded-xl p-3 font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>
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
