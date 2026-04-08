import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProjectData, Note, Commit, BackupStatus, User } from '../../types';
import { 
  Sparkles, FileText, Users, Map, Calendar, Clock, Edit3, 
  Activity, Ghost, PinOff, Edit2,
  BarChart3, TrendingUp, AlertOctagon, History, ShieldCheck, 
  CloudUpload, Mail, CheckCircle, XCircle, ShieldAlert,
  Download, Image as ImageIcon, Save, Cpu, Loader2, Database,
  CheckCircle2, AlertCircle
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
  onExportProject: (project: ProjectData) => void;
  onAnalyzeText: (text: string) => void;
  onRestoreHistory: () => void;
  onRestoreCommit: (commit: Commit) => void;
  onGenerateCover: () => void;
  onAuditThreads: () => void;
  isGeneratingCover: boolean;
  isExporting?: boolean;
  onUpdateProcessedFiles?: () => Promise<void>;
  isUpdatingProcessed?: boolean;
  onLinkClick: (type: string, id: string) => void;
  onUpdateProject: (updates: Partial<ProjectData>) => Promise<void>;
  onSave?: () => Promise<void>;
  currentUser: User;
  }

export const DashboardView: React.FC<DashboardViewProps> = ({
  projectData, globalNotes, onGenerateCover, isGeneratingCover, onAuditThreads, isAnalyzing, onRestoreCommit, onExportProject, isExporting,
  onUpdateProcessedFiles, isUpdatingProcessed = false, onLinkClick, onUpdateProject, onSave, currentUser
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
    const totalWords = projectData.wordCount || (projectData.chapters || []).reduce((acc, c) => acc + (c.wordCount || 0), 0);
    
    const unplacedPins = (projectData.locations || []).filter(l => !l.x && !l.y);
    const paradoxes = detectTemporalParadoxes(projectData);
    
    return { totalWords, unplacedPins, paradoxes };
  }, [projectData]);

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 custom-scrollbar">
      <div className="p-4 md:p-8">
        {/* Header Section */}
        <header className="mb-8 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Cover & Title */}
            <div className="flex-shrink-0">
              <div className="w-32 h-48 md:w-40 md:h-56 ph-panel shadow-xl overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                {projectData.coverImage ? (
                  <img src={projectData.coverImage} className="w-full h-full object-cover" alt="Cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-slate-800">
                    <button
                      onClick={onGenerateCover}
                      disabled={isGeneratingCover}
                      className="ph-button-ghost flex-col gap-2 p-4 text-center"
                    >
                      <Sparkles size={20} className={isGeneratingCover ? 'animate-spin' : ''} />
                      <span className="text-[10px] font-bold">Generate</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Project Info */}
            <div className="flex-1">
              <div className="space-y-2 mb-6">
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">{projectData.title}</h1>
                <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">by {projectData.author}</p>
                
                {isIntegrityValid !== null && (
                  <div className="flex gap-2 mt-3">
                    {isIntegrityValid === true ? (
                      <div className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold">
                        <ShieldCheck size={14} /> Verified
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-bold animate-pulse">
                        <ShieldAlert size={14} /> Corruption Detected
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3">
                <QuickStat icon={TrendingUp} label="Words" value={stats.totalWords.toLocaleString()} />
                <QuickStat icon={Users} label="Characters" value={projectData.characters.length} />
                <QuickStat icon={Map} label="Locations" value={projectData.locations.length} />
              </div>
            </div>
          </div>
        </header>

        {/* Summary & Actions */}
        <div className="max-w-7xl mx-auto mb-8 space-y-4 md:space-y-0 md:flex gap-6">
          <div className="flex-1 ph-panel p-4 md:p-6 rounded-2xl">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Summary</p>
            <p className="text-sm md:text-base text-slate-700 dark:text-slate-300 line-clamp-2 font-serif">{projectData.summary || '—'}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={onUpdateProcessedFiles}
              disabled={isUpdatingProcessed || isAnalyzing}
              title="Sync manuscript with project data"
              className="ph-button-secondary p-2 md:p-3 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 flex-wrap justify-center disabled:opacity-50"
            >
              {isUpdatingProcessed ? <Loader2 size={16} className="animate-spin" /> : <Cpu size={16} />}
              <span className="hidden sm:inline">Sync</span>
            </button>
            <button
              onClick={() => onExportProject(projectData)}
              className="ph-button p-2 md:p-3 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 flex-wrap justify-center"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export</span>
            </button>
            {onSave && (
              <button
                onClick={onSave}
                className="ph-button-secondary p-2 md:p-3 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 flex-wrap justify-center"
              >
                <Save size={16} />
                <span className="hidden sm:inline">Save</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto mb-8 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 pb-2">
            {Object.values(DashboardTab).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-7xl mx-auto pb-40">
          {activeTab === DashboardTab.HEALTH && (
            <div className="space-y-6">
              {/* Health Checks */}
              <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <BarChart3 size={18} className="text-indigo-600" /> Health Status
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <HealthCheck status={stats.unplacedPins.length === 0 ? 'good' : 'warning'} message={`${stats.unplacedPins.length} unplaced location${stats.unplacedPins.length !== 1 ? 's' : ''}`} />
                  <HealthCheck status={stats.paradoxes.length === 0 ? 'good' : 'critical'} message={`${stats.paradoxes.length} timeline paradox${stats.paradoxes.length !== 1 ? 'es' : ''}`} />
                </div>
              </section>

              {/* Recent Activity */}
              <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Activity size={18} className="text-indigo-600" /> Recent Changes
                </h2>
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {projectData.changeLog && projectData.changeLog.length > 0 ? (
                    projectData.changeLog.slice(0, 10).map(log => (
                      <div key={log.id} className="flex items-center gap-3 text-xs p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-slate-700 dark:text-slate-300">{log.action}</span>
                          <span className="text-slate-500 dark:text-slate-400"> • {log.entityName}</span>
                        </div>
                        <span className="text-slate-400 text-[10px] flex-shrink-0">{new Date(log.timestamp).toLocaleDateString()}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 italic text-xs py-4">No changes yet.</p>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeTab === DashboardTab.GALLERY && (
            <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <ImageIcon size={18} className="text-indigo-600" /> Media Gallery ({projectImages.length})
              </h2>
              {projectImages.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                  <ImageIcon size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-slate-400">No images yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projectImages.map((img, idx) => (
                    <BlueprintCard key={idx} img={img} onEdit={() => onLinkClick('admin', img.id)} />
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === DashboardTab.EDITS && (
            <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <History size={18} className="text-indigo-600" /> Audit Trail
              </h2>
              <p className="text-sm text-slate-500">Version history coming soon</p>
            </section>
          )}

          {activeTab === DashboardTab.BACKUPS && (
            <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Database size={18} className="text-indigo-600" /> Backups & Archives
              </h2>
              <p className="text-sm text-slate-500">Backup information coming soon</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

const QuickStat = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) => (
  <div className="flex flex-col items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
    <Icon size={16} className="text-indigo-600 dark:text-indigo-400" />
    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</span>
    <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{value}</span>
  </div>
);

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-3 md:gap-4 hover:shadow-md transition-shadow">
    <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 dark:bg-slate-950 ${color} shadow-inner`}>
      <Icon size={20} className="md:w-6 md:h-6" />
    </div>
    <div className="min-w-0">
      <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5 md:mb-1 truncate">{label}</span>
      <span className="text-sm md:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight truncate">{value}</span>
    </div>
  </div>
);

const HealthCheck = ({ status, message }: { status: 'good' | 'warning' | 'critical'; message: string }) => {
  const statusConfig = {
    good: { color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20', Icon: CheckCircle2 },
    warning: { color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/20', Icon: AlertCircle },
    critical: { color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20', Icon: XCircle }
  };
  const config = statusConfig[status];
  const { Icon } = config;
  
  return (
    <div className={`p-4 rounded-xl border ${config.bgColor} border-slate-200 dark:border-slate-700 flex items-center gap-3`}>
      <Icon className={`w-5 h-5 flex-shrink-0 ${config.color}`} />
      <span className="text-sm text-slate-700 dark:text-slate-300">{message}</span>
    </div>
  );
};

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
          <span className="text-[9px] font-black text-slate-400 uppercase">Res</span>
          <span className="text-[9px] font-mono text-slate-600 dark:text-slate-400">1024x1024</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-slate-400 uppercase">Enc</span>
          <span className="text-[9px] font-mono text-slate-600 dark:text-slate-400">UTF-8</span>
        </div>
      </div>
    </div>
  </div>
);

