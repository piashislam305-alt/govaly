import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/* Shared: "Find what you're looking for with the Search bar" + input */
export function ErrorSearch() {
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const submit = (e) => {
    e.preventDefault();
    nav(`/products?search=${encodeURIComponent(q.trim())}`);
  };
  return (
    <>
      <p className="err-find">Find what you're looking for with the <span className="brand-txt">Search</span> bar</p>
      <form className="err-search" onSubmit={submit}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9a9aa5" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
        </svg>
        <input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        <button type="submit">Search</button>
      </form>
    </>
  );
}

/* UFO beaming the number — 404 */
function UFO() {
  return (
    <svg width="230" height="200" viewBox="0 0 230 200" fill="none" aria-hidden>
      <defs>
        <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff7cc" stopOpacity=".95" />
          <stop offset="1" stopColor="#fff7cc" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="dish" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e2136e" />
          <stop offset="1" stopColor="#8e0c45" />
        </linearGradient>
      </defs>
      <path d="M115 62 L175 200 L55 200 Z" fill="url(#beam)" />
      <ellipse cx="115" cy="46" rx="78" ry="22" fill="url(#dish)" />
      <ellipse cx="115" cy="40" rx="78" ry="22" fill="#d31467" />
      <ellipse cx="115" cy="42" rx="34" ry="12" fill="#ffb01f" />
      <path d="M92 24c0-12 10-20 23-20s23 8 23 20c0 6-10 10-23 10s-23-4-23-10z" fill="#a80e50" />
      <ellipse cx="115" cy="14" rx="12" ry="7" fill="#ff8fc0" opacity=".85" />
    </svg>
  );
}

/* Pink cloud with plug — Server Down */
function CloudPlug() {
  return (
    <svg width="200" height="170" viewBox="0 0 200 170" fill="none" aria-hidden>
      <path d="M60 118c-20 0-34-14-34-31 0-16 12-29 28-31C58 34 76 20 97 20c26 0 47 19 50 44 16 1 28 13 28 28 0 16-13 26-30 26H60z" fill="#f7b8d3" />
      <path d="M128 52l10-14M136 60l14-9" stroke="#e688b4" strokeWidth="3" strokeLinecap="round" />
      <rect x="88" y="118" width="24" height="14" rx="3" fill="#f2a0c5" />
      <rect x="93" y="132" width="5" height="12" rx="2" fill="#f2a0c5" />
      <rect x="102" y="132" width="5" height="12" rx="2" fill="#f2a0c5" />
      <rect x="93" y="146" width="14" height="18" rx="4" fill="#f7b8d3" />
    </svg>
  );
}

/* Person at laptop — 500 */
function OopsGuy() {
  return (
    <svg width="330" height="190" viewBox="0 0 330 190" fill="none" aria-hidden>
      <circle cx="180" cy="95" r="88" fill="#ffe2ef" opacity=".55" />
      <rect x="52" y="52" width="72" height="52" rx="6" fill="#f7941d" />
      <rect x="60" y="60" width="72" height="52" rx="6" fill="#fff" stroke="#f2c9dd" />
      <path d="M60 74h72M60 88h48" stroke="#f2c9dd" strokeWidth="5" strokeLinecap="round" />
      <rect x="120" y="120" width="96" height="10" rx="3" fill="#c9c9d4" />
      <path d="M132 120l10-42h64l8 42" fill="#fff" stroke="#d9d9e3" />
      <path d="M150 78l14 14M164 78l-14 14" stroke="#c9c9d4" strokeWidth="4" strokeLinecap="round" />
      <path d="M216 178c2-40 14-64 34-64 16 0 24 18 24 40 0 10-2 18-4 24" fill="#d31467" />
      <path d="M226 96c6-10 20-10 26 0 4 8 2 20-4 26l-24 8c-6-10-4-26 2-34z" fill="#f7b8c9" />
      <path d="M238 84c2-10 12-16 20-12 8 4 10 14 6 22" fill="#f7941d" />
      <circle cx="247" cy="92" r="11" fill="#f7b8c9" />
      <path d="M254 96c6 2 10 8 8 14" stroke="#e288a8" strokeWidth="3" strokeLinecap="round" />
      <rect x="262" y="158" width="26" height="22" rx="3" fill="#f7941d" />
      <path d="M288 164h10c4 0 6 3 6 6s-2 6-6 6h-10" fill="#fff" stroke="#c9c9d4" />
    </svg>
  );
}

/* 404 — UFO page */
export function NotFound() {
  return (
    <div className="err-page">
      <UFO />
      <div className="err-code">404</div>
      <p className="err-msg">OOPS! The page you are looking for, could not be found</p>
      <ErrorSearch />
    </div>
  );
}

/* 500 — unexpected error page */
export function ServerError() {
  return (
    <div className="err-page err-500">
      <div className="err-500-row">
        <span className="err-code err-code-inline">500</span>
        <OopsGuy />
      </div>
      <p className="err-msg">This was unexpected, we are trying to fix the problem</p>
      <ErrorSearch />
    </div>
  );
}

/* 502 / 503 / 504 / 505 — Server Down (standalone, no header) */
export function ServerDown({ code = '502' }) {
  return (
    <div className="sd-page">
      <CloudPlug />
      <h1>Server Down</h1>
      <p>We're experiencing technical difficulties, please check back soon</p>
      <a className="sd-contact" href="mailto:support@govaly.com.bd">Contact Us</a>
      <span className="sd-code">Error {code}</span>
    </div>
  );
}
