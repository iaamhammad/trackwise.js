import { throttle } from '../utils/throttle.js';
import { getDescriptor, matchesAny } from '../privacy/sanitize.js';

const MILESTONES = [25, 50, 75, 90, 100];

function pageMetrics(doc, win) {
  const root = doc.documentElement;
  const body = doc.body;
  const docH = Math.max(
    root ? root.scrollHeight : 0,
    body ? body.scrollHeight : 0,
    win.innerHeight
  );
  const y = win.scrollY || win.pageYOffset || 0;
  const depth = Math.min(100, Math.round(((y + win.innerHeight) / Math.max(docH, 1)) * 1000) / 10);
  return { y, docH, depth };
}

function elementMetrics(el) {
  const max = Math.max(el.scrollHeight - el.clientHeight, 1);
  const depth = Math.min(100, Math.round((el.scrollTop / max) * 1000) / 10);
  return { y: el.scrollTop, depth };
}

export function registerScroll(ctx) {
  const { doc, win, config, emit, onPageChange } = ctx;

  let lastY = win.scrollY || 0;
  let lastDirection = 0;
  let reversals = [];
  let maxDepth = 0;
  let erraticCooldown = 0;
  let milestonesDone = new Set();

  function reset() {
    lastY = win.scrollY || 0;
    lastDirection = 0;
    reversals = [];
    maxDepth = 0;
    milestonesDone = new Set();
  }

  function handleScroll(event) {
    const target = event.target;
    const isPageScroll =
      !target || target === doc || target === doc.documentElement || target === doc.body || target === win;

    if (!isPageScroll) {
      if (!target || typeof target.scrollTop !== 'number' || !target.clientHeight) return;
      if (config.blockSelectors && matchesAny(target, config.blockSelectors)) return;
      const metrics = elementMetrics(target);
      emit('scroll', {
        scope: 'element',
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
          emit('erratic_scroll', { reversals: reversals.length, y, depth });
          erraticCooldown = now + 15000;
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
          emit('scroll_depth', { milestone, maxDepth, y });
        }
      }
    }

    lastY = y;

    clearTimeout(scrollEndTimer);
    scrollEndTimer = win.setTimeout(() => {
      const current = pageMetrics(doc, win);
      emit('scroll', {
        scope: 'page',
        y: current.y,
        depth: maxDepth,
        direction: lastDirection
      });
    }, 250);
  }

  let scrollEndTimer = null;
  const handler = throttle(handleScroll, config.scrollThrottleMs);

  doc.addEventListener('scroll', handler, { capture: true, passive: true });
  const unsubscribe = onPageChange(reset);

  return function destroyScroll() {
    doc.removeEventListener('scroll', handler, true);
    unsubscribe();
    if (scrollEndTimer) win.clearTimeout(scrollEndTimer);
  };
}
