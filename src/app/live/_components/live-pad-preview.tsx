"use client";

import { useRef } from "react";

import { PixelFrame } from "wbl/app/_components/PixelFrame";
import { PixelGrid } from "wbl/app/_components/PixelGrid";
import { Button } from "wbl/app/_components/ui/button";
import { useLivePanels } from "wbl/app/_components/use-live-panels";

import { LivePadFullscreen, type LiveConnection } from "./live-pad-fullscreen";
import { PAD_STATUS, type Pad } from "./pads";

/** The pad's LED grid as the controller reports it, updated live. */
export function LivePadPreview({ pad }: { pad: Pad }) {
  const panels = useLivePanels(pad.id);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const width = panels?.width ?? pad.width;
  const height = panels?.height ?? pad.height;
  const offline = panels ? !panels.online : pad.status === "offline";
  const isPlaying = !offline && pad.status === "playing";
  const connection: LiveConnection = offline
    ? "offline"
    : panels
      ? "live"
      : "connecting";

  const gridLabel = !panels
    ? "Spielfeld wird geladen"
    : offline
      ? `Letzter bekannter Stand, ${width} mal ${height} LED-Raster`
      : `Live-Stand, ${width} mal ${height} LED-Raster`;

  const grid = (
    <PixelGrid
      width={width}
      height={height}
      pixels={panels?.pixels}
      pending={!panels}
      label={gridLabel}
      className={offline ? "opacity-50" : ""}
    />
  );

  return (
    <div className="flex flex-col gap-3">
      <PixelFrame
        color={isPlaying ? PAD_STATUS.playing.color : "rgb(255 255 255 / 0.15)"}
        className="mx-auto w-full max-w-56"
      >
        <div className="bg-surface p-3">{grid}</div>
      </PixelFrame>
      {panels && offline && (
        <p className="text-xs text-white/50">
          Offline: zeigt den letzten bekannten Stand.
        </p>
      )}
      <Button
        variant="ghost"
        tone="neutral"
        icon="Expand"
        onClick={() => dialogRef.current?.showModal()}
        className="mx-auto px-5 text-sm"
      >
        Vollbild
      </Button>

      <LivePadFullscreen
        dialogRef={dialogRef}
        pad={pad}
        connection={connection}
        width={width}
        height={height}
        grid={grid}
      />
    </div>
  );
}
