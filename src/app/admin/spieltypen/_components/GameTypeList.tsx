"use client";

import Link from "next/link";

import { buttonClasses } from "wbl/app/_components/ui/button";
import { EmptyState } from "wbl/app/_components/ui/states";
import { AdminHeader, AdminList, AdminRow } from "wbl/app/admin/_components/ui";
import { api } from "wbl/trpc/react";

/** All game types, linked to their detail pages. */
export function GameTypeList() {
  const [gameTypes] = api.admin.gameTypes.list.useSuspenseQuery();

  return (
    <>
      <AdminHeader
        title="Spieltypen"
        description="Welche Spiele es gibt, wie groß das Spielfeld sein muss und wie viele mitspielen."
        action={
          <Link
            href="/admin/spieltypen/neu"
            className={buttonClasses("solid", "cyan")}
          >
            Neuer Spieltyp
          </Link>
        }
      />
      {gameTypes.length === 0 ? (
        <EmptyState icon="Gamepad">Noch keine Spieltypen.</EmptyState>
      ) : (
        <AdminList>
          {gameTypes.map((gameType) => (
            <AdminRow
              key={gameType.id}
              href={`/admin/spieltypen/${gameType.id}`}
              title={gameType.name}
              subtitle={<span className="font-mono">{gameType.key}</span>}
              meta={
                <>
                  {gameType.requiredWidth}×{gameType.requiredHeight} ·{" "}
                  {gameType.minPlayers}–{gameType.maxPlayers} Spieler
                  <br />
                  {gameType._count.games} Spiele
                </>
              }
            />
          ))}
        </AdminList>
      )}
    </>
  );
}
