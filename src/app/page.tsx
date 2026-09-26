import Link from "next/link";
import { type ReactNode, Suspense } from "react";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { FeatureTiles } from "wbl/app/_components/home/FeatureTiles";
import { LivePadsTeaser } from "wbl/app/_components/home/LivePadsTeaser";
import { NextRound } from "wbl/app/_components/home/NextRound";
import { PixelDivider } from "wbl/app/_components/home/PixelDivider";
import { SectionLink } from "wbl/app/_components/home/SectionLink";
import { PixelFrame } from "wbl/app/_components/PixelFrame";
import { PixelMarquee } from "wbl/app/_components/PixelMarquee";
import { buttonClasses } from "wbl/app/_components/ui/button";
import { PageShell } from "wbl/app/_components/ui/page-shell";
import { Section } from "wbl/app/_components/ui/section";
import { SkeletonGroup } from "wbl/app/_components/ui/skeleton";
import {
  CityStats,
  CityStatsSkeleton,
} from "wbl/app/bestenliste/_components/CityStats";
import {
  Podium,
  PodiumSkeleton,
} from "wbl/app/bestenliste/_components/LeaderboardBoard";
import { PadRowsSkeleton } from "wbl/app/live/_components/pad-summary";
import { PlayRequestCardSkeleton } from "wbl/app/mitspielen/_components/PlayRequestCard";
import { api, HydrateClient } from "wbl/trpc/server";

// Live data per request, see the note in mitspielen/page.tsx.
export const dynamic = "force-dynamic";

const NEON = [
  "var(--color-neon-cyan)",
  "var(--color-neon-magenta)",
  "var(--color-neon-yellow)",
  "var(--color-neon-green)",
];

/** Hero and tiles show right away, each data section streams in behind its skeleton. */
export default function Home() {
  return (
    <PageShell>
      {/* Desktop: marquee left, claim and call to action right. */}
      <section
        aria-labelledby="home-title"
        className="flex flex-col items-center gap-5 text-center md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-10 md:py-6 md:text-left"
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
        <div className="flex w-full flex-col items-center gap-5 md:items-start md:gap-6">
          <h1
            id="home-title"
            className="text-xl leading-snug md:text-3xl lg:text-4xl"
          >
            Spiel mit ganz Münster – direkt im Park.
          </h1>
          <p className="hidden text-white/60 md:block">
            Leuchtende Spielfelder mitten in der Stadt: einfach draufstellen und
            losspielen, allein oder mit anderen.
          </p>
          <Link
            href="/live"
            className={`${buttonClasses("solid", "cyan")} w-full md:w-auto`}
          >
            <DynamicIcon name="Map" size={20} />
            Spielfeld finden
          </Link>
        </div>
      </section>

      <PixelDivider />

      <Suspense fallback={<CityStatsSkeleton />}>
        <HomeStats />
      </Suspense>

      {/* One column on mobile, side by side on desktop. */}
      <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:items-start md:gap-x-8 lg:grid-cols-3">
        <Section
          title="Jetzt live"
          icon="Flash"
          action={<SectionLink href="/live" label="Karte" />}
        >
          <Suspense fallback={<PadRowsSkeleton />}>
            <LivePads />
          </Suspense>
        </Section>

        <Section
          title="Mitspielen"
          icon="BubbleSearch"
          tone="magenta"
          action={<SectionLink href="/mitspielen" label="Alle" />}
        >
          <Suspense
            fallback={
              <SkeletonGroup label="Runde wird geladen">
                <PlayRequestCardSkeleton />
              </SkeletonGroup>
            }
          >
            <NextOpenRound />
          </Suspense>
        </Section>

        <Suspense
          fallback={
            <TopOfWeekSection>
              <SkeletonGroup label="Bestenliste wird geladen">
                <PodiumSkeleton />
              </SkeletonGroup>
            </TopOfWeekSection>
          }
        >
          <TopOfWeek />
        </Suspense>
      </div>

      <PixelDivider seed={3} />

      <section aria-label="Entdecken">
        <FeatureTiles />
      </section>
    </PageShell>
  );
}

async function HomeStats() {
  return <CityStats stats={await api.leaderboard.stats()} />;
}

async function LivePads() {
  await api.live.pads.prefetch();
  return (
    <HydrateClient>
      <LivePadsTeaser />
    </HydrateClient>
  );
}

async function NextOpenRound() {
  await api.lookingToPlay.list.prefetch({});
  return (
    <HydrateClient>
      <NextRound />
    </HydrateClient>
  );
}

/** Podium of the week; hidden while nobody has played yet. */
async function TopOfWeek() {
  const leaderboard = await api.leaderboard.list({ period: "week" });
  const podium = leaderboard.entries.slice(0, 3);
  if (!leaderboard.game || podium.length === 0) return null;

  return (
    <TopOfWeekSection gameName={leaderboard.game.name}>
      <Podium
        entries={podium}
        scoreKind={leaderboard.game.scoreKind}
        viewerId={leaderboard.viewerId}
      />
    </TopOfWeekSection>
  );
}

function TopOfWeekSection({
  gameName,
  children,
}: {
  gameName?: string;
  children: ReactNode;
}) {
  return (
    <Section
      title="Top der Woche"
      icon="LeaderboardStar"
      description={gameName}
      action={<SectionLink href="/bestenliste" label="Alle" />}
      className="md:col-span-2 lg:col-span-1"
    >
      {children}
    </Section>
  );
}
