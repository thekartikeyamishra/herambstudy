import type { DayRow, DeviceCounts, FeedbackRow } from "@/lib/institute/metrics";
import type { UsageEvent } from "@/lib/institute/events";
import type {
  ContactTopic,
  JoinSource,
  InstituteSize,
  InstitutionType,
  PilotExam,
  PilotRole,
  PriceComfort,
  Role,
  StartWindow,
  TestFrequency,
  UseCase,
} from "@/lib/validation/schemas";

export type ConsentRecord = { granted: boolean; version: string; recordedAt: Date };

/**
 * Marketing consent uses double opt-in: `granted` records the ticked checkbox,
 * `confirmedAt` the click on the emailed confirmation link. Only people with
 * granted && confirmedAt && !withdrawnAt may receive product updates.
 */
export type MarketingConsentRecord = ConsentRecord & { confirmedAt: Date | null; withdrawnAt: Date | null };

/** Firestore document: inviteRequests/{requestId}. Only fields we actually need. */
export interface InviteRecord {
  requestId: string;
  normalizedEmail: string;
  name: string | null;
  role: Role;
  country: string;
  useCase: UseCase;
  useCaseNote: string | null;
  institute: { name: string | null; size: InstituteSize | null } | null;
  consentRecords: {
    privacyNotice: ConsentRecord;
    marketingUpdates: MarketingConsentRecord;
  };
  status: "pending" | "invited" | "declined" | "withdrawn";
  createdAt: Date;
  updatedAt: Date;
  sourceCampaign: string | null;
  sourceLandingPage: string | null;
  duplicateAttempts: number;
}

/** Firestore document: contactMessages/{autoId}. */
export interface ContactRecord {
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
  privacyNoticeVersion: string;
  status: "new" | "handled";
  createdAt: Date;
}

/** Firestore document: pilotApplications/{autoId}. */
export interface PilotRecord {
  contactName: string;
  role: PilotRole;
  email: string;
  phone: string | null;
  institutionType: InstitutionType;
  instituteName: string;
  city: string;
  country: string;
  studentCount: InstituteSize;
  exams: PilotExam[];
  testFrequency: TestFrequency;
  currentTools: string | null;
  startWindow: StartWindow;
  priceComfort: PriceComfort | null;
  notes: string | null;
  privacyNoticeVersion: string;
  status: "new" | "contacted" | "qualified" | "piloting" | "closed";
  createdAt: Date;
}

export type MarketingAction = "confirm" | "withdraw";

export interface InviteStore {
  /** Creates the record only if no record with this id exists. Never overwrites. */
  createIfAbsent(record: InviteRecord): Promise<"created" | "exists">;
  /**
   * Confirms (double opt-in) or withdraws marketing consent.
   * "not_requested" = the person never ticked the updates box, so confirming is refused.
   */
  updateMarketing(requestId: string, action: MarketingAction, at: Date): Promise<"updated" | "not_found" | "not_requested">;
}

export interface PilotStore {
  add(record: PilotRecord): Promise<void>;
}

export interface ContactStore {
  add(record: ContactRecord): Promise<void>;
}

export interface RateLimiter {
  /** Records a hit and reports whether the caller is still within the limit. */
  hit(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; retryAfterSec: number }>;
}

/* ── Founding institutes and the usage ledger ───────────────────────────── */

export type InstituteStatus = "active" | "paused" | "closed";

/** Firestore document: institutes/{code}. Contact details are visible only to the owner. */
export interface InstituteRecord {
  code: string;
  name: string;
  city: string;
  institutionType: InstitutionType;
  contactName: string;
  role: PilotRole;
  phone: string | null;
  email: string | null;
  /** Opt-in weekly summary + test-day reminder email. */
  weeklyDigest: { granted: boolean; recordedAt: Date; withdrawnAt: Date | null };
  source: JoinSource | null;
  foundingSeat: number | null;
  status: InstituteStatus;
  /** Owner-only CRM fields. */
  notes: string | null;
  nextFollowUp: string | null;
  devices: DeviceCounts;
  createdAt: Date;
  activatedAt: Date | null;
  lastActiveAt: Date | null;
  privacyNoticeVersion: string;
}

export type NewInstitute = Omit<InstituteRecord, "code" | "foundingSeat" | "devices" | "activatedAt" | "lastActiveAt" | "status" | "notes" | "nextFollowUp">;

export type InstituteUsage = { days: DayRow[]; devices: DeviceCounts; feedback: FeedbackRow[] };

export type PublicTotals = {
  institutes: number;
  foundingTaken: number;
  analysesReal: number;
  linksShared: number;
  reportsOpened: number;
  studentActions: number;
};

export type InstitutePatch = Partial<Pick<InstituteRecord, "status" | "notes" | "nextFollowUp">>;

export interface InstituteStore {
  /** Creates an institute with a fresh unique code; assigns a founding seat while seats remain. */
  create(input: NewInstitute, opts: { cap: number; makeCode: () => string }): Promise<{ code: string; seat: number | null }>;
  get(code: string): Promise<InstituteRecord | null>;
  /** Adds anonymous counts. Unknown codes only update the global totals. */
  recordUsage(input: { code: string | null; deviceKey: string; role: "teacher" | "student"; events: Array<{ type: UsageEvent; n: number }>; day: string; at: Date }): Promise<void>;
  usage(code: string, maxDays?: number): Promise<InstituteUsage>;
  addFeedback(code: string, row: FeedbackRow): Promise<void>;
  list(): Promise<InstituteRecord[]>;
  update(code: string, patch: InstitutePatch): Promise<boolean>;
  setDigest(code: string, granted: boolean, at: Date): Promise<boolean>;
  /** Deletes the institute and all its usage data (data-deletion requests). */
  remove(code: string): Promise<boolean>;
  totals(): Promise<PublicTotals>;
}

export type Backend =
  | {
      kind: "firestore" | "memory";
      invites: InviteStore;
      contacts: ContactStore;
      pilots: PilotStore;
      institutes: InstituteStore;
      limiter: RateLimiter;
    }
  | { kind: "unavailable"; reason: string };
