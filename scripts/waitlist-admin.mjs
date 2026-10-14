#!/usr/bin/env node
/**
 * Owner-only waitlist administration (runs on YOUR machine with a service account).
 *
 * Usage (PowerShell or bash), from the project root:
 *   npm run waitlist -- stats
 *   npm run waitlist -- export                  # writes exports/invites-<date>.csv and .json
 *   npm run waitlist -- export --marketing-only # only CONFIRMED (double opt-in), not unsubscribed
 *   npm run waitlist -- export --marketing-only --include-unconfirmed   # not recommended for sending
 *   npm run waitlist -- pilots                  # export institute pilot applications
 *   npm run waitlist -- find  --email someone@example.com
 *   npm run waitlist -- delete --email someone@example.com --yes
 *   npm run waitlist -- set-status --email someone@example.com --status invited
 *   npm run waitlist -- contacts                # export contact messages
 *
 * Credentials: set GOOGLE_APPLICATION_CREDENTIALS to the path of a service-account
 * JSON file stored OUTSIDE the repository, or set FIREBASE_PROJECT_ID,
 * FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in your shell.
 * Exports contain personal data: keep them private and delete them when done.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const args = process.argv.slice(2);
const command = args[0];
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (name) => args.includes(`--${name}`);

function init() {
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  const credential =
    FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY
      ? cert({ projectId: FIREBASE_PROJECT_ID, clientEmail: FIREBASE_CLIENT_EMAIL, privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") })
      : applicationDefault();
  initializeApp({ credential, projectId: FIREBASE_PROJECT_ID || undefined });
  return getFirestore();
}

const requestIdForEmail = (email) =>
  createHash("sha256").update(`invite|${email.trim().toLowerCase()}`).digest("hex").slice(0, 32);

const toIso = (v) => (v && typeof v.toDate === "function" ? v.toDate().toISOString() : v ?? "");
const csvCell = (v) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise spreadsheet formula injection
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function writeExport(name, rows, columns) {
  mkdirSync("exports", { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const base = join("exports", `${name}-${stamp}`);
  writeFileSync(`${base}.json`, JSON.stringify(rows, null, 2));
  writeFileSync(`${base}.csv`, [columns.join(","), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(","))].join("\n"));
  console.log(`Wrote ${rows.length} rows to ${base}.csv and ${base}.json`);
}

async function main() {
  if (!command || has("help")) {
    console.log("Commands: stats | export [--marketing-only [--include-unconfirmed]] | pilots | find --email X | delete --email X --yes | set-status --email X --status S | contacts");
    return;
  }
  const db = init();
  const invites = db.collection("inviteRequests");

  if (command === "stats") {
    const snap = await invites.select("role", "country", "status").get();
    const tally = {};
    snap.forEach((d) => {
      const { role, country, status } = d.data();
      for (const [k, v] of [["role", role], ["country", country], ["status", status]]) {
        tally[k] ??= {};
        tally[k][v] = (tally[k][v] ?? 0) + 1;
      }
    });
    console.log(`Total requests: ${snap.size}`);
    console.log(JSON.stringify(tally, null, 2));
    return;
  }

  if (command === "export") {
    const snap = await invites.orderBy("createdAt", "desc").get();
    const rows = [];
    snap.forEach((d) => {
      const r = d.data();
      const m = r.consentRecords?.marketingUpdates ?? {};
      const marketing = m.granted === true;
      const confirmed = marketing && Boolean(m.confirmedAt) && !m.withdrawnAt;
      if (has("marketing-only") && !(has("include-unconfirmed") ? marketing && !m.withdrawnAt : confirmed)) return;
      rows.push({
        requestId: r.requestId, email: r.normalizedEmail, name: r.name ?? "", role: r.role, country: r.country,
        useCase: r.useCase, useCaseNote: r.useCaseNote ?? "", instituteName: r.institute?.name ?? "",
        instituteSize: r.institute?.size ?? "", marketingConsent: marketing, marketingConfirmed: confirmed,
        marketingWithdrawn: Boolean(m.withdrawnAt), status: r.status,
        sourceCampaign: r.sourceCampaign ?? "", sourceLandingPage: r.sourceLandingPage ?? "",
        createdAt: toIso(r.createdAt), duplicateAttempts: r.duplicateAttempts ?? 0,
      });
    });
    writeExport(has("marketing-only") ? "invites-marketing" : "invites", rows, Object.keys(rows[0] ?? { requestId: "" }));
    return;
  }

  if (command === "pilots") {
    const snap = await db.collection("pilotApplications").orderBy("createdAt", "desc").get();
    const rows = snap.docs.map((d) => {
      const r = d.data();
      return { id: d.id, ...r, exams: (r.exams ?? []).join("; "), createdAt: toIso(r.createdAt) };
    });
    writeExport("pilots", rows, ["id", "createdAt", "status", "institutionType", "instituteName", "city", "country", "studentCount", "exams",
      "testFrequency", "startWindow", "priceComfort", "contactName", "role", "email", "phone", "currentTools", "notes"]);
    return;
  }

  if (command === "contacts") {
    const snap = await db.collection("contactMessages").orderBy("createdAt", "desc").get();
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toIso(d.data().createdAt) }));
    writeExport("contacts", rows, ["id", "createdAt", "topic", "name", "email", "status", "message"]);
    return;
  }

  const email = flag("email");
  if (!email) throw new Error("--email is required");
  const ref = invites.doc(requestIdForEmail(email));

  if (command === "find") {
    const snap = await ref.get();
    if (!snap.exists) return console.log("No request for that email.");
    const r = snap.data();
    console.log(JSON.stringify({ ...r, createdAt: toIso(r.createdAt), updatedAt: toIso(r.updatedAt) }, null, 2));
    return;
  }
  if (command === "delete") {
    if (!has("yes")) throw new Error("Refusing to delete without --yes");
    const snap = await ref.get();
    if (!snap.exists) return console.log("No request for that email.");
    await ref.delete();
    console.log(`Deleted invite request ${ref.id}. Remember to also delete it from any exports you hold.`);
    return;
  }
  if (command === "set-status") {
    const status = flag("status");
    if (!["pending", "invited", "declined", "withdrawn"].includes(status)) throw new Error("Invalid --status");
    await ref.update({ status, updatedAt: new Date() });
    console.log(`Status set to ${status}.`);
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
