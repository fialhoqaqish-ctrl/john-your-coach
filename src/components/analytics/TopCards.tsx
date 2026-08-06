import {
  fmtHm,
  mass,
  massLabel,
  tsbState,
  type AnalyticsResponse,
  type Units,
} from "@/lib/analytics";
import { fmtInt } from "@/lib/format";
import { EmptyState, MetricLabel, Panel, SourceChips } from "./bits";

/* ---------------- Row 1: hero stats ---------------- */

export function HeroStats({ d, units }: { d: AnalyticsResponse; units: Units }) {
  const h = d.hero;
  const w = mass(h?.weight_kg, units);
  const cards = [
    {
      label: "Fitness · CTL",
      info: "Your 42-day rolling training load — long-term fitness.",
      value: h?.ctl != null ? fmtInt(h.ctl) : "—",
      sub: "42-day load",
      sources: ["DERIVED"],
    },
    {
      label: "Fatigue · ATL",
      info: "Your 7-day rolling training load — short-term fatigue.",
      value: h?.atl != null ? fmtInt(h.atl) : "—",
      sub: "7-day rolling",
      sources: ["DERIVED"],
    },
    {
      label: "Form · TSB",
      info: "Fitness minus fatigue. Positive means fresh, negative means loaded.",
      value: h?.tsb != null ? fmtInt(h.tsb) : "—",
      sub: h?.tsb_state ?? tsbState(h?.tsb),
      sources: ["DERIVED"],
      accent: true,
    },
    {
      label: "Volume · 7d",
      info: "Total training time over the last 7 days.",
      value: h?.volume_7d_hours != null ? `${h.volume_7d_hours.toFixed(1)}h` : "—",
      sub: h?.sessions_7d != null ? `${h.sessions_7d} sessions` : "no sessions",
      sources: ["STRAVA"],
    },
    {
      label: "Weight",
      info: "Your most recent scale reading.",
      value: w != null ? `${w.toFixed(1)}${massLabel(units)}` : "—",
      sub: w != null ? "latest reading" : "no reading yet",
      sources: [h?.weight_source ?? "GARMIN"],
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c, i) => (
        <div
          key={c.label}
          className={`glass rounded-2xl p-4 ${i === cards.length - 1 && cards.length % 2 === 1 ? "col-span-2" : ""}`}
        >
          <MetricLabel info={c.info}>{c.label}</MetricLabel>
          <p
            className="font-display mt-2 text-4xl leading-none tabular"
            style={c.accent ? { color: "var(--color-primary)" } : undefined}
          >
            {c.value}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">{c.sub}</p>
          <SourceChips sources={c.sources} />
        </div>
      ))}
    </div>
  );
}

/* ---------------- Readiness ---------------- */

const READINESS_TIERS = ["REST", "EASY", "NORMAL", "PUSH"] as const;

function readinessColor(verdict: string | null | undefined) {
  switch ((verdict ?? "").toUpperCase()) {
    case "REST":
      return "var(--color-destructive)";
    case "EASY":
      return "var(--color-warning)";
    case "NORMAL":
      return "var(--color-foreground)";
    case "PUSH":
      return "var(--color-success)";
    default:
      return "var(--color-muted-foreground)";
  }
}

export function ReadinessCard({ d }: { d: AnalyticsResponse }) {
  const r = d.readiness;
  const score = r?.score ?? null;
  const verdict = (r?.verdict ?? "").toUpperCase();
  const color = readinessColor(verdict);
  return (
    <Panel
      title="Readiness"
      info="A 0–100 blend of HRV, resting heart rate, sleep debt and training load."
      sources={["GARMIN", "DERIVED"]}
    >
      {score == null ? (
        <EmptyState>Readiness unlocks when your Garmin syncs.</EmptyState>
      ) : (
        <>
          <div className="mt-3 flex items-baseline gap-3">
            <p className="font-display text-6xl leading-none tabular" style={{ color }}>
              {Math.round(score)}
            </p>
            <span className="text-sm text-muted-foreground tabular">/ 100</span>
            {READINESS_TIERS.includes(verdict as (typeof READINESS_TIERS)[number]) && (
              <span
                className="ml-auto rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide"
                style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}
              >
                {verdict}
              </span>
            )}
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-3">
            <Sub label="HRV" value={r?.hrv_ms != null ? `${Math.round(r.hrv_ms)}ms` : "—"} />
            <Sub label="RHR" value={r?.rhr_bpm != null ? `${Math.round(r.rhr_bpm)}bpm` : "—"} />
            <Sub label="Sleep debt" value={fmtHm(r?.sleep_debt_min)} />
          </dl>
          <div className="mt-4">
            <MetricLabel info="How much recent training load is weighing on you.">
              Load flag · {r?.load_flag != null ? `${Math.round(r.load_flag)}/100` : "—"}
              {r?.load_flag_label ? ` · ${r.load_flag_label}` : ""}
            </MetricLabel>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full bg-primary"
                style={{ width: `${Math.min(100, Math.max(0, r?.load_flag ?? 0))}%` }}
                aria-hidden="true"
              />
            </div>
          </div>
          {r?.drivers && r.drivers.length > 0 && (
            <div className="mt-5">
              <MetricLabel>Top drivers</MetricLabel>
              <ul className="mt-2 space-y-2">
                {r.drivers.map((dr) => (
                  <li key={dr.label}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm text-foreground">{dr.label}</span>
                      {dr.note && (
                        <span className="text-[11px] text-muted-foreground">{dr.note}</span>
                      )}
                    </div>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full"
                        style={{
                          width: `${Math.min(100, Math.max(4, (dr.severity ?? 0) * 100))}%`,
                          background: "var(--color-warning)",
                        }}
                        aria-hidden="true"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

function Sub({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-base tabular text-foreground">{value}</dd>
    </div>
  );
}

/* ---------------- Load balance ---------------- */

export function LoadBalanceCard({ d }: { d: AnalyticsResponse }) {
  const l = d.load_balance;
  const acwr = l?.acwr ?? null;
  const status = (l?.status ?? "").toUpperCase();
  const color =
    status === "HIGH RISK"
      ? "var(--color-destructive)"
      : status === "CAUTION"
        ? "var(--color-warning)"
        : "var(--color-success)";
  const split = l?.sport_split ?? [];
  const palette = [
    "var(--color-primary)",
    "var(--color-warning)",
    "var(--color-success)",
    "var(--color-muted-foreground)",
  ];
  return (
    <Panel
      title="Load balance"
      info="Acute:chronic workload ratio — this week's load against your last four weeks."
      sources={["STRAVA", "DERIVED"]}
      right={
        status ? (
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}
          >
            {status}
          </span>
        ) : null
      }
    >
      {acwr == null ? (
        <EmptyState>Not enough training history to compute your load ratio yet.</EmptyState>
      ) : (
        <>
          <p className="font-display mt-3 text-6xl leading-none tabular">{acwr.toFixed(2)}</p>
          <p className="mt-1 text-sm text-muted-foreground">Load ratio · ACWR</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            0.8–1.3 safe · last 7 days vs. last 28
          </p>
          <div
            className="mt-4 h-2 w-full rounded-full bg-border"
            role="img"
            aria-label={`ACWR ${acwr.toFixed(2)}, ${status || "unknown"}`}
          >
            <div className="relative h-full w-full">
              <span
                className="absolute inset-y-0 rounded-full"
                style={{
                  left: "26.7%",
                  width: "16.7%",
                  background: "var(--color-success)",
                  opacity: 0.25,
                }}
              />
              <span
                className="absolute -top-1 h-4 w-1 rounded-full"
                style={{
                  left: `calc(${Math.min(100, Math.max(0, (acwr / 3) * 100))}% - 2px)`,
                  background: color,
                }}
              />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Sub
              label="Sameness · monotony"
              value={l?.monotony != null ? l.monotony.toFixed(2) : "—"}
            />
            <Sub label="Weekly strain" value={l?.strain != null ? fmtInt(l.strain) : "—"} />
          </div>
        </>
      )}
      {split.length > 0 && (
        <div className="mt-5">
          <MetricLabel info="Share of training time by sport.">Sport split</MetricLabel>
          <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-border">
            {split.map((s, i) => (
              <span
                key={s.sport}
                title={`${s.sport} ${Math.round(s.pct)}%`}
                style={{ width: `${s.pct}%`, background: palette[i % palette.length] }}
              />
            ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-3">
            {split.map((s, i) => (
              <li
                key={s.sport}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: palette[i % palette.length] }}
                  aria-hidden="true"
                />
                {s.sport} {Math.round(s.pct)}%
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

/* ---------------- Today's zones ---------------- */

export function ZonesCard({ d }: { d: AnalyticsResponse }) {
  const z = d.zones;
  const rows = z?.zones ?? [];
  return (
    <Panel
      title="Today's zones"
      info="Heart-rate zones derived from your lactate-threshold heart rate."
      sources={["DERIVED"]}
    >
      {rows.length === 0 ? (
        <EmptyState>Set your LTHR in performance thresholds to see today's zones.</EmptyState>
      ) : (
        <>
          {z?.status_line && <p className="mt-3 text-sm text-muted-foreground">{z.status_line}</p>}
          {z?.lthr != null && (
            <p className="mt-3 text-sm tabular text-foreground">LTHR {Math.round(z.lthr)}</p>
          )}
          <ul className="mt-3 divide-y divide-border">
            {rows.map((r) => (
              <li key={r.zone} className="flex items-baseline justify-between py-2">
                <span className="text-sm text-foreground">
                  {r.zone}
                  {r.label ? <span className="ml-2 text-muted-foreground">{r.label}</span> : null}
                </span>
                <span className="text-sm tabular text-muted-foreground">
                  {r.min == null ? `<${r.max}` : r.max == null ? `>${r.min}` : `${r.min}–${r.max}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
