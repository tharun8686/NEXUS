// src/components/WishlistDrawer.jsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, ShoppingCart, Trash2, HeartOff, Sparkles } from 'lucide-react';
import api from '../../utils/api';
import { formatPrice } from '../../utils/currency';

export default function WishlistDrawer({ isOpen, close, addToCart, country, onWishlistChange }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/wishlist');
      setItems(data);
    } catch (err) {
      console.error('Wishlist fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchWishlist();
  }, [isOpen, fetchWishlist]);

  const remove = async (productId) => {
    try {
      await api.delete(`/api/wishlist/${productId}`);
      setItems(prev => prev.filter(i => i.product_id !== productId));
      onWishlistChange?.();
    } catch (err) {
      console.error('Remove wishlist error:', err);
    }
  };

  const moveToCart = (item) => {
    addToCart(item, 1);
    remove(item.product_id);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-[#0a0a0d] border-l border-white/10 z-[60] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <Heart size={20} className="text-pink-400 fill-pink-400/30" />
                <div>
                  <p className="text-white font-black">Wishlist</p>
                  <p className="text-xs text-gray-500">{items.length} saved item{items.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={close} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-8 h-8 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
                </div>
              ) : items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-4 py-20">
                  <HeartOff size={48} className="opacity-20" />
                  <p className="text-sm font-bold text-gray-400">Your wishlist is empty</p>
                  <p className="text-xs text-gray-600 text-center">Tap the heart icon on any product to save it here.</p>
                  <button onClick={close} className="px-6 py-2 border border-white/10 rounded-full text-white text-sm hover:bg-white/5 transition-colors">
                    Browse Products
                  </button>
                </div>
              ) : (
                items.map(item => (
                  <motion.div
                    key={item.wishlist_id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex gap-3 bg-white/[0.03] border border-white/5 hover:border-white/10 p-3 rounded-2xl transition-colors group"
                  >
                    <div className="w-16 h-16 bg-black/40 rounded-xl p-2 flex items-center justify-center flex-shrink-0">
                      <img src={item.image_url} alt={item.name} loading="lazy" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">{item.category}</span>
                      <p className="text-white font-bold text-sm line-clamp-1">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-pink-400 font-black text-sm">{formatPrice(item.price, country)}</p>
                        {item.original_price && (
                          <p className="text-gray-600 text-xs line-through">{formatPrice(item.original_price, country)}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => moveToCart(item)}
                          disabled={item.stock_quantity <= 0}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 disabled:text-gray-500 text-white text-xs font-bold rounded-lg transition-all"
                        >
                          <ShoppingCart size={12} />
                          {item.stock_quantity > 0 ? 'Move to Cart' : 'Out of Stock'}
                        </button>
                        <button
                          onClick={() => remove(item.product_id)}
                          className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-4 border-t border-white/10 bg-white/[0.02]">
                <button
                  onClick={() => { items.forEach(i => moveToCart(i)); }}
                  className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-pink-500/20 text-sm"
                >
                  <ShoppingCart size={16} /> Move All to Cart
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}