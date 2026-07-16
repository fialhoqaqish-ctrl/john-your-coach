import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, SectionLabel, EmptyLine, Verdict } from "@/components/ui-bits";
import { useDashboard } from "@/lib/useDashboard";
import { daysUntil, fmtShortDate } from "@/lib/format";
import { MessageCircle } from "lucide-react";
import type { Milestone, Goal } from "@/lib/types";

export const Route = createFileRoute("/plan")({ component: PlanPage });

function PlanPage() {
  const { data, isLoading, error } = useDashboard();
  return (
    <AppShell>
      <main className="px-5 safe-top pb-6 space-y-5">
        <h1 className="text-[13px] uppercase tracking-[0.16em] text-muted-foreground">Plan</h1>
        {isLoading && <EmptyLine>Loading…</EmptyLine>}
        {error && <EmptyLine>Couldn't reach your data.</EmptyLine>}
        {data?.next_race && <RaceHero name={data.next_race.name} date={data.next_race.date} />}
        {data?.goals?.map((g, i) => <GoalCard key={i} goal={g} />)}
        {data?.north_star && <NorthStar ns={data.north_star} />}
        <Link
          to="/coach"
          className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition"
        >
          <span className="flex items-center gap-3">
            <MessageCircle size={18} className="text-primary" aria-hidden="true" />
            <span className="text-base font-medium">Chat with John</span>
          </span>
          <span aria-hidden="true" className="text-muted-foreground">→</span>
        </Link>
      </main>
    </AppShell>
  );
}

function NorthStar({ ns }: { ns: NonNullable<import("@/lib/types").Dashboard["north_star"]> }) {
  const line = ns.line ?? ns.headline ?? "";
  const detail = ns.detail ?? (ns.line ? null : null);
  return (
    <section className="pt-2">
      <SectionLabel>North Star</SectionLabel>
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
          {goal.milestones.map((m, i) => (
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
          strokeDasharray={`${(score) * circ} ${circ}`}
          transform="rotate(-90 16 16)"
        />
      </svg>
      <span className="absolute text-[10px] font-medium tabular" style={{ color }}>
        {pct}
      </span>
    </span>
  );
}