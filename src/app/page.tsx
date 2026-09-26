import Link from "next/link";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { FeatureTiles } from "wbl/app/_components/home/FeatureTiles";
import { LivePadsTeaser } from "wbl/app/_components/home/LivePadsTeaser";
import { NextRound } from "wbl/app/_components/home/NextRound";
import { PixelDivider } from "wbl/app/_components/home/PixelDivider";
import { SectionLink } from "wbl/app/_components/home/SectionLink";
import { PixelFrame } from "wbl/app/_components/PixelFrame";
import { PixelMarquee } from "wbl/app/_components/PixelMarquee";
import { buttonClasses } from "wbl/app/_components/ui/button";
import { Section } from "wbl/app/_components/ui/section";
import { CityStats } from "wbl/app/bestenliste/_components/CityStats";
import { Podium } from "wbl/app/bestenliste/_components/LeaderboardBoard";
import { api, HydrateClient } from "wbl/trpc/server";

// Live data per request, see the note in mitspielen/page.tsx.
export const dynamic = "force-dynamic";

const NEON = [
  "var(--color-neon-cyan)",
  "var(--color-neon-magenta)",
  "var(--color-neon-yellow)",
  "var(--color-neon-green)",
];

export default async function Home() {
  const [stats, leaderboard] = await Promise.all([
    api.leaderboard.stats(),
    api.leaderboard.list({ period: "week" }),
    api.live.pads.prefetch(),
    api.lookingToPlay.list.prefetch({}),
  ]);
  const podium = leaderboard.entries.slice(0, 3);

  return (
    <HydrateClient>
      <main className="bg-surface mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 pt-6 pb-28 text-white md:pb-12">
        <section
          aria-labelledby="home-title"
          className="flex flex-col items-center gap-5 text-center"
        >
          <PixelFrame color="var(--color-neon-cyan)" className="w-full">
            <div className="bg-surface p-3">
              <PixelMarquee
                text="Blinkin Lights Münster"
                staticText="Hallo!"
                width={24}
                colors={NEON}
              />
            </div>
          </PixelFrame>
          <h1 id="home-title" className="text-xl leading-snug">
            Spiel mit ganz Münster – direkt auf der Straße.
          </h1>
          <Link
            href="/live"
            className={`${buttonClasses("solid", "cyan")} w-full`}
          >
            <DynamicIcon name="Map" size={20} />
            Spielfeld finden
          </Link>
        </section>

        <PixelDivider />

        <Section
          title="Jetzt live"
          icon="Flash"
          action={<SectionLink href="/live" label="Karte" />}
        >
          <LivePadsTeaser />
        </Section>

        <Section
          title="Mitspielen"
          icon="BubbleSearch"
          tone="magenta"
          action={<SectionLink href="/mitspielen" label="Alle" />}
        >
          <NextRound />
        </Section>

        <CityStats stats={stats} />

        {leaderboard.game && podium.length > 0 && (
          <Section
            title="Top der Woche"
            icon="LeaderboardStar"
            description={leaderboard.game.name}
            action={<SectionLink href="/bestenliste" label="Alle" />}
          >
            <Podium
              entries={podium}
              scoreKind={leaderboard.game.scoreKind}
              viewerId={leaderboard.viewerId}
            />
          </Section>
        )}

        <PixelDivider seed={3} />

        <section aria-label="Entdecken">
          <FeatureTiles />
        </section>
      </main>
    </HydrateClient>
  );
}
