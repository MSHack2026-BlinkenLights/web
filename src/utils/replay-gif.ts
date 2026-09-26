import { applyPalette, GIFEncoder, quantize } from "gifenc";

const SURFACE_COLOR = "#0e0f14";
const OFF_COLOR = "#1c1e27";
const TARGET_WIDTH = 480;
const MAX_FRAMES = 80;
const FRAME_DELAY_MS = 120;
const END_DELAY_MS = 2000;

/** A cell as stored in the game data. */
export interface ReplayCell {
  x: number;
  y: number;
  colorHex: string;
  createdAt: Date;
}

/**
 * Groups cells into frames in the order they were set. Cells set at the same
 * moment share a frame; long games are bundled into at most `MAX_FRAMES` frames.
 */
function toFrames(cells: readonly ReplayCell[]) {
  const sorted = [...cells].sort(
    (a, b) =>
      a.createdAt.getTime() - b.createdAt.getTime() || a.y - b.y || a.x - b.x,
  );
  const moments: ReplayCell[][] = [];
  for (const cell of sorted) {
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
 * Renders an animated GIF that replays a game: an empty grid first, then the
 * cells appear in the order they were set, and the final picture holds before
 * it loops. Runs entirely in the browser.
 *
 * @param grid - The controller's grid size.
 * @param cells - The game's cells; only the final color of each cell is known.
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
    context.fillStyle = color;
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

  // Draw the final picture first to build one palette for every frame.
  context.fillStyle = SURFACE_COLOR;
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) drawCell(x, y, OFF_COLOR);
  }
  const empty = snapshot();
  for (const cell of cells) drawCell(cell.x, cell.y, cell.colorHex);
  const palette = quantize(snapshot(), 256);

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
