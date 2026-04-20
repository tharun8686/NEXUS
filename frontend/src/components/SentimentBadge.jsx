// src/components/SentimentBadge.jsx
// Self-contained AI sentiment badge for product cards and modals.
// Fetches & caches sentiment; no prop drilling needed beyond productId.
// Add this at the top with your other imports
import api from '../utils/api';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Minus, Sparkles, MessageSquare } from 'lucide-react';
import axios from 'axios';

const CONFIG = {
  'Highly Recommended': {
    Icon: ThumbsUp,
    cls:  'bg-green-500/15 text-green-400 border-green-500/30',
    bar:  'bg-green-500',
    pct:  '95%',
  },
  'Recommended': {
    Icon: ThumbsUp,
    cls:  'bg-blue-500/15 text-blue-400 border-blue-500/30',
    bar:  'bg-blue-500',
    pct:  '72%',
  },
  'Mixed Reviews': {
    Icon: Minus,
    cls:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    bar:  'bg-yellow-500',
    pct:  '48%',
  },
  'Poor Quality': {
    Icon: ThumbsDown,
    cls:  'bg-red-500/15 text-red-400 border-red-500/30',
    bar:  'bg-red-500',
    pct:  '20%',
  },
  'No Reviews': {
    Icon: MessageSquare,
    cls:  'bg-gray-500/10 text-gray-500 border-gray-500/20',
    bar:  'bg-gray-600',
    pct:  '0%',
  },
};

// Module-level cache — persists across re-renders without React state
const cache = {};

export default function SentimentBadge({
  productId,
  reviewCount  = 0,
  showSummary  = false,
  showBar      = false,
  size         = 'sm',   // 'sm' | 'md'
}) {
  const [data,    setData]    = useState(cache[productId] ?? null);
  const [loading, setLoading] = useState(!cache[productId]);

  useEffect(() => {
    if (cache[productId]) { setData(cache[productId]); setLoading(false); return; }

    if (reviewCount === 0) {
      const empty = { label: 'No Reviews', score: 0, positive_pct: 0, summary: 'Be the first to review!' };
      cache[productId] = empty;
      setData(empty); setLoading(false);
      return;
    }

    let alive = true;
    api.get(`/api/sentiment/${productId}`)
      .then(({ data: d }) => {
        if (!alive) return;
        cache[productId] = d;
        setData(d);
      })
      .catch(() => {
        if (!alive) return;
        const fb = { label: 'No Reviews', score: 0, positive_pct: 0, summary: '' };
        setData(fb);
      })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [productId, reviewCount]);

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-white/5 text-[10px] text-gray-600">
        <span className="w-1.5 h-1.5 bg-gray-700 rounded-full animate-pulse" />
        Analysing…
      </span>
    );
  }

  if (!data || data.label === 'No Reviews') return null;

  const cfg  = CONFIG[data.label] ?? CONFIG['No Reviews'];
  const Icon = cfg.Icon;
  const isLg = size === 'md';

  return (
    <div className="flex flex-col gap-1.5">
      {/* Badge pill */}
      <motion.span
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-bold w-fit
          ${cfg.cls}
          ${isLg ? 'text-xs' : 'text-[10px]'}`}
      >
        <Icon size={isLg ? 12 : 10} />
        {data.label}
        {data.positive_pct > 0 && <span className="opacity-60">· {data.positive_pct}%</span>}
        <Sparkles size={isLg ? 9 : 7} className="opacity-40" />
      </motion.span>

      {/* Sentiment bar */}
      {showBar && (
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: cfg.pct }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
            className={`h-full rounded-full ${cfg.bar}`}
          />
        </div>
      )}

      {/* AI summary line */}
      {showSummary && data.summary && (
        <p className="text-[11px] text-gray-500 leading-snug max-w-xs">{data.summary}</p>
      )}
    </div>
  );
}

// ── Bulk preloader — call from HomePage after products load ───────────────────
export async function preloadSentiment(productIds) {
  const missing = productIds.filter(id => !cache[id]);
  if (!missing.length) return;
  try {
    const { data } = await api.post('/api/sentiment/batch', { productIds: missing });
    Object.entries(data).forEach(([id, s]) => { cache[Number(id)] = s; });
  } catch (_) {}
}

// Expose cache buster so ProductModal can clear after new review
export function bustSentimentCache(productId) {
  delete cache[productId];
}