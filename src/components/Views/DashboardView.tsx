import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProjectData, Note, Commit, BackupStatus } from '../../types';
import { 
  Sparkles, FileText, Users, Map, Calendar, Clock, Edit3, 
  Activity, Ghost, PinOff, Edit2,
  BarChart3, TrendingUp, AlertOctagon, History, ShieldCheck, 
  CloudUpload, Mail, CheckCircle, XCircle, ShieldAlert,
  Download, Image as ImageIcon, Save, Cpu, Loader2
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { detectTemporalParadoxes } from '../../utils/calendarUtils';
import { validateIntegrity } from '../../services/versioningService';

enum DashboardTab {
  HEALTH = 'Health',
  GALLERY = 'Gallery',
  EDITS = 'Audit Trail',
  BACKUPS = 'Redundancy'
}

interface DashboardViewProps {
  projectData: ProjectData;
  globalNotes: Note[];
  onFileUpload: () => void;
  onLoadSample: () => void;
  isAnalyzing: boolean;
  error: string | null;
  onExport: () => void;
  onExportProject: (project: ProjectData, globalNotes: Note[]) => void;
  onAnalyzeText: (text: string) => void;
  onRestoreHistory: () => void;
  onRestoreCommit: (commit: Commit) => void;
  onRestoreCommit: (commit: Commit) => void;
  onGenerateCover: () => void;
  onAuditThreads: () => void;
  isGeneratingCover: boolean;
  isExporting?: boolean;
  onUpdateProcessedFiles: () => void;
  isUpdatingProcessed?: boolean;
  onLinkClick: (type: string, id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projectData, globalNotes, onGenerateCover, isGeneratingCover, onAuditThreads, isAnalyzing, onRestoreCommit, onExportProject, isExporting,
  onUpdateProcessedFiles, isUpdatingProcessed = false, onLinkClick
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as DashboardTab) || DashboardTab.HEALTH;
  const setActiveTab = (tab: DashboardTab) => setSearchParams({ tab });

  const [isIntegrityValid, setIsIntegrityValid] = useState<boolean | null>(null);

  useEffect(() => {
    validateIntegrity(projectData).then(valid => setIsIntegrityValid(valid));
  }, [projectData]);

  const projectImages = useMemo(() => {
    const images: { id: string; url: string; label: string; type: string; entityType: string }[] = [];
    if (projectData.coverImage) images.push({ id: 'cover', url: projectData.coverImage, label: 'Project Cover', type: 'Cover', entityType: 'project' });
    if (projectData.rootMapImage) images.push({ id: 'rootMap', url: projectData.rootMapImage, label: 'World Map', type: 'Map', entityType: 'project' });
    
    projectData.characters.forEach(c => {
      if (c.images && c.images.length > 0) images.push({ id: c.id, url: c.images[0].url, label: c.name, type: 'Character', entityType: 'character' });
    });
    
    projectData.locations.forEach(l => {
      if (l.mapImage) images.push({ id: l.id, url: l.mapImage, label: l.name, type: 'Map', entityType: 'location' });
    });

    projectData.sources?.forEach(s => {
      if (s.type === 'image' && s.content.startsWith('data:image')) {
        images.push({ id: s.id, url: s.content, label: s.name, type: 'Source', entityType: 'source' });
      }
    });
    return images;
  }, [projectData]);

  const stats = useMemo(() => {
    const totalWords = (projectData.chapters || []).reduce((acc, c) => acc + (c.wordCount || 0), 0);
    
    const unplacedPins = (projectData.locations || []).filter(l => !l.x && !l.y);
    const paradoxes = detectTemporalParadoxes(projectData);
    
    return { totalWords, unplacedPins, paradoxes };
  }, [projectData]);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        <header className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 text-center md:text-left">
          <div className="w-32 h-48 md:w-48 md:h-72 ph-panel shadow-2xl overflow-hidden relative group flex-shrink-0 border-none rounded-xl">
            {projectData.coverImage ? (
              <img src={projectData.coverImage} className="w-full h-full object-cover" alt="Cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-slate-800">
                <button
                  onClick={onGenerateCover}
                  disabled={isGeneratingCover}
                  className="ph-button-ghost flex-col gap-2 p-4"
                >
                  <Sparkles size={24} className={isGeneratingCover ? 'animate-spin' : ''} />
                  <span className="ph-section-subtitle">Generate Cover</span>
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 space-y-4 w-full">
            <h1 className="ph-section-title text-2xl sm:text-3xl md:text-5xl flex flex-col md:flex-row items-center gap-2 md:gap-4">
              {projectData.title}
              <button onClick={() => {}} className="hidden">
                <Edit3 size={20} />
              </button>
            </h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              {isIntegrityValid === false && (
                <div className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest animate-pulse">
                  <ShieldAlert size={10} /> Corruption
                </div>
              )}
              {isIntegrityValid === true && (
                <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500 text-white rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest">
                  <ShieldCheck size={10} /> Verified
                </div>
              )}
            </div>
            <p className="text-base md:text-xl text-slate-500 dark:text-slate-400 font-serif italic">by {projectData.author}</p>
          </div>
        </header>

        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="ph-panel p-4 flex-1 w-full text-left rounded-2xl">
            <span className="ph-label">Story Summary</span>
            <p className="text-slate-700 dark:text-slate-300 line-clamp-3 text-xs md:text-base leading-relaxed font-serif">{projectData.summary || 'No summary generated yet.'}</p>
          </div>
          
          <div className="ph-tab-container self-stretch overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={onUpdateProcessedFiles}
              disabled={isUpdatingProcessed || isAnalyzing}
              className="ph-tab ph-tab-inactive bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 disabled:opacity-50"
              title="Smart-sync extracted data with current manuscript and blueprint schemas"
            >
              {isUpdatingProcessed ? <Loader2 size={12} className="animate-spin" /> : <Cpu size={12} />} Sync Processor
            </button>
            <button
              onClick={() => onExportProject(projectData, globalNotes)}
              className="ph-tab ph-tab-active bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <Download size={12} /> Backup
            </button>
            <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1 self-center" />
            {Object.values(DashboardTab).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`ph-tab ${activeTab === tab ? 'ph-tab-active' : 'ph-tab-inactive'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Health Dashboard & Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <StatCard icon={TrendingUp} label="Words" value={stats.totalWords.toLocaleString()} color="text-indigo-500" />
          <StatCard icon={Users} label="Cast" value={projectData.characters.length} color="text-blue-500" />
          <div className="col-span-2 lg:col-span-1">
            <StatCard icon={FileText} label="Chapters" value={projectData.chapters?.length || 0} color="text-pink-500" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:gap-8">
          <div className="space-y-6 md:space-y-8">
            {activeTab === DashboardTab.HEALTH && (
              <>
                {/* Control Center / Health Dashboard */}
                <section className="bg-white dark:bg-slate-900 rounded-3xl p-4 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-6 md:mb-8">
                    <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                      <BarChart3 size={20} className="text-indigo-600" /> Health
                    </h2>
                    <div className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Control
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    {/* Unplaced Pins */}
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <PinOff size={12} className="text-amber-500" /> Unplaced Pins ({stats.unplacedPins.length})
                      </h3>
                      <div className="space-y-2 max-h-[150px] md:max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                        {stats.unplacedPins.length > 0 ? stats.unplacedPins.map(l => (
                          <div key={l.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{l.name}</span>
                            <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Gap</span>
                          </div>
                        )) : (
                          <p className="text-xs text-slate-400 italic">All locations placed.</p>
                        )}
                      </div>
                    </div>

                    {/* Temporal Paradoxes */}
                    <div className="space-y-4 md:col-span-2">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <AlertOctagon size={12} className="text-red-500" /> Paradoxes ({stats.paradoxes.length})
                      </h3>
                      <div className="space-y-2 max-h-[150px] md:max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                        {stats.paradoxes.length > 0 ? stats.paradoxes.map(p => (
                          <div key={p.id} className="p-2.5 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30 flex flex-col gap-1">
                            <span className="text-xs font-bold text-red-700 dark:text-red-400">{p.message}</span>
                          </div>
                        )) : (
                          <p className="text-xs text-slate-400 italic">Timeline is consistent.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="bg-white dark:bg-slate-900 rounded-3xl p-4 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                  <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight flex items-center gap-2">
                    <Activity size={20} className="text-indigo-600" /> Activity
                  </h2>
                  <div className="space-y-3">
                    {projectData.changeLog?.slice(0, 5).map(log => (
                      <div key={log.id} className="flex items-center gap-3 text-xs group">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 group-hover:scale-150 transition-transform" />
                        <span className="font-bold text-slate-900 dark:text-white shrink-0">{log.action}:</span>
                        <span className="text-slate-500 dark:text-slate-400 truncate">{log.entityName}</span>
                        <span className="ml-auto text-[10px] text-slate-400 tabular-nums shrink-0">{new Date(log.timestamp).toLocaleDateString()}</span>
                      </div>
                    )) || <p className="text-slate-400 italic text-xs">No activity yet.</p>}
                  </div>
                </section>
              </>
            )}

            {activeTab === DashboardTab.GALLERY && (
              <section className="bg-white dark:bg-slate-900 rounded-3xl p-4 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-6 md:mb-8">
                  <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <ImageIcon size={20} className="text-indigo-600" /> Gallery
                  </h2>
                  <div className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {projectImages.length} Assets
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projectImages.length === 0 ? (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                      <ImageIcon size={32} className="mx-auto text-slate-200 mb-4 opacity-20" />
                      <p className="text-xs text-slate-400 italic font-serif">No images yet.</p>
                    </div>
                  ) : (
                    projectImages.map((img, idx) => (
                      <BlueprintCard key={idx} img={img} onEdit={() => onLinkClick('admin', img.id)} />
                    ))
                  )}
                </div>
              </section>
            )}

            {activeTab === DashboardTab.EDITS && (
              <section className="bg-white dark:bg-slate-900 rounded-3xl p-4 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-6 md:mb-8">
                  <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <History size={20} className="text-indigo-600" /> Audit
                  </h2>
                  <div className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {projectData.commits?.length || 0} Commits
                  </div>
                </div>

                <div className="space-y-4">
                  {projectData.commits?.slice().reverse().map((commit: Commit) => (
                    <div key={commit.id} className="p-3 md:p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-indigo-500/30 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-slate-900 text-white rounded font-mono text-[8px] md:text-[10px] tracking-tighter">
                            {commit.hash.slice(0, 8)}
                          </span>
                        </div>
                        <span className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase">{new Date(commit.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs md:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{commit.message}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">{commit.diff}</span>
                        <button 
                          onClick={() => onRestoreCommit(commit)}
                          className="text-[8px] md:text-[10px] font-black text-white bg-indigo-600 px-2 md:px-3 py-1 rounded-lg uppercase tracking-widest hover:bg-indigo-700 transition-colors"
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                  )) || (
                    <div className="py-8 text-center text-slate-400 italic text-xs">No commits yet.</div>
                  )}
                </div>
              </section>
            )}

            {activeTab === DashboardTab.BACKUPS && (
              <section className="bg-white dark:bg-slate-900 rounded-3xl p-4 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-6 md:mb-8">
                  <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <CloudUpload size={20} className="text-indigo-600" /> Backups
                  </h2>
                </div>

                <div className="space-y-3">
                  {projectData.backups?.slice().reverse().map((backup: BackupStatus) => (
                    <div key={backup.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${backup.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' : backup.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                          {backup.status === 'delivered' ? <CheckCircle size={16} /> : backup.status === 'pending' ? <CloudUpload size={16} className="animate-bounce" /> : <XCircle size={16} />}
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                            {backup.status === 'delivered' ? 'Verified' : 'Pending'}
                            <span className="text-[8px] font-mono text-slate-400">{backup.hash.slice(0, 8)}</span>
                          </div>
                          <div className="text-[8px] text-slate-400 font-bold uppercase">{new Date(backup.timestamp).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-slate-900 dark:text-white tabular-nums">{backup.wordCount.toLocaleString()}</div>
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Words</div>
                      </div>
                    </div>
                  )) || (
                    <div className="py-8 text-center text-slate-400 italic text-xs">No backups yet.</div>
                  )}
                </div>

                <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 flex items-start gap-3">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-lg text-indigo-600 shadow-sm shrink-0">
                    <Mail size={14} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest">Auto-Vault</h4>
                    <p className="text-[10px] text-indigo-700 dark:text-indigo-400 leading-relaxed font-medium">
                      Plothole archives your <code>.plothole</code> container at every 5,000 word milestone.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-3 md:gap-4 hover:shadow-md transition-shadow">
    <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 dark:bg-slate-950 ${color} shadow-inner`}>
      <Icon size={20} className="md:w-6 md:h-6" />
    </div>
    <div className="min-w-0">
      <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5 md:mb-1 truncate">{label}</span>
      <span className="text-base md:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight truncate">{value}</span>
    </div>
  </div>
);

const BlueprintCard = ({ img, onEdit }: { img: { id: string; url: string; label: string; type: string; entityType: string }, onEdit: () => void }) => (
  <div className="relative group p-4 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-3xl border border-indigo-200/50 dark:border-indigo-800/30 overflow-hidden">
    {/* Architectural Grid Overlay */}
    <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07] pointer-events-none" 
         style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
    
    {/* Technical Markers */}
    <div className="absolute top-2 left-2 w-3 h-3 border-l border-t border-indigo-500/50" />
    <div className="absolute top-2 right-2 w-3 h-3 border-r border-t border-indigo-500/50" />
    <div className="absolute bottom-2 left-2 w-3 h-3 border-l border-b border-indigo-500/50" />
    <div className="absolute bottom-2 right-2 w-3 h-3 border-r border-b border-indigo-500/50" />

    {/* Edit Button Overlay */}
    <button 
      onClick={(e) => { e.stopPropagation(); onEdit(); }}
      className="absolute top-4 right-4 z-20 p-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl shadow-lg border border-indigo-500/20 text-indigo-600 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95"
      title="Edit Source Entity"
    >
      <Edit2 size={14} />
    </button>

    <div className="aspect-square rounded-2xl overflow-hidden bg-white dark:bg-slate-800 relative shadow-inner mb-4 transition-transform group-hover:scale-[1.02]">
      <img 
        src={img.url} 
        alt={img.label} 
        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" 
        referrerPolicy="no-referrer" 
      />
      
      {/* Blueprint Scanline */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent h-1/2 w-full animate-pulse pointer-events-none" />
    </div>

    <div className="space-y-1.5 px-1">
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-mono font-black text-indigo-500 uppercase tracking-tighter">Asset_Type::{img.type.toUpperCase()}</span>
        <span className="text-[8px] font-mono text-slate-400">v3.0.4</span>
      </div>
      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{img.label}</h4>
      <div className="flex items-center gap-4 pt-2 border-t border-indigo-200/30 dark:border-indigo-800/20">
        <div className="flex flex-col">
          <span className="text-[7px] font-black text-slate-400 uppercase">Res</span>
          <span className="text-[9px] font-mono text-slate-600 dark:text-slate-400">1024x1024</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[7px] font-black text-slate-400 uppercase">Enc</span>
          <span className="text-[9px] font-mono text-slate-600 dark:text-slate-400">UTF-8</span>
        </div>
      </div>
    </div>
  </div>
);

