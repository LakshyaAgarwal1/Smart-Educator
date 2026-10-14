import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  GraduationCap, Plus, Search, MoreVertical, Pin, Edit3, Trash2,
  FileText, User, Settings, LogOut, Check
} from 'lucide-react';

export const Sidebar = () => {
  const {
    user,
    sessions,
    activeChatId,
    selectChat,
    createChat,
    renameChat,
    togglePinChat,
    deleteChat,
    chatSearch,
    setChatSearch,
    currentPage,
    setCurrentPage,
    setIsMobileNavOpen,
    logout
  } = useApp();

  const [contextMenuChatId, setContextMenuChatId] = useState(null);
  const [renamingChatId, setRenamingChatId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // Filter sessions safely by search
  const filteredSessions = (sessions || []).filter(s =>
    (s?.title || 'New Chat').toLowerCase().includes((chatSearch || '').toLowerCase())
  );

  // Group sessions by Today, Yesterday, Earlier
  const now = new Date();
  const today = [];
  const yesterday = [];
  const earlier = [];

  filteredSessions.forEach(session => {
    const d = new Date(session.updated_at || session.created_at || Date.now());
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) today.push(session);
    else if (diffDays === 1) yesterday.push(session);
    else earlier.push(session);
  });

  const handleStartRename = (session, e) => {
    e.stopPropagation();
    setRenamingChatId(session.id);
    setRenameValue(session.title);
    setContextMenuChatId(null);
  };

  const handleSaveRename = (id, e) => {
    e.preventDefault();
    if (renameValue.trim()) {
      renameChat(id, renameValue.trim());
    }
    setRenamingChatId(null);
  };

  const handleNavClick = (page) => {
    setCurrentPage(page);
    setIsMobileNavOpen(false);
  };

  return (
    <aside className="w-64 h-screen bg-[#0E1322] text-[#E2E8F0] flex flex-col border-r border-[#1E293B] select-none z-30">
      {/* Brand Header */}
      <div className="p-4 flex items-center justify-between border-b border-[#1E293B]/60">
        <div 
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => handleNavClick('chat')}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <GraduationCap size={18} />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight text-white flex items-center gap-1 font-display">
              Smart<span className="text-indigo-400">Educator</span>
            </div>
            <div className="text-[10px] text-gray-400 font-medium">AI Learning Assistant</div>
          </div>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={() => {
            createChat('New Chat');
            setIsMobileNavOpen(false);
          }}
          className="w-full py-2.5 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all duration-150 shadow-sm shadow-indigo-600/30 active:scale-[0.98]"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>New Chat</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search chats..."
            value={chatSearch}
            onChange={(e) => setChatSearch(e.target.value)}
            className="w-full bg-[#182032] border border-[#2A344D] text-xs text-gray-200 placeholder-gray-400 pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-4 text-xs">
        {/* Render Group */}
        {[
          { label: 'Today', items: today },
          { label: 'Yesterday', items: yesterday },
          { label: 'Earlier', items: earlier }
        ].map(group => group.items.length > 0 && (
          <div key={group.label} className="space-y-1">
            <div className="px-3 pt-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              {group.label}
            </div>
            {group.items.map(session => {
              const isActive = activeChatId === session.id && currentPage === 'chat';
              return (
                <div
                  key={session.id}
                  onClick={() => {
                    selectChat(session.id);
                    setCurrentPage('chat');
                    setIsMobileNavOpen(false);
                  }}
                  className={`group relative flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${
                    isActive
                      ? 'bg-[#1E293B] text-white font-medium border-l-2 border-indigo-500'
                      : 'text-gray-300 hover:bg-[#182032] hover:text-white'
                  }`}
                >
                  {renamingChatId === session.id ? (
                    <form 
                      onSubmit={(e) => handleSaveRename(session.id, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 flex items-center gap-1"
                    >
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        autoFocus
                        onBlur={() => setRenamingChatId(null)}
                        className="w-full bg-[#101726] border border-indigo-500 text-xs px-2 py-0.5 rounded text-white focus:outline-none"
                      />
                      <button type="submit" className="text-green-400 hover:text-green-300 p-0.5">
                        <Check size={13} />
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 truncate pr-2">
                        {session.is_pinned && (
                          <Pin size={11} className="text-indigo-400 shrink-0 rotate-45" />
                        )}
                        <span className="truncate">{session.title}</span>
                      </div>

                      {/* 3-dots Context Menu Button (Screen 7 Detail) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setContextMenuChatId(contextMenuChatId === session.id ? null : session.id);
                        }}
                        className={`p-1 rounded text-gray-400 hover:text-white transition-opacity ${
                          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <MoreVertical size={13} />
                      </button>

                      {/* Dropdown Menu matching Screen 7 */}
                      {contextMenuChatId === session.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-2 top-8 w-28 bg-[#182032] border border-[#2A344D] rounded-lg shadow-xl py-1 z-50 animate-fade-in"
                        >
                          <button
                            onClick={(e) => handleStartRename(session, e)}
                            className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-[#25304B] flex items-center gap-2"
                          >
                            <Edit3 size={12} className="text-gray-400" />
                            <span>Rename</span>
                          </button>
                          <button
                            onClick={() => {
                              togglePinChat(session.id, session.is_pinned);
                              setContextMenuChatId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-[#25304B] flex items-center gap-2"
                          >
                            <Pin size={12} className={session.is_pinned ? 'text-indigo-400' : 'text-gray-400'} />
                            <span>{session.is_pinned ? 'Unpin' : 'Pin'}</span>
                          </button>
                          <button
                            onClick={() => {
                              deleteChat(session.id);
                              setContextMenuChatId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-[#25304B] flex items-center gap-2"
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {filteredSessions.length === 0 && (
          <div className="p-4 text-center text-gray-400 text-xs">
            No chats found
          </div>
        )}
      </div>

      {/* Bottom Navigation Links */}
      <div className="p-3 border-t border-[#1E293B]/70 space-y-1 text-xs">
        <button
          onClick={() => handleNavClick('documents')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-[#182032] transition-colors ${
            currentPage === 'documents' || currentPage === 'doc-detail' || currentPage === 'drive' ? 'bg-[#1E293B] text-white font-medium' : ''
          }`}
        >
          <FileText size={15} />
          <span>Documents</span>
        </button>

        <button
          onClick={() => handleNavClick('profile')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-[#182032] transition-colors ${
            currentPage === 'profile' ? 'bg-[#1E293B] text-white font-medium' : ''
          }`}
        >
          <div className="w-5 h-5 rounded-full overflow-hidden bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
            {user?.profile?.profile_picture ? (
              <img
                src={user.profile.profile_picture}
                alt="avatar"
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <span>{user?.first_name ? user.first_name[0].toUpperCase() : (user?.username ? user.username[0].toUpperCase() : 'U')}</span>
            )}
          </div>
          <span className="truncate">{user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.username || 'Profile')}</span>
        </button>

        <button
          onClick={() => handleNavClick('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-[#182032] transition-colors ${
            currentPage === 'settings' ? 'bg-[#1E293B] text-white font-medium' : ''
          }`}
        >
          <Settings size={15} />
          <span>Settings</span>
        </button>

        <button
          onClick={() => { logout(); setIsMobileNavOpen(false); }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-[#182032] transition-colors"
        >
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
