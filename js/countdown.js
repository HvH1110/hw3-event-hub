// Slice 1: drift-free countdown engine.
// It never decrements a counter: every tick recomputes the remaining time from the clock,
// so a late or throttled timer cannot make the display drift.

const SECOND = 1000;
const UTC_ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?Z$/;

// Accepts only UTC timestamps ending in Z. Without a zone, browsers read the time as the
// visitor's local time, which is the classic timezone bug.
export function parseUtcIso(text) {
  if (!UTC_ISO_8601.test(text)) {
    throw new Error(`The event time must be a UTC timestamp ending in Z, such as 2026-10-30T17:00:00Z (got "${text}").`);
  }
  const ms = Date.parse(text);
  if (Number.isNaN(ms)) throw new Error(`"${text}" is not a real date.`);
  return ms;
}

// Pure: same input, same output. Rounds up, so the display reaches 00 exactly at the target.
export function remainingParts(targetMs, nowMs) {
  const totalSeconds = Math.max(0, Math.ceil((targetMs - nowMs) / SECOND));
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    done: totalSeconds === 0,
  };
}

// Starts exactly one timer and returns stop(). onTick runs on every displayed second,
// onDone once when the target is reached.
export function startCountdown({ targetMs, onTick, onDone }) {
  let timer = null;

  function tick() {
    const now = Date.now();
    const parts = remainingParts(targetMs, now);
    onTick(parts);
    if (parts.done) {
      stop();
      onDone();
      return;
    }
    // Wake up exactly when the displayed second changes, not "1000 ms from now"
    timer = setTimeout(tick, (targetMs - now) % SECOND || SECOND);
  }

  // Background tabs slow timers down; re-sync as soon as the page is visible again
  function onVisibilityChange() {
    if (document.visibilityState !== 'visible') return;
    clearTimeout(timer);
    tick();
  }

  function stop() {
    clearTimeout(timer);
    timer = null;
    document.removeEventListener('visibilitychange', onVisibilityChange);
  }

  document.addEventListener('visibilitychange', onVisibilityChange);
  tick();
  return stop;
}
