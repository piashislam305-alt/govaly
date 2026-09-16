import { useState } from 'react';
import { Link, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import { ShoppingBag, Truck, BadgePercent } from 'lucide-react';
import { useStore } from '../context/StoreContext.jsx';
import { Logo } from '../components/Header.jsx';
import api, { errMsg } from '../api.js';

function AuthShell({ children }) {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-side">
          <div>
            <Logo light />
            <h2 style={{ marginTop: 26 }}>Shopping?<br />Go Valy!</h2>
            <p>Join Bangladesh's favorite online fashion mall — trendy fashion, footwear & lifestyle at the best prices.</p>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12, fontSize: 13.5 }}>
            <li className="row"><ShoppingBag size={16} /> 100+ products across 18 categories</li>
            <li className="row"><Truck size={16} /> Cash on delivery, 48-hr nationwide shipping</li>
            <li className="row"><BadgePercent size={16} /> Rate & review the products you buy</li>
          </ul>
        </div>
        <div className="auth-form">{children}</div>
      </div>
    </div>
  );
}

export function Login() {
  const { login, user } = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(loc.state?.expired ? 'Session expired — please log in again.' : '');

  // already signed in → no reason to show the form (hide it, go home)
  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await login(form.email, form.password);
      nav(loc.state?.from || '/', { replace: true });
    } catch (e2) {
      setErr(errMsg(e2, 'Login failed'));
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h3>Login to Govaly</h3>
      <p className="mut">Get access to your orders, wishlist & deals.</p>
      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <div className="field"><label>Email</label>
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></div>
        <div className="field"><label>Password</label>
          <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
          <Link to="/forgot-password" className="link-brand" style={{ fontSize: 12.5, justifySelf: 'end', marginTop: 4 }}>Forgot password?</Link>
        </div>
        {err && <p style={{ color: 'var(--red)', margin: 0, fontSize: 13 }}>{err}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Logging in…' : 'Login'}</button>
      </form>
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 10, fontSize: 13 }}>
        <span className="mut">New to Govaly? <Link to="/register" className="link-brand">Create an account</Link></span>
      </div>
    </AuthShell>
  );
}

export function Register() {
  const { register, user } = useStore();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // already signed in → hide the sign-up form
  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await register(form);
      nav('/');
    } catch (e2) {
      setErr(errMsg(e2, 'Could not register'));
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h3>Create Account</h3>
      <p className="mut">Join Govaly — it takes less than a minute.</p>
      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <div className="field"><label>Full Name</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" /></div>
        <div className="field"><label>Email</label>
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></div>
        <div className="field"><label>Phone (optional)</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+8801XXXXXXXXX" /></div>
        <div className="field"><label>Password</label>
          <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" /></div>
        {err && <p style={{ color: 'var(--red)', margin: 0, fontSize: 13 }}>{err}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating…' : 'Sign Up'}</button>
      </form>
      <p style={{ marginTop: 14, fontSize: 13.5 }}>
        Already have an account? <Link to="/login" className="link-brand">Login</Link>
      </p>
    </AuthShell>
  );
}

export function ForgotPassword() {
  const { forgotPassword, user } = useStore();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (e2) {
      setErr(errMsg(e2, 'Could not send reset email'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h3>Forgot password?</h3>
      {sent ? (
        <p style={{ fontSize: 14, lineHeight: 1.6 }}>
          If an account exists for <b>{email}</b>, we've sent a password-reset link to it.
          Check your inbox (and spam folder) — the link expires in 30 minutes.
        </p>
      ) : (
        <>
          <p className="mut">Enter the email on your account — we'll send you a link to reset your password.</p>
          <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
            <div className="field"><label>Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
            {err && <p style={{ color: 'var(--red)', margin: 0, fontSize: 13 }}>{err}</p>}
            <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Sending…' : 'Send Reset Link'}</button>
          </form>
        </>
      )}
      <p style={{ marginTop: 14, fontSize: 13.5 }}>
        <Link to="/login" className="link-brand">← Back to login</Link>
      </p>
    </AuthShell>
  );
}

export function ResetPassword() {
  const { resetPassword, user } = useStore();
  const nav = useNavigate();
  const { token } = useParams();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setErr('Passwords do not match'); return; }
    setBusy(true);
    setErr('');
    try {
      await resetPassword(token, form.password);
      setDone(true);
      setTimeout(() => nav('/login'), 2200);
    } catch (e2) {
      setErr(errMsg(e2, 'This reset link is invalid or has expired'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h3>Choose a new password</h3>
      {done ? (
        <p style={{ fontSize: 14 }}>Password reset ✓ — taking you to login…</p>
      ) : (
        <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
          <div className="field"><label>New password (min 6)</label>
            <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" /></div>
          <div className="field"><label>Confirm new password</label>
            <input type="password" required minLength={6} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} placeholder="••••••••" /></div>
          {err && <p style={{ color: 'var(--red)', margin: 0, fontSize: 13 }}>{err}</p>}
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Saving…' : 'Reset Password'}</button>
        </form>
      )}
    </AuthShell>
  );
}
