import { FieldValue, type Firestore } from "firebase-admin/firestore";
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

export const COLLECTIONS = {
  invites: "inviteRequests",
  contacts: "contactMessages",
  pilots: "pilotApplications",
  rateLimits: "rateLimits",
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
