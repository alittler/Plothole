import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProjectData, Note, Commit, BackupStatus, User } from '../../types';
import { 
  Sparkles, FileText, Users, Map, Clock, Edit3, 
  Activity, Ghost, PinOff, Edit2,
  BarChart3, TrendingUp, AlertOctagon, History, ShieldCheck, 
  CloudUpload, Mail, CheckCircle, XCircle, ShieldAlert,
  Download, Image as ImageIcon, Save, Cpu, Loader2, Database, Archive,
  CheckCircle2, AlertCircle
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { validateIntegrity } from '../../services/versioningService';

enum DashboardTab {
  HEALTH = 'Health',
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
  onExportVault: () => void;
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
  fetchWithAuth?: (url: string, options?: any) => Promise<Response>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projectData, globalNotes, onGenerateCover, isGeneratingCover, onAuditThreads, isAnalyzing, onRestoreCommit, onExportProject, onExportVault, isExporting,
  onUpdateProcessedFiles, isUpdatingProcessed = false, onLinkClick, onUpdateProject, onSave, currentUser, fetchWithAuth
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') as DashboardTab) || DashboardTab.HEALTH;
  const setActiveTab = (tab: DashboardTab) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    router.push(`?${params.toString()}`);
  };

  const [isIntegrityValid, setIsIntegrityValid] = useState<boolean | null>(null);

  useEffect(() => {
    validateIntegrity(projectData).then(valid => setIsIntegrityValid(valid));
  }, [projectData]);

  const stats = useMemo(() => {
    const totalWords = projectData.wordCount || (projectData.chapters || []).reduce((acc, c) => acc + (c.wordCount || 0), 0);
    
    const unplacedPins = (projectData.locations || []).filter(l => !l.x && !l.y);
    
    return { totalWords, unplacedPins };
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
                  projectData.coverImage.startsWith('cover-description://') ? (
                    // Display text-based cover description
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-3">
                      <p className="text-xs text-slate-200 italic text-center leading-relaxed">
                        {decodeURIComponent(projectData.coverImage.replace('cover-description://', ''))}
                      </p>
                    </div>
                  ) : (
                    // Display image-based cover (legacy)
                    <img src={projectData.coverImage} className="w-full h-full object-cover" alt="Cover" referrerPolicy="no-referrer" />
                  )
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
                <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white truncate">{projectData.title}</h1>
                <p className="text-xs md:text-base text-slate-500 dark:text-slate-400 truncate">by {projectData.author}</p>
                
                {isIntegrityValid !== null && (
                  <div className="flex gap-2 mt-3">
                    {isIntegrityValid === true ? (
                      <div className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold">
                        <ShieldCheck size={14} /> <span className="hidden sm:inline">Verified</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-bold animate-pulse">
                        <ShieldAlert size={14} /> <span className="hidden sm:inline">Corruption Detected</span>
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
        <div className="max-w-7xl mx-auto mb-8 space-y-3 md:space-y-0 md:flex gap-6">
          <div className="hidden sm:block flex-1 ph-panel p-4 md:p-6 rounded-2xl">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Summary</p>
            <p className="text-sm md:text-base text-slate-700 dark:text-slate-300 line-clamp-2 font-serif">{projectData.summary || '—'}</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end md:flex-nowrap flex-shrink-0">
            <button
              onClick={onUpdateProcessedFiles}
              disabled={isUpdatingProcessed || isAnalyzing}
              title="Sync manuscript with project data"
              className="ph-button-secondary p-2 md:p-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold flex items-center gap-1 md:gap-2 disabled:opacity-50 shrink-0"
            >
              {isUpdatingProcessed ? <Loader2 size={16} className="animate-spin" /> : <Cpu size={16} />}
              <span className="hidden sm:inline">Sync</span>
            </button>
            <button
              onClick={() => onExportProject(projectData)}
              className="ph-button p-2 md:p-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold flex items-center gap-1 md:gap-2 shrink-0"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={onExportVault}
              className="ph-button-secondary p-2 md:p-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold flex items-center gap-1 md:gap-2 shrink-0"
              title="Backup all your notes and account metadata"
            >
              <Archive size={16} />
              <span className="hidden sm:inline">Vault</span>
            </button>
            {onSave && (
              <button
                onClick={onSave}
                className="ph-button-secondary p-2 md:p-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold flex items-center gap-1 md:gap-2 shrink-0"
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
              
              {projectData.backups && projectData.backups.length > 0 ? (
                <div className="space-y-3">
                  {projectData.backups.sort((a, b) => b.timestamp - a.timestamp).map(backup => (
                    <div key={backup.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${backup.status === 'delivered' ? 'bg-emerald-500' : backup.status === 'pending' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm">
                            {new Date(backup.timestamp).toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-500">
                            {backup.wordCount} words • {backup.status}
                          </p>
                        </div>
                      </div>
                      {backup.status !== 'delivered' && (
                        <button 
                          onClick={() => {
                            const doFetch = (fetchWithAuth || fetch.bind(window));
                            doFetch(`/api/resend-backup/${backup.id}`, { 
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ projectId: projectData.id })
                            }).catch(err => console.error("Resend failed", err));
                          }}
                          className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
                        >
                          Resend
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-500 italic">No automated backups recorded yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Backups are triggered automatically when you reach major word count milestones.</p>
                </div>
              )}
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
