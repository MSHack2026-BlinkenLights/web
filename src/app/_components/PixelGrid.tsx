import { type CSSProperties } from "react";

import { type PixelColor } from "wbl/types/pad";

interface PixelGridProps {
  width: number;
  height: number;
  /** Row-major colors, length = width * height. Missing entries render as off. */
  pixels?: readonly PixelColor[];
  /** Shows the pulsing loading state instead of colors. */
  pending?: boolean;
  /** Disable interpolation for time-critical output, e.g. rhythm-game cues. */
  animate?: boolean;
  label: string;
  className?: string;
}

/**
 * Size-independent, read-only LED grid. Works as a server component;
 * wrap it in a client component for live data (see `LivePadGrid`).
 */
export function PixelGrid({
  width,
  height,
  pixels = [],
  pending = false,
  animate = true,
  label,
  className = "",
}: PixelGridProps) {
  const cells = Array.from({ length: width * height }, (_, i) =>
    pending ? null : (pixels[i] ?? null),
  );

  return (
    <div
      role="img"
      aria-label={label}
      aria-busy={pending || undefined}
      className={`grid w-full gap-[4%] ${className}`}
      style={{
        gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
        aspectRatio: `${width} / ${height}`,
      }}
    >
      {cells.map((color, i) => (
        <div
          key={i}
          className={`aspect-square rounded-[18%] ${animate ? "motion-safe:transition-[background-color,box-shadow] motion-safe:duration-300" : ""} ${
            color
              ? "bg-(--pixel-color) shadow-[0_0_1rem_var(--pixel-color),inset_0_0_0.5rem_rgb(255_255_255/0.35)]"
              : "bg-pixel-off"
          } ${pending ? "motion-safe:animate-pulse" : ""}`}
          style={
            color
              ? ({ "--pixel-color": color } as CSSProperties)
              : pending
                ? {
                    animationDelay: `${(i % width) * 150 + Math.floor(i / width) * 150}ms`,
                  }
                : undefined
          }
        />
      ))}
    </div>
  );
}
