// src/components/LoyaltyModal.jsx
// Full loyalty dashboard — points history, tier progress, perks.
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, TrendingUp, Gift, Zap, ChevronRight, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import api from '../../utils/api';
import { formatPrice } from '../../utils/currency';

const TIER_CONFIG = {
  Bronze:   { color: 'text-orange-500',  ring: 'ring-orange-500/40',  bg: 'from-orange-900/30 to-orange-800/10',  icon: '🥉', perks: ['Early access to sales','Birthday bonus points'] },
  Silver:   { color: 'text-gray-300',    ring: 'ring-gray-400/40',    bg: 'from-gray-700/30 to-gray-600/10',      icon: '🥈', perks: ['5% bonus points on every order','Early access to sales','Birthday bonus points'] },
  Gold:     { color: 'text-yellow-400',  ring: 'ring-yellow-500/40',  bg: 'from-yellow-900/30 to-yellow-800/10',  icon: '🥇', perks: ['10% bonus points','Priority support','Exclusive Gold deals','Free gift wrapping'] },
  Platinum: { color: 'text-cyan-300',    ring: 'ring-cyan-400/40',    bg: 'from-cyan-900/30 to-cyan-800/10',      icon: '💎', perks: ['15% bonus points','Dedicated account manager','First access to launches','Free express shipping'] },
};

const TIER_ORDER    = ['Bronze','Silver','Gold','Platinum'];
const TIER_REQUIRED = { Bronze: 0, Silver: 500, Gold: 2000, Platinum: 5000 };

export default function LoyaltyModal({ onClose, country }) {
  const [loyalty, setLoyalty] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/loyalty')
      .then(({ data }) => { setLoyalty(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80">
      <div className="w-8 h-8 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
    </div>
  );

  const tier   = TIER_CONFIG[loyalty?.tier] || TIER_CONFIG.Bronze;
  const points = loyalty?.points || 0;
  const tierIdx = TIER_ORDER.indexOf(loyalty?.tier || 'Bronze');
  const nextTierName = TIER_ORDER[tierIdx + 1];
  const nextRequired = nextTierName ? TIER_REQUIRED[nextTierName] : null;
  const progress = nextRequired
    ? Math.min(((points - TIER_REQUIRED[loyalty?.tier]) / (nextRequired - TIER_REQUIRED[loyalty?.tier])) * 100, 100)
    : 100;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="bg-[#0a0a0d] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className={`relative p-6 bg-gradient-to-br ${tier.bg} border-b border-white/10 flex-shrink-0`}>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400">
            <X size={16} />
          </button>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full bg-black/40 flex items-center justify-center text-3xl ring-2 ${tier.ring}`}>
              {tier.icon}
            </div>
            <div>
              <p className={`text-xs font-black uppercase tracking-widest ${tier.color}`}>{loyalty?.tier} Member</p>
              <p className="text-3xl font-black text-white">{points.toLocaleString()}</p>
              <p className="text-xs text-gray-400">points · Worth {formatPrice(loyalty?.redeemable_value || 0, country)}</p>
            </div>
          </div>

          {/* Tier progress bar */}
          {nextTierName && (
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className={`font-bold ${tier.color}`}>{loyalty?.tier}</span>
                <span className="text-gray-400">{loyalty?.next_tier?.needed?.toLocaleString()} pts to {nextTierName}</span>
              </div>
              <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                  className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-orange-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Tier perks */}
          <div className="p-5 border-b border-white/5">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Gift size={12} /> Your Perks
            </p>
            <div className="space-y-2">
              {tier.perks.map((perk, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                  <Zap size={12} className={`flex-shrink-0 ${tier.color}`} />
                  {perk}
                </div>
              ))}
            </div>
          </div>

          {/* How to earn */}
          <div className="p-5 border-b border-white/5">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <TrendingUp size={12} /> How It Works
            </p>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex justify-between">
                <span>Earn on every purchase</span>
                <span className="font-black text-white">1 pt per ₹10</span>
              </div>
              <div className="flex justify-between">
                <span>Redeem value</span>
                <span className="font-black text-white">1 pt = ₹0.50</span>
              </div>
              <div className="flex justify-between">
                <span>Max redeem per order</span>
                <span className="font-black text-white">10% of order</span>
              </div>
            </div>
          </div>

          {/* Transaction history */}
          <div className="p-5">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Recent Activity</p>
            {loyalty?.history?.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-4">No transactions yet. Start shopping to earn points!</p>
            ) : (
              <div className="space-y-2">
                {loyalty?.history?.map(txn => (
                  <div key={txn.txn_id} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      txn.points > 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}>
                      {txn.points > 0
                        ? <ArrowUpRight size={14} className="text-green-400" />
                        : <ArrowDownLeft size={14} className="text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-bold line-clamp-1">{txn.description}</p>
                      <p className="text-gray-600 text-[10px]">
                        {new Date(txn.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <p className={`text-sm font-black flex-shrink-0 ${txn.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {txn.points > 0 ? '+' : ''}{txn.points} pts
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}