import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/progress")({
  component: ProgressPage,
});

type Dashboard = {
  athlete?: { name?: string | null; date?: string | null } | null;
  readiness?: {
    color?: "green" | "amber" | "red" | "no_data" | null;
    flags?: string[] | null;
    thin?: boolean | null;
  } | null;
  wellness?: {
    sleep_min?: number | null;
    rhr?: number | null;
    rhr_delta?: number | null;
    hrv_pct_delta?: number | null;
    sleep_debt_min?: number | null;
  } | null;
  volume_weeks?: Array<{ week_of: string; run_km?: number | null; sessions?: number | null }> | null;
  pace_trend?: Array<{ period: string; median_pace_sec?: number | null }> | null;
  body?: {
    weight?: Array<{ date: string; value: number }> | null;
    vo2max?: Array<{ date: string; value: number }> | null;
  } | null;
  goals?: Array<{
    goal: string;
    type?: string;
    priority?: string;
    why?: string;
    milestones?: Array<{ milestone: string; target_date?: string; kind?: string; score?: number | null }>;
  }> | null;
  next_race?: { name: string; date?: string; priority?: string } | null;
  north_star?: {
    headline?: string;
    trajectory?: string;
    metrics?: Record<string, unknown>;
    review_date?: string;
  } | null;
};

function ProgressPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await apiFetch<Dashboard>("/api/dashboard");
      setData(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Simple pull-to-refresh
  const startY = useRef<number | null>(null);
  useEffect(() => {
    function onStart(e: TouchEvent) {
      if (window.scrollY <= 0) startY.current = e.touches[0].clientY;
    }
    function onEnd(e: TouchEvent) {
      if (startY.current == null) return;
      const dy = e.changedTouches[0].clientY - startY.current;
      startY.current = null;
      if (dy > 80 && !refreshing) {
        setRefreshing(true);
        load();
      }
    }
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [load, refreshing]);

  return (
    <AppShell>
      <div className="px-5 pt-8 pb-6">
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-5xl font-black tracking-tighter">PROGRESS</h1>
          {refreshing && (
            <span className="font-display text-xs text-muted-foreground tracking-widest">SYNCING…</span>
          )}
        </div>
        {data?.athlete?.name && (
          <p className="mt-1 text-sm text-muted-foreground">
            {data.athlete.name}
            {data.athlete.date ? ` · ${data.athlete.date}` : ""}
          </p>
        )}
      </div>

      {loading && <EmptyBlock label="LOADING…" />}
      {error && !loading && (
        <div className="mx-5 rounded-[20px] border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive">
          {error}
        </div>
      )}

      {data && (
        <div className="px-5 space-y-5">
          <ReadinessCard readiness={data.readiness ?? null} />
          <PaceCard trend={data.pace_trend ?? null} />
          <VolumeCard weeks={data.volume_weeks ?? null} />
          <StatsRow wellness={data.wellness ?? null} />
          <BodyCards body={data.body ?? null} />
          <GoalsList goals={data.goals ?? null} />
          <NorthStarCard ns={data.north_star ?? null} />
          <NextRaceCard race={data.next_race ?? null} />
        </div>
      )}
    </AppShell>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <div className="mx-5 rounded-[20px] border border-border bg-card p-8 text-center">
      <p className="font-display text-sm tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

function Card({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div
      className={`rounded-[20px] bg-card p-5 ${accent ? "border-2 border-primary" : "border border-border"}`}
    >
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-xs tracking-[0.2em] text-muted-foreground">{children}</h2>
  );
}

function ReadinessCard({ readiness }: { readiness: Dashboard["readiness"] }) {
  const color = readiness?.color ?? "no_data";
  const map = {
    green: { c: "#3DDC84", label: "READY" },
    amber: { c: "#FFC043", label: "CAUTION" },
    red: { c: "#FF4D4D", label: "RECOVER" },
    no_data: { c: "#4A4A4A", label: "NO DATA" },
  } as const;
  const cfg = map[color];
  const flags = readiness?.flags ?? [];
  return (
    <Card>
      <CardTitle>READINESS</CardTitle>
      <div className="mt-4 flex items-center gap-5">
        <div className="relative shrink-0">
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="42" fill="none" stroke="#2A2A2A" strokeWidth="8" />
            <circle
              cx="48"
              cy="48"
              r="42"
              fill="none"
              stroke={cfg.c}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 42}
              strokeDashoffset={color === "no_data" ? 2 * Math.PI * 42 * 0.6 : 0}
              transform="rotate(-90 48 48)"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <div
            className="font-display font-black tracking-tighter leading-none text-[3.5rem]"
            style={{ color: cfg.c }}
          >
            {cfg.label}
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm text-foreground/80">
        {flags && flags.length > 0 ? flags.join(" · ") : "No recovery flags. Push it."}
      </p>
      {readiness?.thin && (
        <p className="mt-2 text-xs text-muted-foreground">Connect your watch to sharpen this.</p>
      )}
    </Card>
  );
}

function fmtPace(sec: number | null | undefined) {
  if (sec == null || !isFinite(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

function PaceCard({ trend }: { trend: Dashboard["pace_trend"] }) {
  const pts = (trend ?? []).filter((p) => p.median_pace_sec != null);
  if (pts.length < 2) {
    return (
      <Card>
        <CardTitle>EASY PACE TREND</CardTitle>
        <p className="mt-6 text-sm text-muted-foreground">Not enough data yet.</p>
      </Card>
    );
  }
  const latest = pts[pts.length - 1].median_pace_sec ?? null;
  const values = pts.map((p) => p.median_pace_sec as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <CardTitle>EASY PACE TREND</CardTitle>
        <span className="font-display font-black text-2xl tracking-tight">{fmtPace(latest)}</span>
      </div>
      <div className="mt-4 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pts} margin={{ top: 10, right: 4, left: 4, bottom: 0 }}>
            <XAxis dataKey="period" hide />
            <YAxis
              domain={[min - 5, max + 5]}
              reversed
              hide
            />
            <Tooltip
              contentStyle={{ background: "#151515", border: "1px solid #2A2A2A", borderRadius: 12 }}
              labelStyle={{ color: "#888" }}
              formatter={(v: number) => [fmtPace(v), "pace"]}
            />
            <Line
              type="monotone"
              dataKey="median_pace_sec"
              stroke="#E8FE53"
              strokeWidth={3}
              dot={{ r: 3, fill: "#E8FE53" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Lower = faster at the same easy effort.</p>
    </Card>
  );
}

function VolumeCard({ weeks }: { weeks: Dashboard["volume_weeks"] }) {
  const ws = weeks ?? [];
  if (ws.length === 0) {
    return (
      <Card>
        <CardTitle>WEEKLY RUN VOLUME</CardTitle>
        <p className="mt-6 text-sm text-muted-foreground">Not enough data yet.</p>
      </Card>
    );
  }
  const last = ws[ws.length - 1];
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <CardTitle>WEEKLY VOLUME</CardTitle>
        <span className="font-display font-black text-2xl tracking-tight">
          {last.run_km != null ? `${last.run_km.toFixed(1)}` : "—"}
          <span className="text-sm text-muted-foreground ml-1">km</span>
        </span>
      </div>
      <div className="mt-4 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={ws} margin={{ top: 10, right: 4, left: 4, bottom: 0 }}>
            <XAxis dataKey="week_of" hide />
            <YAxis hide />
            <Tooltip
              contentStyle={{ background: "#151515", border: "1px solid #2A2A2A", borderRadius: 12 }}
              labelStyle={{ color: "#888" }}
              formatter={(v: number) => [`${v} km`, "volume"]}
            />
            <Bar dataKey="run_km" radius={[6, 6, 0, 0]}>
              {ws.map((_, i) => (
                <Cell key={i} fill={i === ws.length - 1 ? "#E8FE53" : "#2A2A2A"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        This week: {last.run_km != null ? `${last.run_km.toFixed(1)} km` : "—"} ·{" "}
        {last.sessions ?? 0} sessions
      </p>
    </Card>
  );
}

function StatsRow({ wellness }: { wellness: Dashboard["wellness"] }) {
  const sleep = wellness?.sleep_min;
  const rhr = wellness?.rhr;
  const delta = wellness?.rhr_delta;
  const sleepStr =
    sleep != null ? `${Math.floor(sleep / 60)}h${String(sleep % 60).padStart(2, "0")}` : null;
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardTitle>SLEEP</CardTitle>
        <div className="mt-3 font-display font-black text-4xl tracking-tighter">
          {sleepStr ?? <span className="text-muted-foreground text-2xl">—</span>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">last night</p>
      </Card>
      <Card>
        <CardTitle>RESTING HR</CardTitle>
        <div className="mt-3 font-display font-black text-4xl tracking-tighter">
          {rhr != null ? (
            <>
              {rhr}
              <span className="text-sm text-muted-foreground ml-1">bpm</span>
            </>
          ) : (
            <span className="text-muted-foreground text-2xl">—</span>
          )}
        </div>
        <p
          className="mt-1 text-xs"
          style={{ color: delta == null ? undefined : delta <= 0 ? "#3DDC84" : "#FFC043" }}
        >
          {delta != null ? `${delta > 0 ? "+" : ""}${delta} vs baseline` : "vs baseline"}
        </p>
      </Card>
    </div>
  );
}

function MiniLine({
  data,
  invert = false,
  label,
  unit,
}: {
  data: Array<{ date: string; value: number }>;
  invert?: boolean;
  label: string;
  unit?: string;
}) {
  if (data.length < 2) {
    return (
      <Card>
        <CardTitle>{label}</CardTitle>
        <p className="mt-6 text-sm text-muted-foreground">Not enough data yet.</p>
      </Card>
    );
  }
  const latest = data[data.length - 1].value;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <CardTitle>{label}</CardTitle>
        <span className="font-display font-black text-2xl tracking-tight">
          {latest}
          {unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
        </span>
      </div>
      <div className="mt-3 h-28">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
            <XAxis dataKey="date" hide />
            <YAxis domain={[min - (max - min) * 0.2 || min - 1, max + (max - min) * 0.2 || max + 1]} reversed={invert} hide />
            <Tooltip
              contentStyle={{ background: "#151515", border: "1px solid #2A2A2A", borderRadius: 12 }}
              labelStyle={{ color: "#888" }}
            />
            <Line type="monotone" dataKey="value" stroke="#E8FE53" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function BodyCards({ body }: { body: Dashboard["body"] }) {
  const vo2 = body?.vo2max ?? [];
  const wt = body?.weight ?? [];
  return (
    <div className="space-y-5">
      <MiniLine data={vo2} label="VO₂ MAX" />
      <MiniLine data={wt} invert label="WEIGHT" unit="kg" />
    </div>
  );
}

function ScoreBadge({ score }: { score?: number | null }) {
  if (score == null)
    return (
      <div className="w-11 h-11 rounded-full border border-border flex items-center justify-center text-muted-foreground text-lg">
        —
      </div>
    );
  const pct = Math.round(score * 100);
  const color = score >= 0.7 ? "#3DDC84" : score >= 0.4 ? "#FFC043" : "#FF4D4D";
  return (
    <div
      className="w-11 h-11 rounded-full flex items-center justify-center font-display font-black text-sm"
      style={{ backgroundColor: `${color}22`, color, border: `2px solid ${color}` }}
    >
      {pct}
    </div>
  );
}

function GoalsList({ goals }: { goals: Dashboard["goals"] }) {
  const gs = goals ?? [];
  if (gs.length === 0) return null;
  return (
    <div className="space-y-4">
      {gs.map((g, i) => (
        <Card key={i}>
          <div className="flex items-center gap-2">
            {g.type && (
              <span className="font-display text-[10px] tracking-widest text-primary uppercase">
                {g.type}
              </span>
            )}
            {g.priority && (
              <span className="font-display text-[10px] tracking-widest text-muted-foreground uppercase">
                · PRIORITY {g.priority}
              </span>
            )}
          </div>
          <h3 className="mt-1 font-display font-black text-2xl tracking-tight">{g.goal}</h3>
          {g.why && <p className="mt-1 text-sm text-muted-foreground">{g.why}</p>}
          {g.milestones && g.milestones.length > 0 && (
            <div className="mt-4 space-y-3">
              {g.milestones.map((m, j) => (
                <div key={j} className="flex items-center gap-3">
                  <ScoreBadge score={m.score ?? null} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">{m.milestone}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.target_date ?? ""}{m.kind ? ` · ${m.kind}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function NorthStarCard({ ns }: { ns: Dashboard["north_star"] }) {
  if (!ns || !ns.headline) return null;
  return (
    <Card accent>
      <CardTitle>NORTH STAR</CardTitle>
      <h3 className="mt-2 font-display font-black text-2xl tracking-tight text-primary">
        {ns.headline}
      </h3>
      {ns.trajectory && <p className="mt-1 text-sm text-foreground/80">{ns.trajectory}</p>}
      {ns.review_date && (
        <p className="mt-3 text-xs text-muted-foreground">Next review · {ns.review_date}</p>
      )}
    </Card>
  );
}

function NextRaceCard({ race }: { race: Dashboard["next_race"] }) {
  if (!race) return null;
  return (
    <Card>
      <CardTitle>NEXT RACE</CardTitle>
      <div className="mt-2 flex items-baseline justify-between gap-4">
        <h3 className="font-display font-black text-3xl tracking-tighter">{race.name}</h3>
        {race.priority && (
          <span className="font-display text-xs tracking-widest text-primary">
            {race.priority}
          </span>
        )}
      </div>
      {race.date && <p className="mt-1 text-sm text-muted-foreground">{race.date}</p>}
    </Card>
  );
}