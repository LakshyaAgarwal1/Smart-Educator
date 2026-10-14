import React, { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { renderMathAndText } from '../utils/katexRenderer';
import { Bot, FileText, Globe } from 'lucide-react';

export const ChatWindow = ({ isTyping }) => {
  const { activeChat } = useApp();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages, isTyping]);

  const messages = activeChat?.messages || [];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {messages.map((message, idx) => {
        const isUser = message.role === 'USER';

        return (
          <div
            key={message.id || idx}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            {/* Assistant Avatar */}
            {!isUser && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 mr-3 mt-1 shadow-sm">
                <Bot size={16} />
              </div>
            )}

            {/* Bubble Container */}
            <div
              className={`max-w-[88%] md:max-w-[80%] rounded-2xl p-4 md:p-5 text-sm leading-relaxed transition-all shadow-sm ${
                isUser
                  ? 'bg-[#EEF2FF] dark:bg-[#1E1B4B] text-gray-900 dark:text-gray-100 rounded-tr-sm border border-indigo-100 dark:border-indigo-900/60'
                  : 'bg-white dark:bg-[#161D2F] text-gray-900 dark:text-gray-100 rounded-tl-sm border border-gray-200 dark:border-gray-800'
              }`}
            >
              {/* Message Content rendered with KaTeX & Marked GFM Markdown */}
              <div
                className="prose dark:prose-invert max-w-none text-sm break-words"
                dangerouslySetInnerHTML={{ __html: renderMathAndText(message.content) }}
              />

              {/* Citations Chips at bottom of message (Onyx / AnythingLLM standard) */}
              {!isUser && message.citations && message.citations.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80">
                  <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                    <span>Referenced Sources ({message.citations.length}):</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {message.citations.map((cite, cIdx) => {
                      const isWeb = cite.type === 'web' || Boolean(cite.url);
                      const tag = cite.index || (isWeb ? `W${cIdx + 1}` : cIdx + 1);

                      return isWeb && cite.url ? (
                        <a
                          key={cIdx}
                          href={cite.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/70 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-900/50 text-xs text-blue-700 dark:text-blue-300 transition-colors shadow-xs"
                        >
                          <span className="font-bold text-[10px] text-blue-600 dark:text-blue-400">[{tag}]</span>
                          <Globe size={12} className="text-blue-500 shrink-0" />
                          <span className="font-medium max-w-[180px] truncate">{cite.title || 'Web Reference'}</span>
                        </a>
                      ) : (
                        <div
                          key={cIdx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/80 text-xs text-gray-700 dark:text-gray-300 shadow-xs"
                        >
                          <span className="font-bold text-[10px] text-indigo-600 dark:text-indigo-400">[{tag}]</span>
                          <FileText size={12} className="text-red-500 shrink-0" />
                          <span className="font-medium max-w-[180px] truncate">{cite.title || cite.filename}</span>
                          <span className="text-gray-400 dark:text-gray-500 text-[11px]">
                            (p. {cite.page || cite.page_number || 1})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Typing Indicator */}
      {isTyping && (
        <div className="flex justify-start items-center gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0">
            <Bot size={16} />
          </div>
          <div className="bg-white dark:bg-[#161D2F] border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
