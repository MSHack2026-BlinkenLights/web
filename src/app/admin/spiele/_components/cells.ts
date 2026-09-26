/** Stored color of a cell that is off. */
export const OFF_HEX = "#000000";

/** A color change of a cell as stored in the game data. */
export interface CellChange {
  x: number;
  y: number;
  colorHex: string;
}

/**
 * Current color of every lit cell, from the history of changes.
 *
 * @param history - The changes, oldest first.
 * @returns The latest change per lit cell, keyed by `"x,y"`; cells turned off are left out.
 */
export function currentCells<T extends CellChange>(history: readonly T[]) {
  const cells = new Map<string, T>();
  for (const change of history) {
    const key = `${change.x},${change.y}`;
    if (change.colorHex.toUpperCase() === OFF_HEX) cells.delete(key);
    else cells.set(key, change);
  }
  return cells;
}
