import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import './fonts.css';
import './styles.css';
import './tailwind.css';
import App from './App.jsx';
import { StoreProvider } from './context/StoreContext.jsx';

/**
 * Router choice:
 * - Standalone (normal browser) → BrowserRouter for clean URLs (/products)
 * - Embedded in an iframe (live preview sandboxes have an opaque origin where
 *   history.pushState can throw) → HashRouter, which always works.
 */
const embedded = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const Router = embedded ? HashRouter : BrowserRouter;

/** Global error boundary — the UI must never die silently. */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
  }
  render() {
    if (this.state.error) {
      const msg = String(this.state.error?.message || this.state.error);
      const stackLine = String(this.state.error?.stack || '').split('\n').slice(0, 3).join('\n');
      const comp = String(this.state.info?.componentStack || '').trim().split('\n').slice(0, 4).join('\n');
      return (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <h2 style={{ color: '#e2136e' }}>Something went wrong 💔</h2>
          <p style={{ color: '#555' }}>{msg}</p>
          <button
            onClick={() => {
              this.setState({ error: null, info: null });
              if (window.self !== window.top) window.location.hash = '#/';
              else window.location.href = '/';
            }}
            style={{ marginTop: 14, background: '#e2136e', color: '#fff', border: 0, borderRadius: 999, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}
          >
            Reload Govaly
          </button>
          <details style={{ marginTop: 22, textAlign: 'left', maxWidth: 640, margin: '22px auto 0' }}>
            <summary style={{ color: '#999', fontSize: 12, cursor: 'pointer' }}>Technical details</summary>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: '#777', background: '#fafafa', padding: 12, borderRadius: 8, overflow: 'auto' }}>
              {stackLine}
              {'\n\n'}
              {comp}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Router>
        <StoreProvider>
          <App />
        </StoreProvider>
      </Router>
    </ErrorBoundary>
  </React.StrictMode>
);
