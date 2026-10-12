"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log only the digest — never user data.
    console.error("[page-error]", error.digest ?? "no-digest");
  }, [error]);

  return (
    <section className="container flex min-h-[60vh] flex-col items-start justify-center py-20" role="alert">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-3 text-display-lg">This page didn't load properly.</h1>
      <p className="lede mt-4 max-w-xl">
        It's likely a temporary problem on our side. You can try again, or head back to the home page.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/" className="inline-flex min-h-11 items-center px-3 font-medium text-brand underline underline-offset-4">Home</Link>
      </div>
      {error.digest ? <p className="mt-6 text-xs text-ink-muted">Reference: {error.digest}</p> : null}
    </section>
  );
}
