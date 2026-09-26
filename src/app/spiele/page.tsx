import { type Metadata } from "next";
import Link from "next/link";
import { type CSSProperties } from "react";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { PixelGrid } from "wbl/app/_components/PixelGrid";
import { PageShell } from "wbl/app/_components/ui/page-shell";
import { bitmapFromRows } from "wbl/utils/pixel-font";

export const metadata: Metadata = {
  title: "Spiele",
  description: "Alle Spiele und Werkzeuge von Blinkin Lights im Überblick.",
};

interface GameCard {
  title: string;
  description: string;
  color: string;
  /** 5×5 pixel preview: `#` lit. */
  preview: readonly string[];
  /** Short facts shown as chips, e.g. where and with how many people. */
  facts: { icon: string; label: string }[];
  /** Missing while the game isn't available yet: shown greyed out. */
  action?: { label: string; href: string };
}

const games: GameCard[] = [
  {
    title: "Tic Tac Toe",
    description:
      "Der Klassiker zu zweit – direkt auf dem Spielfeld. Stell dich auf ein Feld, um dein Zeichen zu setzen.",
    color: "var(--color-neon-cyan)",
    preview: ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
    facts: [
      { icon: "Group", label: "2 Spieler:innen" },
      { icon: "MapPin", label: "Auf dem Spielfeld" },
    ],
    action: { label: "Spielfeld finden", href: "/live" },
  },
  {
    title: "Rhythm Lab",
    description:
      "Folge den Lichtern und triff den Beat. Vier Richtungen, eine Musik – wie lange hältst du den Rhythmus?",
    color: "var(--color-neon-magenta)",
    preview: ["..#..", "..##.", "..#.#", "###..", "##..."],
    facts: [
      { icon: "User", label: "1 Spieler:in" },
      { icon: "Flask", label: "Experimentell" },
    ],
    action: { label: "Ausprobieren", href: "/rhythm-lab" },
  },
  {
    title: "Pixelart-Editor",
    description:
      "Zeichne eigene Bilder und Animationen und schick sie ans Spielfeld.",
    color: "var(--color-neon-yellow)",
    preview: [".#.#.", "#####", "#####", ".###.", "..#.."],
    facts: [{ icon: "Palette", label: "Kreativ" }],
  },
  {
    title: "Game-Studio",
    description:
      "Entwickle dein eigenes Spiel für die Blinkin Lights Pads und teile es mit ganz Münster.",
    color: "var(--color-neon-green)",
    preview: [".....", "#...#", ".#.#.", "#...#", "....."],
    facts: [{ icon: "Code", label: "Für Tüftler:innen" }],
  },
];

/** Overview of all games and tools; upcoming ones are greyed out. */
export default function GamesPage() {
  return (
    <PageShell
      title="Spiele"
      description="Was du auf den Blinkin Lights spielen und gestalten kannst."
    >
      <ul className="grid gap-4 md:grid-cols-2">
        {games.map((game) => {
          const soon = !game.action;
          return (
            <li
              key={game.title}
              style={{ "--card-color": game.color } as CSSProperties}
              className={`flex flex-col gap-4 rounded-2xl border border-white/10 p-4 md:p-5 ${soon ? "opacity-50 grayscale" : ""}`}
            >
              <div className="flex items-start gap-4">
                <span aria-hidden className="w-14 shrink-0">
                  <PixelGrid
                    {...bitmapFromRows(game.preview, game.color)}
                    label=""
                  />
                </span>
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-semibold">
                    {game.title}
                    {soon && (
                      <span className="ml-2 align-middle text-xs font-normal text-white/60">
                        Bald verfügbar
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-white/60">{game.description}</p>
                </div>
              </div>

              <ul className="flex flex-wrap gap-2">
                {game.facts.map((fact) => (
                  <li
                    key={fact.label}
                    className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs text-white/70"
                  >
                    <DynamicIcon name={fact.icon} size={14} />
                    {fact.label}
                  </li>
                ))}
              </ul>

              {game.action && (
                <Link
                  href={game.action.href}
                  className="focus-visible:outline-neon-cyan mt-auto flex min-h-12 items-center justify-center gap-2 rounded-full border border-(--card-color) text-sm font-semibold transition hover:bg-white/5 hover:shadow-[0_0_1.25rem_-0.25rem_var(--card-color)] focus-visible:outline-2"
                >
                  {game.action.label}
                  <DynamicIcon name="ArrowRight" size={16} />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </PageShell>
  );
}
