import React, { useState, useEffect } from 'react';
import { Globe, Lock, Share2, Loader2, AlertCircle, Check } from 'lucide-react';

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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [wikiUrl, setWikiUrl] = useState('');

  // Use provided fetchWithAuth or fallback to plain fetch
  const doFetch = fetchWithAuth || fetch.bind(window);

  useEffect(() => {
    fetchWikiSettings();
  }, [projectId]);

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
      if (data.username) {
        setWikiUrl(`plothole.click/${data.username}/${encodeURIComponent(projectTitle)}`);
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
          is_wiki_public: isWikiPublic
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
              {wikiUrl && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-3 p-2 bg-white dark:bg-slate-900 rounded-lg break-all">
                  {wikiUrl}
                </p>
              )}
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
