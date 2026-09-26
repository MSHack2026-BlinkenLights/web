"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Section } from "wbl/app/_components/ui/section";
import { DeleteButton } from "wbl/app/admin/_components/DeleteButton";
import { errorText } from "wbl/app/admin/_components/format";
import { AdminHeader, Badge } from "wbl/app/admin/_components/ui";
import { api, type RouterOutputs } from "wbl/trpc/react";
import { GameForm } from "./GameForm";
import { PixelEditor } from "./PixelEditor";

type Game = RouterOutputs["admin"]["games"]["get"];

/**
 * Master data, pixel editor and delete action of a game.
 *
 * @param props - The game as loaded on the server.
 * @returns The page content.
 */
export function GameDetail({ initial }: { initial: Game }) {
  const router = useRouter();
  const utils = api.useUtils();
  const { data: game } = api.admin.games.get.useQuery(
    { id: initial.id },
    { initialData: initial },
  );

  const update = api.admin.games.update.useMutation({
    onSuccess: () => utils.admin.invalidate(),
  });
  const remove = api.admin.games.delete.useMutation({
    onSuccess: async () => {
      router.push("/admin/spiele");
      await utils.admin.games.list.invalidate();
    },
  });

  return (
    <>
      <AdminHeader
        title={game.gameType.name}
        description={
          <>
            <Link
              href={`/admin/controller/${game.controller.id}`}
              className="hover:text-neon-cyan underline"
            >
              {game.controller.name}
            </Link>{" "}
            · <span className="font-mono">{game.id}</span>
          </>
        }
        back={{ href: "/admin/spiele", label: "Spiele" }}
        action={
          game.endedAt ? (
            <Badge>beendet</Badge>
          ) : (
            <Badge tone="green">läuft</Badge>
          )
        }
      />
      <GameForm
        key={game.updatedAt.getTime()}
        initial={game}
        onSubmit={(data) => update.mutate({ id: game.id, data })}
        isPending={update.isPending}
        error={errorText(update.error)}
        success={update.isSuccess ? "Gespeichert." : null}
        submitLabel="Speichern"
      />

      <Section
        title="Spieldaten"
        icon="ViewGrid"
        description={`Pixel auf dem ${game.controller.width}×${game.controller.height}-Feld. Antippen zum Malen oder Radieren.`}
      >
        <PixelEditor game={game} />
      </Section>

      <Section title="Löschen" icon="Trash" tone="magenta">
        <DeleteButton
          what="Spiel"
          consequence="Alle Pixeldaten werden mitgelöscht."
          onConfirm={() => remove.mutate({ id: game.id })}
          isPending={remove.isPending}
          error={errorText(remove.error)}
        />
      </Section>
    </>
  );
}
