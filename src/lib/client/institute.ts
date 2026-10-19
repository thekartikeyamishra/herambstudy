/**
 * The institute this browser is connected to (founding programme), plus the
 * anonymous device id used for usage counts. Browser storage only.
 */
import { normaliseCode } from "@/lib/institute/code";

export const INSTITUTE_KEY = "heramb.institute.v1";
export const DEVICE_KEY = "heramb.device.v1";
export const USAGE_OPT_OUT_KEY = "heramb.usage-optout.v1";
export const INSTITUTE_EVENT = "heramb:institute-changed";

export type ConnectedInstitute = { code: string; name: string; seatLabel: string | null };

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function getInstitute(): ConnectedInstitute | null {
  try {
    const raw = storage()?.getItem(INSTITUTE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<ConnectedInstitute>;
    const code = normaliseCode(v.code);
    if (!code || typeof v.name !== "string" || !v.name.trim()) return null;
    return { code, name: v.name.slice(0, 120), seatLabel: typeof v.seatLabel === "string" ? v.seatLabel.slice(0, 20) : null };
  } catch {
    return null;
  }
}

export function setInstitute(inst: ConnectedInstitute | null): void {
  try {
    const s = storage();
    if (!s) return;
    if (inst) s.setItem(INSTITUTE_KEY, JSON.stringify(inst));
    else s.removeItem(INSTITUTE_KEY);
    window.dispatchEvent(new Event(INSTITUTE_EVENT));
  } catch {
    /* storage unavailable */
  }
}

/** Random, per-browser, never linked to a person. Regenerated if storage is cleared. */
export function deviceId(): string {
  const s = storage();
  try {
    const existing = s?.getItem(DEVICE_KEY);
    if (existing && /^[A-Za-z0-9_-]{16,32}$/.test(existing)) return existing;
  } catch {
    /* ignore */
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const id = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  try {
    s?.setItem(DEVICE_KEY, id);
  } catch {
    /* ignore */
  }
  return id;
}

export function usageOptedOut(): boolean {
  try {
    return storage()?.getItem(USAGE_OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

export function setUsageOptOut(out: boolean): void {
  try {
    if (out) storage()?.setItem(USAGE_OPT_OUT_KEY, "1");
    else storage()?.removeItem(USAGE_OPT_OUT_KEY);
  } catch {
    /* ignore */
  }
}

/** Reads "#connect=HRB-XXXX-XXXX" from the URL (used by teacher invite links). */
export function connectCodeFromHash(hash: string): string | null {
  const m = /(?:^#|&)connect=([A-Za-z0-9-]{8,20})/.exec(hash);
  return m ? normaliseCode(m[1]) : null;
}
