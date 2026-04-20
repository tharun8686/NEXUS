// src/components/ProductCard.jsx — FINAL (sentiment badges + stock alerts)
import { memo, useState, useCallback } from 'react';
import { formatPrice } from '../utils/currency';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { ShoppingCart, Plus, Minus, Check, AlertTriangle, Package } from 'lucide-react';
import SentimentBadge   from './SentimentBadge';
import StockAlertButton from './StockAlertButton';

const LOW_STOCK = 5;
const MED_STOCK = 15;
const MAX_STOCK = 50;

const cardVariants = {
  hidden:  { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1,
    transition: { duration: 0.35, ease: [0.25, 1, 0.5, 1] } },
};

function StockBadge({ stock }) {
  if (stock <= 0)
    return (
      <span className="absolute top-3 left-3 z-20 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
        Out of Stock
      </span>
    );
  if (stock <= LOW_STOCK)
    return (
      <span className="absolute top-3 left-3 z-20 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30 animate-pulse">
        <AlertTriangle size={10} /> Only {stock} left!
      </span>
    );
  if (stock <= MED_STOCK)
    return (
      <span className="absolute top-3 left-3 z-20 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
        <Package size={10} /> {stock} left
      </span>
    );
  return null;
}

function StockBar({ stock }) {
  const pct = Math.min((stock / MAX_STOCK) * 100, 100);
  const color =
    stock <= 0        ? 'from-red-600 to-red-500'       :
    stock <= LOW_STOCK ? 'from-orange-500 to-red-500'    :
    stock <= MED_STOCK ? 'from-yellow-500 to-orange-400' :
                         'from-green-500 to-emerald-400';
  const label =
    stock <= 0        ? 'Out of stock'             :
    stock <= LOW_STOCK ? `Only ${stock} remaining` :
    stock <= MED_STOCK ? `${stock} units left`     : `${stock} in stock`;
  const textColor =
    stock <= 0        ? 'text-red-400'    :
    stock <= LOW_STOCK ? 'text-orange-400' :
    stock <= MED_STOCK ? 'text-yellow-400' : 'text-green-400';

  return (
    <div className="mt-3 mb-1">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Stock</span>
        <span className={`text-[10px] font-bold ${textColor}`}>{label}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const ProductCard = memo(function ProductCard({
  product, index, addToCart, country,
  alertIds = [], onAlertToggle,
}) {
  const [qty,     setQty]     = useState(1);
  const [success, setSuccess] = useState(false);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useTransform(my, [-150, 150], [8, -8]);
  const rotateY = useTransform(mx, [-150, 150], [-8, 8]);

  const onMouseMove = useCallback((e) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - r.left - r.width  / 2);
    my.set(e.clientY - r.top  - r.height / 2);
  }, [mx, my]);

  const onMouseLeave = useCallback(() => { mx.set(0); my.set(0); }, [mx, my]);

  const handleAdd = useCallback(() => {
    addToCart(product, qty);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 1800);
  }, [addToCart, product, qty]);

  const delay        = index < 8 ? index * 0.04 : 0;
  const isOutOfStock = product.stock_quantity <= 0;

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      transition={{ delay }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      className="relative rounded-[2rem] p-5 group h-full flex flex-col justify-between border border-white/5 bg-white/[0.03] hover:bg-white/[0.05] shadow-[0_4px_24px_rgb(0,0,0,0.15)] hover:border-white/15 transition-colors duration-200 will-change-transform z-20"
    >
      <div className="absolute inset-0 rounded-[2rem] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: 'radial-gradient(300px circle at 50% 50%, rgba(255,255,255,0.05), transparent 60%)' }}
      />

      <StockBadge stock={product.stock_quantity} />

      <div className="relative z-10">
        <div className="relative h-44 mb-4 rounded-2xl overflow-hidden p-5 bg-gradient-to-br from-white/5 to-transparent border border-white/5 group-hover:border-blue-500/20 transition-colors duration-200">
          <img
            src={product.image_url || 'https://images.unsplash.com/photo-1550009158-9a37ceaa2e8e?w=400&q=75'}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        <div className="mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1 block">{product.category}</span>
          <h3 className="font-bold text-base text-white leading-tight line-clamp-2">{product.name}</h3>
        </div>

        {/* Sentiment badge — only shown when there are reviews */}
        {Number(product.total_reviews) > 0 && (
          <div className="mt-2 mb-0.5">
            <SentimentBadge
              productId={product.product_id}
              reviewCount={Number(product.total_reviews)}
            />
          </div>
        )}

        <StockBar stock={product.stock_quantity} />
      </div>

      <div className="relative z-10 mt-auto">
        <p className="text-xl font-black text-white mb-3 mt-2">
          {formatPrice(Number(product.price), country)}
        </p>

        {/* Out of stock: show notify button */}
        {isOutOfStock ? (
          <div className="space-y-2">
            <button disabled
              className="w-full py-3 rounded-xl font-bold text-sm bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed flex items-center justify-center gap-2">
              <ShoppingCart size={16} /> Out of Stock
            </button>
            <StockAlertButton
              productId={product.product_id}
              alertIds={alertIds}
              onToggle={onAlertToggle}
              className="w-full justify-center"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between bg-black/30 border border-white/10 rounded-xl p-1">
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                <Minus size={13} />
              </button>
              <span className="font-bold text-white text-sm w-6 text-center">{qty}</span>
              <button onClick={() => setQty(q => Math.min(product.stock_quantity, q + 1))}
                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                <Plus size={13} />
              </button>
            </div>

            <button
              onClick={handleAdd}
              disabled={success}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 text-sm ${
                success
                  ? 'bg-green-500 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 active:scale-[0.97] text-white shadow-lg shadow-blue-600/20'
              }`}
            >
              <AnimatePresence mode="wait" initial={false}>
                {success ? (
                  <motion.span key="ok"
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="flex items-center gap-2">
                    <Check size={16} /> Added!
                  </motion.span>
                ) : (
                  <motion.span key="add"
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="flex items-center gap-2">
                    <ShoppingCart size={16} /> Add to Setup
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
});

export default ProductCard;