import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatMessage } from '../types';

const API_BASE_URL = '/api';
const CHAT_POLL_INTERVAL_MS = 3000;

interface ChatPanelProps {
  token: string | null;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ token }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const lastMessageId = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pollIntervalIdRef = useRef<number | null>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const atBottom = scrollHeight - scrollTop <= clientHeight + 10;
    setIsAtBottom(atBottom);
  };

  const fetchMessages = useCallback(async (isInitial = false) => {
    if (!token) return;
    if (!isInitial) setIsLoading(false); // không show loader cho poll ngầm

    try {
      const response = await fetch(
        `${API_BASE_URL}/chat/messages?since=${lastMessageId.current}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Không thể tải tin nhắn.');

      const newMessages: ChatMessage[] = await response.json();

      if (newMessages.length > 0) {
        lastMessageId.current = newMessages[newMessages.length - 1].id;

        if (isInitial) {
          setMessages(newMessages);
        } else {
          setMessages((prev) => [...prev, ...newMessages]);
        }
      }
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, [token]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !token || isSending) return;

    setIsSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: newMessage.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Gửi tin nhắn thất bại.');
      }

      setNewMessage('');
      fetchMessages(); // fetch ngay tin nhắn mới
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    fetchMessages(true); // load lần đầu

    const startPolling = () => {
      stopPolling();
      pollIntervalIdRef.current = window.setInterval(fetchMessages, CHAT_POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (pollIntervalIdRef.current) clearInterval(pollIntervalIdRef.current);
    };

    startPolling();
    return stopPolling;
  }, [fetchMessages]);

  useEffect(() => {
    if (isAtBottom) scrollToBottom();
  }, [messages, isAtBottom]);

  if (isLoading) {
    return <div className="text-center text-slate-400">Đang tải cuộc trò chuyện...</div>;
  }

  return (
    <div className="flex flex-col h-full relative">
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="overflow-y-auto flex-grow pr-2 mb-4"
      >
        <ul className="space-y-3">
          {messages.map((msg) => (
            <li key={msg.id} className="text-sm break-words flex items-start">
              <div className="w-5 h-5 rounded-full bg-slate-700 flex-shrink-0 mr-2 mt-0.5"></div>
              <div className="flex-grow min-w-0">
                <p className="font-semibold text-cyan-400 text-xs">{msg.playerName}</p>
                <p className="text-slate-300">{msg.message}</p>
              </div>
            </li>
          ))}
          <div ref={messagesEndRef} />
        </ul>
        {error && <p className="text-xs text-red-400 text-center mt-2">{error}</p>}
      </div>

      {!isAtBottom && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-20 right-4 px-3 py-1 bg-slate-700/80 rounded-full text-xs text-white shadow-lg"
        >
          Xuống cuối ⬇
        </button>
      )}

      <form onSubmit={handleSendMessage} className="flex-shrink-0 flex space-x-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Luận đạo tại đây..."
          maxLength={200}
          className="flex-grow bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={isSending || !newMessage.trim()}
          className="px-4 py-2 font-bold rounded-lg shadow-md transition-all duration-300 ease-in-out bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-4 focus:ring-blue-400/50 disabled:bg-slate-600 disabled:opacity-50"
        >
          {isSending ? '...' : 'Gửi'}
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;