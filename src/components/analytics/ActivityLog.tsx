import { useState } from "react";
import { EmptyState, Panel, SourceChips } from "./bits";
import { fmtInt, fmtPaceSec, fmtShortDate } from "@/lib/format";
import { dist, distLabel, pace, paceLabel, type AnalyticsResponse, type Units } from "@/lib/analytics";

const EMOJI: Record<string, string> = {
  run: "🏃",
  ride: "🚴",
  cycling: "🚴",
  swim: "🏊",
  strength: "🏋️",
  weighttraining: "🏋️",
  hiit: "🔥",
  walk: "🚶",
  hike: "🥾",
  yoga: "🧘",
};

export function ActivityLog({
  d,
  units,
  onMerge,
  merging,
}: {
  d: AnalyticsResponse;
  units: Units;
  onMerge: (ids: [string, string]) => void;
  merging?: boolean;
}) {
  const rows = d.activities ?? [];
  const [selected, setSelected] = useState<string[]>([]);
  function toggle(id: string) {
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-2)));
  }
  return (
    <Panel title="Recent activities" info="Every synced session, newest first." sources={["STRAVA", "GARMIN"]}>
      {rows.length === 0 ? (
        <EmptyState>No activities in this window.</EmptyState>
      ) : (
        <>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Provider duplicate? Select two rows to merge manually.
          </p>
          <ul className="mt-3 divide-y divide-border">
            {rows.map((a) => {
              const on = selected.includes(a.id);
              const km = dist(a.distance_km, units);
              const p = pace(a.pace_sec, units);
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => toggle(a.id)}
                    aria-pressed={on}
                    className={`flex min-h-[56px] w-full items-start gap-3 py-3 text-left ${on ? "opacity-100" : ""}`}
                  >
                    <span aria-hidden="true" className="text-lg">
                      {EMOJI[(a.sport ?? "").toLowerCase()] ?? "•"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm text-foreground">{a.name ?? a.sport ?? "Session"}</span>
                        <span className="shrink-0 text-[11px] tabular text-muted-foreground">
                          {fmtShortDate(a.date)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[11px] tabular text-muted-foreground">
                        {[
                          a.duration_min != null ? `${fmtInt(a.duration_min)} min` : null,
                          km != null ? `${km.toFixed(1)} ${distLabel(units)}` : null,
                          p != null ? `${fmtPaceSec(p)}${paceLabel(units)}` : null,
                          a.avg_hr != null ? `${fmtInt(a.avg_hr)} bpm` : null,
                          a.np_watts != null ? `${fmtInt(a.np_watts)} W NP` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      {a.source && <SourceChips sources={[a.source]} />}
                      {a.duplicate_of && (
                        <span className="mt-1 block text-[10px] text-muted-foreground">merged duplicate</span>
                      )}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`mt-1 h-4 w-4 shrink-0 rounded-full border ${on ? "border-primary bg-primary" : "border-border"}`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
          {selected.length === 2 && (
            <button
              type="button"
              disabled={merging}
              onClick={() => {
                onMerge([selected[0], selected[1]]);
                setSelected([]);
              }}
              className="mt-3 min-h-[44px] w-full rounded-xl bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {merging ? "Merging…" : "Merge selected activities"}
            </button>
          )}
        </>
      )}
    </Panel>
  );
}