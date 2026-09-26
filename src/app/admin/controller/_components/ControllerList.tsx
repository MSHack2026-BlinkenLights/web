"use client";

import Link from "next/link";

import { buttonClasses } from "wbl/app/_components/ui/button";
import { EmptyState } from "wbl/app/_components/ui/states";
import {
  AdminHeader,
  AdminList,
  AdminRow,
  Badge,
} from "wbl/app/admin/_components/ui";
import { api } from "wbl/trpc/react";

/** All controllers, linked to their detail pages. */
export function ControllerList() {
  const [controllers] = api.admin.controllers.list.useSuspenseQuery();

  return (
    <>
      <AdminHeader
        title="Controller"
        description="Die Spielfelder in der Stadt, erkannt an ihrer Hardware-ID."
        action={
          <Link
            href="/admin/controller/neu"
            className={buttonClasses("solid", "cyan")}
          >
            Neuer Controller
          </Link>
        }
      />
      {controllers.length === 0 ? (
        <EmptyState icon="Cpu">Noch keine Controller.</EmptyState>
      ) : (
        <AdminList>
          {controllers.map((controller) => (
            <AdminRow
              key={controller.id}
              href={`/admin/controller/${controller.id}`}
              title={controller.name}
              badge={<Badge tone="cyan">#{controller.hardwareId}</Badge>}
              subtitle={controller.location}
              meta={
                <>
                  {controller.width > 0
                    ? `${controller.width}×${controller.height}`
                    : "Größe unbekannt"}
                  <br />
                  {controller._count.games} Spiele
                </>
              }
            />
          ))}
        </AdminList>
      )}
    </>
  );
}
