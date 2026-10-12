import type {
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
