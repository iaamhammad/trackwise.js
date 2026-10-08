import { resolveConfig, isDoNotTrackEnabled } from './config.js';
import { createSession } from './session.js';
import { createQueue } from './queue.js';
import { createFlusher } from './flusher.js';
import { createStorage, getBrowserStorage } from '../utils/storage.js';
import { randomId } from '../utils/id.js';
import { hashText, sanitizeUrl, truncate, redactDeep } from '../privacy/sanitize.js';
import { registerClicks, registerMouse } from '../collectors/clicks.js';
import { registerScroll } from '../collectors/scroll.js';
import { registerForms } from '../collectors/forms.js';
import { registerPage } from '../collectors/page.js';
import { registerErrors } from '../collectors/errors.js';
import { registerKeyboard } from '../collectors/keyboard.js';
import { renderHeatmap, clearHeatmap, aggregateClicks } from '../viz/heatmap.js';

export const VERSION = '1.0.0';
const HISTORY_LIMIT = 1000;

function sampleFromHash(visitorId, sampleRate) {
  if (sampleRate >= 1) return true;
  if (sampleRate <= 0) return false;
  const hash = hashText(visitorId);
  const value = parseInt(hash, 36) / 36 ** hash.length;
  return value < sampleRate;
}

export function createTracker(userConfig = {}, env = {}) {
  const win = env.win || (typeof window !== 'undefined' ? window : null);
  const doc = env.doc || (typeof document !== 'undefined' ? document : null);

  if (!win || !doc) {
    throw new Error('trackwise.js must run in a browser environment');
  }

  const config = resolveConfig(userConfig, env.scriptData || {});
  const dntBlocked = config.respectDoNotTrack && isDoNotTrackEnabled(win);

  const localStore = createStorage(getBrowserStorage(win, 'localStorage'));
  const sessionStore = createStorage(getBrowserStorage(win, 'sessionStorage'));

  const session = createSession({
    sessionStorage: sessionStore,
    localStorage: localStore,
    timeoutMs: config.sessionTimeoutMs
  });

  const sampleAllowed = sampleFromHash(session.visitorId, config.sampleRate);

  const queue = createQueue({
    maxSize: config.maxQueueSize,
    maxStored: config.maxStoredEvents,
    storage: localStore,
    persist: true
  });

  const flusher = createFlusher({
    config,
    queue,
    session,
    win,
    version: VERSION
  });

  const history = [];
  const pageSubscribers = [];
  const teardown = [];
  let seq = 0;
  let started = false;
  let active = false;
  let enabled = config.enabled && !dntBlocked && sampleAllowed;

  function currentPage() {
    const loc = win.location;
    const raw = String(loc.href);
    return {
      url: config.scrubUrl ? sanitizeUrl(raw) : truncate(raw, 300),
      path: String(loc.pathname || ''),
      title: truncate(doc.title || '', 200)
    };
  }

  function buildEvent(type, payload) {
    seq += 1;
    const perfNow =
      win.performance && typeof win.performance.now === 'function'
        ? Math.round(win.performance.now())
        : 0;
    return {
      id: randomId('evt'),
      type,
      seq,
      timestamp: new Date().toISOString(),
      t: perfNow,
      sessionId: session.sessionId,
      visitorId: session.visitorId,
      page: currentPage(),
      viewport: { w: win.innerWidth, h: win.innerHeight },
      ...payload
    };
  }

  function emit(type, payload = {}) {
    if (!enabled || !active) return null;
    session.rollIfExpired();

    let event = buildEvent(type, payload);

    if (config.transform) {
      try {
        const result = config.transform(event);
        if (result === false) return null;
        if (result && typeof result === 'object') event = result;
      } catch (err) {
        void err;
      }
    }

    history.push(event);
    if (history.length > HISTORY_LIMIT) history.splice(0, history.length - HISTORY_LIMIT);

    queue.push(event);

    if (config.debug && win.console && typeof win.console.debug === 'function') {
      win.console.debug('[trackwise]', type, event);
    }

    const batchThreshold = Math.min(50, Math.floor(config.maxQueueSize / 2));
    if (config.endpoint && queue.size() >= batchThreshold) {
      flusher.flush('batch');
    }

    return event;
  }

  function onPageChange(fn) {
    pageSubscribers.push(fn);
    return function unsubscribe() {
      const index = pageSubscribers.indexOf(fn);
      if (index >= 0) pageSubscribers.splice(index, 1);
    };
  }

  function notifyPageChange() {
    for (const fn of pageSubscribers.slice()) {
      try {
        fn();
      } catch (err) {
        void err;
      }
    }
  }

  const ctx = {
    win,
    doc,
    config,
    emit,
    onPageChange,
    notifyPageChange,
    session
  };

  function onHide() {
    queue.save();
    flusher.flushSync('hidden');
  }

  const onVisibility = () => {
    if (doc.visibilityState === 'hidden') onHide();
  };

  function logListener(event) {
    if (typeof config.onLog === 'function') {
      try {
        config.onLog(event);
      } catch (err) {
        void err;
      }
    }
  }

  const unsubscribeLog = queue.onPush(logListener);

  const api = {
    version: VERSION,
    config,

    start() {
      if (started) return api;
      started = true;
      active = enabled;

      if (enabled && config.autoTrack) {
        teardown.push(registerPage(ctx));
        teardown.push(registerClicks(ctx));
        teardown.push(registerMouse(ctx));
        if (config.captureScroll) teardown.push(registerScroll(ctx));
        if (config.captureForms) teardown.push(registerForms(ctx));
        if (config.captureErrors) teardown.push(registerErrors(ctx));
        if (config.captureKeyboard) teardown.push(registerKeyboard(ctx));
      }

      flusher.start();
      win.addEventListener('pagehide', onHide);
      doc.addEventListener('visibilitychange', onVisibility);
      return api;
    },

    stop() {
      if (!started) return api;
      active = false;
      started = false;
      for (const destroy of teardown.splice(0)) {
        try {
          destroy();
        } catch (err) {
          void err;
        }
      }
      flusher.stop();
      win.removeEventListener('pagehide', onHide);
      doc.removeEventListener('visibilitychange', onVisibility);
      return api;
    },

    destroy() {
      api.stop();
      unsubscribeLog();
      queue.save();
      enabled = false;
      history.length = 0;
    },

    track(name, data) {
      return emit('custom', {
        name: truncate(String(name == null ? 'unnamed' : name), 60),
        data: data === undefined ? null : redactDeep(data)
      });
    },

    getLogs() {
      return history.slice();
    },

    exportJSON() {
      return JSON.stringify(history, null, 2);
    },

    clearLogs() {
      history.length = 0;
      queue.clear();
      return true;
    },

    flush() {
      return flusher.flush('manual');
    },

    onLog(callback) {
      if (typeof callback !== 'function') return () => {};
      return queue.onPush(callback);
    },

    renderHeatmap(options = {}) {
      return renderHeatmap({ doc, win, logs: history, options });
    },

    clearHeatmap() {
      return clearHeatmap(doc);
    },

    getHeatmapData(options = {}) {
      return aggregateClicks(history, { doc, win, ...options });
    },

    getSessionId() {
      return session.sessionId;
    },

    getVisitorId() {
      return session.visitorId;
    },

    setEndpoint(url) {
      config.endpoint = url ? String(url) : null;
      return config.endpoint;
    },

    setEnabled(value) {
      enabled = !!value && !dntBlocked && sampleAllowed;
      if (enabled && !started) api.start();
      active = enabled && started;
      return enabled;
    },

    isTracking() {
      return enabled && active;
    },

    stats() {
      return {
        tracking: enabled && active,
        history: history.length,
        queue: queue.stats(),
        sessionId: session.sessionId,
        visitorId: session.visitorId,
        dntBlocked,
        sampledOut: !sampleAllowed
      };
    }
  };

  return api;
}
