import {
  getDescriptor,
  matchesAny,
  interactiveAncestor
} from '../privacy/sanitize.js';
import { throttle } from '../utils/throttle.js';

/**
 * Detects rage clicks: N clicks in roughly the same spot within a time window.
 *
 * @param {object} options
 * @param {number} options.threshold
 * @param {number} options.windowMs
 * @param {number} options.radiusPx
 * @param {number} options.cooldownMs
 * @param {() => number} options.clock
 */
export function createRageDetector(options = {}, clock = null) {
  const { threshold = 3, windowMs = 1000, radiusPx = 40, cooldownMs = 5000 } = options;
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

export function nearestRectDistance(point, rects) {
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
  const seen = new Set();
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

const INTERACTIVE_PROBE = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  'label',
  '[role="button"]',
  '[role="link"]',
  '[onclick]',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

export function registerClicks(ctx) {
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
    if (typeof win.MutationObserver !== 'function') return;
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
        emit('dead_click', {
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

    emit('click', {
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
      emit('rage_click', {
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
      emit('misclick', {
        x: event.pageX,
        y: event.pageY,
        distance: misclick.distance,
        target: descriptor,
        intended: intended
      });
    }

    if (!interactiveAncestor(el)) {
      scheduleDeadClick(el, descriptor, event);
    }
  }

  doc.addEventListener('click', onClick, true);

  return function destroyClicks() {
    doc.removeEventListener('click', onClick, true);
    cancelDeadWatch();
    rageDetector.reset();
  };
}

export function registerMouse(ctx) {
  const { doc, win, config, emit } = ctx;

  const onMove = throttle((event) => {
    emit('mousemove', {
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
      emit('mouseleave', {
        x: event.pageX,
        y: event.pageY,
        viewportW: win.innerWidth,
        viewportH: win.innerHeight
      });
    }
  };

  doc.addEventListener('mousemove', onMove, { passive: true });
  doc.addEventListener('mouseleave', onLeave, { passive: true });

  return function destroyMouse() {
    doc.removeEventListener('mousemove', onMove);
    doc.removeEventListener('mouseleave', onLeave);
  };
}
