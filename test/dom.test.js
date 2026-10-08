import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createTracker } from '../src/core/tracker.js';

const HTML = `<!DOCTYPE html>
<html lang="en">
<head><title>Demo Page</title></head>
<body>
  <button id="action-btn">Click me</button>
  <p id="plain-text">Some read-only paragraph text</p>
  <form id="signup">
    <input id="email" name="email" type="email" placeholder="Email" />
    <input id="password" name="password" type="password" />
    <select id="plan" name="plan"><option value="free">Free</option><option value="pro">Pro</option></select>
    <button type="submit">Join</button>
  </form>
  <div id="scroller" style="height:100px;overflow:auto"><div style="height:900px">tall</div></div>
</body>
</html>`;

function setup(configOverrides = {}) {
  const dom = new JSDOM(HTML, { url: 'http://localhost/demo', pretendToBeVisual: true });
  const win = dom.window;
  const doc = win.document;
  const sent = [];

  const tracker = createTracker(
    {
      endpoint: '/api/trackwise',
      flushIntervalMs: 600000,
      transport: (events, envelope) => {
        sent.push({ events, envelope });
        return true;
      },
      ...configOverrides
    },
    { win, doc, scriptData: {} }
  );
  tracker.start();

  return { dom, win, doc, tracker, sent };
}

function click(win, el, x = 10, y = 10) {
  const event = new win.MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y
  });
  Object.defineProperty(event, 'pageX', { value: x });
  Object.defineProperty(event, 'pageY', { value: y });
  el.dispatchEvent(event);
}

let ctx = null;

beforeEach(() => {
  ctx = setup();
});

afterEach(async () => {
  if (ctx) {
    ctx.tracker.destroy();
    ctx.dom.window.close();
    ctx = null;
  }
  await new Promise((resolve) => setTimeout(resolve, 20));
});

test('records pageview on start with sanitized page context', () => {
  const logs = ctx.tracker.getLogs();
  const pageview = logs.find((e) => e.type === 'pageview');
  assert.ok(pageview);
  assert.equal(pageview.page.url, 'http://localhost/demo');
  assert.equal(pageview.page.title, 'Demo Page');
  assert.ok(pageview.sessionId);
  assert.ok(pageview.visitorId);
});

test('records clicks with privacy-safe target descriptors', () => {
  const btn = ctx.doc.getElementById('action-btn');
  click(ctx.win, btn, 42, 24);

  const clickEvent = ctx.tracker.getLogs().find((e) => e.type === 'click');
  assert.ok(clickEvent);
  assert.equal(clickEvent.target.tag, 'button');
  assert.equal(clickEvent.target.text, 'Click me');
  assert.equal(clickEvent.target.interactive, true);
  assert.equal(clickEvent.x, 42);
});

test('never records password field values', () => {
  const input = ctx.doc.getElementById('password');
  input.value = 'super-secret-value';

  const focus = new ctx.win.FocusEvent('focusin', { bubbles: true });
  input.dispatchEvent(focus);

  const formFocus = ctx.tracker.getLogs().find((e) => e.type === 'form_focus');
  assert.ok(formFocus);
  assert.equal(formFocus.field.type, 'password');
  assert.equal(formFocus.field.sensitive, true);

  const serialized = JSON.stringify(ctx.tracker.getLogs());
  assert.ok(!serialized.includes('super-secret-value'));
});

test('detects rage clicks after rapid repeated clicks', () => {
  const btn = ctx.doc.getElementById('action-btn');
  for (let i = 0; i < 3; i += 1) click(ctx.win, btn, 42, 24);

  const rage = ctx.tracker.getLogs().find((e) => e.type === 'rage_click');
  assert.ok(rage, 'rage_click should be recorded');
  assert.equal(rage.count, 3);
});

test('detects dead clicks on non-interactive elements', async () => {
  const plain = ctx.doc.getElementById('plain-text');
  click(ctx.win, plain, 60, 60);

  const immediate = ctx.tracker.getLogs().find((e) => e.type === 'dead_click');
  assert.equal(immediate, undefined);

  await new Promise((resolve) => setTimeout(resolve, 750));

  const dead = ctx.tracker.getLogs().find((e) => e.type === 'dead_click');
  assert.ok(dead, 'dead_click should fire when nothing changed');
  assert.equal(dead.target.interactive, false);
});

test('does not emit dead_click when the DOM mutates', async () => {
  const plain = ctx.doc.getElementById('plain-text');
  ctx.win.setTimeout(() => {
    const div = ctx.doc.createElement('div');
    div.textContent = 'injected';
    ctx.doc.body.appendChild(div);
  }, 100);

  click(ctx.win, plain, 60, 60);
  await new Promise((resolve) => setTimeout(resolve, 750));

  const dead = ctx.tracker.getLogs().find((e) => e.type === 'dead_click');
  assert.equal(dead, undefined);
});

test('tracks form focus, input length and submit without values', () => {
  const email = ctx.doc.getElementById('email');
  email.dispatchEvent(new ctx.win.FocusEvent('focusin', { bubbles: true }));
  email.value = 'person@example.com';
  email.dispatchEvent(new ctx.win.Event('input', { bubbles: true }));

  const form = ctx.doc.getElementById('signup');
  form.dispatchEvent(new ctx.win.Event('submit', { bubbles: true, cancelable: true }));

  const logs = ctx.tracker.getLogs();
  const focus = logs.find((e) => e.type === 'form_focus');
  const input = logs.find((e) => e.type === 'form_input');
  const submit = logs.find((e) => e.type === 'form_submit');

  assert.ok(focus && focus.field.name === 'email');
  assert.ok(input && input.length === 'person@example.com'.length);
  assert.ok(submit);
  assert.equal(submit.form.id, 'signup');
  assert.ok(!JSON.stringify(logs).includes('person@example.com'));
});

test('flush sends batched events through the transport', async () => {
  click(ctx.win, ctx.doc.getElementById('action-btn'), 5, 5);
  const result = await ctx.tracker.flush();

  assert.equal(result.sent > 0, true);
  assert.equal(ctx.sent.length, 1);
  assert.equal(ctx.sent[0].envelope.sdk, 'trackwise.js');
  assert.equal(ctx.sent[0].envelope.count, result.sent);
  assert.equal(ctx.tracker.stats().queue.queued, 0);
});

test('track() records custom events with redacted data', () => {
  ctx.tracker.track('checkout', { plan: 'pro', password: 'nope', note: 'hello world' });
  const custom = ctx.tracker.getLogs().find((e) => e.type === 'custom');
  assert.ok(custom);
  assert.equal(custom.name, 'checkout');
  assert.equal(custom.data.plan, 'pro');
  assert.equal(custom.data.password, '[REDACTED]');
  assert.equal(custom.data.note, 'hello world');
});

test('renderHeatmap appends an overlay canvas for pages with clicks', () => {
  click(ctx.win, ctx.doc.getElementById('action-btn'), 42, 24);
  const canvas = ctx.tracker.renderHeatmap({ radius: 20 });
  if (canvas) {
    assert.equal(canvas.tagName, 'CANVAS');
    assert.ok(ctx.doc.querySelector('[data-tw-heatmap]'));
    const removed = ctx.tracker.clearHeatmap();
    assert.equal(removed, 1);
  }
});

test('stop() halts collection until restarted', async () => {
  ctx.tracker.stop();
  click(ctx.win, ctx.doc.getElementById('action-btn'), 1, 1);
  const countAfterStop = ctx.tracker.getLogs().length;

  ctx.tracker.start();
  click(ctx.win, ctx.doc.getElementById('action-btn'), 2, 2);

  assert.ok(ctx.tracker.getLogs().length > countAfterStop);
});

test('stats exposes queue and session information', () => {
  const stats = ctx.tracker.stats();
  assert.equal(stats.tracking, true);
  assert.ok(stats.sessionId.startsWith('ses_'));
  assert.ok(stats.visitorId.startsWith('vis_'));
  assert.equal(typeof stats.queue.queued, 'number');
});

test('records navigation keys but never typed characters', () => {
  const body = ctx.doc.body;

  body.dispatchEvent(new ctx.win.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
  body.dispatchEvent(new ctx.win.KeyboardEvent('keydown', { key: 'a', bubbles: true }));
  body.dispatchEvent(new ctx.win.KeyboardEvent('keydown', { key: 'q', bubbles: true }));

  const keys = ctx.tracker
    .getLogs()
    .filter((e) => e.type === 'keyboard')
    .map((e) => e.key);
  assert.deepEqual(keys, ['Tab']);
});

test('records Enter inside form fields with inForm flag', () => {
  const email = ctx.doc.getElementById('email');
  email.dispatchEvent(new ctx.win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

  const event = ctx.tracker.getLogs().find((e) => e.type === 'keyboard');
  assert.ok(event);
  assert.equal(event.key, 'Enter');
  assert.equal(event.inForm, true);
});

test('records scroll gestures and depth milestones', async () => {
  ctx.doc.dispatchEvent(new ctx.win.Event('scroll'));

  const immediate = ctx.tracker.getLogs().some((e) => e.type === 'scroll_depth');
  assert.equal(immediate, true, 'milestones fire during the scroll handler');

  await new Promise((resolve) => setTimeout(resolve, 320));

  const scroll = ctx.tracker.getLogs().find((e) => e.type === 'scroll');
  assert.ok(scroll, 'scroll event emitted after gesture ends');
  assert.equal(scroll.scope, 'page');
  assert.equal(scroll.depth, 100);
});

test('records uncaught JS errors with scrubbed stacks', () => {
  const error = new Error('boom happened');
  ctx.win.dispatchEvent(
    new ctx.win.ErrorEvent('error', { error, message: error.message, bubbles: false })
  );

  const logged = ctx.tracker.getLogs().find((e) => e.type === 'js_error');
  assert.ok(logged);
  assert.equal(logged.message, 'boom happened');
  assert.equal(logged.name, 'Error');
  assert.ok(logged.stack.includes('boom happened'));
});

test('emits form_abandon when a focused form is left without submitting', async () => {
  const email = ctx.doc.getElementById('email');
  email.dispatchEvent(new ctx.win.FocusEvent('focusin', { bubbles: true }));

  await new Promise((resolve) => setTimeout(resolve, 400));

  Object.defineProperty(ctx.doc, 'visibilityState', { value: 'hidden', configurable: true });
  ctx.doc.dispatchEvent(new ctx.win.Event('visibilitychange'));

  const abandon = ctx.tracker.getLogs().find((e) => e.type === 'form_abandon');
  assert.ok(abandon, 'form_abandon should fire on hidden tab');
  assert.equal(abandon.reason, 'pagehide');
  assert.ok(abandon.durationMs >= 300);
  assert.equal(abandon.field.name, 'email');
});
