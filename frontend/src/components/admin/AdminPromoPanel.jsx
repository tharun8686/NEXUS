// src/components/AdminPromoPanel.jsx
// Add as a tab in AdminPage: {activeTab === 'promos' && <AdminPromoPanel token={token} />}

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw, X, Percent, IndianRupee, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const API = 'http://localhost:3000/api/admin';

function badge(promo) {
  const now = new Date();
  if (!promo.is_active) return { label: 'Inactive', cls: 'bg-gray-500/15 text-gray-400 border-gray-500/20' };
  if (promo.valid_until && new Date(promo.valid_until) < now) return { label: 'Expired', cls: 'bg-red-500/15 text-red-400 border-red-500/20' };
  if (promo.usage_limit && promo.used_count >= promo.usage_limit) return { label: 'Limit Reached', cls: 'bg-orange-500/15 text-orange-400 border-orange-500/20' };
  return { label: 'Active', cls: 'bg-green-500/15 text-green-400 border-green-500/20' };
}

function CreateModal({ onClose, onCreated, token }) {
  const [form, setForm] = useState({
    code: '', description: '', discount_type: 'percentage',
    discount_value: '', min_order_value: '', max_discount: '',
    usage_limit: '', valid_until: '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await axios.post(`${API}/promos`, {
        ...form,
        discount_value:  Number(form.discount_value),
        min_order_value: Number(form.min_order_value) || 0,
        max_discount:    form.max_discount ? Number(form.max_discount) : null,
        usage_limit:     form.usage_limit  ? Number(form.usage_limit)  : null,
        valid_until:     form.valid_until  || null,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Promo code created!');
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create promo code.');
    } finally {
      setSaving(false);
    }
  };

  const F = ({ label, name, type = 'text', placeholder, half }) => (
    <div className={half ? '' : 'col-span-2'}>
      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">{label}</label>
      <input type={type} placeholder={placeholder}
        value={form[name]} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
        className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-white placeholder-gray-600 text-sm focus:border-orange-500/50 focus:outline-none transition-all"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
        className="bg-[#0c0c0f] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-xl border border-orange-500/20"><Tag size={16} className="text-orange-400" /></div>
            <h3 className="font-black text-white">New Promo Code</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="Code *"        name="code"            placeholder="e.g. SUMMER20"  />
            <div className="col-span-2">
              <F label="Description" name="description"     placeholder="Short description" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Type</label>
              <select value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-white text-sm focus:border-orange-500/50 focus:outline-none">
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat (₹)</option>
              </select>
            </div>
            <F label="Value *"       name="discount_value"  placeholder={form.discount_type === 'percentage' ? '10 (= 10%)' : '500 (= ₹500)'} half />
            <F label="Min Order"     name="min_order_value" placeholder="0 (no minimum)"  half />
            <F label="Max Discount"  name="max_discount"    placeholder="Optional cap"     half />
            <F label="Usage Limit"   name="usage_limit"     placeholder="Blank = unlimited" half />
            <F label="Expires"       name="valid_until"     type="datetime-local"           half />
          </div>
          {error && <p className="flex items-center gap-1.5 text-xs text-red-400"><AlertCircle size={12} />{error}</p>}
          <button type="submit" disabled={saving || !form.code || !form.discount_value}
            className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
            {saving ? 'Creating…' : 'Create Promo Code'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default function AdminPromoPanel({ token }) {
  const [promos,      setPromos]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/promos`, { headers: { Authorization: `Bearer ${token}` } });
      setPromos(data);
    } catch (err) {
      toast.error('Failed to load promo codes.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id) => {
    try {
      await axios.patch(`${API}/promos/${id}/toggle`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setPromos(prev => prev.map(p => p.promo_id === id ? { ...p, is_active: p.is_active ? 0 : 1 } : p));
    } catch { toast.error('Toggle failed.'); }
  };

  const remove = async (id, code) => {
    if (!window.confirm(`Delete promo code "${code}"?`)) return;
    try {
      await axios.delete(`${API}/promos/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setPromos(prev => prev.filter(p => p.promo_id !== id));
      toast.success('Deleted.');
    } catch { toast.error('Delete failed.'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-white">Promo Codes</h2>
          <p className="text-sm text-gray-500 mt-0.5">{promos.length} codes · {promos.filter(p => p.is_active).length} active</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-orange-500/20">
          <Plus size={16} /> New Code
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {promos.map(promo => {
            const b = badge(promo);
            return (
              <motion.div key={promo.promo_id} layout
                className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/10 rounded-2xl hover:border-white/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className="font-black text-white font-mono tracking-widest text-sm">{promo.code}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${b.cls}`}>{b.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{promo.description || '—'}</p>
                  <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-400">
                    <span className="flex items-center gap-1">
                      {promo.discount_type === 'percentage' ? <Percent size={10} /> : <IndianRupee size={10} />}
                      <span className="font-bold text-white">{promo.discount_value}{promo.discount_type === 'percentage' ? '%' : ''} off</span>
                    </span>
                    {promo.min_order_value > 0 && <span>Min ₹{Number(promo.min_order_value).toLocaleString()}</span>}
                    {promo.max_discount && <span>Max ₹{Number(promo.max_discount).toLocaleString()}</span>}
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={10} className="text-blue-400" />
                      Used {promo.used_count}{promo.usage_limit ? `/${promo.usage_limit}` : ''} times
                    </span>
                    {promo.valid_until && <span>Expires {new Date(promo.valid_until).toLocaleDateString('en-IN')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggle(promo.promo_id)} title={promo.is_active ? 'Deactivate' : 'Activate'}
                    className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors">
                    {promo.is_active ? <ToggleRight size={20} className="text-green-400" /> : <ToggleLeft size={20} />}
                  </button>
                  <button onClick={() => remove(promo.promo_id, promo.code)}
                    className="p-2 hover:bg-red-500/10 rounded-xl text-gray-600 hover:text-red-400 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            );
          })}
          {promos.length === 0 && (
            <div className="text-center py-16 text-gray-600">
              <Tag size={40} className="mx-auto mb-3 opacity-20" />
              <p className="font-bold text-gray-400">No promo codes yet</p>
              <p className="text-sm mt-1">Create your first promo code above.</p>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} token={token} />}
      </AnimatePresence>
    </div>
  );
}
