/**
 * Founding institute codes, e.g. "HRB-7KQ4-M2XA".
 *
 * A code identifies an institute's workspace without passwords or personal data.
 * It is shared with the institute's teachers and travels inside student report links,
 * so it is NOT a secret credential: it only lets someone (a) record anonymous usage
 * counts for that institute and (b) read those counts. It never unlocks marks,
 * names or contact details. 8 characters from a 31-letter alphabet ≈ 40 bits, plus
 * rate limits, make guessing impractical.
 *
 * Shared by client and server — no Node-only imports here.
 */

/** No 0/O, 1/I/L — codes are read aloud and typed on phones. */
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_PATTERN = /^HRB-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/;

/** Accepts lower case, spaces, missing dashes ("hrb 7kq4m2xa") and returns the canonical form, or null. */
export function normaliseCode(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = raw.startsWith("HRB") ? raw.slice(3) : raw;
  if (body.length !== 8) return null;
  const code = `HRB-${body.slice(0, 4)}-${body.slice(4)}`;
  return CODE_PATTERN.test(code) ? code : null;
}

export function isValidCode(input: unknown): input is string {
  return typeof input === "string" && CODE_PATTERN.test(input);
}

/**
 * Builds a code from random bytes (caller supplies them: crypto.randomBytes on the
 * server, crypto.getRandomValues in tests). Rejection sampling avoids modulo bias.
 */
export function codeFromRandom(next: () => number): string {
  const chars: string[] = [];
  const limit = 256 - (256 % CODE_ALPHABET.length);
  while (chars.length < 8) {
    const b = next();
    if (b < limit) chars.push(CODE_ALPHABET[b % CODE_ALPHABET.length]!);
  }
  return `HRB-${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

/** Founding seats are real and limited; the cap is configurable but defaults to 50. */
export const DEFAULT_FOUNDING_CAP = 50;

export function foundingCap(env: Record<string, string | undefined> = process.env): number {
  const v = Number(env.FOUNDING_CAP ?? env.NEXT_PUBLIC_FOUNDING_CAP);
  return Number.isInteger(v) && v >= 1 && v <= 1000 ? v : DEFAULT_FOUNDING_CAP;
}

/** "#07 of 50" */
export function seatLabel(seat: number | null, cap: number): string | null {
  if (!seat) return null;
  return `#${String(seat).padStart(2, "0")} of ${cap}`;
}
