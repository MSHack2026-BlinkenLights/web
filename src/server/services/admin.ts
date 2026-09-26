import {
  announcePadChange,
  getGridSize,
  pressButton,
  setColor,
  showLiveColor,
} from "wbl/server/bridge";
import { db as defaultDb } from "wbl/server/db";
import {
  type DbClient,
  mapPrismaError,
  sanitizeCoordinate,
  sanitizeId,
  sanitizeName,
  sanitizeOptionalText,
  sanitizeSmallInt,
  ServiceError,
} from "./common";
import {
  type ControllerInput,
  sanitizeControllerInput,
  sanitizeControllerUpdate,
} from "./controller";
import { createPixelRows, type PixelInput, sanitizePixel } from "./game-data";
import {
  type GameTypeInput,
  sanitizeGameTypeInput,
  sanitizeGameTypeUpdate,
} from "./game-type";

// Admin operations only guard data integrity (formats, grid bounds, unique
// keys, references); unlike the player-facing services they skip game rules
// such as "one running game per controller" or "ended games are frozen".

const NOTE_MAX_LENGTH = 200;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Page size of the admin game list. */
export const ADMIN_GAME_PAGE_SIZE = 50;

async function tryWrite<T>(write: () => Promise<T>) {
  try {
    return await write();
  } catch (error) {
    mapPrismaError(error);
  }
}

function sanitizeDate(value: Date, field: string) {
  if (Number.isNaN(value.getTime())) {
    throw new ServiceError("BAD_REQUEST", `${field} is not a valid date`);
  }
  return value;
}

/**
 * Number of rows per admin-managed table.
 *
 * @param db - The client to use.
 * @returns The counts keyed by entity.
 */
export async function getAdminOverview(db: DbClient = defaultDb) {
  const [gameTypes, controllers, games, runningGames, playRequests, users] =
    await Promise.all([
      db.gameType.count(),
      db.controller.count(),
      db.game.count(),
      db.game.count({ where: { endedAt: null } }),
      db.playRequest.count(),
      db.user.count(),
    ]);
  return { gameTypes, controllers, games, runningGames, playRequests, users };
}

// Game types

/**
 * All game types with their number of games, sorted by name.
 *
 * @param db - The client to use.
 * @returns The game types.
 */
export function listGameTypesAdmin(db: DbClient = defaultDb) {
  return db.gameType.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { games: true, playRequests: true } } },
  });
}

/**
 * A game type with its most recent games.
 *
 * @param rawId - The game type's ID.
 * @param db - The client to use.
 * @returns The game type.
 * @throws {ServiceError} `BAD_REQUEST` for an invalid ID, `NOT_FOUND` if it does not exist.
 */
export async function getGameTypeAdmin(
  rawId: string,
  db: DbClient = defaultDb,
) {
  const gameType = await db.gameType.findUnique({
    where: { id: sanitizeId(rawId) },
    include: {
      _count: { select: { games: true, playRequests: true } },
      games: {
        orderBy: { startedAt: "desc" },
        take: 10,
        include: { controller: { select: { name: true } } },
      },
    },
  });
  if (!gameType) throw new ServiceError("NOT_FOUND", "Game type not found");
  return gameType;
}

/**
 * Creates a game type.
 *
 * @param input - The game type's fields.
 * @param db - The client to use.
 * @returns The new game type's ID.
 * @throws {ServiceError} `BAD_REQUEST` for invalid fields, `CONFLICT` if the key is taken.
 */
export function createGameType(input: GameTypeInput, db: DbClient = defaultDb) {
  const data = sanitizeGameTypeInput(input);
  return tryWrite(() => db.gameType.create({ data, select: { id: true } }));
}

/**
 * Updates the given fields of a game type.
 *
 * @param rawId - The game type's ID.
 * @param patch - The fields to change.
 * @param db - The client to use.
 * @throws {ServiceError} `BAD_REQUEST` for invalid fields, `NOT_FOUND` if it
 * does not exist, `CONFLICT` if the key is taken.
 */
export async function updateGameType(
  rawId: string,
  patch: Partial<GameTypeInput>,
  db: DbClient = defaultDb,
) {
  const id = sanitizeId(rawId);
  const current = await db.gameType.findUnique({ where: { id } });
  if (!current) throw new ServiceError("NOT_FOUND", "Game type not found");
  const data = sanitizeGameTypeUpdate(current, patch);
  await tryWrite(() => db.gameType.update({ where: { id }, data }));
}

// Controllers

/**
 * All controllers with their number of games, sorted by hardware ID.
 *
 * @param db - The client to use.
 * @returns The controllers.
 */
export function listControllersAdmin(db: DbClient = defaultDb) {
  return db.controller.findMany({
    orderBy: { hardwareId: "asc" },
    include: { _count: { select: { games: true, playRequests: true } } },
  });
}

/**
 * A controller with its most recent games.
 *
 * @param rawId - The controller's ID.
 * @param db - The client to use.
 * @returns The controller.
 * @throws {ServiceError} `BAD_REQUEST` for an invalid ID, `NOT_FOUND` if it does not exist.
 */
export async function getControllerAdmin(
  rawId: string,
  db: DbClient = defaultDb,
) {
  const controller = await db.controller.findUnique({
    where: { id: sanitizeId(rawId) },
    include: {
      _count: { select: { games: true, playRequests: true } },
      games: {
        orderBy: { startedAt: "desc" },
        take: 10,
        include: { gameType: { select: { name: true } } },
      },
    },
  });
  if (!controller) throw new ServiceError("NOT_FOUND", "Controller not found");
  return controller;
}

/**
 * Creates a controller.
 *
 * @param input - The controller's fields.
 * @param db - The client to use.
 * @returns The new controller's ID.
 * @throws {ServiceError} `BAD_REQUEST` for invalid fields, `CONFLICT` if the hardware ID is taken.
 */
export async function createController(
  input: ControllerInput,
  db: DbClient = defaultDb,
) {
  const data = sanitizeControllerInput(input);
  const created = await tryWrite(() =>
    db.controller.create({ data, select: { id: true } }),
  );
  if (created) announcePadChange(created.id);
  return created;
}

/**
 * Updates the given fields of a controller.
 *
 * @param rawId - The controller's ID.
 * @param patch - The fields to change.
 * @param db - The client to use.
 * @throws {ServiceError} `BAD_REQUEST` for invalid fields, `NOT_FOUND` if it
 * does not exist, `CONFLICT` if the hardware ID is taken.
 */
export async function updateController(
  rawId: string,
  patch: Partial<ControllerInput>,
  db: DbClient = defaultDb,
) {
  const id = sanitizeId(rawId);
  const data = sanitizeControllerUpdate(patch);
  await tryWrite(() => db.controller.update({ where: { id }, data }));
  announcePadChange(id);
}

/**
 * Paints one panel in the live view of a controller (admin preview, live map),
 * whether or not a game runs. Nothing is stored in a game.
 *
 * @param rawId - The controller's ID.
 * @param pixel - The panel and its color; `#000000` turns it off.
 * @param sendToPanel - Whether to also send the color to the controller.
 * @param db - The client to use.
 * @returns Whether the color reached the controller; `false` if it was not
 * asked to or the controller is offline.
 * @throws {ServiceError} `BAD_REQUEST` for an invalid color or a panel outside
 * the grid, `NOT_FOUND` if the controller does not exist.
 */
export async function paintControllerAdmin(
  rawId: string,
  pixel: PixelInput,
  sendToPanel = false,
  db: DbClient = defaultDb,
) {
  const controller = await db.controller.findUnique({
    where: { id: sanitizeId(rawId) },
    select: { id: true, hardwareId: true, width: true, height: true },
  });
  if (!controller) throw new ServiceError("NOT_FOUND", "Controller not found");
  const { x, y, colorHex } = sanitizePixel(pixel, getGridSize(controller));
  showLiveColor(controller, x, y, colorHex);
  return { sent: sendToPanel && setColor(controller, x, y, colorHex) };
}

/**
 * Simulates a press on a panel of a controller, as if someone stepped on it.
 * The controller handles the game logic; nothing is stored here.
 *
 * @param rawId - The controller's ID.
 * @param panel - The panel's column and row, starting at 0.
 * @param db - The client to use.
 * @returns Whether the press reached the controller; `false` if it is offline.
 * @throws {ServiceError} `BAD_REQUEST` for a panel outside the grid,
 * `NOT_FOUND` if the controller does not exist.
 */
export async function pressButtonAdmin(
  rawId: string,
  panel: { x: number; y: number },
  db: DbClient = defaultDb,
) {
  const controller = await db.controller.findUnique({
    where: { id: sanitizeId(rawId) },
    select: { id: true, width: true, height: true },
  });
  if (!controller) throw new ServiceError("NOT_FOUND", "Controller not found");
  const grid = getGridSize(controller);
  const x = sanitizeSmallInt(panel.x, "x", 0);
  const y = sanitizeSmallInt(panel.y, "y", 0);
  if (x >= grid.width || y >= grid.height) {
    throw new ServiceError(
      "BAD_REQUEST",
      `Panel (${x}, ${y}) outside ${grid.width}x${grid.height} grid`,
    );
  }
  return { sent: pressButton(controller, x, y) };
}

// Games

/** Filters of the admin game list. */
export interface AdminGameFilter {
  controllerId?: string;
  gameTypeId?: string;
  status?: "running" | "ended";
  /** ID of the last game of the previous page. */
  cursor?: string;
}

/**
 * Games, newest first, one page at a time.
 *
 * @param filter - Optional filters and the cursor of the next page.
 * @param db - The client to use.
 * @returns The page and the cursor for the next one, `null` on the last page.
 */
export async function listGamesAdmin(
  filter: AdminGameFilter,
  db: DbClient = defaultDb,
) {
  const games = await db.game.findMany({
    where: {
      controllerId: filter.controllerId
        ? sanitizeId(filter.controllerId, "controllerId")
        : undefined,
      gameTypeId: filter.gameTypeId
        ? sanitizeId(filter.gameTypeId, "gameTypeId")
        : undefined,
      endedAt:
        filter.status === "running"
          ? null
          : filter.status === "ended"
            ? { not: null }
            : undefined,
    },
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    take: ADMIN_GAME_PAGE_SIZE + 1,
    ...(filter.cursor && {
      cursor: { id: sanitizeId(filter.cursor, "cursor") },
      skip: 1,
    }),
    include: {
      controller: { select: { name: true } },
      gameType: { select: { name: true } },
      _count: { select: { data: true } },
    },
  });
  const hasMore = games.length > ADMIN_GAME_PAGE_SIZE;
  const page = hasMore ? games.slice(0, ADMIN_GAME_PAGE_SIZE) : games;
  return { games: page, nextCursor: hasMore ? page.at(-1)!.id : null };
}

/**
 * A game with its controller, type and the full history of its cells, oldest change first.
 *
 * @param rawId - The game's ID.
 * @param db - The client to use.
 * @returns The game.
 * @throws {ServiceError} `BAD_REQUEST` for an invalid ID, `NOT_FOUND` if it does not exist.
 */
export async function getGameAdmin(rawId: string, db: DbClient = defaultDb) {
  const game = await db.game.findUnique({
    where: { id: sanitizeId(rawId) },
    include: {
      controller: {
        select: { id: true, name: true, width: true, height: true },
      },
      gameType: { select: { id: true, name: true, key: true } },
      data: { orderBy: { id: "asc" } },
    },
  });
  if (!game) throw new ServiceError("NOT_FOUND", "Game not found");
  return game;
}

/** Fields of a game editable in the admin area. */
export interface AdminGameInput {
  controllerId: string;
  gameTypeId: string;
  startedAt: Date;
  endedAt?: Date | null;
  latitude?: number | null;
  longitude?: number | null;
}

async function sanitizeGameInput(input: AdminGameInput, db: DbClient) {
  const controllerId = sanitizeId(input.controllerId, "controllerId");
  const gameTypeId = sanitizeId(input.gameTypeId, "gameTypeId");
  const startedAt = sanitizeDate(input.startedAt, "startedAt");
  const endedAt = input.endedAt ? sanitizeDate(input.endedAt, "endedAt") : null;
  if (endedAt && endedAt < startedAt) {
    throw new ServiceError(
      "BAD_REQUEST",
      "endedAt must not be before startedAt",
    );
  }
  const [controller, gameType] = await Promise.all([
    db.controller.count({ where: { id: controllerId } }),
    db.gameType.count({ where: { id: gameTypeId } }),
  ]);
  if (!controller) throw new ServiceError("NOT_FOUND", "Controller not found");
  if (!gameType) throw new ServiceError("NOT_FOUND", "Game type not found");
  return {
    controllerId,
    gameTypeId,
    startedAt,
    endedAt,
    latitude: sanitizeCoordinate(input.latitude, "latitude", 90),
    longitude: sanitizeCoordinate(input.longitude, "longitude", 180),
  };
}

/**
 * Creates a game with arbitrary times, e.g. to backfill history.
 *
 * @param input - The game's fields.
 * @param db - The client to use.
 * @returns The new game's ID.
 * @throws {ServiceError} `BAD_REQUEST` for invalid fields or an end before the
 * start, `NOT_FOUND` if the controller or game type does not exist.
 */
export async function createGameAdmin(
  input: AdminGameInput,
  db: DbClient = defaultDb,
) {
  const data = await sanitizeGameInput(input, db);
  const created = await tryWrite(() =>
    db.game.create({ data, select: { id: true } }),
  );
  announcePadChange(data.controllerId);
  return created;
}

/**
 * Replaces all editable fields of a game. Cells outside a smaller new grid are kept.
 *
 * @param rawId - The game's ID.
 * @param input - The game's new fields.
 * @param db - The client to use.
 * @throws {ServiceError} `BAD_REQUEST` for invalid fields or an end before the
 * start, `NOT_FOUND` if the game, controller or game type does not exist.
 */
export async function updateGameAdmin(
  rawId: string,
  input: AdminGameInput,
  db: DbClient = defaultDb,
) {
  const id = sanitizeId(rawId);
  const data = await sanitizeGameInput(input, db);
  const before = await db.game.findUnique({
    where: { id },
    select: { controllerId: true },
  });
  await tryWrite(() => db.game.update({ where: { id }, data }));
  // The game may have moved to another controller.
  announcePadChange(
    data.controllerId,
    ...(before ? [before.controllerId] : []),
  );
}

/**
 * Deletes a game together with its cells.
 *
 * @param rawId - The game's ID.
 * @param db - The client to use.
 * @throws {ServiceError} `BAD_REQUEST` for an invalid ID, `NOT_FOUND` if it does not exist.
 */
export async function deleteGame(rawId: string, db: DbClient = defaultDb) {
  const id = sanitizeId(rawId);
  const deleted = await tryWrite(() =>
    db.game.delete({ where: { id }, select: { controllerId: true } }),
  );
  if (deleted) announcePadChange(deleted.controllerId);
}

async function getGameGrid(rawGameId: string, db: DbClient) {
  const gameId = sanitizeId(rawGameId, "gameId");
  const game = await db.game.findUnique({
    where: { id: gameId },
    select: {
      endedAt: true,
      controller: {
        select: { id: true, hardwareId: true, width: true, height: true },
      },
    },
  });
  if (!game) throw new ServiceError("NOT_FOUND", "Game not found");
  return { gameId, grid: game.controller, running: !game.endedAt };
}

/**
 * Mirrors cell changes of a running game: always in the live view, on the
 * hardware only if asked to.
 *
 * @param controller - The game's controller.
 * @param pixels - The sanitized changes.
 * @param sendToPanel - Whether to also send them to the controller.
 */
function mirrorPixels(
  controller: { id: string; hardwareId: number; width: number; height: number },
  pixels: { x: number; y: number; colorHex: string }[],
  sendToPanel: boolean,
) {
  for (const { x, y, colorHex } of pixels) {
    showLiveColor(controller, x, y, colorHex);
    if (sendToPanel) setColor(controller, x, y, colorHex);
  }
}

/**
 * Records a new color for one cell of a game, also if it has ended. While the
 * game runs, the live view shows the change right away.
 *
 * @param rawGameId - The game's ID.
 * @param pixel - The cell and its color; `#000000` turns it off.
 * @param sendToPanel - Whether a running game's change also goes to the controller.
 * @param db - The client to use.
 * @returns The stored change.
 * @throws {ServiceError} `BAD_REQUEST` for an invalid color or a cell outside
 * the grid, `NOT_FOUND` if the game does not exist.
 */
export async function setPixelAdmin(
  rawGameId: string,
  pixel: PixelInput,
  sendToPanel = false,
  db: DbClient = defaultDb,
) {
  const { gameId, grid, running } = await getGameGrid(rawGameId, db);
  const sanitized = sanitizePixel(pixel, grid);
  const [saved] = await createPixelRows(gameId, [sanitized], db);
  if (running) mirrorPixels(grid, [sanitized], sendToPanel);
  return saved!;
}

/**
 * Turns one cell of a game off by recording black, so its history stays intact.
 *
 * @param rawGameId - The game's ID.
 * @param x - The column of the cell.
 * @param y - The row of the cell.
 * @param sendToPanel - Whether a running game's change also goes to the controller.
 * @param db - The client to use.
 * @returns The stored change.
 * @throws {ServiceError} `BAD_REQUEST` for an invalid ID or a cell outside the
 * grid, `NOT_FOUND` if the game does not exist.
 */
export async function turnOffPixelAdmin(
  rawGameId: string,
  x: number,
  y: number,
  sendToPanel = false,
  db: DbClient = defaultDb,
) {
  return setPixelAdmin(
    rawGameId,
    { x, y, colorHex: "#000000" },
    sendToPanel,
    db,
  );
}

/**
 * Removes all cells of a game including their history, also if it has ended.
 * While the game runs, the live view shows all panels off right away.
 *
 * @param rawGameId - The game's ID.
 * @param sendToPanel - Whether a running game's panels are also turned off on the controller.
 * @param db - The client to use.
 * @returns How many cells were removed.
 * @throws {ServiceError} `BAD_REQUEST` for an invalid ID, `NOT_FOUND` if the game does not exist.
 */
export async function clearPixelsAdmin(
  rawGameId: string,
  sendToPanel = false,
  db: DbClient = defaultDb,
) {
  const { gameId, grid, running } = await getGameGrid(rawGameId, db);
  const { count } = await db.gameData.deleteMany({ where: { gameId } });
  if (running) {
    const off = Array.from({ length: grid.width * grid.height }, (_, i) => ({
      x: i % grid.width,
      y: Math.floor(i / grid.width),
      colorHex: "#000000",
    }));
    mirrorPixels(grid, off, sendToPanel);
  }
  return count;
}

// Play requests

const personSelect = { select: { id: true, name: true, email: true } };

/**
 * All play requests including past ones, newest start first.
 *
 * @param db - The client to use.
 * @returns The play requests.
 */
export function listPlayRequestsAdmin(db: DbClient = defaultDb) {
  return db.playRequest.findMany({
    orderBy: { startsAt: "desc" },
    include: {
      host: personSelect,
      controller: { select: { name: true } },
      gameType: { select: { name: true } },
      _count: { select: { participants: true } },
    },
  });
}

/**
 * A play request with host and participants.
 *
 * @param rawId - The play request's ID.
 * @param db - The client to use.
 * @returns The play request.
 * @throws {ServiceError} `BAD_REQUEST` for an invalid ID, `NOT_FOUND` if it does not exist.
 */
export async function getPlayRequestAdmin(
  rawId: string,
  db: DbClient = defaultDb,
) {
  const playRequest = await db.playRequest.findUnique({
    where: { id: sanitizeId(rawId) },
    include: {
      host: personSelect,
      participants: {
        include: { user: personSelect },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  if (!playRequest) {
    throw new ServiceError("NOT_FOUND", "Play request not found");
  }
  return playRequest;
}

/** Fields of a play request editable in the admin area. */
export interface AdminPlayRequestInput {
  controllerId: string;
  gameTypeId: string;
  startsAt: Date;
  endsAt: Date;
  openSlots: number;
  note?: string | null;
}

/**
 * Replaces all editable fields of a play request.
 *
 * @param rawId - The play request's ID.
 * @param input - The new fields.
 * @param db - The client to use.
 * @throws {ServiceError} `BAD_REQUEST` for invalid fields or an end not after
 * the start, `NOT_FOUND` if it or a referenced row does not exist.
 */
export async function updatePlayRequestAdmin(
  rawId: string,
  input: AdminPlayRequestInput,
  db: DbClient = defaultDb,
) {
  const id = sanitizeId(rawId);
  const startsAt = sanitizeDate(input.startsAt, "startsAt");
  const endsAt = sanitizeDate(input.endsAt, "endsAt");
  if (endsAt <= startsAt) {
    throw new ServiceError("BAD_REQUEST", "endsAt must be after startsAt");
  }
  const note = sanitizeOptionalText(input.note);
  if (note && note.length > NOTE_MAX_LENGTH) {
    throw new ServiceError(
      "BAD_REQUEST",
      `note must be at most ${NOTE_MAX_LENGTH} characters`,
    );
  }
  const data = {
    controllerId: sanitizeId(input.controllerId, "controllerId"),
    gameTypeId: sanitizeId(input.gameTypeId, "gameTypeId"),
    startsAt,
    endsAt,
    openSlots: sanitizeSmallInt(input.openSlots, "openSlots", 1),
    note,
  };
  await tryWrite(() => db.playRequest.update({ where: { id }, data }));
}

/**
 * Deletes a play request together with its participants.
 *
 * @param rawId - The play request's ID.
 * @param db - The client to use.
 * @throws {ServiceError} `BAD_REQUEST` for an invalid ID, `NOT_FOUND` if it does not exist.
 */
export async function deletePlayRequest(
  rawId: string,
  db: DbClient = defaultDb,
) {
  const id = sanitizeId(rawId);
  await tryWrite(() => db.playRequest.delete({ where: { id } }));
}

/**
 * Adds a user to a play request, regardless of free seats.
 *
 * @param rawId - The play request's ID.
 * @param userId - The user to add.
 * @param db - The client to use.
 * @throws {ServiceError} `BAD_REQUEST` if the user is the host, `NOT_FOUND` if
 * the request does not exist, `CONFLICT` if the user already takes part or does not exist.
 */
export async function addParticipantAdmin(
  rawId: string,
  userId: string,
  db: DbClient = defaultDb,
) {
  const playRequestId = sanitizeId(rawId);
  const playRequest = await db.playRequest.findUnique({
    where: { id: playRequestId },
    select: { hostId: true },
  });
  if (!playRequest) {
    throw new ServiceError("NOT_FOUND", "Play request not found");
  }
  if (playRequest.hostId === userId) {
    throw new ServiceError(
      "BAD_REQUEST",
      "The host cannot join as participant",
    );
  }
  await tryWrite(() =>
    db.playRequestParticipant.create({ data: { playRequestId, userId } }),
  );
}

/**
 * Removes a user from a play request.
 *
 * @param rawId - The play request's ID.
 * @param userId - The user to remove.
 * @param db - The client to use.
 * @throws {ServiceError} `BAD_REQUEST` for an invalid ID, `NOT_FOUND` if the user does not take part.
 */
export async function removeParticipantAdmin(
  rawId: string,
  userId: string,
  db: DbClient = defaultDb,
) {
  const playRequestId = sanitizeId(rawId);
  await tryWrite(() =>
    db.playRequestParticipant.delete({
      where: { playRequestId_userId: { playRequestId, userId } },
    }),
  );
}

// Users

/**
 * All users with counts of their related rows, sorted by name.
 *
 * @param db - The client to use.
 * @returns The users.
 */
export function listUsersAdmin(db: DbClient = defaultDb) {
  return db.user.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          sessions: true,
          passkeys: true,
          playRequests: true,
          playParticipations: true,
        },
      },
    },
  });
}

/**
 * A user with sessions, accounts, passkeys and play requests. Secrets such as
 * tokens and password hashes are left out.
 *
 * @param id - The user's ID.
 * @param db - The client to use.
 * @returns The user.
 * @throws {ServiceError} `NOT_FOUND` if the user does not exist.
 */
export async function getUserAdmin(id: string, db: DbClient = defaultDb) {
  const user = await db.user.findUnique({
    where: { id },
    include: {
      sessions: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          createdAt: true,
          expiresAt: true,
          ipAddress: true,
          userAgent: true,
        },
      },
      accounts: {
        select: { id: true, providerId: true, createdAt: true },
      },
      passkeys: {
        select: { id: true, name: true, deviceType: true, createdAt: true },
      },
      playRequests: {
        orderBy: { startsAt: "desc" },
        select: {
          id: true,
          startsAt: true,
          gameType: { select: { name: true } },
          controller: { select: { name: true } },
        },
      },
      playParticipations: {
        orderBy: { joinedAt: "desc" },
        select: {
          joinedAt: true,
          playRequest: {
            select: {
              id: true,
              startsAt: true,
              gameType: { select: { name: true } },
              controller: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!user) throw new ServiceError("NOT_FOUND", "User not found");
  return user;
}

/**
 * Changes a user's name and email.
 *
 * @param id - The user's ID.
 * @param input - The new name and email.
 * @param db - The client to use.
 * @throws {ServiceError} `BAD_REQUEST` for an invalid name or email,
 * `NOT_FOUND` if the user does not exist, `CONFLICT` if the email is taken.
 */
export async function updateUserAdmin(
  id: string,
  input: { name: string; email: string },
  db: DbClient = defaultDb,
) {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    throw new ServiceError("BAD_REQUEST", "email is not a valid address");
  }
  const data = { name: sanitizeName(input.name, "name", 100), email };
  await tryWrite(() => db.user.update({ where: { id }, data }));
}

/**
 * Deletes a user with their sessions, accounts, passkeys and play requests.
 *
 * @param id - The user's ID.
 * @param db - The client to use.
 * @throws {ServiceError} `NOT_FOUND` if the user does not exist.
 */
export async function deleteUserAdmin(id: string, db: DbClient = defaultDb) {
  await tryWrite(() => db.user.delete({ where: { id } }));
}

/**
 * All users as options for selects, sorted by name.
 *
 * @param db - The client to use.
 * @returns ID, name and email of every user.
 */
export function listUserOptions(db: DbClient = defaultDb) {
  return db.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
}

/**
 * Controllers and game types as options for selects.
 *
 * @param db - The client to use.
 * @returns Both lists, sorted by name.
 */
export async function getAdminOptions(db: DbClient = defaultDb) {
  const [controllers, gameTypes] = await Promise.all([
    db.controller.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, hardwareId: true },
    }),
    db.gameType.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, key: true },
    }),
  ]);
  return { controllers, gameTypes };
}
