function memoryBackend() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    }
  };
}

export function getBrowserStorage(win, type) {
  try {
    const store = win && win[type];
    const probe = '__tw_probe__';
    store.setItem(probe, '1');
    store.removeItem(probe);
    return store;
  } catch (err) {
    return null;
  }
}

export function createStorage(backend) {
  const store = backend || memoryBackend();

  return {
    get(key) {
      try {
        const value = store.getItem(key);
        return value === undefined ? null : value;
      } catch (err) {
        return null;
      }
    },
    set(key, value) {
      try {
        store.setItem(key, String(value));
        return true;
      } catch (err) {
        return false;
      }
    },
    remove(key) {
      try {
        store.removeItem(key);
      } catch (err) {
        void err;
      }
    },
    getJSON(key, fallback = null) {
      const raw = this.get(key);
      if (raw === null) return fallback;
      try {
        return JSON.parse(raw);
      } catch (err) {
        return fallback;
      }
    },
    setJSON(key, value) {
      return this.set(key, JSON.stringify(value));
    }
  };
}
