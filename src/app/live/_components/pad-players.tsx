"use client";

import { Blobatar } from "@blobatar/react";
import Link from "next/link";
import { useState } from "react";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { Button, buttonClasses } from "wbl/app/_components/ui/button";
import { api } from "wbl/trpc/react";
import { formatTime } from "wbl/utils/time";

import { type Pad, type PadPlayRequest } from "./pads";

interface PadPlayersProps {
  pad: Pad;
  viewerId: string | null;
}

/**
 * The pad's live "Mitspielen" entries: who is there, how many seats are free,
 * and a join button. Presence is taken from the entry, not confirmed by the pad.
 */
export function PadPlayers({ pad, viewerId }: PadPlayersProps) {
  if (pad.playRequests.length === 0) return null;

  return (
    <section
      aria-labelledby="pad-players-title"
      className="flex flex-col gap-3 border-t border-white/10 pt-4"
    >
      <div>
        <h3 id="pad-players-title" className="font-semibold">
          {pad.status === "playing"
            ? "Spielt gerade hier"
            : "Jetzt hier verabredet"}
        </h3>
        <p className="text-xs text-white/50">
          Laut Eintrag in „Mitspielen“ – ob alle wirklich da sind, wissen wir
          nicht.
        </p>
      </div>
      {pad.playRequests.map((request) => (
        <PlayRequestRow
          key={request.id}
          padId={pad.id}
          request={request}
          viewerId={viewerId}
        />
      ))}
    </section>
  );
}

function PlayRequestRow({
  padId,
  request,
  viewerId,
}: {
  padId: string;
  request: PadPlayRequest;
  viewerId: string | null;
}) {
  const people = [request.host, ...request.participants];
  const others = people.length - 1;

  return (
    <div className="bg-surface flex flex-col gap-3 rounded-xl border border-white/10 p-3">
      <div className="flex items-center gap-3">
        {/* Blobs leave ~10-17% empty space per side; the spacing must exceed that to overlap. */}
        <div className="flex shrink-0 -space-x-3.5">
          {people.slice(0, 4).map((person) => (
            <Blobatar
              key={person.id}
              name={person.name}
              size={32}
              alt=""
              className="drop-shadow-[-0.125rem_0_0.125rem_rgb(0_0_0/0.6)]"
            />
          ))}
        </div>
        <p className="min-w-0 text-sm">
          <span className="font-semibold">{request.host.name}</span>
          {others > 0 && (
            <span className="text-white/70">
              {" "}
              + {others} {others === 1 ? "weitere Person" : "weitere"}
            </span>
          )}
          <span className="block truncate text-white/50">
            {request.gameType.name} · bis {formatTime(request.endsAt)} Uhr
          </span>
        </p>
      </div>

      <p
        className={`flex items-center gap-1.5 text-sm font-semibold ${request.freeSlots > 0 ? "text-neon-green" : "text-white/60"}`}
      >
        <DynamicIcon
          name={request.freeSlots > 0 ? "UserPlus" : "Prohibition"}
          size={18}
        />
        {request.freeSlots === 0
          ? "Keine Plätze mehr frei"
          : request.freeSlots === 1
            ? "1 Platz frei"
            : `${request.freeSlots} Plätze frei`}
      </p>

      <JoinAction padId={padId} request={request} viewerId={viewerId} />
    </div>
  );
}

function JoinAction({
  padId,
  request,
  viewerId,
}: {
  padId: string;
  request: PadPlayRequest;
  viewerId: string | null;
}) {
  const utils = api.useUtils();
  const [error, setError] = useState<string>();
  const join = api.lookingToPlay.join.useMutation({
    onMutate: () => setError(undefined),
    onError: () =>
      setError(
        "Beitreten hat nicht geklappt – vielleicht war jemand schneller.",
      ),
    // Refresh either way: on a conflict the data is likely out of date.
    onSettled: () =>
      Promise.all([
        utils.live.pads.invalidate(),
        utils.lookingToPlay.list.invalidate(),
      ]),
  });

  const isHost = request.host.id === viewerId;
  const isParticipant = request.participants.some((p) => p.id === viewerId);

  if (isHost || isParticipant) {
    return (
      <p className="text-neon-green flex items-center gap-1.5 text-sm font-semibold">
        <DynamicIcon name="Check" size={18} />
        {isHost ? "Deine Runde" : "Du bist dabei"}
        <Link
          href="/mitspielen"
          className="-my-3 ml-auto flex min-h-12 items-center font-normal text-white/60 underline underline-offset-2 hover:text-white"
        >
          Verwalten
        </Link>
      </p>
    );
  }

  if (request.freeSlots === 0) return null;

  if (!viewerId) {
    return (
      <Link
        href={`/anmelden?weiter=${encodeURIComponent(`/live?pad=${padId}`)}`}
        className={`${buttonClasses("outline", "cyan")} text-sm`}
      >
        Anmelden & mitspielen
      </Link>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        icon="UserPlus"
        isPending={join.isPending}
        onClick={() => join.mutate({ id: request.id })}
        className="text-sm"
      >
        Mitspielen
      </Button>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </>
  );
}
