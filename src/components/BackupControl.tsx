import React, { useState, useEffect } from 'react';
import {
  Download,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Settings as SettingsIcon,
} from 'lucide-react';

export interface BackupRecord {
  id: string;
  timestamp: number;
  wordCount?: number;
  hash?: string;
  status: 'delivered' | 'pending' | 'failed';
  recipientEmail?: string;
  notificationType?: 'milestone' | 'manual' | 'scheduled';
}

export interface BackupControlProps {
  projectId: string;
  projectTitle: string;
  backupHistory?: BackupRecord[];
  backupSettings?: {
    recipientEmail?: string;
    frequency?: string;
    enabled?: boolean;
    autoIncludeAttachment?: boolean;
  };
  onSendBackup?: (recipientEmail: string, includeAttachment: boolean) => Promise<void>;
  onSettingsChange?: (settings: Record<string, any>) => Promise<void>;
  isLoading?: boolean;
  fetchWithAuth?: (url: string, options?: RequestInit) => Promise<Response>;
}

export const BackupControl: React.FC<BackupControlProps> = ({
  projectId,
  projectTitle,
  backupHistory = [],
  backupSettings = {},
  onSendBackup,
  onSettingsChange,
  isLoading = false,
  fetchWithAuth,
}) => {
  const [recipientEmail, setRecipientEmail] = useState(backupSettings.recipientEmail || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [includeAttachment, setIncludeAttachment] = useState(backupSettings.autoIncludeAttachment !== false);

  const doFetch = fetchWithAuth || fetch.bind(window);

  const handleSendBackup = async () => {
    if (!recipientEmail) {
      setSendResult({ success: false, message: 'Please enter a recipient email' });
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const resp = await doFetch('/api/backup/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          recipientEmail,
          includeAttachment,
        }),
      });

      const data = await resp.json();

      if (resp.ok) {
        setSendResult({
          success: true,
          message: `Backup sent to ${recipientEmail}`,
        });
        setRecipientEmail(''); // Clear after successful send
        setTimeout(() => setSendResult(null), 5000);

        if (onSendBackup) {
          await onSendBackup(recipientEmail, includeAttachment);
        }
      } else {
        setSendResult({
          success: false,
          message: data.error || 'Failed to send backup',
        });
      }
    } catch (err) {
      setSendResult({
        success: false,
        message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSettingsSave = async () => {
    if (!recipientEmail) {
      setSendResult({ success: false, message: 'Please enter a recipient email' });
      return;
    }

    try {
      const resp = await doFetch('/api/backup/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          recipientEmail,
          autoIncludeAttachment: includeAttachment,
        }),
      });

      if (resp.ok) {
        setIsEditing(false);
        setSendResult({
          success: true,
          message: 'Backup settings saved',
        });
        setTimeout(() => setSendResult(null), 3000);

        if (onSettingsChange) {
          await onSettingsChange({ recipientEmail, autoIncludeAttachment: includeAttachment });
        }
      } else {
        const data = await resp.json();
        setSendResult({
          success: false,
          message: data.error || 'Failed to save settings',
        });
      }
    } catch (err) {
      setSendResult({
        success: false,
        message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-rose-500" />;
      default:
        return <Mail className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Send Backup Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Send className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-white">
            Send Backup Now
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 mb-2 block">
              Recipient Email
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
            <input
              type="checkbox"
              id="includeAttachment"
              checked={includeAttachment}
              onChange={(e) => setIncludeAttachment(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="includeAttachment" className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 cursor-pointer">
              Include Project Data Attachment
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSendBackup}
              disabled={isSending || isLoading || !recipientEmail}
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold uppercase text-xs rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? 'Sending...' : 'Send Backup'}
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-bold uppercase text-xs rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>

          {sendResult && (
            <div
              className={`p-3 rounded-lg border ${
                sendResult.success
                  ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'
                  : 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800'
              }`}
            >
              <p
                className={`text-xs font-bold ${
                  sendResult.success
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-rose-700 dark:text-rose-300'
                }`}
              >
                {sendResult.message}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {isEditing && (
        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <SettingsIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-white">
              Backup Settings
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 mb-2 block">
                Default Recipient Email
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
              <input
                type="checkbox"
                id="defaultAttachment"
                checked={includeAttachment}
                onChange={(e) => setIncludeAttachment(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="defaultAttachment" className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 cursor-pointer">
                Always Include Attachment by Default
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSettingsSave}
                disabled={isLoading || !recipientEmail}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white font-bold uppercase text-xs rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Settings
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-bold uppercase text-xs rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup History */}
      {backupHistory.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-white">
                Recent Backups
              </h3>
            </div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showHistory ? 'Hide' : 'Show'} ({backupHistory.length})
            </button>
          </div>

          {showHistory && (
            <div className="space-y-2">
              {backupHistory.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getStatusIcon(backup.status)}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {new Date(backup.timestamp).toLocaleDateString()} at{' '}
                        {new Date(backup.timestamp).toLocaleTimeString()}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {backup.wordCount ? `${backup.wordCount.toLocaleString()} words • ` : ''}
                        <span className="capitalize">{backup.status}</span>
                        {backup.notificationType && ` • ${backup.notificationType}`}
                      </p>
                    </div>
                  </div>
                  {backup.recipientEmail && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-2 truncate">
                      {backup.recipientEmail}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BackupControl;
