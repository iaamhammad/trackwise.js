import { throttle } from '../utils/throttle.js';
import { sanitizeUrl } from '../privacy/sanitize.js';

function navigationTiming(win) {
  try {
    const entries = win.performance && win.performance.getEntriesByType
      ? win.performance.getEntriesByType('navigation')
      : [];
    const nav = entries && entries[0];
    if (nav) {
      return {
        ttfb: Math.round(nav.responseStart),
        domInteractive: Math.round(nav.domInteractive),
        domComplete: Math.round(nav.domComplete || 0),
        loadTime: Math.round(nav.loadEventEnd || 0),
        transferSize: nav.transferSize || null
      };
    }
    const timing = win.performance && win.performance.timing;
    if (timing && timing.navigationStart) {
      return {
        ttfb: Math.round(timing.responseStart - timing.navigationStart),
        domInteractive: Math.round(timing.domInteractive - timing.navigationStart),
        domComplete: Math.round(timing.domComplete - timing.navigationStart),
        loadTime: Math.round(timing.loadEventEnd - timing.navigationStart),
        transferSize: null
      };
    }
  } catch (err) {
    void err;
  }
  return null;
}

export function registerPage(ctx) {
  const { doc, win, config, emit, notifyPageChange } = ctx;
  let lastUrl = null;
  let destroyed = false;
  let lcp = null;
  let cls = 0;
  let vitalsSent = false;
  const observers = [];
  let perfSent = false;

  function emitPageview(reason) {
    const url = String(win.location.href);
    if (reason !== 'init' && reason !== 'reload' && url === lastUrl) return null;
    lastUrl = url;

    const event = emit('pageview', {
      reason,
      referrer: doc.referrer ? sanitizeUrl(doc.referrer) : null,
      viewportW: win.innerWidth,
      viewportH: win.innerHeight,
      dpr: win.devicePixelRatio || 1,
      lang: doc.documentElement.lang || null,
      userAgentData: null
    });
    notifyPageChange();
    return event;
  }

  function emitPerf() {
    if (perfSent || destroyed) return;
    const timing = navigationTiming(win);
    if (!timing) return;
    perfSent = true;
    emit('perf', timing);
  }

  function emitVitals() {
    if (vitalsSent) return;
    vitalsSent = true;
    const payload = {};
    if (lcp !== null) payload.lcp = Math.round(lcp);
    payload.cls = Math.round(cls * 10000) / 10000;
    if (payload.lcp !== undefined || payload.cls > 0) {
      emit('web_vitals', payload);
    }
  }

  function setupVitals() {
    if (!config.capturePerf) return;
    if (typeof win.PerformanceObserver !== 'function') return;

    try {
      const lcpObserver = new win.PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length) lcp = entries[entries.length - 1].startTime;
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      observers.push(lcpObserver);
    } catch (err) {
      void err;
    }

    try {
      const clsObserver = new win.PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) cls += entry.value;
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      observers.push(clsObserver);
    } catch (err) {
      void err;
    }
  }

  const onPopState = () => emitPageview('popstate');
  const onHashChange = () => emitPageview('hashchange');
  const onVisibility = () => {
    emit('visibility', { state: doc.visibilityState });
    if (doc.visibilityState === 'hidden') emitVitals();
  };
  const onPageHide = () => {
    emitVitals();
    emitPerf();
  };

  function wrapHistory(method) {
    const original = win.history[method];
    win.history[method] = function patchedHistory() {
      const result = original.apply(this, arguments);
      emitPageview(method);
      return result;
    };
    return () => {
      win.history[method] = original;
    };
  }

  const unpatchPush = wrapHistory('pushState');
  const unpatchReplace = wrapHistory('replaceState');

  const onResize = throttle(() => {
    emit('resize', {
      viewportW: win.innerWidth,
      viewportH: win.innerHeight,
      dpr: win.devicePixelRatio || 1
    });
  }, 500);

  win.addEventListener('popstate', onPopState);
  win.addEventListener('hashchange', onHashChange);
  win.addEventListener('resize', onResize);
  win.addEventListener('pagehide', onPageHide);
  doc.addEventListener('visibilitychange', onVisibility);

  const onReady = () => {
    emitPerf();
    setupVitals();
  };

  if (doc.readyState === 'complete') {
    onReady();
  } else {
    win.addEventListener('load', onReady, { once: true });
  }

  emitPageview('init');

  return function destroyPage() {
    destroyed = true;
    emitVitals();
    unpatchPush();
    unpatchReplace();
    win.removeEventListener('popstate', onPopState);
    win.removeEventListener('hashchange', onHashChange);
    win.removeEventListener('resize', onResize);
    win.removeEventListener('pagehide', onPageHide);
    win.removeEventListener('load', onReady);
    doc.removeEventListener('visibilitychange', onVisibility);
    for (const observer of observers) {
      try {
        observer.disconnect();
      } catch (err) {
        void err;
      }
    }
  };
}
