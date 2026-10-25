/**
 * Paid plan, kept deliberately simple for the founding stage: the owner collects payment
 * (e.g. a Razorpay payment link) and sets "Pro until" on /admin. No card data ever touches Heramb.
 */
import type { StoredSummary } from "./summary";

/** Shared tests kept per batch on the free plan (enough to show the change since last test). */
export const FREE_TESTS_PER_BATCH = 2;

export function isPro(proUntil: string | null | undefined, today: string): boolean {
  return typeof proUntil === "string" && /^\d{4}-\d{2}-\d{2}$/.test(proUntil) && proUntil >= today;
}

/** Free plan: the latest FREE_TESTS_PER_BATCH shared tests per batch. Pro: everything. */
export function limitHistory(summaries: StoredSummary[], pro: boolean): StoredSummary[] {
  if (pro) return summaries;
  const seen = new Map<string, number>();
  return [...summaries]
    .sort((a, b) => b.date.localeCompare(a.date) || b.at.localeCompare(a.at))
    .filter((s) => {
      const k = s.batch.trim().toLowerCase();
      const n = (seen.get(k) ?? 0) + 1;
      seen.set(k, n);
      return n <= FREE_TESTS_PER_BATCH;
    });
}

/** Formula-safe CSV of every shared test (Pro export). */
export function batchHistoryCsv(summaries: StoredSummary[]): string {
  const cell = (v: unknown) => {
    let s = v === null || v === undefined ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [["Batch", "Test", "Date", "Students", "Class average %", "Chapter", "Chapter average %", "Attempted", "Below 50%"]];
  for (const s of [...summaries].sort((a, b) => a.batch.localeCompare(b.batch) || a.date.localeCompare(b.date))) {
    for (const t of s.topics) rows.push([s.batch, s.test, s.date, String(s.students), s.average === null ? "" : String(s.average), t.n, t.avg === null ? "" : String(t.avg), String(t.att), String(t.below)]);
  }
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\n");
}
