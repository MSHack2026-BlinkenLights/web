"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

import { DemoGamePreview } from "./demo-game-preview";
import { GameDetailsPanel } from "./game-details-panel";
import { GAME_LOCATIONS, type GameLocation } from "./game-locations";

const GameMap = dynamic(() => import("./game-map"), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      className="flex h-full min-h-96 items-center justify-center bg-white/10 text-white/70"
    >
      Loading map…
    </div>
  ),
});

/** URL is the selection source of truth, including refresh and Back/Forward. */
export function MapClient() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("game");
  const selected = GAME_LOCATIONS.find(
    (location) => location.id === selectedId,
  );
  const [expanded, setExpanded] = useState(false);
  const locationButtons = useRef(new Map<string, HTMLButtonElement>());
  const mapTitle = useRef<HTMLHeadingElement>(null);

  function updateSelection(id: string | null) {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("game", id);
    else url.searchParams.delete("game");
    // Next synchronizes native history with useSearchParams without remounting Leaflet.
    window.history.pushState(null, "", url.toString());
  }

  function selectLocation(location: GameLocation) {
    if (location.id !== selectedId) updateSelection(location.id);
  }

  function closeDetails() {
    updateSelection(null);
    setExpanded(false);
    const focusTarget = selected
      ? locationButtons.current.get(selected.id)
      : mapTitle.current;
    focusTarget?.focus({ preventScroll: true });
  }

  return (
    <section
      aria-labelledby="map-locations-title"
      onKeyDown={(event) => {
        if (event.key === "Escape" && selectedId !== null) {
          event.preventDefault();
          closeDetails();
        }
      }}
      className="overflow-hidden rounded-2xl border border-white/15 bg-white/5 shadow-2xl"
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-white/15 p-4">
        <h2
          id="map-locations-title"
          ref={mapTitle}
          tabIndex={-1}
          className="mr-1 rounded text-sm font-semibold text-white/70 focus-visible:outline-2 focus-visible:outline-cyan-300"
        >
          Demo locations
        </h2>
        {GAME_LOCATIONS.map((location) => (
          <button
            key={location.id}
            ref={(element) => {
              if (element) locationButtons.current.set(location.id, element);
              else locationButtons.current.delete(location.id);
            }}
            type="button"
            aria-pressed={selected?.id === location.id}
            onClick={() => selectLocation(location)}
            className={`rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${selected?.id === location.id ? "border-cyan-300 bg-cyan-300/15 text-cyan-200" : "border-white/20 text-white/80 hover:bg-white/10"}`}
          >
            {location.venue}
          </button>
        ))}
      </div>

      {selectedId !== null && !selected && (
        <div
          role="status"
          className="flex items-center justify-between gap-4 border-b border-white/15 bg-amber-300/10 px-4 py-3 text-sm text-amber-100"
        >
          <p>
            This game location was not found. Select one of the demo locations.
          </p>
          <button
            type="button"
            onClick={closeDetails}
            className="rounded px-2 py-1 underline focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="flex flex-col md:h-[72vh] md:min-h-[36rem] md:flex-row">
        <div
          aria-label="Map of game locations in Münster"
          className="relative z-0 h-96 min-w-0 flex-1 md:h-full"
        >
          <GameMap selected={selected} onSelect={selectLocation} />
        </div>
        {selected && (
          <GameDetailsPanel
            location={selected}
            expanded={expanded}
            onToggleExpanded={() => setExpanded((value) => !value)}
            onClose={closeDetails}
            preview={<DemoGamePreview key={selected.id} gameId={selected.id} />}
          />
        )}
      </div>
    </section>
  );
}
