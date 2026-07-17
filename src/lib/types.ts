export type ReadinessState = "ready" | "ease_in" | "recover" | "no_data" | string;

export interface Dashboard {
  readiness?: {
    state?: ReadinessState;
    flags?: string[] | null;
    thin?: boolean | null;
  } | null;
  steps?: {
    avg_7d?: number | null;
    target?: number | null;
    rest_day_avg?: number | null;
    days?: { date: string; steps: number }[] | null;
  } | null;
  fitness_verdict?: {
    word?: "RISING" | "HOLDING" | "SLIPPING" | "BUILDING" | string;
    subline?: string | null;
    pct?: number | null;
    confidence?: "building" | "low" | "ok" | string | null;
  } | null;
  pace_trend?: { period: string; median_pace_sec: number }[] | null;
  rhythm?: {
    headline?: string | null;
    band?: { low: number; high: number } | null;
    weeks?: { week: string; volume: number; state: "in" | "over" | "under" | string }[] | null;
  } | null;
  wellness?: {
    rhr?: number | null;
    rhr_delta?: number | null;
    rhr_series?: { date: string; rhr: number }[] | null;
  } | null;
  body?: {
    vo2max?: number | null;
    vo2max_series?: { date: string; vo2max: number }[] | null;
    weight?: { date: string; weight: number }[] | null;
  } | null;
  nutrition?: {
    protein_g?: number | null;
    protein_target_g?: number | null;
    history?: { date: string; protein_g: number; target: number }[] | null;
  } | null;
  sleep_series?: { date: string; hours: number }[] | null;
  next_race?: { name: string; date: string } | null;
  goals?: Goal[] | null;
  north_star?: {
    headline?: string | null;
    line?: string | null;
    detail?: string | null;
    review_date?: string | null;
  } | null;
  coach_line?: string | null;
  today_session?: string | null;
}

export interface Goal {
  type?: string;
  title?: string;
  why?: string;
  milestones?: Milestone[] | null;
}

export interface Milestone {
  milestone: string;
  target_date?: string | null;
  kind?: "committed" | "aspirational" | string;
  score?: number | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  at: string;
}

export interface MessagesResponse {
  messages: ChatMessage[];
}

export interface TodaySession {
  id: string;
  time?: string | null;
  label: string;
  kind: string;
  duration_min?: number | null;
  done?: boolean;
}

export interface TodayResponse {
  date: string;
  sessions?: TodaySession[] | null;
  plan_text?: string | null;
  rationale?: string | null;
}

export interface WorkoutSet {
  set_index: number;
  reps: number;
  weight_kg: number;
  rpe?: number | null;
}

export interface WorkoutExercise {
  name: string;
  sets: WorkoutSet[];
  last?: { date: string; reps: number; weight_kg: number } | null;
}

export interface WorkoutResponse {
  date: string;
  exercises: WorkoutExercise[];
}