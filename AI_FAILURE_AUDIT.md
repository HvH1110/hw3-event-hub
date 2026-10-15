# AI Failure Mode Audit – HW3

## 1. How the Defects Were Caught

All code in this project was drafted by an AI assistant (Claude Code), one sub-task at a time.
For every sub-task:

1. The AI's draft was committed **exactly as written** (`feat(...)` commits).
2. The sub-task's **planned tests** (written in `TASK_DECOMPOSITION.md` before the code) ran in
   headless Chrome through the DevTools protocol: real key presses, real timers, offline mode,
   time-zone emulation and a shifted page clock.
3. **Review tests** then probed situations the plan had not considered (after the event, typos,
   impossible input, a request in flight at midnight, visitors in other time zones).
4. Every failure became its **own `fix(...)` commit**, so `git show <fix>` displays the defect and
   the fix side by side.

No defect was planted on purpose. Five were found.

| # | Defect | Found by | In draft | Fixed in |
|---|--------|----------|----------|----------|
| 1 | Impossible dates silently accepted (31 February → 3 March) | Review test R3 + Node unit test | `8253662` | `7e59b75` |
| 2 | A time-zone typo crashed the countdown with no message | Review test R2 | `8253662` | `57f354e` |
| 3 | Page says "It's Halloween!" forever, even in November | Review test R1 | `8253662` | `ba7c4e2` |
| 4 | "Try again" offered after sign-ups closed, though it can never succeed | Review tests R4, R5 | `d7a9eed` | `ff8e17e` |
| 5 | Layout shift after load (CLS 0.002; 0.017 for visitors abroad) | Lighthouse + layout-shift observer | `bc24149`, `8253662` | `e8733f1`, `c9c456c` |

**Every draft passed all of its planned tests.** All five defects were in situations nobody had
written down, which is the main lesson of this audit.

## 2. Defects

### Defect 1 — Impossible dates silently accepted

- **Description:** `parseUtcIso` checked the *format* of the timestamp, then trusted `Date.parse`.
  Chrome's parser rolls impossible dates over instead of rejecting them, so
  `2026-02-31T17:00:00Z` quietly became 3 March and the countdown targeted the wrong day.

  ```js
  // js/countdown.js in 8253662 (draft)
  const ms = Date.parse(text);
  if (Number.isNaN(ms)) throw new Error(`"${text}" is not a real date.`);
  return ms;
  ```

- **Diagnostic method:** review test R3 set `datetime="2026-02-31T17:00:00Z"`: the page showed
  "Wednesday, 4 March 2026" (Vietnam time) and said "It's Halloween!". A Node check confirmed
  `Date.parse('2026-02-31T17:00:00Z')` returns 3 March instead of `NaN`.
- **Refactored solution (`7e59b75`):** the parsed instant must read back (`toISOString()`) as the
  same date and time that was written. A unit test of 9 inputs confirmed: 31 Feb, 29 Feb 2026,
  hour 24 and month 13 are rejected with a clear message; all valid forms (with or without
  seconds or a fraction, and 29 Feb 2028) are accepted.

### Defect 2 — A time-zone typo crashed the countdown with no message

- **Description:** the date was validated inside a `try`, but the time zone was used outside it.
  A typo in `data-timezone` made `Intl.DateTimeFormat` throw an uncaught `RangeError`: the
  countdown stayed at `--`, the page said nothing, and only the console showed an error.

  ```js
  // js/main.js in 8253662 (draft), after the try/catch
  const eventZone = timeEl.dataset.timezone;
  timeEl.textContent = formatInZone(targetMs, eventZone);
  ```

- **Diagnostic method:** review test R2 set `data-timezone="Asia/Saigonn"` and read the page and
  the DevTools console.
- **Refactored solution (`57f354e`):** the zone is checked inside the same `try` as the date
  (`checkTimeZone`). A wrong or missing zone now shows "Countdown unavailable." with the reason,
  and the console is clean.

### Defect 3 — "It's Halloween!" forever

- **Description:** the draft only knew two states, "before" and "started". Opened on
  15 November, the page still told the visitor to put on a costume. The plan's own contract had the
  same gap ("at zero: shows started"), so the planned tests could not catch it.

  ```js
  // js/main.js in 8253662 (draft)
  onDone() {
    titleEl.textContent = 'Halloween in Vietnam has started';
    statusEl.textContent = "It's Halloween! Close the laptop and put on a costume.";
  },
  ```

- **Diagnostic method:** review test R1 moved the page clock to 15 November 2026
  (`Date.now` shifted before the page's scripts ran).
- **Refactored solution (`ba7c4e2`):** Halloween ends at start + 24 h (derived, not stored a second
  time). Opened later, the page says "Halloween is over for this year". Left open across the end, a
  second countdown, started only after the first one stops, switches it. Timer count verified:
  1 during Halloween, 0 afterwards. The plan's contract was corrected in the same commit.

### Defect 4 — "Try again" offered when it can never succeed

- **Description:** after Halloween started, the form kept its "Remind me" button. A request that was
  in flight at midnight came back as an Error with a "Try again" button. Every retry is refused
  ("Sign-ups are closed"), so the UI invited an action that cannot work.

  ```js
  // js/registration.js in d7a9eed (draft)
  submitBtn.hidden = state === 'success';
  submitBtn.textContent = state === 'error' ? 'Try again' : 'Remind me';
  ```

- **Diagnostic method:** review test R4 opened the page during Halloween; R5 sent a sign-up at
  23:59:59 Vietnam time so the 1-second answer arrived after midnight. Both printed the visible
  buttons after each step.
- **Refactored solution (`ff8e17e`):** `close()` hides the submit button, and `render()` keeps it
  hidden in every later state, so a late answer cannot bring it back.

### Defect 5 — Layout shift after load, worst for visitors abroad

- **Description:** text that JavaScript fills in after load changed size: the `--` clock
  placeholders are narrower than digits (the centered values moved sideways), the event date
  replaced a shorter fallback text, and the "Where you are, that is …" line appeared from nothing
  for visitors outside Vietnam, pushing the form down.

  ```css
  /* css/landing.css in bc24149 (draft): nothing reserved the width of the value */
  .clock-value {
    font-size: clamp(1.75rem, 1rem + 4vw, 3rem);
    font-variant-numeric: tabular-nums;
  }
  ```

- **Diagnostic method:** Lighthouse reported CLS 0.002 (its score stayed 100, but slide 21's
  quality gate requires zero layout shift). A `PerformanceObserver` for `layout-shift` listed the
  elements that moved. Repeating the measurement with **time-zone emulation** found a shift
  8× larger (0.017) for a New York visitor, which **Lighthouse cannot see**, because it runs in
  this machine's own (Vietnam) time zone.
- **Refactored solution (`e8733f1`, `c9c456c`):** clock values reserve two digits; the event-time and
  local-time lines reserve two lines each; the local-time line is always filled. Measured CLS:
  0.0000 at 320 / 375 / 412 / 1280 px for visitors in Vietnam, New York and India.

## 3. What the Tests Confirmed Works

The drafts were correct on the points slide 25 warns about; the tests checked them rather than
assuming:

- **No drift:** the display stayed exact (0 s off) after the main thread was frozen for 3 s.
- **No timer leaks:** exactly 1 pending timer while counting, 0 after the event; repeated
  `visibilitychange` events never stacked timers; no `setInterval` anywhere.
- **Time zones:** correct local times for Vietnam, New York (13:00 GMT-4) and India (22:30 GMT+5:30).
- **State machine:** all 40 (state, event) pairs correct, including names like `constructor`.
- **Double submit:** 10 rapid clicks and 10 real Enter key presses each sent exactly 1 request.
- **XSS:** attack strings in the name were displayed as plain text; 0 elements injected; no script ran.

## 4. Showing the Defects in the Interview

```
git log --oneline                 # each feat(...) draft is followed by its fix(...) commits
git show 7e59b75                  # Defect 1: impossible dates
git show 57f354e                  # Defect 2: time-zone typo
git show ba7c4e2                  # Defect 3: "It's Halloween!" forever
git show ff8e17e                  # Defect 4: "Try again" after sign-ups closed
git show e8733f1                  # Defect 5: layout shift
```

Each fix commit's message records the defect, the test that found it, and how the fix was verified.

## 5. Lessons

1. **Passing the planned tests is not the same as being correct.** Every draft passed its planned
   tests; the defects lived in situations nobody had written down: after the event, typos,
   impossible input, a request in flight at the deadline.
2. **Tools only test the conditions they run in.** Lighthouse could not see the layout shift for
   visitors in other time zones, just as it audited the dark theme by mistake in HW1.
3. **Check what the UI promises, not only the logic.** In Defect 4 the server and the state machine
   were right; the bug was a button promising something impossible.
4. **Commit the AI draft before testing it.** It keeps every defect visible in Git, with the exact
   fix next to it.
