// src/components/AdminChatPanel.jsx
// Drop this as a new tab inside AdminPage.
// Shows all users who've messaged, with real-time reply via WebSocket.

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, Send, RefreshCw, User, Bot,
  X, Circle, ChevronLeft, Search
} from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:3000';
const WS_URL  = 'ws://localhost:3000';

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function AdminChatPanel({ token }) {
  const [users,       setUsers]       = useState([]);
  const [activeUser,  setActiveUser]  = useState(null);
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState('');
  const [sending,     setSending]     = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [search,      setSearch]      = useState('');

  const wsRef     = useRef(null);
  const bottomRef = useRef(null);

  // ── Fetch users who have chatted ─────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/chat/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(data);
    } catch (err) {
      console.error('Admin chat users error:', err);
    }
  }, [token]);

  // ── Fetch conversation with a user ───────────────────────────────────────
  const fetchMessages = useCallback(async (userId) => {
    setLoadingMsgs(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/chat/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(data);
      // Mark that user's unread count as 0 locally
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, unread_count: 0 } : u));
    } catch (err) {
      console.error('Admin chat messages error:', err);
    } finally {
      setLoadingMsgs(false);
    }
  }, [token]);

  // ── WebSocket ────────────────────────────────────────────────────────────
  const connectWS = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token }));
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'chat_message' && msg.sender === 'user') {
          // New user message incoming
          setUsers(prev => {
            const exists = prev.find(u => u.user_id === msg.user_id);
            if (exists) {
              return prev.map(u => u.user_id === msg.user_id
                ? { ...u, last_message: msg.message, last_message_at: msg.created_at, unread_count: (Number(u.unread_count) || 0) + 1 }
                : u
              );
            }
            // Unknown user — refresh list
            fetchUsers();
            return prev;
          });
          // If this user is currently open, append message
          setActiveUser(cur => {
            if (cur?.user_id === msg.user_id) {
              setMessages(prev => [...prev, msg]);
            }
            return cur;
          });
        }
      } catch (_) {}
    };
    ws.onclose = () => setTimeout(connectWS, 3000);
    ws.onerror = () => ws.close();
  }, [token, fetchUsers]);

  useEffect(() => {
    fetchUsers();
    connectWS();
    return () => wsRef.current?.close();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeUser) fetchMessages(activeUser.user_id);
  }, [activeUser, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send reply ────────────────────────────────────────────────────────────
  const send = async () => {
    const text = input.trim();
    if (!text || sending || !activeUser) return;
    setSending(true);
    const optimistic = {
      message_id: `opt_${Date.now()}`,
      sender: 'admin',
      message: text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setInput('');
    try {
      const { data } = await axios.post(
        `${API_URL}/api/admin/chat/${activeUser.user_id}`,
        { message: text },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(prev => prev.map(m => m.message_id === optimistic.message_id ? data : m));
    } catch (err) {
      setMessages(prev => prev.filter(m => m.message_id !== optimistic.message_id));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = users.reduce((s, u) => s + (Number(u.unread_count) || 0), 0);

  return (
    <div className="flex h-[calc(100vh-140px)] bg-[#0a0a0d] rounded-2xl border border-white/10 overflow-hidden">

      {/* ── Left: user list ─────────────────────────────────────────────────── */}
      <div className={`flex flex-col border-r border-white/10 transition-all ${activeUser ? 'hidden md:flex md:w-72' : 'flex w-full md:w-72'}`}>
        <div className="p-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className="text-blue-400" />
              <span className="font-black text-white text-sm">Live Chat</span>
              {totalUnread > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {totalUnread}
                </span>
              )}
            </div>
            <button onClick={fetchUsers} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors">
              <RefreshCw size={13} />
            </button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-2.5 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users…"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-white text-xs placeholder-gray-600 focus:border-blue-500/50 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <MessageCircle size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            filteredUsers.map(u => (
              <button
                key={u.user_id}
                onClick={() => setActiveUser(u)}
                className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 ${
                  activeUser?.user_id === u.user_id ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : ''
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-black">
                    {u.username?.slice(0,1).toUpperCase()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-bold text-xs truncate">{u.username}</p>
                    <span className="text-gray-600 text-[10px] flex-shrink-0 ml-1">{formatDate(u.last_message_at)}</span>
                  </div>
                  <p className="text-gray-500 text-[11px] truncate mt-0.5">{u.last_message}</p>
                </div>
                {Number(u.unread_count) > 0 && (
                  <span className="flex-shrink-0 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center mt-1">
                    {u.unread_count}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right: conversation ─────────────────────────────────────────────── */}
      {activeUser ? (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/[0.02] flex-shrink-0">
            <button onClick={() => setActiveUser(null)} className="md:hidden p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
              <ChevronLeft size={16} />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-black flex-shrink-0">
              {activeUser.username?.slice(0,1).toUpperCase()}
            </div>
            <div>
              <p className="text-white font-black text-sm">{activeUser.username}</p>
              <p className="text-gray-500 text-xs">{activeUser.email}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingMsgs ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <MessageCircle size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">No messages yet</p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.message_id} className={`flex gap-2 ${msg.sender === 'admin' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 text-xs font-black ${
                    msg.sender === 'admin'
                      ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white'
                      : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                  }`}>
                    {msg.sender === 'admin' ? <Bot size={12} /> : activeUser.username?.slice(0,1).toUpperCase()}
                  </div>
                  <div className={`max-w-[70%] ${msg.sender === 'admin' ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`px-3 py-2 rounded-2xl text-sm ${
                      msg.sender === 'admin'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-none'
                    }`}>
                      {msg.message}
                    </div>
                    <span className="text-[10px] text-gray-600 mt-0.5 px-1">{formatTime(msg.created_at)}</span>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/10 flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={`Reply to ${activeUser.username}…`}
              rows={1}
              style={{ resize: 'none' }}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:border-blue-500/50 focus:outline-none max-h-24 overflow-y-auto"
            />
            <button
              onClick={send}
              disabled={!input.trim() || sending}
              className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl text-white transition-all flex-shrink-0"
            >
              {sending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex items-center justify-center text-gray-600 flex-col gap-3">
          <MessageCircle size={48} className="opacity-20" />
          <p className="font-bold">Select a conversation</p>
          <p className="text-sm text-gray-700">Pick a user from the left to start chatting</p>
        </div>
      )}
    </div>
  );
}