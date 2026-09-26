import { db as defaultDb } from "wbl/server/db";
import {
  type DbClient,
  sanitizeColorHex,
  sanitizeId,
  sanitizeSmallInt,
  ServiceError,
} from "./common";
import { createUuidV7 } from "./uuid";

export interface PixelInput {
  x: number;
  y: number;
  /** "#RRGGBB", "#RGB", with or without "#". */
  colorHex: string;
}

/** Loads a game's grid size and checks it is still running, so ended games stay frozen. */
async function getRunningGrid(gameId: string, db: DbClient) {
  const game = await db.game.findUnique({
    where: { id: gameId },
    select: {
      endedAt: true,
      controller: { select: { width: true, height: true } },
    },
  });
  if (!game) throw new ServiceError("NOT_FOUND", "Game not found");
  if (game.endedAt) throw new ServiceError("CONFLICT", "Game already ended");
  return game.controller;
}

/** Validates a pixel against a grid and normalizes its color. */
export function sanitizePixel(
  pixel: PixelInput,
  grid: { width: number; height: number },
) {
  const x = sanitizeSmallInt(pixel.x, "x", 0);
  const y = sanitizeSmallInt(pixel.y, "y", 0);
  if (x >= grid.width || y >= grid.height) {
    throw new ServiceError(
      "BAD_REQUEST",
      `Pixel (${x}, ${y}) outside ${grid.width}x${grid.height} grid`,
    );
  }
  return {
    x,
    y,
    colorHex: sanitizeColorHex(pixel.colorHex),
  };
}

/**
 * Records color changes of cells in a running game. Every change is a new row,
 * so a cell keeps its history; `#000000` turns a cell off. Rows get UUIDv7
 * IDs in input order, so sorting by ID replays the changes exactly as sent,
 * even within one millisecond.
 *
 * @param rawGameId - The game's ID.
 * @param pixels - The changes, oldest first.
 * @param db - The client to use.
 * @returns The stored rows in input order.
 * @throws {ServiceError} `BAD_REQUEST` for an invalid color or a cell outside
 * the grid, `NOT_FOUND` if the game does not exist, `CONFLICT` if it has ended.
 */
export async function setPixels(
  rawGameId: string,
  pixels: PixelInput[],
  db: DbClient = defaultDb,
) {
  const gameId = sanitizeId(rawGameId, "gameId");
  const grid = await getRunningGrid(gameId, db);
  return createPixelRows(
    gameId,
    pixels.map((pixel) => sanitizePixel(pixel, grid)),
    db,
  );
}

/**
 * Inserts already validated cell changes with ascending UUIDv7 IDs.
 *
 * @param gameId - The game's ID.
 * @param pixels - The sanitized changes, oldest first.
 * @param db - The client to use.
 * @returns The stored rows in input order.
 */
export async function createPixelRows(
  gameId: string,
  pixels: { x: number; y: number; colorHex: string }[],
  db: DbClient,
) {
  const rows = pixels.map((pixel) => ({
    ...createUuidV7(),
    gameId,
    ...pixel,
  }));
  const saved = await db.gameData.createManyAndReturn({ data: rows });
  return saved.sort((a, b) => a.id.localeCompare(b.id));
}

export async function setPixel(
  gameId: string,
  pixel: PixelInput,
  db: DbClient = defaultDb,
) {
  const [saved] = await setPixels(gameId, [pixel], db);
  return saved!;
}

/** Removes all cells of a running game; returns how many were removed. */
export async function clearPixels(rawGameId: string, db: DbClient = defaultDb) {
  const gameId = sanitizeId(rawGameId, "gameId");
  await getRunningGrid(gameId, db);
  const { count } = await db.gameData.deleteMany({ where: { gameId } });
  return count;
}
