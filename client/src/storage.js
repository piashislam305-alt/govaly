/**
 * Safe storage — never throws.
 * In sandboxed preview iframes (opaque origin) or private-browsing modes,
 * accessing window.localStorage throws a SecurityError which would crash the
 * whole React app. This wrapper degrades gracefully to an in-memory Map.
 */
const memory = new Map();
let backed = null;

try {
  const t = '__govaly_test__';
  window.localStorage.setItem(t, '1');
  window.localStorage.removeItem(t);
  backed = window.localStorage;
} catch {
  backed = null; // sandboxed iframe / storage disabled → memory fallback
}

export const storage = {
  get(key) {
    try {
      return backed ? backed.getItem(key) : memory.has(key) ? memory.get(key) : null;
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      if (backed) backed.setItem(key, value);
      else memory.set(key, value);
    } catch {
      /* quota errors etc. — ignore */
    }
  },
  remove(key) {
    try {
      if (backed) backed.removeItem(key);
      else memory.delete(key);
    } catch {
      /* ignore */
    }
  },
};

export default storage;

// sessionStorage-backed twin (opaque-origin safe) — used for cross-page handoffs
const smemory = new Map();
let sbacked = null;
try {
  const t = '__govaly_stest__';
  window.sessionStorage.setItem(t, '1');
  window.sessionStorage.removeItem(t);
  sbacked = window.sessionStorage;
} catch {
  sbacked = null; // sandboxed iframe / storage disabled → memory fallback
}

export const session = {
  get(key) {
    try {
      return sbacked ? sbacked.getItem(key) : smemory.has(key) ? smemory.get(key) : null;
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      if (sbacked) sbacked.setItem(key, value);
      else smemory.set(key, value);
    } catch {
      /* ignore */
    }
  },
  remove(key) {
    try {
      if (sbacked) sbacked.removeItem(key);
      else smemory.delete(key);
    } catch {
      /* ignore */
    }
  },
};
