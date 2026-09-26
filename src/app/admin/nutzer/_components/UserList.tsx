"use client";

import { EmptyState } from "wbl/app/_components/ui/states";
import { AdminHeader, AdminList, AdminRow } from "wbl/app/admin/_components/ui";
import { api } from "wbl/trpc/react";

/** All users, linked to their detail pages. */
export function UserList() {
  const [users] = api.admin.users.list.useSuspenseQuery();

  return (
    <>
      <AdminHeader title="Nutzer" description="Alle registrierten Konten." />
      {users.length === 0 ? (
        <EmptyState icon="Group">Noch keine Nutzer.</EmptyState>
      ) : (
        <AdminList>
          {users.map((user) => (
            <AdminRow
              key={user.id}
              href={`/admin/nutzer/${user.id}`}
              title={user.name}
              subtitle={user.email}
              meta={
                <>
                  {user._count.playRequests} Anfragen ·{" "}
                  {user._count.playParticipations} Teilnahmen
                  <br />
                  {user._count.sessions} Sessions · {user._count.passkeys}{" "}
                  Passkeys
                </>
              }
            />
          ))}
        </AdminList>
      )}
    </>
  );
}
