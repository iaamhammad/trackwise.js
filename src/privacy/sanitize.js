const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]{2,}/g;
const CARD_RE = /(?:\d[ -]?){13,19}/g;
const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/g;
const SENSITIVE_KEY_RE = /pass|pwd|secret|token|auth|session|ssn|social|card|cvv|cvc|credit|iban|email|phone|address|dob|birth/i;

export const REDACTED = '[REDACTED]';

export function collapseWhitespace(text) {
  return String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
}

export function truncate(text, max = 80) {
  const value = String(text == null ? '' : text);
  if (value.length <= max) return value;
  return value.slice(0, max - 1) + '…';
}

export function redactPII(text) {
  return String(text == null ? '' : text)
    .replace(CARD_RE, (match) => {
      const digits = match.replace(/\D/g, '');
      return digits.length >= 13 && digits.length <= 19 ? REDACTED : match;
    })
    .replace(EMAIL_RE, REDACTED)
    .replace(PHONE_RE, (match) => {
      const digits = match.replace(/\D/g, '');
      return digits.length >= 8 ? REDACTED : match;
    });
}

export function hashText(text) {
  const input = String(text == null ? '' : text);
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function safeText(text, options = {}) {
  const { maxLength = 80, hash = false, redact = true } = options;
  const collapsed = collapseWhitespace(text);
  if (!collapsed) return '';
  if (hash) return `#${hashText(collapsed)}`;
  const cleaned = redact ? redactPII(collapsed) : collapsed;
  return truncate(cleaned, maxLength);
}

export function sanitizeUrl(url, options = {}) {
  const { scrubQuery = true, scrubHash = true, scrubCredentials = true } = options;
  const raw = String(url == null ? '' : url);
  if (!raw) return '';

  const isAbsolute = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw) || raw.startsWith('//');
  if (!isAbsolute) {
    const path = raw.split('?')[0].split('#')[0];
    return truncate(path, 200);
  }

  try {
    const parsed = new URL(raw, 'http://placeholder.local');
    if (scrubCredentials) {
      parsed.username = '';
      parsed.password = '';
    }
    if (scrubQuery) parsed.search = '';
    if (scrubHash) parsed.hash = '';
    const origin = parsed.origin === 'http://placeholder.local' ? '' : parsed.origin;
    return truncate(`${origin}${parsed.pathname}`, 300);
  } catch (err) {
    const fallback = raw.split('?')[0].split('#')[0];
    return truncate(fallback, 300);
  }
}

export function matchesAny(el, selectors) {
  if (!el || !selectors || !selectors.length) return false;
  for (const selector of selectors) {
    try {
      if (el.matches && el.matches(selector)) return true;
      if (el.closest && el.closest(selector)) return true;
    } catch (err) {
      void err;
    }
  }
  return false;
}

export function isSensitiveElement(el) {
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input') {
    const type = String(el.type || 'text').toLowerCase();
    if (['password', 'email', 'tel', 'number'].includes(type)) return true;
    if (String(el.autocomplete || '').match(/cc-|onetime/)) return true;
    return false;
  }
  if (tag === 'textarea' || tag === 'select') return true;
  if (el.isContentEditable) return true;
  if (String(el.getAttribute ? el.getAttribute('contenteditable') : '') === 'true') return true;
  return false;
}

const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  'label',
  'summary',
  'option',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[onclick]',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]'
].join(',');

export function interactiveAncestor(el) {
  if (!el || !el.closest) return null;
  return el.closest(INTERACTIVE_SELECTOR);
}

export function isInteractive(el) {
  return interactiveAncestor(el) !== null;
}

function describeSelector(el) {
  if (!el || !el.tagName) return '';
  const parts = [];
  let node = el;
  let depth = 0;
  while (node && node.nodeType === 1 && depth < 5) {
    let part = node.tagName.toLowerCase();
    if (node.id) {
      part += `#${node.id}`;
      parts.unshift(part);
      break;
    }
    if (node.classList && node.classList.length) {
      part += `.${Array.from(node.classList).slice(0, 2).join('.')}`;
    }
    const parent = node.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child) => child.tagName === node.tagName
      );
      if (siblings.length > 1) {
        part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      }
    }
    parts.unshift(part);
    node = node.parentElement;
    depth += 1;
  }
  return truncate(parts.join(' > '), 160);
}

/**
 * Build a privacy-safe descriptor of a DOM element.
 *
 * @param {Element} el
 * @param {object} options
 * @param {boolean} options.captureText
 * @param {boolean} options.hashText
 * @param {number} options.maxLength
 * @param {string[]|null} options.redactSelectors
 * @param {string[]|null} options.allowSelectors
 * @param {string[]|null} options.blockSelectors
 * @returns {object|null}
 */
export function getDescriptor(el, options = {}) {
  if (!el || !el.tagName || el.nodeType !== 1) return null;
  const {
    captureText = true,
    hashText: shouldHash = false,
    maxLength = 80,
    redactSelectors = null,
    allowSelectors = null,
    blockSelectors = null
  } = options;

  if (blockSelectors && matchesAny(el, blockSelectors)) return null;

  const tag = el.tagName.toLowerCase();
  const sensitive = isSensitiveElement(el);
  const redacted = sensitive || (redactSelectors && matchesAny(el, redactSelectors));
  const textAllowed =
    captureText && !redacted && (!allowSelectors || matchesAny(el, allowSelectors));

  const descriptor = {
    tag,
    id: el.id || null,
    classes:
      typeof el.className === 'string' && el.className
        ? truncate(el.className.trim(), 100)
        : null,
    name: el.getAttribute ? el.getAttribute('name') || null : null,
    role: el.getAttribute ? el.getAttribute('role') || null : null,
    path: describeSelector(el),
    interactive: isInteractive(el),
    redacted: !!redacted
  };

  if (tag === 'input' && el.type) descriptor.inputType = String(el.type).toLowerCase();
  if (el.getAttribute) {
    const href = el.getAttribute('href');
    if (href) descriptor.href = sanitizeUrl(href);
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) descriptor.label = safeText(ariaLabel, { maxLength, hash: shouldHash });
  }

  if (redacted) {
    descriptor.text = REDACTED;
  } else if (textAllowed) {
    const text = el.innerText || el.textContent || '';
    descriptor.text = safeText(text, { maxLength, hash: shouldHash });
  } else {
    descriptor.text = null;
  }

  return descriptor;
}

export function redactDeep(value, options = {}, depth = 0) {
  const { maxLength = 100, maxKeys = 40, maxDepth = 4 } = options;

  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return truncate(redactPII(value), maxLength);
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (depth >= maxDepth) return truncate(String(value), maxLength);

  if (Array.isArray(value)) {
    return value.slice(0, maxKeys).map((item) => redactDeep(item, options, depth + 1));
  }

  if (typeof value === 'object') {
    const out = {};
    let count = 0;
    for (const key of Object.keys(value)) {
      if (count >= maxKeys) break;
      count += 1;
      if (SENSITIVE_KEY_RE.test(key)) {
        out[key] = REDACTED;
      } else {
        out[key] = redactDeep(value[key], options, depth + 1);
      }
    }
    return out;
  }

  return truncate(String(value), maxLength);
}
