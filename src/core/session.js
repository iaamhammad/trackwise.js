import { randomId } from '../utils/id.js';

const SESSION_KEY = 'trackwise:session';
const VISITOR_KEY = 'trackwise:visitor';

/**
 * Manages anonymous visitor + session identity with storage-based persistence.
 *
 * @param {object} deps
 * @param {object} deps.sessionStorage - storage wrapper (see utils/storage.js)
 * @param {object} deps.localStorage - storage wrapper
 * @param {number} deps.timeoutMs - inactivity window that ends a session
 * @param {() => number} deps.now
 */
export function createSession({ sessionStorage, localStorage, timeoutMs, now = () => Date.now() }) {
  let visitorId = localStorage.get(VISITOR_KEY);
  if (!visitorId) {
    visitorId = randomId('vis');
    localStorage.set(VISITOR_KEY, visitorId);
  }

  let state = sessionStorage.getJSON(SESSION_KEY, null);
  const currentTime = now();

  if (!state || !state.sessionId || currentTime - (state.lastActive || 0) > timeoutMs) {
    state = {
      sessionId: randomId('ses'),
      startedAt: currentTime,
      lastActive: currentTime
    };
    sessionStorage.setJSON(SESSION_KEY, state);
  }

  let seq = 0;

  return {
    get visitorId() {
      return visitorId;
    },
    get sessionId() {
      return state.sessionId;
    },
    get startedAt() {
      return state.startedAt;
    },
    touch() {
      state.lastActive = now();
      sessionStorage.setJSON(SESSION_KEY, state);
    },
    nextSeq() {
      seq += 1;
      this.touch();
      return seq;
    },
    getSeq() {
      return seq;
    },
    isExpired() {
      return now() - (state.lastActive || 0) > timeoutMs;
    },
    rollIfExpired() {
      if (!this.isExpired()) return false;
      state = {
        sessionId: randomId('ses'),
        startedAt: now(),
        lastActive: now()
      };
      seq = 0;
      sessionStorage.setJSON(SESSION_KEY, state);
      return true;
    },
    reset() {
      state = {
        sessionId: randomId('ses'),
        startedAt: now(),
        lastActive: now()
      };
      seq = 0;
      sessionStorage.setJSON(SESSION_KEY, state);
    }
  };
}
