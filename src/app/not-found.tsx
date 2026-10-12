import Link from "next/link";
import { LinkButton } from "@/components/ui/Button";

export const metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <section className="container flex min-h-[60vh] flex-col items-start justify-center py-20">
      <p className="eyebrow">Error 404</p>
      <h1 className="mt-3 text-display-lg">We couldn't find that page.</h1>
      <p className="lede mt-4 max-w-xl">It may have moved, or the link may be mistyped.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <LinkButton href="/">Go to the home page</LinkButton>
        <LinkButton href="/resources" variant="secondary">Browse free resources</LinkButton>
      </div>
      <p className="mt-6 text-sm text-ink-muted">
        Think this is our mistake? <Link href="/contact" className="font-medium text-brand underline underline-offset-4">Let us know</Link>.
      </p>
    </section>
  );
}
