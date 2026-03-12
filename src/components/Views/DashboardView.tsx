import React, { useState, useMemo, useEffect } from 'react';
import { ProjectData, Note, Commit, BackupStatus } from '../../types';
import { 
  Sparkles, FileText, Users, Map, Calendar, Clock, Edit3, 
  Activity, CheckCircle2, AlertTriangle, Ghost, PinOff,
  BarChart3, TrendingUp, AlertOctagon, History, ShieldCheck, 
  CloudUpload, Mail, CheckCircle, XCircle, ShieldAlert,
  Download, Image as ImageIcon, Save
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
  onUpdateMetadata: (title: string, author: string) => void;
  onExport: () => void;
  onExportProject: (project: ProjectData, globalNotes: Note[]) => void;
  onAnalyzeText: (text: string) => void;
  onRestoreHistory: () => void;
  onRestoreCommit: (commit: Commit) => void;
  onGenerateCover: () => void;
  onAuditThreads: () => void;
  isGeneratingCover: boolean;
  isExporting?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projectData, globalNotes, onGenerateCover, isGeneratingCover, onUpdateMetadata, onAuditThreads, isAnalyzing, onRestoreCommit, onExportProject, isExporting
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>(DashboardTab.HEALTH);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editTitle, setEditTitle] = useState(projectData.title);
  const [editAuthor, setEditAuthor] = useState(projectData.author || '');
  const [isIntegrityValid, setIsIntegrityValid] = useState<boolean | null>(null);

  useEffect(() => {
    validateIntegrity(projectData).then(valid => setIsIntegrityValid(valid));
  }, [projectData]);

  const handleSaveMetadata = () => {
    onUpdateMetadata(editTitle, editAuthor);
    setIsEditingMetadata(false);
  };

  const projectImages = useMemo(() => {
    const images: { url: string; label: string; type: string }[] = [];
    if (projectData.coverImage) images.push({ url: projectData.coverImage, label: 'Project Cover', type: 'Cover' });
    if (projectData.rootMapImage) images.push({ url: projectData.rootMapImage, label: 'World Map', type: 'Map' });
    
    projectData.characters.forEach(c => {
      if (c.images && c.images.length > 0) images.push({ url: c.images[0].url, label: c.name, type: 'Character' });
    });
    
    projectData.locations.forEach(l => {
      if (l.mapImage) images.push({ url: l.mapImage, label: l.name, type: 'Map' });
    });

    projectData.sources?.forEach(s => {
      if (s.type === 'image' && s.content.startsWith('data:image')) {
        images.push({ url: s.content, label: s.name, type: 'Source' });
      }
    });
    return images;
  }, [projectData]);

  const stats = useMemo(() => {
    const totalWords = (projectData.chapters || []).reduce((acc, c) => acc + (c.wordCount || 0), 0);
    const completedChapters = (projectData.chapters || []).filter(c => c.status === 'Final').length;
    const totalChapters = (projectData.chapters || []).length;
    const completeness = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
    
    const unplacedPins = (projectData.locations || []).filter(l => !l.x && !l.y);
    const paradoxes = detectTemporalParadoxes(projectData);
    
    return { totalWords, completeness, unplacedPins, paradoxes };
  }, [projectData]);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row items-center md:items-end gap-8 text-center md:text-left">
          <div className="w-48 h-72 bg-slate-200 dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden relative group flex-shrink-0">
            {projectData.coverImage ? (
              <img src={projectData.coverImage} className="w-full h-full object-cover" alt="Cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <button
                  onClick={onGenerateCover}
                  disabled={isGeneratingCover}
                  className="flex flex-col items-center gap-2 text-slate-400 hover:text-indigo-500 transition-colors"
                >
                  <Sparkles size={32} className={isGeneratingCover ? 'animate-spin' : ''} />
                  <span className="text-xs font-bold uppercase tracking-widest">Generate Cover</span>
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 space-y-4 w-full">
            <div className="space-y-1 group relative">
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white uppercase flex flex-col md:flex-row items-center gap-2 md:gap-4">
                {projectData.title}
                <button onClick={() => setIsEditingMetadata(true)} className="p-2 text-slate-300 hover:text-indigo-500 transition-colors md:opacity-0 md:group-hover:opacity-100">
                  <Edit3 size={24} />
                </button>
                {isIntegrityValid === false && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                    <ShieldAlert size={12} /> Data Corruption Detected
                  </div>
                )}
                {isIntegrityValid === true && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                    <ShieldCheck size={12} /> Integrity Verified
                  </div>
                )}
              </h1>
              <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 italic">by {projectData.author}</p>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex-1 w-full">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Story Summary</span>
                <p className="text-slate-700 dark:text-slate-300 line-clamp-3 text-sm md:text-base leading-relaxed">{projectData.summary || 'No summary generated yet.'}</p>
              </div>
              
              <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl self-stretch overflow-x-auto no-scrollbar shrink-0">
                <button
                  onClick={() => onExportProject(projectData, globalNotes)}
                  className="px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 flex items-center gap-2"
                >
                  <Download size={14} /> Full Backup
                </button>
                <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1 self-center" />
                {Object.values(DashboardTab).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Health Dashboard & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <StatCard icon={TrendingUp} label="Total Word Count" value={stats.totalWords.toLocaleString()} color="text-indigo-500" />
          <StatCard icon={CheckCircle2} label="Completeness" value={`${stats.completeness}%`} color="text-emerald-500" />
          <StatCard icon={Users} label="Characters" value={projectData.characters.length} color="text-blue-500" />
          <StatCard icon={FileText} label="Chapters" value={projectData.chapters?.length || 0} color="text-pink-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {activeTab === DashboardTab.HEALTH && (
              <>
                {/* Control Center / Health Dashboard */}
                <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                      <BarChart3 size={24} className="text-indigo-600" /> Health Dashboard
                    </h2>
                    <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Control Center
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Unplaced Pins */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <PinOff size={14} className="text-amber-500" /> Unplaced Pins ({stats.unplacedPins.length})
                      </h3>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                        {stats.unplacedPins.length > 0 ? stats.unplacedPins.map(l => (
                          <div key={l.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{l.name}</span>
                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Spatial Gap</span>
                          </div>
                        )) : (
                          <p className="text-sm text-slate-400 italic">All locations are spatially placed.</p>
                        )}
                      </div>
                    </div>

                    {/* Temporal Paradoxes */}
                    <div className="space-y-4 md:col-span-2">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <AlertOctagon size={14} className="text-red-500" /> Temporal Paradoxes ({stats.paradoxes.length})
                      </h3>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                        {stats.paradoxes.length > 0 ? stats.paradoxes.map(p => (
                          <div key={p.id} className="p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30 flex flex-col gap-1">
                            <span className="text-sm font-bold text-red-700 dark:text-red-400">{p.message}</span>
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Inconsistent Cosmology</span>
                          </div>
                        )) : (
                          <p className="text-sm text-slate-400 italic">Timeline events align perfectly with cosmology settings.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tight flex items-center gap-2">
                    <Activity size={24} className="text-indigo-600" /> Latest Activity
                  </h2>
                  <div className="space-y-4">
                    {projectData.changeLog?.slice(0, 5).map(log => (
                      <div key={log.id} className="flex items-center gap-4 text-sm group">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 group-hover:scale-150 transition-transform" />
                        <span className="font-bold text-slate-900 dark:text-white">{log.action} {log.entityType}:</span>
                        <span className="text-slate-500 dark:text-slate-400 truncate">{log.entityName}</span>
                        <span className="ml-auto text-xs text-slate-400 tabular-nums">{new Date(log.timestamp).toLocaleDateString()}</span>
                      </div>
                    )) || <p className="text-slate-400 italic">No activity recorded yet.</p>}
                  </div>
                </section>
              </>
            )}

            {activeTab === DashboardTab.GALLERY && (
              <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <ImageIcon size={24} className="text-indigo-600" /> Photo Gallery
                  </h2>
                  <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {projectImages.length} Assets
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {projectImages.length === 0 ? (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                      <ImageIcon size={48} className="mx-auto text-slate-200 mb-4 opacity-20" />
                      <p className="text-slate-400 italic font-serif">No images uploaded to this project.</p>
                    </div>
                  ) : (
                    projectImages.map((img, idx) => (
                      <div key={idx} className="space-y-2 group">
                        <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 relative shadow-sm transition-all group-hover:shadow-xl group-hover:-translate-y-1">
                          <img src={img.url} alt={img.label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                             <div className="text-white">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">{img.type}</p>
                                <p className="text-xs font-bold leading-tight">{img.label}</p>
                             </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            {activeTab === DashboardTab.EDITS && (
              <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <History size={24} className="text-indigo-600" /> Audit Trail
                  </h2>
                  <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {projectData.commits?.length || 0} Local Commits
                  </div>
                </div>

                <div className="space-y-4">
                  {projectData.commits?.slice().reverse().map((commit: Commit) => (
                    <div key={commit.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-indigo-500/30 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-slate-900 text-white rounded font-mono text-[10px] tracking-tighter">
                            {commit.hash.slice(0, 8)}
                          </span>
                          <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">{commit.author}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{new Date(commit.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{commit.message}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{commit.diff}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{commit.wordCount.toLocaleString()} words</span>
                          <button 
                            onClick={() => onRestoreCommit(commit)}
                            className="text-[10px] font-black text-white bg-indigo-600 px-3 py-1 rounded-lg uppercase tracking-widest hover:bg-indigo-700 transition-colors"
                          >
                            Restore
                          </button>
                        </div>
                      </div>
                    </div>
                  )) || (
                    <div className="py-12 text-center text-slate-400 italic">No commits recorded yet.</div>
                  )}
                </div>
              </section>
            )}

            {activeTab === DashboardTab.BACKUPS && (
              <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <CloudUpload size={24} className="text-indigo-600" /> Milestone Backups
                  </h2>
                  <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Resend API Active
                  </div>
                </div>

                <div className="space-y-4">
                  {projectData.backups?.slice().reverse().map((backup: BackupStatus) => (
                    <div key={backup.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${backup.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' : backup.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                          {backup.status === 'delivered' ? <CheckCircle size={20} /> : backup.status === 'pending' ? <CloudUpload size={20} className="animate-bounce" /> : <XCircle size={20} />}
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                            {backup.status === 'delivered' ? 'Backup Verified' : backup.status === 'pending' ? 'Uploading...' : 'Backup Failed'}
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 rounded">{backup.hash.slice(0, 8)}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase">{new Date(backup.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{backup.wordCount.toLocaleString()}</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Words</div>
                      </div>
                    </div>
                  )) || (
                    <div className="py-12 text-center text-slate-400 italic">No milestone backups yet.</div>
                  )}
                </div>

                <div className="mt-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 flex items-start gap-4">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-lg text-indigo-600 shadow-sm">
                    <Mail size={18} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest">Redundancy Setup</h4>
                    <p className="text-xs text-indigo-700 dark:text-indigo-400 leading-relaxed font-medium">
                      Plothole automatically packages and encrypts your <code>.plothole</code> container at every 5,000 word milestone or every 10 commits. These are sent to your Vault email address for permanent off-device archival.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>

          <div className="space-y-8">
            <section className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                <Sparkles size={120} />
              </div>
              <h2 className="text-xl font-black mb-4 uppercase tracking-tight relative z-10">AI Insights</h2>
              <p className="text-indigo-100 text-sm leading-relaxed mb-6 relative z-10 font-medium">
                {projectData.themes.length > 0 
                  ? `Your narrative has a strong focus on ${projectData.themes[0].toLowerCase()}. Consider expanding the role of ${projectData.characters[0]?.name || 'your protagonist'} to deepen this theme.`
                  : "Start drafting to allow Merlin to identify themes and narrative pacing insights."}
              </p>
              <button className="w-full py-4 bg-white text-indigo-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all active:scale-95 shadow-lg relative z-10">
                Run Deep Analysis
              </button>
            </section>

            <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
               <h2 className="text-sm font-black text-slate-900 dark:text-white mb-4 uppercase tracking-widest">Project Progress</h2>
               <div className="space-y-6">
                 <div>
                   <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                     <span>World Building</span>
                     <span>{Math.round(((projectData.locations.length + (projectData.artifacts?.length || 0)) / 20) * 100)}%</span>
                   </div>
                   <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                     <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (projectData.locations.length / 10) * 100)}%` }} />
                   </div>
                 </div>
                 <div>
                   <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                     <span>Character Web</span>
                     <span>{Math.round((projectData.characters.length / 15) * 100)}%</span>
                   </div>
                   <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                     <div className="h-full bg-pink-500 rounded-full" style={{ width: `${Math.min(100, (projectData.characters.length / 12) * 100)}%` }} />
                   </div>
                 </div>
               </div>
            </section>
          </div>
        </div>
      </div>

      <Modal isOpen={isEditingMetadata} onClose={() => setIsEditingMetadata(false)} title="Edit Project Details" footer={<button onClick={handleSaveMetadata} className="px-4 sm:px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2"><Save size={18} /> <span className="hidden sm:inline">Save Changes</span></button>}>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Project Title</label>
            <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-slate-900 dark:text-white" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase">Author Name</label>
            <input type="text" value={editAuthor} onChange={e => setEditAuthor(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-slate-900 dark:text-white" />
          </div>
        </div>
      </Modal>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 hover:shadow-md transition-shadow">
    <div className={`p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 ${color} shadow-inner`}>
      <Icon size={24} />
    </div>
    <div>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{label}</span>
      <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">{value}</span>
    </div>
  </div>
);
