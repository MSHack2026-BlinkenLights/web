import { loadOrNotFound } from "wbl/app/admin/_components/load";
import { PlayRequestDetail } from "wbl/app/admin/anfragen/_components/PlayRequestDetail";
import { api, HydrateClient } from "wbl/trpc/server";

export const dynamic = "force-dynamic";

export default async function AdminPlayRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [request] = await Promise.all([
    loadOrNotFound(() => api.admin.playRequests.get({ id })),
    api.admin.options.prefetch(),
    api.admin.users.options.prefetch(),
  ]);
  return (
    <HydrateClient>
      <PlayRequestDetail initial={request} />
    </HydrateClient>
  );
}
