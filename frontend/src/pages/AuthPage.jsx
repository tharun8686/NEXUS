import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { motion } from 'framer-motion';
import {
  Mail, Lock, User, Phone, MapPin, Building2, Hash
} from 'lucide-react';

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 }
};

// ✅ FIELD COMPONENT WITH YOUR EXACT AUTOCOMPLETE LOGIC
function Field({
  icon: Icon,
  name,
  type = 'text',
  placeholder,
  required = false,
  value,
  onChange
}) {
  return (
    <motion.div variants={itemVariants} className="relative group">
      <Icon className="absolute left-4 top-3.5 text-gray-500" size={18} />
      
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={onChange}

        // 🔥 YOUR EXACT IMPLEMENTATION
        autoComplete={
          name === "email" ? "email" :
          name === "password" ? "current-password" :
          name === "username" ? "name" :
          name === "phone" ? "tel" :
          name === "address" ? "street-address" :
          name === "city" ? "address-level2" :
          name === "pincode" ? "postal-code" :
          "off"
        }

        className="w-full bg-black/50 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-600 focus:border-blue-500/50 focus:outline-none"
      />
    </motion.div>
  );
}

export default function AuthPage({ setUser }) {

  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'signup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    city: '',
    pincode: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/login' : '/api/signup';
      const { data } = await api.post(endpoint, formData);

      if (isLogin) {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        setUser(data.user);
      } else {
        alert('Account created! Please log in.');
        setIsLogin(true);
      }

    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <form onSubmit={handleSubmit} className="space-y-4 w-80">

        {/* SIGNUP */}
        {!isLogin && (
          <>
            <Field icon={User} name="username" placeholder="Full Name" required value={formData.username} onChange={handleChange} />
            <Field icon={Mail} name="email" type="email" placeholder="Email" required value={formData.email} onChange={handleChange} />
            <Field icon={Lock} name="password" type="password" placeholder="Password" required value={formData.password} onChange={handleChange} />
            <Field icon={Phone} name="phone" placeholder="Phone" value={formData.phone} onChange={handleChange} />
            <Field icon={MapPin} name="address" placeholder="Address" value={formData.address} onChange={handleChange} />
            <Field icon={Building2} name="city" placeholder="City" value={formData.city} onChange={handleChange} />
            <Field icon={Hash} name="pincode" placeholder="Pincode" value={formData.pincode} onChange={handleChange} />
          </>
        )}

        {/* LOGIN */}
        {isLogin && (
          <>
            <Field icon={Mail} name="email" type="email" placeholder="Email" required value={formData.email} onChange={handleChange} />
            <Field icon={Lock} name="password" type="password" placeholder="Password" required value={formData.password} onChange={handleChange} />
          </>
        )}

        {error && <div className="text-red-400">{error}</div>}

        <button type="submit" className="bg-blue-500 w-full py-2 rounded">
          {loading ? 'Loading...' : isLogin ? 'Login' : 'Signup'}
        </button>

      </form>
    </div>
  );
}