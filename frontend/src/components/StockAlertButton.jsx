// src/components/StockAlertButton.jsx
// Shown on out-of-stock products. Lets users subscribe to restock emails.

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../utils/api';

export default function StockAlertButton({
  productId,
  alertIds  = [],
  onToggle,
  className = '',
}) {
  const [loading,  setLoading]  = useState(false);
  const [justDone, setJustDone] = useState(false);
  const isSubscribed = alertIds.includes(productId);

  const toggle = async (e) => {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      if (isSubscribed) {
        await api.delete(`/api/stock-alerts/${productId}`);
        onToggle?.(productId, false);
      } else {
        await api.post('/api/stock-alerts', { product_id: productId });
        onToggle?.(productId, true);
        setJustDone(true);
        setTimeout(() => setJustDone(false), 2500);
      }
    } catch (err) {
      console.error('Stock alert:', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (justDone) {
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`inline-flex items-center gap-1.5 px-3 py-2 bg-green-500/15 border border-green-500/30 rounded-xl text-green-400 text-xs font-bold ${className}`}
      >
        <CheckCircle2 size={13} /> We'll notify you!
      </motion.span>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={isSubscribed ? 'Remove stock alert' : 'Notify me when back in stock'}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all
        ${isSubscribed
          ? 'bg-blue-500/15 border-blue-500/30 text-blue-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400'}
        ${className}`}
    >
      {loading
        ? <Loader2 size={13} className="animate-spin" />
        : isSubscribed
        ? <BellRing size={13} className="text-blue-400" />
        : <Bell size={13} />}
      {isSubscribed ? 'Alert Set' : 'Notify Me'}
    </button>
  );
}