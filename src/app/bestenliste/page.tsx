import { type Metadata } from "next";
import { Suspense } from "react";

import {
  CityStats,
  CityStatsSkeleton,
} from "wbl/app/bestenliste/_components/CityStats";
import {
  LeaderboardBoard,
  LeaderboardBoardSkeleton,
} from "wbl/app/bestenliste/_components/LeaderboardBoard";
import { PageShell } from "wbl/app/_components/ui/page-shell";
import { api, HydrateClient } from "wbl/trpc/server";

export const metadata: Metadata = {
  title: "Bestenliste",
  description:
    "Highscores und Rekorde von den Blinkin-Lights-Spielfeldern in Münster.",
};

// Live data per request, see the note in mitspielen/page.tsx.
export const dynamic = "force-dynamic";

export default function LeaderboardPage() {
  return (
    <PageShell
      floatingAction
      title="Bestenliste"
      description="Wer hat die meisten Punkte in Münster? Spielen kannst du immer ohne Konto. Mit Anmeldung landen deine Scores hier."
    >
      <Suspense fallback={<CityStatsSkeleton />}>
        <Stats />
      </Suspense>

      <Suspense fallback={<LeaderboardBoardSkeleton />}>
        <Board />
      </Suspense>
    </PageShell>
  );
}

async function Stats() {
  return <CityStats stats={await api.leaderboard.stats()} />;
}

async function Board() {
  // The input must match the board's initial query, or it loads again on the client.
  await Promise.all([
    api.leaderboard.options.prefetch(),
    api.leaderboard.list.prefetch({ period: "week" }),
  ]);

  return (
    <HydrateClient>
      <LeaderboardBoard />
    </HydrateClient>
  );
}
