import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "brand" | "good" | "warn" | "gap" | "night";

const badgeTones: Record<Tone, string> = {
  neutral: "bg-paper-sunk text-ink-soft border-line",
  brand: "bg-brand-tint text-brand-strong border-brand/20",
  good: "bg-good-tint text-good border-good/20",
  warn: "bg-warn-tint text-warn border-warn/20",
  gap: "bg-gap-tint text-gap border-gap/20",
  night: "bg-white/10 text-white border-white/15",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
  id,
  as: Tag = "h2",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: "left" | "center";
  id?: string;
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
      <Tag id={id} className={Tag === "h1" ? "text-display-xl" : "text-display-lg"}>
        {title}
      </Tag>
      {lede ? <p className="lede mt-5">{lede}</p> : null}
    </div>
  );
}

export function Callout({
  tone = "brand",
  title,
  children,
  className,
}: {
  tone?: "brand" | "warn" | "neutral";
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    brand: "border-brand/25 bg-brand-tint/60",
    warn: "border-warn/30 bg-warn-tint/70",
    neutral: "border-line bg-paper-sunk",
  } as const;
  return (
    <aside className={cn("rounded-2xl border px-5 py-4 text-[0.9375rem] leading-relaxed text-ink-soft", tones[tone], className)}>
      {title ? <p className="mb-1 font-semibold text-ink">{title}</p> : null}
      {children}
    </aside>
  );
}

export function PageHeader({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" aria-hidden="true" />
      <div className="container relative pb-14 pt-14 sm:pb-20 sm:pt-20">
        <SectionHeading as="h1" eyebrow={eyebrow} title={title} lede={lede} />
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </section>
  );
}

export function FictionalDataLabel({ className }: { className?: string }) {
  return (
    <Badge tone="warn" className={className}>
      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5.25" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 3.5v3M6 8.2v.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      Illustrative — fictional data
    </Badge>
  );
}
