import { loadOrNotFound } from "wbl/app/admin/_components/load";
import { ControllerDetail } from "wbl/app/admin/controller/_components/ControllerDetail";
import { api } from "wbl/trpc/server";

export const dynamic = "force-dynamic";

export default async function AdminControllerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const controller = await loadOrNotFound(() =>
    api.admin.controllers.get({ id }),
  );
  return <ControllerDetail initial={controller} />;
}
