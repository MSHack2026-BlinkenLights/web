import { type Metadata } from "next";

import { CityStats } from "wbl/app/bestenliste/_components/CityStats";
import { LeaderboardBoard } from "wbl/app/bestenliste/_components/LeaderboardBoard";
import { PageShell } from "wbl/app/_components/ui/page-shell";
import { api, HydrateClient } from "wbl/trpc/server";

export const metadata: Metadata = {
  title: "Bestenliste",
  description:
    "Highscores und Rekorde von den Blinkin-Lights-Spielfeldern in Münster.",
};

// Live data per request, see the note in mitspielen/page.tsx.
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  // The input must match the board's initial query, or it loads again on the client.
  const [stats] = await Promise.all([
    api.leaderboard.stats(),
    api.leaderboard.options.prefetch(),
    api.leaderboard.list.prefetch({ period: "week" }),
  ]);

  return (
    <HydrateClient>
      <PageShell
        floatingAction
        title="Bestenliste"
        description="Wer hat die meisten Punkte in Münster? Spielen kannst du immer ohne Konto. Mit Anmeldung landen deine Scores hier."
      >
        <CityStats stats={stats} />

        <LeaderboardBoard />
      </PageShell>
    </HydrateClient>
  );
}
