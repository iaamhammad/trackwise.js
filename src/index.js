import { createTracker, VERSION } from './core/tracker.js';
import { parseDataAttributes } from './core/config.js';

function readScriptData() {
  const globalConfig =
    typeof window !== 'undefined' && window.TRACKWISE_CONFIG && typeof window.TRACKWISE_CONFIG === 'object'
      ? { ...window.TRACKWISE_CONFIG }
      : {};

  if (typeof document === 'undefined') return globalConfig;

  const script = document.currentScript;
  if (!script || !script.dataset) return globalConfig;

  const data = { ...globalConfig, ...parseDataAttributes(script.dataset) };
  const jsonConfig = script.dataset.config;
  if (jsonConfig) {
    try {
      Object.assign(data, JSON.parse(jsonConfig));
    } catch (err) {
      void err;
    }
  }
  return data;
}

let instance = null;

function ensureInstance(autoStart = false) {
  if (!instance) {
    instance = createTracker({}, { scriptData: readScriptData() });
    if (autoStart) instance.start();
  }
  return instance;
}

function withInstance(fn, fallback) {
  return function boundMethod(...args) {
    if (!instance) return fallback;
    return fn(instance, ...args);
  };
}

export const TrackWise = {
  get version() {
    return VERSION;
  },

  init(options = {}) {
    if (instance) {
      if (!instance.isTracking()) instance.start();
      return instance;
    }
    instance = createTracker(options, { scriptData: readScriptData() });
    instance.start();
    return instance;
  },

  isInitialized() {
    return instance !== null;
  },

  start: withInstance((tracker) => tracker.start(), null),
  stop: withInstance((tracker) => tracker.stop(), null),
  destroy() {
    if (instance) {
      instance.destroy();
      instance = null;
    }
  },
  track: withInstance((tracker, name, data) => tracker.track(name, data), null),
  getLogs: withInstance((tracker) => tracker.getLogs(), []),
  exportJSON: withInstance(
    (tracker) => tracker.exportJSON(),
    '[]'
  ),
  clearLogs: withInstance((tracker) => tracker.clearLogs(), false),
  flush: withInstance((tracker) => tracker.flush(), Promise.resolve({ sent: 0 })),
  onLog: withInstance((tracker, cb) => tracker.onLog(cb), () => {}),
  renderHeatmap: withInstance((tracker, options) => tracker.renderHeatmap(options), null),
  clearHeatmap: withInstance((tracker) => tracker.clearHeatmap(), 0),
  getHeatmapData: withInstance(
    (tracker, options) => tracker.getHeatmapData(options),
    { cells: [], total: 0 }
  ),
  getSessionId: withInstance((tracker) => tracker.getSessionId(), null),
  getVisitorId: withInstance((tracker) => tracker.getVisitorId(), null),
  setEndpoint: withInstance((tracker, url) => tracker.setEndpoint(url), null),
  setEnabled: withInstance((tracker, value) => tracker.setEnabled(value), false),
  isTracking: withInstance((tracker) => tracker.isTracking(), false),
  stats: withInstance((tracker) => tracker.stats(), null),
  getConfig: withInstance((tracker) => tracker.config, null),
  ensureStarted() {
    return ensureInstance(true);
  }
};

function shouldAutoInit() {
  if (typeof document === 'undefined') return false;
  const script = document.currentScript;
  if (!script || !script.dataset) return false;
  if (script.dataset.autoInit === 'false') return false;
  return true;
}

if (shouldAutoInit()) {
  ensureInstance(true);
}

export default TrackWise;
