const numberFmt = new Intl.NumberFormat("en-US");

export function fmtInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return numberFmt.format(Math.round(n));
}

export function fmtPct(n: number | null | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

export function fmtPaceSec(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const shortDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short" });

// Parse "YYYY-MM-DD" as a LOCAL calendar date, not UTC. Other ISO strings
// (with time / Z) fall through to the native parser.
function parseLocalDate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(iso);
}

export function fmtShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseLocalDate(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return shortDate.format(d);
}

export function fmtWeekday(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = parseLocalDate(iso);
  if (Number.isNaN(d.getTime())) return "";
  return weekday.format(d).slice(0, 1);
}

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = parseLocalDate(iso);
  if (Number.isNaN(d.getTime())) return null;
  const ms = d.getTime() - Date.now();
  return Math.round(ms / 86_400_000);
}