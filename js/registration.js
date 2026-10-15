// Form wiring: connects the reminder form to the state machine and the (fake) API.
import { createFormMachine } from './form-machine.js';
import { createFakeApi, TIMEOUT_MS } from './api.js';
import { normalizeText, normalizeEmail, nameProblem } from './sanitize.js';

export function initRegistration(form, { closesAtMs }) {
  const nameInput = form.querySelector('#name');
  const emailInput = form.querySelector('#email');
  const submitBtn = form.querySelector('#submit-btn');
  const resetBtn = form.querySelector('#reset-btn');
  const statusEl = form.querySelector('#form-status');
  const errorEl = form.querySelector('#form-error');
  const closedNote = document.querySelector('#reminder-closed');

  const api = createFakeApi({ closesAtMs });
  const machine = createFormMachine(render);
  const registered = new Set(); // emails that succeeded in this session
  let closed = false;

  // The DOM is a function of the state: every element is set on every change
  function render(state, detail) {
    const busy = state === 'submitting';
    form.dataset.state = state;
    form.setAttribute('aria-busy', String(busy));
    // aria-disabled, not disabled: a disabled button would throw keyboard focus away.
    // The state machine is what actually blocks a second submit.
    submitBtn.setAttribute('aria-disabled', String(busy));
    // Once sign-ups are closed, no state may bring the button back ("Try again" would always fail)
    submitBtn.hidden = state === 'success' || closed;
    submitBtn.textContent = state === 'error' ? 'Try again' : 'Remind me';
    resetBtn.hidden = state !== 'success';
    statusEl.textContent = state === 'submitting'
      ? 'Sending your reminder request…'
      : state === 'success'
        ? `You're on the list, ${detail.name}! We'll remind ${detail.email} the day before Halloween.`
        : '';
    errorEl.textContent = state === 'error' ? detail : '';
    // The focused submit button disappears on success; keep keyboard focus on a visible control
    if (state === 'success') resetBtn.focus();
  }

  function describe(error) {
    if (error?.name === 'TimeoutError') {
      return `The service did not answer within ${TIMEOUT_MS / 1000} seconds. Please press "Try again".`;
    }
    return error?.message || 'Something went wrong. Please press "Try again".';
  }

  // The browser's own validation runs first: this handler only fires for a valid form
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (closed) {
      errorEl.textContent = 'Sign-ups are closed because Halloween has started.';
      return;
    }

    const name = normalizeText(nameInput.value);
    const email = normalizeEmail(emailInput.value);
    const problem = nameProblem(name); // e.g. a name of only spaces passes minlength natively
    if (problem) {
      nameInput.setCustomValidity(problem);
      nameInput.reportValidity();
      return;
    }
    if (registered.has(email)) {
      errorEl.textContent = `${email} is already on the list. One reminder is enough.`;
      return;
    }

    if (!machine.send('SUBMIT')) return; // only idle and error accept SUBMIT: no double submits
    nameInput.value = name; // show exactly what is being sent
    emailInput.value = email;
    try {
      const result = await api.register({ name, email }, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      registered.add(email);
      machine.send('RESOLVE', result);
    } catch (error) {
      machine.send('REJECT', describe(error));
    }
  });

  // Clear a custom error as soon as the name is edited
  nameInput.addEventListener('input', () => nameInput.setCustomValidity(''));

  resetBtn.addEventListener('click', () => {
    form.reset();
    machine.send('RESET');
    nameInput.focus();
  });

  return {
    // Called when Halloween starts. A request already in flight still shows its result.
    close() {
      closed = true;
      closedNote.hidden = false;
      submitBtn.hidden = true;
    },
  };
}
