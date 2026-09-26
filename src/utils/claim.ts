/**
 * The two colors of the claim pattern shown on the pad (see
 * services/claim.ts). Shared with the client, which lists them by name so the
 * pattern doesn't rely on color alone. They also differ clearly in brightness.
 */
export const CLAIM_COLORS = [
  { hex: "#22E4FF", name: "Cyan" },
  { hex: "#FF3DDB", name: "Magenta" },
] as const;

/** How long a claim pattern stays on the pad. */
export const CLAIM_PATTERN_TTL_MS = 60_000;
