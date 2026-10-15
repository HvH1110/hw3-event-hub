// Entry point: connects the countdown engine and the reminder form to the page.
import { parseUtcIso, startCountdown } from './countdown.js';
import { initRegistration } from './registration.js';

const timeEl = document.querySelector('#event-start');
const titleEl = document.querySelector('#countdown-title');
const statusEl = document.querySelector('#countdown-status');
const localEl = document.querySelector('#local-time');
const unitEls = {
  days: document.querySelector('[data-unit="days"]'),
  hours: document.querySelector('[data-unit="hours"]'),
  minutes: document.querySelector('[data-unit="minutes"]'),
  seconds: document.querySelector('[data-unit="seconds"]'),
};

const HALLOWEEN_LENGTH_MS = 24 * 60 * 60 * 1000;
const pad2 = (n) => String(n).padStart(2, '0');

function formatInZone(ms, timeZone) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'shortOffset',
  }).format(ms);
}

// Intl throws a RangeError for an unknown zone; turn that into a message the page can show
function checkTimeZone(zone) {
  if (!zone) throw new Error('The <time> element needs a data-timezone attribute, such as Asia/Ho_Chi_Minh.');
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: zone });
  } catch {
    throw new Error(`"${zone}" is not a valid time zone name, such as Asia/Ho_Chi_Minh.`);
  }
  return zone;
}

// Reads the event time from its single source, the <time datetime> attribute.
// Returns null (and shows the reason) when the attribute or the time zone is invalid.
function readEventTime() {
  try {
    return { targetMs: parseUtcIso(timeEl.dateTime), eventZone: checkTimeZone(timeEl.dataset.timezone) };
  } catch (error) {
    statusEl.textContent = `Countdown unavailable. ${error.message}`;
    return null;
  }
}

function startEventCountdown({ targetMs, eventZone }, onStarted) {
  // The visible date is generated from the same attribute, so it can never disagree with it
  timeEl.textContent = formatInZone(targetMs, eventZone);

  const viewerZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const viewerTime = formatInZone(targetMs, viewerZone);
  // Always filled: its two lines are reserved in CSS, so an empty line would just be a gap
  localEl.textContent = viewerTime === timeEl.textContent
    ? 'That is also the time where you are.'
    : `Where you are, that is ${viewerTime}.`;

  // Halloween lasts one day (Vietnam has no daylight saving), so the end is derived, not stored
  const endMs = targetMs + HALLOWEEN_LENGTH_MS;

  startCountdown({
    targetMs,
    onTick(parts) {
      for (const [unit, el] of Object.entries(unitEls)) el.textContent = pad2(parts[unit]);
    },
    onDone() {
      onStarted();
      if (Date.now() >= endMs) {
        showOver();
        return;
      }
      showStarted();
      // The first countdown has stopped; a second one switches to "over" if the page stays open
      startCountdown({ targetMs: endMs, onTick() {}, onDone: showOver });
    },
  });
}

function showStarted() {
  titleEl.textContent = 'Halloween in Vietnam has started';
  statusEl.textContent = "It's Halloween! Close the laptop and put on a costume.";
}

function showOver() {
  titleEl.textContent = 'Halloween is over for this year';
  statusEl.textContent = 'See you next October. Your calendar is still safe to ignore.';
}

// Order matters: the form must exist before the countdown starts, because a page opened
// after Halloween has started finishes the countdown immediately and closes sign-ups.
const eventTime = readEventTime();
const registration = initRegistration(document.querySelector('#reminder-form'), {
  closesAtMs: eventTime ? eventTime.targetMs : Infinity,
});
if (eventTime) startEventCountdown(eventTime, () => registration.close());
