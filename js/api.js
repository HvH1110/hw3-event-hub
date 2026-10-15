// Fake registration API: there is no real server, so this one simulates it.
// Test hooks (documented on the page and in the plan):
//   email ending in @fail.test  -> the service answers with an error
//   email ending in @slow.test  -> the service never answers in time (client timeout)
export const TIMEOUT_MS = 8000;
const LATENCY_MS = 1000;

// Requests received, so tests can prove that a burst of submits sends only one
export const stats = { requests: 0 };

export function createFakeApi({ closesAtMs }) {
  function register({ name, email }, { signal } = {}) {
    stats.requests += 1;
    return new Promise((resolve, reject) => {
      if (!navigator.onLine) {
        reject(new Error('You seem to be offline. Check your connection, then press "Try again".'));
        return;
      }
      const delay = email.endsWith('@slow.test') ? TIMEOUT_MS * 2 : LATENCY_MS;
      const timer = setTimeout(() => {
        if (Date.now() >= closesAtMs) {
          reject(new Error('Sign-ups are closed because Halloween has started.'));
        } else if (email.endsWith('@fail.test')) {
          reject(new Error('The reminder service is down right now. Please press "Try again".'));
        } else {
          resolve({ name, email });
        }
      }, delay);
      // The caller's timeout (or cancel) stops the simulated request
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(signal.reason);
      }, { once: true });
    });
  }
  return { register };
}
