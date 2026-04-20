import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  X, Package, Truck, CheckCircle2, Clock, XCircle, RefreshCw,
  ChevronDown, ChevronUp, ShoppingBag, Loader2, MapPin,
  AlertCircle, RotateCcw, BoxIcon, Navigation, Wifi, WifiOff, ArrowLeft,
  RotateCw, Undo2,
} from 'lucide-react';
import { formatPrice } from '../../utils/currency';
import toast from 'react-hot-toast';

const WS_URL  = 'ws://localhost:3000';
const API_URL = 'http://localhost:3000';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  'Pending':          { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: Clock,        step: 0 },
  'Confirmed':        { color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',     icon: CheckCircle2, step: 1 },
  'Processing':       { color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20', icon: RefreshCw,    step: 2 },
  'Packed':           { color: 'text-cyan-400',   bg: 'bg-cyan-500/10 border-cyan-500/20',     icon: BoxIcon,      step: 3 },
  'Shipped':          { color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', icon: Truck,        step: 4 },
  'Out for Delivery': { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: Navigation,   step: 5 },
  'Delivered':        { color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20',   icon: CheckCircle2, step: 6 },
  'Cancelled':        { color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',       icon: XCircle,      step: -1 },
  'Returned':         { color: 'text-rose-400',   bg: 'bg-rose-500/10 border-rose-500/20',     icon: RotateCcw,    step: -1 },
};

const PROGRESS_STEPS = ['Pending', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg  = STATUS_CONFIG[status] || STATUS_CONFIG['Pending'];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.color}`}>
      <Icon size={10} /> {status}
    </span>
  );
}

function getEstDelivery(order) {
  const d    = new Date(order.created_at);
  const days = order.payment_method === 'cod' ? 7 : 4;
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function OrderProgress({ status }) {
  if (status === 'Cancelled' || status === 'Returned') {
    const cfg  = STATUS_CONFIG[status];
    const Icon = cfg.icon;
    return (
      <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl border mt-3 ${cfg.bg} ${cfg.color}`}>
        <Icon size={12} /> Order {status}
      </div>
    );
  }
  const currentStep = STATUS_CONFIG[status]?.step ?? 0;
  return (
    <div className="flex items-center mt-3 overflow-x-auto pb-1 scrollbar-none gap-0">
      {PROGRESS_STEPS.map((step, i) => {
        const done   = i <= currentStep;
        const active = i === currentStep;
        const Ico    = STATUS_CONFIG[step]?.icon || Clock;
        return (
          <div key={step} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                done
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-white/5 border-white/10 text-gray-600'
              } ${active ? 'ring-2 ring-blue-500/40 scale-110' : ''}`}>
                {done ? <CheckCircle2 size={13} /> : <Ico size={11} />}
              </div>
              <span className={`text-[8px] font-bold whitespace-nowrap leading-tight text-center max-w-[52px] ${
                done ? 'text-blue-400' : 'text-gray-600'
              }`}>{step}</span>
            </div>
            {i < PROGRESS_STEPS.length - 1 && (
              <div className={`w-5 sm:w-7 h-px mx-0.5 mb-4 flex-shrink-0 transition-all duration-500 ${
                i < currentStep ? 'bg-blue-500' : 'bg-white/10'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Cancel / Return / Exchange action panel ───────────────────────────────────
function CancelActionPanel({ order, onSuccess }) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);

  // Determine which actions are available based on current status
  const cancellableStatuses = ['Pending', 'Confirmed', 'Processing'];
  const returnableStatuses  = ['Delivered'];
  const isCancellable = cancellableStatuses.includes(order.status);
  const isReturnable  = returnableStatuses.includes(order.status);

  // No actions available for Packed/Shipped/Out for Delivery/Cancelled/Returned
  if (!isCancellable && !isReturnable) return null;

  const handleAction = async (type) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        `${API_URL}/api/orders/${order.order_id}/cancel`,
        { type },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(data.message);
      setOpen(false);
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-2 border-t border-white/5">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors flex items-center gap-1.5"
        >
          <X size={13} />
          {isCancellable ? 'Cancel Order' : 'Return / Exchange'}
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/40 p-3 rounded-xl border border-red-500/20"
        >
          <p className="text-xs font-bold text-gray-300 mb-3">
            {isCancellable ? 'Are you sure you want to cancel?' : 'How would you like to proceed?'}
          </p>

          <div className="flex gap-2">
            {/* Cancel (only for pre-shipment orders) */}
            {isCancellable && (
              <button
                disabled={loading}
                onClick={() => handleAction('cancel')}
                className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-black uppercase rounded-lg border border-red-500/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                Cancel Order
              </button>
            )}

            {/* Return / Refund (only for delivered orders) */}
            {isReturnable && (
              <button
                disabled={loading}
                onClick={() => handleAction('return')}
                className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-black uppercase rounded-lg border border-red-500/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />}
                Return (Refund)
              </button>
            )}

            {/* Exchange (only for delivered orders) */}
            {isReturnable && (
              <button
                disabled={loading}
                onClick={() => handleAction('exchange')}
                className="flex-1 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[11px] font-black uppercase rounded-lg border border-blue-500/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : <RotateCw size={12} />}
                Exchange Item
              </button>
            )}
          </div>

          <button
            onClick={() => setOpen(false)}
            className="w-full mt-2 text-[10px] text-gray-600 hover:text-gray-400 font-bold uppercase transition-colors"
          >
            Nevermind
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ── Single order card ─────────────────────────────────────────────────────────
function OrderCard({ order, country, highlight, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const isActive    = !['Delivered', 'Cancelled', 'Returned'].includes(order.status);
  const isDelivered = order.status === 'Delivered';

  const payLabel =
    order.payment_method === 'cod'    ? 'Cash on Delivery' :
    order.payment_method === 'upi'    ? 'UPI'              :
    order.payment_method === 'card'   ? 'Card'             :
    order.payment_method === 'wallet' ? 'Wallet'           :
    (order.payment_method || 'COD').toUpperCase();

  return (
    <motion.div
      layout
      animate={highlight ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 0.4 }}
      className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
        isDelivered               ? 'border-green-500/30 bg-green-500/[0.04]' :
        order.status==='Cancelled'? 'border-red-500/20 bg-red-500/[0.03]'     :
        order.status==='Returned' ? 'border-rose-500/20 bg-rose-500/[0.03]'   :
        highlight                 ? 'border-blue-500/40 bg-blue-500/[0.04]'   :
        'border-white/10 bg-white/[0.02]'
      }`}
    >
      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-white font-black text-sm">Order #{order.order_id}</span>
              <StatusBadge status={order.status} />
              {highlight && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold animate-pulse">
                  Updated!
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Placed {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              <span className="text-gray-600 ml-2">· {payLabel}</span>
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-white font-black text-sm">{formatPrice(Number(order.total_amount), country)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Progress bar */}
        <OrderProgress status={order.status} />

        {/* Expected delivery */}
        {isActive && (
          <div className="mt-3 flex items-center gap-2 text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2">
            <Truck size={11} className="flex-shrink-0" />
            <span>Expected delivery by <strong>{getEstDelivery(order)}</strong></span>
          </div>
        )}

        {isDelivered && (
          <div className="mt-3 flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2">
            <CheckCircle2 size={11} className="flex-shrink-0" />
            <span>Delivered successfully! Thank you for shopping.</span>
          </div>
        )}

        {order.delivery_address && (
          <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-600">
            <MapPin size={10} className="mt-0.5 flex-shrink-0" />
            <span className="line-clamp-1">{order.delivery_address}</span>
          </div>
        )}
      </div>

      {/* Items toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2.5 border-t border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-xs text-gray-400 hover:text-white"
      >
        <span className="font-bold">View {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</span>
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/5"
          >
            <div className="px-4 pb-4 pt-3 space-y-2">
              {/* Item list */}
              {order.items?.length ? order.items.map(item => (
                <div key={item.order_item_id}
                  className="flex items-center gap-3 bg-black/30 rounded-xl p-2.5 border border-white/5">
                  <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
                    <img src={item.image_url} alt={item.name} loading="lazy" className="w-8 h-8 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-bold line-clamp-1">{item.name}</p>
                    <p className="text-gray-500 text-[11px]">{item.category} · Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-blue-400 text-xs font-black">{formatPrice(item.price * item.quantity, country)}</p>
                    <p className="text-gray-600 text-[10px]">{formatPrice(item.price, country)} each</p>
                  </div>
                </div>
              )) : <p className="text-xs text-gray-600 text-center py-2">No item details available.</p>}

              {/* Order total */}
              <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <span className="text-xs text-gray-500 font-bold">Order Total</span>
                <span className="text-sm font-black text-white">{formatPrice(Number(order.total_amount), country)}</span>
              </div>

              {/* ── Cancel / Return / Exchange panel ── */}
              <CancelActionPanel order={order} onSuccess={onStatusChange} />

              {/* Collapse button */}
              <button
                onClick={() => setExpanded(false)}
                className="w-full flex items-center justify-center gap-1.5 pt-2 pb-1 text-xs text-gray-500 hover:text-blue-400 transition-colors font-bold"
              >
                <ArrowLeft size={11} /> Back to order list
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function OrdersModal({ user, onClose }) {
  const [orders, setOrders]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [tab, setTab]                     = useState('active');
  const [wsStatus, setWsStatus]           = useState('connecting'); // 'connecting'|'connected'|'disconnected'
  const [highlightedId, setHighlightedId] = useState(null);
  const wsRef   = useRef(null);
  const country = user?.country || 'India';

  // ── Fetch orders via REST ─────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/api/orders/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── WebSocket — connects once, reconnects on drop ─────────────────────────
  const connectWS = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const ws = new window.WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
      ws.send(JSON.stringify({ type: 'auth', token }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'order_status_update') {
          // Patch just this order's status — no full refetch needed
          setOrders(prev =>
            prev.map(o =>
              o.order_id === msg.orderId
                ? { ...o, status: msg.status }
                : o
            )
          );
          // Highlight the updated card briefly
          setHighlightedId(msg.orderId);
          setTimeout(() => setHighlightedId(null), 3000);

          // Auto-switch tab so the user sees the update
          const isActive = !['Delivered', 'Cancelled', 'Returned'].includes(msg.status);
          setTab(isActive ? 'active' : msg.status === 'Delivered' ? 'delivered' : 'other');
        }

        if (msg.type === 'new_order') {
          fetchOrders();
        }
      } catch (_) {}
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
      setTimeout(connectWS, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [fetchOrders]);

  useEffect(() => {
    fetchOrders();
    connectWS();
    return () => {
      wsRef.current?.close();
    };
  }, [fetchOrders, connectWS]);

  const activeOrders    = orders.filter(o => !['Delivered', 'Cancelled', 'Returned'].includes(o.status));
  const deliveredOrders = orders.filter(o => o.status === 'Delivered');
  const otherOrders     = orders.filter(o => ['Cancelled', 'Returned'].includes(o.status));

  const displayOrders =
    tab === 'active'    ? activeOrders    :
    tab === 'delivered' ? deliveredOrders :
    otherOrders;

  const TABS = [
    { id: 'active',    label: 'Active',    count: activeOrders.length    },
    { id: 'delivered', label: 'Delivered', count: deliveredOrders.length },
    { id: 'other',     label: 'Cancelled', count: otherOrders.length     },
  ];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="bg-[#0a0a0d] border border-white/10 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02] flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors flex-shrink-0"
              title="Back"
            >
              <ArrowLeft size={15} />
            </button>
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <ShoppingBag size={15} className="text-blue-400" />
            </div>
            <div>
              <p className="font-black text-white text-sm">My Orders</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
                {/* Live connection indicator */}
                <div className={`flex items-center gap-1 text-[10px] font-bold ${
                  wsStatus === 'connected'   ? 'text-green-400' :
                  wsStatus === 'connecting'  ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {wsStatus === 'connected'
                    ? <><Wifi size={9} /> Live</>
                    : wsStatus === 'connecting'
                    ? <><RefreshCw size={9} className="animate-spin" /> Connecting…</>
                    : <><WifiOff size={9} /> Offline</>
                  }
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchOrders()}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-blue-400 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 flex-shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-xs font-bold transition-all relative flex items-center justify-center gap-1.5 ${
                tab === t.id ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}>
              {t.label}
              {t.count > 0 && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black min-w-[16px] text-center ${
                  tab === t.id ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-400'
                }`}>{t.count}</span>
              )}
              {tab === t.id && (
                <motion.div
                  layoutId="orders-tab-indicator"
                  className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"
                />
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={28} className="animate-spin text-blue-500" />
              <p className="text-xs text-gray-500">Loading your orders…</p>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <AlertCircle size={15} /> {error}
            </div>
          ) : displayOrders.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Package size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-bold text-gray-400">
                {tab === 'active'    ? 'No active orders'      :
                 tab === 'delivered' ? 'No delivered orders yet' :
                 'No cancelled orders'}
              </p>
              <p className="text-xs mt-1 text-gray-600">
                {tab === 'active'    ? 'Place an order to track it here.'  :
                 tab === 'delivered' ? 'Delivered orders appear here.'     :
                 'Cancelled/returned orders appear here.'}
              </p>
            </div>
          ) : (
            displayOrders.map(order => (
              <OrderCard
                key={order.order_id}
                order={order}
                country={country}
                highlight={highlightedId === order.order_id}
                onStatusChange={fetchOrders}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-white/5 bg-white/[0.01] flex-shrink-0">
          <p className="text-[10px] text-gray-600 text-center">
            {wsStatus === 'connected'
              ? '🟢 Connected — status updates appear instantly when admin acts'
              : '🔴 Reconnecting to live updates…'}
          </p>
        </div>
      </motion.div>
    </div>
  );
}