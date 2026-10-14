/**
 * Local workspace for the class progress tracker.
 *
 * Everything is stored in this browser's localStorage only — never sent to a
 * server. That keeps student marks off our infrastructure, but it also means the
 * data disappears if browser data is cleared, so the UI always offers a backup.
 */
import { z } from "zod";
import { buildDataset, LIMITS, parseTable } from "@/lib/tools/classAnalysis";

export const WORKSPACE_KEY = "heramb.workspace.v1";
/** Stay well below the ~5 MB per-origin localStorage limit. */
export const MAX_WORKSPACE_BYTES = 4_000_000;
export const MAX_CLASSES = 50;
export const MAX_TESTS_PER_CLASS = 60;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const label = (max: number) => z.string().trim().min(1).max(max);

export const storedTestSchema = z.object({
  id: z.string().regex(/^[a-z0-9]{6,32}$/),
  name: label(80),
  date: isoDate,
  raw: z.string().min(1).max(LIMITS.bytes),
  savedAt: z.string().max(40),
});

export const storedClassSchema = z.object({
  id: z.string().regex(/^[a-z0-9]{6,32}$/),
  name: label(80),
  subject: z.string().trim().max(80).default(""),
  createdAt: z.string().max(40),
  tests: z.array(storedTestSchema).max(MAX_TESTS_PER_CLASS),
});

export const workspaceSchema = z.object({
  version: z.literal(1),
  classes: z.array(storedClassSchema).max(MAX_CLASSES),
});

export type StoredTest = z.infer<typeof storedTestSchema>;
export type StoredClass = z.infer<typeof storedClassSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;

export const emptyWorkspace = (): Workspace => ({ version: 1, classes: [] });

export function newId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 12);
}

export type LoadResult = { ok: true; workspace: Workspace } | { ok: false; reason: "unavailable" | "corrupt"; workspace: Workspace };

export function loadWorkspace(storage: Storage | null = safeStorage()): LoadResult {
  if (!storage) return { ok: false, reason: "unavailable", workspace: emptyWorkspace() };
  let raw: string | null;
  try {
    raw = storage.getItem(WORKSPACE_KEY);
  } catch {
    return { ok: false, reason: "unavailable", workspace: emptyWorkspace() };
  }
  if (!raw) return { ok: true, workspace: emptyWorkspace() };
  try {
    const parsed = workspaceSchema.safeParse(JSON.parse(raw));
    return parsed.success ? { ok: true, workspace: parsed.data } : { ok: false, reason: "corrupt", workspace: emptyWorkspace() };
  } catch {
    return { ok: false, reason: "corrupt", workspace: emptyWorkspace() };
  }
}

export type SaveResult = { ok: true } | { ok: false; reason: "too_large" | "unavailable" | "quota" | "invalid" };

export function saveWorkspace(ws: Workspace, storage: Storage | null = safeStorage()): SaveResult {
  // Validate before writing: anything that wouldn't load back must never be stored,
  // otherwise all saved classes would look corrupt on the next visit.
  if (!workspaceSchema.safeParse(ws).success) return { ok: false, reason: "invalid" };
  const json = JSON.stringify(ws);
  if (new TextEncoder().encode(json).byteLength > MAX_WORKSPACE_BYTES) return { ok: false, reason: "too_large" };
  if (!storage) return { ok: false, reason: "unavailable" };
  try {
    storage.setItem(WORKSPACE_KEY, json);
    return { ok: true };
  } catch (err) {
    const quota = err instanceof DOMException && (err.name === "QuotaExceededError" || err.code === 22);
    return { ok: false, reason: quota ? "quota" : "unavailable" };
  }
}

export function saveErrorMessage(reason: "too_large" | "unavailable" | "quota" | "invalid"): string {
  if (reason === "invalid") return "That couldn't be saved because some of it is too long or incomplete (each test must be under 1 MB, names under 80 characters). Nothing was changed.";
  if (reason === "unavailable") return "This browser isn't allowing local storage (private mode or blocked site data), so nothing could be saved.";
  return "Your saved classes are too large for this browser's storage. Export a backup, then delete old tests or classes.";
}

/** Validates a backup file. Every test must still parse as a valid class table. */
export function parseBackup(text: string): { ok: true; workspace: Workspace } | { ok: false; message: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, message: "That file isn't a Heramb backup (not valid JSON)." };
  }
  const parsed = workspaceSchema.safeParse(data);
  if (!parsed.success) return { ok: false, message: "That file isn't a valid Heramb backup, or it was created by a newer version." };
  for (const c of parsed.data.classes) {
    for (const t of c.tests) {
      if (!buildDataset(parseTable(t.raw)).dataset) return { ok: false, message: `The test "${t.name}" in "${c.name}" couldn't be read.` };
    }
  }
  return { ok: true, workspace: parsed.data };
}

/** Adds imported classes; classes whose id already exists get a fresh id instead of overwriting. */
export function mergeWorkspaces(current: Workspace, incoming: Workspace): { workspace: Workspace; added: number; skipped: number } {
  const ids = new Set(current.classes.map((c) => c.id));
  const room = MAX_CLASSES - current.classes.length;
  const toAdd = incoming.classes.slice(0, Math.max(0, room)).map((c) => (ids.has(c.id) ? { ...c, id: newId() } : c));
  return {
    workspace: { version: 1, classes: [...current.classes, ...toAdd] },
    added: toAdd.length,
    skipped: incoming.classes.length - toAdd.length,
  };
}

export function todayIso(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function safeStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}
