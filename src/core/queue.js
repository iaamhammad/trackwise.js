const QUEUE_KEY = 'trackwise:queue';

/**
 * Bounded in-memory event queue with optional persistence across reloads.
 *
 * @param {object} deps
 * @param {number} deps.maxSize - max events held in memory
 * @param {number} deps.maxStored - max events persisted to storage
 * @param {object} deps.storage - storage wrapper
 * @param {boolean} deps.persist - whether to restore/save queue
 */
export function createQueue({ maxSize = 300, maxStored = 500, storage = null, persist = true }) {
  const items = [];
  const listeners = [];
  let dropped = 0;
  let totalPushed = 0;

  function notify(event) {
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (err) {
        void err;
      }
    }
  }

  function save() {
    if (!storage || !persist) return;
    const slice = items.slice(-maxStored);
    storage.setJSON(QUEUE_KEY, { events: slice, dropped });
  }

  if (storage && persist) {
    const stored = storage.getJSON(QUEUE_KEY, null);
    if (stored && Array.isArray(stored.events)) {
      for (const event of stored.events.slice(-maxStored)) {
        items.push(event);
      }
      dropped = stored.dropped || 0;
      totalPushed += items.length;
    }
    storage.remove(QUEUE_KEY);
  }

  return {
    push(event) {
      items.push(event);
      totalPushed += 1;
      if (items.length > maxSize) {
        const overflow = items.length - maxSize;
        items.splice(0, overflow);
        dropped += overflow;
      }
      save();
      notify(event);
    },
    size() {
      return items.length;
    },
    isEmpty() {
      return items.length === 0;
    },
    peek(count = items.length) {
      return items.slice(0, count);
    },
    drain(count = items.length) {
      const taken = items.splice(0, Math.min(count, items.length));
      return taken;
    },
    unshift(events) {
      items.unshift(...events);
      if (items.length > maxSize) {
        const overflow = items.length - maxSize;
        items.splice(items.length - overflow, overflow);
        dropped += overflow;
      }
    },
    clear() {
      items.length = 0;
      if (storage) storage.remove(QUEUE_KEY);
    },
    stats() {
      return { queued: items.length, dropped, total: totalPushed };
    },
    onPush(listener) {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      };
    },
    save
  };
}
