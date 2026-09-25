"use client";

import { PixelGrid } from "wbl/app/_components/PixelGrid";
import { BOARD_LAYOUT, type Lane } from "wbl/lib/rhythm/engine";

const SYMBOLS: Record<Lane, string> = {
  left: "←",
  down: "↓",
  up: "↑",
  right: "→",
};
const LANES = Object.keys(BOARD_LAYOUT) as Lane[];

interface RhythmBoardProps {
  pixels: readonly (string | null)[];
  held: readonly Lane[];
  active: boolean;
  onPress: (lane: Lane) => void;
  onRelease: (lane: Lane) => void;
}

/** Browser adapter: the real installation replaces these buttons with floor sensors. */
export function RhythmBoard({
  pixels,
  held,
  active,
  onPress,
  onRelease,
}: RhythmBoardProps) {
  return (
    <div className="relative mx-auto w-full max-w-[28rem]">
      <PixelGrid
        width={3}
        height={3}
        pixels={pixels}
        animate={false}
        label="Rhythm board: cyan brightens before a step, white means step now, green means hit, red means miss"
      />
      <div className="pointer-events-none absolute inset-0 grid grid-cols-3 gap-[4%]">
        {Array.from({ length: 9 }, (_, index) => {
          const lane = LANES.find((value) => BOARD_LAYOUT[value] === index);
          if (!lane) return <div key={index} aria-hidden="true" />;
          return (
            <button
              key={index}
              type="button"
              data-lane={lane}
              aria-label={`Step ${lane}`}
              aria-pressed={held.includes(lane)}
              disabled={!active}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                onPress(lane);
              }}
              onPointerUp={() => onRelease(lane)}
              onPointerCancel={() => onRelease(lane)}
              onLostPointerCapture={() => onRelease(lane)}
              onBlur={() => onRelease(lane)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (!event.repeat) onPress(lane);
                }
              }}
              onKeyUp={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onRelease(lane);
                }
              }}
              onClick={(event) => {
                // Keyboard/assistive activation has no preceding pointer-down.
                if (event.detail === 0) {
                  onPress(lane);
                  onRelease(lane);
                }
              }}
              className={`pointer-events-auto flex touch-none flex-col items-center justify-center rounded-[18%] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-cyan-200 ${held.includes(lane) ? "ring-4 ring-white" : ""}`}
            >
              <span
                aria-hidden="true"
                className="rounded-xl bg-black/60 px-3 py-1 text-3xl text-white sm:text-4xl"
              >
                {SYMBOLS[lane]}
              </span>
              <span className="sr-only">{lane}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
