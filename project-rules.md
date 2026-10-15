# Project Architectural Constraints

AI assistants: read this file before proposing any code change.

## Stack
- Use Vanilla HTML5, modern CSS, and ES6+ JS exclusively.
- No jQuery, Bootstrap, Tailwind, or external script CDNs.

## HTML
- Prioritize native semantic HTML over generic `<div>` containers.
- Exactly one `<h1>`; never skip heading levels.
- Every form input has a visible `<label for="...">`.
- Every `<img>` has `alt`, `width` and `height`.

## CSS
- Colors come from custom properties in `:root`; no hard-coded hex codes in rules.
- Mobile-first: verify the 375px viewport (no horizontal scroll) before desktop.
- Use `gap` instead of margins between flex/grid children.

## JavaScript
- Declare variables using `const` by default, `let` only if reassigned. Never `var`.
- Attach events with `addEventListener`; no inline handlers like `onclick=`.
- Never render unescaped user input with `innerHTML` (XSS risk); use `textContent`.
- Keyboard input: `keydown` + `event.key`; never `keypress` or `keyCode`.

## Workflow
- Work on ONE sub-task from `TASK_DECOMPOSITION.md` at a time.
- Do not add files, libraries, or features the current sub-task does not ask for.

## This Project: HW3 Resilient Event Hub
- Event times are UTC ISO 8601 strings ending in `Z`.
- The countdown recomputes from `Date.now()` on every tick; never decrement a counter.
- Form state is exactly one of: `idle`, `submitting`, `success`, `error`.
