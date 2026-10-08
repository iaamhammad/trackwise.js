import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  collapseWhitespace,
  truncate,
  redactPII,
  hashText,
  safeText,
  sanitizeUrl,
  redactDeep,
  REDACTED
} from '../src/privacy/sanitize.js';

test('collapseWhitespace normalizes spacing', () => {
  assert.equal(collapseWhitespace('  hello \n world  '), 'hello world');
  assert.equal(collapseWhitespace(null), '');
});

test('truncate appends ellipsis and respects limit', () => {
  assert.equal(truncate('abc', 10), 'abc');
  const out = truncate('a'.repeat(50), 10);
  assert.equal(out.length, 10);
  assert.ok(out.endsWith('…'));
});

test('redactPII masks emails, card numbers and phones', () => {
  assert.ok(redactPII('write to jane.doe+tag@example.co.uk now').includes(REDACTED));
  assert.ok(!redactPII('write to jane.doe+tag@example.co.uk now').includes('jane'));

  const card = redactPII('card 4111 1111 1111 1111 ok');
  assert.ok(card.includes(REDACTED));
  assert.ok(!card.includes('4111'));

  const phone = redactPII('call +1 (555) 123-4567 today');
  assert.ok(phone.includes(REDACTED));

  assert.equal(redactPII('order number 1234 shipped'), 'order number 1234 shipped');
});

test('redactPII keeps short digit runs intact', () => {
  assert.equal(redactPII('room 12 on floor 3'), 'room 12 on floor 3');
});

test('hashText is deterministic and input-sensitive', () => {
  assert.equal(hashText('hello'), hashText('hello'));
  assert.notEqual(hashText('hello'), hashText('hello2'));
  assert.match(hashText('anything'), /^[a-z0-9]+$/);
});

test('safeText collapses, redacts and truncates', () => {
  assert.equal(safeText('  a   b  '), 'a b');
  assert.ok(safeText('mail a@b.com').includes(REDACTED));
  const hashed = safeText('secret text', { hash: true });
  assert.match(hashed, /^#[a-z0-9]+$/);
  assert.equal(safeText('abcdef', { maxLength: 4 }).length, 4);
});

test('sanitizeUrl strips query, hash and credentials', () => {
  assert.equal(
    sanitizeUrl('https://user:pass@example.com/path/page?q=1#section'),
    'https://example.com/path/page'
  );
  assert.equal(sanitizeUrl('/relative/path?x=1#y'), '/relative/path');
  assert.equal(sanitizeUrl(''), '');
});

test('sanitizeUrl keeps relative paths without origin', () => {
  assert.equal(sanitizeUrl('/docs/readme'), '/docs/readme');
});

test('redactDeep scrubs sensitive keys at every depth', () => {
  const input = {
    password: 'hunter2',
    token: 'abc',
    profile: { email: 'a@b.com', name: 'ok', nested: { creditCard: '4111111111111111' } },
    list: [{ secret: 'x' }, { name: 'fine' }]
  };
  const out = redactDeep(input);
  assert.equal(out.password, REDACTED);
  assert.equal(out.token, REDACTED);
  assert.equal(out.profile.email, REDACTED);
  assert.equal(out.profile.name, 'ok');
  assert.equal(out.profile.nested.creditCard, REDACTED);
  assert.equal(out.list[0].secret, REDACTED);
  assert.equal(out.list[1].name, 'fine');
});

test('redactDeep truncates long strings and caps depth', () => {
  const out = redactDeep({ text: 'x'.repeat(500), deep: { a: { b: { c: { d: 'e' } } } } });
  assert.ok(out.text.length <= 100);
  assert.equal(typeof out.deep.a.b, 'object');
});

test('redactDeep passes primitives through', () => {
  assert.equal(redactDeep(42), 42);
  assert.equal(redactDeep(true), true);
  assert.equal(redactDeep(null), null);
});
