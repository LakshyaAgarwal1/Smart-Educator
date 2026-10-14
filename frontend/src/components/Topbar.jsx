import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Menu, ShieldCheck, Globe, ChevronDown, Check, BookOpen
} from 'lucide-react';

export const Topbar = () => {
  const {
    activeChat,
    currentPage,
    mode,
    setMode,
    user,
    setCurrentPage,
    setIsMobileNavOpen,
    setIsMobileSourcesOpen
  } = useApp();

  const [isModeOpen, setIsModeOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsModeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Title calculation
  let title = 'New Chat';
  if (currentPage === 'chat') {
    title = activeChat?.title || 'New Chat';
  } else if (currentPage === 'documents') {
    title = 'Documents';
  } else if (currentPage === 'doc-detail') {
    title = 'Document Details';
  } else if (currentPage === 'drive') {
    title = 'Google Drive Sync';
  } else if (currentPage === 'profile') {
    title = 'User Profile';
  } else if (currentPage === 'settings') {
    title = 'Settings';
  }

  return (
    <header className="h-16 px-4 md:px-6 bg-white dark:bg-[#111827] border-b border-[#E2E8F0] dark:border-[#1F2937] flex items-center justify-between z-20 transition-colors">
      {/* Left: Mobile Toggle & Page/Chat Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsMobileNavOpen(prev => !prev)}
          className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        <h1 className="text-base md:text-lg font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          {title}
        </h1>
      </div>

      {/* Right Controls: Mode Selector & Avatar */}
      <div className="flex items-center gap-3">
        {/* Mode Selector (Screen 2 & 3) */}
        {currentPage === 'chat' && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsModeOpen(prev => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/80 transition-all shadow-sm"
            >
              {mode === 'EXAM' ? (
                <>
                  <ShieldCheck size={14} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Exam Mode</span>
                </>
              ) : (
                <>
                  <Globe size={14} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Web Mode</span>
                </>
              )}
              <ChevronDown size={13} className={`text-gray-400 transition-transform ${isModeOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Mode Switch Dropdown (Screen 3) */}
            {isModeOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-2 z-50 animate-fade-in">
                {/* Option 1: Exam Mode */}
                <div
                  onClick={() => {
                    setMode('EXAM');
                    setIsModeOpen(false);
                  }}
                  className={`p-3 rounded-xl cursor-pointer transition-all flex items-start gap-3 ${
                    mode === 'EXAM' 
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                    <ShieldCheck size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">Exam Mode</div>
                      {mode === 'EXAM' && <Check size={14} className="text-indigo-600 dark:text-indigo-400" />}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                      Answers ONLY from your uploaded materials.
                    </div>
                  </div>
                </div>

                {/* Option 2: Web Mode */}
                <div
                  onClick={() => {
                    setMode('WEB');
                    setIsModeOpen(false);
                  }}
                  className={`p-3 rounded-xl cursor-pointer transition-all flex items-start gap-3 mt-1 ${
                    mode === 'WEB' 
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                    <Globe size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">Web Mode</div>
                      {mode === 'WEB' && <Check size={14} className="text-emerald-600 dark:text-emerald-400" />}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                      Uses uploaded documents + internet for better answers.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mobile Sources Toggle Button (Screen 12) */}
        {currentPage === 'chat' && (
          <button
            onClick={() => setIsMobileSourcesOpen(prev => !prev)}
            className="lg:hidden p-2 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100"
            title="View Sources"
          >
            <BookOpen size={16} />
          </button>
        )}

        {/* User Profile Avatar */}
        <div
          onClick={() => setCurrentPage('profile')}
          className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center cursor-pointer shadow-sm ring-2 ring-indigo-500/20 hover:scale-105 transition-transform"
          title={`${user?.first_name || user?.username || 'User'} Profile`}
        >
          {user?.profile?.profile_picture ? (
            <img
              src={user.profile.profile_picture}
              alt={user?.first_name || user?.username || 'User'}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <span>{user?.first_name ? user.first_name[0].toUpperCase() : (user?.username ? user.username[0].toUpperCase() : 'U')}</span>
          )}
        </div>
      </div>
    </header>
  );
};
