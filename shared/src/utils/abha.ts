/**
 * ABHA (Ayushman Bharat Health Account) identifier validation.
 *
 * Two different things are called "ABHA" and both are accepted at sign-up:
 *
 *   ABHA number  — 14 digits, conventionally shown in 2-4-4-4 groups
 *                  ("12 3456 7890 1234").
 *   ABHA address — a health handle, "username@suffix" ("ramesh.patil@abdm"),
 *                  which is what a patient actually types to log in.
 *
 * WHAT THIS DOES NOT DO
 * ---------------------
 * This is a *structural* check only. It cannot tell you that an ABHA exists,
 * belongs to the person entering it, or is active — only ABDM can, through the
 * verification APIs, and reaching those needs NHA-issued credentials this
 * deployment does not yet hold (see services/abha/README or the ABHA service).
 *
 * In particular there is deliberately NO checksum here. Aadhaar's 12-digit
 * number carries a documented Verhoeff check digit, and it is tempting to
 * assume the 14-digit ABHA number does too — but that is not published in the
 * ABDM specification, and guessing wrong would reject real ABHA numbers from
 * real patients at the registration form. A wrong checksum is worse than none:
 * it fails closed against legitimate users while adding no real assurance.
 * If NHA publishes the algorithm, add it here and nowhere else.
 *
 * So: treat a `true` from these functions as "worth sending to ABDM", never as
 * "verified".
 */

/** Result of a structural check, with a reason suitable for showing a user. */
export interface AbhaValidationResult {
  valid: boolean;
  /** Present when `valid` is false. Written for the person filling the form. */
  error?: string;
  /** Digits only, separators stripped — the form in which to store/send it. */
  normalized?: string;
}

const ABHA_NUMBER_LENGTH = 14;

/**
 * ABHA addresses permit letters, digits, dot, underscore and hyphen in the
 * local part, must start and end alphanumeric, and are at least 4 characters.
 * The suffix is "abdm" today; others may follow, so any plausible suffix is
 * accepted rather than hard-coding a list that would age badly.
 */
const ABHA_ADDRESS_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{2,}[a-zA-Z0-9])@[a-zA-Z][a-zA-Z0-9]{1,}$/;

/**
 * Validates a 14-digit ABHA number. Spaces and hyphens are accepted as
 * grouping and stripped, because that is how it is printed on the card.
 */
export function validateAbhaNumber(input: unknown): AbhaValidationResult {
  if (typeof input !== 'string' || input.trim() === '') {
    return { valid: false, error: 'Enter your 14-digit ABHA number.' };
  }

  const digits = input.replace(/[\s-]/g, '');

  if (!/^\d+$/.test(digits)) {
    return { valid: false, error: 'An ABHA number contains only digits.' };
  }

  if (digits.length !== ABHA_NUMBER_LENGTH) {
    return {
      valid: false,
      error: `An ABHA number is ${ABHA_NUMBER_LENGTH} digits — you entered ${digits.length}.`,
    };
  }

  return { valid: true, normalized: digits };
}

/** Validates an ABHA address such as "ramesh.patil@abdm". */
export function validateAbhaAddress(input: unknown): AbhaValidationResult {
  if (typeof input !== 'string' || input.trim() === '') {
    return { valid: false, error: 'Enter your ABHA address.' };
  }

  const address = input.trim().toLowerCase();

  if (!address.includes('@')) {
    return { valid: false, error: 'An ABHA address looks like name@abdm.' };
  }

  if (!ABHA_ADDRESS_PATTERN.test(address)) {
    return {
      valid: false,
      error: 'That ABHA address is not in a valid format (for example: ramesh.patil@abdm).',
    };
  }

  return { valid: true, normalized: address };
}

/**
 * Accepts either form. Use this where the field is a single "ABHA" box and the
 * patient may type whichever they remember.
 */
export function validateAbhaIdentifier(input: unknown): AbhaValidationResult {
  if (typeof input === 'string' && input.includes('@')) {
    return validateAbhaAddress(input);
  }
  return validateAbhaNumber(input);
}

/** Formats 14 digits for display as "12 3456 7890 1234". Input may be raw. */
export function formatAbhaNumber(input: string): string {
  const digits = input.replace(/[\s-]/g, '');
  if (digits.length !== ABHA_NUMBER_LENGTH) return input;
  return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 10)} ${digits.slice(10)}`;
}

/**
 * Masks an ABHA number for display in logs, support screens and anywhere the
 * full identifier is not needed: "12 3456 7890 1234" -> "•• •••• •••• 1234".
 */
export function maskAbhaNumber(input: string): string {
  const digits = input.replace(/[\s-]/g, '');
  if (digits.length !== ABHA_NUMBER_LENGTH) return '••••';
  return `•• •••• •••• ${digits.slice(10)}`;
}
