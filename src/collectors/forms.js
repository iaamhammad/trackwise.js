import {
  isSensitiveElement,
  matchesAny,
  safeText,
  sanitizeUrl,
  truncate,
  redactPII
} from '../privacy/sanitize.js';

function fieldInfo(el) {
  const tag = el.tagName.toLowerCase();
  let label = el.getAttribute ? el.getAttribute('aria-label') : null;
  if (!label && el.labels && el.labels.length) label = el.labels[0].textContent;
  if (!label && el.getAttribute) label = el.getAttribute('placeholder');

  return {
    tag,
    name: (el.name || null) && String(el.name).slice(0, 60),
    id: el.id || null,
    type: tag === 'input' ? String(el.type || 'text').toLowerCase() : null,
    label: label ? safeText(label, { maxLength: 60 }) : null,
    formId: el.form ? el.form.id || null : null,
    sensitive: isSensitiveElement(el)
  };
}

function isFormField(el) {
  if (!el || el.nodeType !== 1 || !el.tagName) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  return el.isContentEditable === true || el.getAttribute('contenteditable') === 'true';
}

function formInfo(form) {
  if (!form) return null;
  return {
    id: form.id || null,
    action: form.action ? sanitizeUrl(form.action) : null,
    method: form.method ? String(form.method).toLowerCase() : 'get',
    fieldCount: form.elements ? form.elements.length : null
  };
}

export function registerForms(ctx) {
  const { doc, win, config, emit, onPageChange } = ctx;
  const inputThrottle = new WeakMap();
  let active = null;

  function shouldSkip(el) {
    return config.blockSelectors && matchesAny(el, config.blockSelectors);
  }

  function onFocusIn(event) {
    const el = event.target;
    if (!isFormField(el) || shouldSkip(el)) return;
    const now = Date.now();
    active = {
      el,
      focusAt: now,
      firstFocusAt: active && active.el === el ? active.firstFocusAt : now,
      field: fieldInfo(el),
      submitted: false
    };
    emit('form_focus', {
      field: active.field,
      form: formInfo(el.form)
    });
  }

  function onInput(event) {
    const el = event.target;
    if (!isFormField(el) || shouldSkip(el)) return;
    const now = Date.now();
    const last = inputThrottle.get(el) || 0;
    if (now - last < 1000) return;
    inputThrottle.set(el, now);
    const value = typeof el.value === 'string' ? el.value : el.textContent || '';
    emit('form_input', {
      field: fieldInfo(el),
      length: value.length,
      empty: value.length === 0
    });
  }

  function onChange(event) {
    const el = event.target;
    if (!isFormField(el) || shouldSkip(el)) return;
    const tag = el.tagName.toLowerCase();
    const payload = { field: fieldInfo(el) };

    if (tag === 'select') {
      payload.selectedIndex = typeof el.selectedIndex === 'number' ? el.selectedIndex : null;
      payload.optionCount = el.options ? el.options.length : null;
    } else if (tag === 'input' && ['checkbox', 'radio'].includes(String(el.type).toLowerCase())) {
      payload.checked = !!el.checked;
      payload.value = safeText(el.value || '', { maxLength: 40 });
    } else if (el.isContentEditable) {
      payload.length = (el.textContent || '').length;
    }

    emit('form_change', payload);
  }

  function onInvalid(event) {
    const el = event.target;
    if (!el || el.nodeType !== 1 || shouldSkip(el)) return;
    emit('form_error', {
      field: fieldInfo(el),
      message: truncate(redactPII(el.validationMessage || ''), 140)
    });
  }

  function onSubmit(event) {
    const form = event.target;
    if (!form || shouldSkip(form)) return;
    const now = Date.now();
    const payload = {
      form: formInfo(form),
      hesitationMs: active && active.focusAt ? now - active.focusAt : null,
      focusCount: null
    };
    if (active && active.el && form.contains && form.contains(active.el)) {
      payload.field = active.field;
      payload.fieldDurationMs = now - active.focusAt;
      active.submitted = true;
    }
    emit('form_submit', payload);
    active = null;
  }

  function maybeAbandon(reason) {
    if (!active || active.submitted) return;
    const elapsed = Date.now() - active.focusAt;
    if (elapsed < 300) {
      active = null;
      return;
    }
    const { el, ...rest } = active;
    void el;
    emit('form_abandon', { ...rest, reason, durationMs: elapsed });
    active = null;
  }

  doc.addEventListener('focusin', onFocusIn, true);
  doc.addEventListener('input', onInput, true);
  doc.addEventListener('change', onChange, true);
  doc.addEventListener('invalid', onInvalid, true);
  doc.addEventListener('submit', onSubmit, true);

  const onVisibility = () => {
    if (doc.visibilityState === 'hidden') maybeAbandon('pagehide');
  };
  const onPageHide = () => maybeAbandon('pagehide');
  const unsubscribePage = onPageChange(() => maybeAbandon('navigation'));
  doc.addEventListener('visibilitychange', onVisibility);
  win.addEventListener('pagehide', onPageHide);

  return function destroyForms() {
    doc.removeEventListener('focusin', onFocusIn, true);
    doc.removeEventListener('input', onInput, true);
    doc.removeEventListener('change', onChange, true);
    doc.removeEventListener('invalid', onInvalid, true);
    doc.removeEventListener('submit', onSubmit, true);
    doc.removeEventListener('visibilitychange', onVisibility);
    win.removeEventListener('pagehide', onPageHide);
    unsubscribePage();
    active = null;
  };
}
