// All pads are in Münster, so dates are shown and grouped in Berlin time.
// A fixed zone also keeps server and client rendering identical.
const TIME_ZONE = "Europe/Berlin";

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFormat = new Intl.DateTimeFormat("de-DE", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});
const dayFormat = new Intl.DateTimeFormat("de-DE", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** Calendar day in Berlin as days since epoch, for day differences across DST. */
function berlinDay(date: Date) {
  const [year = 0, month = 1, day = 1] = dayKeyFormat
    .format(date)
    .split("-")
    .map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

const wallClockFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

/** How far Berlin wall-clock time is ahead of UTC at `date`, in ms. */
function berlinOffset(date: Date) {
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(
      wallClockFormat.formatToParts(date).find((p) => p.type === type)?.value,
    );
  const wallClockAsUtc = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
  );
  return wallClockAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Midnight of the current Berlin calendar day, e.g. for "today" filters. */
export function startOfBerlinDay(date: Date) {
  const midnightAsUtc = berlinDay(date) * 86_400_000;
  return new Date(midnightAsUtc - berlinOffset(new Date(midnightAsUtc)));
}

export type TimeGroup = "live" | "today" | "tomorrow" | "week" | "later";

export const timeGroupLabels: Record<TimeGroup, string> = {
  live: "Jetzt live",
  today: "Heute",
  tomorrow: "Morgen",
  week: "Nächste 7 Tage",
  later: "Später",
};

export function timeGroupOf(startsAt: Date, now: Date): TimeGroup {
  if (startsAt <= now) return "live";
  const days = berlinDay(startsAt) - berlinDay(now);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 7) return "week";
  return "later";
}

export function formatTime(date: Date) {
  return timeFormat.format(date);
}

export function formatDay(date: Date) {
  return dayFormat.format(date);
}

/** "noch 35 Min." / "noch 1 Std. 5 Min." */
export function formatRemaining(until: Date, now: Date) {
  const minutes = Math.max(
    1,
    Math.round((until.getTime() - now.getTime()) / 60_000),
  );
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `noch ${rest} Min.`;
  return rest === 0 ? `noch ${hours} Std.` : `noch ${hours} Std. ${rest} Min.`;
}

/** Value for `<input type="datetime-local">` in the browser's time zone. */
export function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
