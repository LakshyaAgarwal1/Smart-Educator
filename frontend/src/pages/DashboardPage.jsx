import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ChatWindow } from '../components/ChatWindow';
import { ChatInput } from '../components/ChatInput';
import { SourcesPanel } from '../components/SourcesPanel';
import { UploadModal } from '../components/UploadModal';
import { api } from '../api/client';

export const DashboardPage = () => {
  const {
    activeChatId,
    activeChat,
    setActiveChat,
    refreshSessions,
    refreshDocuments,
    mode,
    setCurrentSources,
    setConfidence,
    isMobileSourcesOpen,
    setIsMobileSourcesOpen,
    createChat
  } = useApp();

  const [isTyping, setIsTyping] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const handleSendMessage = async (text, file) => {
    let currentId = activeChatId;

    // If no active chat, create one with 'New Chat'
    if (!currentId) {
      try {
        const newSession = await api.createChatSession('New Chat');
        if (newSession && newSession.id) {
          currentId = newSession.id;
          setActiveChat(newSession);
        }
      } catch (e) {
        console.error('Failed to create new chat session:', e);
      }
    }

    if (!currentId) return;

    // Optimistically format message content with attachment badge
    const displayContent = file
      ? `📎 **${file.name}**\n\n${text || 'Please provide a comprehensive summary and key takeaways of the uploaded document.'}`
      : text;

    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'USER',
      content: displayContent,
      citations: []
    };

    setActiveChat((prev) => ({
      ...prev,
      messages: [...(prev?.messages || []), tempUserMsg]
    }));

    setIsTyping(true);

    try {
      const response = await api.sendMessage(currentId, text, mode, file);

      if (response && response.assistant_message) {
        setActiveChat((prev) => ({
          ...prev,
          title: response.chat_title || prev?.title,
          messages: [
            ...(prev?.messages?.filter((m) => m.id !== tempUserMsg.id) || []),
            response.user_message,
            response.assistant_message
          ]
        }));

        if (response.citations) {
          setCurrentSources(response.citations);
        } else {
          setCurrentSources([]);
        }

        if (response.confidence !== undefined) {
          setConfidence(response.confidence);
        }
      }

      // If document was attached in chat, update document list in context
      if (file) {
        await refreshDocuments();
      }

      await refreshSessions();
    } catch (err) {
      console.error('Backend message error:', err);

      const errorAssistantMsg = {
        id: `assist-err-${Date.now()}`,
        role: 'ASSISTANT',
        content: `**Error processing request:** ${err.message || 'Unable to retrieve answer. Please verify your connection or try again.'}`,
        citations: []
      };

      setActiveChat((prev) => ({
        ...prev,
        messages: [
          ...(prev?.messages?.filter((m) => m.id !== tempUserMsg.id) || []),
          tempUserMsg,
          errorAssistantMsg
        ]
      }));
      setCurrentSources([]);
      setConfidence(0);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-4rem)] relative">
      {/* Center Chat View (Screen 2) */}
      <div className="flex-1 flex flex-col bg-[#F8FAFC] dark:bg-[#0B0F19] overflow-hidden">
        <ChatWindow isTyping={isTyping} />
        <ChatInput
          onSendMessage={handleSendMessage}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          isTyping={isTyping}
        />
      </div>

      {/* Right Sources Panel on Desktop (Screen 2) */}
      <div className="hidden lg:block w-80 h-full shrink-0">
        <SourcesPanel />
      </div>

      {/* Responsive Mobile Sources Drawer (Screen 12 Reference) */}
      {isMobileSourcesOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-xs flex justify-end animate-fade-in">
          <div 
            className="w-80 h-full max-w-[85vw] shadow-2xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <SourcesPanel isMobileDrawer={true} />
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
};
