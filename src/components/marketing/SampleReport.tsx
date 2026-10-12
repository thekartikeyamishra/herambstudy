import { FictionalDataLabel, Badge } from "@/components/ui/Primitives";
import { sampleStudent, statusFor, statusLabel } from "@/content/sampleData";

const tone = { secure: "good", developing: "warn", gap: "gap" } as const;

/** Clearly labelled illustrative report built from fictional data. */
export function SampleReport({ headingLevel = "h3" }: { headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  const avg = (k: "before" | "after") =>
    Math.round(sampleStudent.topics.reduce((s, t) => s + t[k], 0) / sampleStudent.topics.length);

  return (
    <article className="card overflow-hidden" aria-labelledby="sample-report-title">
      <header className="flex flex-col gap-3 border-b border-line bg-paper-sunk/60 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div>
          <Heading id="sample-report-title" className="font-sans text-lg font-semibold">
            Progress report — {sampleStudent.name}
          </Heading>
          <p className="mt-1 text-sm text-ink-muted">{sampleStudent.batch}</p>
        </div>
        <FictionalDataLabel />
      </header>

      <div className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-3">
        <div className="bg-paper-raised p-4">
          <p className="text-xs text-ink-muted">{sampleStudent.assessments.first}</p>
          <p className="tabular mt-1 text-2xl font-semibold">{avg("before")}%</p>
        </div>
        <div className="bg-paper-raised p-4">
          <p className="text-xs text-ink-muted">Follow-up check</p>
          <p className="tabular mt-1 text-2xl font-semibold">{avg("after")}%</p>
        </div>
        <div className="col-span-2 bg-paper-raised p-4 sm:col-span-1">
          <p className="text-xs text-ink-muted">Biggest verified change</p>
          <p className="mt-1 text-sm font-semibold">Rotational motion +22 pts</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <caption className="sr-only">Topic results before and after targeted practice (fictional)</caption>
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wider text-ink-muted">
              <th scope="col" className="px-5 py-3 font-medium">Topic</th>
              <th scope="col" className="px-3 py-3 font-medium">Before</th>
              <th scope="col" className="px-3 py-3 font-medium">After</th>
              <th scope="col" className="px-3 py-3 font-medium">Status now</th>
              <th scope="col" className="px-5 py-3 font-medium">Main mistake type</th>
            </tr>
          </thead>
          <tbody>
            {sampleStudent.topics.map((t) => {
              const st = statusFor(t.after);
              const delta = t.after - t.before;
              return (
                <tr key={t.topic} className="border-b border-line last:border-0">
                  <th scope="row" className="px-5 py-3 font-medium text-ink">{t.topic}</th>
                  <td className="tabular px-3 py-3 text-ink-soft">{t.before}%</td>
                  <td className="tabular px-3 py-3 font-semibold text-ink">
                    {t.after}%{" "}
                    <span className={delta >= 0 ? "text-good" : "text-gap"}>
                      ({delta >= 0 ? "+" : "−"}{Math.abs(delta)})
                    </span>
                  </td>
                  <td className="px-3 py-3"><Badge tone={tone[st]}>{statusLabel[st]}</Badge></td>
                  <td className="px-5 py-3 text-ink-soft">{t.mistake}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="space-y-2 border-t border-line p-5 text-sm leading-relaxed text-ink-soft sm:p-6">
        <p>
          <strong className="text-ink">Suggested next step:</strong> continue short practice on rotational motion
          (concept: direction of torque). Gravitation slipped slightly — the mistakes were under time pressure, so a
          timed mini-set is more useful than re-teaching.
        </p>
        <p className="text-xs text-ink-muted">
          Thresholds used: secure ≥ 75%, developing 50–74%, learning gap &lt; 50%. Two tests are only comparable when
          they cover the same topics at similar difficulty.
        </p>
      </footer>
    </article>
  );
}
