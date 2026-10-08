import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createQueue } from '../src/core/queue.js';
import { createStorage } from '../src/utils/storage.js';

test('queue pushes and reports stats', () => {
  const queue = createQueue({ maxSize: 10, storage: null, persist: false });
  assert.ok(queue.isEmpty());
  queue.push({ id: 1 });
  queue.push({ id: 2 });
  assert.equal(queue.size(), 2);
  assert.deepEqual(queue.stats(), { queued: 2, dropped: 0, total: 2 });
});

test('queue drops oldest events beyond maxSize', () => {
  const queue = createQueue({ maxSize: 5, storage: null, persist: false });
  for (let i = 0; i < 8; i += 1) queue.push({ id: i });
  assert.equal(queue.size(), 5);
  assert.equal(queue.stats().dropped, 3);
  assert.equal(queue.peek()[0].id, 3);
});

test('queue drain removes events and unshift restores them', () => {
  const queue = createQueue({ maxSize: 10, storage: null, persist: false });
  queue.push({ id: 1 });
  queue.push({ id: 2 });
  const taken = queue.drain(1);
  assert.equal(taken.length, 1);
  assert.equal(queue.size(), 1);
  queue.unshift(taken);
  assert.equal(queue.size(), 2);
  assert.equal(queue.peek()[0].id, 1);
});

test('queue notifies onPush listeners and supports unsubscribe', () => {
  const queue = createQueue({ maxSize: 10, storage: null, persist: false });
  const seen = [];
  const off = queue.onPush((event) => seen.push(event.id));
  queue.push({ id: 'a' });
  off();
  queue.push({ id: 'b' });
  assert.deepEqual(seen, ['a']);
});

test('queue persists across instances with shared storage', () => {
  const storage = createStorage(null);
  const first = createQueue({ maxSize: 10, storage, persist: true });
  first.push({ id: 1 });
  first.push({ id: 2 });

  const second = createQueue({ maxSize: 10, storage, persist: true });
  assert.equal(second.size(), 2);
  assert.equal(second.peek()[1].id, 2);
});

test('queue survives listener exceptions', () => {
  const queue = createQueue({ maxSize: 10, storage: null, persist: false });
  queue.onPush(() => {
    throw new Error('listener boom');
  });
  queue.push({ id: 1 });
  assert.equal(queue.size(), 1);
});
