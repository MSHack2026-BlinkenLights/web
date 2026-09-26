"use client";

import { useRef } from "react";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { PixelFrame } from "wbl/app/_components/PixelFrame";
import { PixelGrid } from "wbl/app/_components/PixelGrid";
import { Button } from "wbl/app/_components/ui/button";
import { useLivePanels } from "wbl/app/_components/use-live-panels";

import { PAD_STATUS, type Pad } from "./pads";

/** The pad's LED grid as the controller reports it, updated live. */
export function LivePadPreview({ pad }: { pad: Pad }) {
  const panels = useLivePanels(pad.id);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const width = panels?.width ?? pad.width;
  const height = panels?.height ?? pad.height;
  const offline = panels ? !panels.online : pad.status === "offline";
  const isPlaying = !offline && pad.status === "playing";
  const frameColor = isPlaying
    ? PAD_STATUS.playing.color
    : "rgb(255 255 255 / 0.15)";

  const gridLabel = !panels
    ? "Spielfeld wird geladen"
    : offline
      ? `Letzter bekannter Stand, ${width} mal ${height} LED-Raster`
      : `Live-Stand, ${width} mal ${height} LED-Raster`;

  const offlineHint = panels && offline && (
    <p className="text-xs text-white/50">
      Offline: zeigt den letzten bekannten Stand.
    </p>
  );

  function renderGrid() {
    return (
      <PixelGrid
        width={width}
        height={height}
        pixels={panels?.pixels}
        pending={!panels}
        label={gridLabel}
        className={offline ? "opacity-50" : ""}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <PixelFrame color={frameColor} className="mx-auto w-full max-w-56">
        <div className="bg-surface p-3">{renderGrid()}</div>
      </PixelFrame>
      {offlineHint}
      <Button
        variant="ghost"
        tone="neutral"
        icon="Expand"
        onClick={() => dialogRef.current?.showModal()}
        className="mx-auto px-5 text-sm"
      >
        Vollbild
      </Button>

      {/* Top layer: covers map, header and bottom bar. */}
      <dialog
        ref={dialogRef}
        aria-labelledby={`live-pad-fullscreen-${pad.id}`}
        // The explorer closes the details on Escape; here it only closes the dialog.
        onKeyDown={(event) => {
          if (event.key === "Escape") event.stopPropagation();
        }}
        className="bg-surface m-0 h-dvh max-h-none w-dvw max-w-none p-0 text-white backdrop:bg-black"
      >
        <div className="max-w-page mx-auto flex h-full flex-col gap-4 px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <header className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2
                id={`live-pad-fullscreen-${pad.id}`}
                className="truncate text-xl font-bold"
              >
                {pad.name}
              </h2>
              <p className="truncate text-sm text-white/60">{pad.location}</p>
            </div>
            <button
              type="button"
              aria-label="Vollbild schließen"
              onClick={() => dialogRef.current?.close()}
              className="focus-visible:outline-neon-cyan -mr-2 flex size-12 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2"
            >
              <DynamicIcon name="Collapse" size={24} />
            </button>
          </header>
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3">
            {/* Fit the grid into the remaining height, keeping its aspect ratio. */}
            <div
              className="w-full"
              style={{
                maxWidth: `calc((100dvh - 12rem - env(safe-area-inset-top) - env(safe-area-inset-bottom)) * ${width} / ${height})`,
              }}
            >
              <PixelFrame color={frameColor}>
                <div className="bg-surface p-3 md:p-6">{renderGrid()}</div>
              </PixelFrame>
            </div>
            {offlineHint}
          </div>
        </div>
      </dialog>
    </div>
  );
}
