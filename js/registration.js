// Form wiring: connects the reminder form to the state machine and the (fake) API.
import { createFormMachine } from './form-machine.js';
import { createFakeApi, TIMEOUT_MS } from './api.js';

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
  let closed = false;

  // The DOM is a function of the state: every element is set on every change
  function render(state, detail) {
    form.dataset.state = state;
    submitBtn.hidden = state === 'success';
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
    if (!machine.send('SUBMIT')) return; // only idle and error accept SUBMIT
    try {
      const result = await api.register(
        { name: nameInput.value, email: emailInput.value },
        { signal: AbortSignal.timeout(TIMEOUT_MS) },
      );
      machine.send('RESOLVE', result);
    } catch (error) {
      machine.send('REJECT', describe(error));
    }
  });

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
    },
  };
}
