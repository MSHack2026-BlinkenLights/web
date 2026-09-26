import Link from "next/link";

import { PixelGrid } from "wbl/app/_components/PixelGrid";
import { bitmapFromRows } from "wbl/utils/pixel-font";

interface Tile {
  label: string;
  href: string;
  color: string;
  icon: readonly string[];
  /** The route doesn't exist yet: shown greyed out, not linked. */
  soon?: boolean;
}

// 5×5 pixel icons: `#` lit.
const tiles: Tile[] = [
  {
    label: "Live-Karte",
    href: "/live",
    color: "var(--color-neon-green)",
    icon: [".###.", "##.##", "#####", ".###.", "..#.."],
  },
  {
    label: "Mitspielen",
    href: "/mitspielen",
    color: "var(--color-neon-magenta)",
    icon: [".#.#.", ".#.#.", ".....", "##.##", "##.##"],
  },
  {
    label: "Bestenliste",
    href: "/bestenliste",
    color: "var(--color-neon-yellow)",
    icon: ["#####", "#####", ".###.", "..#..", ".###."],
  },
  {
    label: "Pixelart",
    href: "/pixelart",
    color: "var(--color-neon-cyan)",
    icon: [".#.#.", "#####", "#####", ".###.", "..#.."],
    soon: true,
  },
];

const tileClass =
  "flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 p-4 text-center text-sm font-semibold";

/** Quick links as tiles with a pixel icon each. */
export function FeatureTiles() {
  return (
    <ul className="grid grid-cols-2 gap-3">
      {tiles.map((tile) => {
        const content = (
          <>
            <span aria-hidden className="w-12">
              <PixelGrid {...bitmapFromRows(tile.icon, tile.color)} label="" />
            </span>
            <span>
              {tile.label}
              {tile.soon && (
                <span className="block text-xs font-normal text-white/50">
                  Bald verfügbar
                </span>
              )}
            </span>
          </>
        );

        return (
          <li key={tile.href}>
            {tile.soon ? (
              <div className={`${tileClass} opacity-50 grayscale`}>
                {content}
              </div>
            ) : (
              <Link
                href={tile.href}
                className={`${tileClass} focus-visible:outline-neon-cyan bg-surface transition-colors hover:bg-white/5 focus-visible:outline-2`}
              >
                {content}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
