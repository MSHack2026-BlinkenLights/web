import { loadOrNotFound } from "wbl/app/admin/_components/load";
import { UserDetail } from "wbl/app/admin/nutzer/_components/UserDetail";
import { api } from "wbl/trpc/server";

export const dynamic = "force-dynamic";

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await loadOrNotFound(() =>
    api.admin.users.get({ id: decodeURIComponent(id) }),
  );
  return <UserDetail initial={user} />;
}
