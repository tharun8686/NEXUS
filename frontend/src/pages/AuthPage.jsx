import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, User, ArrowRight, Loader2, AlertCircle,
  Zap, Phone, MapPin, Building2, Hash, Globe
} from 'lucide-react';
import { COUNTRIES, getDialInfo } from '../utils/currency';

// ── Defined OUTSIDE component to prevent remount on every keystroke ──────────
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

function Field({ icon: Icon, name, type = 'text', placeholder, required = false, iconColor = 'group-focus-within:text-blue-400', value, onChange }) {
  return (
    <motion.div variants={itemVariants} className="relative group">
      <Icon className={`absolute left-4 top-3.5 text-gray-500 ${iconColor} transition-colors z-10`} size={18} />
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={onChange}
        className="w-full bg-black/50 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-600 focus:border-blue-500/50 focus:bg-black/80 focus:ring-1 focus:ring-blue-500/50 focus:outline-none transition-all text-sm"
      />
    </motion.div>
  );
}

// ── Phone input with country dial code ───────────────────────────────────────
function PhoneInput({ country, value, onChange }) {
  const dial = getDialInfo(country);

  const handleInput = (e) => {
    // Strip non-numeric chars
    const digits = e.target.value.replace(/\D/g, '').slice(0, dial.digits);
    onChange({ target: { name: 'phone', value: digits } });
  };

  return (
    <motion.div variants={itemVariants} className="relative group flex rounded-xl overflow-hidden border border-white/10 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all bg-black/50">
      {/* Dial code prefix */}
      <div className="flex items-center gap-2 px-3 border-r border-white/10 bg-white/5 flex-shrink-0 min-w-[72px]">
        <Phone size={14} className="text-gray-500 group-focus-within:text-blue-400 transition-colors flex-shrink-0" />
        <span className="text-sm font-bold text-blue-400 whitespace-nowrap">{dial.code}</span>
      </div>
      {/* Number input */}
      <input
        type="tel"
        name="phone"
        inputMode="numeric"
        placeholder={dial.placeholder}
        required
        value={value}
        onChange={handleInput}
        maxLength={dial.digits}
        className="flex-1 bg-transparent py-3.5 px-3 text-white placeholder-gray-600 outline-none text-sm"
      />
      {/* Digit counter */}
      <div className="flex items-center pr-3 flex-shrink-0">
        <span className={`text-[10px] font-bold tabular-nums ${
          value.length === dial.digits ? 'text-green-400' : 'text-gray-600'
        }`}>
          {value.length}/{dial.digits}
        </span>
      </div>
    </motion.div>
  );
}

export default function AuthPage({ setUser }) {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'signup');
  const [direction, setDirection] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    username: '', email: '', password: '',
    phone: '', address: '', city: '', pincode: '', country: 'India'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Phone validation — check digit count matches selected country
    if (!isLogin && formData.phone) {
      const dial = getDialInfo(formData.country);
      if (formData.phone.replace(/\D/g, '').length !== dial.digits) {
        setError(`Enter a valid ${dial.digits}-digit phone number for ${formData.country}.`);
        setLoading(false);
        return;
      }
    }

    try {
      const endpoint = isLogin ? '/api/login' : '/api/signup';
      const payload = isLogin
        ? formData
        : { ...formData, dialCode: getDialInfo(formData.country).code };
      const { data } = await api.post(endpoint, payload);

      if (isLogin) {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        setUser(data.user);
      } else {
        alert('Account created! Please log in.');
        toggleMode();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setDirection(isLogin ? 1 : -1);
    setIsLogin(!isLogin);
    setError('');
    setFormData({ username: '', email: '', password: '', phone: '', address: '', city: '', pincode: '', country: 'India' });
  };

  const slideVariants = {
    hidden: (dir) => ({ opacity: 0, x: dir > 0 ? 200 : -200 }),
    visible: {
      opacity: 1, x: 0,
      transition: {
        x: { type: 'spring', stiffness: 250, damping: 25 },
        opacity: { duration: 0.3 },
        staggerChildren: 0.07
      }
    },
    exit: (dir) => ({
      opacity: 0, x: dir > 0 ? -200 : 200,
      transition: {
        x: { type: 'spring', stiffness: 250, damping: 25 },
        opacity: { duration: 0.2 }
      }
    })
  };





  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center relative overflow-hidden p-6">

      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-blue-600/10 rounded-full blur-[120px] mix-blend-screen animate-blob" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-purple-600/10 rounded-full blur-[120px] mix-blend-screen animate-blob animation-delay-2000" />
      </div>

      <div className="container max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center relative z-10">

        {/* Left: Quantum Core animation */}
        <div className="hidden md:flex flex-col items-center justify-center relative h-[500px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="relative w-80 h-80 flex items-center justify-center"
          >
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
              className="absolute inset-0 border-[2px] border-dashed border-blue-500/30 rounded-full" />
            <motion.div animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
              className="absolute inset-4 border-[1px] border-purple-500/40 rounded-full" />
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="absolute inset-16 bg-gradient-to-tr from-blue-600/20 to-purple-600/20 blur-xl rounded-full"
            />
            <Zap size={64} className="text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)] z-10" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-center mt-8 space-y-3"
          >
            <h1 className="text-5xl font-black tracking-tighter text-white drop-shadow-lg">
              NEXUS<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">TECH</span>
            </h1>
            <p className="text-gray-400 font-medium tracking-wide uppercase text-sm">
              {isLogin ? 'Welcome back to the grid' : 'Join the next generation'}
            </p>
          </motion.div>
        </div>

        {/* Right: Auth form */}
        <div className="w-full max-w-md mx-auto">
          {/* Card grows for signup */}
          <div className="glass-card rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-white/[0.02] backdrop-blur-2xl relative overflow-hidden">

            {/* Top accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />

            <div className="p-8">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={isLogin ? 'login' : 'signup'}
                  custom={direction}
                  variants={slideVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="w-full"
                >
                  {/* Heading */}
                  <div className="mb-6">
                    <motion.h2 variants={itemVariants}
                      className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-1 tracking-tight"
                    >
                      {isLogin ? 'Welcome Back!' : "Create Account"}
                    </motion.h2>
                    <motion.p variants={itemVariants} className="text-gray-400 text-sm">
                      {isLogin
                        ? 'Enter your credentials to access your account.'
                        : 'Fill in your details to get started.'}
                    </motion.p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">

                    {/* ── SIGNUP ONLY FIELDS ── */}
                    {!isLogin && (
                      <>
                        <Field icon={User}     name="username" placeholder="Full Name"         required  value={formData.username} onChange={handleChange} />
                        <Field icon={Mail}     name="email"    placeholder="Email Address"     required type="email"  value={formData.email} onChange={handleChange} />
                        <Field icon={Lock}     name="password" placeholder="Password (min 6)"  required type="password" iconColor="group-focus-within:text-purple-400"  value={formData.password} onChange={handleChange} />
                        <Field icon={Phone}    name="phone"    placeholder="Phone Number (10 digits)" required  value={formData.phone} onChange={handleChange} />

                        {/* Country */}
                        <motion.div variants={itemVariants} className="relative group">
                          <Globe className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-blue-400 transition-colors z-10" size={18} />
                          <select
                            name="country"
                            value={formData.country}
                            onChange={handleChange}
                            className="w-full bg-black/50 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 focus:outline-none transition-all text-sm appearance-none"
                          >
                            {COUNTRIES.map(c => (
                              <option key={c} value={c} className="bg-[#0a0a0a]">{c}</option>
                            ))}
                          </select>
                        </motion.div>

                        {/* Divider */}
                        <motion.div variants={itemVariants} className="flex items-center gap-3 py-1">
                          <div className="flex-1 h-px bg-white/5" />
                          <span className="text-xs text-gray-600 uppercase tracking-widest">Delivery Address</span>
                          <div className="flex-1 h-px bg-white/5" />
                        </motion.div>

                        <Field icon={MapPin}   name="address"  placeholder="Street Address"    required  value={formData.address} onChange={handleChange} />
                        <div className="grid grid-cols-2 gap-3">
                          <motion.div variants={itemVariants} className="relative group">
                            <Building2 className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-blue-400 transition-colors z-10" size={18} />
                            <input
                              type="text" name="city" placeholder="City" required
                              value={formData.city} onChange={handleChange}
                              className="w-full bg-black/50 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 focus:outline-none transition-all text-sm"
                            />
                          </motion.div>
                          <motion.div variants={itemVariants} className="relative group">
                            <Hash className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-blue-400 transition-colors z-10" size={18} />
                            <input
                              type="text" name="pincode" placeholder="Pincode" required
                              value={formData.pincode} onChange={handleChange}
                              className="w-full bg-black/50 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 focus:outline-none transition-all text-sm"
                            />
                          </motion.div>
                        </div>
                      </>
                    )}

                    {/* ── LOGIN ONLY FIELDS ── */}
                    {isLogin && (
                      <>
                        <Field icon={Mail} name="email"    placeholder="Email Address" required type="email"  value={formData.email} onChange={handleChange} />
                        <Field icon={Lock} name="password" placeholder="Password"      required type="password" iconColor="group-focus-within:text-purple-400"  value={formData.password} onChange={handleChange} />
                      </>
                    )}

                    {/* Error */}
                    {error && (
                      <motion.div variants={itemVariants}
                        className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20"
                      >
                        <AlertCircle size={15} /> {error}
                      </motion.div>
                    )}

                    {/* Submit */}
                    <motion.button
                      variants={itemVariants}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={loading}
                      className="w-full relative group overflow-hidden bg-white/5 text-white font-bold py-4 rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2 mt-2"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/80 to-purple-600/80 opacity-80 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-0 -left-[100%] w-[120%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] group-hover:animate-shine" />
                      <span className="relative z-10 flex items-center gap-2">
                        {loading
                          ? <Loader2 className="animate-spin" size={18} />
                          : (isLogin ? 'Sign In' : 'Create Account')}
                        {!loading && <ArrowRight size={18} />}
                      </span>
                    </motion.button>
                  </form>

                  {/* Toggle */}
                  <motion.div variants={itemVariants} className="mt-6 text-center border-t border-white/5 pt-5">
                    <p className="text-gray-400 text-sm">
                      {isLogin ? "Don't have an account? " : 'Already have an account? '}
                      <button
                        onClick={toggleMode}
                        className="text-white font-bold hover:text-blue-400 transition-colors relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-blue-400 hover:after:w-full after:transition-all after:duration-300"
                      >
                        {isLogin ? 'Sign Up' : 'Sign In'}
                      </button>
                    </p>
                  </motion.div>

                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}