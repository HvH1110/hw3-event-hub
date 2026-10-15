# HW3 – Resilient Event Hub: Task Decomposition

## 1. Goal

A landing page for a real event, in vanilla HTML, CSS and JavaScript, built as three slices:

1. **Drift-free countdown** to the event start, from a UTC ISO 8601 timestamp.
2. **State-machine registration form:** Idle → Submitting → Success / Error.
3. **Double-submit prevention and input sanitization**, with zero XSS.

Plus `AI_FAILURE_AUDIT.md`: AI-induced defects caught while reviewing this build (at least three),
how each was diagnosed, and the fix commit.

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
- At zero: stops and shows "It's Halloween!". After the day is over (start + 24 h, derived, not
  stored): "Halloween is over for this year". An invalid date or time zone: "Countdown
  unavailable." with the reason. (The "over" state was added after review test R1.)
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

- `createFakeApi({ closesAtMs }).register({ name, email }, { signal })` resolves after ~1 s.
- Rejects when the browser is offline (DevTools → Network → Offline), when the request takes
  longer than 8 s (`AbortSignal.timeout`), once Halloween has started (sign-ups close), or for the
  documented test hooks: an email ending in `@fail.test` (service error) or `@slow.test` (never
  answers in time, to demonstrate the timeout).
- The page also closes the form when the countdown reaches zero; the API's own check covers a
  request that is already on its way at that moment.

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

## 4. Review Workflow (source for `AI_FAILURE_AUDIT.md`)

Every sub-task follows the same loop, so AI mistakes are caught by tests and stay visible in Git:

1. **Atomic generation:** the AI drafts one sub-task only.
2. **Commit the draft as written:** after reading the diff, the draft is committed as `feat(...)`.
3. **Contract verification:** the sub-task's tests (section 5, written before the code) run in
   headless Chrome through the DevTools protocol, with real key, timer and network behavior.
4. **Every failing test is an AI-induced defect:** it is fixed in its own `fix(...)` commit and
   recorded in `AI_FAILURE_AUDIT.md` (description, how the test or DevTools found it, fix commit).
   `git show <fix commit>` then displays the defect and the fix side by side.

No defects are planted on purpose. If the slices produce fewer than three, the audit says so, and
T-06 adds harder edge-case tests (other time zones, background tabs, offline and slow network).

## 5. Work Breakdown

| ID | Sub-task | Tests (written before the code) | Draft commit |
|----|----------|---------------------------------|--------------|
| T-00 | This spec | Reviewed and agreed | `docs(spec): define component contracts & WBS table` |
| T-01 | HTML: event content, `<time>` contract, countdown and form markup, CSP | 0 divs; 1 `<h1>`; headings in order; every input labelled; `datetime` ends in `Z` and is the only copy of the date; zero console errors | `feat(html): landing page & event time contract` |
| T-02 | Tokens, reset, layout, form-state styles | No horizontal scroll at 320 / 375 / 1280px in both themes; no hex outside `tokens.css`; Lighthouse contrast passes | `feat(css): tokens & landing layout` |
| T-03 | **Slice 1:** drift-free countdown | Display = `target − now`; still exact after a 3 s main-thread freeze; exactly 1 pending timer, 0 after zero; "started" state at zero, never negative; correct text in Vietnam / New York / India time zones; moving the event = 1 attribute; a date without `Z` gives a clear message; re-sync after the tab was hidden | `feat(js): drift-free countdown engine` |
| T-04 | **Slice 2:** state machine + fake API | Every transition in §3.3; every other (state, event) pair ignored; Success; Error via `fail.test`, offline and timeout; retry from Error | `feat(js): registration state machine` |
| T-05 | **Slice 3:** double-submit guard + sanitization | 10 rapid submits and Enter-key spam → 1 request; a registered email is not sent again; XSS payloads shown as text with 0 injected elements; real names accepted; control characters removed; keyboard focus stays on the button while submitting | `feat(sec): double-submit guard & input sanitization` |
| T-06 | Quality audit + edge cases | 375px, keyboard tour, zero CSP violations (`npx serve`), Lighthouse 100 in both themes | `fix(...)` / `perf(...)` as needed |
| T-07 | Final `AI_FAILURE_AUDIT.md` + AI log | Every defect has a test, a diagnosis and a fix commit | `docs(audit): AI failure mode report` |

Defects found by a sub-task's tests are fixed in separate commits right after its draft commit.

## 6. Live Defense Readiness

| Likely request | Where the change goes |
|----------------|-----------------------|
| "Move the event to another date/time" | The `datetime` attribute in `index.html` (UTC, ending in `Z`). |
| "Why `Z`? What if it's missing?" | Without a zone the string is read as the visitor's local time (§3.1). |
| "Midnight where?" | Vietnam. One fixed instant for everyone; other visitors see it in their own clock (§3.1). |
| "Halloween is over, what now?" | The page says "Halloween is over for this year"; next year = change the year in one attribute. |
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
