// Normalizes common Indian phone input formats to E.164 (+91XXXXXXXXXX).
// Returns null if the input doesn't look like a valid number.
export function normalizePhoneToE164(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, '');

  if (digits.startsWith('+91') && digits.length === 13) return digits;
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith('+') && digits.length >= 8) return digits;

  return null;
}
