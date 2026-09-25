import { db as defaultDb } from "wbl/server/db";
import {
  type DbClient,
  sanitizeColorHex,
  sanitizeId,
  sanitizeSmallInt,
  ServiceError,
} from "./common";

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

function sanitizePixel(
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
 * Sets cells of a running game in one transaction. Each (x, y) holds one
 * value, so existing cells are overwritten; on duplicate (x, y) in the input
 * the last entry wins.
 */
export async function setPixels(
  rawGameId: string,
  pixels: PixelInput[],
  db: DbClient = defaultDb,
) {
  const gameId = sanitizeId(rawGameId, "gameId");
  const grid = await getRunningGrid(gameId, db);
  const deduped = [
    ...new Map(
      pixels
        .map((pixel) => sanitizePixel(pixel, grid))
        .map((pixel) => [`${pixel.x},${pixel.y}`, pixel] as const),
    ).values(),
  ];

  const write = (tx: DbClient) =>
    Promise.all(
      deduped.map(({ x, y, colorHex }) =>
        tx.gameData.upsert({
          where: { gameId_x_y: { gameId, x, y } },
          create: { gameId, x, y, colorHex },
          update: { colorHex },
        }),
      ),
    );

  // Reuse the caller's transaction if one was passed in.
  return "$transaction" in db ? db.$transaction(write) : write(db);
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
