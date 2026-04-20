import { useState, useCallback } from 'react';
import { formatPrice, getCurrency } from '../../utils/currency';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ArrowRightLeft, ShoppingCart, Star, Zap,
  CheckCircle2, XCircle, Trophy, ChevronRight,
  Loader2, BarChart3, Package, IndianRupee, Boxes
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseSpecs(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return {}; }
}

// Numeric extractor — pulls first number from a string e.g. "6GB" → 6
function num(val) {
  if (val == null) return null;
  const m = String(val).match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

// Keys we want to show in the spec table (label → spec key)
const SPEC_LABELS = {
  display:          'Display',
  processor:        'Processor',
  ram:              'RAM',
  storage:          'Storage',
  battery:          'Battery',
  camera:           'Camera',
  gpu:              'GPU',
  connectivity:     'Connectivity',
  anc:              'ANC',
  type:             'Type',
  sensor:           'Sensor',
  video:            'Video',
  water_resistance: 'Water Resistance',
  rgb:              'RGB',
  dpi:              'DPI',
  switches:         'Switches',
  sensors:          'Sensors',
  driver:           'Driver',
  capacity:         'Capacity',
  compatibility:    'Compatibility',
  color:            'Color',
  warranty:         'Warranty',
};

// ── Compare logic (rule-based, no API needed) ─────────────────────────────────
function generateComparison(p1, p2, country) {
  const s1 = parseSpecs(p1.specs);
  const s2 = parseSpecs(p2.specs);

  const pros1 = [], cons1 = [], pros2 = [], cons2 = [];
  let score1 = 0, score2 = 0;

  // Price
  const price1 = Number(p1.price), price2 = Number(p2.price);
  if (price1 < price2) {
    pros1.push(`${formatPrice(price2 - price1, country)} cheaper`);
    cons2.push(`${formatPrice(price2 - price1, country)} more expensive`);
    score1 += 1;
  } else if (price2 < price1) {
    pros2.push(`${formatPrice(price1 - price2, country)} cheaper`);
    cons1.push(`${formatPrice(price1 - price2, country)} more expensive`);
    score2 += 1;
  }

  // Rating
  const r1 = Number(p1.average_rating || p1.rating || 0);
  const r2 = Number(p2.average_rating || p2.rating || 0);
  if (r1 > r2 + 0.2) {
    pros1.push(`Higher rated (${r1} vs ${r2})`);
    cons2.push(`Lower rated (${r2} vs ${r1})`);
    score1 += 2;
  } else if (r2 > r1 + 0.2) {
    pros2.push(`Higher rated (${r2} vs ${r1})`);
    cons1.push(`Lower rated (${r1} vs ${r2})`);
    score2 += 2;
  }

  // Reviews count
  const rev1 = Number(p1.total_reviews || p1.reviews_count || 0);
  const rev2 = Number(p2.total_reviews || p2.reviews_count || 0);
  if (rev1 > rev2 * 1.3) {
    pros1.push(`More reviews (${rev1} vs ${rev2}) — more trusted`);
    score1 += 1;
  } else if (rev2 > rev1 * 1.3) {
    pros2.push(`More reviews (${rev2} vs ${rev1}) — more trusted`);
    score2 += 1;
  }

  // Stock
  const st1 = Number(p1.stock_quantity), st2 = Number(p2.stock_quantity);
  if (st1 === 0 && st2 > 0) {
    cons1.push('Out of stock — unavailable right now');
    pros2.push('In stock and ready to ship');
    score2 += 2;
  } else if (st2 === 0 && st1 > 0) {
    cons2.push('Out of stock — unavailable right now');
    pros1.push('In stock and ready to ship');
    score1 += 2;
  } else if (st1 > st2 + 10) {
    pros1.push(`Better availability (${st1} units vs ${st2})`);
    score1 += 0.5;
  } else if (st2 > st1 + 10) {
    pros2.push(`Better availability (${st2} units vs ${st1})`);
    score2 += 0.5;
  }

  // Spec-level comparisons (RAM, storage, battery, DPI)
  const ramN1 = num(s1.ram), ramN2 = num(s2.ram);
  if (ramN1 && ramN2 && ramN1 !== ramN2) {
    if (ramN1 > ramN2) { pros1.push(`More RAM (${s1.ram} vs ${s2.ram})`); score1 += 1.5; }
    else               { pros2.push(`More RAM (${s2.ram} vs ${s1.ram})`); score2 += 1.5; }
  }

  const storN1 = num(s1.storage), storN2 = num(s2.storage);
  if (storN1 && storN2 && storN1 !== storN2) {
    if (storN1 > storN2) { pros1.push(`More storage (${s1.storage} vs ${s2.storage})`); score1 += 1; }
    else                 { pros2.push(`More storage (${s2.storage} vs ${s1.storage})`); score2 += 1; }
  }

  const batN1 = num(s1.battery), batN2 = num(s2.battery);
  if (batN1 && batN2 && batN1 !== batN2) {
    if (batN1 > batN2) { pros1.push(`Better battery (${s1.battery} vs ${s2.battery})`); score1 += 1; }
    else               { pros2.push(`Better battery (${s2.battery} vs ${s1.battery})`); score2 += 1; }
  }

  const dpiN1 = num(s1.dpi), dpiN2 = num(s2.dpi);
  if (dpiN1 && dpiN2 && dpiN1 !== dpiN2) {
    if (dpiN1 > dpiN2) { pros1.push(`Higher max DPI (${s1.dpi} vs ${s2.dpi})`); score1 += 1; }
    else               { pros2.push(`Higher max DPI (${s2.dpi} vs ${s1.dpi})`); score2 += 1; }
  }

  // ANC
  if (s1.anc && s2.anc && s1.anc !== s2.anc) {
    if (s1.anc !== 'No' && s2.anc === 'No') { pros1.push('Has Active Noise Cancellation'); score1 += 1.5; }
    if (s2.anc !== 'No' && s1.anc === 'No') { pros2.push('Has Active Noise Cancellation'); score2 += 1.5; }
  }

  // Warranty
  if (s1.warranty && s2.warranty && s1.warranty !== s2.warranty) {
    const w1 = num(s1.warranty), w2 = num(s2.warranty);
    if (w1 && w2 && w1 > w2) { pros1.push(`Longer warranty (${s1.warranty})`); score1 += 0.5; }
    if (w1 && w2 && w2 > w1) { pros2.push(`Longer warranty (${s2.warranty})`); score2 += 0.5; }
  }

  // Value for money (rating / price * 1000)
  const vfm1 = price1 > 0 ? (r1 / price1) * 100000 : 0;
  const vfm2 = price2 > 0 ? (r2 / price2) * 100000 : 0;
  if (vfm1 > vfm2 * 1.15) {
    pros1.push('Better value for money (rating per rupee)');
    score1 += 1.5;
  } else if (vfm2 > vfm1 * 1.15) {
    pros2.push('Better value for money (rating per rupee)');
    score2 += 1.5;
  }

  // Verdict
  let winner = null, reason = '';
  const diff = Math.abs(score1 - score2);
  if (diff < 0.5) {
    reason = 'Both products are very evenly matched. Your choice depends on personal preference.';
  } else if (score1 > score2) {
    winner = p1;
    const margin = diff > 3 ? 'significantly' : diff > 1.5 ? 'moderately' : 'slightly';
    reason = `${p1.name} ${margin} outperforms ${p2.name} across price, ratings, specs, and availability.`;
  } else {
    winner = p2;
    const margin = diff > 3 ? 'significantly' : diff > 1.5 ? 'moderately' : 'slightly';
    reason = `${p2.name} ${margin} outperforms ${p1.name} across price, ratings, specs, and availability.`;
  }

  return { pros1, cons1, pros2, cons2, score1, score2, winner, reason };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Stars({ rating }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star key={i} size={12}
          className={i < full ? 'text-yellow-400 fill-yellow-400' :
                     i === full && half ? 'text-yellow-400 fill-yellow-400/50' : 'text-gray-600'}
        />
      ))}
      <span className="text-xs text-gray-400 ml-1">{Number(rating).toFixed(1)}</span>
    </div>
  );
}

function ProConList({ items, type }) {
  if (!items.length) return (
    <p className="text-xs text-gray-600 italic">No notable {type === 'pro' ? 'advantages' : 'drawbacks'} found.</p>
  );
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-xs">
          {type === 'pro'
            ? <CheckCircle2 size={13} className="text-green-400 flex-shrink-0 mt-0.5" />
            : <XCircle     size={13} className="text-red-400   flex-shrink-0 mt-0.5" />}
          <span className={type === 'pro' ? 'text-gray-300' : 'text-gray-400'}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ScoreBar({ score, maxScore, color }) {
  const pct = maxScore > 0 ? Math.min((score / maxScore) * 100, 100) : 50;
  return (
    <div className="h-2 bg-white/5 rounded-full overflow-hidden mt-1">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
        className={`h-full rounded-full bg-gradient-to-r ${color}`}
      />
    </div>
  );
}

// ── Compare Modal ─────────────────────────────────────────────────────────────
function CompareModal({ p1, p2, onClose, addToCart, country }) {
  const s1 = parseSpecs(p1.specs);
  const s2 = parseSpecs(p2.specs);
  const { pros1, cons1, pros2, cons2, score1, score2, winner, reason } = generateComparison(p1, p2, country);
  const maxScore = Math.max(score1, score2, 1);

  // All spec keys present in either product
  const allSpecKeys = [...new Set([...Object.keys(s1), ...Object.keys(s2)])];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 20 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="bg-[#0a0a0d] border border-white/10 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <ArrowRightLeft size={18} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Product Comparison</h2>
              <p className="text-xs text-gray-500">Side-by-side analysis with verdict</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">

          {/* ── Product headers ── */}
          <div className="grid grid-cols-2 gap-4 p-6 pb-4">
            {[p1, p2].map((p, i) => {
              const isWinner = winner?.product_id === p.product_id;
              const score = i === 0 ? score1 : score2;
              const color = i === 0 ? 'from-blue-500 to-cyan-400' : 'from-purple-500 to-pink-400';
              return (
                <div key={p.product_id}
                  className={`relative rounded-2xl border p-5 transition-all ${
                    isWinner
                      ? 'border-yellow-500/40 bg-yellow-500/5'
                      : 'border-white/10 bg-white/[0.02]'
                  }`}>
                  {isWinner && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 bg-yellow-500 rounded-full text-black text-xs font-black shadow-lg shadow-yellow-500/30">
                      <Trophy size={11} /> WINNER
                    </div>
                  )}
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-24 h-24 bg-white/5 rounded-2xl p-3 border border-white/5 flex items-center justify-center">
                      <img src={p.image_url || 'https://images.unsplash.com/photo-1550009158-9a37ceaa2e8e?w=200&q=75'}
                        alt={p.name} loading="lazy"
                        className="max-w-full max-h-full object-contain" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">{p.category}</span>
                      <h3 className="font-black text-white text-sm mt-0.5 line-clamp-2">{p.name}</h3>
                      <p className="text-lg font-black text-white mt-1">{formatPrice(Number(p.price), country)}</p>
                      <Stars rating={Number(p.average_rating || p.rating || 0)} />
                    </div>

                    {/* Score bar */}
                    <div className="w-full">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500 font-bold uppercase tracking-wider">Score</span>
                        <span className="font-black text-white">{score.toFixed(1)}</span>
                      </div>
                      <ScoreBar score={score} maxScore={maxScore} color={color} />
                    </div>

                    {/* Stock */}
                    <div className={`text-xs px-3 py-1 rounded-full font-bold ${
                      p.stock_quantity > 10 ? 'bg-green-500/15 text-green-400' :
                      p.stock_quantity > 0  ? 'bg-orange-500/15 text-orange-400' :
                                              'bg-red-500/15 text-red-400'
                    }`}>
                      {p.stock_quantity > 0 ? `${p.stock_quantity} in stock` : 'Out of Stock'}
                    </div>

                    <button
                      onClick={() => { addToCart(p, 1); }}
                      disabled={p.stock_quantity <= 0}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 disabled:text-gray-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all">
                      <ShoppingCart size={13} /> Add to Cart
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Verdict ── */}
          <div className="mx-6 mb-4 p-4 rounded-2xl border border-white/10 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-yellow-400" />
              <span className="text-sm font-black text-white uppercase tracking-wider">Verdict</span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{reason}</p>
            {winner && (
              <div className="mt-2 flex items-center gap-2">
                <Trophy size={14} className="text-yellow-400" />
                <span className="text-yellow-400 font-black text-sm">{winner.name}</span>
                <span className="text-gray-500 text-xs">is our recommendation</span>
              </div>
            )}
          </div>

          {/* ── Pros & Cons ── */}
          <div className="grid grid-cols-2 gap-4 px-6 mb-4">
            {[[pros1, cons1, p1, 'from-blue-500 to-cyan-400'], [pros2, cons2, p2, 'from-purple-500 to-pink-400']].map(([pros, cons, p, grad], i) => (
              <div key={p.product_id} className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-white line-clamp-1">{p.name}</h4>
                <div>
                  <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <CheckCircle2 size={10} /> Pros
                  </p>
                  <ProConList items={pros} type="pro" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <XCircle size={10} /> Cons
                  </p>
                  <ProConList items={cons} type="con" />
                </div>
              </div>
            ))}
          </div>

          {/* ── Spec table ── */}
          <div className="mx-6 mb-6 bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 bg-white/[0.02]">
              <BarChart3 size={15} className="text-blue-400" />
              <span className="text-sm font-black text-white">Full Spec Comparison</span>
            </div>

            {/* Fixed columns */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-5 py-3 text-xs text-gray-500 font-bold uppercase tracking-wider w-1/3">Spec</th>
                    <th className="text-left px-5 py-3 text-xs text-blue-400 font-bold uppercase tracking-wider w-1/3">{p1.name.split(' ').slice(0,3).join(' ')}</th>
                    <th className="text-left px-5 py-3 text-xs text-purple-400 font-bold uppercase tracking-wider w-1/3">{p2.name.split(' ').slice(0,3).join(' ')}</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Static rows */}
                  {[
                    { label: 'Price', icon: IndianRupee,
                      v1: formatPrice(Number(p1.price), country),
                      v2: formatPrice(Number(p2.price), country),
                      better: Number(p1.price) < Number(p2.price) ? 'left' : Number(p2.price) < Number(p1.price) ? 'right' : 'none' },
                    { label: 'Rating', icon: Star,
                      v1: `${Number(p1.average_rating || p1.rating || 0).toFixed(1)} ★`,
                      v2: `${Number(p2.average_rating || p2.rating || 0).toFixed(1)} ★`,
                      better: Number(p1.average_rating||p1.rating||0) > Number(p2.average_rating||p2.rating||0) ? 'left' : 'right' },
                    { label: 'Reviews', icon: Star,
                      v1: `${Number(p1.total_reviews||p1.reviews_count||0)} reviews`,
                      v2: `${Number(p2.total_reviews||p2.reviews_count||0)} reviews`,
                      better: Number(p1.total_reviews||p1.reviews_count||0) > Number(p2.total_reviews||p2.reviews_count||0) ? 'left' : 'right' },
                    { label: 'Stock', icon: Boxes,
                      v1: p1.stock_quantity > 0 ? `${p1.stock_quantity} units` : 'Out of Stock',
                      v2: p2.stock_quantity > 0 ? `${p2.stock_quantity} units` : 'Out of Stock',
                      better: Number(p1.stock_quantity) > Number(p2.stock_quantity) ? 'left' : 'right' },
                    { label: 'Brand', icon: Package,
                      v1: p1.brand || '—', v2: p2.brand || '—', better: 'none' },
                  ].map((row, i) => (
                    <tr key={row.label} className={`border-b border-white/5 ${i % 2 === 0 ? '' : 'bg-white/[0.015]'}`}>
                      <td className="px-5 py-3 text-xs text-gray-400 font-bold flex items-center gap-2">
                        <row.icon size={12} className="text-gray-600" />{row.label}
                      </td>
                      <td className={`px-5 py-3 text-xs font-bold ${row.better === 'left' ? 'text-green-400' : 'text-gray-300'}`}>{row.v1}</td>
                      <td className={`px-5 py-3 text-xs font-bold ${row.better === 'right' ? 'text-green-400' : 'text-gray-300'}`}>{row.v2}</td>
                    </tr>
                  ))}

                  {/* Dynamic spec rows */}
                  {allSpecKeys.map((key, i) => {
                    const label = SPEC_LABELS[key] || key;
                    const v1 = s1[key], v2 = s2[key];
                    if (!v1 && !v2) return null;
                    const n1 = num(v1), n2 = num(v2);
                    let better = 'none';
                    if (n1 && n2 && n1 !== n2) {
                      // For price-like things lower is better, for most specs higher is better
                      better = n1 > n2 ? 'left' : 'right';
                    }
                    return (
                      <tr key={key} className={`border-b border-white/5 ${(i + 5) % 2 === 0 ? '' : 'bg-white/[0.015]'}`}>
                        <td className="px-5 py-3 text-xs text-gray-400 font-bold">{label}</td>
                        <td className={`px-5 py-3 text-xs ${better === 'left' ? 'text-green-400 font-bold' : 'text-gray-300'}`}>{v1 || '—'}</td>
                        <td className={`px-5 py-3 text-xs ${better === 'right' ? 'text-green-400 font-bold' : 'text-gray-300'}`}>{v2 || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── CompareDrawer (bottom bar) ─────────────────────────────────────────────────
export default function CompareDrawer({ compareList, clearCompare, removeCompare, addToCart, country }) {
  const [showModal, setShowModal] = useState(false);

  const handleCompare = useCallback(() => {
    if (compareList.length === 2) setShowModal(true);
  }, [compareList]);

  if (compareList.length === 0) return null;

  return (
    <>
      <motion.div
        initial={{ y: 100 }} animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="fixed bottom-0 left-0 w-full glass-nav border-t border-white/10 z-40 py-3 px-6"
      >
        <div className="container mx-auto flex items-center justify-between gap-4">

          {/* Left: label + thumbnails */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-white font-bold text-sm">
              <ArrowRightLeft size={16} className="text-blue-400" />
              <span>Compare <span className="text-blue-400">{compareList.length}/2</span></span>
            </div>
            <div className="flex gap-3">
              {compareList.map(p => (
                <div key={p.product_id}
                  className="relative w-12 h-12 bg-white/5 rounded-xl border border-white/10 p-1 flex items-center justify-center">
                  <img src={p.image_url} alt={p.name} loading="lazy"
                    className="max-w-full max-h-full object-contain" />
                  <button onClick={() => removeCompare(p.product_id)}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-400 rounded-full p-0.5 transition-colors shadow-md">
                    <X size={10} />
                  </button>
                </div>
              ))}
              {compareList.length === 1 && (
                <div className="w-12 h-12 bg-white/[0.02] rounded-xl border border-dashed border-white/20 flex items-center justify-center text-gray-600 text-lg">
                  +
                </div>
              )}
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-3">
            <button onClick={clearCompare}
              className="text-gray-500 hover:text-white text-xs font-bold transition-colors hidden sm:block">
              Clear
            </button>
            <button
              onClick={handleCompare}
              disabled={compareList.length < 2}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-full text-sm transition-all shadow-lg shadow-blue-500/20"
            >
              <ArrowRightLeft size={14} />
              {compareList.length < 2 ? 'Add 1 more' : 'Compare Now'}
              {compareList.length === 2 && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Compare modal */}
      <AnimatePresence>
        {showModal && compareList.length === 2 && (
          <CompareModal
            p1={compareList[0]}
            p2={compareList[1]}
            onClose={() => setShowModal(false)}
            addToCart={addToCart}
            country={country}
          />
        )}
      </AnimatePresence>
    </>
  );
}