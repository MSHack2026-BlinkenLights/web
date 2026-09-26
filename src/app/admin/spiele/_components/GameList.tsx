"use client";

import { keepPreviousData } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Button, buttonClasses } from "wbl/app/_components/ui/button";
import { SelectField } from "wbl/app/_components/ui/select-field";
import { EmptyState, ErrorState } from "wbl/app/_components/ui/states";
import { formatDateTime } from "wbl/app/admin/_components/format";
import {
  AdminHeader,
  AdminList,
  AdminRow,
  Badge,
} from "wbl/app/admin/_components/ui";
import { api, type RouterInputs } from "wbl/trpc/react";

export type GameFilter = Omit<RouterInputs["admin"]["games"]["list"], "cursor">;

/**
 * Filterable, paged list of all games, newest first.
 *
 * @param props - The filter to start with, e.g. from the URL.
 * @returns The page content.
 */
export function GameList({ initialFilter }: { initialFilter: GameFilter }) {
  const [filter, setFilter] = useState(initialFilter);
  const [options] = api.admin.options.useSuspenseQuery();
  const query = api.admin.games.list.useInfiniteQuery(filter, {
    getNextPageParam: (page) => page.nextCursor,
    placeholderData: keepPreviousData,
  });
  const games = query.data?.pages.flatMap((page) => page.games) ?? [];

  const change = (patch: Partial<GameFilter>) =>
    setFilter((current) => ({ ...current, ...patch }));

  return (
    <>
      <AdminHeader
        title="Spiele"
        description="Alle gespielten und laufenden Spiele mit ihren Pixeldaten."
        action={
          <Link
            href="/admin/spiele/neu"
            className={buttonClasses("solid", "cyan")}
          >
            Neues Spiel
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <SelectField
          label="Controller"
          value={filter.controllerId ?? ""}
          onChange={(event) =>
            change({ controllerId: event.target.value || undefined })
          }
        >
          <option value="">Alle Controller</option>
          {options.controllers.map((controller) => (
            <option key={controller.id} value={controller.id}>
              {controller.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Spieltyp"
          value={filter.gameTypeId ?? ""}
          onChange={(event) =>
            change({ gameTypeId: event.target.value || undefined })
          }
        >
          <option value="">Alle Spieltypen</option>
          {options.gameTypes.map((gameType) => (
            <option key={gameType.id} value={gameType.id}>
              {gameType.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Status"
          value={filter.status ?? ""}
          onChange={(event) =>
            change({
              status: (event.target.value || undefined) as GameFilter["status"],
            })
          }
        >
          <option value="">Alle</option>
          <option value="running">Läuft</option>
          <option value="ended">Beendet</option>
        </SelectField>
      </div>

      {query.isError && !query.data ? (
        <ErrorState
          message="Die Spiele konnten nicht geladen werden."
          onRetry={() => void query.refetch()}
        />
      ) : games.length === 0 ? (
        <EmptyState icon="ViewGrid">Keine Spiele für diese Auswahl.</EmptyState>
      ) : (
        <AdminList>
          {games.map((game) => (
            <AdminRow
              key={game.id}
              href={`/admin/spiele/${game.id}`}
              title={game.gameType.name}
              badge={
                game.aborted ? (
                  <Badge>abgebrochen</Badge>
                ) : (
                  !game.endedAt && <Badge tone="green">läuft</Badge>
                )
              }
              subtitle={`${game.controller.name} · ${formatDateTime(game.startedAt)}`}
              meta={`${game._count.data} Änderungen`}
            />
          ))}
        </AdminList>
      )}
      {query.hasNextPage && (
        <Button
          variant="outline"
          tone="neutral"
          isPending={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
          className="self-center"
        >
          Mehr laden
        </Button>
      )}
    </>
  );
}
