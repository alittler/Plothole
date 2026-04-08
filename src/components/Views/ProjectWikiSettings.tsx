import React, { useState, useEffect } from 'react';
import { Globe, Lock, Share2, Loader2, AlertCircle, Check, Copy, ExternalLink } from 'lucide-react';

interface ProjectWikiSettingsProps {
  projectId: string;
  projectTitle: string;
  onClose: () => void;
  fetchWithAuth?: (url: string, options?: RequestInit) => Promise<Response>;
}

export const ProjectWikiSettings: React.FC<ProjectWikiSettingsProps> = ({
  projectId,
  projectTitle,
  onClose,
  fetchWithAuth
}) => {
  const [isWikiEnabled, setIsWikiEnabled] = useState(true);
  const [isWikiPublic, setIsWikiPublic] = useState(false);
  const [includeCharacters, setIncludeCharacters] = useState(true);
  const [includeLocations, setIncludeLocations] = useState(true);
  const [includeTimeline, setIncludeTimeline] = useState(true);
  const [includeLore, setIncludeLore] = useState(true);
  const [includeArtifacts, setIncludeArtifacts] = useState(true);
  const [includeManuscript, setIncludeManuscript] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [wikiUrl, setWikiUrl] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Use provided fetchWithAuth or fallback to plain fetch
  const doFetch = fetchWithAuth || fetch.bind(window);

  useEffect(() => {
    fetchWikiSettings();
  }, [projectId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(wikiUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_') // Replace all non-alphanumeric chars with _
      .replace(/^_+|_+$/g, '');       // Trim leading/trailing underscores
  };

  const fetchWikiSettings = async () => {
    try {
      const resp = await doFetch(`/api/projects/${projectId}/wiki-settings`);
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(`HTTP ${resp.status}: ${errorData.error || 'Failed to fetch wiki settings'}`);
      }
      const data = await resp.json();
      setIsWikiEnabled(data.enable_wiki !== false);
      setIsWikiPublic(data.is_wiki_public === true);
      
      // Load content settings if they exist
      if (data.wikiSettings) {
        setIncludeCharacters(data.wikiSettings.includeCharacters !== false);
        setIncludeLocations(data.wikiSettings.includeLocations !== false);
        setIncludeTimeline(data.wikiSettings.includeTimeline !== false);
        setIncludeLore(data.wikiSettings.includeLore !== false);
        setIncludeArtifacts(data.wikiSettings.includeArtifacts !== false);
        setIncludeManuscript(data.wikiSettings.includeManuscript === true);
      }
      
      if (data.username) {
        // Use the actual domain or current origin
        const baseUrl = window.location.origin;
        const slugifiedTitle = slugify(projectTitle);
        setWikiUrl(`${baseUrl}/${data.username}/${slugifiedTitle}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[WikiSettings] Failed to fetch wiki settings:', errorMsg);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isWikiEnabled && isWikiPublic) {
      setError('Cannot make wiki public if wiki is disabled');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const resp = await doFetch(`/api/projects/${projectId}/wiki-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enable_wiki: isWikiEnabled,
          is_wiki_public: isWikiPublic,
          wikiSettings: {
            includeCharacters,
            includeLocations,
            includeTimeline,
            includeLore,
            includeArtifacts,
            includeManuscript
          }
        })
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(`HTTP ${resp.status}: ${errorData.error || 'Failed to save wiki settings'}`);
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[WikiSettings] Failed to save wiki settings:', errorMsg);
      setError(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Loading wiki settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wiki URL Section (Always visible if enabled) */}
      {isWikiEnabled && (
        wikiUrl ? (
          <div className="bg-indigo-600 rounded-3xl p-6 text-white space-y-4 shadow-xl shadow-indigo-600/20">
            <div className="flex items-center justify-between">
              <h3 className="font-black uppercase tracking-widest text-xs flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Share Your Wiki
              </h3>
              {!isWikiPublic && (
                <span className="bg-indigo-500/50 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg flex items-center gap-1.5 border border-white/10">
                  <Lock className="w-3 h-3" />
                  Private Link
                </span>
              )}
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 items-center">
              {/* URL and Buttons */}
              <div className="flex-1 space-y-3 w-full">
                <div className="text-[11px] font-mono bg-black/20 p-3 rounded-xl break-all border border-white/10">
                  {wikiUrl}
                </div>
                
                <div className="flex gap-2">
                  <a
                    href={wikiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-white text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Visit
                  </a>
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-400 transition-colors border border-white/10"
                  >
                    {copySuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* QR Code */}
              <div className="shrink-0 bg-white p-2 rounded-2xl shadow-inner shadow-black/5">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(wikiUrl)}&bgcolor=ffffff&color=4f46e5`}
                  alt="Wiki QR Code"
                  className="w-[100px] h-[100px] block"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-3xl p-6 space-y-3 text-center">
            <h3 className="font-black uppercase tracking-widest text-xs text-amber-600 flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Username Required
            </h3>
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
              You need to set a Wiki Username in your profile settings before you can share your wiki.
            </p>
          </div>
        )
      )}

      {/* Wiki Enabled Toggle */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-600" />
              Enable Wiki Feature
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Create a public wiki page for this story with characters, world-building, and timeline
            </p>
          </div>
          <button
            onClick={() => {
              setIsWikiEnabled(!isWikiEnabled);
              if (!isWikiEnabled) setIsWikiPublic(false);
            }}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              isWikiEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                isWikiEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Public Wiki Toggle */}
      {isWikiEnabled && (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-600" />
                Make Wiki Public
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Allow anyone with the link to view this wiki page
              </p>
            </div>
            <button
              onClick={() => setIsWikiPublic(!isWikiPublic)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                isWikiPublic ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  isWikiPublic ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Wiki Content Settings */}
      {isWikiEnabled && (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-4">
            <Globe className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-widest">Wiki Content Settings</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Include Characters', state: includeCharacters, setter: setIncludeCharacters },
              { label: 'Include Locations', state: includeLocations, setter: setIncludeLocations },
              { label: 'Include Timeline', state: includeTimeline, setter: setIncludeTimeline },
              { label: 'Include Lore', state: includeLore, setter: setIncludeLore },
              { label: 'Include Artifacts', state: includeArtifacts, setter: setIncludeArtifacts },
              { label: 'Include Manuscript', state: includeManuscript, setter: setIncludeManuscript, warning: 'Publicly shares your draft text' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
                  {item.warning && <p className="text-[10px] text-amber-600 font-medium italic">{item.warning}</p>}
                </div>
                <button
                  onClick={() => item.setter(!item.state)}
                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                    item.state ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      item.state ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isWikiEnabled && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Enable the wiki feature to make your story publicly accessible
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-2xl p-4 flex items-start gap-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800 dark:text-green-200">Wiki settings saved successfully!</p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
};
