import { matchesAny, getDescriptor } from '../privacy/sanitize.js';

const NAV_KEYS = new Set([
  'Tab',
  'Enter',
  'Escape',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Backspace'
]);

function isTextEntry(el) {
  if (!el || el.nodeType !== 1 || !el.tagName) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'textarea' || el.isContentEditable) return true;
  if (tag !== 'input') return false;
  const type = String(el.type || 'text').toLowerCase();
  return !['button', 'submit', 'reset', 'checkbox', 'radio', 'range', 'file', 'image'].includes(
    type
  );
}

export function registerKeyboard(ctx) {
  const { doc, config, emit } = ctx;
  let lastKey = '';
  let lastAt = 0;

  function onKeyDown(event) {
    if (config.blockSelectors && matchesAny(event.target, config.blockSelectors)) return;

    let key = event.key;
    const textEntry = isTextEntry(event.target);

    if (key === ' ') {
      if (textEntry) return;
      key = 'Space';
    }

    if (!NAV_KEYS.has(key)) return;
    if (textEntry && key === 'Backspace') return;

    const now = Date.now();
    if (key === lastKey && now - lastAt < 400) return;
    lastKey = key;
    lastAt = now;

    emit('keyboard', {
      key,
      inForm: textEntry,
      target: getDescriptor(event.target, {
        captureText: false,
        maxLength: config.maxTextLength,
        blockSelectors: config.blockSelectors
      })
    });
  }

  doc.addEventListener('keydown', onKeyDown, true);

  return function destroyKeyboard() {
    doc.removeEventListener('keydown', onKeyDown, true);
  };
}
