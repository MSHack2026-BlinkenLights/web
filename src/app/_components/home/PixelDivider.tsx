import { PixelGrid } from "wbl/app/_components/PixelGrid";

const COLUMNS = 24;
/** Wider screens get more, not bigger LEDs. */
const DESKTOP_COLUMNS = 64;
const ACCENTS = [
  "var(--color-neon-cyan)",
  "var(--color-neon-magenta)",
  "var(--color-neon-yellow)",
  "var(--color-neon-green)",
];

function litPixels(columns: number, seed: number) {
  return Array.from({ length: columns }, (_, x) =>
    (x * 7 + seed * 5) % 9 === 0
      ? (ACCENTS[(x + seed) % ACCENTS.length] ?? null)
      : null,
  );
}

/** A single row of LEDs as a section separator, a few of them lit. */
export function PixelDivider({ seed = 0 }: { seed?: number }) {
  return (
    <div aria-hidden className="py-2">
      {/* Wrapped: `hidden` on the grid itself would clash with its `grid`. */}
      <div className="md:hidden">
        <PixelGrid
          width={COLUMNS}
          height={1}
          pixels={litPixels(COLUMNS, seed)}
          label=""
          className="opacity-80"
        />
      </div>
      <div className="hidden md:block">
        <PixelGrid
          width={DESKTOP_COLUMNS}
          height={1}
          pixels={litPixels(DESKTOP_COLUMNS, seed)}
          label=""
          className="opacity-80"
        />
      </div>
    </div>
  );
}
