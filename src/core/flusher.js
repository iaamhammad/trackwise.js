function isSameOrigin(url, win) {
  try {
    const base = win.location ? win.location.href : 'http://localhost/';
    return new URL(url, base).origin === new URL(base, base).origin;
  } catch (err) {
    return true;
  }
}

function beaconTransport(win, endpoint, envelope) {
  const payload = JSON.stringify(envelope);
  try {
    if (win.navigator && typeof win.navigator.sendBeacon === 'function') {
      const blob = isSameOrigin(endpoint, win)
        ? new win.Blob([payload], { type: 'application/json' })
        : payload;
      if (win.navigator.sendBeacon(endpoint, blob)) return true;
    }
  } catch (err) {
    void err;
  }
  if (typeof win.fetch === 'function') {
    return win
      .fetch(endpoint, {
        method: 'POST',
        keepalive: true,
        headers: { 'content-type': 'application/json' },
        body: payload
      })
      .then((res) => res.ok)
      .catch(() => false);
  }
  return false;
}

/**
 * Batches queued events and dispatches them to the configured endpoint.
 *
 * @param {object} deps
 * @param {object} deps.config
 * @param {object} deps.queue
 * @param {object} deps.session
 * @param {object} deps.win
 * @param {string} deps.version
 */
export function createFlusher({ config, queue, session, win, version = '1.0.0' }) {
  let timer = null;
  let sending = false;
  let failures = 0;
  let backoffUntil = 0;

  function buildEnvelope(events) {
    return {
      sdk: 'trackwise.js',
      version,
      sessionId: session.sessionId,
      visitorId: session.visitorId,
      sentAt: new Date().toISOString(),
      count: events.length,
      dropped: queue.stats().dropped,
      events
    };
  }

  function transport(events, envelope) {
    if (typeof config.transport === 'function') {
      return config.transport(events, envelope);
    }
    if (!config.endpoint) return false;
    return beaconTransport(win, config.endpoint, envelope);
  }

  async function flush(reason = 'interval') {
    if (sending) return { sent: 0, reason, skipped: true };
    if (!queue.size()) return { sent: 0, reason };

    const now = Date.now();
    if (reason === 'interval' && now < backoffUntil) {
      return { sent: 0, reason, skipped: true, backoff: true };
    }

    sending = true;
    const events = queue.drain();
    const envelope = buildEnvelope(events);

    let ok = false;
    try {
      ok = await Promise.resolve(transport(events, envelope));
    } catch (err) {
      ok = false;
    }

    if (ok) {
      failures = 0;
      backoffUntil = 0;
    } else {
      failures += 1;
      backoffUntil = Date.now() + Math.min(30000, 1000 * 2 ** Math.min(failures, 5));
      queue.unshift(events);
      queue.save();
    }

    sending = false;
    return { sent: ok ? events.length : 0, reason, failed: !ok };
  }

  function flushSync(reason = 'beacon') {
    void reason;
    if (!config.endpoint || !queue.size()) return false;
    const events = queue.drain();
    const envelope = buildEnvelope(events);
    try {
      const result = transport(events, envelope);
      if (result === true) return true;
      if (result && typeof result.then === 'function') {
        result
          .then((ok) => {
            if (!ok) {
              queue.unshift(events);
              queue.save();
            }
          })
          .catch(() => {
            queue.unshift(events);
            queue.save();
          });
        return true;
      }
    } catch (err) {
      void err;
    }
    queue.unshift(events);
    queue.save();
    return false;
  }

  return {
    start() {
      if (timer) return;
      timer = win.setInterval(() => {
        flush('interval');
      }, config.flushIntervalMs);
    },
    stop() {
      if (timer) {
        win.clearInterval(timer);
        timer = null;
      }
    },
    flush,
    flushSync,
    buildEnvelope,
    get failures() {
      return failures;
    }
  };
}
