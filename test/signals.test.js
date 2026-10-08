import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRageDetector, nearestRectDistance } from '../src/collectors/clicks.js';
import { aggregateClicks } from '../src/viz/heatmap.js';

function detector(options = {}) {
  let clock = 0;
  const rage = createRageDetector(
    { threshold: 3, windowMs: 1000, radiusPx: 40, cooldownMs: 5000, ...options },
    () => clock
  );
  return {
    rage,
    advance(ms) {
      clock += ms;
    }
  };
}

test('rage detector fires after threshold clicks in the same spot', () => {
  const { rage } = detector();
  assert.equal(rage.register(100, 100).rage, false);
  assert.equal(rage.register(105, 102).rage, false);
  const third = rage.register(101, 99);
  assert.equal(third.rage, true);
  assert.equal(third.count, 3);
});

test('rage detector ignores clicks outside the radius', () => {
  const { rage } = detector();
  rage.register(0, 0);
  rage.register(500, 500);
  const third = rage.register(1000, 1000);
  assert.equal(third.rage, false);
});

test('rage detector forgets clicks older than the window', () => {
  const { rage, advance } = detector();
  rage.register(10, 10);
  rage.register(12, 12);
  advance(1500);
  const after = rage.register(14, 14);
  assert.equal(after.rage, false);
  assert.equal(after.count, 1);
});

test('rage detector respects cooldown after a rage burst', () => {
  const { rage, advance } = detector();
  rage.register(50, 50);
  rage.register(51, 51);
  assert.equal(rage.register(52, 52).rage, true);

  advance(100);
  rage.register(50, 50);
  rage.register(51, 51);
  const again = rage.register(52, 52);
  assert.equal(again.rage, false);
  assert.equal(again.cooldown, true);

  advance(5000);
  rage.register(50, 50);
  rage.register(51, 51);
  assert.equal(rage.register(52, 52).rage, true);
});

test('nearestRectDistance measures distance to the closest rect', () => {
  const rects = [
    { left: 0, top: 0, right: 10, bottom: 10 },
    { left: 100, top: 100, right: 110, bottom: 110 }
  ];
  const inside = nearestRectDistance({ x: 5, y: 5 }, rects);
  assert.equal(inside.distance, 0);

  const near = nearestRectDistance({ x: 20, y: 5 }, rects);
  assert.equal(near.distance, 10);

  const diagonal = nearestRectDistance({ x: 20, y: 20 }, rects);
  assert.equal(Math.round(diagonal.distance), Math.round(Math.hypot(10, 10)));
});

test('aggregateClicks buckets clicks into a grid sorted by count', () => {
  const logs = [
    { type: 'click', x: 10, y: 10 },
    { type: 'click', x: 12, y: 15 },
    { type: 'click', x: 70, y: 20 },
    { type: 'mousemove', x: 5, y: 5 }
  ];
  const { cells, total } = aggregateClicks(logs, { cellSize: 50 });

  assert.equal(total, 3);
  assert.equal(cells[0].count, 2);
  assert.deepEqual([cells[0].col, cells[0].row], [0, 0]);
  assert.equal(cells[1].count, 1);
  assert.deepEqual([cells[1].col, cells[1].row], [1, 0]);
});
