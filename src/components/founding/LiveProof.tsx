"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type Totals = { institutes: number; foundingTaken: number; analysesReal: number; linksShared: number; reportsOpened: number; studentActions: number };
type Reply = { ok: true; show: boolean; totals?: Totals; cap?: number };

const fmt = (n: number) => n.toLocaleString("en-IN");

/**
 * Real, aggregate usage numbers. Renders nothing until there's enough real activity to be
 * meaningful (PUBLIC_STATS_MIN institutes), and never shows estimates or placeholders.
 */
export function LiveProof({ className, variant = "card" }: { className?: string; variant?: "card" | "band" }) {
  const [data, setData] = useState<Reply | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/stats/public")
      .then((r) => (r.ok ? (r.json() as Promise<Reply>) : null))
      .then((d) => alive && setData(d))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  if (!data?.show || !data.totals || !data.cap) return null;
  const t = data.totals;
  const items: Array<[string, string]> = [
    [`${fmt(t.foundingTaken)} of ${data.cap}`, "founding seats taken"],
    [fmt(t.analysesReal), "real tests analysed"],
    [fmt(t.linksShared), "report links sent to students"],
    [fmt(t.reportsOpened), "reports opened by students"],
  ];
  return (
    <section aria-label="Live usage" className={cn(variant === "band" ? "border-y border-line bg-paper-sunk/60 py-6" : "rounded-2xl border border-line bg-paper-raised p-5", className)} data-testid="live-proof">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Live · updated every few minutes</p>
      <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map(([v, k]) => (
          <div key={k}>
            <dt className="sr-only">{k}</dt>
            <dd className="tabular text-2xl font-semibold text-ink">{v}</dd>
            <dd className="text-xs text-ink-muted">{k}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
