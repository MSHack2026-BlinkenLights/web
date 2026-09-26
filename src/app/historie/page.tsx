import { type Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { cellsToPixels } from "wbl/app/_components/claim/pixels";
import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { PixelGrid } from "wbl/app/_components/PixelGrid";
import { buttonClasses } from "wbl/app/_components/ui/button";
import { PageShell } from "wbl/app/_components/ui/page-shell";
import { EmptyState } from "wbl/app/_components/ui/states";
import { getSession } from "wbl/server/better-auth/server";
import { api } from "wbl/trpc/server";

import { GameCard, GameCardsSkeleton } from "./_components/GameCard";
import { LocalHistory } from "./_components/LocalHistory";

export const metadata: Metadata = {
  title: "Meine Spiele",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const session = await getSession();

  return (
    <PageShell
      width="medium"
      title="Meine Spiele"
      description={
        session
          ? "Alle Runden, die du gesichert hast."
          : "Runden, die du auf diesem Gerät gesichert hast."
      }
    >
      <Link href="/sichern" className={buttonClasses()}>
        <DynamicIcon name="ShieldCheck" size={20} />
        Spiel sichern
      </Link>

      {session ? (
        <Suspense fallback={<GameCardsSkeleton />}>
          <AccountHistory />
        </Suspense>
      ) : (
        <GuestHistory />
      )}
    </PageShell>
  );
}

async function AccountHistory() {
  const games = await api.claim.history();
  if (games.length === 0) {
    return (
      <EmptyState icon="Archive">
        Noch keine Spiele gesichert. Nach deiner nächsten Runde geht das über
        „Spiel sichern“.
      </EmptyState>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {games.map((game) => (
        <GameCard
          key={game.id}
          gameId={game.id}
          gameName={game.gameType.name}
          padName={game.controller.name}
          endedAt={game.endedAt ?? game.startedAt}
          preview={
            <PixelGrid
              width={game.controller.width}
              height={game.controller.height}
              pixels={cellsToPixels(game.controller, game.data)}
              label={`Endstand von ${game.gameType.name}`}
            />
          }
        />
      ))}
    </ul>
  );
}

function GuestHistory() {
  return (
    <>
      <LocalHistory />
      <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
        Diese Liste gibt es nur in diesem Browser.{" "}
        <Link
          href="/anmelden?weiter=/historie"
          className="text-neon-cyan underline underline-offset-2"
        >
          Melde dich an
        </Link>
        , damit deine gesicherten Spiele überall für dich da sind.
      </p>
    </>
  );
}
