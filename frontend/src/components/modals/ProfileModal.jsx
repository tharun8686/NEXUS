import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  X, User, Mail, Phone, MapPin, Building2, Hash,
  Globe, Lock, Eye, EyeOff, Save, Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';
import { COUNTRIES, getDialInfo } from '../../utils/currency';

// ── Outside component ─────────────────────────────────────────────────────────
function InputField({ icon: Icon, label, name, type = 'text', value, onChange, placeholder, readOnly = false, suffix }) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">{label}</label>
      <div className="relative group">
        <Icon className="absolute left-3.5 top-3.5 text-gray-500 group-focus-within:text-blue-400 transition-colors z-10" size={16} />
        <input
          type={type} name={name} value={value} onChange={onChange}
          placeholder={placeholder} readOnly={readOnly}
          className={`w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 ${suffix ? 'pr-10' : 'pr-4'}
            text-white placeholder-gray-600 text-sm transition-all outline-none
            ${readOnly ? 'opacity-50 cursor-not-allowed' : 'focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30'}`}
        />
        {suffix && <span className="absolute right-3.5 top-3.5 text-xs text-gray-500">{suffix}</span>}
      </div>
    </div>
  );
}

function PhoneField({ value, onChange, country }) {
  const dial = getDialInfo(country);
  const handleInput = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, dial.digits);
    onChange({ target: { name: 'phone', value: digits } });
  };
  return (
    <div>
      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Phone Number</label>
      <div className="flex rounded-xl overflow-hidden border border-white/10 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all bg-black/40">
        <div className="flex items-center gap-2 px-3 border-r border-white/10 bg-white/5 flex-shrink-0 min-w-[72px]">
          <Phone size={14} className="text-gray-500" />
          <span className="text-sm font-bold text-blue-400">{dial.code}</span>
        </div>
        <input type="tel" inputMode="numeric" name="phone" placeholder={dial.placeholder}
          value={value} onChange={handleInput} maxLength={dial.digits}
          className="flex-1 bg-transparent py-3 px-3 text-white placeholder-gray-600 outline-none text-sm" />
        <div className="flex items-center pr-3">
          <span className={`text-[10px] font-bold ${value.length === dial.digits ? 'text-green-400' : 'text-gray-600'}`}>
            {value.length}/{dial.digits}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ProfileModal({ user, onClose, onUpdate, defaultTab = 'info' }) {
  const [tab, setTab]         = useState(defaultTab);
  const [saving, setSaving]   = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', msg }

  const [form, setForm] = useState({
    username: user.username || '',
    email:    user.email    || '',
    phone:    (user.phone   || '').replace(/^\+\d+/, ''), // strip dial code
    address:  user.address  || '',
    city:     user.city     || '',
    pincode:  user.pincode  || '',
    country:  user.country  || 'India',
  });

  const [pwForm, setPwForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  });
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false });

  useEffect(() => { setTab(defaultTab); }, [defaultTab]);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const handlePwChange = (e) => setPwForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const saveProfile = async () => {
    setSaving(true); setFeedback(null);
    try {
      const token = localStorage.getItem('token');
      const dial  = getDialInfo(form.country);
      const payload = { ...form, phone: form.phone ? `${dial.code}${form.phone}` : '' };
      const { data } = await axios.put('http://localhost:3000/api/profile', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update localStorage and parent state
      const updated = { ...user, ...form, phone: payload.phone };
      localStorage.setItem('user', JSON.stringify(updated));
      onUpdate(updated);
      setFeedback({ type: 'success', msg: 'Profile updated successfully!' });
    } catch (err) {
      setFeedback({ type: 'error', msg: err.response?.data?.error || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setFeedback({ type: 'error', msg: 'New passwords do not match.' }); return;
    }
    if (pwForm.newPassword.length < 6) {
      setFeedback({ type: 'error', msg: 'Password must be at least 6 characters.' }); return;
    }
    setSaving(true); setFeedback(null);
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:3000/api/profile/password',
        { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFeedback({ type: 'success', msg: 'Password changed successfully!' });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setFeedback({ type: 'error', msg: err.response?.data?.error || 'Failed to change password.' });
    } finally {
      setSaving(false);
    }
  };

  const PasswordField = ({ label, name, stateKey }) => (
    <div>
      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">{label}</label>
      <div className="relative group">
        <Lock className="absolute left-3.5 top-3.5 text-gray-500 group-focus-within:text-purple-400 z-10" size={16} />
        <input
          type={showPw[stateKey] ? 'text' : 'password'} name={name}
          value={pwForm[name]} onChange={handlePwChange}
          placeholder="••••••••"
          className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-10 text-white placeholder-gray-600 text-sm focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 outline-none transition-all"
        />
        <button type="button" onClick={() => setShowPw(s => ({ ...s, [stateKey]: !s[stateKey] }))}
          className="absolute right-3.5 top-3.5 text-gray-500 hover:text-white transition-colors">
          {showPw[stateKey] ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{   opacity: 0, scale: 0.94, y: 16  }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="bg-[#0a0a0d] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-black text-white text-sm">
              {user.username?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-black text-white">{user.username}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          {[{ id: 'info', label: 'Profile Info' }, { id: 'password', label: 'Password' }].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setFeedback(null); }}
              className={`flex-1 py-3 text-sm font-bold transition-all relative ${
                tab === t.id ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}>
              {t.label}
              {tab === t.id && (
                <motion.div layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-500" />
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[65vh]">

          {/* Feedback */}
          <AnimatePresence mode="wait">
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`flex items-center gap-2 text-sm p-3 rounded-xl border mb-4 ${
                  feedback.type === 'success'
                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                {feedback.type === 'success'
                  ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                {feedback.msg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Profile Info tab ── */}
          {tab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InputField icon={User}  label="Full Name" name="username" value={form.username} onChange={handleChange} placeholder="Your name" />
                <InputField icon={Mail}  label="Email"     name="email"    value={form.email}    onChange={handleChange} placeholder="email@example.com" />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Country</label>
                <div className="relative group">
                  <Globe className="absolute left-3.5 top-3.5 text-gray-500 group-focus-within:text-blue-400 z-10" size={16} />
                  <select name="country" value={form.country} onChange={handleChange}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-blue-500/50 focus:outline-none transition-all appearance-none">
                    {COUNTRIES.map(c => <option key={c} value={c} className="bg-[#0a0a0d]">{c}</option>)}
                  </select>
                </div>
              </div>

              <PhoneField value={form.phone} onChange={handleChange} country={form.country} />

              <div className="pt-1 border-t border-white/5">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Delivery Address</p>
                <div className="space-y-3">
                  <InputField icon={MapPin}   label="Street Address" name="address" value={form.address} onChange={handleChange} placeholder="123 Main Street" />
                  <div className="grid grid-cols-2 gap-3">
                    <InputField icon={Building2} label="City"    name="city"    value={form.city}    onChange={handleChange} placeholder="City" />
                    <InputField icon={Hash}      label="Pincode" name="pincode" value={form.pincode} onChange={handleChange} placeholder="Pincode" />
                  </div>
                </div>
              </div>

              <button onClick={saveProfile} disabled={saving}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 mt-2">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* ── Password tab ── */}
          {tab === 'password' && (
            <div className="space-y-4">
              <PasswordField label="Current Password"  name="currentPassword" stateKey="current" />
              <PasswordField label="New Password"      name="newPassword"     stateKey="newPw"   />
              <PasswordField label="Confirm Password"  name="confirmPassword" stateKey="confirm" />

              {pwForm.newPassword && (
                <div className="space-y-1">
                  {[
                    { label: 'At least 6 characters', ok: pwForm.newPassword.length >= 6 },
                    { label: 'Passwords match',        ok: pwForm.newPassword === pwForm.confirmPassword && pwForm.confirmPassword.length > 0 },
                  ].map(r => (
                    <div key={r.label} className={`flex items-center gap-2 text-xs ${r.ok ? 'text-green-400' : 'text-gray-500'}`}>
                      <CheckCircle2 size={11} className={r.ok ? 'text-green-400' : 'text-gray-600'} />
                      {r.label}
                    </div>
                  ))}
                </div>
              )}

              <button onClick={savePassword} disabled={saving || !pwForm.currentPassword || !pwForm.newPassword}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/20 mt-2">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
                {saving ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
