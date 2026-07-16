import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, SectionLabel, EmptyLine, Verdict } from "@/components/ui-bits";
import { useDashboard } from "@/lib/useDashboard";
import { fmtInt, fmtWeekday } from "@/lib/format";
import { BarChart, Bar, Cell, ReferenceLine, ResponsiveContainer, XAxis } from "recharts";

export const Route = createFileRoute("/today")({ component: TodayPage });

const READINESS = {
  ready: { word: "READY", color: "var(--color-success)", ring: "#5FD08A" },
  ease_in: { word: "EASE IN", color: "var(--color-warning)", ring: "#E8B14C" },
  recover: { word: "RECOVER", color: "var(--color-destructive)", ring: "#E06B5E" },
  no_data: { word: "NO DATA", color: "var(--color-muted-foreground)", ring: "#8A8F98" },
} as const;

function TodayPage() {
  const { data, isLoading, error, refetch } = useDashboard();
  return (
    <AppShell>
      <main className="px-5 pt-10 pb-6 space-y-5">
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
        {data && <ReadinessHero d={data} />}
        {data && <SessionCard session={data.today_session} race={data.next_race?.name} />}
        {data && <StepsCard steps={data.steps} />}
        {data?.coach_line && (
          <p className="px-2 pt-2 text-[15px] leading-relaxed text-foreground/90">
            {data.coach_line}
          </p>
        )}
      </main>
    </AppShell>
  );
}

function ReadinessHero({ d }: { d: NonNullable<ReturnType<typeof useDashboard>["data"]> }) {
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
  const arc = state === "no_data" ? 0.15 : state === "ready" ? 1 : state === "ease_in" ? 0.66 : 0.33;
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

function SessionCard({ session, race }: { session?: string | null; race?: string }) {
  return (
    <Card>
      <SectionLabel>Today's Session</SectionLabel>
      <p className="mt-2 text-lg text-foreground">
        {session ?? (race ? `Toward ${race}.` : "Nothing locked — open Plan.")}
      </p>
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