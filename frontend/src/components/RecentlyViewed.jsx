// src/components/RecentlyViewed.jsx
// Tracks the last 10 products a user clicked on using localStorage.
// No backend required — fully client-side.
// Shows a horizontal scroll strip on the HomePage below the hero.

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X, ChevronRight } from 'lucide-react';
import { formatPrice } from '../utils/currency';

const STORAGE_KEY  = 'nexus_recently_viewed';
const MAX_ITEMS    = 10;

// ── Public helpers — import and call these from anywhere ─────────────────────
export function recordView(product) {
  try {
    const raw  = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    // Remove existing entry for this product then prepend
    const filtered = list.filter(p => p.product_id !== product.product_id);
    const trimmed  = [
      {
        product_id:     product.product_id,
        name:           product.name,
        image_url:      product.image_url,
        price:          product.price,
        category:       product.category,
        stock_quantity: product.stock_quantity,
        viewedAt:       Date.now(),
      },
      ...filtered,
    ].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (_) {}
}

export function getRecentlyViewed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function clearRecentlyViewed() {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RecentlyViewed({ country, addToCart, onViewProduct }) {
  const [items, setItems] = useState([]);

  // Refresh list when component mounts or storage changes
  const refresh = useCallback(() => {
    setItems(getRecentlyViewed());
  }, []);

  useEffect(() => {
    refresh();
    // Listen for storage changes (e.g. another tab)
    window.addEventListener('storage', refresh);
    // Also refresh when custom event fires after recordView
    window.addEventListener('nexus:recently-viewed-updated', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('nexus:recently-viewed-updated', refresh);
    };
  }, [refresh]);

  const removeItem = (productId) => {
    try {
      const updated = items.filter(i => i.product_id !== productId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setItems(updated);
    } catch (_) {}
  };

  const clearAll = () => {
    clearRecentlyViewed();
    setItems([]);
  };

  if (!items.length) return null;

  return (
    <div className="py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-500/10 rounded-xl border border-gray-500/20">
            <Clock size={16} className="text-gray-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Recently Viewed</h2>
            <p className="text-xs text-gray-500">{items.length} product{items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={clearAll}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors font-bold"
        >
          Clear all
        </button>
      </div>

      {/* Scroll strip */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-2 px-2">
        <AnimatePresence initial={false}>
          {items.map((item, i) => (
            <motion.div
              key={item.product_id}
              layout
              initial={{ opacity: 0, scale: 0.9, x: -20 }}
              animate={{ opacity: 1, scale: 1,   x: 0   }}
              exit={{   opacity: 0, scale: 0.9, x: -20  }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
              className="flex-shrink-0 w-40 bg-white/[0.03] border border-white/5 hover:border-white/15 rounded-2xl p-3 flex flex-col gap-2 group cursor-pointer transition-colors relative"
              onClick={() => onViewProduct?.(item)}
            >
              {/* Remove button */}
              <button
                onClick={e => { e.stopPropagation(); removeItem(item.product_id); }}
                className="absolute top-2 right-2 w-5 h-5 bg-black/50 hover:bg-red-500/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-gray-500 hover:text-red-400 z-10"
              >
                <X size={10} />
              </button>

              {/* Image */}
              <div className="h-24 bg-black/30 rounded-xl p-2 flex items-center justify-center border border-white/5 group-hover:border-blue-500/20 transition-colors">
                <img
                  src={item.image_url}
                  alt={item.name}
                  loading="lazy"
                  className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Info */}
              <div className="flex-1">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">{item.category}</span>
                <p className="text-white text-xs font-bold line-clamp-2 mt-0.5 leading-tight">{item.name}</p>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-white font-black text-xs">{formatPrice(Number(item.price), country)}</p>
                {item.stock_quantity <= 0 && (
                  <span className="text-[9px] text-red-400 font-bold">OOS</span>
                )}
              </div>

              {/* Quick-add button */}
              {item.stock_quantity > 0 && (
                <button
                  onClick={e => { e.stopPropagation(); addToCart(item, 1); }}
                  className="w-full py-1.5 text-[10px] font-bold bg-blue-600/80 hover:bg-blue-500 text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  + Add
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* See-all nudge */}
        {items.length >= 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex-shrink-0 w-16 flex items-center justify-center"
          >
            <div className="w-10 h-10 border-2 border-dashed border-white/10 rounded-full flex items-center justify-center text-gray-600">
              <ChevronRight size={16} />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}