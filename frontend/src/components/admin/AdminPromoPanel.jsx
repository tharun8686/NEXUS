// src/components/AdminPromoPanel.jsx
// Add as a tab in AdminPage: {activeTab === 'promos' && <AdminPromoPanel token={token} />}

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw, X, Percent, IndianRupee, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const API = '/api/admin';

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
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post(`${API}/promos`, {
        ...form,
        discount_value: Number(form.discount_value),
        min_order_value: Number(form.min_order_value) || 0,
        max_discount: form.max_discount ? Number(form.max_discount) : null,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        valid_until: form.valid_until || null,
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
      <input
        type={type}
        placeholder={placeholder}
        value={form[name]}
        onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
        className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-white placeholder-gray-600 text-sm focus:border-orange-500/50 focus:outline-none transition-all"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
        className="bg-[#0c0c0f] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h3 className="font-black text-white">New Promo Code</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="Code *" name="code" />
            <F label="Description" name="description" />
            <F label="Value *" name="discount_value" half />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full py-3 bg-orange-600 text-white rounded-xl">
            {saving ? 'Creating…' : 'Create Promo Code'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default function AdminPromoPanel({ token }) {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // ✅ fetchPromos (updated)
  const fetchPromos = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`${API}/promos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPromos(data);
    } catch {
      toast.error('Failed to load promo codes.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchPromos(); }, [fetchPromos]);

  // ✅ toggle (PUT instead of PATCH)
  const toggle = async (id) => {
    try {
      await api.put(`${API}/promos/${id}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPromos(prev =>
        prev.map(p =>
          p.promo_id === id ? { ...p, is_active: p.is_active ? 0 : 1 } : p
        )
      );
    } catch {
      toast.error('Toggle failed.');
    }
  };

  // ✅ remove
  const remove = async (id, code) => {
    if (!window.confirm(`Delete promo code "${code}"?`)) return;

    try {
      await api.delete(`${API}/promos/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPromos(prev => prev.filter(p => p.promo_id !== id));
      toast.success('Deleted.');
    } catch {
      toast.error('Delete failed.');
    }
  };

  return (
    <div>
      <button onClick={() => setShowCreate(true)}>New Code</button>

      {loading ? <p>Loading...</p> : (
        promos.map(promo => (
          <div key={promo.promo_id}>
            <span>{promo.code}</span>

            <button onClick={() => toggle(promo.promo_id)}>
              Toggle
            </button>

            <button onClick={() => remove(promo.promo_id, promo.code)}>
              Delete
            </button>
          </div>
        ))
      )}

      <AnimatePresence>
        {showCreate && (
          <CreateModal
            onClose={() => setShowCreate(false)}
            onCreated={() => {
              setShowCreate(false);
              fetchPromos();
            }}
            token={token}
          />
        )}
      </AnimatePresence>
    </div>
  );
}