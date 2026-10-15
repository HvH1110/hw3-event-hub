# HW3 – Resilient Event Hub: Task Decomposition

## 1. Goal

A landing page for a real event, in vanilla HTML, CSS and JavaScript, built as three slices:

1. **Drift-free countdown** to the event start, from a UTC ISO 8601 timestamp.
2. **State-machine registration form:** Idle → Submitting → Success / Error.
3. **Double-submit prevention and input sanitization**, with zero XSS.

Plus `AI_FAILURE_AUDIT.md`: three AI-induced defects, how each was diagnosed, and the fix.

**Event:** Halloween Countdown for People Over 20.

- **When:** Halloween this year, Saturday 31 October 2026, from 00:00 Vietnam time
  (UTC+7) = `2026-10-30T17:00:00Z`.
- **Idea:** people over 20 have calendars full of work, and opening one can ruin your mood. This
  page counts down to Halloween so you never have to open your calendar to know how long is left.
- **Form:** sign up for a Halloween reminder (name, email, and a fun "I'm over 20" confirmation).
  There is no real server, so nothing is sent; the page says so.

## 2. File Structure

```
index.html
css/tokens.css            colors and spacing (light + dark via prefers-color-scheme)
css/reset.css             box-sizing reset, base typography, focus ring
css/landing.css           layout, countdown, form states
js/countdown.js           Slice 1: countdown engine (pure time math + one self-correcting timer)
js/form-machine.js        Slice 2: registration state machine (no DOM)
js/api.js                 fake registration API (no real server exists)
js/sanitize.js            Slice 3: normalize and validate user input (no DOM)
js/registration.js        form wiring: connects the form, the machine and the API
js/main.js                entry point
AI_FAILURE_AUDIT.md       the AI failure mode report
```

Each JS/CSS commit adds the `<script>` or `<link>` tag for its own file to `index.html`.

## 3. Contracts

### 3.1 Event Time (HTML) — single source of truth

```html
<time id="event-start" datetime="2026-10-30T17:00:00Z" data-timezone="Asia/Ho_Chi_Minh">…</time>
```

- The countdown targets one fixed instant: midnight on 31 October **in Vietnam**. A visitor in
  another country sees the same instant converted to their own clock (for example 18:00 on
  30 October in London), not their own midnight.

- `datetime` is UTC ISO 8601 and **must end in `Z`**. A string without a zone
  (`2026-12-12T09:00`) is read as the visitor's local time, which is the classic timezone bug.
- `data-timezone` is the IANA time zone where the event happens. JS formats the visible date in
  that zone with `Intl.DateTimeFormat`, and also shows the visitor's own local time when it differs.
- Changing the event time = changing one attribute.

### 3.2 Countdown Engine (`js/countdown.js`)

| Function | Contract |
|----------|----------|
| `remainingParts(targetMs, nowMs)` | Pure: `{ days, hours, minutes, seconds, done }`, never negative. |
| `startCountdown({ targetMs, onTick, onDone })` | Starts one timer; returns `stop()`. |

- Every tick recomputes `targetMs - Date.now()`; nothing is decremented, so the display cannot drift.
- `setTimeout` chain (never `setInterval`), scheduled for the next whole second of remaining time.
- Exactly one pending timer at any moment; `stop()` and reaching zero clear it (no leaks).
- When the tab becomes visible again (`visibilitychange`), it re-syncs immediately: browsers slow
  timers down in background tabs.
- At zero: stops and shows "The event has started". Invalid date: shows "Date to be announced".
- The ticking number is `role="timer"` (not announced every second).

### 3.3 Registration State Machine (`js/form-machine.js`)

| State | Event | Next state |
|-------|-------|------------|
| `idle` | `SUBMIT` (input valid) | `submitting` |
| `submitting` | `RESOLVE` | `success` |
| `submitting` | `REJECT` | `error` |
| `error` | `SUBMIT` (retry) | `submitting` |
| `success` | `RESET` ("register another person") | `idle` |

- Any other (state, event) pair is ignored. In particular `SUBMIT` during `submitting` does nothing.
- The current state is mirrored to `form.dataset.state` so CSS can style each state.
- The machine has no DOM code.

### 3.4 Fake API (`js/api.js`)

- `register({ name, email }, { signal })` resolves after ~1 s with a confirmation.
- Rejects when the browser is offline (DevTools → Network → Offline), when the request takes
  longer than 8 s (timeout via `AbortController`), or for any email at `fail.test`
  (a documented test hook for demonstrating the Error state).

### 3.5 Input Handling (`js/sanitize.js`) and Output

- Normalize: Unicode NFC, remove control characters, trim, collapse repeated spaces.
- Validate after normalizing: name 2–80 characters; email must pass the browser's `type="email"`
  check; the "I'm over 20" checkbox is `required`; HTML `maxlength` limits both text fields.
- Output: user text is only ever shown through `textContent`, never `innerHTML`. The CSP with
  Trusted Types makes the browser refuse `innerHTML` with a string anyway.

### 3.6 Double-Submit Prevention

- The state machine ignores `SUBMIT` unless the state is `idle` or `error`.
- The submit button gets `aria-disabled="true"` (not `disabled`, which would throw keyboard focus
  away) and the form gets `aria-busy="true"` while submitting.
- An email that already registered successfully in this session is not sent again.

## 4. One-Shot Experiment (source for `AI_FAILURE_AUDIT.md`)

Slide 25 warns that passing the whole assignment to an AI in one prompt causes timezone and
memory-leak bugs. To test that claim with real output:

1. Before any HW3 code is written, a **separate AI agent** receives the whole HW3 task in one prompt.
2. Its output is kept **outside this repository** (`../hw3-one-shot-experiment/`).
3. It is run against the same tests as this project's slices; every defect found is documented
   in `AI_FAILURE_AUDIT.md` with the diagnostic method and the correct solution.
4. Defects the AI introduces while building this project step by step are added too.

## 5. Work Breakdown

| ID | Sub-task | Done when | Commit |
|----|----------|-----------|--------|
| T-00 | This spec | Reviewed and agreed | `docs(spec): define component contracts & WBS table` |
| T-01 | One-shot experiment + first audit findings | Experiment output tested; findings written | `docs(audit): one-shot experiment findings` |
| T-02 | HTML: event content, `<time>` contract, countdown and form markup, CSP | 0 divs; `datetime` ends in `Z`; form labels | `feat(html): landing page & event time contract` |
| T-03 | Tokens, reset, layout, form-state styles | 375px no horizontal scroll; contrast passes | `feat(css): tokens & landing layout` |
| T-04 | **Slice 1:** drift-free countdown | Correct after main-thread stalls; one timer; stops at zero; correct time zones | `feat(js): drift-free countdown engine` |
| T-05 | **Slice 2:** state machine + fake API | All transitions tested; invalid ones ignored; Error reachable | `feat(js): registration state machine` |
| T-06 | **Slice 3:** double-submit guard + sanitization | 10 rapid submits → 1 request; XSS payloads shown as text | `fix(sec): double-submit guard & input sanitization` |
| T-07 | Quality audit: 375px, keyboard, CSP, Lighthouse (both themes) | All acceptance criteria pass | `fix(...)` / `perf(...)` as needed |
| T-08 | Final `AI_FAILURE_AUDIT.md` + AI log | 3+ defects documented with diagnosis and fix | `docs(audit): AI failure mode report` |

## 6. Live Defense Readiness

| Likely request | Where the change goes |
|----------------|-----------------------|
| "Move the event to another date/time" | The `datetime` attribute in `index.html` (UTC, ending in `Z`). |
| "Why `Z`? What if it's missing?" | Without a zone the string is read as the visitor's local time (§3.1). |
| "Midnight where?" | Vietnam. One fixed instant for everyone; other visitors see it in their own clock (§3.1). |
| "Halloween is over, what now?" | The page shows its "started" state; next year = change the year in one attribute. |
| "Why not `setInterval` and subtract 1 each second?" | Timers are late and are slowed in background tabs; the counter drifts (§3.2). |
| "Add a new form state (e.g. Waitlisted)" | One row in the transition table in `js/form-machine.js` + its status text. |
| "Prove double-submit is impossible" | §3.6: machine guard + `aria-disabled`, and the 10-click test. |

## 7. Acceptance Criteria

- [ ] Countdown matches `target - now` to the second, even after the main thread is blocked
- [ ] Event time shown correctly in the event's time zone and in the visitor's own zone
- [ ] Exactly one timer exists; it is cleared at zero (no leaks)
- [ ] Form goes Idle → Submitting → Success / Error; invalid transitions are ignored
- [ ] 10 rapid submits produce 1 request
- [ ] XSS payloads in any field are displayed as plain text
- [ ] Renders at 375px with zero horizontal scroll; contrast ≥ 4.5:1 in light and dark
- [ ] Full keyboard use; zero console errors; zero CSP violations (served with `npx serve`)

## 8. AI Log

| Task | What I asked the AI | What I checked, changed or rejected |
|------|---------------------|-------------------------------------|
|      |                     |                                     |
