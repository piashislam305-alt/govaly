import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import storage from '../storage.js';
import { normalizeProduct } from '../adapters.js';

const StoreContext = createContext(null);

// Cart line shape the rest of the app expects (ProductCard, Cart.jsx, etc.):
// { product, itemId, slug, name, image, seller, color, size, qty, price, stock }
function normalizeCartLine(line) {
  const p = line.product || {};
  return {
    itemId: line.itemId,
    product: p._id,
    slug: p.slug,
    name: p.name,
    image: p.images?.[0] || p.image || '',
    seller: p.seller?.shopSlug || '',
    sellerName: p.seller?.shopName || '',
    color: line.color || '',
    size: line.size || '',
    qty: line.quantity,
    price: p.sale_price ?? p.price ?? 0,
    stock: p.stock ?? 50,
  };
}

export function StoreProvider({ children }) {
  const [user, setUser] = useState(null);
  const nav = useNavigate();
  const loc = useLocation();
  const pathRef = useRef('/');
  pathRef.current = loc.pathname;
  const [booting, setBooting] = useState(true);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, kind = 'brand') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const loadCartAndWishlist = async () => {
    try {
      const [cartRes, wlRes] = await Promise.all([api.get('/customer/cart'), api.get('/customer/wishlist')]);
      setCart((cartRes.data.data || []).map(normalizeCartLine));
      setWishlist((wlRes.data.data || []).map(normalizeProduct));
    } catch { /* not logged in / request failed — leave empty */ }
  };

  // boot: restore session from the stored JWT (real backend: single 7-day
  // token, no refresh flow — see api.js)
  useEffect(() => {
    (async () => {
      if (storage.get('govaly_token')) {
        try {
          const { data } = await api.get('/customer/me');
          setUser(data.data);
          await loadCartAndWishlist();
        } catch {
          storage.remove('govaly_token');
        }
      }
      setBooting(false);
    })();
  }, []);

  // global logout broadcast (invalid/expired token mid-session)
  useEffect(() => {
    const onLogout = () => {
      setUser(null);
      setCart([]);
      setWishlist([]);
      toast('Session expired — please login again', 'err');
      if (['/checkout', '/payment', '/order-success', '/orders', '/profile', '/wishlist', '/cart'].some((x) => (pathRef.current || '').startsWith(x))) {
        nav('/login', { state: { expired: 1 } });
      }
    };
    window.addEventListener('govaly:logout', onLogout);
    return () => window.removeEventListener('govaly:logout', onLogout);
  }, [toast, nav]);

  // ---------- auth ----------
  const login = async (email, password) => {
    const { data } = await api.post('/customer/auth/login', { email, password });
    storage.set('govaly_token', data.token);
    setUser(data.data);
    await loadCartAndWishlist();
    toast(`Welcome back, ${data.data.name.split(' ')[0]}! 👋`, 'ok');
    return data.data;
  };

  const register = async (payload) => {
    await api.post('/customer/auth/register', payload);
    // Backend register doesn't log in automatically (no token returned) — chain a login.
    const registeredUser = await login(payload.email, payload.password);
    if (payload.phone) {
      // register() only accepts name/email/password — anything else (phone)
      // has to be saved as a follow-up profile update.
      try {
        const { data } = await api.patch('/customer/me', { phone: payload.phone });
        setUser(data.data);
      } catch { /* non-fatal — they can add it later from Profile */ }
    }
    return registeredUser;
  };

  const logout = () => {
    storage.remove('govaly_token');
    setUser(null);
    setCart([]);
    setWishlist([]);
    toast('Logged out. See you soon!');
  };

  const changePassword = async (currentPassword, newPassword) => {
    await api.patch('/customer/change-password', { currentPassword, newPassword });
    toast('Password changed ✓', 'ok');
  };

  const forgotPassword = async (email) => {
    await api.post('/customer/auth/forgot-password', { email });
  };

  const resetPassword = async (token, password) => {
    await api.post(`/customer/auth/reset-password/${token}`, { password });
  };

  // ---------- cart (server-backed — cart actions already require login) ----------
  const addToCart = async (product, size = null, qty = 1, silent = false, color = null) => {
    if (!user) {
      toast('Please login to add items to your cart', 'err');
      nav('/login', { state: { from: pathRef.current } });
      return;
    }
    const pick = size || product.sizes?.[0] || '';
    const col = color ?? product.colors?.[0] ?? '';
    try {
      const { data } = await api.post('/customer/cart', { productId: product._id, quantity: qty, size: pick, color: col });
      setCart((data.data || []).map(normalizeCartLine));
      if (!silent) toast('Added to cart 🛍️', 'ok');
    } catch (e) {
      toast(errMsg(e, 'Could not add to cart'), 'err');
    }
  };

  const setQty = async (productId, size, qty) => {
    const line = cart.find((x) => x.product === productId && x.size === size);
    if (!line) return;
    try {
      const { data } = await api.patch(`/customer/cart/${line.itemId}`, { quantity: qty });
      setCart((data.data || []).map(normalizeCartLine));
    } catch (e) {
      toast(errMsg(e, 'Could not update quantity'), 'err');
    }
  };

  const removeFromCart = async (productId, size) => {
    const line = cart.find((x) => x.product === productId && x.size === size);
    if (!line) return;
    try {
      const { data } = await api.delete(`/customer/cart/${line.itemId}`);
      setCart((data.data || []).map(normalizeCartLine));
      toast('Removed from cart');
    } catch (e) {
      toast(errMsg(e, 'Could not remove item'), 'err');
    }
  };

  const clearCart = () => setCart([]);

  // ---------- wishlist ----------
  const toggleWishlist = async (product) => {
    if (!user) {
      toast('Please login to save items to your wishlist', 'err');
      nav('/login', { state: { from: pathRef.current } });
      return;
    }
    const already = wishlist.some((w) => w._id === product._id);
    try {
      const { data } = already
        ? await api.delete(`/customer/wishlist/${product._id}`)
        : await api.post(`/customer/wishlist/${product._id}`);
      setWishlist((data.data || []).map(normalizeProduct));
      toast(already ? 'Removed from wishlist' : 'Saved to wishlist ❤️', already ? undefined : 'ok');
    } catch (e) {
      toast(errMsg(e, 'Could not update wishlist'), 'err');
    }
  };

  const isWishlisted = (id) => wishlist.some((w) => w._id === id);

  const counts = useMemo(
    () => ({
      cartQty: cart.reduce((s, i) => s + i.qty, 0),
      cartSubtotal: cart.reduce((s, i) => s + i.price * i.qty, 0),
    }),
    [cart]
  );

  const value = {
    user, booting, login, register, logout, updateUser: setUser,
    changePassword, forgotPassword, resetPassword,
    cart, addToCart, setQty, removeFromCart, clearCart,
    wishlist, toggleWishlist, isWishlisted,
    toasts, toast, ...counts,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext);
