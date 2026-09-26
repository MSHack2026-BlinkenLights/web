"use client";

import { EmptyState } from "wbl/app/_components/ui/states";
import { formatDateTime } from "wbl/app/admin/_components/format";
import {
  AdminHeader,
  AdminList,
  AdminRow,
  Badge,
} from "wbl/app/admin/_components/ui";
import { api } from "wbl/trpc/react";

/** All play requests including past ones, linked to their detail pages. */
export function PlayRequestList() {
  const [playRequests] = api.admin.playRequests.list.useSuspenseQuery();
  const now = new Date();

  return (
    <>
      <AdminHeader
        title="Mitspiel-Anfragen"
        description="Alle Anfragen aus „Mitspielen“, auch vergangene."
      />
      {playRequests.length === 0 ? (
        <EmptyState icon="BubbleSearch">Noch keine Anfragen.</EmptyState>
      ) : (
        <AdminList>
          {playRequests.map((request) => (
            <AdminRow
              key={request.id}
              href={`/admin/anfragen/${request.id}`}
              title={`${request.gameType.name} · ${request.controller.name}`}
              badge={
                request.endsAt < now ? (
                  <Badge>vorbei</Badge>
                ) : request.startsAt <= now ? (
                  <Badge tone="green">läuft</Badge>
                ) : null
              }
              subtitle={`${formatDateTime(request.startsAt)} · von ${request.host.name}`}
              meta={`${request._count.participants}/${request.openSlots} Plätze`}
            />
          ))}
        </AdminList>
      )}
    </>
  );
}
