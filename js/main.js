// Entry point: connects the countdown engine to the page.
import { parseUtcIso, startCountdown } from './countdown.js';

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

function initCountdown() {
  let targetMs;
  let eventZone;
  try {
    // Single source of truth: the <time datetime> attribute
    targetMs = parseUtcIso(timeEl.dateTime);
    eventZone = checkTimeZone(timeEl.dataset.timezone);
  } catch (error) {
    statusEl.textContent = `Countdown unavailable. ${error.message}`;
    return;
  }

  // The visible date is generated from the same attribute, so it can never disagree with it
  timeEl.textContent = formatInZone(targetMs, eventZone);

  const viewerZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const viewerTime = formatInZone(targetMs, viewerZone);
  if (viewerTime !== timeEl.textContent) {
    localEl.textContent = `Where you are, that is ${viewerTime}.`;
  }

  startCountdown({
    targetMs,
    onTick(parts) {
      for (const [unit, el] of Object.entries(unitEls)) el.textContent = pad2(parts[unit]);
    },
    onDone() {
      titleEl.textContent = 'Halloween in Vietnam has started';
      statusEl.textContent = "It's Halloween! Close the laptop and put on a costume.";
    },
  });
}

initCountdown();
