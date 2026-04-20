// src/components/SmartSearchBar.jsx
// Drop-in replacement for the search input in Navbar.
// Falls back gracefully to regular search if the AI parse fails.

import { useState, useRef, useCallback, useEffect } from 'react';
import { Search, Mic, Sparkles, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';

// Suggestion chips shown on focus
const SUGGESTIONS = [
  'Gaming mouse under ₹2000',
  'Best Samsung laptop',
  'Wireless earbuds',
  'Smartphone under ₹15000',
  'Mechanical keyboard RGB',
  '4K camera mirrorless',
];

export default function SmartSearchBar({ onSearch, onSmartResults }) {
  const [query,       setQuery]       = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [displayQuery, setDisplayQuery] = useState('');
  const [aiActive,    setAiActive]    = useState(false);

  const inputRef  = useRef(null);
  const timerRef  = useRef(null);

  // ── Debounce regular search ───────────────────────────────────────────────
  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setAiActive(false);
    setDisplayQuery('');
    clearTimeout(timerRef.current);
    if (!val.trim()) { onSearch(''); return; }
    timerRef.current = setTimeout(() => onSearch(val), 300);
  };

  // ── Smart search on Enter ─────────────────────────────────────────────────
  const handleKeyDown = async (e) => {
    if (e.key === 'Escape') { clearAll(); return; }
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault();
      await runSmartSearch(query);
    }
  };

  const runSmartSearch = async (q) => {
    if (!q.trim()) return;
    setIsSearching(true);
    setShowSuggest(false);
    try {
      const { data } = await api.post('/api/search/smart', { query: q });
      setDisplayQuery(data.displayQuery || q);
      setAiActive(true);
      // Pass results up to HomePage
      onSmartResults?.(data.products, data.displayQuery, data.filters);
    } catch (err) {
      // Fallback: plain search
      onSearch(q);
    } finally {
      setIsSearching(false);
    }
  };

  const clearAll = () => {
    setQuery('');
    setAiActive(false);
    setDisplayQuery('');
    setShowSuggest(false);
    onSearch('');
    onSmartResults?.(null, '', null);
  };

  // ── Voice search ──────────────────────────────────────────────────────────
  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Voice search not supported. Try Chrome.'); return; }
    const rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = false;
    setIsListening(true);
    rec.onresult  = (e) => { const t = e.results[0][0].transcript; setQuery(t); runSmartSearch(t); setIsListening(false); };
    rec.onerror   = () => setIsListening(false);
    rec.onend     = () => setIsListening(false);
    rec.start();
  };

  // ── Sync external clear ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { setQuery(e.detail ?? ''); setAiActive(false); setDisplayQuery(''); };
    window.addEventListener('navbar:set-query', handler);
    return () => window.removeEventListener('navbar:set-query', handler);
  }, []);

  return (
    <div className="relative hidden md:flex flex-1 max-w-md">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full glass-card flex-1 border transition-colors ${
        aiActive ? 'border-purple-500/50' : 'border-white/10 focus-within:border-blue-500/50'
      }`}>
        {/* Icon */}
        {isSearching
          ? <Loader2 size={16} className="text-purple-400 animate-spin flex-shrink-0" />
          : aiActive
          ? <Sparkles size={16} className="text-purple-400 flex-shrink-0" />
          : <Search size={16} className="text-gray-400 flex-shrink-0" />}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggest(true)}
          onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
          placeholder="Search or ask anything… (press Enter for AI)"
          className="bg-transparent border-none outline-none text-sm w-full text-white placeholder-gray-500"
        />

        {/* AI badge */}
        {aiActive && displayQuery && (
          <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 whitespace-nowrap">
            AI
          </span>
        )}

        {/* Clear */}
        {(query || aiActive) && (
          <button onClick={clearAll} className="text-gray-500 hover:text-white text-xs flex-shrink-0">
            <X size={13} />
          </button>
        )}

        {/* Mic */}
        <button
          onClick={startVoice}
          className={`p-1.5 rounded-full flex-shrink-0 transition-all ${isListening ? 'bg-red-500 animate-pulse' : 'hover:bg-white/10'}`}
        >
          <Mic size={15} className={isListening ? 'text-white' : 'text-blue-400'} />
        </button>
      </div>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {showSuggest && !query && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-[#0c0c10] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            <div className="p-3">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Sparkles size={9} /> Try asking
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onMouseDown={() => { setQuery(s); runSmartSearch(s); }}
                    className="text-xs px-3 py-1.5 bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/30 rounded-full text-gray-300 hover:text-white transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-600 mt-2">Press <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] border border-white/10">Enter</kbd> to use AI search</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}