import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  ChatMessage,
} from "@/lib/types";
import { ArrowUp, Check } from "lucide-react";

export const Route = createFileRoute("/today")({ component: TodayPage });

function toText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.focus === "string" && Array.isArray(o.exercises)) {
      const ex = (o.exercises as unknown[])
        .map((e) => (typeof e === "string" ? e : (e as { name?: string })?.name ?? ""))
        .filter(Boolean)
        .join(" · ");
      return ex ? `${o.focus} — ${ex}` : String(o.focus);
    }
    if (typeof o.label === "string") return o.label;
    if (typeof o.text === "string") return o.text;
    try { return JSON.stringify(v); } catch { return ""; }
  }
  return String(v);
}

const READINESS = {
  ready: { word: "READY", color: "var(--color-success)", ring: "#5FD08A" },
  ease_in: { word: "EASE IN", color: "var(--color-warning)", ring: "#E8B14C" },
  recover: { word: "RECOVER", color: "var(--color-destructive)", ring: "#E06B5E" },
  no_data: { word: "NO DATA", color: "var(--color-muted-foreground)", ring: "#8A8F98" },
} as const;

function TodayPage() {
  const { data, isLoading, error, refetch } = useDashboard();
  const qc = useQueryClient();
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
  const navigate = useNavigate();
  const onRefresh = useCallback(async () => {
    await Promise.all([
      refetch(),
      qc.invalidateQueries({ queryKey: ["today"] }),
    ]);
  }, [refetch, qc]);
  return (
    <AppShell onRefresh={onRefresh}>
      <main className="px-5 safe-top pb-6 space-y-5">
        <header className="flex items-baseline justify-between">
          <h1 className="text-[13px] uppercase tracking-[0.16em] text-muted-foreground">Today</h1>
          <button
            type="button"
            onClick={onRefresh}
            className="text-xs text-muted-foreground underline-offset-4 hover:underline focus-visible:underline"
          >
            Refresh
          </button>
        </header>

        {isLoading && <EmptyLine>Loading…</EmptyLine>}
        {error && <EmptyLine>Couldn't reach your data.</EmptyLine>}
        <ProgramCard onOpenWorkout={(date: string) => navigate({ to: "/workout/$date", params: { date } })} />
        {data && isReal && <ReadinessHero d={data} firstReveal={firstReveal} />}
        {data && !isReal && <ReadinessAnticipatory />}
        {data && <StepsCard steps={data.steps} />}
        {data?.coach_line && (
          <p className="px-2 pt-2 text-[15px] leading-relaxed text-foreground">
            {data.coach_line}
          </p>
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
        <p className="mt-3 text-[15px] leading-snug text-foreground">
          Steps aren't syncing yet.
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Connect Apple Health (Health Auto Export) or your Garmin to see them here.
        </p>
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

/* ============ PROGRAM OF THE DAY ============ */

function useToday() {
  return useQuery<TodayResponse>({
    queryKey: ["today"],
    queryFn: () => apiFetch<TodayResponse>("/api/today"),
    staleTime: 30_000,
  });
}

function KindChip({ kind }: { kind: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
      {kind}
    </span>
  );
}

function DoneToggle({
  done,
  onToggle,
  label,
}: {
  done: boolean;
  onToggle: () => void;
  label: string;
}) {
  const [pop, setPop] = useState(false);
  useEffect(() => {
    if (done) {
      setPop(true);
      const t = setTimeout(() => setPop(false), 400);
      return () => clearTimeout(t);
    }
  }, [done]);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={label}
      aria-pressed={done}
      className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center border transition ${
        done
          ? "bg-primary border-primary text-primary-foreground"
          : "bg-transparent border-white/20 text-transparent hover:border-white/40"
      }`}
    >
      <Check
        size={16}
        strokeWidth={3}
        aria-hidden="true"
        className={pop ? "animate-tick-pop" : undefined}
      />
    </button>
  );
}

function ProgramCard({ onOpenWorkout }: { onOpenWorkout: (date: string) => void }) {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useToday();

  const toggleDone = useCallback(
    async (session: TodaySession) => {
      const next = !session.done;
      qc.setQueryData<TodayResponse>(["today"], (prev) =>
        prev
          ? {
              ...prev,
              sessions: prev.sessions?.map((s) =>
                s.id === session.id ? { ...s, done: next } : s,
              ),
            }
          : prev,
      );
      try {
        await apiFetch("/api/session/done", {
          method: "POST",
          body: JSON.stringify({ id: session.id, done: next }),
        });
      } catch {
        // revert
        qc.setQueryData<TodayResponse>(["today"], (prev) =>
          prev
            ? {
                ...prev,
                sessions: prev.sessions?.map((s) =>
                  s.id === session.id ? { ...s, done: !next } : s,
                ),
              }
            : prev,
        );
      }
    },
    [qc],
  );

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <SectionLabel>Program of the Day</SectionLabel>
        {data?.date && (
          <span className="text-[11px] text-muted-foreground tabular">{data.date}</span>
        )}
      </div>

      {isLoading && <p className="mt-3 text-sm text-muted-foreground">Loading program…</p>}
      {error && (
        <p className="mt-3 text-sm text-muted-foreground">Couldn't load today's program.</p>
      )}

      {data?.sessions && data.sessions.length > 0 ? (
        <ul className="mt-4 space-y-2" role="list">
          {data.sessions.map((s) => {
            const strength = /strength|lift|gym|weights/i.test(s.kind);
            const rowClasses = `flex items-center gap-3 rounded-xl px-3 py-3 border border-white/[0.06] bg-white/[0.02] transition ${
              s.done ? "opacity-60" : ""
            } ${strength ? "cursor-pointer hover:bg-white/[0.04]" : ""}`;
            const content = (
              <>
                <span className="w-12 shrink-0 text-[13px] tabular text-muted-foreground">
                  {s.time ?? "—"}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-[15px] leading-snug ${s.done ? "line-through" : "text-foreground"}`}>
                    {toText(s.label)}
                  </span>
                  <span className="mt-1 flex items-center gap-2">
                    <KindChip kind={s.kind} />
                    {s.duration_min != null && (
                      <span className="text-[11px] tabular text-muted-foreground">
                        {s.duration_min} min
                      </span>
                    )}
                  </span>
                </span>
                <DoneToggle
                  done={!!s.done}
                  onToggle={() => toggleDone(s)}
                  label={s.done ? "Mark not done" : "Mark done"}
                />
              </>
            );
            return (
              <li key={s.id}>
                {strength ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenWorkout(data.date)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenWorkout(data.date);
                      }
                    }}
                    className={rowClasses}
                  >
                    {content}
                  </div>
                ) : (
                  <div className={rowClasses}>{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        data?.plan_text && (
          <p className="mt-4 font-display text-4xl leading-[0.95] text-foreground text-balance">
            {toText(data.plan_text)}
          </p>
        )
      )}

      {data?.sessions && data.sessions.length > 0 && data.plan_text && (
        <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">{toText(data.plan_text)}</p>
      )}
      {data?.rationale && (
        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground/80">
          {toText(data.rationale)}
        </p>
      )}

      <AdjustBox onAdjusted={() => refetch()} />
    </Card>
  );
}

function AdjustBox({ onAdjusted }: { onAdjusted: () => void }) {
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const stopPoll = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };
  useEffect(() => stopPoll, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = comment.trim();
    if (!text || pending) return;
    setError(null);
    setReply(null);

    // Snapshot latest assistant message time
    let lastAt = "";
    try {
      const m = await apiFetch<{ messages: ChatMessage[] }>("/api/messages");
      lastAt = [...(m.messages ?? [])].reverse().find((x) => x.role === "assistant")?.at ?? "";
    } catch {
      // continue
    }

    try {
      await apiFetch("/api/session/adjust", {
        method: "POST",
        body: JSON.stringify({ comment: text }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
      return;
    }

    setComment("");
    setPending(true);
    const started = Date.now();
    stopPoll();
    pollRef.current = window.setInterval(async () => {
      try {
        const m = await apiFetch<{ messages: ChatMessage[] }>("/api/messages");
        const newest = [...(m.messages ?? [])].reverse().find((x) => x.role === "assistant");
        if (newest && newest.at > lastAt) {
          setReply(newest.content);
          setPending(false);
          stopPoll();
          onAdjusted();
          return;
        }
        if (Date.now() - started > 120_000) {
          setPending(false);
          setError("Still thinking, check back in a bit.");
          stopPoll();
        }
      } catch (err) {
        setPending(false);
        setError(err instanceof Error ? err.message : "Poll failed");
        stopPoll();
      }
    }, 3000);
  }

  return (
    <div className="mt-5 pt-4 border-t border-white/[0.06]">
      <form onSubmit={send} className="flex items-end gap-2">
        <label htmlFor="adjust-input" className="sr-only">
          Comment on today's plan
        </label>
        <input
          id="adjust-input"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Comment on today's plan…"
          className="flex-1 min-w-0 rounded-full bg-white/[0.04] border border-white/10 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <button
          type="submit"
          disabled={pending || !comment.trim()}
          aria-label="Send comment"
          className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 active:scale-95 transition shrink-0"
        >
          <ArrowUp size={16} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </form>
      {pending && (
        <p aria-live="polite" className="mt-3 text-xs text-muted-foreground">
          John is adjusting…
        </p>
      )}
      {reply && (
        <p aria-live="polite" className="mt-3 text-[14px] leading-relaxed text-foreground/90">
          {reply}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

