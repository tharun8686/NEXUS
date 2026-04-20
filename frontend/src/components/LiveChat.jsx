// src/components/LiveChat.jsx
// Floating live chat bubble for users — connects via WebSocket for real-time replies.

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, X, Send, Wifi, WifiOff,
  RefreshCw, Bot, User, Minimize2
} from 'lucide-react';
import api from '../utils/api';

const WS_URL = window.location.protocol === 'https:' 
  ? `wss://${window.location.host}` 
  : `ws://${window.location.host}`;

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function LiveChat({ user }) {
  const [isOpen,    setIsOpen]    = useState(false);
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [sending,   setSending]   = useState(false);
  const [wsStatus,  setWsStatus]  = useState('connecting');
  const [unread,    setUnread]    = useState(0);
  const [loaded,    setLoaded]    = useState(false);

  const wsRef      = useRef(null);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  // ── Load history ────────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    if (loaded) return;
    try {
      const { data } = await api.get('/api/chat/messages');
      setMessages(data);
      setLoaded(true);
    } catch (err) {
      console.error('Chat history error:', err);
    }
  }, [loaded]);

  // ── WebSocket ────────────────────────────────────────────────────────────────
  const connectWS = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
      ws.send(JSON.stringify({ type: 'auth', token }));
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'chat_message' && msg.sender === 'admin') {
          setMessages(prev => {
            // Avoid duplicate if REST and WS both deliver
            if (prev.some(m => m.message_id === msg.message_id)) return prev;
            return [...prev, msg];
          });
          if (!isOpen) setUnread(n => n + 1);
        }
      } catch (_) {}
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
      setTimeout(connectWS, 3000);
    };
    ws.onerror = () => ws.close();
  }, [isOpen]);

  useEffect(() => {
    connectWS();
    return () => wsRef.current?.close();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, loadHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // ── Send ─────────────────────────────────────────────────────────────────────
  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    const optimistic = {
      message_id: `opt_${Date.now()}`,
      sender: 'user',
      message: text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setInput('');
    try {
      const { data } = await api.post('/api/chat/messages', { message: text });
      setMessages(prev => prev.map(m => m.message_id === optimistic.message_id ? data : m));
    } catch (err) {
      setMessages(prev => prev.filter(m => m.message_id !== optimistic.message_id));
      setInput(text);
      console.error('Send error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Floating bubble */}
      <motion.button
        onClick={() => setIsOpen(o => !o)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-[90] w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/30 border border-white/10"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={22} className="text-white" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} className="relative">
              <MessageCircle size={22} className="text-white" />
              {unread > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-[10px] font-black text-white flex items-center justify-center animate-bounce">
                  {unread}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{   opacity: 0, y: 20, scale: 0.95  }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="fixed bottom-24 right-6 z-[89] w-80 sm:w-96 bg-[#0a0a0d] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: '520px' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-blue-900/30 to-purple-900/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot size={16} className="text-white" />
                </div>
                <div>
                  <p className="font-black text-white text-sm">NexusTech Support</p>
                  <div className={`flex items-center gap-1 text-[10px] font-bold ${
                    wsStatus === 'connected' ? 'text-green-400' : wsStatus === 'connecting' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {wsStatus === 'connected'
                      ? <><Wifi size={8} /> Online</>
                      : wsStatus === 'connecting'
                      ? <><RefreshCw size={8} className="animate-spin" /> Connecting…</>
                      : <><WifiOff size={8} /> Offline</>}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                <Minimize2 size={15} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: '280px' }}>
              {/* Welcome message */}
              {messages.length === 0 && !loaded && (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                </div>
              )}
              {messages.length === 0 && loaded && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={13} className="text-white" />
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none px-3 py-2 max-w-[80%]">
                    <p className="text-white text-sm">👋 Hi {user?.username}! How can we help you today?</p>
                    <p className="text-gray-500 text-[10px] mt-1">Our team usually replies within minutes.</p>
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <motion.div
                  key={msg.message_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 text-[11px] font-black ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white'
                      : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                  }`}>
                    {msg.sender === 'user'
                      ? (user?.username?.slice(0,1).toUpperCase() || <User size={12} />)
                      : <Bot size={12} />}
                  </div>
                  <div className={`max-w-[75%] ${msg.sender === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`px-3 py-2 rounded-2xl text-sm ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-none'
                    }`}>
                      {msg.message}
                    </div>
                    <span className="text-[10px] text-gray-600 mt-0.5 px-1">{formatTime(msg.created_at)}</span>
                  </div>
                </motion.div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/10 bg-white/[0.02] flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Type a message…"
                rows={1}
                style={{ resize: 'none' }}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:border-blue-500/50 focus:outline-none transition-all max-h-24 overflow-y-auto"
              />
              <button
                onClick={send}
                disabled={!input.trim() || sending}
                className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white transition-all flex-shrink-0 shadow-lg shadow-blue-500/20"
              >
                {sending
                  ? <RefreshCw size={16} className="animate-spin" />
                  : <Send size={16} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}