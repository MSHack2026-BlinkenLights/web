import { loadOrNotFound } from "wbl/app/admin/_components/load";
import { GameTypeDetail } from "wbl/app/admin/spieltypen/_components/GameTypeDetail";
import { api } from "wbl/trpc/server";

export const dynamic = "force-dynamic";

export default async function AdminGameTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gameType = await loadOrNotFound(() => api.admin.gameTypes.get({ id }));
  return <GameTypeDetail initial={gameType} />;
}
