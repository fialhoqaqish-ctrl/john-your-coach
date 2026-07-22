import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { daysUntil } from "@/lib/format";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — John" },
      { name: "description", content: "Your fitness portfolio: hero metric, risk exposure, race targets, and adherence deposits." },
      { property: "og:title", content: "Portfolio — John" },
      { property: "og:description", content: "A calm, diversified view of your training as a fitness portfolio." },
    ],
  }),
  component: PortfolioPage,
});

/* ---------- API types ---------- */

type Trend = "RISING" | "HOLDING" | "SLIPPING" | null;
type RiskState = "safe" | "elevated" | "over_leveraged" | "detraining" | "no_data";
type OnTrack = "on_track" | "close" | "behind";

interface HeroResponse {
  view: "athlete";
  athlete: { name: string; date: string };
  hero: {
    metric: string;
    value: number | null;
    delta_30d: number | null;
    delta_over_days?: number | null;
    delta_source?: string | null;
    subline?: string | null;
  };
  readiness: { state: "green" | "amber" | "red" | string; flags?: string[]; framing?: string };
  risk: {
    acwr: number | null;
    safe_low: number;
    safe_high: number;
    state: RiskState;
    line?: string | null;
    acute_7d_km?: number | null;
    chronic_weekly_km?: number | null;
  };
  race: {
    name: string; date: string; distance?: string;
    goal_time?: string | null; projected_time?: string | null;
    gap_sec?: number | null; on_track?: OnTrack;
    line?: string | null;
  } | null;
  assets: Array<{
    key: string; label: string; value: string;
    trend?: Trend; note?: string | null; delta_30d?: number | null;
  }>;
  deposits: {
    followed: number; modified: number; planned: number; rate: number;
    days: Array<{ date: string; verdict?: string; followed?: boolean }>;
  };
}

interface CoachResponse {
  view: "coach";
  athlete: { name: string; date: string };
  adherence: { followed: number; modified: number; planned: number; rate: number };
  calibration: Array<{ field: string; n: number; mean_error: number }>;
  risk: HeroResponse["risk"];
  attention: Array<{ level: "high" | "watch" | string; text: string }>;
  state_confidence: number;
}

/* ---------- Design tokens (dark, per spec) ---------- */

const T = {
  bg: "#0B0C0E",
  card: "#141619",
  border: "#22252A",
  text: "#EDEEF0",
  muted: "#8A8F98",
  lime: "#C6F24E",
  green: "#5FD08A",
  amber: "#E8B14C",
  red: "#E06B5E",
};

/* ---------- View ---------- */

type View = "athlete" | "coach";
const VIEW_KEY = "john.portfolio.view";

function PortfolioPage() {
  const [view, setView] = useState<View>("athlete");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = localStorage.getItem(VIEW_KEY);
    if (v === "athlete" || v === "coach") setView(v);
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(VIEW_KEY, view);
  }, [view]);

  const hero = useQuery<HeroResponse>({
    queryKey: ["hero"],
    queryFn: () => apiFetch<HeroResponse>("/api/hero"),
    staleTime: 30_000,
    enabled: view === "athlete",
  });
  const coach = useQuery<CoachResponse>({
    queryKey: ["coach-view"],
    queryFn: () => apiFetch<CoachResponse>("/api/coach"),
    staleTime: 30_000,
    enabled: view === "coach",
  });

  const onRefresh = useCallback(async () => {
    if (view === "athlete") await hero.refetch();
    else await coach.refetch();
  }, [view, hero, coach]);

  return (
    <AppShell onRefresh={onRefresh}>
      <div
        style={{ backgroundColor: T.bg, color: T.text }}
        className="min-h-screen -mx-0"
      >
        <main
          className="px-5 safe-top pb-6 space-y-5"
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          <header className="flex items-center justify-between">
            <div>
              <p
                className="text-[11px] uppercase tracking-[0.18em]"
                style={{ color: T.muted }}
              >
                Portfolio
              </p>
              {(hero.data?.athlete?.name || coach.data?.athlete?.name) && (
                <p className="mt-1 text-[15px]" style={{ color: T.text }}>
                  {hero.data?.athlete?.name ?? coach.data?.athlete?.name}
                </p>
              )}
            </div>
            <ViewToggle view={view} setView={setView} />
          </header>

          {view === "athlete" ? (
            <AthleteView q={hero} />
          ) : (
            <CoachDiagnostics q={coach} />
          )}
        </main>
      </div>
    </AppShell>
  );
}

function ViewToggle({ view, setView }: { view: View; setView: (v: View) => void }) {
  const Btn = ({ v, label }: { v: View; label: string }) => {
    const active = v === view;
    return (
      <button
        type="button"
        onClick={() => setView(v)}
        aria-pressed={active}
        className="px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] rounded-full transition"
        style={{
          backgroundColor: active ? T.text : "transparent",
          color: active ? T.bg : T.muted,
          border: `1px solid ${active ? T.text : T.border}`,
        }}
      >
        {label}
      </button>
    );
  };
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="View">
      <Btn v="athlete" label="Athlete" />
      <Btn v="coach" label="Coach" />
    </div>
  );
}

/* ---------- Athlete view ---------- */

function AthleteView({ q }: { q: ReturnType<typeof useQuery<HeroResponse>> }) {
  if (q.isLoading) return <QuietLine>Loading…</QuietLine>;
  if (q.error) return <QuietLine>Couldn't reach your data.</QuietLine>;
  const d = q.data;
  if (!d) return null;
  return (
    <div className="space-y-5">
      <Hero hero={d.hero} />
      <ReadinessStrip readiness={d.readiness} />
      <AssetGrid assets={d.assets ?? []} />
      <RiskGauge risk={d.risk} />
      {d.race && <RaceCard race={d.race} />}
      <DepositsRow deposits={d.deposits} />
    </div>
  );
}

function QuietLine({ children }: { children: React.ReactNode }) {
  return <p className="text-sm" style={{ color: T.muted }}>{children}</p>;
}

function Panel({
  children,
  accent,
  className = "",
}: {
  children: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl p-5 ${className}`}
      style={{
        backgroundColor: T.card,
        border: `1px solid ${accent ? T.lime : T.border}`,
      }}
    >
      {children}
    </section>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] uppercase tracking-[0.16em]"
      style={{ color: T.muted }}
    >
      {children}
    </p>
  );
}

/* ---------- Hero ---------- */

function useCountUp(target: number | null, ms = 600) {
  const [v, setV] = useState(0);
  const startedRef = useRef(false);
  useEffect(() => {
    if (target == null) return;
    if (startedRef.current) {
      setV(target);
      return;
    }
    startedRef.current = true;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setV(target); return; }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function Hero({ hero }: { hero: HeroResponse["hero"] }) {
  const v = useCountUp(hero.value ?? null);
  const display = hero.value == null
    ? "—"
    : Number.isInteger(hero.value)
      ? Math.round(v).toString()
      : v.toFixed(1);

  let pill: React.ReactNode;
  if (hero.delta_30d == null) {
    pill = (
      <span
        className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] tabular"
        style={{ backgroundColor: "rgba(255,255,255,0.04)", color: T.muted, border: `1px solid ${T.border}` }}
      >
        Building history — needs ~30 days
      </span>
    );
  } else {
    const up = hero.delta_30d > 0;
    const zero = hero.delta_30d === 0;
    const color = zero ? T.muted : up ? T.lime : T.red;
    const arrow = zero ? "•" : up ? "▲" : "▼";
    const sign = up ? "+" : "";
    const days = hero.delta_over_days ?? 30;
    pill = (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tabular"
        style={{
          color,
          backgroundColor: `${color}14`,
          border: `1px solid ${color}33`,
        }}
      >
        <span aria-hidden="true">{arrow}</span>
        <span>{sign}{hero.delta_30d} · {days}d</span>
      </span>
    );
  }

  return (
    <section className="pt-4 pb-2">
      <Caption>{hero.metric}</Caption>
      <p
        className="mt-3 font-display tabular"
        style={{
          color: T.text,
          fontSize: "clamp(88px, 26vw, 148px)",
          lineHeight: 0.86,
          letterSpacing: "-0.04em",
        }}
      >
        {display}
      </p>
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        {pill}
        {hero.delta_source === "vo2max_proxy" && (
          <span className="text-[11px]" style={{ color: T.muted }}>(via VO₂max)</span>
        )}
      </div>
      {hero.subline && (
        <p className="mt-3 text-[13px] leading-relaxed" style={{ color: T.muted }}>
          {hero.subline}
        </p>
      )}
    </section>
  );
}

/* ---------- Readiness strip ---------- */

function ReadinessStrip({ readiness }: { readiness: HeroResponse["readiness"] }) {
  const map: Record<string, string> = { green: T.green, amber: T.amber, red: T.red };
  const color = map[readiness.state] ?? T.muted;
  const framing = readiness.framing || "today's conditions";
  return (
    <div className="flex items-center gap-2 pt-1">
      <span
        className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.14em]"
        style={{
          color,
          backgroundColor: `${color}12`,
          border: `1px solid ${color}33`,
        }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        {framing}
      </span>
    </div>
  );
}

/* ---------- Asset grid ---------- */

function AssetGrid({ assets }: { assets: HeroResponse["assets"] }) {
  if (!assets.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3">
      {assets.map((a) => (
        <AssetCard key={a.key} a={a} />
      ))}
    </div>
  );
}

function AssetCard({ a }: { a: HeroResponse["assets"][number] }) {
  const buying = a.key === "recovery" && /buying recovery/i.test(a.note ?? "");
  const trendColor =
    a.trend === "RISING" ? T.lime : a.trend === "SLIPPING" ? T.amber : T.muted;
  return (
    <Panel accent={buying} className="!p-4">
      <Caption>{a.label}</Caption>
      <p
        className="mt-2 tabular"
        style={{ color: T.text, fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}
      >
        {a.value}
      </p>
      {a.trend && (
        <span
          className="mt-2 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium tracking-wide"
          style={{
            color: trendColor,
            backgroundColor: `${trendColor}14`,
            border: `1px solid ${trendColor}33`,
          }}
        >
          {a.trend}
        </span>
      )}
      {a.note && (
        <p className="mt-2 text-[12px] leading-snug" style={{ color: T.muted }}>
          {a.note}
        </p>
      )}
    </Panel>
  );
}

/* ---------- Risk gauge ---------- */

function RiskGauge({ risk }: { risk: HeroResponse["risk"] }) {
  const min = 0.5, max = 2.0;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
  const colorMap: Record<RiskState, string> = {
    safe: T.green, elevated: T.amber, over_leveraged: T.red,
    detraining: T.muted, no_data: T.muted,
  };
  const marker = colorMap[risk.state] ?? T.muted;
  const noData = risk.state === "no_data" || risk.acwr == null;

  return (
    <Panel>
      <div className="flex items-baseline justify-between">
        <Caption>Risk exposure · ACWR</Caption>
        {!noData && (
          <span className="text-[12px] tabular" style={{ color: T.text }}>
            {risk.acwr!.toFixed(2)}
          </span>
        )}
      </div>
      <div className="relative mt-4 h-2 rounded-full" style={{ backgroundColor: "#1E2126" }}>
        {!noData && (
          <div
            className="absolute inset-y-0 rounded-full"
            style={{
              left: `${pct(risk.safe_low)}%`,
              width: `${pct(risk.safe_high) - pct(risk.safe_low)}%`,
              backgroundColor: `${T.green}26`,
              border: `1px solid ${T.green}55`,
            }}
            aria-hidden="true"
          />
        )}
        {!noData && (
          <div
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${pct(risk.acwr!)}%`,
              backgroundColor: marker,
              boxShadow: `0 0 0 3px ${T.card}`,
            }}
            aria-label={`ACWR ${risk.acwr!.toFixed(2)}`}
          />
        )}
      </div>
      <div className="mt-2 flex justify-between text-[10px] tabular" style={{ color: T.muted }}>
        <span>0.5</span>
        <span>{risk.safe_low.toFixed(1)}</span>
        <span>{risk.safe_high.toFixed(1)}</span>
        <span>2.0</span>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed" style={{ color: noData ? T.muted : T.text }}>
        {noData ? "Not enough load history yet." : (risk.line ?? "")}
      </p>
    </Panel>
  );
}

/* ---------- Race card ---------- */

function RaceCard({ race }: { race: NonNullable<HeroResponse["race"]> }) {
  const trackColor: Record<OnTrack, string> = {
    on_track: T.lime, close: T.amber, behind: T.red,
  };
  const color = trackColor[(race.on_track ?? "close") as OnTrack] ?? T.muted;
  const days = daysUntil(race.date);
  const hasProjection = race.projected_time && race.goal_time;
  return (
    <Panel>
      <div className="flex items-baseline justify-between">
        <Caption>Price target · {race.name}</Caption>
        {days != null && (
          <span className="text-[11px] tabular" style={{ color: T.muted }}>
            {days >= 0 ? `${days}d` : "past"}
          </span>
        )}
      </div>
      {hasProjection ? (
        <div className="mt-3">
          <p
            className="font-display tabular"
            style={{ color, fontSize: 40, lineHeight: 1, letterSpacing: "-0.03em" }}
          >
            {race.projected_time} → {race.goal_time}
          </p>
          {race.line && (
            <p className="mt-2 text-[13px]" style={{ color: T.muted }}>{race.line}</p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-[14px]" style={{ color: T.muted }}>
          Set a goal time to see your projection
        </p>
      )}
    </Panel>
  );
}

/* ---------- Deposits row ---------- */

function DepositsRow({ deposits }: { deposits: HeroResponse["deposits"] }) {
  const days = (deposits.days ?? []).slice(-7);
  return (
    <Panel>
      <div className="flex items-baseline justify-between">
        <Caption>Deposits this week</Caption>
        <span className="text-[12px] tabular" style={{ color: T.text }}>
          {deposits.followed}/{deposits.planned}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {Array.from({ length: 7 }).map((_, i) => {
          const d = days[i];
          const followed = d?.followed === true;
          const modified = !followed && d?.verdict === "modified";
          const bg = followed ? T.lime : "transparent";
          const border = followed
            ? T.lime
            : modified
              ? T.muted
              : "#22252A";
          return (
            <div
              key={i}
              className="aspect-square rounded-md flex items-center justify-center"
              style={{ backgroundColor: bg, border: `1px solid ${border}` }}
              aria-label={d ? `${d.date} ${d.verdict ?? ""}` : "unplanned"}
            >
              {followed && (
                <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                  <path d="M3 8.5 L6.5 12 L13 4.5" fill="none" stroke={T.bg} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[12px] leading-relaxed" style={{ color: T.muted }}>
        A followed rest day counts. We reward adherence, not volume.
      </p>
    </Panel>
  );
}

/* ---------- Coach view ---------- */

function CoachDiagnostics({ q }: { q: ReturnType<typeof useQuery<CoachResponse>> }) {
  if (q.isLoading) return <QuietLine>Loading…</QuietLine>;
  if (q.error) return <QuietLine>Couldn't reach coach diagnostics.</QuietLine>;
  const d = q.data;
  if (!d) return null;
  return (
    <div className="space-y-4">
      <AttentionList items={d.attention ?? []} confidence={d.state_confidence} />
      <AdherencePanel a={d.adherence} />
      <CalibrationTable rows={d.calibration ?? []} />
      <RiskGauge risk={d.risk} />
    </div>
  );
}

function AttentionList({
  items, confidence,
}: {
  items: CoachResponse["attention"];
  confidence: number;
}) {
  return (
    <Panel>
      <div className="flex items-baseline justify-between">
        <Caption>Attention</Caption>
        <span className="text-[11px] tabular" style={{ color: T.muted }}>
          confidence {(confidence * 100).toFixed(0)}%
        </span>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-[13px]" style={{ color: T.muted }}>Nothing urgent.</p>
      ) : (
        <ul className="mt-3 space-y-2" role="list">
          {items.map((it, i) => {
            const color = it.level === "high" ? T.red : it.level === "watch" ? T.amber : T.muted;
            return (
              <li key={i} className="flex items-start gap-2.5">
                <span
                  className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className="text-[13px] leading-snug" style={{ color: T.text }}>
                  {it.text}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function AdherencePanel({ a }: { a: CoachResponse["adherence"] }) {
  const pct = Math.round((a.rate ?? 0) * 100);
  return (
    <Panel>
      <Caption>Adherence</Caption>
      <div className="mt-2 flex items-baseline gap-3">
        <span
          className="font-display tabular"
          style={{ color: T.text, fontSize: 44, lineHeight: 1, letterSpacing: "-0.03em" }}
        >
          {pct}%
        </span>
        <span className="text-[12px] tabular" style={{ color: T.muted }}>
          {a.followed} followed · {a.modified} modified · {a.planned} planned
        </span>
      </div>
    </Panel>
  );
}

function CalibrationTable({ rows }: { rows: CoachResponse["calibration"] }) {
  return (
    <Panel>
      <Caption>Calibration</Caption>
      {rows.length === 0 ? (
        <p className="mt-3 text-[13px]" style={{ color: T.muted }}>No signals yet.</p>
      ) : (
        <table className="mt-3 w-full text-[13px]">
          <thead>
            <tr style={{ color: T.muted }}>
              <th className="text-left font-normal py-1">Field</th>
              <th className="text-right font-normal py-1">n</th>
              <th className="text-right font-normal py-1">Bias</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const optimistic = r.mean_error > 0;
              const zero = r.mean_error === 0;
              return (
                <tr key={r.field} style={{ borderTop: `1px solid ${T.border}` }}>
                  <td className="py-2" style={{ color: T.text }}>{r.field}</td>
                  <td className="py-2 text-right tabular" style={{ color: T.muted }}>{r.n}</td>
                  <td className="py-2 text-right tabular" style={{ color: zero ? T.muted : optimistic ? T.amber : T.green }}>
                    {r.mean_error > 0 ? "+" : ""}{r.mean_error.toFixed(1)} · {zero ? "neutral" : optimistic ? "runs optimistic" : "runs pessimistic"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Panel>
  );
}