import React from 'react';
import { useApp } from '../context/AppContext';
import { BookOpen, FileText, CheckCircle2, ShieldCheck, Globe, X } from 'lucide-react';

export const SourcesPanel = ({ isMobileDrawer = false }) => {
  const { currentSources, confidence, mode, setIsMobileSourcesOpen } = useApp();

  return (
    <div className="h-full flex flex-col p-4 bg-[#F8FAFC] dark:bg-[#0E1322] border-l border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-bold tracking-tight">Sources</h2>
        </div>
        {isMobileDrawer && (
          <button
            onClick={() => setIsMobileSourcesOpen(false)}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Source Cards List */}
      <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
        {currentSources && currentSources.length > 0 ? (
          currentSources.map((source, index) => {
            const isWeb = source.type === 'web' || Boolean(source.url);

            return (
              <div
                key={index}
                className="p-3 bg-white dark:bg-[#161D2F] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  {isWeb ? (
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40">
                      <Globe size={16} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-100 dark:border-red-900/40">
                      <FileText size={16} />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        isWeb
                          ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                          : 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                      }`}>
                        [{source.index || (isWeb ? `W${index + 1}` : index + 1)}]
                      </span>
                      <div className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {source.title || source.filename || `Source ${index + 1}`}
                      </div>
                    </div>

                    {isWeb ? (
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {source.url ? (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline inline-block max-w-full truncate"
                          >
                            {source.url.replace(/^https?:\/\/(www\.)?/, '')}
                          </a>
                        ) : (
                          'Web Source'
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        Page {source.page || source.page_number || 1}
                      </div>
                    )}

                    {source.snippet && (
                      <div className="text-[11px] text-gray-600 dark:text-gray-400 mt-1.5 line-clamp-2 italic bg-gray-50 dark:bg-gray-800/40 p-1.5 rounded-lg border border-gray-100 dark:border-gray-800">
                        "{source.snippet}"
                      </div>
                    )}

                    <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-1.5 flex items-center gap-1">
                      <span>Relevance:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {source.relevance ? `${source.relevance}%` : `${Math.max(50, 95 - index * 6)}%`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-6 text-center text-xs text-gray-400">
            No source documents retrieved for this query.
          </div>
        )}
      </div>

      {/* Bottom Confidence & Mode Cards matching Screen 2 */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-800 space-y-3">
        {/* Confidence Meter */}
        <div className="p-3 bg-white dark:bg-[#161D2F] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-500 dark:text-gray-400 font-medium">Confidence</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
              {confidence}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>

        {/* Mode Status Card */}
        <div className="p-3 bg-white dark:bg-[#161D2F] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm text-xs">
          <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
            Mode
          </div>
          <div className="font-bold text-gray-900 dark:text-white mt-0.5 flex items-center gap-1.5">
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
          </div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            {mode === 'EXAM' ? '(Using uploaded materials only)' : '(Using uploaded materials + internet)'}
          </div>
        </div>
      </div>
    </div>
  );
};
