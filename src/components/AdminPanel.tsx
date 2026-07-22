import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  UserCheck,
  UserX,
  Search,
  Key,
  FileText,
  Download,
  Copy,
  Check,
  RefreshCw,
  Database,
  Lock,
  Mail,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Server
} from 'lucide-react';
import { SystemUser, BackupCodeRecord, Blueprint, ResearchNotebook, AtlasMapState } from '../types';

interface AdminPanelProps {
  user: any;
  userBlueprints?: Blueprint[];
  notebooks?: ResearchNotebook[];
  atlasState?: AtlasMapState | null;
  onSendGmailBackup?: () => Promise<void> | void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  user,
  userBlueprints = [],
  notebooks = [],
  atlasState,
  onSendGmailBackup
}) => {
  // Users State
  const [users, setUsers] = useState<SystemUser[]>(() => {
    const local = localStorage.getItem('plothole_admin_users');
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }
    return [
      {
        uid: user?.uid || 'usr_current',
        email: user?.email || 'alittler86@gmail.com',
        displayName: user?.displayName || 'Primary Administrator',
        role: 'admin',
        grantedAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      },
      {
        uid: 'usr_editor_1',
        email: 'editor.lead@fantasyworld.org',
        displayName: 'Lead Script Editor',
        role: 'editor',
        grantedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        lastActive: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        uid: 'usr_user_2',
        email: 'cartographer@realm.com',
        displayName: 'Realm Cartographer',
        role: 'user',
        grantedAt: new Date(Date.now() - 86400000 * 12).toISOString(),
        lastActive: new Date(Date.now() - 3600000 * 18).toISOString()
      }
    ];
  });

  const [userSearch, setUserSearch] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'editor' | 'user'>('editor');

  // Backup Code Records
  const [backupRecords, setBackupRecords] = useState<BackupCodeRecord[]>([]);
  const [backupSearch, setBackupSearch] = useState('');
  const [selectedBackup, setSelectedBackup] = useState<BackupCodeRecord | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupSuccessNotice, setBackupSuccessNotice] = useState<string | null>(null);

  // Generate Backups on load
  useEffect(() => {
    const records: BackupCodeRecord[] = [];

    // Add Blueprint dossier backups
    userBlueprints.forEach((bp, index) => {
      records.push({
        id: `bak_bp_${bp.sha.slice(0, 8)}`,
        code: `DOSSIER-SHA-${bp.sha.slice(0, 10).toUpperCase()}`,
        description: `Manuscript Blueprint "${bp.manuscript_title || 'Untitled'}" (${bp.characters?.length || 0} characters profiled)`,
        created: bp.last_edited || bp.first_processed || new Date().toISOString(),
        type: 'dossier',
        payloadSnippet: JSON.stringify(bp, null, 2)
      });
    });

    // Add Research Notebook backups
    notebooks.forEach((nb) => {
      records.push({
        id: `bak_nb_${nb.id}`,
        code: `NOTEBOOK-CODE-${nb.id.toUpperCase()}`,
        description: `Research Notebook "${nb.name}" (${nb.sources?.length || 0} sources loaded)`,
        created: nb.lastEdited || new Date().toISOString(),
        type: 'notebook',
        payloadSnippet: JSON.stringify(nb, null, 2)
      });
    });

    // Add Fantasy Atlas backup
    if (atlasState) {
      records.push({
        id: `bak_atlas_${atlasState.id}`,
        code: `ATLAS-CODE-${atlasState.id.toUpperCase()}`,
        description: `Fantasy Atlas Map "${atlasState.mapTitle}" (${atlasState.locations?.length || 0} locations marked)`,
        created: atlasState.updatedAt || new Date().toISOString(),
        type: 'atlas',
        payloadSnippet: JSON.stringify(atlasState, null, 2)
      });
    }

    // System emergency backup code
    records.push({
      id: 'bak_sys_recovery',
      code: 'SYS-PLOTHOLE-RECOVERY-KEY-2026-X99',
      description: 'System Emergency Master Recovery Code & Security Encryption Token',
      created: new Date().toISOString(),
      type: 'system',
      payloadSnippet: JSON.stringify({
        systemVersion: 'v2.4.0-pro',
        userUid: user?.uid,
        userEmail: user?.email,
        timestamp: new Date().toISOString(),
        activeModules: ['Analyzer', 'NotebookLM Research', 'Fantasy Atlas', 'Gmail Sync', 'Firestore Engine']
      }, null, 2)
    });

    setBackupRecords(records);
    if (records.length > 0 && !selectedBackup) {
      setSelectedBackup(records[0]);
    }

    localStorage.setItem('plothole_admin_users', JSON.stringify(users));
  }, [userBlueprints, notebooks, atlasState]);

  // Handle Role Assignment Toggle
  const handleUpdateRole = (uid: string, newRole: 'admin' | 'editor' | 'user') => {
    const updated = users.map((u) => {
      if (u.uid === uid) {
        return { ...u, role: newRole, grantedAt: new Date().toISOString() };
      }
      return u;
    });
    setUsers(updated);
    localStorage.setItem('plothole_admin_users', JSON.stringify(updated));
  };

  // Add User
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return;

    const newUser: SystemUser = {
      uid: 'usr_' + Date.now(),
      email: newUserEmail.trim(),
      displayName: newUserEmail.split('@')[0],
      role: newUserRole,
      grantedAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };

    const updated = [newUser, ...users];
    setUsers(updated);
    localStorage.setItem('plothole_admin_users', JSON.stringify(updated));
    setNewUserEmail('');
  };

  // Manual Backup Trigger
  const handleTriggerManualBackup = async () => {
    setIsBackingUp(true);
    try {
      if (onSendGmailBackup) {
        await onSendGmailBackup();
      }
      setBackupSuccessNotice('Full backup code dispatch executed successfully! Sent to Gmail & synced to Firestore.');
      setTimeout(() => setBackupSuccessNotice(null), 5000);
    } catch (e) {
      console.error("Manual backup error:", e);
    } finally {
      setIsBackingUp(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.displayName && u.displayName.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const filteredBackups = backupRecords.filter(
    (b) =>
      b.code.toLowerCase().includes(backupSearch.toLowerCase()) ||
      b.description.toLowerCase().includes(backupSearch.toLowerCase()) ||
      b.type.toLowerCase().includes(backupSearch.toLowerCase())
  );

  return (
    <div className="flex-1 bg-slate-900 text-slate-100 flex flex-col overflow-y-auto select-scrollbar font-sans p-6 space-y-8">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 rounded-xl shadow-inner">
            <Lock className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white">System Admin & Security Control Center</h2>
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
                Admin Privileges Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Manage user roles & permissions, inspect system encryption backup codes, and oversee auto-save payloads.
            </p>
          </div>
        </div>

        <button
          onClick={handleTriggerManualBackup}
          disabled={isBackingUp}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20 shrink-0"
        >
          {isBackingUp ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <Mail className="w-4 h-4" />}
          <span>{isBackingUp ? 'Dispatching Backup...' : 'Execute Instant System Backup'}</span>
        </button>
      </div>

      {backupSuccessNotice && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 p-4 rounded-xl flex items-center gap-3 text-xs animate-fade-in shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{backupSuccessNotice}</span>
        </div>
      )}

      {/* SECTION 1: USER ROLE ASSIGNMENT & ACCESS CONTROL */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-400" />
              <span>User Role & Admin Permissions Management</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Assign Admin, Editor, or User privileges to team members.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Filter users by email..."
              className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Add New User Form */}
        <form onSubmit={handleAddUser} className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Grant Access to User Email</label>
            <input
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="e.g. coauthor@realm.com"
              className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Assign Role</label>
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="admin">Admin (Full Control)</option>
              <option value="editor">Editor (Can Edit & Save)</option>
              <option value="user">User (View Only)</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm shrink-0"
          >
            Add & Assign Role
          </button>
        </form>

        {/* Users Table */}
        <div className="overflow-x-auto select-scrollbar rounded-xl border border-slate-800 bg-slate-900/50">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">User Email & Name</th>
                <th className="px-4 py-3">Current Role</th>
                <th className="px-4 py-3">Granted Date</th>
                <th className="px-4 py-3 text-right">Assign Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredUsers.map((u) => (
                <tr key={u.uid} className="hover:bg-slate-800/40 transition-all">
                  <td className="px-4 py-3 font-semibold text-white flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-900/60 border border-indigo-700/50 flex items-center justify-center text-indigo-300 font-bold text-xs uppercase">
                      {u.email.charAt(0)}
                    </div>
                    <div>
                      <div>{u.displayName || u.email}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{u.email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      u.role === 'admin'
                        ? 'bg-purple-950/80 text-purple-300 border-purple-700/60'
                        : u.role === 'editor'
                        ? 'bg-blue-950/80 text-blue-300 border-blue-700/60'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-[11px]">
                    {new Date(u.grantedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleUpdateRole(u.uid, 'admin')}
                          className="px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-[11px] font-bold rounded-lg cursor-pointer transition-all"
                        >
                          Promote to Admin
                        </button>
                      )}
                      {u.role !== 'editor' && (
                        <button
                          onClick={() => handleUpdateRole(u.uid, 'editor')}
                          className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-200 text-[11px] font-bold rounded-lg cursor-pointer transition-all"
                        >
                          Make Editor
                        </button>
                      )}
                      {u.role !== 'user' && (
                        <button
                          onClick={() => handleUpdateRole(u.uid, 'user')}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded-lg cursor-pointer transition-all"
                        >
                          Demote
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: BACKUP CODE VIEWER & SYSTEM SNAPSHOTS */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-400" />
              <span>System Backup Codes & Raw Payload Inspector</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">View all encrypted backup codes and payload JSON documents generated by auto-saves.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={backupSearch}
              onChange={(e) => setBackupSearch(e.target.value)}
              placeholder="Search backup code or type..."
              className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Backup Codes List (5 cols) */}
          <div className="lg:col-span-5 space-y-2 max-h-[450px] overflow-y-auto select-scrollbar pr-1">
            {filteredBackups.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">No backup code records match search query.</div>
            ) : (
              filteredBackups.map((bak) => {
                const isSelected = selectedBackup?.id === bak.id;
                return (
                  <div
                    key={bak.id}
                    onClick={() => setSelectedBackup(bak)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/70 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-amber-300 truncate">{bak.code}</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                        {bak.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 font-medium">{bak.description}</p>
                    <div className="text-[10px] text-slate-500 mt-1.5 flex items-center justify-between">
                      <span>Created: {new Date(bak.created).toLocaleString()}</span>
                      <span className="text-indigo-400 font-semibold">Click to inspect payload →</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Payload Inspector View (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-[450px]">
            {selectedBackup ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-white font-mono">{selectedBackup.code}</h4>
                    <span className="text-[10px] text-slate-400">{selectedBackup.description}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedBackup.payloadSnippet);
                        setCopiedCodeId(selectedBackup.id);
                        setTimeout(() => setCopiedCodeId(null), 3000);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-all"
                    >
                      {copiedCodeId === selectedBackup.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCodeId === selectedBackup.id ? 'Copied Payload!' : 'Copy Code Payload'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-y-auto font-mono text-[11px] text-emerald-300 leading-relaxed whitespace-pre-wrap select-scrollbar">
                  {selectedBackup.payloadSnippet}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs">
                Select a backup code from the left panel to inspect its JSON code.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
