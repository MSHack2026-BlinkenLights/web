import { type ReactNode } from "react";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { Skeleton, SkeletonGroup } from "wbl/app/_components/ui/skeleton";
import { type RouterOutputs } from "wbl/trpc/react";

type Stats = RouterOutputs["leaderboard"]["stats"];

/** Activity across all pads, including rounds played without an account. */
export function CityStats({ stats }: { stats: Stats }) {
  const tiles = [
    {
      icon: "Flash",
      label: "Runden heute",
      value: stats.roundsToday.toLocaleString("de-DE"),
      detail: `${stats.roundsThisWeek.toLocaleString("de-DE")} in 7 Tagen`,
    },
    {
      icon: "Gamepad",
      label: "Beliebtestes Spiel",
      value: stats.topGame?.name ?? "–",
      detail: stats.topGame
        ? `${stats.topGame.rounds} ${stats.topGame.rounds === 1 ? "Runde" : "Runden"} in 7 Tagen`
        : "Noch keine Runden",
    },
    {
      icon: "MapPin",
      label: "Aktivster Ort",
      value: stats.topController?.name ?? "–",
      detail: stats.topController
        ? `${stats.topController.rounds} ${stats.topController.rounds === 1 ? "Runde" : "Runden"} in 7 Tagen`
        : "Noch keine Runden",
    },
  ];

  return (
    <CityStatsFrame>
      <ul className={listClass}>
        {tiles.map((tile) => (
          <li key={tile.label} className={tileClass}>
            <span className="flex items-center gap-1.5 text-xs text-white/60">
              <DynamicIcon name={tile.icon} size={16} />
              {tile.label}
            </span>
            <span className="text-lg leading-tight font-bold break-words md:text-xl">
              {tile.value}
            </span>
            <span className="text-xs text-white/50">{tile.detail}</span>
          </li>
        ))}
      </ul>
    </CityStatsFrame>
  );
}

/** Placeholder for {@link CityStats} with the same tile sizes. */
export function CityStatsSkeleton() {
  return (
    <CityStatsFrame>
      <SkeletonGroup label="Statistik wird geladen" className={listClass}>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className={tileClass}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="my-0.5 h-6 w-20 md:h-7" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </SkeletonGroup>
    </CityStatsFrame>
  );
}

// Scrolls sideways on narrow screens; bleeds to the screen edge.
// Desktop: three equal columns.
const listClass =
  "-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0";
const tileClass =
  "flex w-40 shrink-0 snap-start flex-col gap-1 rounded-2xl border border-white/10 p-3 md:w-auto md:p-4";

function CityStatsFrame({ children }: { children: ReactNode }) {
  return (
    <section aria-labelledby="city-stats" className="flex flex-col gap-3">
      <h2
        id="city-stats"
        className="text-sm font-semibold tracking-wide text-white/60 uppercase"
      >
        Münster spielt
      </h2>
      {children}
    </section>
  );
}
