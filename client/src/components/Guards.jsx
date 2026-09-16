import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from '../context/StoreContext.jsx';
import { Spinner } from './ui.jsx';

export function RequireAuth({ children }) {
  const { user, booting } = useStore();
  const loc = useLocation();
  if (booting) return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return children;
}

export function RequireAdmin({ children }) {
  const { user, booting } = useStore();
  const loc = useLocation();
  if (booting) return <Spinner />;
  if (!user || user.role !== 'admin') return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return children;
}

export function Toasts() {
  const { toasts } = useStore();
  if (!toasts.length) return null;
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>{t.message}</div>
      ))}
    </div>
  );
}
