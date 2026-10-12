import Link from "next/link";
import type { ReactNode } from "react";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Primitives";

export type Faq = { q: string; a: ReactNode };

/** Native <details> accordion: keyboard and screen-reader accessible without JS. */
export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="divide-y divide-line rounded-card border border-line bg-paper-raised">
      {items.map((item) => (
        <details key={item.q} className="group px-5 sm:px-6">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-medium text-ink [&::-webkit-details-marker]:hidden">
            {item.q}
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-ink-muted transition-transform group-open:rotate-45" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </span>
          </summary>
          <div className="pb-5 text-[0.9375rem] leading-relaxed text-ink-soft [&_a]:font-medium [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-4">
            {item.a}
          </div>
        </details>
      ))}
    </div>
  );
}

type RoadmapItem = { title: string; body: string };

export function Roadmap({ now, next, later }: { now: RoadmapItem[]; next: RoadmapItem[]; later: RoadmapItem[] }) {
  const cols = [
    { label: "Available now", tone: "good" as const, items: now },
    { label: "In development", tone: "brand" as const, items: next },
    { label: "Planned, not started", tone: "neutral" as const, items: later },
  ];
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {cols.map((col) => (
        <section key={col.label} className="card p-5 sm:p-6" aria-label={col.label}>
          <Badge tone={col.tone}>{col.label}</Badge>
          <ul className="mt-4 space-y-4">
            {col.items.map((it) => (
              <li key={it.title}>
                <p className="font-medium text-ink">{it.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{it.body}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function InviteBand({
  title = "Help shape Heramb.study from the first version.",
  body = "We're opening access in small, invite-only groups so we can learn from real classrooms before scaling. Requesting an invite is free and doesn't commit you to anything.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <section className="on-night section relative overflow-hidden bg-night text-white" aria-labelledby="invite-band-title">
      <div className="bg-grid absolute inset-0 opacity-[0.07] invert" aria-hidden="true" />
      <div className="container relative">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B7B0F7]">Invite-only early access</p>
          <h2 id="invite-band-title" className="mt-3 text-display-lg text-white">{title}</h2>
          <p className="mt-5 text-lg leading-relaxed text-white/75">{body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/invite" variant="inverse" size="lg">Request an invite</LinkButton>
            <Link href="/how-it-works" className="inline-flex min-h-12 items-center px-2 font-medium text-white/85 underline-offset-4 hover:text-white hover:underline">
              Explore how it works →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FeatureCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="card h-full p-6">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand" aria-hidden="true">
        {icon}
      </span>
      <h3 className="mt-4 font-sans text-lg font-semibold">{title}</h3>
      <div className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">{children}</div>
    </div>
  );
}

export function Icon({ d }: { d: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
