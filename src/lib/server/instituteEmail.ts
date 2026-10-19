import { absoluteUrl } from "@/config/site";
import { seatLabel } from "@/lib/institute/code";
import type { InstituteMetrics } from "@/lib/institute/metrics";
import { button, escapeHtml, layout, type OutgoingEmail } from "./email";
import type { InstituteRecord } from "./types";

export const dashboardUrl = (code: string) => absoluteUrl(`/institute#${code}`);
export const connectUrl = (code: string) => absoluteUrl(`/resources/class-test-analyser#connect=${code}`);

/** Sent to the institute contact (only when they gave an email). */
export function instituteWelcome(r: InstituteRecord, cap: number): OutgoingEmail {
  const seat = seatLabel(r.foundingSeat, cap);
  const intro = seat
    ? `${r.name} is founding institute ${seat} on Heramb.study.`
    : `${r.name} is now registered on Heramb.study.`;
  const text = [
    `Hi ${r.contactName},`,
    "",
    intro,
    "",
    `Your institute code: ${r.code}`,
    "Share it with your teachers. It connects their analyses and your students' report links to your institute — no passwords, and no marks or student names ever leave their devices.",
    "",
    "Start in three steps:",
    `1. Open the analyser connected to your institute: ${connectUrl(r.code)}`,
    "2. Paste or import one real test (Excel, Google Sheet or a photo of the marksheet).",
    "3. Send each student their report link.",
    "",
    `Your institute dashboard: ${dashboardUrl(r.code)}`,
    "",
    "Everything that's free today stays free. Founding institutes will get a founding discount on any future paid plan, and nothing is ever charged automatically.",
    "",
    "— Kartikeya Mishra, founder, Heramb.study",
  ].join("\n");
  const html = `<p>Hi ${escapeHtml(r.contactName)},</p><p>${escapeHtml(intro)}</p>
<p style="font-size:13px;color:#586076;margin-bottom:4px">Your institute code</p>
<p style="font-family:Consolas,monospace;font-size:24px;font-weight:700;letter-spacing:2px;margin:0 0 12px">${escapeHtml(r.code)}</p>
<p>Share it with your teachers. It connects their analyses and your students' report links to your institute — no passwords, and no marks or student names ever leave their devices.</p>
<ol style="padding-left:20px"><li>Open the analyser connected to your institute.</li><li>Paste or import one real test (Excel, Google Sheet or a photo of the marksheet).</li><li>Send each student their report link.</li></ol>
${button(connectUrl(r.code), "Analyse your first test")}
<p><a href="${escapeHtml(dashboardUrl(r.code))}" style="color:#4A3CCE">Open your institute dashboard</a></p>
<p style="font-size:13px;color:#586076">Everything that's free today stays free. Founding institutes will get a founding discount on any future paid plan, and nothing is ever charged automatically.</p>`;
  return { to: r.email!, subject: seat ? `Founding institute ${seat}: your Heramb.study code` : "Your Heramb.study institute code", text, html: layout("Welcome to Heramb.study", html) };
}

/** Owner alert for a new institute. */
export function instituteOwnerAlert(to: string, r: InstituteRecord, cap: number): OutgoingEmail {
  const rows: Array<[string, string]> = [
    ["Institute", `${r.name}, ${r.city} — ${r.institutionType}`],
    ["Seat", seatLabel(r.foundingSeat, cap) ?? "Not a founding seat (cap reached)"],
    ["Code", r.code],
    ["Contact", `${r.contactName} — ${r.role}`],
    ["Phone", r.phone ?? "—"],
    ["Email", r.email ?? "—"],
    ["Weekly digest", r.weeklyDigest.granted ? "Yes" : "No"],
    ["Source", r.source ?? "—"],
  ];
  return {
    to,
    subject: `New founding institute: ${r.name} (${r.city})`,
    text: rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
    html: layout(
      "New founding institute",
      `<table style="width:100%;font-size:14px;border-collapse:collapse">${rows
        .map(([k, v]) => `<tr><td style="padding:6px 8px 6px 0;color:#586076;vertical-align:top">${escapeHtml(k)}</td><td style="padding:6px 0">${escapeHtml(v)}</td></tr>`)
        .join("")}</table>`,
    ),
    replyTo: r.email,
  };
}

/** Monday digest: last week's numbers, the streak and one next step. */
export function weeklyDigest(r: InstituteRecord, m: InstituteMetrics, stopUrl: string, oneClickUrl: string): OutgoingEmail {
  const lastWeek = m.weeks.at(-2);
  const thisWeek = m.weeks.at(-1);
  const analyses = lastWeek?.analyses ?? 0;
  const studentActions = lastWeek?.studentActions ?? 0;
  const lines = [
    `Hi ${r.contactName},`,
    "",
    `Last week at ${r.name}: ${analyses} test${analyses === 1 ? "" : "s"} analysed, ${studentActions} student action${studentActions === 1 ? "" : "s"} on their reports.`,
    m.weeklyStreak ? `Weekly rhythm: ${m.weeklyStreak} week${m.weeklyStreak === 1 ? "" : "s"} in a row.` : "No weekly rhythm yet — one test a week is enough to start.",
    `Programme checklist: ${m.metCount} of 7 done.`,
    "",
    `This week: ${m.nextStep}`,
    thisWeek && thisWeek.analyses === 0 ? `Analyse this week's test: ${connectUrl(r.code)}` : "",
    "",
    `Dashboard: ${dashboardUrl(r.code)}`,
    "",
    `Stop these weekly emails: ${stopUrl}`,
  ].filter((l, i, a) => l !== "" || a[i - 1] !== "");
  const html = `<p>Hi ${escapeHtml(r.contactName)},</p>
<p>Last week at <strong>${escapeHtml(r.name)}</strong>:</p>
<table style="width:100%;font-size:15px;border-collapse:collapse;margin:8px 0 16px">
<tr><td style="padding:6px 0;color:#586076">Tests analysed</td><td style="padding:6px 0;font-weight:700;text-align:right">${analyses}</td></tr>
<tr><td style="padding:6px 0;color:#586076">Student actions on reports</td><td style="padding:6px 0;font-weight:700;text-align:right">${studentActions}</td></tr>
<tr><td style="padding:6px 0;color:#586076">Weekly rhythm</td><td style="padding:6px 0;font-weight:700;text-align:right">${m.weeklyStreak} week${m.weeklyStreak === 1 ? "" : "s"}</td></tr>
<tr><td style="padding:6px 0;color:#586076">Programme checklist</td><td style="padding:6px 0;font-weight:700;text-align:right">${m.metCount} of 7</td></tr>
</table>
<p><strong>This week:</strong> ${escapeHtml(m.nextStep)}</p>
${button(connectUrl(r.code), "Analyse this week's test")}
<p><a href="${escapeHtml(dashboardUrl(r.code))}" style="color:#4A3CCE">Open your institute dashboard</a></p>
<p style="font-size:13px;color:#586076">You asked for this weekly summary when ${escapeHtml(r.name)} joined. <a href="${escapeHtml(stopUrl)}" style="color:#586076">Stop weekly emails</a>.</p>`;
  return {
    to: r.email!,
    subject: `${r.name}: your week on Heramb.study`,
    text: lines.join("\n"),
    html: layout("Your week on Heramb.study", html),
    headers: { "List-Unsubscribe": `<${oneClickUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}
