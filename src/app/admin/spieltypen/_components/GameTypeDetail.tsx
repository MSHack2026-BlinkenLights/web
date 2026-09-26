"use client";

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
import { GameTypeForm } from "./GameTypeForm";

type GameTypeDetails = RouterOutputs["admin"]["gameTypes"]["get"];

/**
 * Edit form, recent games and delete action of a game type.
 *
 * @param props - The game type as loaded on the server.
 * @returns The page content.
 */
export function GameTypeDetail({ initial }: { initial: GameTypeDetails }) {
  const router = useRouter();
  const utils = api.useUtils();
  const { data: gameType } = api.admin.gameTypes.get.useQuery(
    { id: initial.id },
    { initialData: initial },
  );

  const update = api.admin.gameTypes.update.useMutation({
    onSuccess: () => utils.admin.invalidate(),
  });
  const remove = api.admin.gameTypes.delete.useMutation({
    onSuccess: async () => {
      router.push("/admin/spieltypen");
      await utils.admin.gameTypes.list.invalidate();
    },
  });

  return (
    <>
      <AdminHeader
        title={gameType.name}
        description={<span className="font-mono">{gameType.id}</span>}
        back={{ href: "/admin/spieltypen", label: "Spieltypen" }}
      />
      <GameTypeForm
        key={gameType.updatedAt.getTime()}
        initial={gameType}
        onSubmit={(data) => update.mutate({ id: gameType.id, data })}
        isPending={update.isPending}
        error={errorText(update.error)}
        success={update.isSuccess ? "Gespeichert." : null}
        submitLabel="Speichern"
      />

      <Section
        title="Letzte Spiele"
        icon="ViewGrid"
        description={`${gameType._count.games} Spiele, ${gameType._count.playRequests} Anfragen insgesamt`}
      >
        {gameType.games.length === 0 ? (
          <p className="text-sm text-white/50">Noch keine Spiele.</p>
        ) : (
          <AdminList>
            {gameType.games.map((game) => (
              <AdminRow
                key={game.id}
                href={`/admin/spiele/${game.id}`}
                title={game.controller.name}
                subtitle={formatDateTime(game.startedAt)}
                badge={!game.endedAt && <Badge tone="green">läuft</Badge>}
              />
            ))}
          </AdminList>
        )}
      </Section>

      <Section title="Löschen" icon="Trash" tone="magenta">
        <DeleteButton
          what="Spieltyp"
          consequence="Geht nur, solange keine Spiele darauf verweisen; Anfragen werden mitgelöscht."
          onConfirm={() => remove.mutate({ id: gameType.id })}
          isPending={remove.isPending}
          error={errorText(remove.error)}
        />
      </Section>
    </>
  );
}
