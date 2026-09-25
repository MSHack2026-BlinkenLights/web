import { db as defaultDb } from "wbl/server/db";
import { Prisma, type PrismaClient } from "../../../generated/prisma";
import {
  type DbClient,
  mapPrismaError,
  sanitizeId,
  sanitizeOptionalText,
  ServiceError,
} from "./common";

const MINUTE = 60 * 1000;

/** How far back a start may lie (for "I'm here right now" entries). */
const MAX_START_IN_PAST = 15 * MINUTE;
/** How far ahead an entry may be planned. */
const MAX_START_IN_FUTURE = 30 * 24 * 60 * MINUTE;
export const MIN_DURATION_MINUTES = 15;
export const MAX_DURATION_MINUTES = 4 * 60;
const NOTE_MAX_LENGTH = 200;

export interface PlayRequestInput {
  controllerId: string;
  gameTypeId: string;
  startsAt: Date;
  durationMinutes: number;
  openSlots: number;
  note?: string | null;
}

/** Entries that have not ended yet, soonest first. Only public user fields are selected. */
export async function listPlayRequests(
  filter: { controllerId?: string; gameTypeId?: string },
  now = new Date(),
  db: DbClient = defaultDb,
) {
  return db.playRequest.findMany({
    where: {
      endsAt: { gt: now },
      ...(filter.controllerId && {
        controllerId: sanitizeId(filter.controllerId, "controllerId"),
      }),
      ...(filter.gameTypeId && {
        gameTypeId: sanitizeId(filter.gameTypeId, "gameTypeId"),
      }),
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    take: 100,
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      openSlots: true,
      note: true,
      host: { select: { id: true, name: true } },
      controller: { select: { id: true, name: true, location: true } },
      gameType: { select: { id: true, name: true } },
      participants: {
        orderBy: { joinedAt: "asc" },
        select: { user: { select: { id: true, name: true } } },
      },
    },
  });
}

/**
 * Creates an entry. The game must fit the controller's grid and allow the
 * host plus `openSlots` others.
 */
export async function createPlayRequest(
  hostId: string,
  input: PlayRequestInput,
  now = new Date(),
  db: DbClient = defaultDb,
) {
  const controllerId = sanitizeId(input.controllerId, "controllerId");
  const gameTypeId = sanitizeId(input.gameTypeId, "gameTypeId");

  const startsAt = input.startsAt;
  if (Number.isNaN(startsAt.getTime())) {
    throw new ServiceError("BAD_REQUEST", "startsAt is not a valid date");
  }
  if (startsAt.getTime() < now.getTime() - MAX_START_IN_PAST) {
    throw new ServiceError("BAD_REQUEST", "startsAt lies in the past");
  }
  if (startsAt.getTime() > now.getTime() + MAX_START_IN_FUTURE) {
    throw new ServiceError("BAD_REQUEST", "startsAt is too far ahead");
  }
  const { durationMinutes } = input;
  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < MIN_DURATION_MINUTES ||
    durationMinutes > MAX_DURATION_MINUTES
  ) {
    throw new ServiceError(
      "BAD_REQUEST",
      `durationMinutes must be between ${MIN_DURATION_MINUTES} and ${MAX_DURATION_MINUTES}`,
    );
  }

  const note = sanitizeOptionalText(input.note);
  if (note && note.length > NOTE_MAX_LENGTH) {
    throw new ServiceError(
      "BAD_REQUEST",
      `note must be at most ${NOTE_MAX_LENGTH} characters`,
    );
  }

  const [controller, gameType] = await Promise.all([
    db.controller.findUnique({ where: { id: controllerId } }),
    db.gameType.findUnique({ where: { id: gameTypeId } }),
  ]);
  if (!controller) throw new ServiceError("NOT_FOUND", "Controller not found");
  if (!gameType) throw new ServiceError("NOT_FOUND", "Game type not found");
  if (
    gameType.requiredWidth > controller.width ||
    gameType.requiredHeight > controller.height
  ) {
    throw new ServiceError(
      "BAD_REQUEST",
      `Game type needs ${gameType.requiredWidth}x${gameType.requiredHeight}, controller is ${controller.width}x${controller.height}`,
    );
  }
  // The host takes one seat, so at least one and at most maxPlayers - 1 are left.
  const maxOpenSlots = gameType.maxPlayers - 1;
  if (
    !Number.isInteger(input.openSlots) ||
    input.openSlots < 1 ||
    input.openSlots > maxOpenSlots
  ) {
    throw new ServiceError(
      "BAD_REQUEST",
      maxOpenSlots < 1
        ? "Game type is single player"
        : `openSlots must be between 1 and ${maxOpenSlots}`,
    );
  }

  try {
    return await db.playRequest.create({
      data: {
        hostId,
        controllerId,
        gameTypeId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + durationMinutes * MINUTE),
        openSlots: input.openSlots,
        note,
      },
      select: { id: true },
    });
  } catch (error) {
    mapPrismaError(error);
  }
}

/**
 * Takes a free seat. Runs serializable so two people can't both get the
 * last seat.
 */
export async function joinPlayRequest(
  rawId: string,
  userId: string,
  now = new Date(),
  db: PrismaClient = defaultDb,
) {
  const id = sanitizeId(rawId);

  try {
    await db.$transaction(
      async (tx) => {
        const request = await tx.playRequest.findUnique({
          where: { id },
          select: {
            hostId: true,
            endsAt: true,
            openSlots: true,
            _count: { select: { participants: true } },
          },
        });
        if (!request) throw new ServiceError("NOT_FOUND", "Entry not found");
        if (request.hostId === userId) {
          throw new ServiceError("CONFLICT", "Host is already part of it");
        }
        if (request.endsAt <= now) {
          throw new ServiceError("CONFLICT", "Entry is already over");
        }
        if (request._count.participants >= request.openSlots) {
          throw new ServiceError("CONFLICT", "No seats left");
        }
        await tx.playRequestParticipant.create({
          data: { playRequestId: id, userId },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    mapPrismaError(error);
  }
}

/** Frees the user's seat again. */
export async function leavePlayRequest(
  rawId: string,
  userId: string,
  db: DbClient = defaultDb,
) {
  const id = sanitizeId(rawId);
  const { count } = await db.playRequestParticipant.deleteMany({
    where: { playRequestId: id, userId },
  });
  if (count === 0)
    throw new ServiceError("NOT_FOUND", "Not part of this entry");
}

/** Removes an entry; only its host may do this. */
export async function cancelPlayRequest(
  rawId: string,
  hostId: string,
  db: DbClient = defaultDb,
) {
  const id = sanitizeId(rawId);
  const { count } = await db.playRequest.deleteMany({ where: { id, hostId } });
  if (count === 0) {
    const exists = await db.playRequest.count({ where: { id } });
    throw exists
      ? new ServiceError("CONFLICT", "Only the host can cancel this entry")
      : new ServiceError("NOT_FOUND", "Entry not found");
  }
}
