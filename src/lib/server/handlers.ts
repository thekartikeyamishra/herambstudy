import { getBackend, instanceLimiter } from "./backend";
import {
  clientIp,
  fail,
  hashKey,
  isAllowedOrigin,
  readJsonBody,
  requestIdForEmail,
  submittedTooFast,
  succeed,
} from "./http";
import {
  actionUrl,
  deliver,
  emailActive,
  emailConfig,
  inviteAcknowledgement,
  pilotOwnerAlert,
  runAfterResponse,
  signToken,
  verifyToken,
  type TokenPurpose,
} from "./email";
import type { InviteRecord, PilotRecord } from "./types";
import { absoluteUrl } from "@/config/site";
import {
  contactMessageSchema,
  emailActionSchema,
  fieldErrors,
  inviteRequestSchema,
  MARKETING_CONSENT_VERSION,
  normalizeEmail,
  pilotApplicationSchema,
  PRIVACY_NOTICE_VERSION,
} from "@/lib/validation/schemas";

const TEN_MIN = 10 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

/** Limits can be tuned per environment (e.g. raised for automated end-to-end tests). */
function limit(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isInteger(v) && v > 0 && v <= 1000 ? v : fallback;
}

export const INVITE_SUCCESS_MESSAGE =
  "Your request is recorded. We review requests in small batches and will email you if a place opens for you. There is no fixed invitation date yet.";

export const CONTACT_SUCCESS_MESSAGE = "Thanks — your message has been received. We read every message, though we can't promise a reply time yet.";

const UNAVAILABLE_MESSAGE =
  "We can't accept submissions right now because our storage service isn't available. Nothing was saved — please try again later.";

export const PILOT_SUCCESS_MESSAGE =
  "Thank you — your pilot application is recorded. We'll review it and contact you by email. Pilots are small, so we can't guarantee a place, and nothing is charged without a written agreement.";

async function sharedGuards(req: Request, scope: "invite" | "contact" | "pilot") {
  if (!isAllowedOrigin(req)) {
    return fail(403, "forbidden_origin", "This request was blocked for security reasons.");
  }
  const ipKey = hashKey(scope, "ip", clientIp(req));
  const perScope = { invite: limit("RATE_LIMIT_INVITE_PER_IP", 5), contact: limit("RATE_LIMIT_CONTACT_PER_IP", 3), pilot: limit("RATE_LIMIT_PILOT_PER_IP", 3) };
  const local = await instanceLimiter().hit(ipKey, perScope[scope] * 2, TEN_MIN);
  if (!local.allowed) {
    return fail(429, "rate_limited", "Too many attempts. Please wait a few minutes and try again.", {
      retryAfterSec: local.retryAfterSec,
    });
  }
  return null;
}

export async function handleInvite(req: Request) {
  const blocked = await sharedGuards(req, "invite");
  if (blocked) return blocked;

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = inviteRequestSchema.safeParse(body.data);
  if (!parsed.success) {
    return fail(422, "invalid_input", "Please check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  }
  const input = parsed.data;

  if (input.website && input.website.length > 0) {
    return fail(400, "spam_rejected", "This submission looked automated and was not saved.");
  }
  if (submittedTooFast(input.startedAt)) {
    return fail(429, "too_fast", "That was quick! Please take a moment to review the form, then submit again.", {
      retryAfterSec: 3,
    });
  }

  const backend = getBackend();
  if (backend.kind === "unavailable") {
    console.warn("[invite] backend unavailable:", backend.reason);
    return fail(503, "service_unavailable", UNAVAILABLE_MESSAGE, { retryAfterSec: 300 });
  }

  const normalizedEmail = normalizeEmail(input.email);
  try {
    const ipLimit = await backend.limiter.hit(hashKey("invite", "ip", clientIp(req)), limit("RATE_LIMIT_INVITE_PER_IP", 5), TEN_MIN);
    const emailLimit = await backend.limiter.hit(hashKey("invite", "email", normalizedEmail), 3, ONE_HOUR);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      return fail(429, "rate_limited", "Too many attempts. Please wait a few minutes and try again.", {
        retryAfterSec: Math.max(ipLimit.retryAfterSec, emailLimit.retryAfterSec),
      });
    }

    const now = new Date();
    const record: InviteRecord = {
      requestId: requestIdForEmail(normalizedEmail),
      normalizedEmail,
      name: input.name,
      role: input.role,
      country: input.country,
      useCase: input.useCase,
      useCaseNote: input.useCaseNote,
      institute:
        input.instituteName || input.instituteSize ? { name: input.instituteName, size: input.instituteSize } : null,
      consentRecords: {
        privacyNotice: { granted: true, version: PRIVACY_NOTICE_VERSION, recordedAt: now },
        marketingUpdates: {
          granted: input.marketingConsent === true,
          version: MARKETING_CONSENT_VERSION,
          recordedAt: now,
          confirmedAt: null,
          withdrawnAt: null,
        },
      },
      status: "pending",
      createdAt: now,
      updatedAt: now,
      sourceCampaign: input.source?.campaign || null,
      sourceLandingPage: input.source?.landingPage || null,
      duplicateAttempts: 0,
    };

    // "created" and "exists" deliberately return the same response so the form
    // cannot be used to discover whether an email is already on the list.
    const outcome = await backend.invites.createIfAbsent(record);
    // Email only for new requests, so the form can't be used to spam an address repeatedly.
    if (outcome === "created" && emailActive()) {
      const wantsUpdates = record.consentRecords.marketingUpdates.granted;
      const unsub = signToken("unsubscribe", record.requestId);
      runAfterResponse(() =>
        deliver(
          inviteAcknowledgement({
            to: record.normalizedEmail,
            name: record.name,
            confirmUrl: wantsUpdates ? actionUrl("confirm", record.requestId) : null,
            unsubscribeUrl: wantsUpdates ? actionUrl("unsubscribe", record.requestId) : null,
            oneClickUrl: wantsUpdates && unsub ? absoluteUrl(`/api/email/unsubscribe?id=${record.requestId}&t=${unsub}`) : null,
          }),
        ),
      );
    }
    return succeed(INVITE_SUCCESS_MESSAGE, 200);
  } catch (err) {
    console.error("[invite] storage error:", err instanceof Error ? err.message : "unknown");
    return fail(503, "service_unavailable", UNAVAILABLE_MESSAGE, { retryAfterSec: 60 });
  }
}

export async function handleContact(req: Request) {
  const blocked = await sharedGuards(req, "contact");
  if (blocked) return blocked;

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = contactMessageSchema.safeParse(body.data);
  if (!parsed.success) {
    return fail(422, "invalid_input", "Please check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  }
  const input = parsed.data;

  if (input.website && input.website.length > 0) {
    return fail(400, "spam_rejected", "This submission looked automated and was not saved.");
  }
  if (submittedTooFast(input.startedAt)) {
    return fail(429, "too_fast", "That was quick! Please review your message, then send it again.", { retryAfterSec: 3 });
  }

  const backend = getBackend();
  if (backend.kind === "unavailable") {
    console.warn("[contact] backend unavailable:", backend.reason);
    return fail(503, "service_unavailable", UNAVAILABLE_MESSAGE, { retryAfterSec: 300 });
  }

  try {
    const contactLimit = await backend.limiter.hit(hashKey("contact", "ip", clientIp(req)), limit("RATE_LIMIT_CONTACT_PER_IP", 3), TEN_MIN);
    if (!contactLimit.allowed) {
      return fail(429, "rate_limited", "Too many messages. Please wait a few minutes and try again.", {
        retryAfterSec: contactLimit.retryAfterSec,
      });
    }
    await backend.contacts.add({
      name: input.name,
      email: normalizeEmail(input.email),
      topic: input.topic,
      message: input.message,
      privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
      status: "new",
      createdAt: new Date(),
    });
    return succeed(CONTACT_SUCCESS_MESSAGE, 200);
  } catch (err) {
    console.error("[contact] storage error:", err instanceof Error ? err.message : "unknown");
    return fail(503, "service_unavailable", UNAVAILABLE_MESSAGE, { retryAfterSec: 60 });
  }
}

export async function handlePilot(req: Request) {
  const blocked = await sharedGuards(req, "pilot");
  if (blocked) return blocked;

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = pilotApplicationSchema.safeParse(body.data);
  if (!parsed.success) {
    return fail(422, "invalid_input", "Please check the highlighted fields.", { fieldErrors: fieldErrors(parsed.error) });
  }
  const input = parsed.data;
  if (input.website && input.website.length > 0) {
    return fail(400, "spam_rejected", "This submission looked automated and was not saved.");
  }
  if (submittedTooFast(input.startedAt)) {
    return fail(429, "too_fast", "That was quick! Please review your answers, then submit again.", { retryAfterSec: 3 });
  }

  const backend = getBackend();
  if (backend.kind === "unavailable") {
    console.warn("[pilot] backend unavailable:", backend.reason);
    return fail(503, "service_unavailable", UNAVAILABLE_MESSAGE, { retryAfterSec: 300 });
  }

  try {
    const email = normalizeEmail(input.email);
    const ipLimit = await backend.limiter.hit(hashKey("pilot", "ip", clientIp(req)), limit("RATE_LIMIT_PILOT_PER_IP", 3), TEN_MIN);
    const emailLimit = await backend.limiter.hit(hashKey("pilot", "email", email), 2, ONE_HOUR);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      return fail(429, "rate_limited", "Too many applications. Please wait a while and try again.", {
        retryAfterSec: Math.max(ipLimit.retryAfterSec, emailLimit.retryAfterSec),
      });
    }
    const record: PilotRecord = {
      contactName: input.contactName,
      role: input.role,
      email,
      phone: input.phone,
      institutionType: input.institutionType,
      instituteName: input.instituteName,
      city: input.city,
      country: input.country,
      studentCount: input.studentCount,
      exams: input.exams,
      testFrequency: input.testFrequency,
      currentTools: input.currentTools,
      startWindow: input.startWindow,
      priceComfort: input.priceComfort,
      notes: input.notes,
      privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
      status: "new",
      createdAt: new Date(),
    };
    await backend.pilots.add(record);
    const cfg = emailConfig();
    const owner = cfg.ownerAlerts ?? (cfg.devOutbox ? "owner@dev.local" : null);
    if (owner && emailActive()) runAfterResponse(() => deliver(pilotOwnerAlert(owner, record)));
    return succeed(PILOT_SUCCESS_MESSAGE, 200);
  } catch (err) {
    console.error("[pilot] storage error:", err instanceof Error ? err.message : "unknown");
    return fail(503, "service_unavailable", UNAVAILABLE_MESSAGE, { retryAfterSec: 60 });
  }
}

/**
 * Confirm (double opt-in) or unsubscribe via a signed link.
 * - JSON body {id, t} from our own confirmation pages (Origin-checked).
 * - Unsubscribe also accepts RFC 8058 one-click POSTs from mail providers
 *   (form-encoded, id/t in the query string, no Origin header).
 * GET is never accepted, so link scanners can't change anyone's consent.
 */
export async function handleEmailAction(req: Request, purpose: TokenPurpose) {
  const url = new URL(req.url);
  const contentType = (req.headers.get("content-type") ?? "").toLowerCase();
  const oneClick = purpose === "unsubscribe" && !contentType.startsWith("application/json");

  let raw: unknown;
  if (oneClick) {
    const form = await req.text();
    if (!/List-Unsubscribe=One-Click/i.test(form)) {
      return fail(415, "unsupported_media_type", "Please use the unsubscribe page.");
    }
    raw = { id: url.searchParams.get("id"), t: url.searchParams.get("t") };
  } else {
    if (!isAllowedOrigin(req)) return fail(403, "forbidden_origin", "This request was blocked for security reasons.");
    const body = await readJsonBody(req);
    if (!body.ok) return body.response;
    raw = body.data;
  }

  const local = await instanceLimiter().hit(hashKey("email-action", "ip", clientIp(req)), 30, TEN_MIN);
  if (!local.allowed) return fail(429, "rate_limited", "Too many attempts. Please try again later.", { retryAfterSec: local.retryAfterSec });

  const parsed = emailActionSchema.safeParse(raw);
  if (!emailConfig().tokens) {
    return fail(503, "service_unavailable", "Email links aren't active on this site yet. Please use the contact page instead.");
  }
  if (!parsed.success || !verifyToken(purpose, parsed.data.id, parsed.data.t)) {
    return fail(400, "invalid_input", "This link is invalid or incomplete. Please use the full link from your email, or contact us.");
  }

  const backend = getBackend();
  if (backend.kind === "unavailable") return fail(503, "service_unavailable", UNAVAILABLE_MESSAGE, { retryAfterSec: 300 });
  try {
    const result = await backend.invites.updateMarketing(parsed.data.id, purpose === "confirm" ? "confirm" : "withdraw", new Date());
    if (result === "not_found") {
      return fail(400, "invalid_input", "We couldn't find this request — it may have been deleted at your request.");
    }
    if (result === "not_requested") {
      return fail(400, "invalid_input", "This request didn't ask for product updates, so there's nothing to confirm.");
    }
    return succeed(
      purpose === "confirm"
        ? "Confirmed — you'll receive occasional product updates. Every email has an unsubscribe link."
        : "You're unsubscribed from product updates. Your invite request itself is unchanged.",
    );
  } catch (err) {
    console.error("[email-action] storage error:", err instanceof Error ? err.message : "unknown");
    return fail(503, "service_unavailable", UNAVAILABLE_MESSAGE, { retryAfterSec: 60 });
  }
}
