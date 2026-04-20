import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatPrice } from '../../utils/currency';

export default function CartDrawer({ isOpen, close, cart, setCart, country }) {
  const navigate    = useNavigate();
  const totalAmount = cart.reduce((t, i) => t + i.price * i.quantity, 0);
  const totalItems  = cart.reduce((t, i) => t + i.quantity, 0);

  const updateQty = (id, newQty) => {
    if (newQty < 1) return;
    setCart(cart.map(item => item.product_id === id ? { ...item, quantity: newQty } : item));
  };

  const removeItem = (id) => setCart(cart.filter(item => item.product_id !== id));

  const handleCheckout = () => {
    close();
    navigate('/checkout');
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
                <ShoppingBag size={20} className="text-blue-400" />
                <div>
                  <p className="text-white font-black">Your Cart</p>
                  <p className="text-xs text-gray-500">{totalItems} item{totalItems !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button onClick={close} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-4">
                  <ShoppingBag size={48} className="opacity-20" />
                  <p className="text-sm">Your cart is empty</p>
                  <button onClick={close}
                    className="px-6 py-2 border border-white/10 rounded-full text-white text-sm hover:bg-white/5 transition-colors">
                    Browse Products
                  </button>
                </div>
              ) : (
                cart.map(item => (
                  <motion.div key={item.product_id}
                    layout
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex gap-3 bg-white/[0.03] border border-white/5 hover:border-white/10 p-3 rounded-2xl transition-colors group"
                  >
                    <div className="w-16 h-16 bg-black/40 rounded-xl p-2 flex items-center justify-center flex-shrink-0">
                      <img src={item.image_url} alt={item.name} loading="lazy" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <p className="text-white font-bold text-sm line-clamp-1">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.category}</p>
                        <p className="text-blue-400 font-black text-sm mt-0.5">
                          {formatPrice(item.price, country)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-2 bg-black/40 rounded-lg p-0.5 border border-white/5">
                          <button onClick={() => updateQty(item.product_id, item.quantity - 1)}
                            className="text-gray-400 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors">
                            <Minus size={12} />
                          </button>
                          <span className="text-sm font-bold text-white w-5 text-center">{item.quantity}</span>
                          <button onClick={() => updateQty(item.product_id, item.quantity + 1)}
                            className="text-gray-400 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors">
                            <Plus size={12} />
                          </button>
                        </div>
                        <button onClick={() => removeItem(item.product_id)}
                          className="text-gray-600 hover:text-red-400 transition-colors p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {/* Item total */}
                    <div className="flex-shrink-0 text-right flex flex-col justify-center">
                      <p className="text-xs text-gray-500">×{item.quantity}</p>
                      <p className="text-white font-bold text-sm">{formatPrice(item.price * item.quantity, country)}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="p-5 border-t border-white/10 bg-white/[0.02] space-y-4">
                {/* Totals */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Subtotal ({totalItems} items)</span>
                    <span>{formatPrice(totalAmount, country)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-400">
                    <span>Delivery</span>
                    <span>FREE</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-white pt-1.5 border-t border-white/5">
                    <span>Total</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                      {formatPrice(totalAmount, country)}
                    </span>
                  </div>
                </div>

                {/* Checkout button */}
                <button onClick={handleCheckout}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20">
                  Proceed to Checkout <ArrowRight size={18} />
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-600">
                  <Lock size={10} className="text-green-500" />
                  <span>Secure & Encrypted Checkout</span>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}