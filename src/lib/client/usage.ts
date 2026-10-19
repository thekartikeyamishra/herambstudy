/**
 * Anonymous usage counts for the founding programme (see src/lib/institute/events.ts).
 * Sends counts only — never marks, names, roll numbers or topic names.
 * Batched, best-effort, silent on failure, and respects the opt-out switch.
 */
import type { UsageEvent } from "@/lib/institute/events";
import { MAX_EVENTS_PER_BATCH } from "@/lib/institute/events";
import { deviceId, getInstitute, usageOptedOut } from "./institute";

type Pending = { code: string | null; role: "teacher" | "student"; type: UsageEvent; n: number };

let queue: Pending[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function flush(useBeacon = false) {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!queue.length) return;
  const items = queue;
  queue = [];
  // One request per (code, role) group.
  const groups = new Map<string, Pending[]>();
  for (const p of items) {
    const k = `${p.code ?? ""}|${p.role}`;
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  const device = deviceId();
  for (const list of groups.values()) {
    for (let i = 0; i < list.length; i += MAX_EVENTS_PER_BATCH) {
      const chunk = list.slice(i, i + MAX_EVENTS_PER_BATCH);
      const body = JSON.stringify({
        code: chunk[0]!.code,
        role: chunk[0]!.role,
        device,
        events: chunk.map((p) => ({ type: p.type, n: Math.max(1, Math.min(500, Math.round(p.n))) })),
      });
      try {
        if (useBeacon && typeof navigator !== "undefined" && "sendBeacon" in navigator) {
          navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
        } else {
          void fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true, credentials: "same-origin" }).catch(() => undefined);
        }
      } catch {
        /* best effort */
      }
    }
  }
}

let listening = false;
function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("pagehide", () => flush(true));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
}

/**
 * Records a usage count. `code` defaults to the institute this browser is connected to;
 * students pass the code carried in their report link.
 */
export function recordUsage(type: UsageEvent, opts: { n?: number; role?: "teacher" | "student"; code?: string | null } = {}): void {
  if (typeof window === "undefined" || usageOptedOut()) return;
  const role = opts.role ?? "teacher";
  const code = opts.code !== undefined ? opts.code : role === "teacher" ? getInstitute()?.code ?? null : null;
  queue.push({ code, role, type, n: opts.n ?? 1 });
  listen();
  if (!timer) timer = setTimeout(() => flush(), 1500);
}

/** Test hook. */
export function __flushUsageForTests() {
  flush();
}
