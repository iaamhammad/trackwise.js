import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../src/core/session.js';
import { createStorage } from '../src/utils/storage.js';

function makeEnv() {
  const local = createStorage(null);
  const sessionStore = createStorage(null);
  let clock = 1_000_000;
  const now = () => clock;
  return {
    local,
    sessionStore,
    now,
    advance(ms) {
      clock += ms;
    }
  };
}

test('session creates stable visitor and session ids', () => {
  const env = makeEnv();
  const first = createSession({
    sessionStorage: env.sessionStore,
    localStorage: env.local,
    timeoutMs: 60000,
    now: env.now
  });
  const visitorId = first.visitorId;
  const sessionId = first.sessionId;

  first.touch();
  env.advance(1000);
  const second = createSession({
    sessionStorage: env.sessionStore,
    localStorage: env.local,
    timeoutMs: 60000,
    now: env.now
  });

  assert.equal(second.sessionId, sessionId);
  assert.equal(second.visitorId, visitorId);
});

test('session expires after inactivity window', () => {
  const env = makeEnv();
  const first = createSession({
    sessionStorage: env.sessionStore,
    localStorage: env.local,
    timeoutMs: 60000,
    now: env.now
  });
  const oldSession = first.sessionId;

  env.advance(61000);
  const second = createSession({
    sessionStorage: env.sessionStore,
    localStorage: env.local,
    timeoutMs: 60000,
    now: env.now
  });

  assert.notEqual(second.sessionId, oldSession);
  assert.equal(second.visitorId, first.visitorId);
});

test('rollIfExpired starts a new session when idle too long', () => {
  const env = makeEnv();
  const session = createSession({
    sessionStorage: env.sessionStore,
    localStorage: env.local,
    timeoutMs: 60000,
    now: env.now
  });
  const oldSession = session.sessionId;

  assert.equal(session.isExpired(), false);
  assert.equal(session.rollIfExpired(), false);

  env.advance(61000);
  assert.equal(session.isExpired(), true);
  assert.equal(session.rollIfExpired(), true);
  assert.notEqual(session.sessionId, oldSession);
});

test('visitor id persists in localStorage across sessions', () => {
  const env = makeEnv();
  const first = createSession({
    sessionStorage: env.sessionStore,
    localStorage: env.local,
    timeoutMs: 60000,
    now: env.now
  });
  env.advance(999999);
  const second = createSession({
    sessionStorage: createStorage(null),
    localStorage: env.local,
    timeoutMs: 60000,
    now: env.now
  });
  assert.equal(second.visitorId, first.visitorId);
});

test('seq increments monotonically', () => {
  const env = makeEnv();
  const session = createSession({
    sessionStorage: env.sessionStore,
    localStorage: env.local,
    timeoutMs: 60000,
    now: env.now
  });
  assert.equal(session.nextSeq(), 1);
  assert.equal(session.nextSeq(), 2);
  assert.equal(session.getSeq(), 2);
});
