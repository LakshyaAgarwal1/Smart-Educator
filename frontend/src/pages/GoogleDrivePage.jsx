import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  RefreshCw, Upload, FileText, CheckCircle2, ArrowRight, ShieldCheck, HardDrive
} from 'lucide-react';
import { UploadModal } from '../components/UploadModal';
import { api } from '../api/client';

export const GoogleDrivePage = () => {
  const { driveStatus, refreshDriveStatus, setCurrentPage, navigateToDocDetail } = useApp();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [syncNotice, setSyncNotice] = useState('');
  const [syncError, setSyncError] = useState('');

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncNotice('');
    setSyncError('');
    try {
      const res = await api.syncDrive();
      if (res?.status === 'success') {
        const count = res.imported_files?.length || res.total_imported || 0;
        setSyncNotice(`Sync completed! ${count} new file(s) imported from Google Drive.`);
      } else if (res?.message) {
        setSyncError(res.message);
      }
      await refreshDriveStatus();
    } catch (e) {
      setSyncError(e.message || 'Failed to sync Google Drive.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncNotice(''), 6000);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Google Drive integration?')) return;
    try {
      await api.disconnectDrive();
      await refreshDriveStatus();
      setSyncNotice('Google Drive disconnected.');
      setTimeout(() => setSyncNotice(''), 4000);
    } catch (e) {
      setSyncError(e.message || 'Failed to disconnect.');
    }
  };

  const syncedFiles = driveStatus?.synced_files || [];
  const isConnected = Boolean(driveStatus?.connected);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors">
      <div className="max-w-4xl mx-auto space-y-6">
        {syncNotice && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{syncNotice}</span>
          </div>
        )}

        {syncError && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs font-semibold text-red-700 dark:text-red-300 animate-fade-in">
            {syncError}
          </div>
        )}

        {/* Header (Screen 6) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight font-display">
              Documents
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Google Drive Cloud Storage Sync
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2.5 bg-white dark:bg-[#161D2F] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-semibold text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Upload size={14} />
              <span>Upload Document</span>
            </button>

            {isConnected && (
              <button
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Google Drive Status Card (Screen 6) */}
        <div className="bg-white dark:bg-[#161D2F] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center shrink-0">
                <HardDrive size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Google Drive</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  {isConnected ? (
                    <>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Connected</span>
                      </div>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {driveStatus?.email || 'Connected Account'}
                      </span>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>Not Connected</span>
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  {isConnected 
                    ? `Last synced: ${driveStatus?.last_synced || 'Recently'}`
                    : 'Connect your Google account to automatically synchronize study materials.'}
                </div>
              </div>
            </div>

            {isConnected ? (
              <button
                onClick={handleDisconnect}
                className="px-3.5 py-1.5 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={async () => {
                  try {
                    const data = await api.getGoogleLoginUrl(window.location.origin);
                    if (data && data.url) {
                      window.location.href = data.url;
                    } else {
                      window.location.href = 'http://127.0.0.1:8000/accounts/google/login/';
                    }
                  } catch (e) {
                    window.location.href = 'http://127.0.0.1:8000/accounts/google/login/';
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                Connect Drive
              </button>
            )}
          </div>
        </div>

        {/* Synced Files Section (Screen 6) */}
        <div className="bg-white dark:bg-[#161D2F] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
            Synced Files
          </h3>

          {syncedFiles.length > 0 ? (
            <div className="space-y-3">
              {syncedFiles.map((f) => (
                <div
                  key={f.id}
                  onClick={() => navigateToDocDetail(f.id)}
                  className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-100 dark:border-red-900/40">
                      <FileText size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white">
                        {f.display_name || f.filename || f.name}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {f.page_count || f.pages || 1} pages • {f.file_type || 'PDF'}
                      </div>
                    </div>
                  </div>

                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    {f.status || 'SYNCED'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400 text-xs">
              {isConnected 
                ? 'No documents synced from Google Drive yet. Click "Sync Now" to fetch your files.' 
                : 'Connect your Google Drive account above to automatically import your study documents.'}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setCurrentPage('documents')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <span>View all documents</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
};
