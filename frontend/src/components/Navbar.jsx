// src/components/Navbar.jsx — FINAL (all batches integrated)
import { useState, useEffect, useRef } from 'react';
import { ShoppingBag, LogOut, User, ChevronDown, Settings, Package, Heart, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrency } from '../utils/currency';
import SmartSearchBar from './SmartSearchBar';

export default function Navbar({
  user, cart, setUser,
  onSearch, onSmartResults,
  openCart,
  onEditProfile, onOpenOrders,
  onOpenWishlist, wishlistCount = 0,
  onOpenLoyalty,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('cart');
    setUser(null);
  };

  const currency  = getCurrency(user?.country || 'India');
  const initials  = user?.username ? user.username.slice(0, 2).toUpperCase() : '?';
  const cartCount = cart.reduce((t, i) => t + i.quantity, 0);

  return (
    <nav className="fixed top-0 w-full z-50 glass-nav px-6 py-3">
      <div className="container mx-auto flex justify-between items-center gap-4">

        {/* Logo */}
        <div className="text-2xl font-black tracking-tighter flex-shrink-0">
          NEXUS<span className="text-blue-500">TECH</span>
        </div>

        {/* Smart Search */}
        <SmartSearchBar onSearch={onSearch} onSmartResults={onSmartResults} />

        {/* Right actions */}
        <div className="flex items-center gap-3">

          {/* Loyalty */}
          <button onClick={onOpenLoyalty} title="Loyalty Points"
            className="relative cursor-pointer group p-1.5 hover:bg-white/5 rounded-full transition-colors">
            <Star size={20} className="text-white group-hover:text-yellow-400 transition-colors" />
          </button>

          {/* Wishlist */}
          <div className="relative cursor-pointer group" onClick={onOpenWishlist}>
            <Heart size={22} className="text-white group-hover:text-pink-400 transition-colors" />
            {wishlistCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-pink-500 text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
                {wishlistCount}
              </span>
            )}
          </div>

          {/* Cart */}
          <div className="relative cursor-pointer group" onClick={openCart}>
            <ShoppingBag size={22} className="text-white group-hover:text-blue-400 transition-colors" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-500 text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
                {cartCount}
              </span>
            )}
          </div>

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(o => !o)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/40 rounded-full transition-all"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[11px] font-black text-white flex-shrink-0">
                {initials}
              </div>
              <span className="hidden md:block text-sm font-bold text-white max-w-[100px] truncate">{user?.username}</span>
              <ChevronDown size={13} className={`text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-64 bg-[#0c0c10] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                >
                  {/* User info */}
                  <div className="px-4 py-4 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-black text-white flex-shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-white text-sm truncate">{user?.username}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] text-blue-400 font-bold">{user?.country || 'India'}</span>
                          <span className="text-[10px] text-gray-600">·</span>
                          <span className="text-[10px] text-gray-500">{currency.code} {currency.symbol}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    {/* Loyalty */}
                    <button onClick={() => { setDropdownOpen(false); onOpenLoyalty?.(); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left">
                      <div className="p-1.5 bg-yellow-500/10 rounded-lg"><Star size={14} className="text-yellow-400" /></div>
                      <div><p className="font-bold">Loyalty Points</p><p className="text-xs text-gray-500">View points & tier rewards</p></div>
                    </button>

                    {/* Wishlist */}
                    <button onClick={() => { setDropdownOpen(false); onOpenWishlist?.(); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left">
                      <div className="p-1.5 bg-pink-500/10 rounded-lg"><Heart size={14} className="text-pink-400" /></div>
                      <div><p className="font-bold">Wishlist</p><p className="text-xs text-gray-500">{wishlistCount > 0 ? `${wishlistCount} saved` : 'Save items for later'}</p></div>
                    </button>

                    {/* My Orders */}
                    <button onClick={() => { setDropdownOpen(false); onOpenOrders(); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left">
                      <div className="p-1.5 bg-green-500/10 rounded-lg"><Package size={14} className="text-green-400" /></div>
                      <div><p className="font-bold">My Orders</p><p className="text-xs text-gray-500">Track & view all orders</p></div>
                    </button>

                    {/* Edit Profile */}
                    <button onClick={() => { setDropdownOpen(false); onEditProfile('info'); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left">
                      <div className="p-1.5 bg-blue-500/10 rounded-lg"><User size={14} className="text-blue-400" /></div>
                      <div><p className="font-bold">Edit Profile</p><p className="text-xs text-gray-500">Update your details</p></div>
                    </button>

                    {/* Change Password */}
                    <button onClick={() => { setDropdownOpen(false); onEditProfile('password'); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all text-left">
                      <div className="p-1.5 bg-purple-500/10 rounded-lg"><Settings size={14} className="text-purple-400" /></div>
                      <div><p className="font-bold">Change Password</p><p className="text-xs text-gray-500">Update your password</p></div>
                    </button>

                    <div className="h-px bg-white/5 my-1" />

                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all text-left">
                      <div className="p-1.5 bg-red-500/10 rounded-lg"><LogOut size={14} className="text-red-400" /></div>
                      <div><p className="font-bold">Sign Out</p><p className="text-xs text-red-400/60">See you next time</p></div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </nav>
  );
}