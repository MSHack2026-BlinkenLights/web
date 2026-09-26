import { PixelGrid } from "wbl/app/_components/PixelGrid";

const COLUMNS = 24;
const ACCENTS = [
  "var(--color-neon-cyan)",
  "var(--color-neon-magenta)",
  "var(--color-neon-yellow)",
  "var(--color-neon-green)",
];

/** A single row of LEDs as a section separator, a few of them lit. */
export function PixelDivider({ seed = 0 }: { seed?: number }) {
  const pixels = Array.from({ length: COLUMNS }, (_, x) =>
    (x * 7 + seed * 5) % 9 === 0
      ? (ACCENTS[(x + seed) % ACCENTS.length] ?? null)
      : null,
  );
  return (
    <div aria-hidden className="py-2">
      <PixelGrid
        width={COLUMNS}
        height={1}
        pixels={pixels}
        label=""
        className="opacity-80"
      />
    </div>
  );
}
