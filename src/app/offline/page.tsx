import Link from "next/link";

export const metadata = { title: "You're offline", robots: { index: false, follow: false } };

/** Served by the service worker when a page isn't cached and the network is unavailable. */
export default function OfflinePage() {
  return (
    <section className="container flex min-h-[60vh] flex-col items-start justify-center py-20">
      <p className="eyebrow">Offline</p>
      <h1 className="mt-3 text-display-lg">You're offline right now.</h1>
      <p className="lede mt-4 max-w-xl">
        This page hasn't been saved on your device yet. Pages you've visited before — including the free resources —
        are available offline. Forms need a connection and won't send until you're back online.
      </p>
      <div className="mt-8 flex flex-wrap gap-4 text-[0.9375rem]">
        <Link href="/" className="font-medium text-brand underline underline-offset-4">Home</Link>
        <Link href="/resources" className="font-medium text-brand underline underline-offset-4">Free resources</Link>
      </div>
    </section>
  );
}
