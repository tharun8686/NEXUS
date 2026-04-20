// src/components/RecommendationsSection.jsx
// Horizontal scroll section shown on HomePage — "Picked For You"
// Powered by Claude AI or falls back to top-rated products.

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, ChevronRight, Brain, Zap } from 'lucide-react';
import api from '../utils/api';
import { formatPrice } from '../utils/currency';
import WishlistButton from './WishlistButton';

function RecommendationCard({ product, index, addToCart, country, wishlistIds, onWishlistToggle, onView }) {
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addToCart(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className="flex-shrink-0 w-52 bg-white/[0.03] border border-white/5 hover:border-white/15 rounded-2xl p-4 flex flex-col gap-3 group transition-colors relative"
    >
      {/* Wishlist */}
      <div className="absolute top-3 right-3 z-10">
        <WishlistButton
          productId={product.product_id}
          wishlistIds={wishlistIds}
          onToggle={onWishlistToggle}
          className="w-7 h-7 p-1.5"
        />
      </div>

      {/* Image */}
      <div
        onClick={() => onView?.(product)}
        className="h-36 bg-black/30 rounded-xl p-3 flex items-center justify-center cursor-pointer border border-white/5 group-hover:border-blue-500/20 transition-colors"
      >
        <img
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Info */}
      <div className="flex-1">
        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">{product.category}</span>
        <p className="text-white font-bold text-sm line-clamp-2 mt-0.5 leading-tight">{product.name}</p>
        {Number(product.average_rating) > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-yellow-400 text-xs">★</span>
            <span className="text-gray-400 text-xs">{Number(product.average_rating).toFixed(1)}</span>
            {Number(product.total_reviews) > 0 && (
              <span className="text-gray-600 text-xs">({product.total_reviews})</span>
            )}
          </div>
        )}
      </div>

      {/* Price + CTA */}
      <div>
        <p className="text-white font-black text-base mb-2">{formatPrice(Number(product.price), country)}</p>
        <button
          onClick={handleAdd}
          disabled={product.stock_quantity <= 0 || added}
          className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            added
              ? 'bg-green-500 text-white'
              : product.stock_quantity <= 0
              ? 'bg-white/5 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
          }`}
        >
          {added ? '✓ Added!' : product.stock_quantity <= 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </motion.div>
  );
}

export default function RecommendationsSection({ user, addToCart, country, wishlistIds, onWishlistToggle, onViewProduct }) {
  const [products,  setProducts]  = useState([]);
  const [reasoning, setReasoning] = useState('');
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (bust = false) => {
    bust ? setRefreshing(true) : setLoading(true);
    try {
      if (bust) await api.delete('/api/recommendations/cache');
      const { data } = await api.get('/api/recommendations');
      setProducts(data.products || []);
      setReasoning(data.reasoning || '');
    } catch (err) {
      console.error('Recommendations error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="py-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <Brain size={18} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Picked For You</h2>
            <p className="text-xs text-gray-500">AI is personalising your feed…</p>
          </div>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-52 h-72 bg-white/[0.03] rounded-2xl animate-pulse border border-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (!products.length) return null;

  return (
    <div className="py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <Brain size={18} className="text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">Picked For You</h2>
              <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-[10px] font-black">
                <Zap size={9} /> AI
              </span>
            </div>
            {reasoning && (
              <p className="text-xs text-gray-500 mt-0.5 max-w-md line-clamp-1">{reasoning}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-gray-400 hover:text-white text-xs font-bold transition-all"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Scrollable row */}
      <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none -mx-2 px-2">
        {products.map((product, i) => (
          <RecommendationCard
            key={product.product_id}
            product={product}
            index={i}
            addToCart={addToCart}
            country={country}
            wishlistIds={wishlistIds}
            onWishlistToggle={onWishlistToggle}
            onView={onViewProduct}
          />
        ))}
        {/* See all button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex-shrink-0 w-32 flex items-center justify-center"
        >
          <button className="flex flex-col items-center gap-2 text-gray-500 hover:text-blue-400 transition-colors group">
            <div className="w-12 h-12 border-2 border-dashed border-white/10 group-hover:border-blue-500/40 rounded-full flex items-center justify-center transition-colors">
              <ChevronRight size={20} />
            </div>
            <span className="text-xs font-bold">See all</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
}