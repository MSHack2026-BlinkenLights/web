import { UserList } from "wbl/app/admin/nutzer/_components/UserList";
import { api, HydrateClient } from "wbl/trpc/server";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await api.admin.users.list.prefetch();
  return (
    <HydrateClient>
      <UserList />
    </HydrateClient>
  );
}
