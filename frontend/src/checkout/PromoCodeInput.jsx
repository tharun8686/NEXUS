// src/components/PromoCodeInput.jsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, CheckCircle2, XCircle, Loader2, X } from 'lucide-react';
import api from '../utils/api';
import { formatPrice } from '../utils/currency';

export default function PromoCodeInput({ orderTotal, country, onApply, onRemove, appliedPromo }) {
  const [code,    setCode]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const validate = async () => {
    if (!code.trim()) return;
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/api/promo/validate', {
        code: code.trim().toUpperCase(),
        orderTotal,
      });
      onApply(data);
      setCode('');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid promo code.');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') validate(); };

  // Applied state
  if (appliedPromo) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-xl"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-black text-white">{appliedPromo.code}</p>
            <p className="text-xs text-green-400">
              You save {formatPrice(appliedPromo.discount_amount, country)}!
            </p>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-red-400 transition-colors"
        >
          <X size={14} />
        </button>
      </motion.div>
    );
  }

  return (
    <div>
      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
        <Tag size={11} /> Promo Code
      </label>
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 focus-within:border-blue-500/50 transition-all">
          <Tag size={14} className="text-gray-500 flex-shrink-0" />
          <input
            type="text"
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
            onKeyDown={handleKey}
            placeholder="Enter code (e.g. NEXUS10)"
            className="flex-1 bg-transparent py-3 text-white placeholder-gray-600 text-sm outline-none font-mono tracking-widest"
          />
        </div>
        <button
          onClick={validate}
          disabled={!code.trim() || loading}
          className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-1.5 flex-shrink-0"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
        </button>
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-xs text-red-400 mt-1.5"
          >
            <XCircle size={11} /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}