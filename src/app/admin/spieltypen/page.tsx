import { GameTypeList } from "wbl/app/admin/spieltypen/_components/GameTypeList";
import { api, HydrateClient } from "wbl/trpc/server";

export const dynamic = "force-dynamic";

export default async function AdminGameTypesPage() {
  await api.admin.gameTypes.list.prefetch();
  return (
    <HydrateClient>
      <GameTypeList />
    </HydrateClient>
  );
}
