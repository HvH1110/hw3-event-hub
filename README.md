# HW3 – Resilient Event Hub: Halloween Countdown for People Over 20

**Live page:** https://hvh1110.github.io/hw3-event-hub/

After 20, your calendar fills up with work, and opening it can ruin your mood. This page counts
down to Halloween (midnight, 31 October, Vietnam time) so you never have to open your calendar,
and lets you sign up for one reminder.

Built for Lab 1 of Web Application Development (University of Information Technology – VNUHCM),
using only HTML, CSS and JavaScript: no frameworks, libraries or build step.

## The Three Slices

1. **Drift-free countdown:** the event instant is stored once, as a UTC ISO 8601 timestamp
   (`<time datetime="2026-10-30T17:00:00Z">`). Every tick recomputes `event − now`, so a late or
   throttled timer cannot make it drift. It shows the date in Vietnam time and in the visitor's
   own time zone, and switches to "It's Halloween!" and then "Halloween is over for this year".
2. **State-machine form:** Idle → Submitting → Success / Error, driven by one transition table;
   anything else is ignored.
3. **Double-submit prevention and input sanitization:** a burst of clicks or Enter presses sends
   one request; input is normalized; user text is only ever displayed with `textContent`, and a
   strict Content-Security-Policy with Trusted Types blocks injected scripts.

Lighthouse: 100 in Performance, Accessibility, Best Practices and SEO (mobile, light and dark),
with zero layout shift.

## Try the Error State

There is no real server, so a fake one simulates it. On the live page:

- an email ending in `@fail.test` → the service answers with an error
- an email ending in `@slow.test` → no answer within 8 seconds (timeout)
- DevTools → Network → Offline → "You seem to be offline"

## Project Structure

```
index.html            page structure; the <time datetime> attribute holds the event instant
css/tokens.css        colors and spacing for light and dark (the only file with color values)
css/reset.css         box-sizing reset, base typography, focus ring
css/landing.css       layout, clock, form states
js/countdown.js       Slice 1: timestamp validation, time math, one self-correcting timer
js/form-machine.js    Slice 2: the registration state machine (no DOM)
js/api.js             the fake registration service
js/sanitize.js        Slice 3: input normalization and validation (no DOM)
js/registration.js    connects the form to the state machine and the service
js/main.js            entry point
```

## Run Locally

The page uses ES modules, so it must be served over HTTP (opening the file directly does not work):

```
npx serve
```

Then open http://localhost:3000. VS Code Live Server also works for editing, but its injected
auto-reload script is blocked by the CSP and logs one console error that is not from this project.

## How It Was Built

Each sub-task was drafted by an AI assistant, committed as written, then tested; every failing
test became its own `fix(...)` commit. Five defects were caught this way.

- [TASK_DECOMPOSITION.md](TASK_DECOMPOSITION.md): plan, contracts, tests and AI log
- [AI_FAILURE_AUDIT.md](AI_FAILURE_AUDIT.md): the five AI-induced defects, how each was found,
  and the fix commit (`git show <commit>`)
