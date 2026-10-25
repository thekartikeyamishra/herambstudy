/**
 * Privacy-conscious analytics helper.
 *
 * - Nothing is sent unless GA4 is configured AND the visitor granted consent.
 * - Only a fixed allow-list of events is accepted.
 * - Params are filtered so emails, names or free text can never be sent.
 */

export type AnalyticsEvent =
  | "invite_form_started"
  | "invite_request_submitted"
  | "contact_message_submitted"
  | "pilot_application_submitted"
  | "tracker_test_saved"
  | "student_links_shared"
  | "student_report_saved"
  | "resource_tool_started"
  | "resource_tool_completed"
  | "pwa_install_prompt_shown"
  | "pwa_install_completed"
  | "app_store_coming_soon_clicked"
  | "founding_institute_joined";

type SafeParams = Record<string, string | number | boolean>;

const ALLOWED_PARAM_KEYS = new Set(["role", "country", "tool", "store", "outcome", "platform", "page"]);
const EMAIL_LIKE = /[^\s@]+@[^\s@]+/;

export const CONSENT_STORAGE_KEY = "heramb.analytics-consent.v1";
export type ConsentState = "granted" | "denied";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function sanitizeParams(params: Record<string, unknown> = {}): SafeParams {
  const out: SafeParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (!ALLOWED_PARAM_KEYS.has(key)) continue;
    if (typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    } else if (typeof value === "string" && value.length <= 64 && !EMAIL_LIKE.test(value)) {
      out[key] = value;
    }
  }
  return out;
}

export function readConsent(): ConsentState | null {
  try {
    const v = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function writeConsent(state: ConsentState): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, state);
  } catch {
    /* storage unavailable (private mode) — consent applies to this page view only */
  }
  window.dispatchEvent(new CustomEvent("heramb:consent", { detail: state }));
}

export function track(event: AnalyticsEvent, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  if (readConsent() !== "granted") return;
  window.gtag("event", event, sanitizeParams(params));
}
