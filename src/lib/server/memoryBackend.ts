import { chapterKey, cityKey, type BenchmarkDoc, type StoredSummary } from "@/lib/institute/summary";
import type { DayRow, FeedbackRow } from "@/lib/institute/metrics";
import { STUDENT_EVENTS } from "@/lib/institute/events";
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

/**
 * In-memory implementations.
 * - Used for DEVELOPMENT (DEV_MEMORY_STORE=true) and tests only. Data is lost on restart.
 * - The memory rate limiter is also used as a per-instance first line of defence
 *   in front of the Firestore limiter in production.
 */
export class MemoryInviteStore implements InviteStore {
  readonly records = new Map<string, InviteRecord>();

  async createIfAbsent(record: InviteRecord): Promise<"created" | "exists"> {
    const existing = this.records.get(record.requestId);
    if (existing) {
      existing.duplicateAttempts += 1;
      existing.updatedAt = new Date();
      return "exists";
    }
    this.records.set(record.requestId, structuredClone(record));
    return "created";
  }

  async updateMarketing(requestId: string, action: MarketingAction, at: Date) {
    const r = this.records.get(requestId);
    if (!r) return "not_found" as const;
    const m = r.consentRecords.marketingUpdates;
    if (action === "confirm") {
      if (!m.granted) return "not_requested" as const;
      m.confirmedAt = at;
      m.withdrawnAt = null;
    } else {
      m.withdrawnAt = at;
    }
    r.updatedAt = at;
    return "updated" as const;
  }
}

export class MemoryPilotStore implements PilotStore {
  readonly records: PilotRecord[] = [];
  async add(record: PilotRecord): Promise<void> {
    this.records.push(structuredClone(record));
  }
}

export class MemoryContactStore implements ContactStore {
  readonly records: ContactRecord[] = [];
  async add(record: ContactRecord): Promise<void> {
    this.records.push(structuredClone(record));
  }
}

export class MemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly maxKeys: number;
  constructor(private readonly now: () => number = Date.now, maxKeys = 10_000) {
    this.maxKeys = maxKeys;
  }

  async hit(key: string, limit: number, windowMs: number) {
    const t = this.now();
    const recent = (this.hits.get(key) ?? []).filter((ts) => t - ts < windowMs);
    if (recent.length >= limit) {
      const oldest = recent[0] ?? t;
      this.hits.set(key, recent);
      return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((oldest + windowMs - t) / 1000)) };
    }
    recent.push(t);
    this.hits.set(key, recent);
    // Bound memory: drop the oldest key when the map grows too large.
    if (this.hits.size > this.maxKeys) {
      const first = this.hits.keys().next().value;
      if (first !== undefined) this.hits.delete(first);
    }
    return { allowed: true, retryAfterSec: 0 };
  }
}

type MemoryInstitute = {
  record: InstituteRecord;
  days: Map<string, DayRow["c"]>;
  devices: Set<string>;
  feedback: FeedbackRow[];
  summaries: Map<string, StoredSummary>;
};

export class MemoryInstituteStore implements InstituteStore {
  readonly institutes = new Map<string, MemoryInstitute>();
  private foundingTaken = 0;
  private readonly global = { analysesReal: 0, linksShared: 0, reportsOpened: 0, studentActions: 0 };

  async create(input: NewInstitute, opts: { cap: number; makeCode: () => string }) {
    let code = opts.makeCode();
    for (let i = 0; this.institutes.has(code) && i < 10; i++) code = opts.makeCode();
    if (this.institutes.has(code)) throw new Error("Could not allocate a unique institute code");
    const seat = this.foundingTaken < opts.cap ? ++this.foundingTaken : null;
    const record: InstituteRecord = {
      ...structuredClone(input),
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
    this.institutes.set(code, { record, days: new Map(), devices: new Set(), feedback: [], summaries: new Map() });
    return { code, seat };
  }

  async get(code: string) {
    const i = this.institutes.get(code);
    return i ? structuredClone(i.record) : null;
  }

  async recordUsage(input: Parameters<InstituteStore["recordUsage"]>[0]) {
    const inst = input.code ? this.institutes.get(input.code) : undefined;
    if (!inst) return;
    for (const e of input.events) {
      if (e.type === "analysis_real") this.global.analysesReal += e.n;
      if (e.type === "links_shared") this.global.linksShared += e.n;
      if (e.type === "report_opened") this.global.reportsOpened += e.n;
      if (STUDENT_EVENTS.has(e.type)) this.global.studentActions += e.n;
    }
    const day = inst.days.get(input.day) ?? {};
    for (const e of input.events) day[e.type] = (day[e.type] ?? 0) + e.n;
    inst.days.set(input.day, day);
    if (!inst.devices.has(input.deviceKey)) {
      inst.devices.add(input.deviceKey);
      inst.record.devices[input.role] += 1;
    }
    inst.record.lastActiveAt = input.at;
    if (!inst.record.activatedAt && input.events.some((e) => e.type === "analysis_real")) inst.record.activatedAt = input.at;
  }

  async usage(code: string, maxDays = 180): Promise<InstituteUsage> {
    const inst = this.institutes.get(code);
    if (!inst) return { days: [], devices: { teacher: 0, student: 0 }, feedback: [] };
    const days = [...inst.days.entries()].map(([date, c]) => ({ date, c: { ...c } })).sort((a, b) => b.date.localeCompare(a.date)).slice(0, maxDays);
    return { days, devices: { ...inst.record.devices }, feedback: structuredClone(inst.feedback) };
  }

  async addFeedback(code: string, row: FeedbackRow) {
    const inst = this.institutes.get(code);
    if (!inst) return;
    inst.feedback.push(structuredClone(row));
    if (inst.feedback.length > 200) inst.feedback.shift();
  }

  readonly bench = new Map<string, BenchmarkDoc>();

  async addSummary(code: string, summary: StoredSummary) {
    const inst = this.institutes.get(code);
    if (!inst) return;
    inst.summaries.set(summary.id, structuredClone(summary));
    const city = cityKey(inst.record.city);
    for (const t of summary.topics) {
      if (t.avg === null) continue;
      const k = `${city}|${chapterKey(t.n)}`;
      const doc = this.bench.get(k) ?? {};
      const prev = doc[code];
      if (!prev || prev.date <= summary.date) doc[code] = { avg: t.avg, date: summary.date };
      this.bench.set(k, doc);
    }
    if (inst.summaries.size > 300) inst.summaries.delete(inst.summaries.keys().next().value!);
  }

  async benchmarks(city: string, keys: string[]) {
    const out = new Map<string, BenchmarkDoc>();
    for (const k of keys) {
      const doc = this.bench.get(`${cityKey(city)}|${k}`);
      if (doc) out.set(k, structuredClone(doc));
    }
    return out;
  }

  async summaries(code: string, limit = 60): Promise<StoredSummary[]> {
    const inst = this.institutes.get(code);
    if (!inst) return [];
    return [...inst.summaries.values()].sort((a, b) => b.date.localeCompare(a.date) || b.at.localeCompare(a.at)).slice(0, limit).map((x) => structuredClone(x));
  }

  async list() {
    return [...this.institutes.values()].map((i) => structuredClone(i.record)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async update(code: string, patch: InstitutePatch) {
    const inst = this.institutes.get(code);
    if (!inst) return false;
    Object.assign(inst.record, patch);
    return true;
  }

  async setDigest(code: string, granted: boolean, at: Date) {
    const inst = this.institutes.get(code);
    if (!inst) return false;
    inst.record.weeklyDigest = granted ? { granted: true, recordedAt: at, withdrawnAt: null } : { ...inst.record.weeklyDigest, withdrawnAt: at };
    return true;
  }

  async remove(code: string) {
    const inst = this.institutes.get(code);
    if (!inst) return false;
    // Release the seat only if it was the most recent one (e.g. a test sign-up), so
    // other institutes' seat numbers never change.
    if (inst.record.foundingSeat && inst.record.foundingSeat === this.foundingTaken) this.foundingTaken -= 1;
    for (const doc of this.bench.values()) delete doc[code];
    return this.institutes.delete(code);
  }

  async totals(): Promise<PublicTotals> {
    return { institutes: this.institutes.size, foundingTaken: this.foundingTaken, ...this.global };
  }
}
