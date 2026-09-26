import {
  type GameFilter,
  GameList,
} from "wbl/app/admin/spiele/_components/GameList";
import { api, HydrateClient } from "wbl/trpc/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function AdminGamesPage({
  searchParams,
}: {
  searchParams: Promise<{ controllerId?: string; gameTypeId?: string }>;
}) {
  const { controllerId, gameTypeId } = await searchParams;
  const filter: GameFilter = {
    controllerId:
      controllerId && UUID.test(controllerId) ? controllerId : undefined,
    gameTypeId: gameTypeId && UUID.test(gameTypeId) ? gameTypeId : undefined,
  };
  await Promise.all([
    api.admin.options.prefetch(),
    api.admin.games.list.prefetchInfinite(filter),
  ]);
  return (
    <HydrateClient>
      <GameList initialFilter={filter} />
    </HydrateClient>
  );
}
