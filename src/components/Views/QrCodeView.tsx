import React, { useState, useEffect } from 'react';
import { ProjectData, User } from '../../types';
import { Share2, Globe, Monitor, Shield, Loader2, Copy, ExternalLink, QrCode as QrIcon, Network, Smartphone } from 'lucide-react';

interface QrCodeViewProps {
  projectData: ProjectData | null;
  currentUser: User;
  fetchWithAuth?: (url: string, options?: RequestInit) => Promise<Response>;
}

export const QrCodeView: React.FC<QrCodeViewProps> = ({
  projectData,
  currentUser,
  fetchWithAuth
}) => {
  const [networkInfo, setNetworkInfo] = useState<{ ip: string, port: number } | null>(null);
  const [wikiUrl, setWikiUrl] = useState('');
  const [isWikiEnabled, setIsWikiEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const doFetch = fetchWithAuth || fetch.bind(window);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch Network Info
        const netResp = await fetch('/api/network-info');
        if (netResp.ok) {
          const netData = await netResp.json();
          setNetworkInfo(netData);
        }

        // Fetch Wiki Settings if project exists
        if (projectData) {
          const wikiResp = await doFetch(`/api/projects/${projectData.id}/wiki-settings`);
          if (wikiResp.ok) {
            const wikiData = await wikiResp.json();
            setIsWikiEnabled(wikiData.enable_wiki !== false);
            if (wikiData.username) {
              const baseUrl = window.location.origin;
              const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
              const slugifiedTitle = slugify(projectData.title);
              setWikiUrl(`${baseUrl}/${wikiData.username}/${slugifiedTitle}`);
            }
          }
        }
      } catch (err) {
        console.error('[QrCodeView] Failed to fetch data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [projectData?.id]);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(type);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
        <p className="font-serif italic">Initialising share protocols...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="p-8 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
            <QrIcon size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Share & Connect</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Connect other devices to your workspace</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8 pb-32">
        {/* Local Network Access Card */}
        {networkInfo && (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/20 border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center space-y-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-full">
              <Network size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Local Network Access</span>
            </div>
            
            <div className="p-4 bg-white rounded-3xl border-8 border-slate-50 shadow-inner">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`http://${networkInfo.ip}:${networkInfo.port}`)}`}
                alt="Local Access QR Code"
                className="w-48 h-48 block"
              />
            </div>

            <div className="space-y-2 w-full">
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium max-w-[240px] mx-auto">
                Scan to access Plothole from another device on the same Wi-Fi network.
              </p>
              <div className="flex items-center justify-center gap-2">
                <code className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-indigo-600 font-mono text-sm font-bold">
                  {networkInfo.ip}:{networkInfo.port}
                </code>
                <button 
                  onClick={() => handleCopy(`${networkInfo.ip}:${networkInfo.port}`, 'local')}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-indigo-500"
                >
                  {copySuccess === 'local' ? <Shield size={18} className="text-emerald-500" /> : <Copy size={18} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Public Wiki Card */}
        {projectData && isWikiEnabled && wikiUrl && (
          <div className="bg-indigo-600 rounded-[2.5rem] p-8 shadow-xl shadow-indigo-600/20 flex flex-col items-center text-center space-y-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-full backdrop-blur-md">
              <Globe size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-50">Public Story Wiki</span>
            </div>
            
            <div className="p-4 bg-white rounded-3xl shadow-2xl">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(wikiUrl)}&bgcolor=ffffff&color=4f46e5`}
                alt="Wiki QR Code"
                className="w-48 h-48 block"
              />
            </div>

            <div className="space-y-4 w-full text-white">
              <div className="space-y-1">
                <h3 className="font-bold text-lg">{projectData.title}</h3>
                <p className="text-indigo-100 text-sm opacity-80">Share your story's public wiki with readers.</p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => window.open(wikiUrl, '_blank')}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-white text-indigo-600 rounded-2xl font-bold transition-transform active:scale-95 shadow-lg"
                >
                  <ExternalLink size={18} />
                  Open Wiki
                </button>
                <button
                  onClick={() => handleCopy(wikiUrl, 'wiki')}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-500/30 text-white rounded-2xl font-bold border border-white/20 hover:bg-indigo-500/40 transition-all"
                >
                  {copySuccess === 'wiki' ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>
        )}

        {!isWikiEnabled && projectData && (
          <div className="p-6 bg-slate-100 dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
            <Globe className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
            <h4 className="font-bold text-slate-900 dark:text-white">Wiki Disabled</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 px-4">
              Enable the Public Wiki in project settings to generate a shareable QR code for your readers.
            </p>
          </div>
        )}

        {!projectData && (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Smartphone size={32} />
            </div>
            <p className="font-serif italic text-slate-500">
              Select a story world to unlock project-specific sharing options.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
