// src/components/ProductModal.jsx — FINAL (sentiment panel + share + stock alert)
import { motion } from 'framer-motion';
import { X, ShoppingCart, Send, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import SentimentBadge, { bustSentimentCache } from '../SentimentBadge';
import StockAlertButton from '../StockAlertButton';
import ShareButton from '../ShareButton';

export default function ProductModal({
  product, close, addToCart,
  alertIds = [], onAlertToggle,
}) {
  const [reviews,    setReviews]    = useState([]);
  const [newReview,  setNewReview]  = useState({ rating: 5, comment: '' });
  const [quantity,   setQuantity]   = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchReviews(); }, [product]);

  const fetchReviews = async () => {
    try {
      const { data } = await axios.get(`http://localhost:3000/api/reviews/${product.product_id}`);
      setReviews(data);
    } catch (err) { console.error(err); }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user  = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3000/api/reviews',
        { product_id: product.product_id, rating: newReview.rating, comment: newReview.comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReviews(prev => [{ ...newReview, username: user.username }, ...prev]);
      setNewReview({ rating: 5, comment: '' });
      // Bust local + server sentiment cache
      bustSentimentCache(product.product_id);
      axios.post('http://localhost:3000/api/reviews/sentiment-refresh',
        { product_id: product.product_id },
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(() => {});
    } catch (err) {
      alert('Failed to post review. Make sure you are logged in.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const isOutOfStock = product.stock_quantity <= 0;

  // Rating distribution
  const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => Number(r.rating) === star).length,
  }));
  const maxCount = Math.max(...ratingCounts.map(r => r.count), 1);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1,    opacity: 1 }}
        exit={{   scale: 0.92, opacity: 0 }}
        className="bg-[#0f0f0f] border border-white/10 w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl max-h-[92vh]"
      >
        {/* Share + Close buttons */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <ShareButton product={product} />
          <button onClick={close}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Left: Image + Sentiment */}
        <div className="md:w-2/5 bg-white/[0.03] p-8 flex flex-col gap-4 border-r border-white/5 flex-shrink-0 overflow-y-auto">

          {/* Image */}
          <div className="flex items-center justify-center h-52 flex-shrink-0">
            <img src={product.image_url} className="max-h-full object-contain drop-shadow-2xl" alt={product.name} />
          </div>

          {/* Stock pill */}
          <div className={`px-4 py-2 rounded-xl text-xs font-bold text-center flex-shrink-0 ${
            isOutOfStock ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
          }`}>
            {isOutOfStock ? 'Out of Stock' : `In Stock: ${product.stock_quantity} units`}
          </div>

          {/* Sentiment Panel */}
          {Number(product.total_reviews) > 0 && (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-purple-400" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-wider">AI Sentiment</span>
              </div>

              <SentimentBadge
                productId={product.product_id}
                reviewCount={reviews.length || Number(product.total_reviews)}
                showSummary
                showBar
                size="md"
              />

              {/* Rating distribution */}
              {reviews.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  {ratingCounts.map(({ star, count }) => (
                    <div key={star} className="flex items-center gap-2 text-[10px]">
                      <span className="text-yellow-400 w-4 flex-shrink-0">{star}★</span>
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(count / maxCount) * 100}%` }}
                          transition={{ duration: 0.6, delay: 0.1 * (6 - star) }}
                          className="h-full bg-yellow-500/70 rounded-full"
                        />
                      </div>
                      <span className="text-gray-600 w-3 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stock alert for out-of-stock products */}
          {isOutOfStock && (
            <StockAlertButton
              productId={product.product_id}
              alertIds={alertIds}
              onToggle={onAlertToggle}
              className="w-full justify-center flex-shrink-0"
            />
          )}
        </div>

        {/* Right: Details + Reviews */}
        <div className="flex-1 p-8 overflow-y-auto">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">{product.category}</span>
          <h2 className="text-2xl font-black text-white mt-1 mb-1 leading-tight">{product.name}</h2>
          <p className="text-2xl font-black text-blue-400 mb-5">
            ₹{Number(product.price).toLocaleString()}
          </p>

          {/* Quantity + Add to Cart */}
          {!isOutOfStock && (
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border border-white/10 rounded-lg overflow-hidden">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white transition-colors">-</button>
                <span className="px-4 py-2 text-white font-bold">{quantity}</span>
                <button onClick={() => setQuantity(q => Math.min(product.stock_quantity, q + 1))}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white transition-colors">+</button>
              </div>
              <button
                onClick={() => addToCart(product, quantity)}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <ShoppingCart size={18} /> Add {quantity} to Cart
              </button>
            </div>
          )}

          {/* Reviews */}
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              Reviews
              {reviews.length > 0 && (
                <span className="text-xs text-gray-500 font-normal">({reviews.length})</span>
              )}
            </h3>

            {/* Write review */}
            <form onSubmit={handleReviewSubmit}
              className="mb-6 space-y-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Write a Review</p>
              <select
                value={newReview.rating}
                onChange={e => setNewReview(r => ({ ...r, rating: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white outline-none text-sm"
              >
                {[5,4,3,2,1].map(n => (
                  <option key={n} value={n} className="bg-[#0f0f0f]">
                    {n} Stars {'★'.repeat(n)}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="Share your experience…"
                value={newReview.comment}
                onChange={e => setNewReview(r => ({ ...r, comment: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white h-20 outline-none focus:border-blue-500 resize-none text-sm"
              />
              <button type="submit" disabled={submitting}
                className="w-full py-2 bg-white hover:bg-gray-100 text-black font-bold rounded-lg flex items-center justify-center gap-2 text-sm disabled:opacity-60 transition-all">
                <Send size={14} />
                {submitting ? 'Posting…' : 'Post Review'}
              </button>
            </form>

            {/* Review list */}
            <div className="space-y-3">
              {reviews.length === 0 ? (
                <p className="text-sm text-gray-600 text-center py-4">No reviews yet. Be the first!</p>
              ) : (
                reviews.map((r, i) => (
                  <div key={i} className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-blue-400 text-sm">{r.username}</span>
                      <span className="text-yellow-400 text-xs">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    </div>
                    {r.comment && <p className="text-gray-400 text-xs leading-relaxed">{r.comment}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}