// src/pages/HomePage.jsx
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRightLeft, Sparkles, ChevronDown, ArrowRight, Layers,
  Home, ChevronLeft, SlidersHorizontal, X
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

import Navbar                 from '../components/Navbar';
import ProductCard            from '../components/ProductCard';
import ProductModal           from '../components/modals/ProductModal';
import ProfileModal           from '../components/modals/ProfileModal';
import OrdersModal            from '../components/modals/OrdersModal';
import LoyaltyModal           from '../components/modals/LoyaltyModal';
import CartDrawer             from '../components/drawers/CartDrawer';
import WishlistDrawer         from '../components/drawers/WishlistDrawer';
import CompareDrawer          from '../components/drawers/CompareDrawer';
import WishlistButton         from '../components/WishlistButton';
import ShareButton            from '../components/ShareButton';
import RecommendationsSection from '../components/RecommendationsSection';
import RecentlyViewed, { recordView } from '../components/RecentlyViewed';
import LiveChat               from '../components/LiveChat';
import { preloadSentiment }   from '../components/SentimentBadge';
import useShareLink           from '../utils/useShareLink';
import api                    from '../utils/api';

const ALL_CATEGORIES = ['All','Mobile','Laptop','Audio','Gaming','Camera','Wearable','Accessories','Tablet'];
const PAGE_SIZE      = 40;

const categoryTeasers = [
  { name: 'Mobile',      title: 'Pocket-Sized Powerhouses',  desc: 'Experience the absolute edge of mobile technology. Stunning adaptive displays, pro-grade optics, and lightning-fast neural processors.',              image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=1000&auto=format&fit=crop' },
  { name: 'Laptop',      title: 'Uncompromising Mobility',    desc: 'Desktop-class performance, liberated. From ultra-lightweight ultrabooks to massive portable rendering stations.',                                   image: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=1000&auto=format&fit=crop' },
  { name: 'Audio',       title: 'Immersive Soundscapes',      desc: 'Hear every subtle footstep, every crushing bass drop. High-fidelity acoustic equipment engineered for hardcore audiophiles.',                       image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=1000&auto=format&fit=crop' },
  { name: 'Gaming',      title: 'Dominate the Grid',          desc: 'Next-generation consoles, hyper-responsive monitors, and tactile mechanical peripherals engineered for pure competitive advantage.',                image: 'https://images.unsplash.com/photo-1616588589676-62b3bd4ff6d2?q=80&w=1000&auto=format&fit=crop' },
  { name: 'Camera',      title: 'Capture Pure Reality',       desc: 'Professional mirrorless bodies and cinematic glass designed to document your world in breathtaking, uncompromised resolution.',                     image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1000&auto=format&fit=crop' },
  { name: 'Wearable',    title: 'Tech That Moves With You',   desc: 'Smart watches, fitness trackers, and AR glasses that seamlessly blend into your life.',                                                            image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000&auto=format&fit=crop' },
  { name: 'Accessories', title: 'Complete Your Setup',        desc: 'Precision peripherals, cables, hubs, and carry solutions engineered for the discerning enthusiast.',                                               image: 'https://images.unsplash.com/photo-1625772452859-1c03d884dcd7?q=80&w=1000&auto=format&fit=crop' },
  { name: 'Tablet',      title: 'The Versatile Canvas',       desc: 'The perfect bridge between phone and laptop — a powerful slate that adapts to every task.',                                                        image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=1000&auto=format&fit=crop' },
];

const SORT_OPTIONS = [
  { value: 'default',    label: 'Default'           },
  { value: 'price_asc',  label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'stock_asc',  label: 'Stock: Low → High' },
  { value: 'name_asc',   label: 'Name A → Z'        },
];

function applyFilters(all, category, query) {
  let r = all;
  if (category !== 'All' && category !== 'Home')
    r = r.filter(p => p.category?.toLowerCase() === category.toLowerCase());
  if (query?.trim()) {
    const q = query.trim().toLowerCase();
    r = r.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q)
    );
  }
  return r;
}

function sortProducts(products, key) {
  const arr = [...products];
  switch (key) {
    case 'price_asc':  return arr.sort((a, b) => a.price - b.price);
    case 'price_desc': return arr.sort((a, b) => b.price - a.price);
    case 'stock_asc':  return arr.sort((a, b) => a.stock_quantity - b.stock_quantity);
    case 'name_asc':   return arr.sort((a, b) => a.name.localeCompare(b.name));
    default:           return arr;
  }
}

export default function HomePage({ user, setUser, cart: cartProp, setCart: setCartProp }) {
  const country = user?.country || 'India';

  const [isCartOpen,   setIsCartOpen]   = useState(false);
  const [ordersOpen,   setOrdersOpen]   = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [loyaltyOpen,  setLoyaltyOpen]  = useState(false);
  const [products,     setProducts]     = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [activeCat,    setActiveCat]    = useState('Home');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [sortKey,      setSortKey]      = useState('default');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [page,         setPage]         = useState(1);
  const [profileTab,   setProfileTab]   = useState(null);

  const [wishlistIds, setWishlistIds] = useState([]);
  const fetchWishlistIds = useCallback(async () => {
    try { const { data } = await api.get('/api/wishlist/ids'); setWishlistIds(data); } catch (_) {}
  }, []);
  useEffect(() => { fetchWishlistIds(); }, [fetchWishlistIds]);
  const handleWishlistToggle = useCallback((productId, added) => {
    setWishlistIds(prev => added ? [...prev, productId] : prev.filter(id => id !== productId));
  }, []);

  const [alertIds, setAlertIds] = useState([]);
  const fetchAlertIds = useCallback(async () => {
    try { const { data } = await api.get('/api/stock-alerts/ids'); setAlertIds(data); } catch (_) {}
  }, []);
  useEffect(() => { fetchAlertIds(); }, [fetchAlertIds]);
  const handleAlertToggle = useCallback((productId, added) => {
    setAlertIds(prev => added ? [...prev, productId] : prev.filter(id => id !== productId));
  }, []);

  const [_localCart, _setLocalCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cart')) || []; } catch { return []; }
  });
  const cart    = cartProp    ?? _localCart;
  const setCart = setCartProp ?? _setLocalCart;

  const [compareList, setCompareList] = useState(() => {
    try { return JSON.parse(localStorage.getItem('compareList')) || []; } catch { return []; }
  });

  const activeCatRef = useRef(activeCat);
  const searchRef    = useRef(searchQuery);
  const productsRef  = useRef(products);
  const sortKeyRef   = useRef(sortKey);

  useEffect(() => { activeCatRef.current = activeCat;   }, [activeCat]);
  useEffect(() => { searchRef.current    = searchQuery; }, [searchQuery]);
  useEffect(() => { productsRef.current  = products;    }, [products]);
  useEffect(() => { sortKeyRef.current   = sortKey;     }, [sortKey]);
  useEffect(() => { localStorage.setItem('cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('compareList', JSON.stringify(compareList)); }, [compareList]);

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await api.get('/api/products');
      setProducts(data);
      productsRef.current = data;
      setFilteredDocs(sortProducts(applyFilters(data, activeCatRef.current, searchRef.current), sortKeyRef.current));
      const withReviews = data.filter(p => Number(p.total_reviews) > 0).slice(0, 20);
      if (withReviews.length) preloadSentiment(withReviews.map(p => p.product_id));
    } catch (err) {
      console.error('Error fetching products:', err);
      toast.error('Failed to load products');
    }
  }, []);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const sharedProductId = useShareLink();
  useEffect(() => {
    if (!sharedProductId || !products.length) return;
    const found = products.find(p => p.product_id === sharedProductId);
    if (found) { setSelectedProduct(found); handleCatChange('All'); window.history.replaceState({}, '', '/'); }
  }, [sharedProductId, products]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyAndSet = useCallback((cat, query, sort, all, currentCart) => {
    const adjusted = all.map(p => {
      const inCart = currentCart.find(i => i.product_id === p.product_id)?.quantity || 0;
      return { ...p, stock_quantity: Math.max(0, p.stock_quantity - inCart) };
    });
    setFilteredDocs(sortProducts(applyFilters(adjusted, cat, query), sort));
  }, []);

  const handleCatChange = useCallback((cat) => {
    setActiveCat(cat); activeCatRef.current = cat; setPage(1);
    if (cat === 'Home') {
      setSearchQuery(''); searchRef.current = '';
      setSortKey('default'); sortKeyRef.current = 'default';
      setFilteredDocs(productsRef.current);
      window.scrollTo({ top: 0, behavior: 'smooth' }); return;
    }
    applyAndSet(cat, searchRef.current, sortKeyRef.current, productsRef.current, cart);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [applyAndSet]);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query); searchRef.current = query; setPage(1);
    const cat = activeCatRef.current;
    if (cat === 'Home') { setActiveCat('All'); activeCatRef.current = 'All'; }
    applyAndSet(activeCatRef.current, query, sortKeyRef.current, productsRef.current, cart);
  }, [applyAndSet]);

  const handleSmartResults = useCallback((smartProducts, displayQuery) => {
    if (!smartProducts) { handleCatChange('Home'); return; }
    setActiveCat('All'); activeCatRef.current = 'All';
    setSearchQuery(displayQuery || ''); searchRef.current = displayQuery || '';
    setFilteredDocs(smartProducts); setPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [handleCatChange]);

  const handleSortChange = useCallback((sort) => {
    setSortKey(sort); sortKeyRef.current = sort;
    applyAndSet(activeCatRef.current, searchRef.current, sort, productsRef.current, cart);
  }, [applyAndSet]);

  const addToCart = useCallback((product, quantity) => {
    const qty      = Number(quantity);
    const live     = productsRef.current.find(p => p.product_id === product.product_id);
    const avail    = live ? live.stock_quantity : product.stock_quantity;
    const inCart   = cart.find(i => i.product_id === product.product_id)?.quantity || 0;
    const remaining = avail - inCart;
    if (remaining < qty) { toast.error(`Only ${remaining} unit(s) available!`); return; }
    setCart(prev => {
      const ex = prev.find(i => i.product_id === product.product_id);
      if (ex) return prev.map(i => i.product_id === product.product_id ? { ...i, quantity: i.quantity + qty } : i);
      return [...prev, { ...product, quantity: qty }];
    });
    toast.success(`${product.name} added to cart!`, { duration: 1500 });
  }, [cart]);

  const addToCompare = useCallback((product) => {
    if (compareList.find(p => p.product_id === product.product_id)) { toast('Already in compare list.', { icon: '⚡' }); return; }
    if (compareList.length >= 2) { toast.error('You can only compare 2 items at a time.'); return; }
    setCompareList(prev => [...prev, product]);
  }, [compareList]);

  const openProduct = useCallback((product) => {
    setSelectedProduct(product);
    recordView(product);
    window.dispatchEvent(new CustomEvent('nexus:recently-viewed-updated'));
  }, []);

  useEffect(() => {
    if (!products.length || activeCat === 'Home') return;
    const adjusted = products.map(p => {
      const inCart = cart.find(i => i.product_id === p.product_id)?.quantity || 0;
      return { ...p, stock_quantity: Math.max(0, p.stock_quantity - inCart) };
    });
    setFilteredDocs(sortProducts(applyFilters(adjusted, activeCat, searchQuery), sortKey));
    setSelectedProduct(prev => {
      if (!prev) return prev;
      const updated = adjusted.find(p => p.product_id === prev.product_id);
      return (updated && updated.stock_quantity !== prev.stock_quantity) ? updated : prev;
    });
  }, [products, cart]); // eslint-disable-line react-hooks/exhaustive-deps

  const pagedDocs  = useMemo(() => filteredDocs.slice(0, page * PAGE_SIZE), [filteredDocs, page]);
  const hasMore    = pagedDocs.length < filteredDocs.length;
  const isGridView = activeCat !== 'Home';

  return (
    <div className="min-h-screen relative bg-[#050505] text-white overflow-hidden selection:bg-blue-500/30">
      <Toaster position="bottom-right" toastOptions={{
        style: { background: '#0f0f12', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }
      }} />

      <Navbar
        user={user} cart={cart} setUser={setUser}
        onSearch={handleSearch} onSmartResults={handleSmartResults}
        openCart={() => setIsCartOpen(true)}
        onEditProfile={(tab) => setProfileTab(tab)}
        onOpenOrders={() => setOrdersOpen(true)}
        onOpenWishlist={() => setWishlistOpen(true)}
        wishlistCount={wishlistIds.length}
        onOpenLoyalty={() => setLoyaltyOpen(true)}
      />

      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-15%] right-[-10%] w-[50rem] h-[50rem] bg-blue-600/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[40rem] h-[40rem] bg-purple-600/5 rounded-full blur-[120px]" />
      </div>

      {!isGridView && (
        <section className="relative h-screen flex flex-col items-center justify-center text-center px-6 z-10">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: 'easeOut' }} className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-bold tracking-widest uppercase mb-4">
              <Sparkles size={14} /> Next-Gen Electronics
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none text-white">
              NEXUS<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">TECH</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              The convergence of cutting-edge hardware and radical design. Explore {products.length.toLocaleString()}+ products.
            </p>
            <button onClick={() => handleCatChange('All')}
              className="group mt-4 px-10 py-5 bg-blue-600 hover:bg-blue-500 rounded-full text-white font-bold text-lg flex items-center gap-3 mx-auto shadow-2xl shadow-blue-500/20 transition-all">
              Explore All <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
            </button>
          </motion.div>
          <motion.div animate={{ y: [0, 12, 0] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }} className="absolute bottom-12 text-gray-600">
            <ChevronDown size={32} />
          </motion.div>
        </section>
      )}

      <main className={`container mx-auto px-6 pb-24 relative z-10 min-h-[50vh] ${isGridView ? 'pt-32' : ''}`}>

        {!isGridView && (
          <div className="py-8">
            <RecommendationsSection
              user={user} addToCart={addToCart} country={country}
              wishlistIds={wishlistIds} onWishlistToggle={handleWishlistToggle}
              onViewProduct={openProduct}
            />
            <RecentlyViewed country={country} addToCart={addToCart} onViewProduct={openProduct} />
            <div className="space-y-32 mt-8">
              {categoryTeasers.map((cat, index) => {
                const isEven = index % 2 === 0;
                return (
                  <motion.div key={cat.name}
                    initial={{ opacity: 0, scale: 0.95, y: 50 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: false, amount: 0.3 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`flex flex-col md:flex-row items-center gap-12 ${isEven ? '' : 'md:flex-row-reverse'}`}
                  >
                    <div className="md:w-1/2 space-y-6 text-left">
                      <div className="flex items-center gap-2 text-blue-500 font-bold tracking-widest uppercase text-sm"><Layers size={16} /> {cat.name} Series</div>
                      <h2 className="text-5xl font-black text-white leading-tight">{cat.title}</h2>
                      <p className="text-xl text-gray-400 leading-relaxed">{cat.desc}</p>
                      <button onClick={() => handleCatChange(cat.name)}
                        className="group flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-blue-600 border border-white/10 hover:border-blue-600 rounded-full text-white font-bold transition-all mt-4">
                        Explore {cat.name} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                    <div className="md:w-1/2 w-full h-[450px] relative rounded-[2.5rem] overflow-hidden border border-white/10 group bg-[#0a0a0a] shadow-2xl">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
                      <img src={cat.image} alt={cat.title} className="w-full h-full object-cover relative z-0 opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
            <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false }}
              className="mt-40 mb-20 p-12 rounded-3xl bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/10 text-center space-y-8 backdrop-blur-lg">
              <h3 className="text-4xl md:text-5xl font-black text-white">Ready to transcend limits?</h3>
              <p className="text-xl text-gray-300 max-w-xl mx-auto">Unlock our complete inventory of {products.length.toLocaleString()}+ enthusiast-grade products.</p>
              <button onClick={() => handleCatChange('All')}
                className="group relative mx-auto px-10 py-5 bg-blue-600 hover:bg-blue-500 rounded-full text-white font-bold text-xl flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 transition-all">
                Access Complete Arsenal <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
              </button>
            </motion.div>
          </div>
        )}

        {isGridView && (
          <div>
            <div className="flex flex-col gap-4 mb-8 border-b border-white/10 pb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <button onClick={() => handleCatChange('Home')}
                  className="group flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white font-medium transition-all w-fit hover:text-blue-400">
                  <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                  <Home size={16} /><span>Back to Home</span>
                </button>
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={14} className="text-gray-500" />
                  <select value={sortKey} onChange={e => handleSortChange(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:border-blue-500/50 focus:outline-none transition-all">
                    {SORT_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-[#0a0a0a]">{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {ALL_CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => handleCatChange(cat)}
                    className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                      activeCat === cat
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
                    }`}>{cat}</button>
                ))}
              </div>
            </div>

            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="text-blue-500" size={22} />
                <h2 className="text-2xl font-black text-white">{activeCat === 'All' ? 'Complete Inventory' : `${activeCat} Collection`}</h2>
                <span className="text-gray-500 font-medium text-sm">({filteredDocs.length} items)</span>
              </div>
              {searchQuery && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm">
                  <span>"{searchQuery}"</span>
                  <button onClick={() => handleSearch('')} className="hover:text-white transition-colors"><X size={14} /></button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {pagedDocs.map((product, index) => (
                <div key={product.product_id} className="relative group">
                  <ProductCard
                    product={product} index={index} addToCart={addToCart}
                    country={country} alertIds={alertIds} onAlertToggle={handleAlertToggle}
                  />
                  <div className="absolute top-4 right-4 z-30 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-3 group-hover:translate-x-0">
                    <WishlistButton productId={product.product_id} wishlistIds={wishlistIds} onToggle={handleWishlistToggle} />
                    <ShareButton product={product} />
                    <button onClick={() => addToCompare(product)}
                      className="p-2.5 bg-black/70 rounded-full text-white hover:bg-blue-600 transition-colors border border-white/10 shadow-lg" title="Compare">
                      <ArrowRightLeft size={16} />
                    </button>
                    <button onClick={() => openProduct(product)}
                      className="px-3 py-1.5 bg-white text-black text-xs font-black rounded-full hover:bg-gray-200 shadow-lg">
                      VIEW
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-10">
                <button onClick={() => setPage(p => p + 1)}
                  className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white font-bold transition-all hover:border-blue-500/40 flex items-center gap-2 text-sm">
                  Load more <span className="text-gray-500">({filteredDocs.length - pagedDocs.length} remaining)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {isGridView && filteredDocs.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-gray-500">
            <Sparkles size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-2xl font-bold text-white mb-2">No products found.</p>
            <p className="mb-6">{searchQuery ? `No results for "${searchQuery}".` : `No products in ${activeCat} yet.`}</p>
            <div className="flex items-center justify-center gap-4">
              {searchQuery && (
                <button onClick={() => handleSearch('')}
                  className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white font-medium transition-colors flex items-center gap-2">
                  <X size={14} /> Clear Search
                </button>
              )}
              <button onClick={() => handleCatChange('All')}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-full text-white font-medium transition-colors">
                View All Products
              </button>
            </div>
          </motion.div>
        )}
      </main>

      {/* Drawers */}
      <CompareDrawer compareList={compareList} clearCompare={() => setCompareList([])}
        removeCompare={(id) => setCompareList(prev => prev.filter(p => p.product_id !== id))}
        addToCart={addToCart} country={country} />

      <CartDrawer isOpen={isCartOpen} close={() => setIsCartOpen(false)} cart={cart} setCart={setCart} country={country} />

      <WishlistDrawer isOpen={wishlistOpen} close={() => setWishlistOpen(false)}
        addToCart={addToCart} country={country} onWishlistChange={fetchWishlistIds} />

      {/* Modals */}
      {selectedProduct && (
        <ProductModal product={selectedProduct} close={() => setSelectedProduct(null)}
          addToCart={addToCart} alertIds={alertIds} onAlertToggle={handleAlertToggle} />
      )}
      {profileTab && (
        <ProfileModal user={user} defaultTab={profileTab} onClose={() => setProfileTab(null)}
          onUpdate={(updated) => { setUser(updated); localStorage.setItem('user', JSON.stringify(updated)); }} />
      )}

      <AnimatePresence>
        {ordersOpen  && <OrdersModal  user={user} onClose={() => setOrdersOpen(false)} />}
        {loyaltyOpen && <LoyaltyModal onClose={() => setLoyaltyOpen(false)} country={country} />}
      </AnimatePresence>

      <LiveChat user={user} />
    </div>
  );
}
