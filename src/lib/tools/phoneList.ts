/**
 * Optional roll-number → WhatsApp number list for one-tap sending. Parsed and kept only on
 * the teacher's device; never part of a report link or sent to Heramb.
 *
 *   R01 9876543210
 *   R02, +91 98765 43211
 *   R03<TAB>919876543212
 */
export type PhoneParse = { phones: Map<string, string>; bad: string[] };

/** Normalises an Indian mobile number to 91XXXXXXXXXX; other countries need their code. */
export function normalisePhone(raw: string): string | null {
  const d = raw.replace(/[^\d]/g, "").replace(/^0+/, "");
  if (/^[6-9]\d{9}$/.test(d)) return `91${d}`;
  if (/^91[6-9]\d{9}$/.test(d)) return d;
  if (/^\d{11,15}$/.test(d) && !d.startsWith("91")) return d;
  return null;
}

export function parsePhoneList(text: string): PhoneParse {
  const phones = new Map<string, string>();
  const bad: string[] = [];
  for (const line of text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 2000)) {
    // Roll number = everything before the phone number (the last run of digits/spaces/+/-).
    const m = /^(.*\S)[\s,;]+(\+?\d[\d -]{8,16}\d)$/.exec(line);
    const phone = m ? normalisePhone(m[2]!) : null;
    // "R02, +91 98765 43211": the country code belongs to the number, not the roll number.
    const roll = m?.[1]?.replace(/[\s,;]+\+?91$/, "").replace(/[,;\t]+$/, "").trim();
    if (!m || !roll || !phone) {
      if (bad.length < 5) bad.push(line.slice(0, 40));
      continue;
    }
    phones.set(roll.toLowerCase(), phone);
  }
  return { phones, bad };
}

export const phoneFor = (phones: Map<string, string>, roll: string) => phones.get(roll.trim().toLowerCase()) ?? null;
