import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyLine } from "@/components/ui-bits";
import {
  HeroStats,
  ReadinessCard,
  LoadBalanceCard,
  ZonesCard,
} from "@/components/analytics/TopCards";
import {
  ConsistencyHeatmap,
  PmcChart,
  ThresholdsEditor,
  TrainingVolume,
  WeekCompare,
} from "@/components/analytics/FitnessSections";
import {
  AerobicEfficiency,
  PaceTrend,
  PowerProfile,
  StrengthProgression,
  ZoneDistribution,
} from "@/components/analytics/PerformanceSections";
import {
  CaloriesBurned,
  GarminRecovery,
  NutritionCard,
  WeightTrend,
  WellnessTrends,
} from "@/components/analytics/RecoverySections";
import { ActivityLog } from "@/components/analytics/ActivityLog";
import { Segmented } from "@/components/analytics/bits";
import { apiFetch } from "@/lib/api";
import {
  RANGES,
  relativeTime,
  useAnalytics,
  useRangePref,
  useUnitsPref,
  type Range,
  type Thresholds,
} from "@/lib/analytics";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — John" },
      {
        name: "description",
        content:
          "Fitness, fatigue and form, load balance, zones, performance and recovery — your full training analytics in one view.",
      },
      { property: "og:title", content: "Analytics — John" },
      {
        property: "og:description",
        content:
          "Fitness, fatigue and form, load balance, zones, performance and recovery in one view.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyticsPage,
});

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="pt-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </h2>
  );
}

function AnalyticsPage() {
  const [range, setRange] = useRangePref();
  const [units, setUnits] = useUnitsPref();
  const { data, isLoading, error, refetch, isFetching } = useAnalytics(range);
  const qc = useQueryClient();

  const sync = useMutation({
    mutationFn: () => apiFetch("/api/sync", { method: "POST" }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["analytics"] }),
  });
  const saveThresholds = useMutation({
    mutationFn: (t: Thresholds) =>
      apiFetch("/api/thresholds", { method: "POST", body: JSON.stringify(t) }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["analytics"] }),
  });
  const merge = useMutation({
    mutationFn: (ids: [string, string]) =>
      apiFetch("/api/activities/merge", {
        method: "POST",
        body: JSON.stringify({ keep_id: ids[0], duplicate_id: ids[1] }),
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["analytics"] }),
  });

  return (
    <AppShell onRefresh={refetch}>
      <main className="px-5 safe-top pb-8 space-y-4">
        <header className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl leading-none">Analytics</h1>
              <p className="mt-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground tabular">
                Training · {range} · synced {relativeTime(data?.synced_at)} ago
              </p>
            </div>
            <button
              type="button"
              onClick={() => sync.mutate()}
              disabled={sync.isPending}
              aria-label="Sync data now"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted-foreground disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                aria-hidden="true"
                className={sync.isPending || isFetching ? "animate-spin" : ""}
              />
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmented
              label="Date range"
              options={RANGES}
              value={range}
              onChange={(r) => setRange(r as Range)}
            />
            <Segmented
              label="Units"
              options={["metric", "imperial"] as const}
              value={units}
              onChange={setUnits}
            />
          </div>
        </header>

        {isLoading && <EmptyLine>Loading…</EmptyLine>}
        {error && <EmptyLine>Couldn't reach your data.</EmptyLine>}

        {data && (
          <>
            <HeroStats d={data} units={units} />
            <ReadinessCard d={data} />
            <LoadBalanceCard d={data} />
            <ZonesCard d={data} />

            <SectionHeading>Fitness &amp; load</SectionHeading>
            <WeekCompare d={data} units={units} />
            <PmcChart d={data} units={units} />
            <ThresholdsEditor
              thresholds={data.thresholds}
              saving={saveThresholds.isPending}
              onSave={(t) => saveThresholds.mutate(t)}
            />
            <ConsistencyHeatmap d={data} />
            <TrainingVolume d={data} units={units} />

            <SectionHeading>Performance</SectionHeading>
            <PaceTrend d={data} units={units} />
            <AerobicEfficiency d={data} units={units} />
            <TrainingVolume d={data} units={units} title="Sport distribution" />
            <ZoneDistribution d={data} />
            <PowerProfile d={data} />
            <StrengthProgression d={data} units={units} />

            <SectionHeading>Recovery</SectionHeading>
            <WellnessTrends d={data} />
            <GarminRecovery d={data} />

            <SectionHeading>Nutrition &amp; body</SectionHeading>
            <WeightTrend d={data} units={units} />
            <NutritionCard d={data} />
            <CaloriesBurned d={data} />

            <SectionHeading>Activity log</SectionHeading>
            <ActivityLog
              d={data}
              units={units}
              merging={merge.isPending}
              onMerge={(ids) => merge.mutate(ids)}
            />
          </>
        )}
      </main>
    </AppShell>
  );
}
