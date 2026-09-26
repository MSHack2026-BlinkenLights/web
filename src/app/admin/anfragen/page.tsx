import { PlayRequestList } from "wbl/app/admin/anfragen/_components/PlayRequestList";
import { api, HydrateClient } from "wbl/trpc/server";

export const dynamic = "force-dynamic";

export default async function AdminPlayRequestsPage() {
  await api.admin.playRequests.list.prefetch();
  return (
    <HydrateClient>
      <PlayRequestList />
    </HydrateClient>
  );
}
