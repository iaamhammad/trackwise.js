import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDataAttributes,
  resolveConfig,
  isDoNotTrackEnabled,
  DEFAULT_CONFIG
} from '../src/core/config.js';

test('parseDataAttributes maps kebab keys to camelCase config', () => {
  const parsed = parseDataAttributes({
    endpoint: '/api/track',
    'flush-interval': '2000',
    'sample-rate': '0.5',
    'mousemove-throttle': '100',
    'capture-scroll': 'false',
    debug: 'true',
    'block-selectors': '.ad, [data-nope]',
    unrelated: 'ignored'
  });

  assert.equal(parsed.endpoint, '/api/track');
  assert.equal(parsed.flushIntervalMs, '2000');
  assert.equal(parsed.sampleRate, '0.5');
  assert.equal(parsed.mousemoveThrottleMs, '100');
  assert.equal(parsed.captureScroll, 'false');
  assert.equal(parsed.blockSelectors, '.ad, [data-nope]');
  assert.equal(parsed.unrelated, undefined);
});

test('resolveConfig clamps numeric ranges', () => {
  const config = resolveConfig({
    sampleRate: 5,
    flushIntervalMs: 10,
    maxQueueSize: 3,
    mousemoveThrottleMs: 1,
    sessionTimeoutMs: 1,
    maxTextLength: 9999
  });

  assert.equal(config.sampleRate, 1);
  assert.equal(config.flushIntervalMs, 1000);
  assert.equal(config.maxQueueSize, 10);
  assert.equal(config.mousemoveThrottleMs, 50);
  assert.equal(config.sessionTimeoutMs, 60000);
  assert.equal(config.maxTextLength, 300);
});

test('resolveConfig coerces booleans from strings', () => {
  const config = resolveConfig({
    debug: 'true',
    captureForms: 'no',
    respectDoNotTrack: '0'
  });
  assert.equal(config.debug, true);
  assert.equal(config.captureForms, false);
  assert.equal(config.respectDoNotTrack, false);
});

test('resolveConfig splits selector strings and merges rageClick', () => {
  const config = resolveConfig({
    blockSelectors: '.skip, [data-x]',
    rageClick: { threshold: 5 }
  });
  assert.deepEqual(config.blockSelectors, ['.skip', '[data-x]']);
  assert.equal(config.rageClick.threshold, 5);
  assert.equal(config.rageClick.windowMs, DEFAULT_CONFIG.rageClick.windowMs);
});

test('resolveConfig validates callbacks and endpoint', () => {
  const config = resolveConfig({ onLog: 'nope', endpoint: '/x', transport: null });
  assert.equal(config.onLog, null);
  assert.equal(config.endpoint, '/x');
  assert.equal(config.transport, null);
});

test('isDoNotTrackEnabled detects DNT headers', () => {
  assert.equal(isDoNotTrackEnabled({ navigator: { doNotTrack: '1' } }), true);
  assert.equal(isDoNotTrackEnabled({ navigator: { doNotTrack: '0' } }), false);
  assert.equal(isDoNotTrackEnabled({ navigator: {} }), false);
  assert.equal(isDoNotTrackEnabled(null), false);
});
