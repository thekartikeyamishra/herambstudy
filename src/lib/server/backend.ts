import { getAdminDb, adminConfigStatus } from "./firebaseAdmin";
import { FirestoreContactStore, FirestoreInviteStore, FirestorePilotStore, FirestoreRateLimiter } from "./firestoreBackend";
import { MemoryContactStore, MemoryInviteStore, MemoryPilotStore, MemoryRateLimiter } from "./memoryBackend";
import type { Backend } from "./types";

type MemoryBundle = {
  invites: MemoryInviteStore;
  contacts: MemoryContactStore;
  pilots: MemoryPilotStore;
  limiter: MemoryRateLimiter;
};

const g = globalThis as typeof globalThis & {
  __herambMemory?: MemoryBundle;
  __herambEdgeLimiter?: MemoryRateLimiter;
  __herambBackendOverride?: Backend | null;
};

function memoryBundle(): MemoryBundle {
  g.__herambMemory ??= {
    invites: new MemoryInviteStore(),
    contacts: new MemoryContactStore(),
    pilots: new MemoryPilotStore(),
    limiter: new MemoryRateLimiter(),
  };
  return g.__herambMemory;
}

/** Per-instance limiter that runs before the shared one (cheap first line of defence). */
export function instanceLimiter(): MemoryRateLimiter {
  g.__herambEdgeLimiter ??= new MemoryRateLimiter();
  return g.__herambEdgeLimiter;
}

/**
 * Chooses where submissions are stored:
 *  1. Firestore when Admin credentials are configured.
 *  2. In-memory ONLY outside production and only when DEV_MEMORY_STORE=true.
 *  3. Otherwise "unavailable" — the API answers 503 and the UI says so honestly.
 */
export function getBackend(): Backend {
  if (g.__herambBackendOverride) return g.__herambBackendOverride;

  if (adminConfigStatus().configured) {
    const db = getAdminDb();
    if (db) {
      return {
        kind: "firestore",
        invites: new FirestoreInviteStore(db),
        contacts: new FirestoreContactStore(db),
        pilots: new FirestorePilotStore(db),
        limiter: new FirestoreRateLimiter(db),
      };
    }
    return { kind: "unavailable", reason: "Firebase Admin failed to initialise." };
  }

  if (process.env.NODE_ENV !== "production" && process.env.DEV_MEMORY_STORE === "true") {
    return { kind: "memory", ...memoryBundle() };
  }

  return { kind: "unavailable", reason: "No storage backend is configured." };
}

/** Test hook — replaces the backend for the current process. */
export function __setBackendForTests(backend: Backend | null): void {
  g.__herambBackendOverride = backend;
  g.__herambEdgeLimiter = undefined;
}
