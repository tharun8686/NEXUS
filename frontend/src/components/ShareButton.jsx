// src/components/ShareButton.jsx
// Share a product link with UTM tracking params.
// Uses native Web Share API when available (mobile), falls back to a custom share sheet.

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2, Link2, CheckCircle2, X,
  MessageCircle, Mail, Twitter
} from 'lucide-react';

function buildShareUrl(product) {
  const base   = window.location.origin;
  const params = new URLSearchParams({
    utm_source:   'nexustech',
    utm_medium:   'share',
    utm_campaign: 'product',
    utm_content:  String(product.product_id),
    ref:          'share',
  });
  // Deep-link to the product via search query — works with existing search
  return `${base}/?search=${encodeURIComponent(product.name)}&${params.toString()}`;
}

const SHARE_OPTIONS = [
  {
    id:      'copy',
    label:   'Copy Link',
    Icon:    Link2,
    color:   'text-blue-400',
    bg:      'hover:bg-blue-500/10',
    border:  'hover:border-blue-500/30',
    action:  (url) => navigator.clipboard.writeText(url),
  },
  {
    id:      'whatsapp',
    label:   'WhatsApp',
    Icon:    MessageCircle,
    color:   'text-green-400',
    bg:      'hover:bg-green-500/10',
    border:  'hover:border-green-500/30',
    action:  (url, text) => window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank'),
  },
  {
    id:      'twitter',
    label:   'Twitter / X',
    Icon:    Twitter,
    color:   'text-sky-400',
    bg:      'hover:bg-sky-500/10',
    border:  'hover:border-sky-500/30',
    action:  (url, text) => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank'),
  },
  {
    id:      'email',
    label:   'Email',
    Icon:    Mail,
    color:   'text-purple-400',
    bg:      'hover:bg-purple-500/10',
    border:  'hover:border-purple-500/30',
    action:  (url, text) => window.open(`mailto:?subject=${encodeURIComponent('Check this out on NexusTech')}&body=${encodeURIComponent(text + '\n\n' + url)}`, '_blank'),
  },
];

export default function ShareButton({ product, className = '' }) {
  const [open,   setOpen]   = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const shareUrl  = buildShareUrl(product);
  const shareText = `Check out ${product.name} on NexusTech!`;

  const handleShare = async (e) => {
    e.stopPropagation();

    // Use native share on mobile if available
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text: shareText, url: shareUrl });
      } catch (_) {}
      return;
    }

    setOpen(o => !o);
  };

  const handleOption = async (e, option) => {
    e.stopPropagation();
    await option.action(shareUrl, shareText);
    if (option.id === 'copy') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        onClick={handleShare}
        title="Share product"
        className="p-2.5 bg-black/70 hover:bg-white/10 rounded-full text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-all shadow-lg"
      >
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <motion.div key="check" initial={{ scale: 0.6 }} animate={{ scale: 1 }} exit={{ scale: 0.6 }}>
              <CheckCircle2 size={16} className="text-green-400" />
            </motion.div>
          ) : (
            <motion.div key="share" initial={{ scale: 0.6 }} animate={{ scale: 1 }} exit={{ scale: 0.6 }}>
              <Share2 size={16} />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Share sheet dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -8 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.92, y: -8  }}
            transition={{ duration: 0.15 }}
            onClick={e => e.stopPropagation()}
            className="absolute right-0 top-full mt-2 w-52 bg-[#0c0c10] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Share via</span>
              <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-white transition-colors">
                <X size={13} />
              </button>
            </div>
            <div className="p-2 space-y-0.5">
              {SHARE_OPTIONS.map(option => (
                <button
                  key={option.id}
                  onClick={e => handleOption(e, option)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent transition-all text-left ${option.bg} ${option.border}`}
                >
                  <option.Icon size={15} className={option.color} />
                  <span className="text-sm font-bold text-gray-300">{option.label}</span>
                </button>
              ))}
            </div>
            {/* URL preview */}
            <div className="px-4 py-2.5 border-t border-white/5 bg-white/[0.02]">
              <p className="text-[10px] text-gray-600 font-mono truncate">{shareUrl.split('?')[0]}…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}