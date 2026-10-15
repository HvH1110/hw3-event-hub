// Slice 3: input normalization and validation. No DOM.
// XSS is not handled by banning characters here: the page only ever writes user text with
// textContent, and the CSP's Trusted Types make the browser refuse innerHTML with a string.

const CONTROL_CHARS = /\p{Cc}/gu;                      // NUL, tabs, newlines, DEL and similar
const DIRECTION_CHARS = /[‪-‮⁦-⁩]/g; // bidi overrides that disguise text

export const NAME_MIN = 2;
export const NAME_MAX = 80;

export function normalizeText(value) {
  return value
    .normalize('NFC') // one form for accented letters (Vietnamese input can arrive decomposed)
    .replace(CONTROL_CHARS, ' ')
    .replace(DIRECTION_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

// Returns a message for the user, or '' when the (already normalized) name is fine
export function nameProblem(name) {
  const length = [...name].length; // count characters, not UTF-16 code units
  if (length < NAME_MIN) return `Please enter your name (at least ${NAME_MIN} characters).`;
  if (length > NAME_MAX) return `Please keep your name to ${NAME_MAX} characters or fewer.`;
  return '';
}
