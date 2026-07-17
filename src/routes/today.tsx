import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, SectionLabel, EmptyLine, Verdict } from "@/components/ui-bits";
import { useDashboard } from "@/lib/useDashboard";
import { fmtInt, fmtWeekday } from "@/lib/format";
import { BarChart, Bar, Cell, ReferenceLine, ResponsiveContainer, XAxis } from "recharts";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type {
  TodayResponse,
  TodaySession,
  WorkoutExercise,
  WorkoutResponse,
  WorkoutSet,
  ChatMessage,
} from "@/lib/types";
import { ArrowUp, Check, Plus, X } from "lucide-react";

export const Route = createFileRoute("/today")({ component: TodayPage });

const READINESS = {
  ready: { word: "READY", color: "var(--color-success)", ring: "#5FD08A" },
  ease_in: { word: "EASE IN", color: "var(--color-warning)", ring: "#E8B14C" },
  recover: { word: "RECOVER", color: "var(--color-destructive)", ring: "#E06B5E" },
  no_data: { word: "NO DATA", color: "var(--color-muted-foreground)", ring: "#8A8F98" },
} as const;

function TodayPage() {
  const { data, isLoading, error, refetch } = useDashboard();
  const state = (data?.readiness?.state ?? "no_data") as string;
  const isReal = state === "ready" || state === "ease_in" || state === "recover";
  const [firstReveal, setFirstReveal] = useState(false);
  useEffect(() => {
    if (!isReal) return;
    const key = "john.readiness.firstReal";
    if (typeof window !== "undefined" && !localStorage.getItem(key)) {
      localStorage.setItem(key, "1");
      setFirstReveal(true);
    }
  }, [isReal]);
  const [openWorkout, setOpenWorkout] = useState<{ date: string } | null>(null);
  return (
    <AppShell>
      <main className="px-5 safe-top pb-6 space-y-5">
        <header className="flex items-baseline justify-between">
          <h1 className="text-[13px] uppercase tracking-[0.16em] text-muted-foreground">Today</h1>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-xs text-muted-foreground underline-offset-4 hover:underline focus-visible:underline"
          >
            Refresh
          </button>
        </header>

        {isLoading && <EmptyLine>Loading…</EmptyLine>}
        {error && <EmptyLine>Couldn't reach your data.</EmptyLine>}
        <ProgramCard onOpenWorkout={(date) => setOpenWorkout({ date })} />
        {data && isReal && <ReadinessHero d={data} firstReveal={firstReveal} />}
        {data && !isReal && <ReadinessAnticipatory />}
        {data && <StepsCard steps={data.steps} />}
        {data?.coach_line && (
          <p className="px-2 pt-2 text-[15px] leading-relaxed text-foreground/90">
            {data.coach_line}
          </p>
        )}
        {openWorkout && (
          <WorkoutSheet date={openWorkout.date} onClose={() => setOpenWorkout(null)} />
        )}
      </main>
    </AppShell>
  );
}

function ReadinessHero({
  d,
  firstReveal,
}: {
  d: NonNullable<ReturnType<typeof useDashboard>["data"]>;
  firstReveal: boolean;
}) {
  const state = (d.readiness?.state ?? "no_data") as keyof typeof READINESS;
  const cfg = READINESS[state] ?? READINESS.no_data;
  const flags = d.readiness?.flags ?? [];
  const driver =
    flags && flags.length > 0
      ? flags[0]
      : d.readiness?.thin
        ? "Connect your watch to sharpen this."
        : "No flags — push it.";
  const circumference = 2 * Math.PI * 52;
  const arc = state === "ready" ? 1 : state === "ease_in" ? 0.66 : 0.33;
  return (
    <section className="pt-4">
      <div className="flex items-center gap-6">
        <div className="relative shrink-0" aria-hidden="true">
          <svg width="128" height="128" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r="52" fill="none" stroke="var(--color-border)" strokeWidth="6" />
            <circle
              cx="64"
              cy="64"
              r="52"
              fill="none"
              stroke={cfg.ring}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${arc * circumference} ${circumference}`}
              transform="rotate(-90 64 64)"
              className={firstReveal ? "animate-ring-fill" : undefined}
              style={firstReveal ? ({ ["--ring-circ" as never]: `${arc * circumference}` } as React.CSSProperties) : undefined}
            />
          </svg>
        </div>
        <div className="min-w-0">
          <SectionLabel>Readiness</SectionLabel>
          <p
            className="font-display text-5xl leading-none mt-2"
            style={{ color: state === "ready" ? "var(--color-primary)" : cfg.color }}
          >
            {cfg.word}
          </p>
        </div>
      </div>
      <Verdict>{driver}</Verdict>
    </section>
  );
}

function SessionHero({
  session,
  race,
  hero,
}: {
  session?: string | null;
  race?: string;
  hero: boolean;
}) {
  const text = session ?? (race ? `Toward ${race}.` : "Nothing locked — open Plan.");
  if (hero) {
    return (
      <section className="pt-4">
        <SectionLabel>Today's Session</SectionLabel>
        <p className="mt-3 font-display text-5xl leading-[0.95] text-foreground text-balance">
          {text}
        </p>
      </section>
    );
  }
  return (
    <Card>
      <SectionLabel>Today's Session</SectionLabel>
      <p className="mt-2 text-lg text-foreground">{text}</p>
    </Card>
  );
}

function ReadinessAnticipatory() {
  const circumference = 2 * Math.PI * 52;
  return (
    <Card>
      <div className="flex items-center gap-5">
        <div className="shrink-0" aria-hidden="true">
          <svg width="80" height="80" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r="52" fill="none" stroke="var(--color-border)" strokeWidth="4" />
            <circle
              cx="64"
              cy="64"
              r="52"
              fill="none"
              stroke="var(--color-primary)"
              strokeOpacity={0.35}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${0.12 * circumference} ${circumference}`}
              transform="rotate(-90 64 64)"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <SectionLabel>Readiness</SectionLabel>
          <p className="mt-2 text-[15px] leading-snug text-muted-foreground text-balance">
            Readiness unlocks when your Garmin syncs — about 12 days.
          </p>
        </div>
      </div>
    </Card>
  );
}

function StepsCard({ steps }: { steps?: NonNullable<ReturnType<typeof useDashboard>["data"]>["steps"] }) {
  if (!steps || !steps.days || steps.days.length === 0) {
    return (
      <Card>
        <SectionLabel>Steps</SectionLabel>
        <p className="mt-3 text-sm text-muted-foreground">No step data yet.</p>
      </Card>
    );
  }
  const last = steps.days[steps.days.length - 1];
  const restNote =
    steps.rest_day_avg != null
      ? `Rest days average ${fmtInt(steps.rest_day_avg)} — training days pull your week up.`
      : null;
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <SectionLabel>Steps · 7-day avg</SectionLabel>
        {steps.target != null && (
          <span className="text-[11px] text-muted-foreground tabular">Target {fmtInt(steps.target)}</span>
        )}
      </div>
      <p className="mt-2 font-display text-6xl leading-none tabular">{fmtInt(steps.avg_7d)}</p>
      <div className="mt-5 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={steps.days} margin={{ top: 4, right: 4, bottom: 12, left: 4 }}>
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickFormatter={fmtWeekday}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
            />
            {steps.target != null && (
              <ReferenceLine
                y={steps.target}
                stroke="var(--color-muted-foreground)"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
            )}
            <Bar dataKey="steps" radius={[3, 3, 0, 0]}>
              {steps.days.map((d) => (
                <Cell
                  key={d.date}
                  fill={d.date === last.date ? "var(--color-primary)" : "var(--color-muted-foreground)"}
                  fillOpacity={d.date === last.date ? 1 : 0.35}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {restNote && <Verdict>{restNote}</Verdict>}
    </Card>
  );
}