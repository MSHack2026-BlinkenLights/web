"use client";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { Button } from "wbl/app/_components/ui/button";

import { PadSummary } from "./pad-summary";
import { type Pad } from "./pads";
import { type useUserPosition } from "./use-user-position";

interface LocationListProps {
  pads: Pad[];
  selectedId: string | undefined;
  /** Distance per location ID in meters; empty until the position is known. */
  distances: Map<string, number>;
  userPosition: ReturnType<typeof useUserPosition>;
  /** Filled with each row's button, so closing the details can restore focus. */
  buttonRefs: Map<string, HTMLButtonElement>;
  onSelect: (pad: Pad) => void;
}

const positionHints: Partial<
  Record<ReturnType<typeof useUserPosition>["status"], string>
> = {
  denied: "Standortfreigabe abgelehnt – die Liste ist alphabetisch sortiert.",
  unavailable: "Dein Standort ist gerade nicht verfügbar.",
};

/** All pads as a list, sorted by distance once the visitor shares their position. */
export function LocationList({
  pads,
  selectedId,
  distances,
  userPosition,
  buttonRefs,
  onSelect,
}: LocationListProps) {
  const locations = [...pads].sort(
    (a, b) =>
      (distances.get(a.id) ?? 0) - (distances.get(b.id) ?? 0) ||
      a.name.localeCompare(b.name, "de"),
  );
  const hint = positionHints[userPosition.status];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      {userPosition.status !== "granted" && (
        <div className="mb-3 flex flex-col gap-2">
          <Button
            variant="outline"
            tone="neutral"
            icon="Position"
            isPending={userPosition.status === "pending"}
            onClick={userPosition.request}
            className="text-sm"
          >
            Nach Entfernung sortieren
          </Button>
          <p className="text-center text-xs text-white/50">
            {hint ??
              "Dein Standort wird nur auf deinem Gerät verwendet und nicht gespeichert."}
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {locations.map((location) => {
          const distance = distances.get(location.id);
          const isSelected = location.id === selectedId;

          return (
            <li key={location.id}>
              <button
                ref={(element) => {
                  if (element) buttonRefs.set(location.id, element);
                  else buttonRefs.delete(location.id);
                }}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelect(location)}
                className={`focus-visible:outline-neon-cyan flex min-h-16 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-2 ${
                  isSelected
                    ? "border-neon-cyan/60 bg-neon-cyan/10"
                    : "bg-surface border-white/10 hover:bg-white/5"
                }`}
              >
                <PadSummary pad={location} distance={distance} />
                <DynamicIcon
                  name="NavArrowRight"
                  size={20}
                  className="shrink-0 text-white/40"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
