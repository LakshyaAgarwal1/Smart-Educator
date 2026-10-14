import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sun, Moon, Sliders, Trash2, CheckCircle2, ShieldAlert, Cpu
} from 'lucide-react';
import { api } from '../api/client';

export const SettingsPage = () => {
  const {
    theme,
    setTheme,
    temperature,
    setTemperature,
    maxTokens,
    setMaxTokens,
    mode,
    setMode,
    saveSettings,
    clearAllChats,
    refreshDocuments
  } = useApp();

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async (updated) => {
    await saveSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Clear all conversation history? This cannot be undone.')) return;
    await clearAllChats();
    alert('Chat history cleared.');
  };

  const handleDeleteAllData = async () => {
    if (!window.confirm('WARNING: Permanently delete all uploaded documents, embeddings, and chats?')) return;
    setIsDeleting(true);
    try {
      await api.deleteAllData();
      await clearAllChats();
      await refreshDocuments();
      alert('All user data wiped.');
    } catch (e) {
      console.error(e);
    }
    setIsDeleting(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight font-display">
            Settings
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Customize platform appearance, AI retrieval parameters, and data privacy
          </p>
        </div>

        {savedSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 size={16} />
            <span>Settings saved successfully.</span>
          </div>
        )}

        {/* Section 1: Appearance (Screen 9) */}
        <div className="bg-white dark:bg-[#161D2F] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Appearance
          </h3>

          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Theme
            </div>
            <select
              value={theme}
              onChange={(e) => {
                setTheme(e.target.value);
                handleSave({ theme: e.target.value });
              }}
              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>

        {/* Section 2: AI Settings (Screen 9) */}
        <div className="bg-white dark:bg-[#161D2F] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            AI Settings
          </h3>

          {/* Temperature Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
              <span>Temperature</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">{temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={temperature}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setTemperature(val);
                handleSave({ temperature: val });
              }}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Max Response Length */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Max Response Length
            </div>
            <select
              value={maxTokens}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setMaxTokens(val);
                handleSave({ max_tokens: val });
              }}
              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value={512}>512 tokens</option>
              <option value={1024}>1024 tokens</option>
              <option value={2048}>2048 tokens</option>
              <option value={4096}>4096 tokens</option>
            </select>
          </div>

          {/* Default Mode */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Default Mode
            </div>
            <select
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                handleSave({ default_mode: e.target.value });
              }}
              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="EXAM">Exam Mode</option>
              <option value="WEB">Web Mode</option>
            </select>
          </div>
        </div>

        {/* Section 3: Data & Privacy (Screen 9) */}
        <div className="bg-white dark:bg-[#161D2F] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Data & Privacy
          </h3>

          <div className="space-y-3 pt-1">
            <button
              onClick={handleClearHistory}
              className="w-full sm:w-auto px-4 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={14} className="text-gray-400" />
              <span>Clear Chat History</span>
            </button>

            <div>
              <button
                onClick={handleDeleteAllData}
                disabled={isDeleting}
                className="w-full sm:w-auto px-4 py-2 border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold text-red-600 dark:text-red-400 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={14} />
                <span>{isDeleting ? 'Wiping All Data...' : 'Delete All Data'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
