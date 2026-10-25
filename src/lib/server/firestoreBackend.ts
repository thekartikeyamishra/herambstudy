import { chapterKey, cityKey, type BenchmarkDoc, type StoredSummary } from "@/lib/institute/summary";
import { FieldPath, FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import type { DayRow, FeedbackRow } from "@/lib/institute/metrics";
import { STUDENT_EVENTS, type UsageEvent } from "@/lib/institute/events";
import type {
  InstitutePatch,
  InstituteRecord,
  InstituteStore,
  InstituteUsage,
  NewInstitute,
  PublicTotals,
  ContactRecord,
  ContactStore,
  InviteRecord,
  InviteStore,
  MarketingAction,
  PilotRecord,
  PilotStore,
  RateLimiter,
} from "./types";

export const COLLECTIONS = {
  benchmarks: "benchmarks",
  invites: "inviteRequests",
  contacts: "contactMessages",
  pilots: "pilotApplications",
  rateLimits: "rateLimits",
  institutes: "institutes",
  meta: "meta",
} as const;

/** gRPC ALREADY_EXISTS */
const ALREADY_EXISTS = 6;

export class FirestoreInviteStore implements InviteStore {
  constructor(private readonly db: Firestore) {}

  async createIfAbsent(record: InviteRecord): Promise<"created" | "exists"> {
    const ref = this.db.collection(COLLECTIONS.invites).doc(record.requestId);
    try {
      // create() fails atomically if the document exists — deterministic de-duplication.
      await ref.create(record);
      return "created";
    } catch (err) {
      if ((err as { code?: number }).code === ALREADY_EXISTS) {
        // Record the attempt without touching the original submission or its consent.
        await ref.update({ duplicateAttempts: FieldValue.increment(1), updatedAt: new Date() });
        return "exists";
      }
      throw err;
    }
  }

  async updateMarketing(requestId: string, action: MarketingAction, at: Date) {
    const ref = this.db.collection(COLLECTIONS.invites).doc(requestId);
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return "not_found" as const;
      const granted = (snap.data() as InviteRecord).consentRecords?.marketingUpdates?.granted === true;
      if (action === "confirm") {
        if (!granted) return "not_requested" as const;
        tx.update(ref, {
          "consentRecords.marketingUpdates.confirmedAt": at,
          "consentRecords.marketingUpdates.withdrawnAt": null,
          updatedAt: at,
        });
      } else {
        tx.update(ref, { "consentRecords.marketingUpdates.withdrawnAt": at, updatedAt: at });
      }
      return "updated" as const;
    });
  }
}

export class FirestorePilotStore implements PilotStore {
  constructor(private readonly db: Firestore) {}
  async add(record: PilotRecord): Promise<void> {
    await this.db.collection(COLLECTIONS.pilots).add(record);
  }
}

export class FirestoreContactStore implements ContactStore {
  constructor(private readonly db: Firestore) {}
  async add(record: ContactRecord): Promise<void> {
    await this.db.collection(COLLECTIONS.contacts).add(record);
  }
}

/**
 * Fixed-window limiter shared across all server instances.
 * Keys are already salted hashes — no raw IP addresses are stored.
 * Configure a Firestore TTL policy on rateLimits.expiresAt to auto-delete old docs.
 */
export class FirestoreRateLimiter implements RateLimiter {
  constructor(private readonly db: Firestore, private readonly now: () => number = Date.now) {}

  async hit(key: string, limit: number, windowMs: number) {
    const ref = this.db.collection(COLLECTIONS.rateLimits).doc(key);
    const t = this.now();
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? (snap.data() as { count: number; windowStart: number }) : null;
      if (!data || t - data.windowStart >= windowMs) {
        tx.set(ref, { count: 1, windowStart: t, expiresAt: new Date(t + windowMs * 2) });
        return { allowed: true, retryAfterSec: 0 };
      }
      if (data.count >= limit) {
        return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((data.windowStart + windowMs - t) / 1000)) };
      }
      tx.update(ref, { count: data.count + 1 });
      return { allowed: true, retryAfterSec: 0 };
    });
  }
}

/* ── Founding institutes ──────────────────────────────────────────────── */

const toDate = (v: unknown): Date | null =>
  v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : typeof v === "string" || typeof v === "number" ? new Date(v) : null;

function fromDoc(data: Record<string, unknown>): InstituteRecord {
  const digest = (data.weeklyDigest ?? {}) as Record<string, unknown>;
  const devices = (data.devices ?? {}) as Record<string, unknown>;
  return {
    ...(data as unknown as InstituteRecord),
    weeklyDigest: { granted: digest.granted === true, recordedAt: toDate(digest.recordedAt) ?? new Date(0), withdrawnAt: toDate(digest.withdrawnAt) },
    devices: { teacher: Number(devices.teacher) || 0, student: Number(devices.student) || 0 },
    createdAt: toDate(data.createdAt) ?? new Date(0),
    activatedAt: toDate(data.activatedAt),
    lastActiveAt: toDate(data.lastActiveAt),
    proUntil: typeof data.proUntil === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.proUntil) ? data.proUntil : null,
    testDay: Number.isInteger(data.testDay) && (data.testDay as number) >= 0 && (data.testDay as number) <= 6 ? (data.testDay as number) : null,
  };
}

/** Known-institute cache so usage events don't cost a read every time. */
const knownCodes = new Map<string, { exists: boolean; activated: boolean; at: number }>();
const KNOWN_TTL = 10 * 60 * 1000;

export class FirestoreInstituteStore implements InstituteStore {
  constructor(private readonly db: Firestore) {}

  private ref(code: string) {
    return this.db.collection(COLLECTIONS.institutes).doc(code);
  }

  async create(input: NewInstitute, opts: { cap: number; makeCode: () => string }) {
    const metaRef = this.db.collection(COLLECTIONS.meta).doc("founding");
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = opts.makeCode();
      const ref = this.ref(code);
      const result = await this.db.runTransaction(async (tx) => {
        const [meta, existing] = await Promise.all([tx.get(metaRef), tx.get(ref)]);
        if (existing.exists) return null;
        const taken = meta.exists ? Number((meta.data() as { taken?: number }).taken) || 0 : 0;
        const seat = taken < opts.cap ? taken + 1 : null;
        const record: InstituteRecord = {
          ...input,
          code,
          foundingSeat: seat,
          status: "active",
          notes: null,
          nextFollowUp: null,
          proUntil: null,
          devices: { teacher: 0, student: 0 },
          activatedAt: null,
          lastActiveAt: null,
        };
        tx.create(ref, record);
        tx.set(metaRef, { taken: seat ? seat : taken, institutes: FieldValue.increment(1), updatedAt: new Date() }, { merge: true });
        return { code, seat };
      });
      if (result) return result;
    }
    throw new Error("Could not allocate a unique institute code");
  }

  async get(code: string) {
    const snap = await this.ref(code).get();
    return snap.exists ? fromDoc(snap.data() as Record<string, unknown>) : null;
  }

  async recordUsage(input: Parameters<InstituteStore["recordUsage"]>[0]) {
    const totals: Record<string, FieldValue> = {};
    const add = (k: string, n: number) => (totals[k] = FieldValue.increment(n));
    let student = 0;
    for (const e of input.events) {
      if (e.type === "analysis_real") add("analysesReal", e.n);
      if (e.type === "links_shared") add("linksShared", e.n);
      if (e.type === "report_opened") add("reportsOpened", e.n);
      if (STUDENT_EVENTS.has(e.type)) student += e.n;
    }
    if (student) add("studentActions", student);
    const writes: Array<Promise<unknown>> = [];

    const code = input.code;
    if (code) {
      let known = knownCodes.get(code);
      if (!known || Date.now() - known.at > KNOWN_TTL) {
        const snap = await this.ref(code).get();
        known = { exists: snap.exists, activated: Boolean(snap.exists && (snap.data() as { activatedAt?: unknown }).activatedAt), at: Date.now() };
        knownCodes.set(code, known);
      }
      if (known.exists) {
        // Public totals only count activity attributed to a registered institute.
        if (Object.keys(totals).length) writes.push(this.db.collection(COLLECTIONS.meta).doc("totals").set(totals, { merge: true }));
        const ref = this.ref(code);
        const counters: Record<string, FieldValue | string> = { date: input.day };
        const merged = new Map<UsageEvent, number>();
        for (const e of input.events) merged.set(e.type, (merged.get(e.type) ?? 0) + e.n);
        for (const [k, n] of merged) counters[k] = FieldValue.increment(n);
        writes.push(ref.collection("days").doc(input.day).set(counters, { merge: true }));

        const patch: Record<string, unknown> = { lastActiveAt: input.at };
        if (!known.activated && merged.has("analysis_real")) {
          patch.activatedAt = input.at;
          known.activated = true;
        }
        writes.push(ref.update(patch).then(async () => {
          // Keep the earliest activation even if two first tests race.
          if (patch.activatedAt) {
            await this.db.runTransaction(async (tx) => {
              const snap = await tx.get(ref);
              const cur = toDate((snap.data() as { activatedAt?: unknown } | undefined)?.activatedAt);
              if (cur && cur.getTime() > input.at.getTime()) tx.update(ref, { activatedAt: input.at });
            });
          }
        }));

        const deviceRef = ref.collection("devices").doc(input.deviceKey);
        writes.push(
          deviceRef
            .create({ role: input.role, firstSeen: input.day, lastSeen: input.day })
            .then(() => ref.update({ [`devices.${input.role}`]: FieldValue.increment(1) }))
            .catch(async (err: { code?: number }) => {
              if (err.code === ALREADY_EXISTS) await deviceRef.update({ lastSeen: input.day });
              else throw err;
            }),
        );
      }
    }
    await Promise.all(writes);
  }

  async usage(code: string, maxDays = 180): Promise<InstituteUsage> {
    const ref = this.ref(code);
    const [inst, days, feedback] = await Promise.all([
      ref.get(),
      ref.collection("days").orderBy(FieldPath.documentId(), "desc").limit(maxDays).get(),
      ref.collection("feedback").orderBy("at", "desc").limit(100).get(),
    ]);
    const record = inst.exists ? fromDoc(inst.data() as Record<string, unknown>) : null;
    return {
      days: days.docs.map((d) => {
        const { date: _date, ...c } = d.data() as Record<string, number | string>;
        void _date;
        return { date: d.id, c: c as DayRow["c"] };
      }),
      devices: record?.devices ?? { teacher: 0, student: 0 },
      feedback: feedback.docs.map((d) => d.data() as FeedbackRow).reverse(),
    };
  }

  async addFeedback(code: string, row: FeedbackRow) {
    await this.ref(code).collection("feedback").add(row);
  }

  /** benchmarks/{city|chapter} → { inst: { [code]: { avg, date } } } — latest average per institute. */
  private benchRef(city: string, key: string) {
    // Document ids can't contain "/"; chapterKey already strips punctuation.
    return this.db.collection(COLLECTIONS.benchmarks).doc(`${cityKey(city)}|${key}`.slice(0, 300));
  }

  async addSummary(code: string, summary: StoredSummary) {
    const ref = this.ref(code);
    const snap = await ref.get();
    const city = snap.exists ? String((snap.data() as { city?: string }).city ?? "") : "";
    const batch = this.db.batch();
    batch.set(ref.collection("summaries").doc(summary.id), summary);
    for (const t of summary.topics) {
      if (t.avg === null) continue;
      batch.set(this.benchRef(city, chapterKey(t.n)), { inst: { [code]: { avg: t.avg, date: summary.date } }, updatedAt: new Date() }, { merge: true });
    }
    await batch.commit();
  }

  async benchmarks(city: string, keys: string[]) {
    const out = new Map<string, BenchmarkDoc>();
    const unique = [...new Set(keys)].slice(0, 60);
    if (!unique.length) return out;
    const snaps = await this.db.getAll(...unique.map((k) => this.benchRef(city, k)));
    snaps.forEach((d, i) => {
      if (d.exists) out.set(unique[i]!, ((d.data() as { inst?: BenchmarkDoc }).inst ?? {}) as BenchmarkDoc);
    });
    return out;
  }

  async summaries(code: string, limit = 60): Promise<StoredSummary[]> {
    const snap = await this.ref(code).collection("summaries").orderBy("date", "desc").limit(limit).get();
    return snap.docs.map((d) => d.data() as StoredSummary);
  }

  async list() {
    const snap = await this.db.collection(COLLECTIONS.institutes).orderBy("createdAt", "desc").limit(500).get();
    return snap.docs.map((d) => fromDoc(d.data() as Record<string, unknown>));
  }

  async update(code: string, patch: InstitutePatch) {
    try {
      await this.ref(code).update(patch);
      return true;
    } catch (err) {
      if ((err as { code?: number }).code === 5) return false; // NOT_FOUND
      throw err;
    }
  }

  async setDigest(code: string, granted: boolean, at: Date) {
    const patch = granted
      ? { weeklyDigest: { granted: true, recordedAt: at, withdrawnAt: null } }
      : { "weeklyDigest.withdrawnAt": at };
    try {
      await this.ref(code).update(patch);
      return true;
    } catch (err) {
      if ((err as { code?: number }).code === 5) return false;
      throw err;
    }
  }

  async remove(code: string) {
    const ref = this.ref(code);
    const snap = await ref.get();
    if (!snap.exists) return false;
    const seat = (snap.data() as { foundingSeat?: number | null }).foundingSeat ?? null;
    // Remove this institute from every city benchmark it contributed to.
    const city = String((snap.data() as { city?: string }).city ?? "");
    const shared = await ref.collection("summaries").get();
    const keys = new Set(shared.docs.flatMap((d) => ((d.data() as StoredSummary).topics ?? []).map((t) => chapterKey(t.n))));
    if (keys.size) {
      const wb = this.db.batch();
      for (const k of keys) wb.set(this.benchRef(city, k), { inst: { [code]: FieldValue.delete() } }, { merge: true });
      await wb.commit();
    }
    const metaRef = this.db.collection(COLLECTIONS.meta).doc("founding");
    await this.db.runTransaction(async (tx) => {
      const meta = await tx.get(metaRef);
      const taken = meta.exists ? Number((meta.data() as { taken?: number }).taken) || 0 : 0;
      const patch: Record<string, unknown> = { institutes: FieldValue.increment(-1), updatedAt: new Date() };
      // Release the seat only if it was the most recent one (e.g. a test sign-up), so other
      // institutes' seat numbers never change.
      if (seat && seat === taken) patch.taken = taken - 1;
      tx.set(metaRef, patch, { merge: true });
    });
    await this.db.recursiveDelete(ref);
    knownCodes.delete(code);
    return true;
  }

  async totals(): Promise<PublicTotals> {
    const [founding, totals] = await Promise.all([
      this.db.collection(COLLECTIONS.meta).doc("founding").get(),
      this.db.collection(COLLECTIONS.meta).doc("totals").get(),
    ]);
    const f = (founding.data() ?? {}) as Record<string, number>;
    const t = (totals.data() ?? {}) as Record<string, number>;
    return {
      institutes: Number(f.institutes) || 0,
      foundingTaken: Number(f.taken) || 0,
      analysesReal: Number(t.analysesReal) || 0,
      linksShared: Number(t.linksShared) || 0,
      reportsOpened: Number(t.reportsOpened) || 0,
      studentActions: Number(t.studentActions) || 0,
    };
  }
}
