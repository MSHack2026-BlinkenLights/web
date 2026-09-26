const COLOR_PATTERN =
  /^\s*(#[0-9a-f]{6}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))\s*$/i;

/**
 * The color a `change` message sets.
 *
 * @param payload - The raw message text.
 * @returns The color as CSS, or `null` if the message is no `change` with a valid color.
 */
export function changeColor(payload: string): string | null {
  let message: unknown;
  try {
    message = JSON.parse(payload);
  } catch {
    return null;
  }
  if (typeof message !== "object" || message === null) return null;
  const { msgType, color } = message as Record<string, unknown>;
  if (msgType !== "change" || typeof color !== "string") return null;
  return COLOR_PATTERN.exec(color)?.[1] ?? null;
}
