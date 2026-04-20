import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage    from './pages/LandingPage';
import AuthPage       from './pages/AuthPage';
import HomePage       from './pages/HomePage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminPage      from './pages/AdminPage';
import CheckoutPage   from './pages/CheckoutPage';

function App() {
  const [user, setUser]             = useState(null);
  const [adminToken, setAdminToken] = useState(null);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cart')) || []; } catch { return []; }
  });

  useEffect(() => {
    const storedUser  = localStorage.getItem('user');
    const storedAdmin = localStorage.getItem('adminToken');
    if (storedUser)  setUser(JSON.parse(storedUser));
    if (storedAdmin) setAdminToken(storedAdmin);
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => { setUser(null); setCart([]); };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing page for logged-out visitors */}
        <Route path="/" element={
          user
            ? <HomePage user={user} setUser={setUser} cart={cart} setCart={setCart} />
            : <LandingPage />
        } />

        {/* Auth — login or signup */}
        <Route path="/auth" element={
          user ? <Navigate to="/" /> : <AuthPage setUser={setUser} />
        } />

        {/* Checkout */}
        <Route path="/checkout" element={
          user
            ? <CheckoutPage user={user} setUser={setUser} cart={cart} setCart={setCart} />
            : <Navigate to="/auth?mode=login" />
        } />

        {/* Admin */}
        <Route path="/admin" element={
          adminToken
            ? <AdminPage token={adminToken} onLogout={() => { setAdminToken(null); localStorage.removeItem('adminToken'); }} />
            : <AdminLoginPage setAdminToken={setAdminToken} />
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
