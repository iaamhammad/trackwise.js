var TrackWise = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.js
  var index_exports = {};
  __export(index_exports, {
    TrackWise: () => TrackWise,
    default: () => index_default
  });

  // src/core/config.js
  var DEFAULT_CONFIG = Object.freeze({
    endpoint: null,
    enabled: true,
    autoTrack: true,
    sampleRate: 1,
    flushIntervalMs: 5e3,
    maxQueueSize: 300,
    maxStoredEvents: 500,
    mousemoveThrottleMs: 250,
    scrollThrottleMs: 250,
    sessionTimeoutMs: 30 * 60 * 1e3,
    rageClick: Object.freeze({
      threshold: 3,
      windowMs: 1e3,
      radiusPx: 40,
      cooldownMs: 5e3
    }),
    deadClickMs: 600,
    misclickRadiusPx: 60,
    erraticScrollReversals: 6,
    erraticScrollWindowMs: 2e3,
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
    blockSelectors: ["[data-tw-no-track]"],
    allowSelectors: null,
    redactSelectors: ["[data-tw-redact]"],
    debug: false,
    transport: null,
    onLog: null,
    transform: null
  });
  var BOOL_KEYS = [
    "enabled",
    "autoTrack",
    "respectDoNotTrack",
    "scrubUrl",
    "captureText",
    "captureMouseMove",
    "captureScroll",
    "captureForms",
    "captureErrors",
    "captureKeyboard",
    "capturePerf",
    "hashText",
    "debug"
  ];
  var NUMBER_KEYS = [
    "sampleRate",
    "flushIntervalMs",
    "maxQueueSize",
    "maxStoredEvents",
    "mousemoveThrottleMs",
    "scrollThrottleMs",
    "sessionTimeoutMs",
    "deadClickMs",
    "misclickRadiusPx",
    "erraticScrollReversals",
    "erraticScrollWindowMs",
    "maxTextLength"
  ];
  var SELECTOR_KEYS = ["blockSelectors", "allowSelectors", "redactSelectors"];
  function toBool(value, fallback) {
    if (typeof value === "boolean") return value;
    if (value === void 0 || value === null) return fallback;
    const str = String(value).toLowerCase().trim();
    if (["true", "1", "yes", "on"].includes(str)) return true;
    if (["false", "0", "no", "off"].includes(str)) return false;
    return fallback;
  }
  function toNumber(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }
  function toSelectors(value, fallback) {
    if (value === void 0 || value === null) return fallback;
    if (Array.isArray(value)) return value.length ? value : null;
    const parts = String(value).split(",").map((part) => part.trim()).filter(Boolean);
    return parts.length ? parts : null;
  }
  function toTransport(value, fallback) {
    if (typeof value === "function") return value;
    if (value === void 0 || value === null) return fallback;
    return fallback;
  }
  function parseDataAttributes(dataset) {
    if (!dataset) return {};
    const mapped = {};
    const known = {
      endpoint: "endpoint",
      "sample-rate": "sampleRate",
      "flush-interval": "flushIntervalMs",
      "flush-interval-ms": "flushIntervalMs",
      "max-queue-size": "maxQueueSize",
      "session-timeout": "sessionTimeoutMs",
      "mousemove-throttle": "mousemoveThrottleMs",
      "scroll-throttle": "scrollThrottleMs",
      "respect-dnt": "respectDoNotTrack",
      "respect-do-not-track": "respectDoNotTrack",
      "scrub-url": "scrubUrl",
      "capture-text": "captureText",
      "capture-mousemove": "captureMouseMove",
      "capture-mouse-move": "captureMouseMove",
      "capture-scroll": "captureScroll",
      "capture-forms": "captureForms",
      "capture-errors": "captureErrors",
      "capture-keyboard": "captureKeyboard",
      "capture-perf": "capturePerf",
      "hash-text": "hashText",
      "max-text-length": "maxTextLength",
      "block-selectors": "blockSelectors",
      "allow-selectors": "allowSelectors",
      "redact-selectors": "redactSelectors",
      debug: "debug",
      enabled: "enabled"
    };
    for (const [attr, value] of Object.entries(dataset)) {
      const key = known[attr] || null;
      if (key) mapped[key] = value;
    }
    return mapped;
  }
  function normalizeRageClick(value, base) {
    if (!value || typeof value !== "object") return base;
    return {
      threshold: toNumber(value.threshold, base.threshold),
      windowMs: toNumber(value.windowMs, base.windowMs),
      radiusPx: toNumber(value.radiusPx, base.radiusPx),
      cooldownMs: toNumber(value.cooldownMs, base.cooldownMs)
    };
  }
  function resolveConfig(options = {}, scriptData = {}) {
    const merged = { ...DEFAULT_CONFIG };
    for (const key of Object.keys(scriptData)) {
      if (key in merged || key === "endpoint") merged[key] = scriptData[key];
    }
    for (const key of Object.keys(options)) {
      if (key in merged || key === "endpoint" || key === "rageClick") merged[key] = options[key];
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
    merged.onLog = typeof merged.onLog === "function" ? merged.onLog : null;
    merged.transform = typeof merged.transform === "function" ? merged.transform : null;
    merged.rageClick = normalizeRageClick(merged.rageClick, DEFAULT_CONFIG.rageClick);
    merged.sampleRate = Math.min(1, Math.max(0, merged.sampleRate));
    merged.flushIntervalMs = Math.max(1e3, merged.flushIntervalMs);
    merged.maxQueueSize = Math.max(10, Math.round(merged.maxQueueSize));
    merged.maxStoredEvents = Math.max(10, Math.round(merged.maxStoredEvents));
    merged.mousemoveThrottleMs = Math.max(50, merged.mousemoveThrottleMs);
    merged.scrollThrottleMs = Math.max(50, merged.scrollThrottleMs);
    merged.sessionTimeoutMs = Math.max(6e4, merged.sessionTimeoutMs);
    merged.maxTextLength = Math.min(300, Math.max(10, Math.round(merged.maxTextLength)));
    if (merged.endpoint === "" || merged.endpoint === "null") merged.endpoint = null;
    return merged;
  }
  function isDoNotTrackEnabled(win) {
    if (!win || !win.navigator) return false;
    const nav = win.navigator;
    const dnt = nav.doNotTrack || nav.globalDoNotTrack || (win.doNotTrack !== void 0 ? win.doNotTrack : null) || (nav.msDoNotTrack || null);
    return String(dnt) === "1" || String(dnt) === "yes" || String(nav.doNotTrack) === "true";
  }

  // src/utils/id.js
  function randomId(prefix = "") {
    const time = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 10);
    return prefix ? `${prefix}_${time}${rand}` : `${time}${rand}`;
  }

  // src/core/session.js
  var SESSION_KEY = "trackwise:session";
  var VISITOR_KEY = "trackwise:visitor";
  function createSession({ sessionStorage, localStorage, timeoutMs, now = () => Date.now() }) {
    let visitorId = localStorage.get(VISITOR_KEY);
    if (!visitorId) {
      visitorId = randomId("vis");
      localStorage.set(VISITOR_KEY, visitorId);
    }
    let state = sessionStorage.getJSON(SESSION_KEY, null);
    const currentTime = now();
    if (!state || !state.sessionId || currentTime - (state.lastActive || 0) > timeoutMs) {
      state = {
        sessionId: randomId("ses"),
        startedAt: currentTime,
        lastActive: currentTime
      };
      sessionStorage.setJSON(SESSION_KEY, state);
    }
    let seq = 0;
    return {
      get visitorId() {
        return visitorId;
      },
      get sessionId() {
        return state.sessionId;
      },
      get startedAt() {
        return state.startedAt;
      },
      touch() {
        state.lastActive = now();
        sessionStorage.setJSON(SESSION_KEY, state);
      },
      nextSeq() {
        seq += 1;
        this.touch();
        return seq;
      },
      getSeq() {
        return seq;
      },
      isExpired() {
        return now() - (state.lastActive || 0) > timeoutMs;
      },
      rollIfExpired() {
        if (!this.isExpired()) return false;
        state = {
          sessionId: randomId("ses"),
          startedAt: now(),
          lastActive: now()
        };
        seq = 0;
        sessionStorage.setJSON(SESSION_KEY, state);
        return true;
      },
      reset() {
        state = {
          sessionId: randomId("ses"),
          startedAt: now(),
          lastActive: now()
        };
        seq = 0;
        sessionStorage.setJSON(SESSION_KEY, state);
      }
    };
  }

  // src/core/queue.js
  var QUEUE_KEY = "trackwise:queue";
  function createQueue({ maxSize = 300, maxStored = 500, storage = null, persist = true }) {
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

  // src/core/flusher.js
  function isSameOrigin(url, win) {
    try {
      const base = win.location ? win.location.href : "http://localhost/";
      return new URL(url, base).origin === new URL(base, base).origin;
    } catch (err) {
      return true;
    }
  }
  function beaconTransport(win, endpoint, envelope) {
    const payload = JSON.stringify(envelope);
    try {
      if (win.navigator && typeof win.navigator.sendBeacon === "function") {
        const blob = isSameOrigin(endpoint, win) ? new win.Blob([payload], { type: "application/json" }) : payload;
        if (win.navigator.sendBeacon(endpoint, blob)) return true;
      }
    } catch (err) {
      void err;
    }
    if (typeof win.fetch === "function") {
      return win.fetch(endpoint, {
        method: "POST",
        keepalive: true,
        headers: { "content-type": "application/json" },
        body: payload
      }).then((res) => res.ok).catch(() => false);
    }
    return false;
  }
  function createFlusher({ config, queue, session, win, version = "1.0.0" }) {
    let timer = null;
    let sending = false;
    let failures = 0;
    let backoffUntil = 0;
    function buildEnvelope(events) {
      return {
        sdk: "trackwise.js",
        version,
        sessionId: session.sessionId,
        visitorId: session.visitorId,
        sentAt: (/* @__PURE__ */ new Date()).toISOString(),
        count: events.length,
        dropped: queue.stats().dropped,
        events
      };
    }
    function transport(events, envelope) {
      if (typeof config.transport === "function") {
        return config.transport(events, envelope);
      }
      if (!config.endpoint) return false;
      return beaconTransport(win, config.endpoint, envelope);
    }
    async function flush(reason = "interval") {
      if (sending) return { sent: 0, reason, skipped: true };
      if (!queue.size()) return { sent: 0, reason };
      const now = Date.now();
      if (reason === "interval" && now < backoffUntil) {
        return { sent: 0, reason, skipped: true, backoff: true };
      }
      sending = true;
      const events = queue.drain();
      const envelope = buildEnvelope(events);
      let ok = false;
      try {
        ok = await Promise.resolve(transport(events, envelope));
      } catch (err) {
        ok = false;
      }
      if (ok) {
        failures = 0;
        backoffUntil = 0;
      } else {
        failures += 1;
        backoffUntil = Date.now() + Math.min(3e4, 1e3 * 2 ** Math.min(failures, 5));
        queue.unshift(events);
        queue.save();
      }
      sending = false;
      return { sent: ok ? events.length : 0, reason, failed: !ok };
    }
    function flushSync(reason = "beacon") {
      void reason;
      if (!config.endpoint || !queue.size()) return false;
      const events = queue.drain();
      const envelope = buildEnvelope(events);
      try {
        const result = transport(events, envelope);
        if (result === true) return true;
        if (result && typeof result.then === "function") {
          result.then((ok) => {
            if (!ok) {
              queue.unshift(events);
              queue.save();
            }
          }).catch(() => {
            queue.unshift(events);
            queue.save();
          });
          return true;
        }
      } catch (err) {
        void err;
      }
      queue.unshift(events);
      queue.save();
      return false;
    }
    return {
      start() {
        if (timer) return;
        timer = win.setInterval(() => {
          flush("interval");
        }, config.flushIntervalMs);
      },
      stop() {
        if (timer) {
          win.clearInterval(timer);
          timer = null;
        }
      },
      flush,
      flushSync,
      buildEnvelope,
      get failures() {
        return failures;
      }
    };
  }

  // src/utils/storage.js
  function memoryBackend() {
    const map = /* @__PURE__ */ new Map();
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
  function getBrowserStorage(win, type) {
    try {
      const store = win && win[type];
      const probe = "__tw_probe__";
      store.setItem(probe, "1");
      store.removeItem(probe);
      return store;
    } catch (err) {
      return null;
    }
  }
  function createStorage(backend) {
    const store = backend || memoryBackend();
    return {
      get(key) {
        try {
          const value = store.getItem(key);
          return value === void 0 ? null : value;
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

  // src/privacy/sanitize.js
  var EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]{2,}/g;
  var CARD_RE = /(?:\d[ -]?){13,19}/g;
  var PHONE_RE = /\+?\d[\d\s().-]{7,}\d/g;
  var SENSITIVE_KEY_RE = /pass|pwd|secret|token|auth|session|ssn|social|card|cvv|cvc|credit|iban|email|phone|address|dob|birth/i;
  var REDACTED = "[REDACTED]";
  function collapseWhitespace(text) {
    return String(text == null ? "" : text).replace(/\s+/g, " ").trim();
  }
  function truncate(text, max = 80) {
    const value = String(text == null ? "" : text);
    if (value.length <= max) return value;
    return value.slice(0, max - 1) + "\u2026";
  }
  function redactPII(text) {
    return String(text == null ? "" : text).replace(CARD_RE, (match) => {
      const digits = match.replace(/\D/g, "");
      return digits.length >= 13 && digits.length <= 19 ? REDACTED : match;
    }).replace(EMAIL_RE, REDACTED).replace(PHONE_RE, (match) => {
      const digits = match.replace(/\D/g, "");
      return digits.length >= 8 ? REDACTED : match;
    });
  }
  function hashText(text) {
    const input = String(text == null ? "" : text);
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }
  function safeText(text, options = {}) {
    const { maxLength = 80, hash = false, redact = true } = options;
    const collapsed = collapseWhitespace(text);
    if (!collapsed) return "";
    if (hash) return `#${hashText(collapsed)}`;
    const cleaned = redact ? redactPII(collapsed) : collapsed;
    return truncate(cleaned, maxLength);
  }
  function sanitizeUrl(url, options = {}) {
    const { scrubQuery = true, scrubHash = true, scrubCredentials = true } = options;
    const raw = String(url == null ? "" : url);
    if (!raw) return "";
    const isAbsolute = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw) || raw.startsWith("//");
    if (!isAbsolute) {
      const path = raw.split("?")[0].split("#")[0];
      return truncate(path, 200);
    }
    try {
      const parsed = new URL(raw, "http://placeholder.local");
      if (scrubCredentials) {
        parsed.username = "";
        parsed.password = "";
      }
      if (scrubQuery) parsed.search = "";
      if (scrubHash) parsed.hash = "";
      const origin = parsed.origin === "http://placeholder.local" ? "" : parsed.origin;
      return truncate(`${origin}${parsed.pathname}`, 300);
    } catch (err) {
      const fallback = raw.split("?")[0].split("#")[0];
      return truncate(fallback, 300);
    }
  }
  function matchesAny(el, selectors) {
    if (!el || !selectors || !selectors.length) return false;
    for (const selector of selectors) {
      try {
        if (el.matches && el.matches(selector)) return true;
        if (el.closest && el.closest(selector)) return true;
      } catch (err) {
        void err;
      }
    }
    return false;
  }
  function isSensitiveElement(el) {
    if (!el || !el.tagName) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === "input") {
      const type = String(el.type || "text").toLowerCase();
      if (["password", "email", "tel", "number"].includes(type)) return true;
      if (String(el.autocomplete || "").match(/cc-|onetime/)) return true;
      return false;
    }
    if (tag === "textarea" || tag === "select") return true;
    if (el.isContentEditable) return true;
    if (String(el.getAttribute ? el.getAttribute("contenteditable") : "") === "true") return true;
    return false;
  }
  var INTERACTIVE_SELECTOR = [
    "a[href]",
    "button",
    "input",
    "select",
    "textarea",
    "label",
    "summary",
    "option",
    '[role="button"]',
    '[role="link"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="switch"]',
    "[onclick]",
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(",");
  function interactiveAncestor(el) {
    if (!el || !el.closest) return null;
    return el.closest(INTERACTIVE_SELECTOR);
  }
  function isInteractive(el) {
    return interactiveAncestor(el) !== null;
  }
  function describeSelector(el) {
    if (!el || !el.tagName) return "";
    const parts = [];
    let node = el;
    let depth = 0;
    while (node && node.nodeType === 1 && depth < 5) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        part += `#${node.id}`;
        parts.unshift(part);
        break;
      }
      if (node.classList && node.classList.length) {
        part += `.${Array.from(node.classList).slice(0, 2).join(".")}`;
      }
      const parent = node.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (child) => child.tagName === node.tagName
        );
        if (siblings.length > 1) {
          part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
        }
      }
      parts.unshift(part);
      node = node.parentElement;
      depth += 1;
    }
    return truncate(parts.join(" > "), 160);
  }
  function getDescriptor(el, options = {}) {
    if (!el || !el.tagName || el.nodeType !== 1) return null;
    const {
      captureText = true,
      hashText: shouldHash = false,
      maxLength = 80,
      redactSelectors = null,
      allowSelectors = null,
      blockSelectors = null
    } = options;
    if (blockSelectors && matchesAny(el, blockSelectors)) return null;
    const tag = el.tagName.toLowerCase();
    const sensitive = isSensitiveElement(el);
    const redacted = sensitive || redactSelectors && matchesAny(el, redactSelectors);
    const textAllowed = captureText && !redacted && (!allowSelectors || matchesAny(el, allowSelectors));
    const descriptor = {
      tag,
      id: el.id || null,
      classes: typeof el.className === "string" && el.className ? truncate(el.className.trim(), 100) : null,
      name: el.getAttribute ? el.getAttribute("name") || null : null,
      role: el.getAttribute ? el.getAttribute("role") || null : null,
      path: describeSelector(el),
      interactive: isInteractive(el),
      redacted: !!redacted
    };
    if (tag === "input" && el.type) descriptor.inputType = String(el.type).toLowerCase();
    if (el.getAttribute) {
      const href = el.getAttribute("href");
      if (href) descriptor.href = sanitizeUrl(href);
      const ariaLabel = el.getAttribute("aria-label");
      if (ariaLabel) descriptor.label = safeText(ariaLabel, { maxLength, hash: shouldHash });
    }
    if (redacted) {
      descriptor.text = REDACTED;
    } else if (textAllowed) {
      const text = el.innerText || el.textContent || "";
      descriptor.text = safeText(text, { maxLength, hash: shouldHash });
    } else {
      descriptor.text = null;
    }
    return descriptor;
  }
  function redactDeep(value, options = {}, depth = 0) {
    const { maxLength = 100, maxKeys = 40, maxDepth = 4 } = options;
    if (value === null || value === void 0) return value;
    if (typeof value === "string") {
      return truncate(redactPII(value), maxLength);
    }
    if (typeof value === "number" || typeof value === "boolean") return value;
    if (depth >= maxDepth) return truncate(String(value), maxLength);
    if (Array.isArray(value)) {
      return value.slice(0, maxKeys).map((item) => redactDeep(item, options, depth + 1));
    }
    if (typeof value === "object") {
      const out = {};
      let count = 0;
      for (const key of Object.keys(value)) {
        if (count >= maxKeys) break;
        count += 1;
        if (SENSITIVE_KEY_RE.test(key)) {
          out[key] = REDACTED;
        } else {
          out[key] = redactDeep(value[key], options, depth + 1);
        }
      }
      return out;
    }
    return truncate(String(value), maxLength);
  }

  // src/utils/throttle.js
  function throttle(fn, wait) {
    let last = 0;
    let timer = null;
    let lastArgs = null;
    return function throttled(...args) {
      const now = Date.now();
      const remaining = wait - (now - last);
      lastArgs = args;
      if (remaining <= 0) {
        last = now;
        fn.apply(this, args);
      } else if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          last = Date.now();
          fn.apply(this, lastArgs);
        }, remaining);
      }
    };
  }

  // src/collectors/clicks.js
  function createRageDetector(options = {}, clock = null) {
    const { threshold = 3, windowMs = 1e3, radiusPx = 40, cooldownMs = 5e3 } = options;
    const now = clock || (() => Date.now());
    let clicks = [];
    let cooldownUntil = 0;
    return {
      register(x, y) {
        const time = now();
        clicks.push({ x, y, t: time });
        clicks = clicks.filter((click) => time - click.t <= windowMs);
        if (clicks.length < threshold) return { rage: false, count: clicks.length };
        const recent = clicks.slice(-threshold);
        const anchor = recent[0];
        const withinRadius = recent.every(
          (click) => Math.hypot(click.x - anchor.x, click.y - anchor.y) <= radiusPx
        );
        if (!withinRadius) return { rage: false, count: clicks.length };
        const count = clicks.length;
        clicks = [];
        if (time < cooldownUntil) return { rage: false, count, cooldown: true };
        cooldownUntil = time + cooldownMs;
        return { rage: true, count, x: anchor.x, y: anchor.y };
      },
      reset() {
        clicks = [];
        cooldownUntil = 0;
      }
    };
  }
  function nearestRectDistance(point, rects) {
    let best = null;
    for (const rect of rects) {
      const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
      const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
      const distance = Math.hypot(dx, dy);
      if (!best || distance < best.distance) {
        best = { distance, rect };
      }
    }
    return best;
  }
  function findMisclickTarget(el, point, radiusPx) {
    if (!el.parentElement) return null;
    const candidates = [];
    const seen = /* @__PURE__ */ new Set();
    let level = el.parentElement;
    let levels = 0;
    while (level && levels < 3) {
      for (const child of level.children) {
        if (seen.has(child) || child === el || child.contains(el)) continue;
        seen.add(child);
        if (child.matches && child.matches(INTERACTIVE_PROBE)) {
          candidates.push(child);
        }
      }
      level = level.parentElement;
      levels += 1;
    }
    if (!candidates.length) return null;
    const rects = candidates.map((candidate) => {
      const rect = candidate.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, el: candidate };
    });
    const nearest = nearestRectDistance(point, rects);
    if (nearest && nearest.distance > 0 && nearest.distance <= radiusPx) {
      return { el: nearest.rect.el, distance: Math.round(nearest.distance) };
    }
    return null;
  }
  var INTERACTIVE_PROBE = [
    "a[href]",
    "button",
    "input",
    "select",
    "textarea",
    "label",
    '[role="button"]',
    '[role="link"]',
    "[onclick]",
    '[tabindex]:not([tabindex="-1"])'
  ].join(",");
  function registerClicks(ctx) {
    const { doc, win, config, emit } = ctx;
    const rageDetector = createRageDetector(config.rageClick, () => Date.now());
    let deadWatch = null;
    function cancelDeadWatch() {
      if (deadWatch) {
        win.clearTimeout(deadWatch.timer);
        deadWatch.observer.disconnect();
        deadWatch = null;
      }
    }
    function scheduleDeadClick(el, descriptor, event) {
      if (typeof win.MutationObserver !== "function") return;
      cancelDeadWatch();
      const startUrl = win.location.href;
      let activity = false;
      const observer = new win.MutationObserver(() => {
        activity = true;
      });
      try {
        observer.observe(doc.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true
        });
      } catch (err) {
        void err;
        return;
      }
      const timer = win.setTimeout(() => {
        observer.disconnect();
        deadWatch = null;
        if (!activity && win.location.href === startUrl) {
          emit("dead_click", {
            x: event.pageX,
            y: event.pageY,
            target: descriptor
          });
        }
      }, config.deadClickMs);
      deadWatch = { timer, observer };
    }
    function onClick(event) {
      let el = event.target;
      if (el && el.nodeType === 3) el = el.parentElement;
      if (!el || el.nodeType !== 1) return;
      if (config.blockSelectors && matchesAny(el, config.blockSelectors)) return;
      const descriptor = getDescriptor(el, {
        captureText: config.captureText,
        hashText: config.hashText,
        maxLength: config.maxTextLength,
        redactSelectors: config.redactSelectors,
        allowSelectors: config.allowSelectors,
        blockSelectors: config.blockSelectors
      });
      if (!descriptor) return;
      emit("click", {
        x: event.pageX,
        y: event.pageY,
        cx: event.clientX,
        cy: event.clientY,
        button: event.button,
        viewportW: win.innerWidth,
        viewportH: win.innerHeight,
        target: descriptor
      });
      const rage = rageDetector.register(event.clientX, event.clientY);
      if (rage.rage) {
        emit("rage_click", {
          count: rage.count,
          cx: rage.x,
          cy: rage.y,
          target: descriptor
        });
      }
      if (descriptor.interactive) return;
      const misclick = findMisclickTarget(el, { x: event.clientX, y: event.clientY }, config.misclickRadiusPx);
      if (misclick) {
        const intended = getDescriptor(misclick.el, {
          captureText: config.captureText,
          hashText: config.hashText,
          maxLength: config.maxTextLength,
          redactSelectors: config.redactSelectors,
          allowSelectors: config.allowSelectors,
          blockSelectors: config.blockSelectors
        });
        emit("misclick", {
          x: event.pageX,
          y: event.pageY,
          distance: misclick.distance,
          target: descriptor,
          intended
        });
      }
      if (!interactiveAncestor(el)) {
        scheduleDeadClick(el, descriptor, event);
      }
    }
    doc.addEventListener("click", onClick, true);
    return function destroyClicks() {
      doc.removeEventListener("click", onClick, true);
      cancelDeadWatch();
      rageDetector.reset();
    };
  }
  function registerMouse(ctx) {
    const { doc, win, config, emit } = ctx;
    const onMove = throttle((event) => {
      emit("mousemove", {
        x: event.pageX,
        y: event.pageY,
        viewportW: win.innerWidth,
        viewportH: win.innerHeight,
        docW: doc.documentElement.scrollWidth,
        docH: doc.documentElement.scrollHeight
      });
    }, config.mousemoveThrottleMs);
    const onLeave = (event) => {
      if (event.relatedTarget === null || event.clientX <= 0 || event.clientY <= 0) {
        emit("mouseleave", {
          x: event.pageX,
          y: event.pageY,
          viewportW: win.innerWidth,
          viewportH: win.innerHeight
        });
      }
    };
    doc.addEventListener("mousemove", onMove, { passive: true });
    doc.addEventListener("mouseleave", onLeave, { passive: true });
    return function destroyMouse() {
      doc.removeEventListener("mousemove", onMove);
      doc.removeEventListener("mouseleave", onLeave);
    };
  }

  // src/collectors/scroll.js
  var MILESTONES = [25, 50, 75, 90, 100];
  function pageMetrics(doc, win) {
    const root = doc.documentElement;
    const body = doc.body;
    const docH = Math.max(
      root ? root.scrollHeight : 0,
      body ? body.scrollHeight : 0,
      win.innerHeight
    );
    const y = win.scrollY || win.pageYOffset || 0;
    const depth = Math.min(100, Math.round((y + win.innerHeight) / Math.max(docH, 1) * 1e3) / 10);
    return { y, docH, depth };
  }
  function elementMetrics(el) {
    const max = Math.max(el.scrollHeight - el.clientHeight, 1);
    const depth = Math.min(100, Math.round(el.scrollTop / max * 1e3) / 10);
    return { y: el.scrollTop, depth };
  }
  function registerScroll(ctx) {
    const { doc, win, config, emit, onPageChange } = ctx;
    let lastY = win.scrollY || 0;
    let lastDirection = 0;
    let reversals = [];
    let maxDepth = 0;
    let erraticCooldown = 0;
    let milestonesDone = /* @__PURE__ */ new Set();
    function reset() {
      lastY = win.scrollY || 0;
      lastDirection = 0;
      reversals = [];
      maxDepth = 0;
      milestonesDone = /* @__PURE__ */ new Set();
    }
    function handleScroll(event) {
      const target = event.target;
      const isPageScroll = !target || target === doc || target === doc.documentElement || target === doc.body || target === win;
      if (!isPageScroll) {
        if (!target || typeof target.scrollTop !== "number" || !target.clientHeight) return;
        if (config.blockSelectors && matchesAny(target, config.blockSelectors)) return;
        const metrics = elementMetrics(target);
        emit("scroll", {
          scope: "element",
          y: metrics.y,
          depth: metrics.depth,
          target: getDescriptor(target, {
            captureText: false,
            maxLength: config.maxTextLength,
            blockSelectors: config.blockSelectors
          })
        });
        return;
      }
      const { y, depth } = pageMetrics(doc, win);
      const direction = y > lastY ? 1 : y < lastY ? -1 : 0;
      if (direction !== 0) {
        if (lastDirection !== 0 && direction !== lastDirection) {
          const now = Date.now();
          reversals.push(now);
          reversals = reversals.filter((t) => now - t <= config.erraticScrollWindowMs);
          if (reversals.length >= config.erraticScrollReversals && now > erraticCooldown) {
            emit("erratic_scroll", { reversals: reversals.length, y, depth });
            erraticCooldown = now + 15e3;
            reversals = [];
          }
        }
        lastDirection = direction;
      }
      if (depth > maxDepth) {
        maxDepth = depth;
        for (const milestone of MILESTONES) {
          if (depth >= milestone && !milestonesDone.has(milestone)) {
            milestonesDone.add(milestone);
            emit("scroll_depth", { milestone, maxDepth, y });
          }
        }
      }
      lastY = y;
      clearTimeout(scrollEndTimer);
      scrollEndTimer = win.setTimeout(() => {
        const current = pageMetrics(doc, win);
        emit("scroll", {
          scope: "page",
          y: current.y,
          depth: maxDepth,
          direction: lastDirection
        });
      }, 250);
    }
    let scrollEndTimer = null;
    const handler = throttle(handleScroll, config.scrollThrottleMs);
    doc.addEventListener("scroll", handler, { capture: true, passive: true });
    const unsubscribe = onPageChange(reset);
    return function destroyScroll() {
      doc.removeEventListener("scroll", handler, true);
      unsubscribe();
      if (scrollEndTimer) win.clearTimeout(scrollEndTimer);
    };
  }

  // src/collectors/forms.js
  function fieldInfo(el) {
    const tag = el.tagName.toLowerCase();
    let label = el.getAttribute ? el.getAttribute("aria-label") : null;
    if (!label && el.labels && el.labels.length) label = el.labels[0].textContent;
    if (!label && el.getAttribute) label = el.getAttribute("placeholder");
    return {
      tag,
      name: (el.name || null) && String(el.name).slice(0, 60),
      id: el.id || null,
      type: tag === "input" ? String(el.type || "text").toLowerCase() : null,
      label: label ? safeText(label, { maxLength: 60 }) : null,
      formId: el.form ? el.form.id || null : null,
      sensitive: isSensitiveElement(el)
    };
  }
  function isFormField(el) {
    if (!el || el.nodeType !== 1 || !el.tagName) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    return el.isContentEditable === true || el.getAttribute("contenteditable") === "true";
  }
  function formInfo(form) {
    if (!form) return null;
    return {
      id: form.id || null,
      action: form.action ? sanitizeUrl(form.action) : null,
      method: form.method ? String(form.method).toLowerCase() : "get",
      fieldCount: form.elements ? form.elements.length : null
    };
  }
  function registerForms(ctx) {
    const { doc, win, config, emit, onPageChange } = ctx;
    const inputThrottle = /* @__PURE__ */ new WeakMap();
    let active = null;
    function shouldSkip(el) {
      return config.blockSelectors && matchesAny(el, config.blockSelectors);
    }
    function onFocusIn(event) {
      const el = event.target;
      if (!isFormField(el) || shouldSkip(el)) return;
      const now = Date.now();
      active = {
        el,
        focusAt: now,
        firstFocusAt: active && active.el === el ? active.firstFocusAt : now,
        field: fieldInfo(el),
        submitted: false
      };
      emit("form_focus", {
        field: active.field,
        form: formInfo(el.form)
      });
    }
    function onInput(event) {
      const el = event.target;
      if (!isFormField(el) || shouldSkip(el)) return;
      const now = Date.now();
      const last = inputThrottle.get(el) || 0;
      if (now - last < 1e3) return;
      inputThrottle.set(el, now);
      const value = typeof el.value === "string" ? el.value : el.textContent || "";
      emit("form_input", {
        field: fieldInfo(el),
        length: value.length,
        empty: value.length === 0
      });
    }
    function onChange(event) {
      const el = event.target;
      if (!isFormField(el) || shouldSkip(el)) return;
      const tag = el.tagName.toLowerCase();
      const payload = { field: fieldInfo(el) };
      if (tag === "select") {
        payload.selectedIndex = typeof el.selectedIndex === "number" ? el.selectedIndex : null;
        payload.optionCount = el.options ? el.options.length : null;
      } else if (tag === "input" && ["checkbox", "radio"].includes(String(el.type).toLowerCase())) {
        payload.checked = !!el.checked;
        payload.value = safeText(el.value || "", { maxLength: 40 });
      } else if (el.isContentEditable) {
        payload.length = (el.textContent || "").length;
      }
      emit("form_change", payload);
    }
    function onInvalid(event) {
      const el = event.target;
      if (!el || el.nodeType !== 1 || shouldSkip(el)) return;
      emit("form_error", {
        field: fieldInfo(el),
        message: truncate(redactPII(el.validationMessage || ""), 140)
      });
    }
    function onSubmit(event) {
      const form = event.target;
      if (!form || shouldSkip(form)) return;
      const now = Date.now();
      const payload = {
        form: formInfo(form),
        hesitationMs: active && active.focusAt ? now - active.focusAt : null,
        focusCount: null
      };
      if (active && active.el && form.contains && form.contains(active.el)) {
        payload.field = active.field;
        payload.fieldDurationMs = now - active.focusAt;
        active.submitted = true;
      }
      emit("form_submit", payload);
      active = null;
    }
    function maybeAbandon(reason) {
      if (!active || active.submitted) return;
      const elapsed = Date.now() - active.focusAt;
      if (elapsed < 300) {
        active = null;
        return;
      }
      const { el, ...rest } = active;
      void el;
      emit("form_abandon", { ...rest, reason, durationMs: elapsed });
      active = null;
    }
    doc.addEventListener("focusin", onFocusIn, true);
    doc.addEventListener("input", onInput, true);
    doc.addEventListener("change", onChange, true);
    doc.addEventListener("invalid", onInvalid, true);
    doc.addEventListener("submit", onSubmit, true);
    const onVisibility = () => {
      if (doc.visibilityState === "hidden") maybeAbandon("pagehide");
    };
    const onPageHide = () => maybeAbandon("pagehide");
    const unsubscribePage = onPageChange(() => maybeAbandon("navigation"));
    doc.addEventListener("visibilitychange", onVisibility);
    win.addEventListener("pagehide", onPageHide);
    return function destroyForms() {
      doc.removeEventListener("focusin", onFocusIn, true);
      doc.removeEventListener("input", onInput, true);
      doc.removeEventListener("change", onChange, true);
      doc.removeEventListener("invalid", onInvalid, true);
      doc.removeEventListener("submit", onSubmit, true);
      doc.removeEventListener("visibilitychange", onVisibility);
      win.removeEventListener("pagehide", onPageHide);
      unsubscribePage();
      active = null;
    };
  }

  // src/collectors/page.js
  function navigationTiming(win) {
    try {
      const entries = win.performance && win.performance.getEntriesByType ? win.performance.getEntriesByType("navigation") : [];
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
  function registerPage(ctx) {
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
      if (reason !== "init" && reason !== "reload" && url === lastUrl) return null;
      lastUrl = url;
      const event = emit("pageview", {
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
      emit("perf", timing);
    }
    function emitVitals() {
      if (vitalsSent) return;
      vitalsSent = true;
      const payload = {};
      if (lcp !== null) payload.lcp = Math.round(lcp);
      payload.cls = Math.round(cls * 1e4) / 1e4;
      if (payload.lcp !== void 0 || payload.cls > 0) {
        emit("web_vitals", payload);
      }
    }
    function setupVitals() {
      if (!config.capturePerf) return;
      if (typeof win.PerformanceObserver !== "function") return;
      try {
        const lcpObserver = new win.PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length) lcp = entries[entries.length - 1].startTime;
        });
        lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
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
        clsObserver.observe({ type: "layout-shift", buffered: true });
        observers.push(clsObserver);
      } catch (err) {
        void err;
      }
    }
    const onPopState = () => emitPageview("popstate");
    const onHashChange = () => emitPageview("hashchange");
    const onVisibility = () => {
      emit("visibility", { state: doc.visibilityState });
      if (doc.visibilityState === "hidden") emitVitals();
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
    const unpatchPush = wrapHistory("pushState");
    const unpatchReplace = wrapHistory("replaceState");
    const onResize = throttle(() => {
      emit("resize", {
        viewportW: win.innerWidth,
        viewportH: win.innerHeight,
        dpr: win.devicePixelRatio || 1
      });
    }, 500);
    win.addEventListener("popstate", onPopState);
    win.addEventListener("hashchange", onHashChange);
    win.addEventListener("resize", onResize);
    win.addEventListener("pagehide", onPageHide);
    doc.addEventListener("visibilitychange", onVisibility);
    const onReady = () => {
      emitPerf();
      setupVitals();
    };
    if (doc.readyState === "complete") {
      onReady();
    } else {
      win.addEventListener("load", onReady, { once: true });
    }
    emitPageview("init");
    return function destroyPage() {
      destroyed = true;
      emitVitals();
      unpatchPush();
      unpatchReplace();
      win.removeEventListener("popstate", onPopState);
      win.removeEventListener("hashchange", onHashChange);
      win.removeEventListener("resize", onResize);
      win.removeEventListener("pagehide", onPageHide);
      win.removeEventListener("load", onReady);
      doc.removeEventListener("visibilitychange", onVisibility);
      for (const observer of observers) {
        try {
          observer.disconnect();
        } catch (err) {
          void err;
        }
      }
    };
  }

  // src/collectors/errors.js
  function errorPayload(event) {
    const err = event && event.error ? event.error : null;
    const message = err && err.message || event.message || "Unknown error";
    const source = event.filename || err && err.fileName || "";
    const payload = {
      message: truncate(redactPII(String(message)), 300),
      name: err && err.name ? String(err.name) : null,
      source: source ? sanitizeUrl(source, { scrubQuery: false }) : null,
      line: event.lineno || null,
      col: event.colno || null,
      stack: err && err.stack ? truncate(redactPII(String(err.stack)), 600) : null
    };
    return payload;
  }
  function registerErrors(ctx) {
    const { doc, win, config, emit } = ctx;
    function onError(event) {
      if (event && event.target && event.target !== win && event.target.tagName) return;
      emit("js_error", errorPayload(event));
    }
    function onRejection(event) {
      const reason = event.reason;
      const isErr = reason && typeof reason === "object";
      emit("promise_rejection", {
        message: truncate(
          redactPII(String(isErr && reason.message || reason || "Unknown rejection")),
          300
        ),
        name: isErr && reason.name ? String(reason.name) : null,
        stack: isErr && reason.stack ? truncate(redactPII(String(reason.stack)), 600) : null
      });
    }
    win.addEventListener("error", onError, false);
    win.addEventListener("unhandledrejection", onRejection, false);
    return function destroyErrors() {
      win.removeEventListener("error", onError, false);
      win.removeEventListener("unhandledrejection", onRejection, false);
    };
  }

  // src/collectors/keyboard.js
  var NAV_KEYS = /* @__PURE__ */ new Set([
    "Tab",
    "Enter",
    "Escape",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Home",
    "End",
    "PageUp",
    "PageDown",
    "Backspace"
  ]);
  function isTextEntry(el) {
    if (!el || el.nodeType !== 1 || !el.tagName) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === "textarea" || el.isContentEditable) return true;
    if (tag !== "input") return false;
    const type = String(el.type || "text").toLowerCase();
    return !["button", "submit", "reset", "checkbox", "radio", "range", "file", "image"].includes(
      type
    );
  }
  function registerKeyboard(ctx) {
    const { doc, config, emit } = ctx;
    let lastKey = "";
    let lastAt = 0;
    function onKeyDown(event) {
      if (config.blockSelectors && matchesAny(event.target, config.blockSelectors)) return;
      let key = event.key;
      const textEntry = isTextEntry(event.target);
      if (key === " ") {
        if (textEntry) return;
        key = "Space";
      }
      if (!NAV_KEYS.has(key)) return;
      if (textEntry && key === "Backspace") return;
      const now = Date.now();
      if (key === lastKey && now - lastAt < 400) return;
      lastKey = key;
      lastAt = now;
      emit("keyboard", {
        key,
        inForm: textEntry,
        target: getDescriptor(event.target, {
          captureText: false,
          maxLength: config.maxTextLength,
          blockSelectors: config.blockSelectors
        })
      });
    }
    doc.addEventListener("keydown", onKeyDown, true);
    return function destroyKeyboard() {
      doc.removeEventListener("keydown", onKeyDown, true);
    };
  }

  // src/viz/heatmap.js
  var HEATMAP_ATTRIBUTE = "data-tw-heatmap";
  function documentSize(doc, win) {
    const root = doc.documentElement;
    const body = doc.body;
    return {
      width: Math.max(root ? root.scrollWidth : 0, body ? body.scrollWidth : 0, win.innerWidth),
      height: Math.max(root ? root.scrollHeight : 0, body ? body.scrollHeight : 0, win.innerHeight)
    };
  }
  function clicksForCurrentPage(logs, doc, win) {
    const currentUrl = win.location ? String(win.location.href) : "";
    return logs.filter((log) => {
      if (!log || log.type !== "click") return false;
      if (typeof log.x !== "number" || typeof log.y !== "number") return false;
      const pageUrl = log.page && log.page.url;
      if (!pageUrl || !currentUrl) return true;
      if (pageUrl === currentUrl) return true;
      return currentUrl.startsWith(`${pageUrl}?`) || currentUrl.startsWith(`${pageUrl}#`);
    });
  }
  function clearHeatmap(doc) {
    if (!doc) return 0;
    const existing = doc.querySelectorAll(`[${HEATMAP_ATTRIBUTE}]`);
    let removed = 0;
    existing.forEach((node) => {
      node.remove();
      removed += 1;
    });
    return removed;
  }
  function renderHeatmap({ doc, win, logs, options = {} }) {
    if (!doc || !doc.body || !win) return null;
    const {
      radius = 24,
      alpha = 0.55,
      maxDots = 2e3,
      replace = true,
      color = "255, 60, 60"
    } = options;
    if (replace) clearHeatmap(doc);
    const clicks = clicksForCurrentPage(logs, doc, win).slice(-maxDots);
    if (!clicks.length) return null;
    const size = documentSize(doc, win);
    const maxDimension = 8192;
    const scale = Math.min(1, maxDimension / Math.max(size.width, size.height, 1));
    const canvas = doc.createElement("canvas");
    canvas.setAttribute(HEATMAP_ATTRIBUTE, "true");
    canvas.width = Math.max(1, Math.round(size.width * scale));
    canvas.height = Math.max(1, Math.round(size.height * scale));
    canvas.style.cssText = [
      "position: absolute",
      "left: 0",
      "top: 0",
      `width: ${size.width}px`,
      `height: ${size.height}px`,
      "pointer-events: none",
      "z-index: 2147483646"
    ].join(";");
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return null;
    ctx2d.scale(scale, scale);
    ctx2d.globalCompositeOperation = "lighter";
    for (const click of clicks) {
      const gradient = ctx2d.createRadialGradient(click.x, click.y, 0, click.x, click.y, radius);
      gradient.addColorStop(0, `rgba(${color}, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(${color}, ${alpha * 0.35})`);
      gradient.addColorStop(1, `rgba(${color}, 0)`);
      ctx2d.fillStyle = gradient;
      ctx2d.beginPath();
      ctx2d.arc(click.x, click.y, radius, 0, Math.PI * 2);
      ctx2d.fill();
    }
    ctx2d.globalCompositeOperation = "source-over";
    ctx2d.fillStyle = "rgba(255, 255, 255, 0.85)";
    for (const click of clicks) {
      ctx2d.beginPath();
      ctx2d.arc(click.x, click.y, 2, 0, Math.PI * 2);
      ctx2d.fill();
    }
    doc.body.appendChild(canvas);
    return canvas;
  }
  function aggregateClicks(logs, options = {}) {
    const { cellSize = 50, doc = null, win = null } = options;
    const source = doc && win ? clicksForCurrentPage(logs, doc, win) : logs.filter((log) => log && log.type === "click");
    const grid = /* @__PURE__ */ new Map();
    for (const click of source) {
      const col = Math.floor(click.x / cellSize);
      const row = Math.floor(click.y / cellSize);
      const key = `${col}:${row}`;
      const cell = grid.get(key) || { col, row, count: 0, x: col * cellSize, y: row * cellSize };
      cell.count += 1;
      grid.set(key, cell);
    }
    const cells = Array.from(grid.values()).sort((a, b) => b.count - a.count);
    return { cells, total: source.length };
  }

  // src/core/tracker.js
  var VERSION = "1.0.0";
  var HISTORY_LIMIT = 1e3;
  function sampleFromHash(visitorId, sampleRate) {
    if (sampleRate >= 1) return true;
    if (sampleRate <= 0) return false;
    const hash = hashText(visitorId);
    const value = parseInt(hash, 36) / 36 ** hash.length;
    return value < sampleRate;
  }
  function createTracker(userConfig = {}, env = {}) {
    const win = env.win || (typeof window !== "undefined" ? window : null);
    const doc = env.doc || (typeof document !== "undefined" ? document : null);
    if (!win || !doc) {
      throw new Error("trackwise.js must run in a browser environment");
    }
    const config = resolveConfig(userConfig, env.scriptData || {});
    const dntBlocked = config.respectDoNotTrack && isDoNotTrackEnabled(win);
    const localStore = createStorage(getBrowserStorage(win, "localStorage"));
    const sessionStore = createStorage(getBrowserStorage(win, "sessionStorage"));
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
        path: String(loc.pathname || ""),
        title: truncate(doc.title || "", 200)
      };
    }
    function buildEvent(type, payload) {
      seq += 1;
      const perfNow = win.performance && typeof win.performance.now === "function" ? Math.round(win.performance.now()) : 0;
      return {
        id: randomId("evt"),
        type,
        seq,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
          if (result && typeof result === "object") event = result;
        } catch (err) {
          void err;
        }
      }
      history.push(event);
      if (history.length > HISTORY_LIMIT) history.splice(0, history.length - HISTORY_LIMIT);
      queue.push(event);
      if (config.debug && win.console && typeof win.console.debug === "function") {
        win.console.debug("[trackwise]", type, event);
      }
      const batchThreshold = Math.min(50, Math.floor(config.maxQueueSize / 2));
      if (config.endpoint && queue.size() >= batchThreshold) {
        flusher.flush("batch");
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
      flusher.flushSync("hidden");
    }
    const onVisibility = () => {
      if (doc.visibilityState === "hidden") onHide();
    };
    function logListener(event) {
      if (typeof config.onLog === "function") {
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
        win.addEventListener("pagehide", onHide);
        doc.addEventListener("visibilitychange", onVisibility);
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
        win.removeEventListener("pagehide", onHide);
        doc.removeEventListener("visibilitychange", onVisibility);
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
        return emit("custom", {
          name: truncate(String(name == null ? "unnamed" : name), 60),
          data: data === void 0 ? null : redactDeep(data)
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
        return flusher.flush("manual");
      },
      onLog(callback) {
        if (typeof callback !== "function") return () => {
        };
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

  // src/index.js
  function readScriptData() {
    const globalConfig = typeof window !== "undefined" && window.TRACKWISE_CONFIG && typeof window.TRACKWISE_CONFIG === "object" ? { ...window.TRACKWISE_CONFIG } : {};
    if (typeof document === "undefined") return globalConfig;
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
  var instance = null;
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
  var TrackWise = {
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
      "[]"
    ),
    clearLogs: withInstance((tracker) => tracker.clearLogs(), false),
    flush: withInstance((tracker) => tracker.flush(), Promise.resolve({ sent: 0 })),
    onLog: withInstance((tracker, cb) => tracker.onLog(cb), () => {
    }),
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
    if (typeof document === "undefined") return false;
    const script = document.currentScript;
    if (!script || !script.dataset) return false;
    if (script.dataset.autoInit === "false") return false;
    return true;
  }
  if (shouldAutoInit()) {
    ensureInstance(true);
  }
  var index_default = TrackWise;
  return __toCommonJS(index_exports);
})();

;if (typeof TrackWise !== 'undefined' && TrackWise && TrackWise.default) {
  TrackWise = TrackWise.default;
}
if (typeof window !== 'undefined' && typeof TrackWise !== 'undefined') {
  window.TrackWise = TrackWise;
}

