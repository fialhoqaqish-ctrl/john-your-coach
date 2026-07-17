import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { WorkoutExercise, WorkoutResponse, WorkoutSet } from "@/lib/types";
import { ArrowLeft, Plus } from "lucide-react";

export const Route = createFileRoute("/workout/$date")({ component: WorkoutPage });

function WorkoutPage() {
  const { date } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const key = ["workout", date];
  const { data, isLoading, error, refetch } = useQuery<WorkoutResponse>({
    queryKey: key,
    queryFn: () => apiFetch<WorkoutResponse>(`/api/workout?date=${encodeURIComponent(date)}`),
  });

  const addSet = useCallback(
    async (exercise: string, reps: number, weight_kg: number, rpe?: number) => {
      const optimistic: WorkoutSet = { set_index: 0, reps, weight_kg, rpe: rpe ?? null };
      qc.setQueryData<WorkoutResponse>(key, (prev) => {
        if (!prev) return prev;
        const exercises = [...prev.exercises];
        const idx = exercises.findIndex((e) => e.name === exercise);
        if (idx >= 0) {
          const ex = exercises[idx];
          const nextIndex = (ex.sets[ex.sets.length - 1]?.set_index ?? 0) + 1;
          exercises[idx] = { ...ex, sets: [...ex.sets, { ...optimistic, set_index: nextIndex }] };
        } else {
          exercises.push({ name: exercise, sets: [{ ...optimistic, set_index: 1 }], last: null });
        }
        return { ...prev, exercises };
      });
      try {
        await apiFetch("/api/workout/set", {
          method: "POST",
          body: JSON.stringify({ date, exercise, reps, weight_kg, rpe }),
        });
      } catch {
        qc.invalidateQueries({ queryKey: key });
      }
    },
    [date, qc, key],
  );

  const [newExercise, setNewExercise] = useState("");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3 border-b border-white/[0.06] bg-background/95 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate({ to: "/today" })}
          aria-label="Back to Today"
          className="h-9 w-9 rounded-full border border-white/10 flex items-center justify-center text-foreground hover:bg-white/[0.04]"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Log Workout</p>
          <p className="text-[13px] tabular text-muted-foreground">{date}</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Refresh
        </button>
      </header>
      <main className="flex-1 px-5 py-5 space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-muted-foreground">Couldn't load workout.</p>}
        {data?.exercises?.map((ex) => (
          <ExerciseBlock key={ex.name} ex={ex} onAdd={addSet} />
        ))}
        {data && data.exercises.length === 0 && (
          <p className="text-sm text-muted-foreground">No exercises yet — add one below.</p>
        )}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Add Exercise</p>
          <input
            value={newExercise}
            onChange={(e) => setNewExercise(e.target.value)}
            placeholder="e.g. Back Squat"
            className="mt-3 w-full rounded-full bg-white/[0.04] border border-white/10 px-4 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          {newExercise.trim() && (
            <div className="mt-3">
              <AddSetForm
                onSubmit={async (reps, w, rpe) => {
                  await addSet(newExercise.trim(), reps, w, rpe);
                  setNewExercise("");
                }}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ExerciseBlock({
  ex,
  onAdd,
}: {
  ex: WorkoutExercise;
  onAdd: (exercise: string, reps: number, weight_kg: number, rpe?: number) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[16px] font-semibold text-foreground">{ex.name}</h2>
        {ex.last && (
          <span className="text-[11px] tabular text-muted-foreground shrink-0">
            Last: {ex.last.weight_kg}kg × {ex.last.reps}
          </span>
        )}
      </div>
      {ex.sets.length > 0 && (
        <ul className="mt-3 space-y-1" role="list">
          {ex.sets.map((s) => (
            <li key={s.set_index} className="flex items-center gap-3 text-[14px] tabular text-foreground">
              <span className="w-6 text-muted-foreground">{s.set_index}.</span>
              <span>{s.weight_kg} kg</span>
              <span className="text-muted-foreground">×</span>
              <span>{s.reps}</span>
              {s.rpe != null && <span className="text-muted-foreground text-[12px]">RPE {s.rpe}</span>}
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <div className="mt-3">
          <AddSetForm
            onSubmit={async (reps, w, rpe) => {
              await onAdd(ex.name, reps, w, rpe);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-[13px] text-foreground hover:bg-white/[0.04]"
        >
          <Plus size={14} aria-hidden="true" /> Add set
        </button>
      )}
    </section>
  );
}

function AddSetForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (reps: number, weight_kg: number, rpe?: number) => Promise<void>;
  onCancel?: () => void;
}) {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [rpe, setRpe] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);
    if (!Number.isFinite(w) || !Number.isFinite(r)) return;
    const rp = rpe ? parseFloat(rpe) : undefined;
    setBusy(true);
    try {
      await onSubmit(r, w, rp);
      setWeight("");
      setReps("");
      setRpe("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <NumField label="Weight (kg)" value={weight} setValue={setWeight} mode="decimal" />
      <NumField label="Reps" value={reps} setValue={setReps} mode="numeric" />
      <NumField label="RPE" value={rpe} setValue={setRpe} mode="decimal" optional />
      <button
        type="submit"
        disabled={busy || !weight || !reps}
        className="h-12 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 active:scale-95 transition"
      >
        Log Set
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="h-12 px-3 rounded-full text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      )}
    </form>
  );
}

function NumField({
  label,
  value,
  setValue,
  mode,
  optional,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  mode: "decimal" | "numeric";
  optional?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
        {optional && <span className="ml-1 normal-case tracking-normal">(opt)</span>}
      </span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputMode={mode}
        pattern={mode === "numeric" ? "[0-9]*" : "[0-9]*[.,]?[0-9]*"}
        className="w-24 h-12 rounded-xl bg-white/[0.04] border border-white/10 px-3 text-base tabular text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />
    </label>
  );
}