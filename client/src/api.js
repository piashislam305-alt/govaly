import axios from 'axios';
import storage from './storage.js';

// Real backend (Backend-dev repo) — no dev-server proxy needed, point straight at it.
// Set VITE_API_URL in client/.env for local dev (default assumes it runs on :5000)
// and in your hosting provider's env vars for production.
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1' });

api.interceptors.request.use((config) => {
  const token = storage.get('govaly_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    // The real backend issues one 7-day JWT and has no /auth/refresh endpoint —
    // there's nothing to silently renew, so an expired/invalid token just logs out.
    if (err.response?.status === 401 && !String(err.config?.url || '').includes('/auth/')) {
      storage.remove('govaly_token');
      window.dispatchEvent(new Event('govaly:logout'));
    }
    throw err;
  }
);

export const errMsg = (e, fallback = 'Something went wrong') =>
  e?.response?.data?.message || e?.message || fallback;

export default api;
