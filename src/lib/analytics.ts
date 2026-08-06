import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "./api";

export type Range = "1w" | "4w" | "12w" | "6m" | "1y";
export const RANGES: Range[] = ["1w", "4w", "12w", "6m", "1y"];
export type Units = "metric" | "imperial";

export type Source = "STRAVA" | "GARMIN" | "DERIVED" | string;

export interface HeroStat {
  key?: string;
  label?: string;
  value?: number | string | null;
  unit?: string | null;
  subline?: string | null;
  state?: string | null;
  sources?: Source[] | null;
  info?: string | null;
}

export interface Driver {
  label: string;
  severity?: number | null;
  note?: string | null;
}

export interface AnalyticsResponse {
  synced_at?: string | null;
  range?: Range;
  hero?: {
    ctl?: number | null;
    atl?: number | null;
    tsb?: number | null;
    tsb_state?: string | null;
    volume_7d_hours?: number | null;
    sessions_7d?: number | null;
    weight_kg?: number | null;
    weight_source?: string | null;
  } | null;
  readiness?: {
    score?: number | null;
    verdict?: string | null;
    hrv_ms?: number | null;
    rhr_bpm?: number | null;
    sleep_debt_min?: number | null;
    load_flag?: number | null;
    load_flag_label?: string | null;
    drivers?: Driver[] | null;
  } | null;
  load_balance?: {
    status?: string | null;
    acwr?: number | null;
    monotony?: number | null;
    strain?: number | null;
    sport_split?: { sport: string; pct: number }[] | null;
  } | null;
  zones?: {
    status_line?: string | null;
    lthr?: number | null;
    zones?: { zone: string; label?: string | null; min?: number | null; max?: number | null }[] | null;
  } | null;
  week_compare?: {
    sessions?: Compare | null;
    volume_hours?: Compare | null;
    distance_km?: Compare | null;
    avg_pace_sec?: Compare | null;
  } | null;
  pmc?: {
    date: string;
    ctl?: number | null;
    atl?: number | null;
    tsb?: number | null;
    load?: number | null;
    threshold_pace_sec?: number | null;
  }[] | null;
  thresholds?: Thresholds | null;
  heatmap?: { date: string; load?: number | null; sessions?: number | null }[] | null;
  volume?: { week: string; sport: string; hours?: number | null; distance_km?: number | null }[] | null;
  pace_trend?: { date: string; name?: string | null; pace_sec: number }[] | null;
  efficiency?: { date: string; name?: string | null; avg_hr: number; pace_sec: number }[] | null;
  zone_distribution?: {
    lthr?: number | null;
    bins?: { zone: string; label?: string | null; pct: number; range?: string | null }[] | null;
  } | null;
  power_profile?: { duration_sec: number; watts: number }[] | null;
  strength?: {
    exercises?: string[] | null;
    sessions?: {
      date: string;
      exercise: string;
      top_weight_kg?: number | null;
      reps?: number | null;
      e1rm_kg?: number | null;
    }[] | null;
  } | null;
  wellness?: { date: string; hrv?: number | null; sleep_hours?: number | null; readiness?: number | null }[] | null;
  garmin_recovery?: { date: string; body_battery?: number | null }[] | null;
  weight_trend?: { date: string; weight_kg: number }[] | null;
  nutrition?: { date: string; kcal?: number | null; protein_g?: number | null }[] | null;
  calories?: {
    avg_total?: number | null;
    avg_bmr?: number | null;
    avg_active?: number | null;
    days?: { date: string; total?: number | null; bmr?: number | null; active?: number | null }[] | null;
  } | null;
  activities?: {
    id: string;
    sport?: string | null;
    name?: string | null;
    date: string;
    duration_min?: number | null;
    distance_km?: number | null;
    pace_sec?: number | null;
    avg_hr?: number | null;
    np_watts?: number | null;
    source?: string | null;
    duplicate_of?: string | null;
  }[] | null;
}

export interface Compare {
  current?: number | null;
  previous?: number | null;
  delta_pct?: number | null;
}

export interface Thresholds {
  ftp_w?: number | null;
  lthr_cycling?: number | null;
  lthr_running?: number | null;
  stryd_cp_w?: number | null;
  threshold_pace_sec?: number | null;
  max_hr?: number | null;
}

export function useAnalytics(range: Range) {
  return useQuery<AnalyticsResponse>({
    queryKey: ["analytics", range],
    queryFn: () => apiFetch<AnalyticsResponse>(`/api/analytics?range=${range}`),
    staleTime: 60_000,
  });
}

function usePersisted<T extends string>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored) setValue(stored as T);
  }, [key]);
  const set = useCallback(
    (v: T) => {
      setValue(v);
      localStorage.setItem(key, v);
    },
    [key],
  );
  return [value, set] as const;
}

export function useRangePref() {
  return usePersisted<Range>("john.analytics.range", "4w");
}

export function useUnitsPref() {
  return usePersisted<Units>("john.analytics.units", "metric");
}

/* ---------- unit conversion ---------- */

export function dist(km: number | null | undefined, units: Units) {
  if (km == null || !Number.isFinite(km)) return null;
  return units === "metric" ? km : km * 0.621371;
}
export function distLabel(units: Units) {
  return units === "metric" ? "km" : "mi";
}
export function mass(kg: number | null | undefined, units: Units) {
  if (kg == null || !Number.isFinite(kg)) return null;
  return units === "metric" ? kg : kg * 2.20462;
}
export function massLabel(units: Units) {
  return units === "metric" ? "kg" : "lb";
}
/** pace given in sec per km -> sec per displayed distance unit */
export function pace(secPerKm: number | null | undefined, units: Units) {
  if (secPerKm == null || !Number.isFinite(secPerKm)) return null;
  return units === "metric" ? secPerKm : secPerKm / 0.621371;
}
export function paceLabel(units: Units) {
  return units === "metric" ? "/km" : "/mi";
}

export function tsbState(tsb: number | null | undefined): string {
  if (tsb == null || !Number.isFinite(tsb)) return "—";
  if (tsb > 10) return "Fresh";
  if (tsb >= -10) return "Neutral";
  if (tsb >= -20) return "Absorbing";
  return "Overreached";
}

export function fmtHm(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes)) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h${m.toString().padStart(2, "0")}m`;
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const mins = Math.max(0, Math.round((Date.now() - t) / 60_000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}