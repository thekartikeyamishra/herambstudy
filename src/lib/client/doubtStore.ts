/** Doubt log storage on this device, validated on every load (damaged entries are skipped). */
import { z } from "zod";
import { doubtSchema, MAX_DOUBTS, type Doubt } from "@/lib/tools/doubts";

export const DOUBT_STORE_KEY = "heramb.doubts.v1";

export type DoubtStore = { v: 1; doubts: Doubt[]; lastBatch: string };
export const emptyDoubts = (): DoubtStore => ({ v: 1, doubts: [], lastBatch: "" });

const shape = z.object({ v: z.literal(1), doubts: z.array(z.unknown()).max(MAX_DOUBTS * 2), lastBatch: z.string().max(40).optional() });

export function parseDoubtStore(raw: unknown): { store: DoubtStore; dropped: number } {
  const s = shape.safeParse(raw);
  if (!s.success) return { store: emptyDoubts(), dropped: 0 };
  let dropped = 0;
  const doubts: Doubt[] = [];
  for (const d of s.data.doubts) {
    const p = doubtSchema.safeParse(d);
    if (p.success) doubts.push(p.data);
    else dropped++;
  }
  return { store: { v: 1, doubts: doubts.slice(-MAX_DOUBTS), lastBatch: s.data.lastBatch ?? "" }, dropped };
}

export function loadDoubts(): { store: DoubtStore; status: "ok" | "unavailable" | "damaged" } {
  try {
    const raw = localStorage.getItem(DOUBT_STORE_KEY);
    if (!raw) return { store: emptyDoubts(), status: "ok" };
    const r = parseDoubtStore(JSON.parse(raw));
    return { store: r.store, status: r.dropped ? "damaged" : "ok" };
  } catch (err) {
    return { store: emptyDoubts(), status: err instanceof SyntaxError ? "damaged" : "unavailable" };
  }
}

export function saveDoubts(store: DoubtStore): string | null {
  try {
    localStorage.setItem(DOUBT_STORE_KEY, JSON.stringify({ v: 1, doubts: store.doubts.slice(-MAX_DOUBTS), lastBatch: store.lastBatch }));
    return null;
  } catch {
    return "This browser isn't allowing saving (private mode or storage full). Export a backup.";
  }
}
