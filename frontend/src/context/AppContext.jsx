import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Navigation & Page routing
  const [currentPage, setCurrentPage] = useState('chat');
  const [selectedDocId, setSelectedDocId] = useState(null);

  // User State - starts null so real user session must authenticate
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    documents_count: 0,
    chats_count: 0,
    storage_used: '0 MB'
  });

  // Settings State
  const [theme, setTheme] = useState('light');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [mode, setMode] = useState('EXAM'); // 'EXAM' | 'WEB'

  // Chat State
  const [sessions, setSessions] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [chatSearch, setChatSearch] = useState('');
  const [currentSources, setCurrentSources] = useState([]);
  const [confidence, setConfidence] = useState(0);

  // Documents State
  const [documents, setDocuments] = useState([]);
  const [docFilter, setDocFilter] = useState('ALL');
  const [docSearch, setDocSearch] = useState('');
  const [driveStatus, setDriveStatus] = useState({
    connected: false,
    email: '',
    last_synced: null,
    synced_files: []
  });

  // Password reset helper state across request and confirm pages
  const [resetEmail, setResetEmail] = useState('');
  const [resetCodePreview, setResetCodePreview] = useState('');

  // Mobile drawer states
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isMobileSourcesOpen, setIsMobileSourcesOpen] = useState(false);

  // Load initial theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load User & Data on mount
  useEffect(() => {
    const initializeAuth = async () => {
      setIsAuthLoading(true);
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const authToken = urlParams.get('auth_token');
        if (authToken) {
          try {
            const tokenRes = await api.tokenLogin(authToken);
            if (tokenRes && tokenRes.user) {
              setUser(tokenRes.user);
              window.history.replaceState({}, document.title, window.location.pathname);
              await Promise.all([
                refreshSessions(),
                refreshDocuments(),
                refreshDriveStatus(),
                loadSettings()
              ]);
              setCurrentPage('chat');
              return;
            }
          } catch (tErr) {
            console.warn('One-time token login exchange failed:', tErr);
          }
        }

        const data = await api.getMe();
        if (data && data.user) {
          setUser(data.user);
          if (data.stats) setUserStats(data.stats);
          await Promise.all([
            refreshSessions(),
            refreshDocuments(),
            refreshDriveStatus(),
            loadSettings()
          ]);
          setCurrentPage('chat');
          if (window.location.search.includes('auth_success') || window.location.search.includes('auth_token')) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } else {
          setUser(null);
          setCurrentPage('login');
        }
      } catch (err) {
        setUser(null);
        setCurrentPage('login');
      } finally {
        setIsAuthLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const refreshUser = async () => {
    try {
      const data = await api.getMe();
      if (data && data.user) {
        setUser(data.user);
        if (data.stats) setUserStats(data.stats);
        await Promise.all([
          refreshSessions(),
          refreshDocuments(),
          refreshDriveStatus(),
          loadSettings()
        ]);
        return data.user;
      } else {
        setUser(null);
        setCurrentPage('login');
        return null;
      }
    } catch (e) {
      setUser(null);
      setCurrentPage('login');
      return null;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {}
    setUser(null);
    setSessions([]);
    setActiveChat(null);
    setActiveChatId(null);
    setDocuments([]);
    setCurrentSources([]);
    setConfidence(0);
    setCurrentPage('login');
  };

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      if (data) {
        if (data.theme) setTheme(data.theme);
        if (data.temperature !== undefined) setTemperature(data.temperature);
        if (data.max_tokens !== undefined) setMaxTokens(data.max_tokens);
        if (data.default_mode) setMode(data.default_mode);
      }
    } catch (e) {}
  };

  const refreshSessions = async (search = '') => {
    try {
      const data = await api.getChatSessions(search);
      setSessions(data || []);
      if (!activeChatId && data && data.length > 0) {
        selectChat(data[0].id);
      }
    } catch (e) {}
  };

  const refreshDocuments = async (query = '', type = '') => {
    try {
      const data = await api.getDocuments(query, type === 'ALL' ? '' : type);
      setDocuments(data || []);
    } catch (e) {}
  };

  const refreshDriveStatus = async () => {
    try {
      const data = await api.getDriveStatus();
      setDriveStatus(data);
    } catch (e) {}
  };

  const selectChat = async (id) => {
    setActiveChatId(id);
    try {
      const data = await api.getChatDetail(id);
      setActiveChat(data);
      // Update sources if last assistant message has citations
      if (data && data.messages && data.messages.length > 0) {
        const lastAssistant = [...data.messages].reverse().find(m => m.role === 'ASSISTANT');
        if (lastAssistant && lastAssistant.citations && lastAssistant.citations.length > 0) {
          setCurrentSources(lastAssistant.citations);
          setConfidence(lastAssistant.confidence || (mode === 'WEB' ? 90 : 85));
        } else {
          setCurrentSources([]);
          setConfidence(0);
        }
      } else {
        setCurrentSources([]);
        setConfidence(0);
      }
    } catch (e) {
      console.warn('Could not fetch chat detail:', e);
    }
  };

  const createChat = async (title = 'New Chat') => {
    try {
      const newSession = await api.createChatSession(title);
      await refreshSessions();
      if (newSession && newSession.id) {
        selectChat(newSession.id);
        setCurrentPage('chat');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const renameChat = async (id, newTitle) => {
    try {
      await api.updateChatSession(id, { title: newTitle });
      await refreshSessions();
      if (activeChatId === id) {
        setActiveChat(prev => prev ? { ...prev, title: newTitle } : prev);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const togglePinChat = async (id, currentPinned) => {
    try {
      await api.updateChatSession(id, { is_pinned: !currentPinned });
      await refreshSessions();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteChat = async (id) => {
    try {
      await api.deleteChatSession(id);
      await refreshSessions();
      if (activeChatId === id) {
        const remaining = sessions.filter(s => s.id !== id);
        if (remaining.length > 0) {
          selectChat(remaining[0].id);
        } else {
          setActiveChat(null);
          setActiveChatId(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const clearAllChats = async () => {
    try {
      await api.clearAllChats();
      setSessions([]);
      setActiveChat(null);
      setActiveChatId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await api.updateSettings(newSettings);
      if (newSettings.theme) setTheme(newSettings.theme);
      if (newSettings.temperature !== undefined) setTemperature(newSettings.temperature);
      if (newSettings.max_tokens !== undefined) setMaxTokens(newSettings.max_tokens);
      if (newSettings.default_mode) setMode(newSettings.default_mode);
    } catch (e) {
      console.error(e);
    }
  };

  const navigateToDocDetail = (docId) => {
    setSelectedDocId(docId);
    setCurrentPage('doc-detail');
  };

  return (
    <AppContext.Provider
      value={{
        currentPage,
        setCurrentPage,
        selectedDocId,
        setSelectedDocId,
        navigateToDocDetail,
        user,
        setUser,
        isAuthLoading,
        logout,
        userStats,
        refreshUser,
        theme,
        setTheme,
        temperature,
        setTemperature,
        maxTokens,
        setMaxTokens,
        mode,
        setMode,
        saveSettings,
        sessions,
        activeChatId,
        activeChat,
        setActiveChat,
        chatSearch,
        setChatSearch,
        selectChat,
        createChat,
        renameChat,
        togglePinChat,
        deleteChat,
        clearAllChats,
        refreshSessions,
        currentSources,
        setCurrentSources,
        confidence,
        setConfidence,
        documents,
        refreshDocuments,
        docFilter,
        setDocFilter,
        docSearch,
        setDocSearch,
        driveStatus,
        refreshDriveStatus,
        resetEmail,
        setResetEmail,
        resetCodePreview,
        setResetCodePreview,
        isMobileNavOpen,
        setIsMobileNavOpen,
        isMobileSourcesOpen,
        setIsMobileSourcesOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
