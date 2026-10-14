// DEVELOPMENT ONLY — excluded from production builds. Throws so you can see the error page.
export const dynamic = "force-dynamic";

export default function CrashPage(): never {
  throw new Error("Intentional crash from /dev/crash (development only) — this shows the error page.");
}
