/** Remembers small "already done" flags per report on this device (bounded, best-effort). */
const CAP = 2000;

export function doneBefore(key: string, id: string): boolean {
  try {
    const list = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown;
    return Array.isArray(list) && list.includes(id);
  } catch {
    return false;
  }
}

/** Marks `id` as done; returns false if it was already done (or storage is unavailable and `strict`). */
export function markDone(key: string, id: string): boolean {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown;
    const list = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
    if (list.includes(id)) return false;
    list.push(id);
    localStorage.setItem(key, JSON.stringify(list.slice(-CAP)));
    return true;
  } catch {
    return true;
  }
}

/** Short FNV-1a hash of any text (used to recognise the same test analysed twice). */
export function textHash(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${t.length.toString(36)}.${h.toString(36)}`;
}
