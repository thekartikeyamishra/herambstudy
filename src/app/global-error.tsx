"use client";

/** Last-resort error boundary (replaces the root layout), equivalent to a 500 page. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#FAF8F4", color: "#0E1528", margin: 0 }}>
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "15vh 24px" }}>
          <p style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "#4A3CCE", fontWeight: 600 }}>
            Error 500
          </p>
          <h1 style={{ fontSize: 32, lineHeight: 1.15, margin: "12px 0" }}>Heramb.study is having trouble right now.</h1>
          <p style={{ color: "#2F3852", lineHeight: 1.6 }}>Please try again in a moment. Nothing you were doing has been submitted.</p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 24, minHeight: 44, padding: "0 20px", borderRadius: 999, border: 0, background: "#4A3CCE", color: "#fff", fontSize: 16, cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
