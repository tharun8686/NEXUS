// src/pages/CheckoutPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  ArrowLeft, ArrowRight, MapPin, CreditCard, CheckCircle2,
  ShoppingBag, Truck, Banknote, Lock, Loader2, Home, Star
} from 'lucide-react';
import { formatPrice, getDialInfo } from '../utils/currency';
import api from '../utils/api';

// FIXED IMPORTS: Pointing to the components folder correctly!
import PromoCodeInput from '../checkout/PromoCodeInput';
import LoyaltyWidget  from '../checkout/LoyaltyWidget';

const STEPS = [
  { id: 1, label: 'Address',  icon: MapPin      },
  { id: 2, label: 'Payment',  icon: CreditCard  },
  { id: 3, label: 'Confirm',  icon: CheckCircle2},
];

function StepBar({ current }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEPS.map((step, i) => {
        const done   = current > step.id;
        const active = current === step.id;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 transition-all duration-300 ${
                done   ? 'bg-green-500 border-green-500 text-white' :
                active ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30' :
                         'bg-white/5 border-white/10 text-gray-500'
              }`}>
                {done ? <CheckCircle2 size={18} /> : <step.icon size={16} />}
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${
                active ? 'text-white' : done ? 'text-green-400' : 'text-gray-600'
              }`}>{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-16 sm:w-24 h-0.5 mx-2 mb-5 transition-all duration-500 ${
                current > step.id ? 'bg-green-500' : 'bg-white/10'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PaymentOption({ id, label, desc, icon: Icon, color, selected, onClick }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
        selected
          ? `border-${color}-500/50 bg-${color}-500/10 shadow-lg shadow-${color}-500/10`
          : 'border-white/10 bg-white/[0.02] hover:bg-white/5 hover:border-white/20'
      }`}>
      <div className={`p-3 rounded-xl ${selected ? `bg-${color}-500/20` : 'bg-white/5'} flex-shrink-0`}>
        <Icon size={20} className={selected ? `text-${color}-400` : 'text-gray-400'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm ${selected ? 'text-white' : 'text-gray-300'}`}>{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
        selected ? `border-${color}-500 bg-${color}-500` : 'border-gray-600'
      }`}>
        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
    </button>
  );
}

// Helper function to load Razorpay script
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function CheckoutPage({ user, cart, setCart, setUser }) {
  const navigate  = useNavigate();
  const country   = user?.country || 'India';
  const [step, setStep]         = useState(1);
  const [placing, setPlacing]   = useState(false);
  const [orderId, setOrderId]   = useState(null);

  // ── Promo + Loyalty state ──────────────────────────────────────────────────
  const [appliedPromo,    setAppliedPromo]    = useState(null);
  const [loyaltyPoints,   setLoyaltyPoints]   = useState(0);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0);
  const [pointsEarned,    setPointsEarned]    = useState(0);

  // ── Address form ────────────────────────────────────────────────────────────
  const [address, setAddress] = useState({
    fullName: user?.username || '',
    phone:    (user?.phone   || '').replace(/^\+\d+/, ''),
    line1:    user?.address  || '',
    city:     user?.city     || '',
    pincode:  user?.pincode  || '',
    country:  user?.country  || 'India',
  });

  // ── Payment state ───────────────────────────────────────────────────────────
  // Default to razorpay now
  const [payMethod, setPayMethod] = useState('razorpay');

  useEffect(() => {
    if ((!cart || cart.length === 0) && step !== 3) navigate('/');
  }, [cart, navigate, step]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { toast.error('Please log in to continue.'); navigate('/auth'); }
  }, [navigate]);

  // ── Calculations ────────────────────────────────────────────────────────────
  const subtotal       = cart.reduce((t, i) => t + i.price * i.quantity, 0);
  const promoDiscount  = appliedPromo?.discount_amount || 0;
  const totalDiscount  = promoDiscount + loyaltyDiscount;
  const totalINR       = Math.max(0, subtotal - totalDiscount);
  const totalItems     = cart.reduce((t, i) => t + i.quantity, 0);
  const dial           = getDialInfo(country);

  const addrChange = (e) => setAddress(a => ({ ...a, [e.target.name]: e.target.value }));

  const addrValid = address.fullName && address.phone && address.line1 && address.city && address.pincode;

  // ── Place order ─────────────────────────────────────────────────────────────
  const placeOrder = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Your session has expired. Please log in again.');
      setUser(null); localStorage.removeItem('user'); navigate('/auth');
      return;
    }
    
    setPlacing(true);

    if (payMethod === 'razorpay') {
      const res = await loadRazorpayScript();
      if (!res) {
        toast.error('Razorpay SDK failed to load. Are you online?');
        setPlacing(false);
        return;
      }

      try {
        // 1. Create Order on Backend
        const { data: orderData } = await api.post('/api/razorpay/create-order', {
          amount: totalINR, 
          currency: 'INR'
        });

        // 2. Initialize Razorpay Options
        // Note: Change import.meta.env.VITE_RAZORPAY_KEY_ID to process.env.REACT_APP_RAZORPAY_KEY_ID if using Create React App
        const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || process.env.REACT_APP_RAZORPAY_KEY_ID;

        const options = {
          key: razorpayKeyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "NEXUS TECH",
          description: "Order Checkout",
          order_id: orderData.id,
          handler: async function (response) {
            try {
              // 3. Verify Payment and save order
              const { data: verifyData } = await api.post('/api/checkout-v2', {
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
                cartItems: cart,
                totalAmount: subtotal,
                address,
                paymentMethod: 'razorpay',
                promoCode: appliedPromo?.code || null,
                promoDiscount,
                loyaltyPointsUsed: loyaltyPoints,
                loyaltyDiscount,
              });

              setOrderId(verifyData.orderId);
              setPointsEarned(verifyData.pointsEarned || 0);
              setCart([]);
              localStorage.removeItem('cart');
              setStep(3);
              toast.success('Payment Successful!');
            } catch (err) {
              toast.error('Payment verification failed. Please contact support.');
            }
          },
          prefill: {
            name: address.fullName,
            contact: address.phone,
          },
          theme: {
            color: "#2563eb",
          },
          modal: {
            ondismiss: function() {
              setPlacing(false);
              toast.error('Payment cancelled');
            }
          }
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.open();

      } catch (err) {
        toast.error('Could not initialize payment. Please try again.');
        setPlacing(false);
      }
    } else {
      // CASH ON DELIVERY FLOW
      try {
        const { data } = await api.post('/api/checkout-v2', {
          cartItems:         cart,
          totalAmount:       subtotal,
          address,
          paymentMethod:     'cod',
          promoCode:         appliedPromo?.code || null,
          promoDiscount,
          loyaltyPointsUsed: loyaltyPoints,
          loyaltyDiscount,
        });

        setOrderId(data.orderId);
        setPointsEarned(data.pointsEarned || 0);
        setCart([]);
        localStorage.removeItem('cart');
        setStep(3);
      } catch (err) {
        const status  = err.response?.status;
        const message = err.response?.data?.error || 'Order failed. Please try again.';
        if (status === 401 || status === 403) {
          toast.error('Your session expired. Please log in again.');
          localStorage.removeItem('token'); localStorage.removeItem('user');
          setUser(null); navigate('/auth');
        } else {
          toast.error(message);
        }
      } finally {
        setPlacing(false);
      }
    }
  };

  const Field = ({ label, name, value, onChange, placeholder, type = 'text', prefix }) => (
    <div>
      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">{label}</label>
      <div className="flex rounded-xl overflow-hidden border border-white/10 focus-within:border-blue-500/50 transition-all bg-black/40">
        {prefix && <span className="flex items-center px-3 bg-white/5 border-r border-white/10 text-sm text-blue-400 font-bold flex-shrink-0">{prefix}</span>}
        <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
          className="flex-1 bg-transparent py-3 px-3 text-white placeholder-gray-600 text-sm outline-none" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Toaster position="top-right" toastOptions={{ style: { background: '#0f0f12', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' } }} />

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-[120px]" />
      </div>

      {/* Nav */}
      <div className="sticky top-0 z-40 bg-black/60 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <button onClick={() => step > 1 && step < 3 ? setStep(s => s - 1) : navigate('/')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-bold">
            <ArrowLeft size={18} />{step === 1 || step === 3 ? 'Back to Store' : 'Back'}
          </button>
          <div className="text-lg font-black">NEXUS<span className="text-blue-500">TECH</span></div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Lock size={14} className="text-green-400" />
            <span className="hidden sm:block">Secure Checkout</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 max-w-5xl relative z-10">
        {step < 3 && <StepBar current={step} />}

        <div className={`grid gap-8 ${step < 3 ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>

          {/* LEFT: Steps */}
          {step < 3 && (
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">

                {/* STEP 1 — Address */}
                {step === 1 && (
                  <motion.div key="addr"
                    initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.25 }}
                    className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 space-y-5"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                        <MapPin size={18} className="text-blue-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-white">Delivery Address</h2>
                        <p className="text-xs text-gray-500">Where should we deliver your order?</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Field label="Full Name" name="fullName" value={address.fullName} onChange={addrChange} placeholder="Your full name" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Phone Number</label>
                        <div className="flex rounded-xl overflow-hidden border border-white/10 focus-within:border-blue-500/50 transition-all bg-black/40">
                          <span className="flex items-center px-3 bg-white/5 border-r border-white/10 text-sm text-blue-400 font-bold flex-shrink-0">{dial.code}</span>
                          <input type="tel" name="phone" value={address.phone}
                            onChange={e => setAddress(a => ({ ...a, phone: e.target.value.replace(/\D/g,'').slice(0, dial.digits) }))}
                            placeholder={dial.placeholder}
                            className="flex-1 bg-transparent py-3 px-3 text-white placeholder-gray-600 text-sm outline-none" />
                        </div>
                      </div>
                      <div className="col-span-2">
                        <Field label="Street Address" name="line1" value={address.line1} onChange={addrChange} placeholder="House no., Street, Area" />
                      </div>
                      <Field label="City"    name="city"    value={address.city}    onChange={addrChange} placeholder="City" />
                      <Field label="Pincode" name="pincode" value={address.pincode} onChange={addrChange} placeholder="Pincode / ZIP" />
                      <div className="col-span-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Country</label>
                        <div className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm opacity-60">{address.country}</div>
                      </div>
                    </div>

                    <button onClick={() => setStep(2)} disabled={!addrValid}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 mt-2">
                      Continue to Payment <ArrowRight size={18} />
                    </button>
                  </motion.div>
                )}

                {/* STEP 2 — Payment & Promo Codes */}
                {step === 2 && (
                  <motion.div key="pay"
                    initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    {/* Payment method */}
                    <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
                          <CreditCard size={18} className="text-purple-400" />
                        </div>
                        <div>
                          <h2 className="text-lg font-black text-white">Payment Method</h2>
                          <p className="text-xs text-gray-500">All transactions are secure and encrypted</p>
                        </div>
                      </div>
                      
                      {/* Simplified Payment Options for Razorpay */}
                      <div className="space-y-3">
                        <PaymentOption 
                          id="razorpay"    
                          label="Pay Online (UPI, Cards, Wallets)" 
                          desc="Secure online payment powered by Razorpay"     
                          icon={CreditCard} 
                          color="blue" 
                          selected={payMethod === 'razorpay'}   
                          onClick={() => setPayMethod('razorpay')} 
                        />
                        <PaymentOption 
                          id="cod"    
                          label="Cash on Delivery"    
                          desc="Pay when your order arrives"       
                          icon={Banknote}   
                          color="green"  
                          selected={payMethod === 'cod'}    
                          onClick={() => setPayMethod('cod')} 
                        />
                      </div>
                    </div>

                    {/* ── PROMO CODE ────────────────────────────────────────── */}
                    <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6">
                      <PromoCodeInput
                        orderTotal={subtotal}
                        country={country}
                        appliedPromo={appliedPromo}
                        onApply={setAppliedPromo}
                        onRemove={() => setAppliedPromo(null)}
                      />
                    </div>

                    {/* ── LOYALTY POINTS ────────────────────────────────────── */}
                    <LoyaltyWidget
                      orderTotal={subtotal}
                      country={country}
                      onRedeem={(pts, disc) => { setLoyaltyPoints(pts); setLoyaltyDiscount(disc); }}
                      redeemedPoints={loyaltyPoints}
                    />

                    <button onClick={placeOrder} disabled={placing}
                      className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20">
                      {placing
                        ? <><Loader2 size={18} className="animate-spin" /> {payMethod === 'razorpay' ? 'Opening Secure Payment...' : 'Placing Order...'}</>
                        : <><Lock size={16} /> Place Order · {formatPrice(totalINR, country)}</>}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* RIGHT: Order summary */}
          {step < 3 && (
            <div className="lg:col-span-1">
              <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-5 sticky top-24">
                <h3 className="font-black text-white mb-4 flex items-center gap-2">
                  <ShoppingBag size={16} className="text-blue-400" /> Order Summary
                  <span className="ml-auto text-gray-500 text-xs font-bold">{totalItems} item{totalItems!==1?'s':''}</span>
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1 mb-4">
                  {cart.map(item => (
                    <div key={item.product_id} className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/5 rounded-xl p-1.5 border border-white/5 flex-shrink-0">
                        <img src={item.image_url} alt={item.name} loading="lazy" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-bold line-clamp-1">{item.name}</p>
                        <p className="text-gray-500 text-[11px]">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-blue-400 text-xs font-black flex-shrink-0">{formatPrice(item.price*item.quantity, country)}</p>
                    </div>
                  ))}
                </div>
                
                {/* Dynamically updating totals section */}
                <div className="border-t border-white/5 pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-400"><span>Subtotal</span><span>{formatPrice(subtotal, country)}</span></div>
                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-400">
                      <span>Promo ({appliedPromo?.code})</span>
                      <span>-{formatPrice(promoDiscount, country)}</span>
                    </div>
                  )}
                  {loyaltyDiscount > 0 && (
                    <div className="flex justify-between text-sm text-yellow-400">
                      <span>Loyalty Points ({loyaltyPoints} pts)</span>
                      <span>-{formatPrice(loyaltyDiscount, country)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-green-400"><span>Delivery</span><span>FREE</span></div>
                  <div className="flex justify-between text-base font-black text-white pt-2 border-t border-white/5">
                    <span>Total</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">{formatPrice(totalINR, country)}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-xs text-green-400 font-bold pt-1">
                      <span>You save</span>
                      <span>{formatPrice(totalDiscount, country)}</span>
                    </div>
                  )}
                </div>

                {step === 2 && address.line1 && (
                  <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-start gap-2">
                      <Truck size={13} className="text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-gray-400">
                        <p className="font-bold text-white">{address.fullName}</p>
                        <p>{address.line1}, {address.city}</p>
                        <p>{address.pincode}, {address.country}</p>
                      </div>
                    </div>
                    <button onClick={() => setStep(1)} className="text-[11px] text-blue-400 hover:text-blue-300 mt-1.5 font-bold">Change →</button>
                  </div>
                )}
                <div className="mt-4 flex items-center gap-2 text-[11px] text-gray-600">
                  <Lock size={11} className="text-green-500" /><span>256-bit SSL encrypted · Safe & Secure</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Confirmation */}
          {step === 3 && (
            <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
              className="max-w-lg mx-auto w-full text-center py-10">
              <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', stiffness:200, damping:15, delay:0.1 }}
                className="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={48} className="text-green-400" />
              </motion.div>
              <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}>
                <h1 className="text-3xl font-black text-white mb-2">Order Placed!</h1>
                <p className="text-gray-400 mb-1">Thank you, <span className="text-white font-bold">{user?.username}</span>!</p>
                <p className="text-gray-500 text-sm">Your order <span className="text-blue-400 font-bold">#{orderId}</span> has been confirmed.</p>
              </motion.div>

              {/* Points earned banner */}
              {pointsEarned > 0 && (
                <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5 }}
                  className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center gap-2">
                  <Star size={16} className="text-yellow-400" />
                  <span className="text-yellow-400 font-black text-sm">+{pointsEarned} Loyalty Points earned!</span>
                </motion.div>
              )}

              <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}
                className="mt-6 p-4 bg-white/[0.02] border border-white/10 rounded-2xl text-left space-y-3">
                <div className="flex justify-between text-sm"><span className="text-gray-400">Order ID</span><span className="text-white font-bold">#{orderId}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-400">Amount Paid</span><span className="text-green-400 font-bold">{formatPrice(totalINR, country)}</span></div>
                {totalDiscount > 0 && <div className="flex justify-between text-sm"><span className="text-gray-400">Total Savings</span><span className="text-green-400 font-bold">{formatPrice(totalDiscount, country)}</span></div>}
                <div className="flex justify-between text-sm"><span className="text-gray-400">Payment</span><span className="text-white font-bold capitalize">{payMethod === 'cod' ? 'Cash on Delivery' : 'Paid via Razorpay'}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-400">Deliver to</span><span className="text-white font-bold text-right max-w-[60%]">{address.line1}, {address.city}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-400">Est. Delivery</span><span className="text-white font-bold">{payMethod==='cod'?'5–7 business days':'2–4 business days'}</span></div>
              </motion.div>

              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.6 }} className="flex gap-3 mt-8">
                <button onClick={() => navigate('/')}
                  className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20">
                  <Home size={16} /> Continue Shopping
                </button>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}