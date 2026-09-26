import { type Metadata } from "next";
import Link from "next/link";

import { cellsToPixels } from "wbl/app/_components/claim/pixels";
import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { loadOrNotFound } from "wbl/app/_components/load";
import { PixelGrid } from "wbl/app/_components/PixelGrid";
import { PageShell } from "wbl/app/_components/ui/page-shell";
import { Section } from "wbl/app/_components/ui/section";
import { api } from "wbl/trpc/server";
import { formatDay, formatTime } from "wbl/utils/time";

import { ReplayDownloads } from "./_components/ReplayDownloads";

// Unlisted: anyone with the link may look, search engines shouldn't.
export const metadata: Metadata = {
  title: "Spiel",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function formatDuration(from: Date, to: Date) {
  const seconds = Math.max(
    0,
    Math.round((to.getTime() - from.getTime()) / 1000),
  );
  const minutes = Math.floor(seconds / 60);
  return minutes === 0
    ? `${seconds} Sek.`
    : `${minutes} Min. ${seconds % 60} Sek.`;
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = await loadOrNotFound(() => api.claim.game({ id }));
  const { controller } = game;

  const facts = [
    { label: "Spielfeld", value: controller.name },
    { label: "Ort", value: controller.location },
    {
      label: "Gespielt",
      value: `${formatDay(game.startedAt)}, ${formatTime(game.startedAt)} Uhr`,
    },
    { label: "Dauer", value: formatDuration(game.startedAt, game.endedAt) },
  ];

  return (
    <PageShell
      width="medium"
      title={game.gameType.name}
      description={
        game.claimedAt
          ? "Dieses Spiel steht in deiner Historie."
          : "Jede:r mit dem Link kann sich dieses Spiel ansehen."
      }
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="mx-auto w-full max-w-64 md:mx-0 md:w-56 md:shrink-0">
          <PixelGrid
            width={controller.width}
            height={controller.height}
            pixels={cellsToPixels(controller, game.data)}
            label={`Endstand von ${game.gameType.name}`}
          />
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-white/50">{fact.label}</dt>
              <dd className="mt-0.5 font-medium">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <Section
        title="Replay"
        icon="MediaVideo"
        description="Die Pixel in der Reihenfolge, in der sie gesetzt wurden. Wird in deinem Browser erstellt."
      >
        <ReplayDownloads game={game} />
      </Section>

      <Link
        href="/historie"
        className="flex min-h-12 items-center gap-2 self-start text-sm text-white/70 hover:text-white"
      >
        <DynamicIcon name="ArrowLeft" size={16} />
        Meine Spiele
      </Link>
    </PageShell>
  );
}
