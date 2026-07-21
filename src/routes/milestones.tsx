import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, SectionLabel, EmptyLine, Verdict } from "@/components/ui-bits";
import { useDashboard } from "@/lib/useDashboard";
import { daysUntil, fmtShortDate } from "@/lib/format";
import { Flag, Star, Target } from "lucide-react";
import type { Dashboard, Goal, Milestone } from "@/lib/types";

export const Route = createFileRoute("/milestones")({ component: MilestonesPage });

type TimelineItem = {
  key: string;
  date: string | null;
  title: string;
  subtitle?: string | null;
  kind: "race" | "milestone";
  priority?: string | null;
  score?: number | null;
  goalTitle?: string | null;
};

function MilestonesPage() {
  const { data, isLoading, error, refetch } = useDashboard();
  const items = data ? buildTimeline(data) : [];
  return (
    <AppShell onRefresh={refetch}>
      <main className="px-5 safe-top pb-6 space-y-5">
        <header className="flex items-baseline justify-between">
          <h1 className="text-[13px] uppercase tracking-[0.16em] text-muted-foreground">Milestones</h1>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Refresh
          </button>
        </header>

        {isLoading && <EmptyLine>Loading…</EmptyLine>}
        {error && <EmptyLine>Couldn't reach your data.</EmptyLine>}

        {data?.next_race && <RaceHero name={data.next_race.name} date={data.next_race.date} />}
        {data?.north_star && <NorthStar ns={data.north_star} />}

        {items.length > 0 && (
          <section className="pt-2">
            <SectionLabel>Timeline</SectionLabel>
            <ol className="mt-4 relative border-l border-border pl-5 space-y-5">
              {items.map((it) => (
                <TimelineRow key={it.key} it={it} />
              ))}
            </ol>
          </section>
        )}

        {data?.goals?.map((g, i) => <GoalCard key={i} goal={g} />)}
      </main>
    </AppShell>
  );
}

function buildTimeline(d: Dashboard): TimelineItem[] {
  const out: TimelineItem[] = [];
  if (d.next_race) {
    out.push({
      key: `race-${d.next_race.name}`,
      date: d.next_race.date,
      title: d.next_race.name,
      kind: "race",
    });
  }
  d.goals?.forEach((g, gi) => {
    g.milestones?.forEach((m, mi) => {
      out.push({
        key: `g${gi}-m${mi}`,
        date: m.target_date ?? null,
        title: m.milestone,
        subtitle: m.kind === "aspirational" ? "aspirational" : null,
        kind: "milestone",
        score: m.score ?? null,
        goalTitle: g.title ?? null,
      });
    });
  });
  return out
    .filter((i) => i.date)
    .sort((a, b) => (a.date! < b.date! ? -1 : 1));
}

function TimelineRow({ it }: { it: TimelineItem }) {
  const days = daysUntil(it.date);
  const Icon = it.kind === "race" ? Flag : Target;
  return (
    <li className="relative">
      <span
        aria-hidden="true"
        className="absolute -left-[30px] top-0.5 h-5 w-5 rounded-full bg-background border border-border flex items-center justify-center"
      >
        <Icon size={11} className="text-primary" />
      </span>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] text-foreground leading-snug text-balance">{it.title}</p>
          {it.goalTitle && (
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {it.goalTitle}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground tabular">
            {fmtShortDate(it.date)}
            {days != null && days >= 0 && <span className="ml-2">· in {days}d</span>}
            {it.subtitle && <span className="ml-2">· {it.subtitle}</span>}
          </p>
        </div>
        {it.score != null && <ScoreBadge score={it.score} />}
      </div>
    </li>
  );
}

function NorthStar({ ns }: { ns: NonNullable<Dashboard["north_star"]> }) {
  const line = ns.line ?? ns.headline ?? "";
  const detail = ns.detail ?? null;
  return (
    <section className="pt-2">
      <div className="flex items-center gap-2">
        <Star size={14} className="text-primary" aria-hidden="true" />
        <SectionLabel>North Star</SectionLabel>
      </div>
      <p
        className="font-display text-[44px] leading-[0.95] mt-3 text-primary text-balance"
        style={{ textTransform: "none" }}
      >
        {line}
      </p>
      {detail && (
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground text-balance">
          {detail}
        </p>
      )}
      {ns.review_date && (
        <p className="mt-3 text-xs text-muted-foreground tabular">
          Review · {fmtShortDate(ns.review_date)}
        </p>
      )}
    </section>
  );
}

function RaceHero({ name, date }: { name: string; date: string }) {
  const days = daysUntil(date);
  return (
    <section className="pt-2">
      <SectionLabel>Next race</SectionLabel>
      <p className="mt-2 text-lg text-foreground">{name}</p>
      {days != null && (
        <p className="font-display text-[76px] leading-[0.9] mt-2 text-primary tabular">
          {days > 0 ? days : 0}
          <span className="font-display text-2xl text-muted-foreground ml-2 align-top">days</span>
        </p>
      )}
      <Verdict>{fmtShortDate(date)}</Verdict>
    </section>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  return (
    <Card>
      {goal.type && <SectionLabel>{goal.type}</SectionLabel>}
      <h2 className="mt-2 text-xl font-semibold text-balance">{goal.title}</h2>
      {goal.why && <p className="mt-1 text-sm text-muted-foreground">{goal.why}</p>}
      {goal.milestones && goal.milestones.length > 0 && (
        <ul className="mt-4 space-y-3">
          {goal.milestones.map((m: Milestone, i: number) => (
            <li key={i} className="flex items-start gap-3">
              <ScoreBadge score={m.score ?? null} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">{m.milestone}</p>
                <p className="text-xs text-muted-foreground tabular mt-0.5">
                  {fmtShortDate(m.target_date)}
                  {m.kind === "aspirational" && " · aspirational"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) {
    return (
      <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-xs text-muted-foreground shrink-0">
        —
      </span>
    );
  }
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? "var(--color-success)" : pct >= 40 ? "var(--color-warning)" : "var(--color-destructive)";
  const circ = 2 * Math.PI * 14;
  return (
    <span className="relative mt-0.5 inline-flex h-8 w-8 items-center justify-center shrink-0">
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="14" fill="none" stroke="var(--color-border)" strokeWidth="2.5" />
        <circle
          cx="16"
          cy="16"
          r="14"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${score * circ} ${circ}`}
          transform="rotate(-90 16 16)"
        />
      </svg>
      <span className="absolute text-[10px] font-medium tabular" style={{ color }}>
        {pct}
      </span>
    </span>
  );
}
