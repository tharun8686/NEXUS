import { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Shield, Lock, User, Loader2, AlertCircle, Terminal } from 'lucide-react';

export default function AdminLoginPage({ setAdminToken }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.post('/api/admin/login', form);
      localStorage.setItem('adminToken', data.token);
      setAdminToken(data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020409] flex items-center justify-center relative overflow-hidden">
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59,130,246,0.8) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.8) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-purple-600/10 rounded-full blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md mx-auto px-6"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-600/10 border border-blue-500/20 mb-6 relative"
          >
            <Shield size={36} className="text-blue-400" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          </motion.div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">
            NEXUS<span className="text-blue-400">ADMIN</span>
          </h1>
          <p className="text-gray-500 text-sm font-mono tracking-widest uppercase">Secure Control Panel</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent" />

          {/* Terminal-style label */}
          <div className="flex items-center gap-2 mb-6 text-gray-600 text-xs font-mono">
            <Terminal size={12} />
            <span>admin_auth_v2 &gt; awaiting credentials</span>
            <span className="w-2 h-3 bg-blue-500 animate-pulse ml-1" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative group">
              <User className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-blue-400 transition-colors z-10" size={18} />
              <input
                type="text"
                placeholder="Admin Username"
                required
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-all font-mono text-sm"
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-blue-400 transition-colors z-10" size={18} />
              <input
                type="password"
                placeholder="Admin Password"
                required
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-all font-mono text-sm"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20 font-mono"
              >
                <AlertCircle size={14} /> {error}
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full relative overflow-hidden py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-blue-500/20"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Shield size={18} />}
              {loading ? 'Authenticating...' : 'Access Admin Panel'}
            </motion.button>
          </form>

          <p className="text-center text-gray-600 text-xs font-mono mt-6">
            Unauthorized access is strictly prohibited
          </p>
        </div>

        <p className="text-center mt-6">
          <a href="/" className="text-gray-600 hover:text-blue-400 text-xs font-mono transition-colors">
            ← Back to Store
          </a>
        </p>
      </motion.div>
    </div>
  );
}
