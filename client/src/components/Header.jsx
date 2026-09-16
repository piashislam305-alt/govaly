import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Heart, ShoppingBag, User, Menu, X, MessageCircle,
  Headphones, Mail, Phone, ChevronDown, Bell, BadgeCheck, ShoppingCart,
  MapPin, Settings, HelpCircle, LogOut, Home as HomeIcon,
} from 'lucide-react';
import { useStore } from '../context/StoreContext.jsx';
import api from '../api.js';
import { flattenCategories } from '../adapters.js';

/*
 * Header / mobile drawer — rebuilt with Tailwind utility classes (design
 * borrowed from the reference govaly-customer project), instead of the
 * shared styles.css. This is the first component migrated; the rest of the
 * app still uses styles.css until it's migrated too — don't add rules for
 * new components to that file, use Tailwind utilities directly instead.
 */

export function Logo({ light = false, className = '' }) {
  return (
    <img
      src="/img/brand/govaly-logo.png"
      alt="Govaly"
      className={`h-8 w-auto md:h-9 ${light ? 'brightness-0 invert' : ''} ${className}`}
    />
  );
}

/* ---------------- Live search suggestions (autocomplete) ---------------- */
function SearchSuggest({ q, cats, onPick }) {
  const [products, setProducts] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const s = q.trim();
    if (!s) { setProducts([]); setOpen(false); return; }
    const t = setTimeout(() => {
      api.get('/products', { params: { search: s, limit: 5 } })
        .then(({ data }) => { setProducts(data.items || []); setOpen(true); })
        .catch(() => {});
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  const s = q.trim().toLowerCase();
  const categories = s ? cats.filter((c) => c.name.toLowerCase().includes(s)).slice(0, 5) : [];

  const has = categories.length || products.length;
  if (!open || !has) return null;
  return (
    <div
      onMouseDown={(e) => e.preventDefault()}
      className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-gray-100 bg-white py-2 text-left text-ink shadow-pop"
    >
      {categories.length > 0 && (
        <>
          <div className="px-4 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">Categories</div>
          {categories.map((c) => (
            <button key={c.slug} className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-inksoft hover:bg-primary-light hover:text-primary" onClick={() => onPick({ type: 'cat', slug: c.slug })}>
              <Search size={13} className="shrink-0 text-gray-400" />
              <span className="flex-1 truncate">{c.name}</span>
              <span className="shrink-0 text-[10px] text-gray-400">{c.isParent ? 'Category' : 'Sub-category'}</span>
            </button>
          ))}
        </>
      )}
      {products.length > 0 && (
        <>
          <div className="px-4 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">Products</div>
          {products.map((p) => (
            <button key={p.slug} className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-inksoft hover:bg-primary-light hover:text-primary" onClick={() => onPick({ type: 'prod', slug: p.slug })}>
              {p.image
                ? <img src={p.image} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
                : <span className="h-9 w-9 shrink-0 rounded-md bg-gray-100" />}
              <span className="flex-1 truncate">{p.name}</span>
              <b className="shrink-0 text-primary">৳{p.sale_price}</b>
            </button>
          ))}
        </>
      )}
      <button className="mt-1 flex w-full items-center gap-2.5 border-t border-gray-100 px-4 py-2.5 text-left text-sm font-semibold text-primary" onClick={() => onPick({ type: 'search' })}>
        <Search size={13} />
        See all results for "{q.trim()}"
      </button>
    </div>
  );
}

/* ---------------- Account dropdown ---------------- */
function AccountMenu() {
  const { user, logout } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (!user) {
    return (
      <Link to="/login" title="Account" className="flex flex-col items-center gap-1 text-white transition hover:opacity-85">
        <User size={21} />
        <span className="text-[11px] font-medium leading-none">Account</span>
      </Link>
    );
  }

  const items = [
    [ShoppingCart, 'My Orders', '/profile/orders'],
    [Heart, 'My Wishlist', '/profile/wishlist'],
    [MapPin, 'My Addresses', '/profile/addresses'],
    [User, 'Account Information', '/profile/account'],
    [Settings, 'Settings', '/profile/settings'],
    [HelpCircle, 'Govaly Helpline', '/profile/helpline'],
  ];

  return (
    <div className="relative" ref={ref}>
      <button className="flex flex-col items-center gap-1 text-white transition hover:opacity-85" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white/20 text-[11px] font-extrabold ring-1 ring-white/60">
          {user.name[0]?.toUpperCase()}
        </span>
        <span className="flex items-center gap-0.5 text-[11px] font-medium leading-none">Account <ChevronDown size={11} /></span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-gray-100 bg-white py-1.5 text-ink shadow-pop">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <div className="min-w-0">
              <b className="flex items-center gap-1 truncate text-sm">{user.name} <BadgeCheck size={14} className="shrink-0 text-sky-500" /></b>
              <span className="block truncate text-xs text-gray-400">{user.email}</span>
            </div>
            <Bell size={17} className="shrink-0 text-inksoft" />
          </div>
          {items.map(([Ic, label, to]) => (
            <button key={to} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-inksoft hover:bg-primary-light hover:text-primary" onClick={() => { setOpen(false); nav(to); }}>
              <Ic size={16} /> {label}
            </button>
          ))}
          <button
            className="flex w-full items-center gap-2.5 border-t border-gray-100 px-4 py-2.5 text-left text-sm font-semibold text-red-500 hover:bg-red-50"
            onClick={() => { setOpen(false); logout(); nav('/'); }}
          >
            <LogOut size={16} /> Log Out
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Mobile drawer ---------------- */
function MobileDrawer({ open, onClose, parents, childrenOf }) {
  const { user, logout } = useStore();
  const [acc, setAcc] = useState(null);
  const nav = useNavigate();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className="absolute bottom-0 left-0 top-0 w-[85%] max-w-sm overflow-y-auto bg-white shadow-pop">
        <div className="flex items-center justify-between bg-primary px-4 py-3.5">
          <Logo light />
          <button className="rounded-full p-1.5 text-white hover:bg-white/10" onClick={onClose} aria-label="Close menu"><X size={20} /></button>
        </div>

        <nav className="px-2 py-3">
          <Link to="/products" onClick={onClose} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-ink hover:bg-primary-light">
            <HomeIcon size={16} className="text-primary" /> For You
          </Link>

          <p className="mb-1 mt-3 px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Categories</p>
          {parents.map((p) => (
            <div key={p.slug}>
              <button
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-ink hover:bg-primary-light"
                onClick={() => setAcc(acc === p.slug ? null : p.slug)}
              >
                {p.name}
                <ChevronDown size={15} className={`text-gray-400 transition-transform ${acc === p.slug ? 'rotate-180' : ''}`} />
              </button>
              {acc === p.slug && (
                <div className="mb-1 ml-5 border-l-2 border-primary-soft pl-3">
                  <Link to={`/category/${p.slug}`} onClick={onClose} className="block rounded px-2 py-2 text-[13px] font-semibold text-primary">All {p.name}</Link>
                  {childrenOf(p.slug).map((c) => (
                    <Link key={c.slug} to={`/category/${c.slug}`} onClick={onClose} className="block truncate rounded px-2 py-2 text-[13px] text-inksoft">{c.name}</Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Contact block — real Govaly contacts */}
          <div className="mt-4 space-y-0.5 border-t border-gray-100 pt-3">
            <Link to="/profile/helpline" onClick={onClose} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-inksoft hover:bg-primary-light hover:text-primary">
              <Headphones size={16} /> Govaly Helpline
            </Link>
            <a href="mailto:support@govaly.com.bd" className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-inksoft hover:bg-primary-light hover:text-primary">
              <Mail size={16} /> support@govaly.com.bd
            </a>
            <a href="tel:+8801969901212" className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-inksoft hover:bg-primary-light hover:text-primary">
              <Phone size={16} /> 01969901212
            </a>
            <a href="https://wa.me/8801907104920" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-inksoft hover:bg-primary-light hover:text-primary">
              <MessageCircle size={16} /> 01907104920
            </a>
          </div>

          <div className="mt-2 space-y-0.5 border-t border-gray-100 pt-3 pb-4">
            {user ? (
              <>
                <Link to="/profile/orders" onClick={onClose} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-ink hover:bg-primary-light">📦 My Orders</Link>
                <Link to="/profile/account" onClick={onClose} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-ink hover:bg-primary-light">👤 My Profile</Link>
                <button
                  className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-500 hover:bg-red-50"
                  onClick={() => { logout(); onClose(); nav('/'); }}
                >
                  🚪 Log Out
                </button>
              </>
            ) : (
              <Link to="/login" onClick={onClose} className="block rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-primary-dark">Login / Sign Up</Link>
            )}
          </div>
        </nav>
      </aside>
    </div>
  );
}

export default function Header() {
  const { cartQty, wishlist } = useStore();
  const [q, setQ] = useState('');
  const [cats, setCats] = useState([]);
  const [drawer, setDrawer] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCats(flattenCategories(data.data))).catch(() => {});
  }, []);

  const submit = (e) => {
    e.preventDefault();
    nav(`/products?search=${encodeURIComponent(q.trim())}`);
  };

  const pick = useCallback((s) => {
    if (s.type === 'cat') nav(`/category/${s.slug}`);
    else if (s.type === 'prod') nav(`/product/${s.slug}`);
    else nav(`/products?search=${encodeURIComponent(q.trim())}`);
  }, [nav, q]);

  const parents = cats.filter((c) => c.isParent);
  const childrenOf = (slug) => cats.filter((c) => !c.isParent && c.parent === slug);

  return (
    <>
      <header className="sticky top-0 z-50 bg-primary">
        <div className="flex items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-5 md:py-3">
          <div className="flex items-center gap-3">
            <button className="p-1 text-white" onClick={() => setDrawer(true)} aria-label="Open menu">
              <Menu size={22} />
            </button>
            <span className="h-8 w-px bg-white/40" />
          </div>

          <Link to="/" aria-label="Govaly home" className="shrink-0">
            <Logo light />
          </Link>

          <div className="relative mx-auto hidden w-full max-w-2xl flex-1 px-6 sm:block">
            <form onSubmit={submit} autoComplete="off" className="relative flex w-full items-center">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search products..."
                aria-label="Search products"
                className="h-9 w-full rounded-full border-0 bg-primary-light pl-4 pr-24 text-[13px] text-ink outline-none placeholder:text-gray-400 md:h-10"
              />
              <button type="submit" className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 text-[13px] font-semibold text-white transition hover:bg-black md:px-5">
                <Search size={14} /> Search
              </button>
              <SearchSuggest q={q} cats={cats} onPick={pick} />
            </form>
          </div>

          <div className="ml-auto flex items-center gap-5 sm:gap-7">
            <Link to="/wishlist" title="Wishlist" className="flex flex-col items-center gap-1 text-white transition hover:opacity-85">
              <span className="relative">
                <Heart size={21} />
                {wishlist.length > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9px] font-extrabold text-primary">
                    {wishlist.length > 99 ? '99+' : wishlist.length}
                  </span>
                )}
              </span>
              <span className="text-[11px] font-medium leading-none">Wishlist</span>
            </Link>
            <Link to="/cart" title="Cart" className="flex flex-col items-center gap-1 text-white transition hover:opacity-85">
              <span className="relative">
                <ShoppingBag size={21} />
                {cartQty > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9px] font-extrabold text-primary">
                    {cartQty > 99 ? '99+' : cartQty}
                  </span>
                )}
              </span>
              <span className="text-[11px] font-medium leading-none">Cart</span>
            </Link>
            <AccountMenu />
          </div>
        </div>

        {/* mobile search */}
        <form onSubmit={submit} autoComplete="off" className="relative px-3 pb-3 sm:hidden">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products..."
            aria-label="Search products"
            className="h-9 w-full rounded-full border-0 bg-white pl-4 pr-16 text-[13px] text-ink outline-none placeholder:text-gray-400"
          />
          <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-primary" aria-label="Search"><Search size={17} /></button>
          <SearchSuggest q={q} cats={cats} onPick={pick} />
        </form>
      </header>

      <MobileDrawer open={drawer} onClose={() => setDrawer(false)} parents={parents} childrenOf={childrenOf} />
    </>
  );
}
