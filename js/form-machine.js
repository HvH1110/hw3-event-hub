// Slice 2: registration state machine. No DOM: it only knows states, events and transitions.
const TRANSITIONS = Object.freeze({
  idle: Object.freeze({ SUBMIT: 'submitting' }),
  submitting: Object.freeze({ RESOLVE: 'success', REJECT: 'error' }),
  error: Object.freeze({ SUBMIT: 'submitting' }),
  success: Object.freeze({ RESET: 'idle' }),
});

// onChange(state, detail) runs after every accepted transition.
export function createFormMachine(onChange) {
  let state = 'idle';
  return {
    get state() {
      return state;
    },
    // Returns false and changes nothing for any (state, event) pair not in the table.
    // Object.hasOwn: names like "constructor" must not match inherited object properties.
    send(event, detail) {
      if (!Object.hasOwn(TRANSITIONS[state], event)) return false;
      state = TRANSITIONS[state][event];
      onChange(state, detail);
      return true;
    },
  };
}
