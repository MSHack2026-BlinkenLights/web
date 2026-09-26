import { loadOrNotFound } from "wbl/app/_components/load";
import { ControllerPlay } from "wbl/app/admin/controller/_components/ControllerPlay";
import { api } from "wbl/trpc/server";

export const dynamic = "force-dynamic";

export default async function AdminControllerPlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const controller = await loadOrNotFound(() =>
    api.admin.controllers.get({ id }),
  );
  return <ControllerPlay controller={controller} />;
}
