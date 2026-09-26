import { type PixelColor } from "wbl/types/pad";
import { type CellChange, currentCells } from "wbl/utils/cells";

/**
 * Turns a game's cell history into the row-major pixels of a {@link PixelGrid}.
 *
 * @param grid - The pad's grid size.
 * @param history - The color changes, oldest first; black turns a cell off.
 * @returns One color per panel, `null` for off.
 */
export function cellsToPixels(
  grid: { width: number; height: number },
  history: readonly CellChange[],
) {
  const pixels = Array<PixelColor>(grid.width * grid.height).fill(null);
  for (const { x, y, colorHex } of currentCells(history).values()) {
    if (x < grid.width && y < grid.height) {
      pixels[y * grid.width + x] = colorHex;
    }
  }
  return pixels;
}
