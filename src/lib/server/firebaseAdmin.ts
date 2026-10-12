import { cert, getApps, initializeApp, applicationDefault, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Lazily initialises the Firebase Admin SDK. SERVER ONLY.
 * Returns null (never throws) when credentials are not configured, so callers can
 * produce an honest "service unavailable" response instead of a fake success.
 */
let cached: Firestore | null | undefined;

export function adminConfigStatus(): { configured: boolean; mode: "service-account" | "adc" | "none" } {
  if (process.env.FIREBASE_USE_ADC === "true") return { configured: true, mode: "adc" };
  const ok = Boolean(
    process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY,
  );
  return { configured: ok, mode: ok ? "service-account" : "none" };
}

export function getAdminDb(): Firestore | null {
  if (cached !== undefined) return cached;
  const status = adminConfigStatus();
  if (!status.configured) {
    cached = null;
    return cached;
  }
  try {
    const existing = getApps().find((a) => a.name === "heramb-admin");
    const app: App =
      existing ??
      initializeApp(
        status.mode === "adc"
          ? { credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID || undefined }
          : {
              credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
              }),
              projectId: process.env.FIREBASE_PROJECT_ID,
            },
        "heramb-admin",
      );
    const db = getFirestore(app);
    db.settings({ ignoreUndefinedProperties: true });
    cached = db;
  } catch (err) {
    console.error("[firebase-admin] initialisation failed:", err instanceof Error ? err.message : "unknown error");
    cached = null;
  }
  return cached;
}
