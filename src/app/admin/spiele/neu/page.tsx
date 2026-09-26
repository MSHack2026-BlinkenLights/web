import { NewGame } from "wbl/app/admin/spiele/_components/NewGame";
import { api, HydrateClient } from "wbl/trpc/server";

export const dynamic = "force-dynamic";

export default async function AdminNewGamePage() {
  await api.admin.options.prefetch();
  return (
    <HydrateClient>
      <NewGame />
    </HydrateClient>
  );
}
