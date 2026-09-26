"use client";

import Link from "next/link";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { EmptyState } from "wbl/app/_components/ui/states";
import { PadSummary } from "wbl/app/live/_components/pad-summary";
import { type Pad } from "wbl/app/live/_components/pads";
import { api } from "wbl/trpc/react";

const MAX_PADS = 3;

/** Free seats first, then running games, free pads, offline last. */
function rank(pad: Pad) {
  if (pad.playRequests.some((request) => request.freeSlots > 0)) return 0;
  return { playing: 1, free: 2, offline: 3 }[pad.status];
}

/** The most interesting pads right now, each linking to its details on the map. */
export function LivePadsTeaser() {
  const [{ pads }] = api.live.pads.useSuspenseQuery(undefined, {
    refetchInterval: 30_000,
  });
  const shown = [...pads].sort((a, b) => rank(a) - rank(b)).slice(0, MAX_PADS);

  if (shown.length === 0) {
    return (
      <EmptyState icon="MapPin">
        Noch stehen keine Spielfelder auf der Karte. Bald geht’s los!
      </EmptyState>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {shown.map((pad) => (
        <li key={pad.id}>
          <Link
            href={`/live?pad=${pad.id}`}
            className="bg-surface focus-visible:outline-neon-cyan flex min-h-16 items-center gap-3 rounded-xl border border-white/10 px-3 py-2 transition-colors hover:bg-white/5 focus-visible:outline-2"
          >
            <PadSummary pad={pad} />
            <DynamicIcon
              name="NavArrowRight"
              size={20}
              className="shrink-0 text-white/40"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
