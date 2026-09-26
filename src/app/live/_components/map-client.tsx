"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { PixelGrid } from "wbl/app/_components/PixelGrid";
import { Button } from "wbl/app/_components/ui/button";
import { api } from "wbl/trpc/react";
import { distanceInMeters } from "wbl/utils/geo";

import { GameDetailsPanel } from "./game-details-panel";
import { LocationList } from "./location-list";
import { MapLegend } from "./map-legend";
import { type Pad } from "./pads";
import { usePadStatusUpdates } from "./use-pad-status-updates";
import { useUserPosition } from "./use-user-position";

/** Pulsing pixel grid, shared by the page's Suspense fallback and the map chunk. */
export function MapLoading() {
  return (
    <div className="flex h-full min-h-72 items-center justify-center">
      <PixelGrid
        width={3}
        height={3}
        pending
        label="Karte wird geladen"
        className="max-w-16"
      />
    </div>
  );
}

const GameMap = dynamic(() => import("./game-map"), {
  ssr: false,
  loading: () => <MapLoading />,
});

type View = "map" | "list";

const views: { value: View; label: string; icon: string }[] = [
  { value: "map", label: "Karte", icon: "Map" },
  { value: "list", label: "Liste", icon: "List" },
];

/**
 * URL is the selection source of truth, including refresh and Back/Forward.
 * Mobile toggles between map and list, with details as a bottom sheet.
 * Desktop shows a sidebar (list, or details of the selected pad) beside the map.
 */
export function MapClient() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("pad");
  // Status follows the pads live; polling keeps free seats current.
  const [{ pads, viewerId }] = api.live.pads.useSuspenseQuery(undefined, {
    refetchInterval: 30_000,
  });
  usePadStatusUpdates();
  const selected = pads.find((location) => location.id === selectedId);
  const [view, setView] = useState<View>("map");
  const userPosition = useUserPosition();
  const listButtons = useRef(new Map<string, HTMLButtonElement>());
  const title = useRef<HTMLHeadingElement>(null);
  /** Pad whose list row gets focus back once its details have closed. */
  const restoreFocusTo = useRef<string | null>(null);

  const distances = new Map(
    userPosition.status === "granted"
      ? pads.map((location) => [
          location.id,
          distanceInMeters(userPosition.position, location.coordinates),
        ])
      : [],
  );

  function updateSelection(id: string | null) {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("pad", id);
    else url.searchParams.delete("pad");
    // Next synchronizes native history with useSearchParams without remounting Leaflet.
    window.history.pushState(null, "", url.toString());
  }

  function selectLocation(location: Pad) {
    if (location.id !== selectedId) updateSelection(location.id);
  }

  function closeDetails() {
    restoreFocusTo.current = selected?.id ?? "";
    updateSelection(null);
  }

  // Runs after the re-render, when the desktop list is visible again. Map pins
  // are Leaflet DOM and a hidden list row can't take focus, so both fall back
  // to the heading.
  useEffect(() => {
    if (selectedId !== null || restoreFocusTo.current === null) return;
    const row = listButtons.current.get(restoreFocusTo.current);
    restoreFocusTo.current = null;
    const focusTarget = row?.offsetParent ? row : title.current;
    focusTarget?.focus({ preventScroll: true });
  }, [selectedId]);

  return (
    <section
      aria-labelledby="map-locations-title"
      onKeyDown={(event) => {
        if (event.key === "Escape" && selectedId !== null) {
          event.preventDefault();
          closeDetails();
        }
      }}
      className="flex min-h-0 flex-1 flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="map-locations-title"
          ref={title}
          tabIndex={-1}
          className="focus-visible:outline-neon-cyan rounded-sm text-sm text-white/60 focus-visible:outline-2"
        >
          {pads.length} Spielfelder
        </h2>
        <div
          role="group"
          aria-label="Ansicht"
          className="flex rounded-full border border-white/10 md:hidden"
        >
          {views.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={view === option.value}
              onClick={() => setView(option.value)}
              className={`focus-visible:outline-neon-cyan flex min-h-12 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-2 ${
                view === option.value
                  ? "bg-neon-cyan/15 text-neon-cyan"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <DynamicIcon name={option.icon} size={18} />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {selectedId !== null && !selected && (
        <div
          role="status"
          className="border-neon-yellow/30 bg-neon-yellow/10 flex items-center justify-between gap-3 rounded-2xl border py-1 pr-1 pl-4 text-sm"
        >
          <p>Dieses Spielfeld gibt es nicht (mehr).</p>
          <Button
            variant="ghost"
            tone="neutral"
            onClick={closeDetails}
            className="shrink-0 px-4 text-sm"
          >
            Schließen
          </Button>
        </div>
      )}

      <div className="bg-pixel-off relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 md:flex-row">
        {/* Both stay mounted, so the map keeps its zoom while the list is shown. */}
        <div
          className={`min-h-0 flex-1 flex-col md:w-80 md:flex-none md:border-r md:border-white/10 lg:w-96 ${
            view === "list" ? "flex" : "hidden"
          } ${selected ? "md:hidden" : "md:flex"}`}
        >
          <LocationList
            pads={pads}
            selectedId={selected?.id}
            distances={distances}
            userPosition={userPosition}
            buttonRefs={listButtons.current}
            onSelect={selectLocation}
          />
        </div>
        <div
          aria-label="Karte der Spielfelder in Münster"
          className={`relative min-h-0 flex-1 md:block ${view === "map" ? "" : "hidden"}`}
        >
          <div className="absolute inset-0 z-0">
            <GameMap
              pads={pads}
              selected={selected}
              onSelect={selectLocation}
            />
          </div>
          <MapLegend className="absolute top-3 right-3 z-10" />
        </div>
        {selected && (
          <GameDetailsPanel
            pad={selected}
            viewerId={viewerId}
            distance={distances.get(selected.id)}
            onClose={closeDetails}
          />
        )}
      </div>
    </section>
  );
}
