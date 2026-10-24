export const SITE_TIMEZONE = "Africa/Monrovia";

export function formatDate(
  value: Date | string | null | undefined,
  opts: { withTime?: boolean; long?: boolean } = {},
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: SITE_TIMEZONE,
    day: "numeric",
    month: opts.long ? "long" : "short",
    year: "numeric",
    ...(opts.withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  }).format(date);
}

export function formatTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: SITE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return `${formatDate(value)} · ${formatTime(value)}`;
}

export function formatEventRange(
  startsAt: Date | string,
  endsAt: Date | string | null | undefined,
): string {
  const start = formatDate(startsAt, { withTime: true, long: true });
  if (!endsAt) return start;
  const endDate = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
  const startDate = typeof startsAt === "string" ? new Date(startsAt) : startsAt;
  const sameDay = endDate.toDateString() === startDate.toDateString();
  if (sameDay) return `${start} – ${formatTime(endDate)}`;
  return `${start} – ${formatDate(endDate, { withTime: true, long: true })}`;
}

export function relativeTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  const diff = Date.now() - date.getTime();
  const abs = Math.abs(diff);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60_000) return "just now";
  if (abs < 3_600_000) return formatter.format(-Math.round(diff / 60_000), "minute");
  if (abs < 86_400_000) return formatter.format(-Math.round(diff / 3_600_000), "hour");
  if (abs < 604_800_000) return formatter.format(-Math.round(diff / 86_400_000), "day");
  return formatDate(date);
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-GB").format(value ?? 0);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function formatDuration(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.round(seconds ?? 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function isoDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString();
}

export function toDateTimeLocal(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}
