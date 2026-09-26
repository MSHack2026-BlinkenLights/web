import { announcePadChange } from "wbl/server/bridge";
import { db as defaultDb } from "wbl/server/db";
import { Prisma, type PrismaClient } from "../../../generated/prisma";
import { mapPrismaError, sanitizeId, ServiceError } from "./common";

/**
 * Starts a game on a controller. Fails if the game type needs a bigger grid
 * than the controller has, or if the controller already runs a game.
 *
 * Runs serializable so two concurrent starts can't both pass the
 * "no running game" check.
 */
export async function startGame(
  input: { controllerId: string; gameTypeId: string },
  db: PrismaClient = defaultDb,
) {
  const controllerId = sanitizeId(input.controllerId, "controllerId");
  const gameTypeId = sanitizeId(input.gameTypeId, "gameTypeId");

  try {
    const game = await db.$transaction(
      async (tx) => {
        const [controller, gameType, running] = await Promise.all([
          tx.controller.findUnique({ where: { id: controllerId } }),
          tx.gameType.findUnique({ where: { id: gameTypeId } }),
          tx.game.findFirst({ where: { controllerId, endedAt: null } }),
        ]);

        if (!controller) {
          throw new ServiceError("NOT_FOUND", "Controller not found");
        }
        if (!gameType) {
          throw new ServiceError("NOT_FOUND", "Game type not found");
        }
        if (
          gameType.requiredWidth > controller.width ||
          gameType.requiredHeight > controller.height
        ) {
          throw new ServiceError(
            "BAD_REQUEST",
            `Game type needs ${gameType.requiredWidth}x${gameType.requiredHeight}, controller is ${controller.width}x${controller.height}`,
          );
        }
        if (running) {
          throw new ServiceError(
            "CONFLICT",
            `Controller already runs game ${running.id}; end it first`,
          );
        }

        return tx.game.create({
          data: { controllerId, gameTypeId, startedAt: new Date() },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    announcePadChange(controllerId);
    return game;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    mapPrismaError(error);
  }
}

/** Ends a running game. Only matches games not yet ended, so ending twice fails. */
export async function endGame(rawId: string, db: PrismaClient = defaultDb) {
  const id = sanitizeId(rawId);
  const running = await db.game.findFirst({
    where: { id, endedAt: null },
    select: { controllerId: true },
  });
  const { count } = await db.game.updateMany({
    where: { id, endedAt: null },
    data: { endedAt: new Date() },
  });
  if (count > 0 && running) announcePadChange(running.controllerId);
  if (count === 0) {
    const exists = await db.game.count({ where: { id } });
    throw exists
      ? new ServiceError("CONFLICT", "Game already ended")
      : new ServiceError("NOT_FOUND", "Game not found");
  }
}
