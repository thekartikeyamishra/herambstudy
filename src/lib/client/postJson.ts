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

export type JsonResult<T> =
  | { kind: "success"; data: T }
  | { kind: "error"; code: string; status: number; message: string; fieldErrors?: Record<string, string> };

/** Like postJson, but returns the full JSON body on success (for endpoints that return data). */
export async function requestJson<T>(url: string, init: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown } = {}, timeoutMs = 20_000): Promise<JsonResult<T>> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { kind: "error", code: "offline", status: 0, message: "You appear to be offline. Please reconnect and try again." };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
      credentials: "same-origin",
    });
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    const d = data as { ok?: boolean; error?: { code?: string; message?: string; fieldErrors?: Record<string, string> } } | null;
    if (res.ok && d?.ok === true) return { kind: "success", data: data as T };
    if (d?.ok === false && d.error) {
      return { kind: "error", code: d.error.code ?? "error", status: res.status, message: d.error.message ?? "Something went wrong.", fieldErrors: d.error.fieldErrors };
    }
    return { kind: "error", code: "unexpected", status: res.status, message: "Something went wrong on our side. Please try again." };
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === "AbortError";
    return { kind: "error", code: aborted ? "timeout" : "network", status: 0, message: aborted ? "That took too long. Please try again." : "We couldn't reach the server. Please check your connection and try again." };
  } finally {
    clearTimeout(timer);
  }
}
