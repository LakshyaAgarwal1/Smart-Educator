import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Mic, Send, X, FileText } from 'lucide-react';

export const ChatInput = ({ onSendMessage, onOpenUploadModal, isTyping }) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [text]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if ((!text.trim() && !attachedFile) || isTyping) return;

    onSendMessage(text.trim(), attachedFile);
    setText('');
    setAttachedFile(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
    }
    e.target.value = '';
  };

  const toggleRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please type your message.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.start();
    } catch (e) {
      setIsRecording(false);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-[#111827] border-t border-gray-200 dark:border-gray-800 transition-colors">
      {/* File attachment preview badge */}
      {attachedFile && (
        <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs text-indigo-700 dark:text-indigo-300">
          <FileText size={14} />
          <span className="font-medium truncate max-w-xs">{attachedFile.name}</span>
          <button
            onClick={() => setAttachedFile(null)}
            className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Main input wrapper with borders and rounded pill shape matching Screen 2 */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 p-1.5 bg-gray-50 dark:bg-[#1A2234] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-inner focus-within:border-indigo-500 transition-colors"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.docx,.txt,.ppt,.pptx"
        />

        {/* Paperclip Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
          title="Attach study document"
        >
          <Paperclip size={18} />
        </button>

        {/* Microphone Button */}
        <button
          type="button"
          onClick={toggleRecording}
          className={`p-2 rounded-xl transition-colors ${
            isRecording
              ? 'text-red-500 bg-red-100 dark:bg-red-950/80 animate-pulse'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50'
          }`}
          title="Voice input"
        >
          <Mic size={18} />
        </button>

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          className="flex-1 bg-transparent border-0 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none resize-none py-1.5 max-h-32 leading-relaxed"
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={(!text.trim() && !attachedFile) || isTyping}
          className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white flex items-center justify-center transition-all duration-150 shadow-sm active:scale-95 shrink-0"
          title="Send message"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
};
