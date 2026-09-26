import { loadOrNotFound } from "wbl/app/_components/load";
import { GameDetail } from "wbl/app/admin/spiele/_components/GameDetail";
import { api, HydrateClient } from "wbl/trpc/server";

export const dynamic = "force-dynamic";

export default async function AdminGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [game] = await Promise.all([
    loadOrNotFound(() => api.admin.games.get({ id })),
    api.admin.options.prefetch(),
  ]);
  return (
    <HydrateClient>
      <GameDetail initial={game} />
    </HydrateClient>
  );
}
