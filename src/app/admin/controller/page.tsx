import { ControllerList } from "wbl/app/admin/controller/_components/ControllerList";
import { api, HydrateClient } from "wbl/trpc/server";

export const dynamic = "force-dynamic";

export default async function AdminControllersPage() {
  await api.admin.controllers.list.prefetch();
  return (
    <HydrateClient>
      <ControllerList />
    </HydrateClient>
  );
}
