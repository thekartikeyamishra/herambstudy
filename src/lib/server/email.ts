import { createHmac, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { absoluteUrl, siteConfig } from "@/config/site";
import type { PilotRecord } from "./types";

/**
 * Transactional email via Resend's HTTPS API (https://resend.com) — OPTIONAL.
 *
 * - Sending is enabled only when RESEND_API_KEY and EMAIL_FROM are set.
 * - Confirmation / unsubscribe links need EMAIL_TOKEN_SECRET (≥ 32 chars).
 * - Failures never break a form submission: the data is already stored, and the
 *   success message never promises an email.
 * Any provider with an HTTPS API can replace `deliver()`.
 */

export type EmailConfig = {
  sending: boolean;
  tokens: boolean;
  from: string | null;
  replyTo: string | null;
  ownerAlerts: string | null;
};

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export function emailConfig(): EmailConfig {
  const from = process.env.EMAIL_FROM?.trim() || null;
  const fromOk = Boolean(from && (EMAIL_RE.test(from) || /^[^<>]+<[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>$/.test(from)));
  const owner = process.env.OWNER_NOTIFICATION_EMAIL?.trim() || null;
  const reply = siteConfig.contactEmail;
  return {
    sending: Boolean(process.env.RESEND_API_KEY?.trim()) && fromOk,
    tokens: (process.env.EMAIL_TOKEN_SECRET ?? "").length >= 32,
    from: fromOk ? from : null,
    replyTo: reply,
    ownerAlerts: owner && EMAIL_RE.test(owner) ? owner : null,
  };
}

/* ── Signed links ───────────────────────────────────────────────────────── */

export type TokenPurpose = "confirm" | "unsubscribe";

export function signToken(purpose: TokenPurpose, id: string): string | null {
  const secret = process.env.EMAIL_TOKEN_SECRET ?? "";
  if (secret.length < 32) return null;
  return createHmac("sha256", secret).update(`${purpose}:${id}`).digest("base64url");
}

export function verifyToken(purpose: TokenPurpose, id: string, token: string): boolean {
  const expected = signToken(purpose, id);
  if (!expected) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function actionUrl(purpose: TokenPurpose, id: string): string | null {
  const t = signToken(purpose, id);
  if (!t) return null;
  const path = purpose === "confirm" ? "/email/confirm" : "/email/unsubscribe";
  return absoluteUrl(`${path}?id=${id}&t=${t}`);
}

/* ── Delivery ───────────────────────────────────────────────────────────── */

export type OutgoingEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  headers?: Record<string, string>;
  replyTo?: string | null;
};

export async function deliver(message: OutgoingEmail): Promise<boolean> {
  const cfg = emailConfig();
  if (!cfg.sending || !cfg.from) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: cfg.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
        ...(message.headers ? { headers: message.headers } : {}),
        ...(message.replyTo ?? cfg.replyTo ? { reply_to: message.replyTo ?? cfg.replyTo } : {}),
      }),
      signal: controller.signal,
    });
    if (!res.ok) console.error("[email] provider rejected message:", res.status);
    return res.ok;
  } catch (err) {
    console.error("[email] delivery failed:", err instanceof Error ? err.name : "unknown");
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Runs work after the HTTP response is sent (Next.js `after`), so email latency
 * never slows the form. Falls back to fire-and-forget outside a request scope.
 */
export function runAfterResponse(task: () => Promise<unknown>): void {
  const safe = () => task().catch((e: unknown) => console.error("[after] task failed:", e instanceof Error ? e.message : "unknown"));
  try {
    after(safe);
  } catch {
    void safe();
  }
}

/* ── Templates ──────────────────────────────────────────────────────────── */

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="en"><body style="margin:0;background:#FAF8F4;font-family:Segoe UI,Roboto,Arial,sans-serif;color:#0E1528">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #E4DFD4;border-radius:16px">
<tr><td style="padding:28px 28px 8px"><p style="margin:0;font-weight:700;font-size:18px">Heramb<span style="color:#586076">.study</span></p></td></tr>
<tr><td style="padding:8px 28px 28px;font-size:15px;line-height:1.6;color:#2F3852"><h1 style="font-size:20px;color:#0E1528;margin:8px 0 12px">${escapeHtml(title)}</h1>${bodyHtml}</td></tr>
</table><p style="font-size:12px;color:#586076;max-width:560px">Progress, made visible. You received this because this address was entered on ${escapeHtml(siteConfig.url.replace(/^https?:\/\//, ""))}.</p>
</td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:20px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#4A3CCE;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600">${escapeHtml(label)}</a></p>`;

export function inviteAcknowledgement(input: {
  to: string;
  name: string | null;
  confirmUrl: string | null;
  unsubscribeUrl: string | null;
  oneClickUrl: string | null;
}): OutgoingEmail {
  const hello = input.name ? `Hi ${input.name},` : "Hi,";
  const lines = [
    hello,
    "",
    "We've received your request for early access to Heramb.study.",
    "We're inviting people in small groups so we can learn properly from each one. There's no fixed invitation date yet, and we'll email you if a place opens for you.",
    "",
    "Meanwhile, the free tools on our site are open to everyone: " + absoluteUrl("/resources"),
  ];
  let html = `<p>${escapeHtml(hello)}</p><p>We've received your request for early access to Heramb.study.</p>
<p>We're inviting people in small groups so we can learn properly from each one. There's no fixed invitation date yet, and we'll email you if a place opens for you.</p>
<p>Meanwhile, the <a href="${escapeHtml(absoluteUrl("/resources"))}" style="color:#4A3CCE">free tools</a> are open to everyone.</p>`;

  if (input.confirmUrl) {
    lines.push("", "You also asked for occasional product updates. Please confirm that here (nothing is sent until you do):", input.confirmUrl);
    html += `<p>You also asked for occasional product updates. Please confirm — we won't send any until you do.</p>${button(input.confirmUrl, "Confirm product updates")}`;
  }
  if (input.unsubscribeUrl) {
    lines.push("", "Changed your mind about updates? " + input.unsubscribeUrl);
    html += `<p style="font-size:13px;color:#586076">Changed your mind about updates? <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#586076">Unsubscribe</a>.</p>`;
  }
  lines.push("", "To have your request deleted, reply to this email or use " + absoluteUrl("/contact") + ".", "", "— The Heramb.study team");
  html += `<p style="font-size:13px;color:#586076">To have your request deleted, reply to this email or use our <a href="${escapeHtml(absoluteUrl("/contact"))}" style="color:#586076">contact page</a>.</p>`;

  return {
    to: input.to,
    subject: "We've received your Heramb.study invite request",
    text: lines.join("\n"),
    html: layout("Your request is in", html),
    headers: input.oneClickUrl
      ? { "List-Unsubscribe": `<${input.oneClickUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
      : undefined,
  };
}

export function pilotOwnerAlert(to: string, p: PilotRecord): OutgoingEmail {
  const rows: Array<[string, string]> = [
    ["Institute", `${p.instituteName}, ${p.city} (${p.country})`],
    ["Contact", `${p.contactName} — ${p.role}`],
    ["Email", p.email],
    ["Phone", p.phone ?? "—"],
    ["Students", p.studentCount],
    ["Exams", p.exams.join(", ")],
    ["Tests", p.testFrequency],
    ["Start", p.startWindow],
    ["Price comfort (₹/student/month)", p.priceComfort ?? "—"],
    ["Current tools", p.currentTools ?? "—"],
    ["Notes", p.notes ?? "—"],
  ];
  return {
    to,
    subject: `New pilot application: ${p.instituteName} (${p.city})`,
    text: rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
    html: layout(
      "New pilot application",
      `<table style="width:100%;font-size:14px;border-collapse:collapse">${rows
        .map(([k, v]) => `<tr><td style="padding:6px 8px 6px 0;color:#586076;vertical-align:top">${escapeHtml(k)}</td><td style="padding:6px 0">${escapeHtml(v)}</td></tr>`)
        .join("")}</table>`,
    ),
    replyTo: p.email,
  };
}
