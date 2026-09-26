import { applyPalette, GIFEncoder, quantize } from "gifenc";

import { OFF_HEX } from "./cells";

const SURFACE_COLOR = "#0e0f14";
const OFF_COLOR = "#1c1e27";
const TARGET_WIDTH = 480;
const MAX_FRAMES = 80;
const FRAME_DELAY_MS = 120;
const END_DELAY_MS = 2000;

/** A color change of a cell as stored in the game data. */
export interface ReplayCell {
  x: number;
  y: number;
  colorHex: string;
  createdAt: Date;
}

/**
 * Groups changes into frames, keeping their order. Changes from the same
 * millisecond share a frame; long games are bundled into at most `MAX_FRAMES`
 * frames. Within a frame, later changes of a cell win.
 */
function toFrames(cells: readonly ReplayCell[]) {
  const moments: ReplayCell[][] = [];
  for (const cell of cells) {
    const last = moments.at(-1);
    if (last?.[0]?.createdAt.getTime() === cell.createdAt.getTime()) {
      last.push(cell);
    } else {
      moments.push([cell]);
    }
  }
  const perFrame = Math.ceil(moments.length / MAX_FRAMES);
  const frames: ReplayCell[][] = [];
  for (let i = 0; i < moments.length; i += perFrame) {
    frames.push(moments.slice(i, i + perFrame).flat());
  }
  return frames;
}

/**
 * Renders an animated GIF that replays a game: an empty grid first, then every
 * color change in the order it happened, black turning a cell off, and the
 * final picture holds before it loops. Runs entirely in the browser.
 *
 * @param grid - The controller's grid size.
 * @param cells - The game's color changes, oldest first (sorted by UUIDv7 ID).
 * @returns The GIF image.
 */
export function renderReplayGif(
  grid: { width: number; height: number },
  cells: readonly ReplayCell[],
) {
  const pitch = Math.max(8, Math.floor(TARGET_WIDTH / grid.width));
  const gap = Math.max(1, Math.round(pitch * 0.12));
  const size = pitch - gap;
  const canvas = document.createElement("canvas");
  canvas.width = grid.width * pitch + gap;
  canvas.height = grid.height * pitch + gap;
  const context = canvas.getContext("2d", { willReadFrequently: true })!;

  const drawCell = (x: number, y: number, color: string) => {
    context.fillStyle = color.toUpperCase() === OFF_HEX ? OFF_COLOR : color;
    context.beginPath();
    context.roundRect(
      gap + x * pitch,
      gap + y * pitch,
      size,
      size,
      size * 0.18,
    );
    context.fill();
  };
  const snapshot = () =>
    context.getImageData(0, 0, canvas.width, canvas.height).data;

  context.fillStyle = SURFACE_COLOR;
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) drawCell(x, y, OFF_COLOR);
  }
  const empty = snapshot();

  // One palette for every frame: draw each color that ever appears on the
  // grid's cells, so edge blends against the background are sampled too.
  const colors = [...new Set(cells.map((cell) => cell.colorHex.toUpperCase()))];
  const cellCount = grid.width * grid.height;
  const samples = [empty];
  for (let start = 0; start < colors.length; start += cellCount) {
    const batch = colors.slice(start, start + cellCount);
    context.fillStyle = SURFACE_COLOR;
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < cellCount; i++) {
      drawCell(
        i % grid.width,
        Math.floor(i / grid.width),
        batch[i % batch.length]!,
      );
    }
    samples.push(snapshot());
  }
  const combined = new Uint8ClampedArray(empty.length * samples.length);
  samples.forEach((sample, i) => combined.set(sample, i * empty.length));
  const palette = quantize(combined, 256);

  const gif = GIFEncoder();
  const frames = toFrames(cells);
  const write = (rgba: Uint8ClampedArray, delay: number) =>
    gif.writeFrame(applyPalette(rgba, palette), canvas.width, canvas.height, {
      palette,
      delay,
    });

  context.putImageData(new ImageData(empty, canvas.width), 0, 0);
  write(empty, FRAME_DELAY_MS * 3);
  frames.forEach((frame, i) => {
    for (const cell of frame) drawCell(cell.x, cell.y, cell.colorHex);
    write(snapshot(), i === frames.length - 1 ? END_DELAY_MS : FRAME_DELAY_MS);
  });
  gif.finish();

  return new Blob([gif.bytes()], { type: "image/gif" });
}
