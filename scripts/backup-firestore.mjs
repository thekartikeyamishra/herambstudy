#!/usr/bin/env node
/**
 * Owner-only Firestore backup and restore (runs on YOUR machine with a service account).
 * Plain JSON-lines files you own: a disaster-recovery copy and a vendor-exit path.
 *
 *   npm run backup                          # writes backups/firestore-<stamp>/… (all collections, sub-collections included)
 *   npm run backup -- --include-rate-limits # also copy short-lived rate-limit counters (skipped by default)
 *   npm run backup -- --restore backups/firestore-2026-11-02T10-00-00 --yes
 *                                           # writes every document back (same ids, merge); for a new or repaired project
 *
 * Credentials: GOOGLE_APPLICATION_CREDENTIALS=<path to service-account JSON stored OUTSIDE the repo>,
 * or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY in the shell.
 * Backups contain institute contacts: keep them private (backups/ is git-ignored), and delete old ones.
 */
import { createReadStream, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { createInterface } from "node:readline";
import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const args = process.argv.slice(2);
const has = (n) => args.includes(`--${n}`);
const flag = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};

function init() {
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  const credential =
    FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY
      ? cert({ projectId: FIREBASE_PROJECT_ID, clientEmail: FIREBASE_CLIENT_EMAIL, privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") })
      : applicationDefault();
  initializeApp({ credential, projectId: FIREBASE_PROJECT_ID || undefined });
  return getFirestore();
}

/** Firestore values → JSON (timestamps tagged so a restore brings them back as timestamps). */
function encode(v) {
  if (v instanceof Timestamp) return { __ts: v.toDate().toISOString() };
  if (Array.isArray(v)) return v.map(encode);
  if (v && typeof v === "object") {
    if (typeof v.path === "string" && typeof v.id === "string" && v.firestore) return { __ref: v.path };
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, encode(x)]));
  }
  return v;
}
function decode(v, db) {
  if (Array.isArray(v)) return v.map((x) => decode(x, db));
  if (v && typeof v === "object") {
    if (typeof v.__ts === "string" && Object.keys(v).length === 1) return Timestamp.fromDate(new Date(v.__ts));
    if (typeof v.__ref === "string" && Object.keys(v).length === 1) return db.doc(v.__ref);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, decode(x, db)]));
  }
  return v;
}

async function backup(db) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const root = join("backups", `firestore-${stamp}`);
  mkdirSync(root, { recursive: true });
  const skip = has("include-rate-limits") ? new Set() : new Set(["rateLimits"]);
  const summary = {};

  async function dumpCollection(col) {
    const lines = [];
    const snap = await col.get();
    for (const doc of snap.docs) {
      lines.push(JSON.stringify({ id: doc.id, data: encode(doc.data()) }));
      for (const sub of await doc.ref.listCollections()) await dumpCollection(sub);
    }
    const file = join(root, `${col.path.split("/").join(sep)}.jsonl`);
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, lines.join("\n") + (lines.length ? "\n" : ""));
    summary[col.path] = lines.length;
  }

  for (const col of await db.listCollections()) {
    if (skip.has(col.id)) continue;
    await dumpCollection(col);
  }
  writeFileSync(join(root, "_manifest.json"), JSON.stringify({ createdAt: new Date().toISOString(), collections: summary }, null, 2));
  const total = Object.values(summary).reduce((s, n) => s + n, 0);
  console.log(`Backed up ${total} documents in ${Object.keys(summary).length} collections to ${root}`);
  console.log("Keep this folder private. It contains institute contact details.");
}

function* jsonlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* jsonlFiles(p);
    else if (name.endsWith(".jsonl")) yield p;
  }
}

async function restore(db, dir) {
  if (!has("yes")) {
    console.error("Restore writes documents into the project your credentials point at. Re-run with --yes to confirm.");
    process.exit(1);
  }
  let total = 0;
  for (const file of jsonlFiles(dir)) {
    const colPath = relative(dir, file).replace(/\.jsonl$/, "").split(sep).join("/");
    let batch = db.batch();
    let inBatch = 0;
    const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line.trim()) continue;
      const { id, data } = JSON.parse(line);
      batch.set(db.collection(colPath).doc(id), decode(data, db), { merge: true });
      inBatch++;
      total++;
      if (inBatch === 400) {
        await batch.commit();
        batch = db.batch();
        inBatch = 0;
      }
    }
    if (inBatch) await batch.commit();
    console.log(`Restored ${colPath}`);
  }
  console.log(`Restored ${total} documents from ${dir}`);
}

const db = init();
const from = flag("restore");
(from ? restore(db, from) : backup(db)).catch((err) => {
  console.error(`Backup tool failed: ${err?.message ?? err}`);
  console.error("Check GOOGLE_APPLICATION_CREDENTIALS (or the FIREBASE_* variables) and that the service account can read Firestore.");
  process.exit(1);
});
