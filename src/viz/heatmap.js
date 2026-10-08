const HEATMAP_ATTRIBUTE = 'data-tw-heatmap';

function documentSize(doc, win) {
  const root = doc.documentElement;
  const body = doc.body;
  return {
    width: Math.max(root ? root.scrollWidth : 0, body ? body.scrollWidth : 0, win.innerWidth),
    height: Math.max(root ? root.scrollHeight : 0, body ? body.scrollHeight : 0, win.innerHeight)
  };
}

function clicksForCurrentPage(logs, doc, win) {
  const currentUrl = win.location ? String(win.location.href) : '';
  return logs.filter((log) => {
    if (!log || log.type !== 'click') return false;
    if (typeof log.x !== 'number' || typeof log.y !== 'number') return false;
    const pageUrl = log.page && log.page.url;
    if (!pageUrl || !currentUrl) return true;
    if (pageUrl === currentUrl) return true;
    return currentUrl.startsWith(`${pageUrl}?`) || currentUrl.startsWith(`${pageUrl}#`);
  });
}

export function clearHeatmap(doc) {
  if (!doc) return 0;
  const existing = doc.querySelectorAll(`[${HEATMAP_ATTRIBUTE}]`);
  let removed = 0;
  existing.forEach((node) => {
    node.remove();
    removed += 1;
  });
  return removed;
}

/**
 * Render a click-density heatmap overlay on top of the live page.
 *
 * @param {object} deps
 * @param {Document} deps.doc
 * @param {Window} deps.win
 * @param {Array} deps.logs
 * @param {object} [deps.options]
 * @returns {HTMLCanvasElement|null}
 */
export function renderHeatmap({ doc, win, logs, options = {} }) {
  if (!doc || !doc.body || !win) return null;
  const {
    radius = 24,
    alpha = 0.55,
    maxDots = 2000,
    replace = true,
    color = '255, 60, 60'
  } = options;

  if (replace) clearHeatmap(doc);

  const clicks = clicksForCurrentPage(logs, doc, win).slice(-maxDots);
  if (!clicks.length) return null;

  const size = documentSize(doc, win);
  const maxDimension = 8192;
  const scale = Math.min(1, maxDimension / Math.max(size.width, size.height, 1));

  const canvas = doc.createElement('canvas');
  canvas.setAttribute(HEATMAP_ATTRIBUTE, 'true');
  canvas.width = Math.max(1, Math.round(size.width * scale));
  canvas.height = Math.max(1, Math.round(size.height * scale));
  canvas.style.cssText = [
    'position: absolute',
    'left: 0',
    'top: 0',
    `width: ${size.width}px`,
    `height: ${size.height}px`,
    'pointer-events: none',
    'z-index: 2147483646'
  ].join(';');

  const ctx2d = canvas.getContext('2d');
  if (!ctx2d) return null;

  ctx2d.scale(scale, scale);
  ctx2d.globalCompositeOperation = 'lighter';

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

  ctx2d.globalCompositeOperation = 'source-over';
  ctx2d.fillStyle = 'rgba(255, 255, 255, 0.85)';
  for (const click of clicks) {
    ctx2d.beginPath();
    ctx2d.arc(click.x, click.y, 2, 0, Math.PI * 2);
    ctx2d.fill();
  }

  doc.body.appendChild(canvas);
  return canvas;
}

/**
 * Aggregate clicks into a coarse grid — useful for building your own reports.
 *
 * @param {Array} logs
 * @param {object} [options]
 * @param {number} [options.cellSize]
 * @param {Document} [options.doc]
 * @param {Window} [options.win]
 * @returns {{cells: Array, total: number}}
 */
export function aggregateClicks(logs, options = {}) {
  const { cellSize = 50, doc = null, win = null } = options;
  const source = doc && win ? clicksForCurrentPage(logs, doc, win) : logs.filter((log) => log && log.type === 'click');
  const grid = new Map();

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
