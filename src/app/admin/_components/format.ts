import { formatDay, formatTime } from "wbl/utils/time";

/**
 * Date and time for admin lists, e.g. "Sa., 26. Sept., 14:05".
 *
 * @param date - The date, or nothing.
 * @returns The formatted text, or "–" without a date.
 */
export function formatDateTime(date: Date | null | undefined) {
  return date ? `${formatDay(date)}, ${formatTime(date)}` : "–";
}

/**
 * Parses an optional number input.
 *
 * @param value - The input's value.
 * @returns The number, `null` for an empty input.
 */
export function parseOptionalNumber(value: string) {
  return value.trim() === "" ? null : Number(value);
}

/**
 * Parses a `datetime-local` input in the browser's time zone.
 *
 * @param value - The input's value.
 * @returns The date, `null` for an empty input.
 */
export function parseLocalDateTime(value: string) {
  return value === "" ? null : new Date(value);
}

/**
 * Readable message of a failed tRPC call.
 *
 * @param error - The error of a query or mutation.
 * @returns The server's message, a generic hint for malformed input, or `null` without an error.
 */
export function errorText(
  error: { message: string; data?: { zodError?: unknown } | null } | null,
) {
  if (!error) return null;
  return error.data?.zodError ? "Eingabe ungültig." : error.message;
}
