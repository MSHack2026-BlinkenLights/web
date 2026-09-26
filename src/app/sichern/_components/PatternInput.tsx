"use client";

import { type CSSProperties } from "react";

/** A pattern cell: index into the colors, or `null` while not yet tapped. */
export type PatternCell = number | null;

export interface PatternColor {
  hex: string;
  /** Spoken and shown name, so the pattern never relies on color alone. */
  name: string;
}

interface PatternInputProps {
  width: number;
  height: number;
  colors: readonly PatternColor[];
  value: readonly PatternCell[];
  onChange: (value: PatternCell[]) => void;
  /** Shakes the grid once, e.g. after a wrong attempt. Change the key to replay. */
  shakeKey?: number;
  disabled?: boolean;
}

/**
 * Tappable grid to copy the claim pattern from the pad. Each tap moves a cell
 * to the next color; untouched cells stay dark. Size-independent like
 * {@link PixelGrid}, and every cell is a button for keyboard use.
 */
export function PatternInput({
  width,
  height,
  colors,
  value,
  onChange,
  shakeKey = 0,
  disabled = false,
}: PatternInputProps) {
  const cycle = (index: number) => {
    const next = [...value];
    const current = next[index] ?? null;
    next[index] = current === null ? 0 : (current + 1) % colors.length;
    onChange(next);
  };

  return (
    <div
      key={shakeKey}
      role="group"
      aria-label={`Muster, ${width} × ${height} Felder`}
      className={`grid w-full ${shakeKey > 0 ? "motion-safe:animate-shake" : ""}`}
      style={{
        gap: `${Math.min(4, 16 / width)}%`,
        gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
        aspectRatio: `${width} / ${height}`,
      }}
    >
      {Array.from({ length: width * height }, (_, i) => {
        const cell = value[i] ?? null;
        const color = cell === null ? null : colors[cell];
        const row = Math.floor(i / width) + 1;
        const column = (i % width) + 1;
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => cycle(i)}
            aria-label={`Reihe ${row}, Spalte ${column}: ${color?.name ?? "noch leer"}`}
            className={`focus-visible:outline-neon-cyan aspect-square min-h-12 rounded-[18%] transition-[background-color,box-shadow,transform] focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-95 disabled:opacity-60 motion-reduce:transition-none ${
              color
                ? "bg-(--pixel-color) shadow-[0_0_1rem_var(--pixel-color),inset_0_0_0.5rem_rgb(255_255_255/0.35)]"
                : "bg-pixel-off border border-dashed border-white/20 hover:border-white/40"
            }`}
            style={
              color
                ? ({ "--pixel-color": color.hex } as CSSProperties)
                : undefined
            }
          />
        );
      })}
    </div>
  );
}
