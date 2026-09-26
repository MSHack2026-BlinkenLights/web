"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Section } from "wbl/app/_components/ui/section";
import { DeleteButton } from "wbl/app/admin/_components/DeleteButton";
import { errorText, formatDateTime } from "wbl/app/admin/_components/format";
import {
  AdminHeader,
  AdminList,
  AdminRow,
  Badge,
} from "wbl/app/admin/_components/ui";
import { api, type RouterOutputs } from "wbl/trpc/react";
import { ControllerConsole } from "./ControllerConsole";
import { ControllerForm } from "./ControllerForm";
import { ControllerLive } from "./ControllerLive";

type ControllerDetails = RouterOutputs["admin"]["controllers"]["get"];

/**
 * Edit form, recent games and delete action of a controller.
 *
 * @param props - The controller as loaded on the server.
 * @returns The page content.
 */
export function ControllerDetail({ initial }: { initial: ControllerDetails }) {
  const router = useRouter();
  const utils = api.useUtils();
  const { data: controller } = api.admin.controllers.get.useQuery(
    { id: initial.id },
    { initialData: initial },
  );

  const update = api.admin.controllers.update.useMutation({
    onSuccess: () => utils.admin.invalidate(),
  });
  const remove = api.admin.controllers.delete.useMutation({
    onSuccess: async () => {
      router.push("/admin/controller");
      await utils.admin.controllers.list.invalidate();
    },
  });

  return (
    <>
      <AdminHeader
        title={controller.name}
        description={<span className="font-mono">{controller.id}</span>}
        back={{ href: "/admin/controller", label: "Controller" }}
      />
      <Section
        title="Live"
        icon="Flash"
        description="Aktueller Zustand und eingehende Nachrichten vom Controller, live."
        action={
          <Link
            href={`/admin/controller/${controller.id}/steuern`}
            className="text-neon-cyan text-sm"
          >
            Steuern →
          </Link>
        }
      >
        <div className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-6">
          <ControllerLive
            id={controller.id}
            width={controller.width}
            height={controller.height}
          />
          {/* Out of the grid flow on wide screens, so the console scrolls at the grid's height instead of growing. */}
          <div className="relative h-72 md:h-auto">
            <ControllerConsole
              controllerId={controller.id}
              className="h-full md:absolute md:inset-0"
            />
          </div>
        </div>
      </Section>

      <Section title="Stammdaten" icon="EditPencil">
        <ControllerForm
          key={controller.updatedAt.getTime()}
          initial={controller}
          onSubmit={(data) => update.mutate({ id: controller.id, data })}
          isPending={update.isPending}
          error={errorText(update.error)}
          success={update.isSuccess ? "Gespeichert." : null}
          submitLabel="Speichern"
        />
      </Section>

      <Section
        title="Letzte Spiele"
        icon="ViewGrid"
        description={`${controller._count.games} Spiele, ${controller._count.playRequests} Anfragen insgesamt`}
        action={
          <Link
            href={`/admin/spiele?controllerId=${controller.id}`}
            className="text-neon-cyan text-sm"
          >
            Alle →
          </Link>
        }
      >
        {controller.games.length === 0 ? (
          <p className="text-sm text-white/50">Noch keine Spiele.</p>
        ) : (
          <AdminList>
            {controller.games.map((game) => (
              <AdminRow
                key={game.id}
                href={`/admin/spiele/${game.id}`}
                title={game.gameType.name}
                subtitle={formatDateTime(game.startedAt)}
                badge={!game.endedAt && <Badge tone="green">läuft</Badge>}
              />
            ))}
          </AdminList>
        )}
      </Section>

      <Section title="Löschen" icon="Trash" tone="magenta">
        <DeleteButton
          what="Controller"
          consequence="Geht nur, solange keine Spiele darauf verweisen; Anfragen werden mitgelöscht."
          onConfirm={() => remove.mutate({ id: controller.id })}
          isPending={remove.isPending}
          error={errorText(remove.error)}
        />
      </Section>
    </>
  );
}
