import type { ApiResponse } from "@/lib/server/http";

export type PostResult =
  | { kind: "success"; message: string }
  | { kind: "error"; code: string; message: string; fieldErrors?: Record<string, string> };

/**
 * POSTs JSON and normalises every failure mode (offline, timeout, non-JSON reply)
 * into an honest error. Success is only reported when the server says ok: true.
 */
export async function postJson(url: string, payload: unknown, timeoutMs = 15_000): Promise<PostResult> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { kind: "error", code: "offline", message: "You appear to be offline. Nothing was sent — please reconnect and try again." };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      credentials: "same-origin",
    });
    let data: ApiResponse | null = null;
    try {
      data = (await res.json()) as ApiResponse;
    } catch {
      data = null;
    }
    if (res.ok && data?.ok === true) return { kind: "success", message: data.message };
    if (data && data.ok === false) {
      return { kind: "error", code: data.error.code, message: data.error.message, fieldErrors: data.error.fieldErrors };
    }
    return { kind: "error", code: "unexpected", message: "Something went wrong on our side. Nothing was confirmed as saved — please try again." };
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === "AbortError";
    return {
      kind: "error",
      code: aborted ? "timeout" : "network",
      message: aborted
        ? "The request took too long. It may not have been saved — please try again."
        : "We couldn't reach the server. Nothing was confirmed as saved — please check your connection and try again.",
    };
  } finally {
    clearTimeout(timer);
  }
}
