// src/components/LoyaltyWidget.jsx
// Shows user's points balance at checkout with a redeem toggle.
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Coins, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import api from '../utils/api';
import { formatPrice } from '../utils/currency';

const TIER_CONFIG = {
  Bronze:   { color: 'text-orange-600',  bg: 'bg-orange-900/20  border-orange-700/30',  icon: '🥉' },
  Silver:   { color: 'text-gray-300',    bg: 'bg-gray-700/20    border-gray-600/30',    icon: '🥈' },
  Gold:     { color: 'text-yellow-400',  bg: 'bg-yellow-900/20  border-yellow-700/30',  icon: '🥇' },
  Platinum: { color: 'text-cyan-300',    bg: 'bg-cyan-900/20    border-cyan-700/30',    icon: '💎' },
};

export default function LoyaltyWidget({ orderTotal, country, onRedeem, redeemedPoints }) {
  const [loyalty,    setLoyalty]    = useState(null);
  const [expanded,   setExpanded]   = useState(false);
  const [redeemAmt,  setRedeemAmt]  = useState(0);
  const [validating, setValidating] = useState(false);
  const [redeemInfo, setRedeemInfo] = useState(null);

  useEffect(() => {
    api.get('/api/loyalty')
      .then(({ data }) => setLoyalty(data))
      .catch(() => {});
  }, []);

  const handleSliderChange = async (val) => {
    const pts = Number(val);
    setRedeemAmt(pts);
    if (pts === 0) { setRedeemInfo(null); onRedeem(0, 0); return; }
    setValidating(true);
    try {
      const { data } = await api.post('/api/loyalty/validate-redeem', {
        pointsToRedeem: pts,
        orderTotal,
      });
      setRedeemInfo(data);
      onRedeem(data.points_used, data.discount_amount);
    } catch (_) {}
    finally { setValidating(false); }
  };

  if (!loyalty || loyalty.points === 0) return null;

  const tier    = TIER_CONFIG[loyalty.tier] || TIER_CONFIG.Bronze;
  const maxPts  = Math.min(loyalty.points, Math.floor((orderTotal * 10) / 100 / loyalty.rupees_per_point));

  return (
    <div className={`rounded-2xl border ${tier.bg} overflow-hidden`}>
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{tier.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-black text-white">
                {loyalty.points.toLocaleString()} Points
              </p>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${tier.bg} ${tier.color}`}>
                {loyalty.tier}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Worth {formatPrice(loyalty.redeemable_value, country)} · Tap to use
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 space-y-4 border-t border-white/5">
              <p className="text-xs text-gray-500 mt-3">
                You can use up to {maxPts.toLocaleString()} points (max 10% of order value).
              </p>

              {/* Slider */}
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-gray-500">Points to redeem</span>
                  <span className="text-white font-black">{redeemAmt.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={maxPts}
                  step={10}
                  value={redeemAmt}
                  onChange={e => handleSliderChange(e.target.value)}
                  className="w-full accent-yellow-400"
                />
                <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                  <span>0</span>
                  <span>{maxPts.toLocaleString()} max</span>
                </div>
              </div>

              {/* Preview */}
              {redeemInfo && redeemAmt > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl"
                >
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-yellow-400" />
                    <span className="text-xs text-gray-300">
                      Using <span className="font-black text-white">{redeemInfo.points_used} pts</span>
                    </span>
                  </div>
                  <span className="text-sm font-black text-yellow-400">
                    -{formatPrice(redeemInfo.discount_amount, country)}
                  </span>
                </motion.div>
              )}

              {/* Next tier hint */}
              {loyalty.next_tier && (
                <p className="text-[11px] text-gray-600 text-center">
                  {loyalty.next_tier.needed.toLocaleString()} more points to reach {loyalty.next_tier.name}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}