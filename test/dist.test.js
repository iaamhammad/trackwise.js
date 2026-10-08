import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const bundle = await readFile(new URL('../dist/trackwise.min.js', import.meta.url), 'utf8');

function bootDom() {
  const html = `<!DOCTYPE html>
<html><head><title>Dist Test</title></head>
<body>
  <button id="btn">Launch rocket</button>
  <script data-endpoint="/api/track">${bundle}</script>
</body></html>`;

  return new JSDOM(html, {
    url: 'http://localhost/dist-test',
    runScripts: 'dangerously',
    pretendToBeVisual: true
  });
}

test('IIFE bundle auto-initializes from data attributes', () => {
  const dom = bootDom();
  const TrackWise = dom.window.TrackWise;

  assert.ok(TrackWise, 'window.TrackWise should exist');
  assert.equal(TrackWise.version, '1.0.0');
  assert.equal(TrackWise.isInitialized(), true, 'should auto-init');
  assert.equal(TrackWise.isTracking(), true);
  assert.equal(TrackWise.getConfig().endpoint, '/api/track');

  const pageview = TrackWise.getLogs().find((e) => e.type === 'pageview');
  assert.ok(pageview);
  assert.equal(pageview.page.url, 'http://localhost/dist-test');

  dom.window.close();
});

test('IIFE bundle records clicks end-to-end', () => {
  const dom = bootDom();
  const TrackWise = dom.window.TrackWise;
  const btn = dom.window.document.getElementById('btn');

  const event = new dom.window.MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    clientX: 12,
    clientY: 24
  });
  Object.defineProperty(event, 'pageX', { value: 12 });
  Object.defineProperty(event, 'pageY', { value: 24 });
  btn.dispatchEvent(event);

  const click = TrackWise.getLogs().find((e) => e.type === 'click');
  assert.ok(click);
  assert.equal(click.target.tag, 'button');
  assert.equal(click.target.text, 'Launch rocket');

  const exported = JSON.parse(TrackWise.exportJSON());
  assert.ok(exported.length >= 2);

  dom.window.close();
});

test('CJS bundle exposes the API directly', () => {
  const TrackWise = require('../dist/trackwise.cjs');
  assert.equal(typeof TrackWise.init, 'function');
  assert.equal(typeof TrackWise.track, 'function');
  assert.equal(typeof TrackWise.renderHeatmap, 'function');
  assert.equal(typeof TrackWise.getLogs, 'function');
  assert.equal(TrackWise.version, '1.0.0');
  assert.deepEqual(TrackWise.getLogs(), []);
});
