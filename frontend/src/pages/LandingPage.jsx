// src/pages/LandingPage.jsx
// Shown to logged-out visitors at /
// Has hero, featured categories, and Login/Signup CTA buttons

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Zap, ArrowRight, Smartphone, Laptop, Headphones,
  Gamepad2, Camera, Watch, Package, Tablet, ShieldCheck,
  Truck, RefreshCw, Star
} from 'lucide-react';

const CATEGORIES = [
  { name: 'Mobile',      icon: Smartphone,  color: 'from-blue-500/20 to-blue-600/5',   border: 'border-blue-500/20' },
  { name: 'Laptop',      icon: Laptop,       color: 'from-purple-500/20 to-purple-600/5', border: 'border-purple-500/20' },
  { name: 'Audio',       icon: Headphones,   color: 'from-pink-500/20 to-pink-600/5',   border: 'border-pink-500/20' },
  { name: 'Gaming',      icon: Gamepad2,     color: 'from-green-500/20 to-green-600/5', border: 'border-green-500/20' },
  { name: 'Camera',      icon: Camera,       color: 'from-yellow-500/20 to-yellow-600/5', border: 'border-yellow-500/20' },
  { name: 'Wearable',    icon: Watch,        color: 'from-cyan-500/20 to-cyan-600/5',   border: 'border-cyan-500/20' },
  { name: 'Accessories', icon: Package,      color: 'from-orange-500/20 to-orange-600/5', border: 'border-orange-500/20' },
  { name: 'Tablet',      icon: Tablet,       color: 'from-red-500/20 to-red-600/5',     border: 'border-red-500/20' },
];

const PERKS = [
  { icon: Truck,       title: 'Free Delivery',     desc: 'On all orders above ₹499' },
  { icon: ShieldCheck, title: 'Secure Payments',   desc: 'SSL encrypted checkout' },
  { icon: RefreshCw,   title: 'Easy Returns',      desc: '7-day hassle-free returns' },
  { icon: Star,        title: 'Genuine Products',  desc: '100% authentic brands' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden">

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[40rem] h-[40rem] bg-blue-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[35rem] h-[35rem] bg-purple-600/8 rounded-full blur-[100px]" />
      </div>

      {/* ── NAVBAR ──────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-black/40 border-b border-white/10 backdrop-blur-xl px-6 py-3">
        <div className="container mx-auto flex justify-between items-center">
          <div className="text-2xl font-black tracking-tighter">
            NEXUS<span className="text-blue-500">TECH</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/auth?mode=login')}
              className="px-5 py-2 border border-white/20 hover:border-white/40 rounded-full text-sm font-bold text-white transition-all hover:bg-white/5"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/auth?mode=signup')}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-full text-sm font-bold text-white transition-all shadow-lg shadow-blue-500/20"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 z-10 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="space-y-6 max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-bold tracking-widest uppercase"
          >
            <Zap size={14} /> Next-Gen Electronics Store
          </motion.div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none">
            NEXUS<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">TECH</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            200+ premium electronics. Unbeatable prices. AI-powered recommendations just for you.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => navigate('/auth?mode=signup')}
              className="group px-10 py-4 bg-blue-600 hover:bg-blue-500 rounded-full text-white font-bold text-lg flex items-center gap-3 shadow-2xl shadow-blue-500/25 transition-all"
            >
              Start Shopping <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/auth?mode=login')}
              className="px-10 py-4 border border-white/20 hover:border-white/40 rounded-full text-white font-bold text-lg hover:bg-white/5 transition-all"
            >
              Sign In
            </button>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10 text-gray-600"
        >
          <div className="w-6 h-10 border-2 border-gray-600 rounded-full flex items-start justify-center pt-2">
            <div className="w-1 h-3 bg-gray-600 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* ── CATEGORIES ──────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Shop by Category</h2>
            <p className="text-gray-400 text-lg">8 categories. 200+ products. Everything you need.</p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CATEGORIES.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <motion.button
                  key={cat.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/auth?mode=signup')}
                  className={`bg-gradient-to-br ${cat.color} border ${cat.border} rounded-2xl p-6 flex flex-col items-center gap-3 hover:border-opacity-60 transition-all group`}
                >
                  <div className={`p-3 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors`}>
                    <Icon size={24} className="text-white" />
                  </div>
                  <span className="font-bold text-white text-sm">{cat.name}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PERKS ───────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-6 border-t border-white/5">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {PERKS.map((perk, i) => {
              const Icon = perk.icon;
              return (
                <motion.div
                  key={perk.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex flex-col items-center text-center gap-3 p-5 bg-white/[0.02] border border-white/8 rounded-2xl"
                >
                  <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                    <Icon size={20} className="text-blue-400" />
                  </div>
                  <p className="font-bold text-white text-sm">{perk.title}</p>
                  <p className="text-gray-500 text-xs">{perk.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-12 rounded-3xl bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-white/10 text-center space-y-6"
          >
            <h3 className="text-4xl font-black text-white">Ready to shop smarter?</h3>
            <p className="text-gray-300 text-lg">
              Create a free account and get AI-powered product picks, loyalty rewards, and exclusive deals.
            </p>
            <button
              onClick={() => navigate('/auth?mode=signup')}
              className="group px-10 py-4 bg-blue-600 hover:bg-blue-500 rounded-full text-white font-bold text-lg flex items-center gap-3 mx-auto shadow-xl shadow-blue-500/20 transition-all"
            >
              Create Free Account <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 px-6 text-center text-gray-600 text-sm">
        © 2025 NexusTech. All rights reserved.
      </footer>
    </div>
  );
}
