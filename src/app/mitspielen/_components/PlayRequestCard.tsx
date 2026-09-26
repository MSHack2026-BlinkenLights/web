"use client";

import { Blobatar } from "@blobatar/react";
import Link from "next/link";
import { useState } from "react";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { PixelFrame } from "wbl/app/_components/PixelFrame";
import { Skeleton } from "wbl/app/_components/ui/skeleton";
import {
  formatDay,
  formatRemaining,
  formatTime,
  timeGroupOf,
} from "wbl/utils/time";
import { api, type RouterOutputs } from "wbl/trpc/react";

export type PlayRequestEntry =
  RouterOutputs["lookingToPlay"]["list"]["entries"][number];

interface PlayRequestCardProps {
  entry: PlayRequestEntry;
  now: Date;
  viewerId: string | null;
  signInHref: string;
}

const primaryButtonClass =
  "bg-neon-green min-h-12 w-full rounded-xl px-4 font-semibold text-black transition hover:shadow-[0_0_1rem] hover:shadow-neon-green/40 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none";
const secondaryButtonClass =
  "min-h-12 w-full rounded-xl border border-white/15 px-4 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 disabled:opacity-50";

export function PlayRequestCard({
  entry,
  now,
  viewerId,
  signInHref,
}: PlayRequestCardProps) {
  const isLive = timeGroupOf(entry.startsAt, now) === "live";
  const taken = entry.participants.length;
  const free = Math.max(0, entry.openSlots - taken);

  const content = (
    <article
      aria-label={`${entry.gameType.name} am ${entry.controller.name}`}
      className={`bg-surface flex flex-col gap-3 p-4 ${isLive ? "" : "rounded-2xl border border-white/10 transition-colors hover:border-white/20"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg leading-tight font-bold">
          {entry.gameType.name}
        </h3>
        {isLive && (
          <span className="text-neon-green flex shrink-0 items-center gap-1 text-xs font-semibold tracking-wide uppercase">
            <DynamicIcon name="Flash" size={16} />
            Läuft gerade
          </span>
        )}
      </div>

      <dl className="flex flex-col gap-1.5 text-sm text-white/80">
        <div className="flex items-start gap-2">
          <dt className="sr-only">Standort</dt>
          <DynamicIcon
            name="MapPin"
            size={18}
            className="mt-0.5 shrink-0 text-white/50"
          />
          <dd className="min-w-0">
            {entry.controller.name}
            <span className="text-white/50">
              {" "}
              · {entry.controller.location}
            </span>
          </dd>
        </div>
        <div className="flex items-start gap-2">
          <dt className="sr-only">Zeit</dt>
          <DynamicIcon
            name="Clock"
            size={18}
            className="mt-0.5 shrink-0 text-white/50"
          />
          <dd>
            {isLive ? (
              <>
                seit {formatTime(entry.startsAt)} Uhr ·{" "}
                {formatRemaining(entry.endsAt, now)}
              </>
            ) : (
              <>
                {formatDay(entry.startsAt)}, {formatTime(entry.startsAt)}–
                {formatTime(entry.endsAt)} Uhr
              </>
            )}
          </dd>
        </div>
      </dl>

      {entry.note && (
        <p className="border-l-2 border-white/15 pl-3 text-sm break-words text-white/70 italic">
          {entry.note}
        </p>
      )}

      <div className="flex items-center gap-3">
        <SeatPixels taken={taken} free={free} />
        <p className="text-sm text-white/80" aria-live="polite">
          {free === 0
            ? "Alle Plätze belegt"
            : `noch ${free} von ${entry.openSlots} ${entry.openSlots === 1 ? "Platz" : "Plätzen"} frei`}
        </p>
      </div>

      <PeopleList entry={entry} />

      <CardActions
        entry={entry}
        free={free}
        viewerId={viewerId}
        signInHref={signInHref}
      />
    </article>
  );

  return isLive ? <PixelFrame>{content}</PixelFrame> : content;
}

/** Placeholder with the layout of an upcoming {@link PlayRequestCard}. */
export function PlayRequestCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex flex-col gap-3 rounded-2xl border border-white/10 p-4"
    >
      <Skeleton className="h-6 w-36" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-48 max-w-full" />
        <Skeleton className="h-4 w-40 max-w-full" />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="size-3 rounded-[18%]" />
          ))}
        </div>
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="size-7 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-12 rounded-xl" />
    </div>
  );
}

/** One LED per seat for others: lit = taken, dark = free. */
function SeatPixels({ taken, free }: { taken: number; free: number }) {
  return (
    <div aria-hidden className="flex shrink-0 flex-wrap gap-1">
      {Array.from({ length: taken }, (_, i) => (
        <span
          key={`t${i}`}
          className="bg-neon-green shadow-neon-green size-3 rounded-[18%] shadow-[0_0_0.375rem]"
        />
      ))}
      {Array.from({ length: free }, (_, i) => (
        <span
          key={`f${i}`}
          className="bg-pixel-off size-3 rounded-[18%] ring-1 ring-white/20"
        />
      ))}
    </div>
  );
}

function PeopleList({ entry }: { entry: PlayRequestEntry }) {
  const people = [entry.host, ...entry.participants.map((p) => p.user)];
  return (
    <div className="flex items-center gap-2">
      {/* Blobs leave ~10-17% empty space per side; the spacing must exceed that to overlap. */}
      <div className="flex shrink-0 -space-x-3.5">
        {people.slice(0, 5).map((person) => (
          <Blobatar
            key={person.id}
            name={person.name}
            size={28}
            alt=""
            // drop-shadow follows the blob's shape; it lands on the blob to the left.
            className="drop-shadow-[-0.125rem_0_0.125rem_rgb(0_0_0/0.6)]"
          />
        ))}
      </div>
      <p className="min-w-0 truncate text-sm text-white/60">
        <span className="text-white/90">{entry.host.name}</span>
        {entry.participants.length > 0 &&
          ` + ${entry.participants.map((p) => p.user.name).join(", ")}`}
      </p>
    </div>
  );
}

function CardActions({
  entry,
  free,
  viewerId,
  signInHref,
}: {
  entry: PlayRequestEntry;
  free: number;
  viewerId: string | null;
  signInHref: string;
}) {
  const utils = api.useUtils();
  const [error, setError] = useState<string>();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const mutationOptions = (failure: string) => ({
    onMutate: () => setError(undefined),
    onError: () => setError(failure),
    // Refresh either way: on a conflict the list is likely out of date.
    onSettled: () => utils.lookingToPlay.list.invalidate(),
  });
  const join = api.lookingToPlay.join.useMutation(
    mutationOptions(
      "Beitreten hat nicht geklappt – vielleicht war jemand schneller.",
    ),
  );
  const leave = api.lookingToPlay.leave.useMutation(
    mutationOptions("Austreten hat nicht geklappt. Versuch es bitte noch mal."),
  );
  const cancel = api.lookingToPlay.cancel.useMutation(
    mutationOptions("Absagen hat nicht geklappt. Versuch es bitte noch mal."),
  );
  const busy = join.isPending || leave.isPending || cancel.isPending;

  const isHost = viewerId === entry.host.id;
  const isParticipant = entry.participants.some((p) => p.user.id === viewerId);

  let action;
  if (!viewerId) {
    action =
      free > 0 ? (
        <Link
          href={signInHref}
          className={`${primaryButtonClass} flex items-center justify-center`}
        >
          Anmelden & mitspielen
        </Link>
      ) : null;
  } else if (isHost) {
    action = confirmCancel ? (
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => cancel.mutate({ id: entry.id })}
          className="min-h-12 rounded-xl bg-red-500/90 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          Ja, absagen
        </button>
        <button
          type="button"
          onClick={() => setConfirmCancel(false)}
          className={secondaryButtonClass}
        >
          Doch nicht
        </button>
      </div>
    ) : (
      <button
        type="button"
        onClick={() => setConfirmCancel(true)}
        className={secondaryButtonClass}
      >
        Deine Runde · Absagen
      </button>
    );
  } else if (isParticipant) {
    action = (
      <div className="flex items-center gap-3">
        <span className="text-neon-green flex shrink-0 items-center gap-1 text-sm font-semibold">
          <DynamicIcon name="Check" size={18} />
          Du bist dabei
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => leave.mutate({ id: entry.id })}
          className={secondaryButtonClass}
        >
          Austreten
        </button>
      </div>
    );
  } else {
    action = (
      <button
        type="button"
        disabled={busy || free === 0}
        onClick={() => join.mutate({ id: entry.id })}
        className={primaryButtonClass}
      >
        {free === 0
          ? "Leider voll"
          : join.isPending
            ? "Einen Moment …"
            : "Mitspielen"}
      </button>
    );
  }

  return (
    <>
      {action}
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </>
  );
}
