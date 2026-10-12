import { cn } from "@/lib/cn";

/** Original Heramb mark: three ascending bars resolving into a progress dot. */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("h-8 w-8", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect width="40" height="40" rx="11" fill="rgb(var(--ink))" />
      <rect x="9" y="21" width="5" height="10" rx="2.5" fill="#FFFFFF" fillOpacity="0.55" />
      <rect x="17.5" y="15" width="5" height="16" rx="2.5" fill="#FFFFFF" fillOpacity="0.8" />
      <rect x="26" y="17" width="5" height="14" rx="2.5" fill="#FFFFFF" />
      <circle cx="28.5" cy="10.5" r="3" fill="#8F86F2" />
    </svg>
  );
}

export function Logo({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className={cn("font-display text-[1.3rem] font-semibold tracking-tight", inverse ? "text-white" : "text-ink")}>
        Heramb<span className={inverse ? "text-white/55" : "text-ink-muted"}>.study</span>
      </span>
    </span>
  );
}
