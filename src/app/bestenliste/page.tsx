import { type Metadata } from "next";

import { CityStats } from "wbl/app/bestenliste/_components/CityStats";
import { LeaderboardBoard } from "wbl/app/bestenliste/_components/LeaderboardBoard";
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
      <main className="bg-surface mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 pt-6 pb-40 text-white md:pb-28">
        <header>
          <h1 className="text-2xl font-bold">Bestenliste</h1>
          <p className="mt-1 text-sm text-white/60">
            Wer hat die meisten Punkte in Münster? Spielen kannst du immer ohne
            Konto. Mit Anmeldung landen deine Scores hier.
          </p>
        </header>

        <CityStats stats={stats} />

        <LeaderboardBoard />
      </main>
    </HydrateClient>
  );
}
