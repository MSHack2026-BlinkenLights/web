/**
 * Tiny bitmap font for LED grids: 5 rows high, mostly 3 columns wide.
 * `#` is lit, `.` is off. Characters without a glyph render as a space.
 */
const GLYPHS: Record<string, readonly string[]> = {
  A: [".#.", "#.#", "###", "#.#", "#.#"],
  B: ["##.", "#.#", "##.", "#.#", "##."],
  C: [".##", "#..", "#..", "#..", ".##"],
  D: ["##.", "#.#", "#.#", "#.#", "##."],
  E: ["###", "#..", "##.", "#..", "###"],
  F: ["###", "#..", "##.", "#..", "#.."],
  G: [".##", "#..", "#.#", "#.#", ".##"],
  H: ["#.#", "#.#", "###", "#.#", "#.#"],
  I: ["###", ".#.", ".#.", ".#.", "###"],
  J: ["..#", "..#", "..#", "#.#", ".#."],
  K: ["#.#", "#.#", "##.", "#.#", "#.#"],
  L: ["#..", "#..", "#..", "#..", "###"],
  M: ["#...#", "##.##", "#.#.#", "#...#", "#...#"],
  N: ["#..#", "##.#", "#.##", "#..#", "#..#"],
  O: [".#.", "#.#", "#.#", "#.#", ".#."],
  P: ["##.", "#.#", "##.", "#..", "#.."],
  Q: [".#.", "#.#", "#.#", "##.", ".##"],
  R: ["##.", "#.#", "##.", "#.#", "#.#"],
  S: [".##", "#..", ".#.", "..#", "##."],
  T: ["###", ".#.", ".#.", ".#.", ".#."],
  U: ["#.#", "#.#", "#.#", "#.#", "###"],
  V: ["#.#", "#.#", "#.#", "#.#", ".#."],
  W: ["#...#", "#...#", "#.#.#", "##.##", "#...#"],
  X: ["#.#", "#.#", ".#.", "#.#", "#.#"],
  Y: ["#.#", "#.#", ".#.", ".#.", ".#."],
  Z: ["###", "..#", ".#.", "#..", "###"],
  Ä: ["#.#", "...", "###", "#.#", "#.#"],
  Ö: ["#.#", "...", "###", "#.#", "###"],
  Ü: ["#.#", "...", "#.#", "#.#", "###"],
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["##.", "..#", ".#.", "#..", "###"],
  "3": ["##.", "..#", ".#.", "..#", "##."],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "##.", "..#", "##."],
  "6": [".##", "#..", "###", "#.#", "###"],
  "7": ["###", "..#", ".#.", ".#.", ".#."],
  "8": ["###", "#.#", "###", "#.#", "###"],
  "9": ["###", "#.#", "###", "..#", "##."],
  " ": ["..", "..", "..", "..", ".."],
  "!": ["#", "#", "#", ".", "#"],
  "?": ["##.", "..#", ".#.", "...", ".#."],
  ".": [".", ".", ".", ".", "#"],
  ":": [".", "#", ".", "#", "."],
  "-": ["...", "...", "###", "...", "..."],
};

export const PIXEL_FONT_HEIGHT = 5;

/** A row-major pixel bitmap, ready for `PixelGrid`. */
export interface PixelBitmap {
  width: number;
  height: number;
  pixels: (string | null)[];
}

/**
 * Turns `#`/`.` rows into a bitmap, e.g. for small pixel icons.
 *
 * @param rows - Equally long rows, `#` lit and anything else off.
 * @param color - Any CSS color for the lit pixels.
 * @returns The bitmap.
 */
export function bitmapFromRows(
  rows: readonly string[],
  color: string,
): PixelBitmap {
  const width = Math.max(0, ...rows.map((row) => row.length));
  const pixels = rows.flatMap((row) =>
    Array.from({ length: width }, (_, x) => (row[x] === "#" ? color : null)),
  );
  return { width, height: rows.length, pixels };
}

/**
 * Renders text in the bitmap font, one column between characters.
 *
 * @param text - The text; it is upper-cased.
 * @param colors - CSS colors, cycled per character.
 * @param paddingY - Empty rows above and below the text.
 * @returns The bitmap.
 */
export function textToBitmap(
  text: string,
  colors: readonly string[],
  paddingY = 0,
): PixelBitmap {
  const glyphs = [...text.toUpperCase()].map(
    (char) => GLYPHS[char] ?? GLYPHS[" "]!,
  );
  const columns: (string | null)[][] = [];
  glyphs.forEach((glyph, index) => {
    if (index > 0) columns.push(Array<null>(PIXEL_FONT_HEIGHT).fill(null));
    const color = colors[index % colors.length] ?? null;
    for (let x = 0; x < (glyph[0]?.length ?? 0); x++) {
      columns.push(glyph.map((row) => (row[x] === "#" ? color : null)));
    }
  });

  const height = PIXEL_FONT_HEIGHT + paddingY * 2;
  const pixels: (string | null)[] = [];
  for (let y = 0; y < height; y++) {
    const glyphY = y - paddingY;
    for (const column of columns) pixels.push(column[glyphY] ?? null);
  }
  return { width: columns.length, height, pixels };
}

/**
 * A `width`-column window of a bitmap starting at column `offset`; columns
 * outside the bitmap are off. Used for scrolling text.
 */
export function sliceBitmap(
  bitmap: PixelBitmap,
  offset: number,
  width: number,
): PixelBitmap {
  const pixels: (string | null)[] = [];
  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < width; x++) {
      const sourceX = offset + x;
      pixels.push(
        sourceX >= 0 && sourceX < bitmap.width
          ? (bitmap.pixels[y * bitmap.width + sourceX] ?? null)
          : null,
      );
    }
  }
  return { width, height: bitmap.height, pixels };
}
