"use client";

import { useEffect, useState } from "react";

import { PixelFrame } from "wbl/app/_components/PixelFrame";
import { PixelGrid } from "wbl/app/_components/PixelGrid";
import { Button } from "wbl/app/_components/ui/button";

import { PAD_STATUS, type Pad } from "./pads";

// Theme tokens instead of hex: the grid only uses them as CSS colors.
const DEMO_COLORS = [
  "var(--color-neon-cyan)",
  "var(--color-neon-magenta)",
  "var(--color-neon-yellow)",
  "var(--color-neon-green)",
];

/** Local animation only: no game ID is passed to the hardware/pad API. */
export function DemoGamePreview({ pad }: { pad: Pad }) {
  const { id, width, height, status } = pad;
  const isPlaying = status === "playing";
  const [frame, setFrame] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPaused(preference.matches);
    const onChange = () => setPaused(preference.matches);
    preference.addEventListener("change", onChange);
    return () => preference.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (paused || !isPlaying) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setFrame((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [paused, isPlaying]);

  const seed = [...id].reduce(
    (sum, character) => sum + character.charCodeAt(0),
    0,
  );
  const size = width * height;
  const pixels: (string | null)[] = isPlaying
    ? Array.from({ length: size }, (_, index) => {
        const position = (index + frame + seed) % size;
        return position < width
          ? (DEMO_COLORS[(seed + position) % DEMO_COLORS.length] ?? null)
          : null;
      })
    : [];

  const gridLabel = isPlaying
    ? `Simulierter Spielstand, ${width} mal ${height} LED-Raster`
    : `${width} mal ${height} LED-Raster, ${PAD_STATUS[status].label}`;

  return (
    <div className="flex flex-col gap-3">
      <PixelFrame
        color={isPlaying ? PAD_STATUS.playing.color : "rgb(255 255 255 / 0.15)"}
        className="mx-auto w-full max-w-56"
      >
        <div className="bg-surface p-3">
          <PixelGrid
            width={width}
            height={height}
            pixels={pixels}
            label={gridLabel}
          />
        </div>
      </PixelFrame>

      {isPlaying && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-white/50">
            Demo-Animation, keine echten Spieldaten.
          </p>
          <Button
            variant="ghost"
            tone="neutral"
            icon={paused ? "Play" : "Pause"}
            onClick={() => setPaused((value) => !value)}
            className="shrink-0 px-4 text-sm"
          >
            {paused ? "Abspielen" : "Pausieren"}
          </Button>
        </div>
      )}
    </div>
  );
}
