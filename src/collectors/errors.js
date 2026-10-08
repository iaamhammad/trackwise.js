import { truncate, redactPII, sanitizeUrl } from '../privacy/sanitize.js';

function errorPayload(event) {
  const err = event && event.error ? event.error : null;
  const message = (err && err.message) || event.message || 'Unknown error';
  const source = event.filename || (err && err.fileName) || '';
  const payload = {
    message: truncate(redactPII(String(message)), 300),
    name: err && err.name ? String(err.name) : null,
    source: source ? sanitizeUrl(source, { scrubQuery: false }) : null,
    line: event.lineno || null,
    col: event.colno || null,
    stack: err && err.stack ? truncate(redactPII(String(err.stack)), 600) : null
  };
  return payload;
}

export function registerErrors(ctx) {
  const { doc, win, config, emit } = ctx;

  function onError(event) {
    if (event && event.target && event.target !== win && event.target.tagName) return;
    emit('js_error', errorPayload(event));
  }

  function onRejection(event) {
    const reason = event.reason;
    const isErr = reason && typeof reason === 'object';
    emit('promise_rejection', {
      message: truncate(
        redactPII(String((isErr && reason.message) || reason || 'Unknown rejection')),
        300
      ),
      name: isErr && reason.name ? String(reason.name) : null,
      stack: isErr && reason.stack ? truncate(redactPII(String(reason.stack)), 600) : null
    });
  }

  win.addEventListener('error', onError, false);
  win.addEventListener('unhandledrejection', onRejection, false);

  return function destroyErrors() {
    win.removeEventListener('error', onError, false);
    win.removeEventListener('unhandledrejection', onRejection, false);
  };
}
