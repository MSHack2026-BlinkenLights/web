"use client";

import { useEffect, useState } from "react";

import {
  type LocalClaim,
  readLocalClaims,
} from "wbl/app/_components/claim/local-claims";
import { EmptyState } from "wbl/app/_components/ui/states";
import { GameCard, GameCardsSkeleton } from "./GameCard";

/** Rounds claimed in this browser without an account. */
export function LocalHistory() {
  // Read after mount: the server has no access to the browser's storage.
  const [claims, setClaims] = useState<LocalClaim[] | null>(null);
  useEffect(() => setClaims(readLocalClaims()), []);

  if (!claims) return <GameCardsSkeleton count={2} />;
  if (claims.length === 0) {
    return (
      <EmptyState icon="Archive">
        Noch keine Spiele gesichert. Nach deiner nächsten Runde geht das über
        „Spiel sichern“.
      </EmptyState>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {claims.map((claim) => (
        <GameCard
          key={claim.gameId}
          gameId={claim.gameId}
          gameName={claim.gameName}
          padName={claim.padName}
          endedAt={new Date(claim.endedAt)}
        />
      ))}
    </ul>
  );
}
