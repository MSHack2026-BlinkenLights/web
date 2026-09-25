"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { type GameLocation } from "./game-locations";

interface GameDetailsPanelProps {
  location: GameLocation;
  preview: ReactNode;
  expanded: boolean;
  onToggleExpanded: () => void;
  onClose: () => void;
}

/** Non-modal, read-only details. The state source is supplied by the explorer. */
export function GameDetailsPanel({
  location,
  preview,
  expanded,
  onToggleExpanded,
  onClose,
}: GameDetailsPanelProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [location.id]);

  const [latitude, longitude] = location.coordinates;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  return (
    <aside
      aria-labelledby="game-details-title"
      className={`w-full shrink-0 overflow-y-auto border-t border-white/15 bg-[#15162c] md:border-t-0 md:border-l ${expanded ? "md:w-[34rem]" : "md:w-[25rem]"}`}
    >
      <div className="space-y-6 p-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-widest text-purple-300 uppercase">
              Watch game · Demo location
            </p>
            <h2
              id="game-details-title"
              ref={titleRef}
              tabIndex={-1}
              className="rounded-sm text-2xl font-bold focus-visible:outline-2 focus-visible:outline-cyan-300"
            >
              {location.game}
            </h2>
            <p className="mt-1 text-white/70">{location.venue}</p>
          </div>
          <button
            type="button"
            aria-label="Close game details"
            onClick={onClose}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-xl hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        {preview}

        <dl className="space-y-4 border-t border-white/10 pt-5 text-sm">
          <div>
            <dt className="text-white/50">Location</dt>
            <dd className="mt-1">{location.venue}, Münster, Germany</dd>
          </div>
          <div>
            <dt className="text-white/50">Coordinates</dt>
            <dd className="mt-1 font-mono text-white/80">
              {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-3">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
          >
            Directions{" "}
            <span className="sr-only">(opens Google Maps in a new tab)</span>
            <span aria-hidden="true">↗</span>
          </a>
          <button
            type="button"
            aria-pressed={expanded}
            onClick={onToggleExpanded}
            className="hidden rounded-full border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300 md:block"
          >
            {expanded ? "Compact preview" : "Enlarge preview"}
          </button>
        </div>
        <p className="text-xs text-white/50">
          Read-only preview. Share this page’s URL to open the same location.
        </p>
      </div>
    </aside>
  );
}
