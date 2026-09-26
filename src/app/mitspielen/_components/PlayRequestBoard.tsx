"use client";

import { keepPreviousData } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import {
  type PlayRequestEntry,
  PlayRequestCard,
} from "wbl/app/mitspielen/_components/PlayRequestCard";
import { PlayRequestForm } from "wbl/app/mitspielen/_components/PlayRequestForm";
import { buttonClasses } from "wbl/app/_components/ui/button";
import { SelectField } from "wbl/app/_components/ui/select-field";
import { EmptyState, ErrorState } from "wbl/app/_components/ui/states";
import { type TimeGroup, timeGroupLabels, timeGroupOf } from "wbl/utils/time";
import { api } from "wbl/trpc/react";

const SIGN_IN_HREF = "/anmelden?next=/mitspielen";

const fabClass =
  "bg-neon-cyan shadow-neon-cyan/40 pointer-events-auto flex min-h-14 items-center gap-2 rounded-full px-5 font-semibold text-black shadow-[0_0_1.25rem] transition-transform active:scale-95";

/** Live and upcoming entries grouped by time, with filters and "offer a round". */
export function PlayRequestBoard() {
  const [controllerId, setControllerId] = useState("");
  const [gameTypeId, setGameTypeId] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const [options] = api.lookingToPlay.options.useSuspenseQuery();
  const list = api.lookingToPlay.list.useQuery(
    {
      controllerId: controllerId || undefined,
      gameTypeId: gameTypeId || undefined,
    },
    { refetchInterval: 30_000, placeholderData: keepPreviousData },
  );

  const data = list.data;
  const groups = new Map<TimeGroup, PlayRequestEntry[]>();
  for (const entry of data?.entries ?? []) {
    const group = timeGroupOf(entry.startsAt, data?.now ?? new Date());
    groups.set(group, [...(groups.get(group) ?? []), entry]);
  }
  const filtered = Boolean(controllerId || gameTypeId);

  /** "Offer a round": floating on mobile, in the filter bar on desktop. */
  const offerAction = (className: string, onDesktop: boolean) => {
    const icon = <DynamicIcon name="Plus" size={onDesktop ? 20 : 22} />;
    if (data?.viewerId) {
      return (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className={className}
        >
          {icon}
          Runde anbieten
        </button>
      );
    }
    return (
      <Link href={SIGN_IN_HREF} className={className}>
        {icon}
        Anmelden & Runde anbieten
      </Link>
    );
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,16rem)_minmax(0,16rem)_1fr] md:items-end md:gap-4">
        <SelectField
          label="Standort"
          value={controllerId}
          onChange={(event) => setControllerId(event.target.value)}
        >
          <option value="">Alle Standorte</option>
          {options.controllers.map((controller) => (
            <option key={controller.id} value={controller.id}>
              {controller.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Spiel"
          value={gameTypeId}
          onChange={(event) => setGameTypeId(event.target.value)}
        >
          <option value="">Alle Spiele</option>
          {options.gameTypes.map((gameType) => (
            <option key={gameType.id} value={gameType.id}>
              {gameType.name}
            </option>
          ))}
        </SelectField>
        <div className="hidden justify-self-end md:block">
          {offerAction(buttonClasses("solid", "cyan"), true)}
        </div>
      </div>

      {list.isError && !data && (
        <ErrorState
          message="Die Einträge konnten nicht geladen werden."
          onRetry={() => void list.refetch()}
        />
      )}

      {data?.entries.length === 0 && (
        <EmptyState icon="BubbleSearch">
          {filtered
            ? "Für diese Auswahl sucht gerade niemand Mitspieler:innen."
            : "Gerade sucht niemand Mitspieler:innen – sei die/der Erste!"}
        </EmptyState>
      )}

      {data &&
        (Object.keys(timeGroupLabels) as TimeGroup[]).map((group) => {
          const entries = groups.get(group);
          if (!entries) return null;
          return (
            <section
              key={group}
              aria-labelledby={`group-${group}`}
              className="flex flex-col gap-3"
            >
              <h2
                id={`group-${group}`}
                className="text-sm font-semibold tracking-wide text-white/60 uppercase"
              >
                {timeGroupLabels[group]}
              </h2>
              <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:items-start md:gap-4 lg:grid-cols-3">
                {entries.map((entry) => (
                  <PlayRequestCard
                    key={entry.id}
                    entry={entry}
                    now={data.now}
                    viewerId={data.viewerId}
                    signInHref={SIGN_IN_HREF}
                  />
                ))}
              </div>
            </section>
          );
        })}

      {/* Main action in thumb reach, above the BottomBar on mobile. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--bottombar-h)+1rem)] z-30 mx-auto flex w-full max-w-md justify-end px-4 md:hidden">
        {offerAction(fabClass, false)}
      </div>

      {data?.viewerId && (
        <PlayRequestForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          controllers={options.controllers}
          gameTypes={options.gameTypes}
          defaultControllerId={controllerId}
        />
      )}
    </>
  );
}
