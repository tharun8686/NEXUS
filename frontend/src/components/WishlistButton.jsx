// src/components/WishlistButton.jsx
// Drop this onto any ProductCard — shows a heart icon that toggles wishlist state.
// Usage: <WishlistButton productId={product.product_id} wishlistIds={wishlistIds} onToggle={handleWishlistToggle} />

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';

export default function WishlistButton({ productId, wishlistIds = [], onToggle, className = '' }) {
  const [loading, setLoading] = useState(false);
  const isWishlisted = wishlistIds.includes(productId);

  const toggle = async (e) => {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      if (isWishlisted) {
        await api.delete(`/api/wishlist/${productId}`);
      } else {
        await api.post('/api/wishlist', { product_id: productId });
      }
      onToggle?.(productId, !isWishlisted);
    } catch (err) {
      console.error('Wishlist toggle error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      className={`p-2.5 rounded-full transition-all duration-200 border shadow-lg ${
        isWishlisted
          ? 'bg-pink-500/20 border-pink-500/40 text-pink-400 hover:bg-pink-500/30'
          : 'bg-black/70 border-white/10 text-gray-400 hover:text-pink-400 hover:border-pink-500/30'
      } ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isWishlisted ? 'filled' : 'empty'}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1,   opacity: 1 }}
          exit={{   scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <Heart
            size={16}
            className={isWishlisted ? 'fill-pink-400' : ''}
          />
        </motion.div>
      </AnimatePresence>
    </button>
  );
}