import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFlusher } from '../src/core/flusher.js';
import { createQueue } from '../src/core/queue.js';

function setup(overrides = {}) {
  const queue = createQueue({ maxSize: 100, storage: null, persist: false });
  const session = { sessionId: 'ses_1', visitorId: 'vis_1' };
  const win = {
    setInterval: () => 1,
    clearInterval: () => {},
    location: { href: 'http://localhost/page' }
  };
  const config = {
    endpoint: '/api/track',
    flushIntervalMs: 5000,
    transport: null,
    ...overrides
  };
  const flusher = createFlusher({ config, queue, session, win, version: '1.0.0' });
  return { queue, flusher, config, session };
}

test('flush delivers queued events with a proper envelope', async () => {
  const sent = [];
  const { queue, flusher } = setup({
    transport: (events, envelope) => {
      sent.push({ events, envelope });
      return true;
    }
  });

  queue.push({ id: 1, type: 'click' });
  queue.push({ id: 2, type: 'scroll' });

  const result = await flusher.flush('manual');
  assert.equal(result.sent, 2);
  assert.equal(queue.size(), 0);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].envelope.sdk, 'trackwise.js');
  assert.equal(sent[0].envelope.sessionId, 'ses_1');
  assert.equal(sent[0].envelope.visitorId, 'vis_1');
  assert.equal(sent[0].envelope.count, 2);
  assert.ok(Array.isArray(sent[0].envelope.events));
});

test('flush requeues events when transport fails', async () => {
  let attempts = 0;
  const { queue, flusher } = setup({
    transport: () => {
      attempts += 1;
      return false;
    }
  });

  queue.push({ id: 1 });
  const result = await flusher.flush('manual');

  assert.equal(result.sent, 0);
  assert.equal(result.failed, true);
  assert.equal(queue.size(), 1);
  assert.equal(attempts, 1);
  assert.equal(flusher.failures, 1);
});

test('failed flush backs off subsequent interval flushes', async () => {
  const { queue, flusher } = setup({
    transport: () => false
  });
  queue.push({ id: 1 });
  await flusher.flush('interval');

  queue.push({ id: 2 });
  const second = await flusher.flush('interval');
  assert.equal(second.skipped, true);
  assert.equal(second.backoff, true);
});

test('flush on empty queue is a no-op', async () => {
  let called = false;
  const { flusher } = setup({
    transport: () => {
      called = true;
      return true;
    }
  });
  const result = await flusher.flush('interval');
  assert.equal(result.sent, 0);
  assert.equal(called, false);
});

test('transport exceptions are treated as failures', async () => {
  const { queue, flusher } = setup({
    transport: () => {
      throw new Error('network down');
    }
  });
  queue.push({ id: 1 });
  const result = await flusher.flush('manual');
  assert.equal(result.failed, true);
  assert.equal(queue.size(), 1);
});

test('flushSync drains queue synchronously via beacon transport', () => {
  const { queue, flusher } = setup({
    transport: () => true
  });
  queue.push({ id: 1 });
  const ok = flusher.flushSync('hidden');
  assert.equal(ok, true);
  assert.equal(queue.size(), 0);
});

test('flushSync restores events when transport returns false', () => {
  const { queue, flusher } = setup({
    transport: () => false
  });
  queue.push({ id: 1 });
  const ok = flusher.flushSync('hidden');
  assert.equal(ok, false);
  assert.equal(queue.size(), 1);
});

test('flushSync restores events when transport rejects', async () => {
  const { queue, flusher } = setup({
    transport: () => Promise.resolve(false)
  });
  queue.push({ id: 1 });
  const ok = flusher.flushSync('hidden');
  assert.equal(ok, true);
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(queue.size(), 1);
});
