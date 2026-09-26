import { type PixelColor } from "wbl/types/pad";

/**
 * Turns stored game cells into the row-major pixels of a {@link PixelGrid}.
 *
 * @param grid - The pad's grid size.
 * @param cells - The cells that are set; black counts as off.
 * @returns One color per panel, `null` for off.
 */
export function cellsToPixels(
  grid: { width: number; height: number },
  cells: readonly { x: number; y: number; colorHex: string }[],
) {
  const pixels = Array<PixelColor>(grid.width * grid.height).fill(null);
  for (const { x, y, colorHex } of cells) {
    if (x < grid.width && y < grid.height && colorHex !== "#000000") {
      pixels[y * grid.width + x] = colorHex;
    }
  }
  return pixels;
}
