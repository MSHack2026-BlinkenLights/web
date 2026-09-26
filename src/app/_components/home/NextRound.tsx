"use client";

import Link from "next/link";

import { EmptyState } from "wbl/app/_components/ui/states";
import { PlayRequestCard } from "wbl/app/mitspielen/_components/PlayRequestCard";
import { api } from "wbl/trpc/react";

/** The next "Mitspielen" round with a free seat: live ones come first (sorted by start). */
export function NextRound() {
  const [data] = api.lookingToPlay.list.useSuspenseQuery(
    {},
    { refetchInterval: 30_000 },
  );
  const entry =
    data.entries.find(
      (candidate) => candidate.participants.length < candidate.openSlots,
    ) ?? data.entries[0];

  if (!entry) {
    return (
      <EmptyState icon="BubbleSearch">
        Gerade sucht niemand Mitspieler:innen.{" "}
        <Link href="/mitspielen" className="text-neon-cyan underline">
          Biete selbst eine Runde an!
        </Link>
      </EmptyState>
    );
  }

  return (
    <PlayRequestCard
      entry={entry}
      now={data.now}
      viewerId={data.viewerId}
      signInHref="/anmelden?weiter=/"
    />
  );
}
