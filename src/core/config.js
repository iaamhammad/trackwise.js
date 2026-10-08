export const DEFAULT_CONFIG = Object.freeze({
  endpoint: null,
  enabled: true,
  autoTrack: true,
  sampleRate: 1,
  flushIntervalMs: 5000,
  maxQueueSize: 300,
  maxStoredEvents: 500,
  mousemoveThrottleMs: 250,
  scrollThrottleMs: 250,
  sessionTimeoutMs: 30 * 60 * 1000,
  rageClick: Object.freeze({
    threshold: 3,
    windowMs: 1000,
    radiusPx: 40,
    cooldownMs: 5000
  }),
  deadClickMs: 600,
  misclickRadiusPx: 60,
  erraticScrollReversals: 6,
  erraticScrollWindowMs: 2000,
  respectDoNotTrack: true,
  scrubUrl: true,
  captureText: true,
  captureMouseMove: true,
  captureScroll: true,
  captureForms: true,
  captureErrors: true,
  captureKeyboard: true,
  capturePerf: true,
  hashText: false,
  maxTextLength: 80,
  blockSelectors: ['[data-tw-no-track]'],
  allowSelectors: null,
  redactSelectors: ['[data-tw-redact]'],
  debug: false,
  transport: null,
  onLog: null,
  transform: null
});

const BOOL_KEYS = [
  'enabled',
  'autoTrack',
  'respectDoNotTrack',
  'scrubUrl',
  'captureText',
  'captureMouseMove',
  'captureScroll',
  'captureForms',
  'captureErrors',
  'captureKeyboard',
  'capturePerf',
  'hashText',
  'debug'
];

const NUMBER_KEYS = [
  'sampleRate',
  'flushIntervalMs',
  'maxQueueSize',
  'maxStoredEvents',
  'mousemoveThrottleMs',
  'scrollThrottleMs',
  'sessionTimeoutMs',
  'deadClickMs',
  'misclickRadiusPx',
  'erraticScrollReversals',
  'erraticScrollWindowMs',
  'maxTextLength'
];

const SELECTOR_KEYS = ['blockSelectors', 'allowSelectors', 'redactSelectors'];

function toBool(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null) return fallback;
  const str = String(value).toLowerCase().trim();
  if (['true', '1', 'yes', 'on'].includes(str)) return true;
  if (['false', '0', 'no', 'off'].includes(str)) return false;
  return fallback;
}

function toNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toSelectors(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (Array.isArray(value)) return value.length ? value : null;
  const parts = String(value)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : null;
}

function toTransport(value, fallback) {
  if (typeof value === 'function') return value;
  if (value === undefined || value === null) return fallback;
  return fallback;
}

/**
 * Map kebab-case data attributes (e.g. data-flush-interval) to camelCase config keys.
 *
 * @param {object} dataset
 * @returns {object}
 */
export function parseDataAttributes(dataset) {
  if (!dataset) return {};
  const mapped = {};
  const known = {
    endpoint: 'endpoint',
    'sample-rate': 'sampleRate',
    'flush-interval': 'flushIntervalMs',
    'flush-interval-ms': 'flushIntervalMs',
    'max-queue-size': 'maxQueueSize',
    'session-timeout': 'sessionTimeoutMs',
    'mousemove-throttle': 'mousemoveThrottleMs',
    'scroll-throttle': 'scrollThrottleMs',
    'respect-dnt': 'respectDoNotTrack',
    'respect-do-not-track': 'respectDoNotTrack',
    'scrub-url': 'scrubUrl',
    'capture-text': 'captureText',
    'capture-mousemove': 'captureMouseMove',
    'capture-mouse-move': 'captureMouseMove',
    'capture-scroll': 'captureScroll',
    'capture-forms': 'captureForms',
    'capture-errors': 'captureErrors',
    'capture-keyboard': 'captureKeyboard',
    'capture-perf': 'capturePerf',
    'hash-text': 'hashText',
    'max-text-length': 'maxTextLength',
    'block-selectors': 'blockSelectors',
    'allow-selectors': 'allowSelectors',
    'redact-selectors': 'redactSelectors',
    debug: 'debug',
    enabled: 'enabled'
  };

  for (const [attr, value] of Object.entries(dataset)) {
    const key = known[attr] || null;
    if (key) mapped[key] = value;
  }
  return mapped;
}

function normalizeRageClick(value, base) {
  if (!value || typeof value !== 'object') return base;
  return {
    threshold: toNumber(value.threshold, base.threshold),
    windowMs: toNumber(value.windowMs, base.windowMs),
    radiusPx: toNumber(value.radiusPx, base.radiusPx),
    cooldownMs: toNumber(value.cooldownMs, base.cooldownMs)
  };
}

/**
 * Merge defaults, script data attributes and explicit options into a clamped config.
 *
 * @param {object} options
 * @param {object} scriptData
 * @returns {object}
 */
export function resolveConfig(options = {}, scriptData = {}) {
  const merged = { ...DEFAULT_CONFIG };

  for (const key of Object.keys(scriptData)) {
    if (key in merged || key === 'endpoint') merged[key] = scriptData[key];
  }
  for (const key of Object.keys(options)) {
    if (key in merged || key === 'endpoint' || key === 'rageClick') merged[key] = options[key];
  }

  for (const key of BOOL_KEYS) {
    merged[key] = toBool(merged[key], DEFAULT_CONFIG[key]);
  }
  for (const key of NUMBER_KEYS) {
    merged[key] = toNumber(merged[key], DEFAULT_CONFIG[key]);
  }
  for (const key of SELECTOR_KEYS) {
    merged[key] = toSelectors(merged[key], DEFAULT_CONFIG[key]);
  }
  merged.endpoint = merged.endpoint ? String(merged.endpoint) : null;
  merged.transport = toTransport(merged.transport, null);
  merged.onLog = typeof merged.onLog === 'function' ? merged.onLog : null;
  merged.transform = typeof merged.transform === 'function' ? merged.transform : null;
  merged.rageClick = normalizeRageClick(merged.rageClick, DEFAULT_CONFIG.rageClick);

  merged.sampleRate = Math.min(1, Math.max(0, merged.sampleRate));
  merged.flushIntervalMs = Math.max(1000, merged.flushIntervalMs);
  merged.maxQueueSize = Math.max(10, Math.round(merged.maxQueueSize));
  merged.maxStoredEvents = Math.max(10, Math.round(merged.maxStoredEvents));
  merged.mousemoveThrottleMs = Math.max(50, merged.mousemoveThrottleMs);
  merged.scrollThrottleMs = Math.max(50, merged.scrollThrottleMs);
  merged.sessionTimeoutMs = Math.max(60000, merged.sessionTimeoutMs);
  merged.maxTextLength = Math.min(300, Math.max(10, Math.round(merged.maxTextLength)));

  if (merged.endpoint === '' || merged.endpoint === 'null') merged.endpoint = null;

  return merged;
}

export function isDoNotTrackEnabled(win) {
  if (!win || !win.navigator) return false;
  const nav = win.navigator;
  const dnt =
    nav.doNotTrack ||
    nav.globalDoNotTrack ||
    (win.doNotTrack !== undefined ? win.doNotTrack : null) ||
    (nav.msDoNotTrack || null);
  return String(dnt) === '1' || String(dnt) === 'yes' || String(nav.doNotTrack) === 'true';
}
