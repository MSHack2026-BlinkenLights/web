"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { buttonClasses } from "wbl/app/_components/ui/button";
import { formatDistance } from "wbl/utils/geo";

import { LivePadPreview } from "./live-pad-preview";
import { PadPlayers } from "./pad-players";
import { PAD_STATUS, type Pad } from "./pads";

interface GameDetailsPanelProps {
  pad: Pad;
  viewerId: string | null;
  /** Distance to the visitor in meters, once they shared their position. */
  distance?: number;
  onClose: () => void;
}

/**
 * Non-modal, read-only details: a bottom sheet over the map on mobile, in
 * place of the list in the sidebar on desktop. The state source is supplied
 * by the explorer.
 */
export function GameDetailsPanel({
  pad,
  viewerId,
  distance,
  onClose,
}: GameDetailsPanelProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [pad.id]);

  const status = PAD_STATUS[pad.status];
  const [latitude, longitude] = pad.coordinates;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  const facts = [
    { label: "Rastergröße", value: `${pad.width} × ${pad.height}` },
    pad.game && { label: "Läuft gerade", value: pad.game },
    distance !== undefined && {
      label: "Entfernung",
      value: formatDistance(distance),
    },
  ].filter((fact): fact is { label: string; value: string } => !!fact);

  return (
    // max-h-[60%]: keep in sync with SHEET_HEIGHT_RATIO in game-map.tsx.
    <aside
      aria-labelledby="game-details-title"
      className="bg-pixel-off absolute inset-x-0 bottom-0 z-10 max-h-[60%] overflow-y-auto rounded-t-2xl border-t border-white/10 shadow-[0_-0.5rem_2rem] shadow-black/60 md:static md:order-first md:max-h-none md:w-80 md:shrink-0 md:rounded-none md:border-t-0 md:border-r md:shadow-none lg:w-96"
    >
      <div
        aria-hidden
        className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/20 md:hidden"
      />
      <div className="flex flex-col gap-5 p-4 md:p-6">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={`flex items-center gap-1.5 text-sm font-semibold ${status.textClass}`}
            >
              <DynamicIcon name={status.icon} size={16} />
              {status.label}
            </p>
            <h2
              id="game-details-title"
              ref={titleRef}
              tabIndex={-1}
              className="focus-visible:outline-neon-cyan mt-1 rounded-sm text-xl font-bold focus-visible:outline-2"
            >
              {pad.name}
            </h2>
            <p className="text-sm text-white/60">{pad.location}</p>
          </div>
          <button
            type="button"
            aria-label="Details schließen"
            onClick={onClose}
            className="focus-visible:outline-neon-cyan -mt-1 -mr-2 flex size-12 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2"
          >
            <DynamicIcon name="Xmark" size={24} />
          </button>
        </header>

        <LivePadPreview key={pad.id} pad={pad} />

        <PadPlayers pad={pad} viewerId={viewerId} />

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-white/50">{fact.label}</dt>
              <dd className="mt-0.5 font-medium">{fact.value}</dd>
            </div>
          ))}
        </dl>

        {pad.status === "free" && (
          <Link
            href={`/sichern?pad=${pad.id}`}
            className={buttonClasses("outline", "neutral")}
          >
            <DynamicIcon name="ShieldCheck" size={20} />
            Gerade hier gespielt? Spiel sichern
          </Link>
        )}

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses("solid", "cyan")}
        >
          <DynamicIcon name="Navigator" size={20} />
          Route starten
          <span className="sr-only">
            (öffnet Google Maps in einem neuen Tab)
          </span>
        </a>
      </div>
    </aside>
  );
}
