import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, ShoppingBag, Users, LogOut, TrendingUp,
  AlertTriangle, Plus, Pencil, Trash2, X, Check, ChevronDown,
  Search, RefreshCw, IndianRupee, ShoppingCart, UserCheck, Boxes,
  ArrowUpRight, Shield, ChevronLeft, Truck, CheckCircle2, XCircle,
  Loader2, Clock, Navigation, RotateCcw, MapPin, CreditCard,
  BoxIcon, Phone, Calendar, Wifi, WifiOff, Tag, Percent, BadgePercent,
  ToggleLeft, ToggleRight, Layers, Gift, Timer, AlertCircle, MessageCircle
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// Make sure these paths match your folder structure!
import AdminChatPanel from '../components/admin/AdminChatPanel';
import AdminPromoPanel from '../components/admin/AdminPromoPanel'; 

const API    = '/api/admin';
const WS_URL = window.location.protocol === 'https:' 
  ? `wss://${window.location.host}` 
  : `ws://${window.location.host}`;

const ORDER_STATUSES = [
  'Pending','Confirmed','Processing','Packed',
  'Shipped','Out for Delivery','Delivered','Cancelled','Returned'
];

const STATUS_CONFIG = {
  'Pending':           { color: 'text-yellow-400',  bg: 'bg-yellow-500/15 border-yellow-500/20',  icon: Clock        },
  'Confirmed':         { color: 'text-blue-300',    bg: 'bg-blue-400/15 border-blue-400/20',      icon: CheckCircle2 },
  'Processing':        { color: 'text-indigo-400',  bg: 'bg-indigo-500/15 border-indigo-500/20',  icon: RefreshCw    },
  'Packed':            { color: 'text-cyan-400',    bg: 'bg-cyan-500/15 border-cyan-500/20',      icon: BoxIcon      },
  'Shipped':           { color: 'text-purple-400',  bg: 'bg-purple-500/15 border-purple-500/20',  icon: Truck        },
  'Out for Delivery':  { color: 'text-orange-400',  bg: 'bg-orange-500/15 border-orange-500/20',  icon: Navigation   },
  'Delivered':         { color: 'text-green-400',   bg: 'bg-green-500/15 border-green-500/20',    icon: CheckCircle2 },
  'Cancelled':         { color: 'text-red-400',     bg: 'bg-red-500/15 border-red-500/20',        icon: XCircle      },
  'Returned':          { color: 'text-rose-400',    bg: 'bg-rose-500/15 border-rose-500/20',      icon: RotateCcw    },
};

const CATEGORIES = ['Mobile','Laptop','Audio','Gaming','Camera','Wearable','Accessories','Tablet'];

const SPEC_TEMPLATES = {
  Mobile:      [['processor','Processor'],['ram','RAM'],['storage','Storage'],['display','Display'],['battery','Battery'],['camera','Camera'],['video','Video'],['water_resistance','Water Resistance'],['connectivity','Connectivity'],['warranty','Warranty']],
  Laptop:      [['processor','Processor'],['ram','RAM'],['storage','Storage'],['display','Display'],['gpu','GPU'],['battery','Battery'],['connectivity','Connectivity'],['warranty','Warranty']],
  Audio:       [['type','Type'],['driver','Driver Size'],['anc','ANC'],['battery','Battery Life'],['connectivity','Connectivity'],['water_resistance','Water Resistance'],['warranty','Warranty']],
  Gaming:      [['type','Type'],['processor','Processor/GPU'],['ram','RAM/VRAM'],['storage','Storage'],['display','Display'],['dpi','DPI'],['sensor','Sensor'],['connectivity','Connectivity'],['warranty','Warranty']],
  Camera:      [['type','Type'],['sensor','Sensor'],['video','Max Video'],['storage','Storage Media'],['connectivity','Connectivity'],['water_resistance','Weather Sealing'],['warranty','Warranty']],
  Wearable:    [['type','Type'],['display','Display'],['battery','Battery Life'],['sensors','Sensors'],['water_resistance','Water Resistance'],['connectivity','Connectivity'],['warranty','Warranty']],
  Accessories: [['type','Type'],['capacity','Capacity/Wattage'],['switches','Switches'],['dpi','DPI'],['rgb','RGB'],['connectivity','Connectivity'],['warranty','Warranty']],
  Tablet:      [['processor','Processor'],['ram','RAM'],['storage','Storage'],['display','Display'],['battery','Battery'],['connectivity','Connectivity'],['warranty','Warranty']],
};

function adminAxios(token) {
  return axios.create({ headers: { Authorization: `Bearer ${token}` } });
}

function StatusBadge({ status }) {
  const cfg  = STATUS_CONFIG[status] || STATUS_CONFIG['Pending'];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.color}`}>
      <Icon size={10} /> {status}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color = 'blue' }) {
  const colors = {
    blue:   'from-blue-600/20 to-blue-600/5 border-blue-500/20 text-blue-400',
    purple: 'from-purple-600/20 to-purple-600/5 border-purple-500/20 text-purple-400',
    green:  'from-green-600/20 to-green-600/5 border-green-500/20 text-green-400',
    orange: 'from-orange-600/20 to-orange-600/5 border-orange-500/20 text-orange-400',
  };
  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
      className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-6 backdrop-blur-sm`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl bg-white/5 ${colors[color].split(' ')[3]}`}><Icon size={22} /></div>
        <ArrowUpRight size={16} className="text-gray-600" />
      </div>
      <p className="text-3xl font-black text-white mb-1">{value}</p>
      <p className="text-gray-400 text-sm font-medium">{label}</p>
    </motion.div>
  );
}

// ── Offer Form Modal ──────────────────────────────────────────────────────────
function OfferFormModal({ products, onClose, onSave }) {
  const [form, setForm] = useState({
    offer_name: '',
    offer_type: 'product',
    discount_type: 'percentage',
    discount_value: '',
    product_id: '',
    category: 'Mobile',
    start_date: new Date().toISOString().slice(0, 16),
    end_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!form.discount_value || isNaN(Number(form.discount_value))) { setPreview(null); return; }
    const val = Number(form.discount_value);
    if (form.offer_type === 'product' && form.product_id) {
      const product = products.find(p => p.product_id === Number(form.product_id));
      if (product) {
        const base = product.original_price || product.price;
        const discounted = form.discount_type === 'percentage'
          ? Math.round(base * (1 - val / 100))
          : Math.round(base - val);
        setPreview({ base, discounted, saving: base - discounted, count: 1 });
      }
    } else if (form.offer_type === 'category' && form.category) {
      const catProducts = products.filter(p => p.category === form.category);
      setPreview({ count: catProducts.length, base: null });
    }
  }, [form.discount_value, form.discount_type, form.product_id, form.offer_type, form.category, products]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const selectedProduct = form.offer_type === 'product'
    ? products.find(p => p.product_id === Number(form.product_id))
    : null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div initial={{ scale:0.93, opacity:0, y:16 }} animate={{ scale:1, opacity:1, y:0 }}
        className="bg-[#0c0c0f] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-500/10 rounded-xl border border-orange-500/20">
              <Gift size={18} className="text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Add New Offer</h3>
              <p className="text-xs text-gray-500">Apply discounts to a product or entire category</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Offer Name</label>
            <input type="text" required placeholder="e.g. Diwali Sale, Flash Deal, Summer Offer"
              value={form.offer_name} onChange={e => setForm({...form, offer_name: e.target.value})}
              className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-600 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 focus:outline-none transition-all text-sm" />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Applies To</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 'product',  label: 'Single Product', icon: Package },
                { val: 'category', label: 'Entire Category', icon: Layers  },
              ].map(({ val, label, icon: Icon }) => (
                <button key={val} type="button"
                  onClick={() => setForm({...form, offer_type: val})}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all text-sm font-bold ${
                    form.offer_type === val
                      ? 'border-orange-500/50 bg-orange-500/10 text-white'
                      : 'border-white/10 bg-white/[0.02] text-gray-400 hover:bg-white/5'
                  }`}>
                  <Icon size={16} className={form.offer_type === val ? 'text-orange-400' : 'text-gray-500'} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {form.offer_type === 'product' ? (
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Select Product</label>
              <select required value={form.product_id}
                onChange={e => setForm({...form, product_id: e.target.value})}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-orange-500/50 focus:outline-none transition-all text-sm">
                <option value="">-- Choose a product --</option>
                {products.map(p => (
                  <option key={p.product_id} value={p.product_id} className="bg-[#0c0c0f]">
                    [{p.category}] {p.name} — ₹{Number(p.price).toLocaleString()}
                  </option>
                ))}
              </select>
              {selectedProduct && (
                <div className="flex items-center gap-3 mt-2 p-3 bg-white/5 rounded-xl border border-white/5">
                  <img src={selectedProduct.image_url} alt="" className="w-10 h-10 object-contain rounded-lg bg-white/5" />
                  <div>
                    <p className="text-sm font-bold text-white line-clamp-1">{selectedProduct.name}</p>
                    <p className="text-xs text-blue-400 font-bold">₹{Number(selectedProduct.price).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Select Category</label>
              <select required value={form.category}
                onChange={e => setForm({...form, category: e.target.value})}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-orange-500/50 focus:outline-none transition-all text-sm">
                {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0c0c0f]">{c}</option>)}
              </select>
              <p className="text-xs text-gray-500 mt-1.5 ml-1">
                This will apply the discount to all <span className="text-orange-400 font-bold">{products.filter(p=>p.category===form.category).length}</span> products in {form.category}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Discount Type</label>
              <select value={form.discount_type} onChange={e => setForm({...form, discount_type: e.target.value})}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-orange-500/50 focus:outline-none transition-all text-sm">
                <option value="percentage" className="bg-[#0c0c0f]">% Percentage</option>
                <option value="flat"       className="bg-[#0c0c0f]">₹ Flat Amount</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                {form.discount_type === 'percentage' ? 'Discount %' : 'Flat Off (₹)'}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-gray-400 font-bold text-sm">
                  {form.discount_type === 'percentage' ? '%' : '₹'}
                </span>
                <input type="number" required min="1"
                  max={form.discount_type === 'percentage' ? 99 : undefined}
                  placeholder={form.discount_type === 'percentage' ? '10' : '500'}
                  value={form.discount_value}
                  onChange={e => setForm({...form, discount_value: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-9 pr-4 text-white placeholder-gray-600 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 focus:outline-none transition-all text-sm" />
              </div>
            </div>
          </div>

          {preview && (
            <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
              className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-2xl">
              <p className="text-xs font-black text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BadgePercent size={12} /> Offer Preview
              </p>
              {form.offer_type === 'product' && preview.base ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 line-through">₹{Number(preview.base).toLocaleString()}</p>
                    <p className="text-lg font-black text-green-400">₹{Number(preview.discounted).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Customer saves</p>
                    <p className="text-base font-black text-orange-400">₹{Number(preview.saving).toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white">
                  Applies to <span className="text-orange-400 font-black">{preview.count}</span> products in {form.category}
                </p>
              )}
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Start Date</label>
              <input type="datetime-local" value={form.start_date}
                onChange={e => setForm({...form, start_date: e.target.value})}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-orange-500/50 focus:outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">End Date <span className="text-gray-600 normal-case font-normal">(optional)</span></label>
              <input type="datetime-local" value={form.end_date}
                onChange={e => setForm({...form, end_date: e.target.value})}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-orange-500/50 focus:outline-none transition-all text-sm" />
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
            <AlertCircle size={13} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-300/80">
              Creating this offer will <strong>immediately update product prices</strong> in the store. Deactivating or deleting will restore original prices.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all font-bold text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-500 hover:to-rose-500 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-orange-500/20">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}
              {saving ? 'Applying Offer…' : 'Create Offer'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Offers Tab ─────────────────────────────────────────────────────────────────
function OffersTab({ token, products }) {
  const [offers, setOffers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch]   = useState('');
  const ax = () => adminAxios(token);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await ax().get(`${API}/offers`);
      setOffers(data);
    } catch { toast.error('Failed to load offers'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchOffers(); }, [token]);

  const createOffer = async (form) => {
    try {
      await ax().post(`${API}/offers`, {
        ...form,
        discount_value: Number(form.discount_value),
        product_id:     form.offer_type === 'product' ? Number(form.product_id) : null,
        category:       form.offer_type === 'category' ? form.category : null,
        end_date:       form.end_date || null,
      });
      toast.success('Offer created and prices updated!');
      setShowModal(false);
      fetchOffers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create offer');
    }
  };

  const toggleOffer = async (offerId) => {
    try {
      const { data } = await ax().put(`${API}/offers/${offerId}/toggle`);
      toast.success(data.message);
      fetchOffers();
    } catch { toast.error('Failed to toggle offer'); }
  };

  const deleteOffer = async (offerId) => {
    if (!confirm('Delete this offer? Original prices will be restored.')) return;
    try {
      await ax().delete(`${API}/offers/${offerId}`);
      toast.success('Offer deleted and prices restored!');
      fetchOffers();
    } catch { toast.error('Failed to delete offer'); }
  };

  const filtered = offers.filter(o =>
    o.offer_name.toLowerCase().includes(search.toLowerCase()) ||
    (o.product_name||'').toLowerCase().includes(search.toLowerCase()) ||
    (o.category||'').toLowerCase().includes(search.toLowerCase())
  );

  const activeCount   = offers.filter(o => o.is_active).length;
  const inactiveCount = offers.filter(o => !o.is_active).length;

  const isExpired = (offer) => offer.end_date && new Date(offer.end_date) < new Date();

  return (
    <motion.div key="offers" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Offers',    value: offers.length,  color: 'text-white',        bg: 'bg-white/5 border-white/10'             },
          { label: 'Active Offers',   value: activeCount,    color: 'text-green-400',    bg: 'bg-green-500/10 border-green-500/20'    },
          { label: 'Inactive',        value: inactiveCount,  color: 'text-gray-400',     bg: 'bg-white/[0.02] border-white/10'        },
        ].map(c => (
          <div key={c.label} className={`${c.bg} border rounded-2xl p-4 flex items-center justify-between`}>
            <p className="text-sm font-bold text-gray-400">{c.label}</p>
            <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex-1 max-w-xs">
          <Search size={14} className="text-gray-400" />
          <input type="text" placeholder="Search offers…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent outline-none text-sm text-white placeholder-gray-600 w-full" />
        </div>
        <button onClick={fetchOffers}
          className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all">
          <RefreshCw size={15} />
        </button>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-500 hover:to-rose-500 rounded-xl text-white font-bold text-sm transition-all shadow-lg shadow-orange-500/20">
          <Plus size={16} /> Add Offer
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-orange-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white/[0.01] border border-white/5 rounded-2xl text-gray-500">
          <Gift size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-bold text-gray-400">No offers yet</p>
          <p className="text-xs mt-1">Click "Add Offer" to create your first discount</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((offer, i) => {
            const expired = isExpired(offer);
            return (
              <motion.div key={offer.offer_id}
                initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.04 }}
                className={`border rounded-2xl p-5 transition-all ${
                  expired             ? 'bg-gray-900/30 border-white/5 opacity-60' :
                  offer.is_active     ? 'bg-green-500/[0.03] border-green-500/20'  :
                                        'bg-white/[0.02] border-white/10'
                }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={`p-3 rounded-xl flex-shrink-0 ${
                      offer.is_active && !expired ? 'bg-orange-500/15 border border-orange-500/20' : 'bg-white/5 border border-white/10'
                    }`}>
                      <Gift size={18} className={offer.is_active && !expired ? 'text-orange-400' : 'text-gray-500'} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-black text-white text-sm">{offer.offer_name}</p>
                        {expired ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-500/20 border border-gray-500/30 text-gray-400 font-bold">Expired</span>
                        ) : offer.is_active ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" /> Active
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-gray-500 font-bold">Inactive</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full border ${
                          offer.discount_type === 'percentage'
                            ? 'bg-blue-500/15 border-blue-500/20 text-blue-400'
                            : 'bg-purple-500/15 border-purple-500/20 text-purple-400'
                        }`}>
                          {offer.discount_type === 'percentage'
                            ? <><Percent size={10}/>{offer.discount_value}% OFF</>
                            : <><IndianRupee size={10}/>₹{Number(offer.discount_value).toLocaleString()} OFF</>}
                        </span>

                        {offer.offer_type === 'product' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 border border-white/5 px-2 py-1 rounded-full">
                            <Package size={10} className="text-gray-500" />
                            <span className="truncate max-w-[160px]">{offer.product_name || `Product #${offer.product_id}`}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 border border-white/5 px-2 py-1 rounded-full">
                            <Layers size={10} className="text-gray-500" />
                            {offer.category} Category
                          </span>
                        )}
                      </div>

                      {offer.offer_type === 'product' && offer.current_price && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[11px] text-gray-500">Price now:</span>
                          <span className="text-sm font-black text-green-400">₹{Number(offer.current_price).toLocaleString()}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar size={9} /> {new Date(offer.start_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                        </span>
                        {offer.end_date && (
                          <>
                            <span>→</span>
                            <span className={`flex items-center gap-1 ${expired ? 'text-red-400' : ''}`}>
                              <Timer size={9} /> {new Date(offer.end_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                              {expired && ' (expired)'}
                            </span>
                          </>
                        )}
                        {!offer.end_date && <span className="text-gray-600">No expiry</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {offer.product_image && (
                      <div className="w-10 h-10 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center flex-shrink-0">
                        <img src={offer.product_image} alt="" className="w-8 h-8 object-contain" onError={e=>e.target.style.display='none'} />
                      </div>
                    )}
                    {!expired && (
                      <button onClick={() => toggleOffer(offer.offer_id)}
                        title={offer.is_active ? 'Deactivate offer' : 'Activate offer'}
                        className={`p-2.5 rounded-xl border transition-all ${
                          offer.is_active
                            ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
                            : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10 hover:text-white'
                        }`}>
                        {offer.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                    )}
                    <button onClick={() => deleteOffer(offer.offer_id)}
                      className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-all">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {showModal && (
        <OfferFormModal products={products} onClose={() => setShowModal(false)} onSave={createOffer} />
      )}
    </motion.div>
  );
}

// ── Product Form Modal ────────────────────────────────────────────────────────
function ProductFormModal({ product, onClose, onSave }) {
  const parseSpecsToKV = (specsRaw) => {
    try {
      const obj = typeof specsRaw === 'string' ? JSON.parse(specsRaw || '{}') : (specsRaw || {});
      return Object.entries(obj).map(([k, v]) => ({ key: k, value: String(v) }));
    } catch { return []; }
  };
  const [form, setForm]         = useState(product || { name:'', brand:'', category:'Mobile', price:'', stock_quantity:'', image_url:'', description:'' });
  const [specKV, setSpecKV]     = useState(() => parseSpecsToKV(product?.specs));
  const [specMode, setSpecMode] = useState('structured');
  const [rawJson, setRawJson]   = useState(() => {
    try { return JSON.stringify(typeof product?.specs === 'string' ? JSON.parse(product.specs || '{}') : (product?.specs || {}), null, 2); }
    catch { return '{}'; }
  });
  const [jsonError, setJsonError] = useState('');
  const [saving, setSaving]       = useState(false);

  const handleCategoryChange = (cat) => {
    setForm(f => ({ ...f, category: cat }));
    const tmpl = SPEC_TEMPLATES[cat] || [];
    setSpecKV(prev => {
      const existing = Object.fromEntries(prev.map(r => [r.key, r.value]));
      return tmpl.map(([k]) => ({ key: k, value: existing[k] || '' }));
    });
  };
  const switchToJson = () => {
    const obj = Object.fromEntries(specKV.filter(r => r.key.trim()).map(r => [r.key.trim(), r.value]));
    setRawJson(JSON.stringify(obj, null, 2)); setJsonError(''); setSpecMode('json');
  };
  const switchToStructured = () => {
    try { const obj = JSON.parse(rawJson); setSpecKV(Object.entries(obj).map(([k, v]) => ({ key: k, value: String(v) }))); setJsonError(''); setSpecMode('structured'); }
    catch { setJsonError('Fix JSON errors before switching.'); }
  };
  const addSpecRow    = () => setSpecKV(prev => [...prev, { key: '', value: '' }]);
  const removeSpecRow = (i) => setSpecKV(prev => prev.filter((_, idx) => idx !== i));
  const updateSpecRow = (i, field, val) => setSpecKV(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    let specsObj = {};
    try {
      if (specMode === 'json') specsObj = JSON.parse(rawJson);
      else specsObj = Object.fromEntries(specKV.filter(r => r.key.trim() && r.value.trim()).map(r => [r.key.trim(), r.value.trim()]));
    } catch { toast.error('Invalid JSON in specs.'); setSaving(false); return; }
    await onSave({ ...form, specs: JSON.stringify(specsObj) });
    setSaving(false);
  };

  const templateFields = SPEC_TEMPLATES[form.category] || [];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }}
        className="bg-[#0c0c0f] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h3 className="text-xl font-black text-white">{product ? 'Edit Product' : 'Add New Product'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            {[{ label:'Brand', key:'brand' }, { label:'Product Name', key:'name' }].map(({ label, key }) => (
              <div key={key} className={key === 'name' ? 'col-span-2' : ''}>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">{label}</label>
                <input type="text" required value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-blue-500/50 focus:outline-none transition-all text-sm" />
              </div>
            ))}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Price (₹)</label>
              <input type="number" required value={form.price || ''} onChange={e => setForm({ ...form, price: e.target.value })}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-blue-500/50 focus:outline-none transition-all text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Stock Qty</label>
              <input type="number" required value={form.stock_quantity || ''} onChange={e => setForm({ ...form, stock_quantity: e.target.value })}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-blue-500/50 focus:outline-none transition-all text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Category</label>
            <select value={form.category} onChange={e => handleCategoryChange(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-blue-500/50 focus:outline-none transition-all text-sm">
              {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0c0c0f]">{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Image URL</label>
            <input type="text" required value={form.image_url || ''} onChange={e => setForm({ ...form, image_url: e.target.value })}
              className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-blue-500/50 focus:outline-none transition-all text-sm" />
            {form.image_url && (
              <div className="mt-2 w-16 h-16 rounded-xl overflow-hidden border border-white/10 bg-white/5">
                <img src={form.image_url} alt="preview" className="w-full h-full object-contain" onError={e=>e.target.style.display='none'} />
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Description</label>
            <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2} className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-blue-500/50 focus:outline-none transition-all text-sm resize-none" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Specifications</label>
              <button type="button" onClick={specMode === 'structured' ? switchToJson : switchToStructured}
                className="text-[11px] px-3 py-1 rounded-full border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all font-bold">
                {specMode === 'structured' ? '{ } Raw JSON' : '⊞ Structured'}
              </button>
            </div>
            {specMode === 'structured' ? (
              <div className="space-y-2 bg-black/30 border border-white/5 rounded-2xl p-4">
                {specKV.map((row, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input type="text" placeholder="key" value={row.key} onChange={e => updateSpecRow(i, 'key', e.target.value)}
                      className="w-36 bg-black/50 border border-white/10 rounded-lg py-2 px-3 text-blue-300 text-xs font-mono focus:outline-none flex-shrink-0" />
                    <input type="text" placeholder="value" value={row.value} onChange={e => updateSpecRow(i, 'value', e.target.value)}
                      className="flex-1 bg-black/50 border border-white/10 rounded-lg py-2 px-3 text-white text-xs focus:outline-none" />
                    <button type="button" onClick={() => removeSpecRow(i)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"><X size={13} /></button>
                  </div>
                ))}
                <button type="button" onClick={addSpecRow} className="mt-1 text-xs text-green-400 hover:text-green-300 font-bold flex items-center gap-1">
                  <Plus size={12} /> Add spec row
                </button>
                {templateFields.length > 0 && (
                  <div className="pt-2 border-t border-white/5">
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mb-1.5">Quick-add from {form.category} template:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {templateFields.map(([k]) => {
                        const already = specKV.some(r => r.key === k);
                        return (
                          <button key={k} type="button" disabled={already}
                            onClick={() => setSpecKV(prev => [...prev, { key: k, value: '' }])}
                            className={`text-[10px] px-2 py-1 rounded-full border font-bold transition-all ${already ? 'border-white/5 text-gray-700 cursor-not-allowed' : 'border-blue-500/20 text-blue-400 hover:bg-blue-500/10'}`}>
                            {k}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <textarea value={rawJson} onChange={e => { setRawJson(e.target.value); setJsonError(''); }}
                  rows={8} className="w-full bg-black/50 font-mono border border-white/10 rounded-xl py-3 px-4 text-white text-xs resize-y focus:outline-none" />
                {jsonError && <p className="text-xs text-red-400 mt-1">{jsonError}</p>}
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all font-bold text-sm">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50">
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
              {product ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── User Orders Panel ─────────────────────────────────────────────────────────
function UserOrdersPanel({ selectedUser, token, onClose, onStatusUpdate }) {
  const [orders, setOrders]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const ax = () => adminAxios(token);
  useEffect(() => {
    setLoading(true);
    ax().get(`${API}/users/${selectedUser.id}/orders`)
      .then(({ data }) => setOrders(data))
      .catch(() => toast.error('Failed to load user orders'))
      .finally(() => setLoading(false));
  }, [selectedUser.id, token]);
  const updateStatus = async (orderId, status) => {
    setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, status } : o));
    try {
      await ax().put(`${API}/orders/${orderId}/status`, { status });
      toast.success(`Order #${orderId} → ${status}`);
      onStatusUpdate();
    } catch {
      toast.error('Failed to update status');
      ax().get(`${API}/users/${selectedUser.id}/orders`)
        .then(({ data }) => setOrders(data)).catch(() => {});
    }
  };
  const payLabel = (pm) => pm==='cod'?'COD': pm==='upi'?'UPI': pm==='card'?'Card': pm==='wallet'?'Wallet': (pm||'COD').toUpperCase();
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div initial={{ opacity:0, scale:0.96, y:20 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.96, y:20 }}
        className="bg-[#0c0c0f] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02] flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-sm font-black text-white flex-shrink-0">
              {selectedUser.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-black text-white text-sm">{selectedUser.username}</p>
              <p className="text-xs text-gray-500">{selectedUser.email} · {orders.length} orders</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-500" /></div>
          : orders.length === 0 ? <div className="text-center py-16 text-gray-500"><ShoppingBag size={40} className="mx-auto mb-3 opacity-20" /><p className="text-sm">No orders placed.</p></div>
          : orders.map((order, i) => (
            <motion.div key={order.order_id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.04 }}
              className="border rounded-2xl overflow-hidden bg-white/[0.02] border-white/10">
              <div className="px-5 py-4 flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-black text-white text-sm">Order #{order.order_id}</p>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                    <span>{new Date(order.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
                    <span>·</span><span className="flex items-center gap-1"><CreditCard size={10} />{payLabel(order.payment_method)}</span>
                    <span>·</span><span className="font-bold text-blue-400">₹{Number(order.total_amount).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select value={order.status} onChange={e => updateStatus(order.order_id, e.target.value)}
                    disabled={order.status==='Returned'}
                    className="bg-black/60 border border-white/10 rounded-lg text-xs text-white px-3 py-2 focus:outline-none disabled:opacity-40 min-w-[145px]">
                    {ORDER_STATUSES.map(s => <option key={s} value={s} className="bg-[#0c0c0f]">{s}</option>)}
                  </select>
                  <button onClick={() => setExpandedOrder(expandedOrder===order.order_id?null:order.order_id)}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
                    <ChevronDown size={14} className={`transition-transform ${expandedOrder===order.order_id?'rotate-180':''}`} />
                  </button>
                </div>
              </div>
              <AnimatePresence>
                {expandedOrder===order.order_id && (
                  <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
                    className="overflow-hidden border-t border-white/5">
                    <div className="p-5 bg-black/20 space-y-2">
                      {order.items?.map(item => (
                        <div key={item.order_item_id} className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/5">
                          <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0"><img src={item.image_url} alt="" className="w-8 h-8 object-contain" /></div>
                          <div className="flex-1 min-w-0"><p className="text-sm font-bold text-white line-clamp-1">{item.name}</p><p className="text-xs text-gray-500">Qty: {item.quantity}</p></div>
                          <p className="font-bold text-blue-400 text-sm">₹{Number(item.price*item.quantity).toLocaleString()}</p>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 border-t border-white/5"><span className="text-xs text-gray-500 font-bold">Total</span><span className="text-sm font-black text-white">₹{Number(order.total_amount).toLocaleString()}</span></div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ── Order Row ─────────────────────────────────────────────────────────────────
function OrderRow({ order, onStatusUpdate, highlight }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const handleStatus = async (status) => { setUpdating(true); await onStatusUpdate(order.order_id, status); setUpdating(false); };
  const payLabel = order.payment_method==='cod'?'COD': order.payment_method==='upi'?'UPI': order.payment_method==='card'?'Card': order.payment_method==='wallet'?'Wallet': (order.payment_method||'COD').toUpperCase();
  return (
    <motion.div layout animate={highlight ? { scale:[1,1.01,1] } : {}} transition={{ duration:0.3 }}
      className={`border rounded-2xl overflow-hidden transition-colors ${
        order.status==='Delivered'?'bg-green-500/[0.03] border-green-500/20':
        order.status==='Cancelled'?'bg-red-500/[0.03] border-red-500/20':
        order.status==='Returned'?'bg-rose-500/[0.03] border-rose-500/20':
        highlight?'bg-blue-500/[0.04] border-blue-500/30':'bg-white/[0.02] border-white/10'
      }`}>
      <div className="flex items-start justify-between px-5 py-4 gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-black text-white text-sm">Order #{order.order_id}</span>
            <StatusBadge status={order.status} />
            <span className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-gray-500">{payLabel}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
            <span className="font-bold text-white">{order.username}</span>
            <span className="text-gray-600">·</span><span>{order.email}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
            <span>{new Date(order.created_at).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
            <span className="font-bold text-blue-400">₹{Number(order.total_amount).toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {updating && <RefreshCw size={13} className="animate-spin text-blue-400" />}
          <select value={order.status} onChange={e => handleStatus(e.target.value)} disabled={order.status==='Returned'||updating}
            className="bg-black/60 border border-white/10 rounded-lg text-xs text-white px-3 py-2 focus:outline-none disabled:opacity-40 min-w-[148px]">
            {ORDER_STATUSES.map(s => <option key={s} value={s} className="bg-[#0c0c0f]">{s}</option>)}
          </select>
          <button onClick={() => setExpanded(e => !e)} className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
            <ChevronDown size={14} className={`transition-transform ${expanded?'rotate-180':''}`} />
          </button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} className="border-t border-white/5 overflow-hidden">
            <div className="p-5 bg-black/20 space-y-2">
              {order.items?.map(item => (
                <div key={item.order_item_id} className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/5">
                  <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0"><img src={item.image_url} alt="" className="w-8 h-8 object-contain" onError={e=>e.target.style.display='none'} /></div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-bold text-white line-clamp-1">{item.name}</p><p className="text-xs text-gray-500">Qty: {item.quantity}</p></div>
                  <div className="text-right"><p className="font-bold text-blue-400 text-sm">₹{Number(item.price*item.quantity).toLocaleString()}</p></div>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-white/5"><span className="text-xs text-gray-500 font-bold">Total</span><span className="text-sm font-black text-white">₹{Number(order.total_amount).toLocaleString()}</span></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main AdminPage ────────────────────────────────────────────────────────────
export default function AdminPage({ token, onLogout }) {
  const [tab, setTab]             = useState('dashboard');
  const [stats, setStats]         = useState(null);
  const [products, setProducts]   = useState([]);
  const [orders, setOrders]       = useState([]);
  const [users, setUsers]         = useState([]);
  const [offers, setOffers]       = useState([]);
  const [search, setSearch]       = useState('');
  const [productModal, setProductModal] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [orderFilter, setOrderFilter]   = useState('all');
  const [wsStatus, setWsStatus]         = useState('connecting');
  const [highlightedOrderId, setHighlightedOrderId] = useState(null);
  const wsRef = useRef(null);

  const ax = useRef(null);
  ax.current = adminAxios(token);

  const fetchStats    = async () => { try { const { data } = await ax.current.get(`${API}/stats`);    setStats(data);    } catch(e){ toast.error('Stats failed: ' + (e?.response?.data?.error || e.message)); } };
  const fetchProducts = async () => { try { const { data } = await ax.current.get(`${API}/products`); setProducts(data); } catch(e){ toast.error('Products failed'); } };
  const fetchOffers   = async () => { try { const { data } = await ax.current.get(`${API}/offers`);   setOffers(data);   } catch(e){ console.error('offers',e.message); } };
  const fetchOrders   = async (silent=false) => { try { const { data } = await ax.current.get(`${API}/orders`); setOrders(data); } catch(e){ if(!silent) toast.error('Orders failed'); } };
  const fetchUsers    = async () => { try { const { data } = await ax.current.get(`${API}/users`);    setUsers(data);    } catch(e){ toast.error('Users failed'); } };

  useEffect(() => {
    fetchStats();
    fetchProducts();
    fetchOrders();
    fetchUsers();
    fetchOffers();
  }, [token]);

  useEffect(() => {
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
          setOrders(prev => prev.map(o => o.order_id === msg.orderId ? { ...o, status: msg.status } : o));
          setHighlightedOrderId(msg.orderId);
          setTimeout(() => setHighlightedOrderId(null), 3000);
          ax.current.get(`${API}/stats`).then(({ data }) => setStats(data)).catch(() => {});
        }
        if (msg.type === 'new_order') {
          toast(`🛒 New Order #${msg.orderId} — ₹${msg.totalAmount?.toLocaleString()}`, { duration: 6000, style: { background:'#0f172a', border:'1px solid #3b82f6', color:'#fff' } });
          ax.current.get(`${API}/orders`).then(({ data }) => setOrders(data)).catch(() => {});
          ax.current.get(`${API}/stats`).then(({ data }) => setStats(data)).catch(() => {});
        }
      } catch (_) {}
    };
    ws.onclose = () => setWsStatus('disconnected');
    ws.onerror = () => ws.close();
    return () => ws.close();
  }, [token]);

  const saveProduct = async (form) => {
    try {
      if (form.product_id) { await ax.current.put(`${API}/products/${form.product_id}`, form); toast.success('Product updated!'); }
      else                  { await ax.current.post(`${API}/products`, form);                   toast.success('Product added!');   }
      setProductModal(null); fetchProducts(); fetchStats();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save product'); }
  };
  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return;
    try { await ax.current.delete(`${API}/products/${id}`); toast.success('Product deleted'); fetchProducts(); fetchStats(); }
    catch { toast.error('Failed to delete product'); }
  };
  const restockProduct = async (id, qty) => {
    try { await ax.current.patch(`${API}/products/${id}/stock`, { stock_quantity: qty }); toast.success('Stock updated!'); fetchProducts(); fetchStats(); }
    catch { toast.error('Failed to update stock'); }
  };
  const updateOrderStatus = async (orderId, status) => {
    setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, status } : o));
    setHighlightedOrderId(orderId); setTimeout(() => setHighlightedOrderId(null), 3000);
    try {
      await ax.current.put(`${API}/orders/${orderId}/status`, { status });
      toast.success(`Order #${orderId} → ${status}`);
      ax.current.get(`${API}/stats`).then(({ data }) => setStats(data)).catch(() => {});
    } catch {
      toast.error('Failed to update status');
      ax.current.get(`${API}/orders`).then(({ data }) => setOrders(data)).catch(() => {});
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
  );
  const searchedOrders = orders.filter(o =>
    String(o.order_id).includes(search) || o.username?.toLowerCase().includes(search.toLowerCase()) || o.email?.toLowerCase().includes(search.toLowerCase())
  );
  const ongoingStatuses = ['Pending','Confirmed','Processing','Packed','Shipped','Out for Delivery'];
  const ongoingOrders   = searchedOrders.filter(o => ongoingStatuses.includes(o.status));
  const deliveredOrders = searchedOrders.filter(o => o.status==='Delivered');
  const cancelledOrders = searchedOrders.filter(o => ['Cancelled','Returned'].includes(o.status));
  const filteredUsers   = users.filter(u => u.username?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));

  // --> ADDED THE PROMO CODES TAB HERE
  const sidebarTabs = [
    { id:'dashboard', label:'Dashboard',   icon:LayoutDashboard },
    { id:'products',  label:'Products',    icon:Package         },
    { id:'orders',    label:'Orders',      icon:ShoppingBag     },
    { id:'users',     label:'Users',       icon:Users           },
    { id:'offers',    label:'Offers',      icon:Gift            },
    { id:'promos',    label:'Promo Codes', icon:Percent         }, // NEW PROMO TAB
    { id:'chat',      label:'Live Chat',   icon:MessageCircle   },
  ];

  const OrderSection = ({ title, icon:Icon, iconColor, borderColor, orders:list }) => (
    <div className="mb-8">
      <div className={`flex items-center gap-3 mb-4 p-3 rounded-2xl border ${borderColor} bg-white/[0.02]`}>
        <div className={`p-2 rounded-xl bg-white/5 ${iconColor}`}><Icon size={16} /></div>
        <h3 className="text-sm font-black text-white flex-1">{title}</h3>
        <span className={`text-xs font-black px-3 py-1 rounded-full border ${borderColor} ${iconColor}`}>{list.length}</span>
      </div>
      {list.length === 0 ? (
        <div className="text-center py-6 bg-white/[0.01] border border-white/5 rounded-2xl text-gray-600 text-sm">No orders in this section.</div>
      ) : (
        <div className="space-y-3">{list.map(o => <OrderRow key={o.order_id} order={o} onStatusUpdate={updateOrderStatus} highlight={highlightedOrderId===o.order_id} />)}</div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#030407] text-white flex">
      <Toaster position="top-right" toastOptions={{ style:{ background:'#0f0f12', color:'#fff', border:'1px solid rgba(255,255,255,0.1)' } }} />

      {/* Sidebar */}
      <aside className="w-64 min-h-screen bg-black/40 border-r border-white/5 backdrop-blur-xl flex flex-col fixed left-0 top-0 z-30">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-xl border border-blue-500/20"><Shield size={20} className="text-blue-400" /></div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-white">NEXUSTECH</h1>
              <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Admin Panel</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 mt-3 text-[10px] font-bold ${wsStatus==='connected'?'text-green-400':wsStatus==='connecting'?'text-yellow-400':'text-red-400'}`}>
            {wsStatus==='connected'?<><Wifi size={9}/> Live — instant updates</>:wsStatus==='connecting'?<><RefreshCw size={9} className="animate-spin"/> Connecting…</>:<><WifiOff size={9}/> Reconnecting…</>}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {sidebarTabs.map(({ id, label, icon:Icon }) => (
            <button key={id} onClick={() => { setTab(id); setSearch(''); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                tab===id
                  ? (id==='offers' || id==='promos') 
                      ? 'bg-orange-600/20 text-orange-400 border border-orange-500/20'
                      : 'bg-blue-600/20 text-blue-400 border border-blue-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}>
              <Icon size={18} />
              {label}
              {id==='products'&&stats&&<span className="ml-auto text-xs bg-white/5 px-2 py-0.5 rounded-full">{stats.totalProducts}</span>}
              {id==='orders'&&stats&&<span className="ml-auto text-xs bg-white/5 px-2 py-0.5 rounded-full">{stats.totalOrders}</span>}
              {id==='users'&&stats&&<span className="ml-auto text-xs bg-white/5 px-2 py-0.5 rounded-full">{stats.totalUsers}</span>}
              {id==='offers'&&offers&&<span className="ml-auto text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">{offers.length}</span>}
            </button>
          ))}
        </nav>

        {stats?.lowStock?.length > 0 && (
          <div className="mx-4 mb-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
            <div className="flex items-center gap-2 text-orange-400 text-xs font-bold mb-2"><AlertTriangle size={12} /> Low Stock</div>
            <div className="space-y-1">
              {stats.lowStock.slice(0,3).map(p => (
                <div key={p.product_id} className="text-xs text-gray-400 flex justify-between">
                  <span className="truncate max-w-[120px]">{p.name}</span>
                  <span className="text-orange-400 font-bold">{p.stock_quantity}</span>
                </div>
              ))}
              {stats.lowStock.length>3&&<p className="text-xs text-gray-600">+{stats.lowStock.length-3} more</p>}
            </div>
          </div>
        )}

        <div className="p-4 border-t border-white/5">
          <button onClick={() => { localStorage.removeItem('adminToken'); onLogout(); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-64 min-h-screen">
        <div className="sticky top-0 z-20 bg-black/60 backdrop-blur-xl border-b border-white/5 px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white capitalize">{tab === 'promos' ? 'Promo Codes' : tab}</h2>
            <p className="text-xs text-gray-500 font-mono">nexustech / admin / {tab}</p>
          </div>
          <div className="flex items-center gap-3">
            {tab!=='dashboard' && tab!=='offers' && tab!=='promos' && (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                <Search size={14} className="text-gray-400" />
                <input type="text" placeholder={`Search ${tab}…`} value={search} onChange={e=>setSearch(e.target.value)}
                  className="bg-transparent outline-none text-sm text-white placeholder-gray-600 w-48" />
                {search&&<button onClick={()=>setSearch('')} className="text-gray-600 hover:text-white text-xs">✕</button>}
              </div>
            )}
            {tab==='products'&&(
              <button onClick={() => setProductModal('new')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold text-sm transition-all">
                <Plus size={16} /> Add Product
              </button>
            )}
            <button onClick={() => { fetchStats(); fetchOrders(); fetchProducts(); fetchUsers(); fetchOffers(); }}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all" title="Refresh all">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">

            {/* Dashboard */}
            {tab==='dashboard'&&(
              <motion.div key="dashboard" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                {stats?(
                  <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                      <StatCard icon={IndianRupee} label="Total Revenue"     value={`₹${Number(stats.totalRevenue).toLocaleString()}`} color="green"  />
                      <StatCard icon={ShoppingCart} label="Total Orders"     value={stats.totalOrders}   color="blue"   />
                      <StatCard icon={UserCheck}    label="Registered Users" value={stats.totalUsers}    color="purple" />
                      <StatCard icon={Boxes}        label="Products Listed"  value={stats.totalProducts} color="orange" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
                        <h3 className="text-lg font-black text-white mb-5 flex items-center gap-2"><TrendingUp size={18} className="text-blue-400"/>Recent Orders</h3>
                        <div className="space-y-3">
                          {stats.recentOrders?.map(o=>(
                            <div key={o.order_id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                              <div><p className="text-sm font-bold text-white">#{o.order_id} — {o.username}</p><p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString()}</p></div>
                              <div className="text-right"><p className="text-sm font-bold text-blue-400">₹{Number(o.total_amount).toLocaleString()}</p><StatusBadge status={o.status}/></div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
                        <h3 className="text-lg font-black text-white mb-5 flex items-center gap-2"><AlertTriangle size={18} className="text-orange-400"/>Low Stock</h3>
                        {stats.lowStock?.length===0?(
                          <div className="text-center py-8 text-gray-500"><Check size={32} className="mx-auto mb-2 text-green-500 opacity-50"/><p className="text-sm">All products well stocked!</p></div>
                        ):(
                          <div className="space-y-3">
                            {stats.lowStock?.map(p=>(
                              <div key={p.product_id} className="flex items-center justify-between p-3 bg-orange-500/5 border border-orange-500/10 rounded-xl">
                                <div><p className="text-sm font-bold text-white">{p.name}</p><p className="text-xs text-gray-500">{p.category}</p></div>
                                <p className={`text-lg font-black ${p.stock_quantity===0?'text-red-400':'text-orange-400'}`}>{p.stock_quantity}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 lg:col-span-2">
                        <h3 className="text-lg font-black text-white mb-5">Orders by Status</h3>
                        <div className="flex flex-wrap gap-3">
                          {stats.ordersByStatus?.map(({status,count})=>(
                            <div key={status} className="flex-1 min-w-[110px] bg-white/5 rounded-xl p-4 border border-white/5 text-center">
                              <StatusBadge status={status}/><p className="text-2xl font-black text-white mt-2">{count}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 lg:col-span-2">
                        <h3 className="text-lg font-black text-white mb-5 flex items-center gap-2"><Boxes size={18} className="text-purple-400"/>Stock by Category</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead><tr className="border-b border-white/10">{['Category','Products','Total Stock','Low Stock','Out of Stock'].map(h=><th key={h} className="text-left py-2 pr-4 text-xs text-gray-500 uppercase tracking-wider font-bold">{h}</th>)}</tr></thead>
                            <tbody>
                              {stats.stockByCategory?.map(row=>(
                                <tr key={row.category} className="border-b border-white/5 hover:bg-white/[0.02]">
                                  <td className="py-3 pr-4 font-bold text-white">{row.category}</td>
                                  <td className="py-3 pr-4 text-gray-400">{row.total_products}</td>
                                  <td className="py-3 pr-4 text-green-400 font-bold">{row.total_stock}</td>
                                  <td className="py-3 pr-4"><span className={`font-bold ${Number(row.low_stock)>0?'text-orange-400':'text-gray-600'}`}>{row.low_stock}</span></td>
                                  <td className="py-3 pr-4"><span className={`font-bold ${Number(row.out_of_stock)>0?'text-red-400':'text-gray-600'}`}>{row.out_of_stock}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                ):<div className="flex items-center justify-center h-64"><RefreshCw size={24} className="animate-spin text-blue-500"/></div>}
              </motion.div>
            )}

            {/* Products */}
            {tab==='products'&&(
              <motion.div key="products" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-white/10 bg-white/[0.02]">{['Product','Category','Price','Stock','Actions'].map(h=><th key={h} className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>)}</tr></thead>
                    <tbody>
                      {filteredProducts.map((p,i)=>(
                        <motion.tr key={p.product_id} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*0.03}}
                          className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/5">
                                <img src={p.image_url} alt="" className="w-8 h-8 object-contain" onError={e=>e.target.style.display='none'}/>
                              </div>
                              <div>
                                <span className="font-bold text-white line-clamp-1 max-w-[200px] block">{p.name}</span>
                                {p.offer_label && (
                                  <span className="text-[10px] text-orange-400 font-bold flex items-center gap-1">
                                    <Tag size={9}/> {p.offer_label}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4"><span className="text-xs px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full font-bold">{p.category}</span></td>
                          <td className="px-6 py-4">
                            <div>
                              <span className="text-white font-bold">₹{Number(p.price).toLocaleString()}</span>
                              {p.original_price && (
                                <span className="text-gray-600 line-through text-xs ml-2">₹{Number(p.original_price).toLocaleString()}</span>
                              )}
                              {p.discount_percent && (
                                <span className="ml-2 text-[10px] bg-green-500/15 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded-full font-bold">{p.discount_percent}% OFF</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4"><span className={`font-black text-base ${p.stock_quantity===0?'text-red-400':p.stock_quantity<=5?'text-orange-400':p.stock_quantity<=15?'text-yellow-400':'text-green-400'}`}>{p.stock_quantity}</span></td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={()=>setProductModal(p)} className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/20 transition-colors"><Pencil size={14}/></button>
                              <button onClick={()=>deleteProduct(p.product_id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-colors"><Trash2 size={14}/></button>
                              {p.stock_quantity<=5&&<button onClick={()=>{const q=prompt(`Restock "${p.name}"\nCurrent: ${p.stock_quantity}\nNew qty:`);if(q!==null&&!isNaN(Number(q)))restockProduct(p.product_id,Number(q));}} className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg border border-orange-500/20 transition-colors text-xs font-bold">Restock</button>}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredProducts.length===0&&<div className="text-center py-12 text-gray-500">No products found.</div>}
                </div>
              </motion.div>
            )}

            {/* Orders */}
            {tab==='orders'&&(
              <motion.div key="orders" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                <div className="flex flex-wrap gap-3 mb-6">
                  {[
                    { key:'all',       label:'All Orders',    count:searchedOrders.length,  color:'text-white bg-white/10 border-white/20'             },
                    { key:'ongoing',   label:'Ongoing',       count:ongoingOrders.length,   color:'text-blue-400 bg-blue-500/10 border-blue-500/20'    },
                    { key:'delivered', label:'Delivered',     count:deliveredOrders.length, color:'text-green-400 bg-green-500/10 border-green-500/20' },
                    { key:'cancelled', label:'Cancelled',     count:cancelledOrders.length, color:'text-red-400 bg-red-500/10 border-red-500/20'       },
                  ].map(f=>(
                    <button key={f.key} onClick={()=>setOrderFilter(f.key)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold transition-all ${
                        orderFilter===f.key?f.color+' ring-2 ring-white/10':'text-gray-500 bg-white/[0.02] border-white/10 hover:bg-white/5'
                      }`}>
                      {f.label}<span className="px-1.5 py-0.5 rounded-full bg-black/30 font-black">{f.count}</span>
                    </button>
                  ))}
                </div>
                {(orderFilter==='all'||orderFilter==='ongoing')&&<OrderSection title="Ongoing Orders" icon={Truck} iconColor="text-blue-400" borderColor="border-blue-500/20" orders={ongoingOrders}/>}
                {(orderFilter==='all'||orderFilter==='delivered')&&<OrderSection title="Delivered Orders" icon={CheckCircle2} iconColor="text-green-400" borderColor="border-green-500/20" orders={deliveredOrders}/>}
                {(orderFilter==='all'||orderFilter==='cancelled')&&<OrderSection title="Cancelled / Returned" icon={XCircle} iconColor="text-red-400" borderColor="border-red-500/20" orders={cancelledOrders}/>}
                {searchedOrders.length===0&&<div className="text-center py-16 text-gray-500">No orders found.</div>}
              </motion.div>
            )}

            {/* Users */}
            {tab==='users'&&(
              <motion.div key="users" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-white/10 bg-white/[0.02]">{['User','Contact','Address','Joined','Orders','Total Spent',''].map(h=><th key={h} className="text-left px-4 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>)}</tr></thead>
                    <tbody>
                      {filteredUsers.map((u,i)=>(
                        <motion.tr key={u.id} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*0.03}}
                          className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-xs font-black text-white flex-shrink-0">{u.username?.[0]?.toUpperCase()}</div><div><p className="font-bold text-white">{u.username}</p><p className="text-xs text-gray-500">{u.email}</p></div></div></td>
                          <td className="px-4 py-4 text-xs text-gray-400">{u.phone!=='N/A'?u.phone:<span className="text-gray-600">—</span>}</td>
                          <td className="px-4 py-4">{u.address!=='N/A'?<div className="text-xs text-gray-400 max-w-[160px]"><p className="truncate">{u.address}</p><p className="text-gray-500">{u.city}{u.pincode!=='N/A'?` - ${u.pincode}`:''}</p></div>:<span className="text-gray-600 text-xs">—</span>}</td>
                          <td className="px-4 py-4 text-gray-500 text-xs whitespace-nowrap">{u.created_at?new Date(u.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'—'}</td>
                          <td className="px-4 py-4 font-bold text-white">{u.total_orders}</td>
                          <td className="px-4 py-4 font-bold text-green-400">₹{Number(u.total_spent).toLocaleString()}</td>
                          <td className="px-4 py-4">
                            <button onClick={()=>setSelectedUser(u)} disabled={Number(u.total_orders)===0}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/20 transition-colors text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap">
                              <ShoppingBag size={11}/> View Orders
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredUsers.length===0&&<div className="text-center py-12 text-gray-500">No users found.</div>}
                </div>
              </motion.div>
            )}

            {/* ── OFFERS TAB ── */}
            {tab==='offers'&&(
              <OffersTab token={token} products={products} />
            )}

            {/* ── PROMO CODES TAB ── */}
            {tab==='promos'&&(
              <motion.div key="promos" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                <AdminPromoPanel token={token} />
              </motion.div>
            )}

            {/* ── CHAT TAB ── */}
            {tab==='chat'&&(
              <AdminChatPanel token={token} />
            )}

          </AnimatePresence>
        </div>
      </main>

      {productModal&&<ProductFormModal product={productModal==='new'?null:productModal} onClose={()=>setProductModal(null)} onSave={saveProduct}/>}

      <AnimatePresence>
        {selectedUser&&<UserOrdersPanel selectedUser={selectedUser} token={token} onClose={()=>setSelectedUser(null)} onStatusUpdate={()=>{fetchOrders(true);fetchStats();}}/>}
      </AnimatePresence>
    </div>
  );
}