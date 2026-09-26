/**
 * Handlers for the messages a controller sends. `server.js` runs them unbundled, so they talk to
 * Prisma directly instead of going through the TypeScript services.
 */
import { PrismaClient } from "../../../generated/prisma/index.js";
import { createUuidV7 } from "../services/uuid.ts";
import { assignController } from "./debug.js";
import {
  attachController,
  controllerIdOf,
  getLiveController,
  setLivePanel,
} from "./live.js";

/** A message the controller got wrong; its text is sent back as an `error` message. */
export class ProtocolError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = "ProtocolError";
  }
}

const INT_MAX = 2147483647;
const SMALLINT_MAX = 32767;
const OFF_COLOR_HEX = "#000000";

/** @returns {PrismaClient} The client shared with `wbl/server/db` where possible. */
function getDb() {
  const store = /** @type {{ prisma?: PrismaClient }} */ (
    /** @type {unknown} */ (globalThis)
  );
  return (store.prisma ??= new PrismaClient({ log: ["error"] }));
}

/**
 * `hello`: the controller identifies itself and reports its grid size. Creates the controller if
 * the hardware ID is unknown and stores the reported size. A `hello` means the controller
 * restarted, so a game still running on it is ended and marked as aborted.
 *
 * @param {import("ws").WebSocket} socket - The socket the message came in on.
 * @param {Record<string, unknown>} message - The parsed message.
 * @throws {ProtocolError} For a missing or invalid `id`, `x` or `y`.
 */
export async function onHello(socket, message) {
  const hardwareId = parseInteger(message.id, "id", 0, INT_MAX);
  const width = parseInteger(message.x, "x", 1, SMALLINT_MAX);
  const height = parseInteger(message.y, "y", 1, SMALLINT_MAX);

  const controller = await getDb().controller.upsert({
    where: { hardwareId },
    create: {
      hardwareId,
      name: `Controller #${hardwareId}`,
      location: "Unbekannt",
      width,
      height,
    },
    update: { width, height },
    select: { id: true },
  });
  await abortRunningGames(controller.id);

  attachController(socket, controller.id, { hardwareId, width, height });
  assignController(socket, { hardwareId, controllerId: controller.id });
}

/**
 * `reconnect`: a known controller got its connection back (e.g. after a server restart) and keeps
 * sending its running game. Binds the socket like `hello` with the stored grid size, but leaves the
 * running game untouched.
 *
 * @param {import("ws").WebSocket} socket - The socket the message came in on.
 * @param {Record<string, unknown>} message - The parsed message.
 * @throws {ProtocolError} For a missing or invalid `id`, or an unknown controller.
 */
export async function onReconnect(socket, message) {
  const hardwareId = parseInteger(message.id, "id", 0, INT_MAX);
  const controller = await getDb().controller.findUnique({
    where: { hardwareId },
    select: { id: true, width: true, height: true },
  });
  if (!controller) {
    throw new ProtocolError(`Unknown controller ${hardwareId}; send "hello"`);
  }

  attachController(socket, controller.id, {
    hardwareId,
    width: controller.width,
    height: controller.height,
  });
  assignController(socket, { hardwareId, controllerId: controller.id });
}

/**
 * `gameStart`: starts a game of the given type. A game still running on the controller is ended
 * and marked as aborted first.
 *
 * @param {import("ws").WebSocket} socket - The socket the message came in on.
 * @param {Record<string, unknown>} message - The parsed message.
 * @throws {ProtocolError} Before `hello` or `reconnect`, or for an unknown game key.
 */
export async function onGameStart(socket, message) {
  const controllerId = requireController(socket);
  if (typeof message.game !== "string" || !message.game.trim()) {
    throw new ProtocolError('"game" must be the key of a game type');
  }
  const key = message.game.trim().toLowerCase();

  const db = getDb();
  const gameType = await db.gameType.findUnique({
    where: { key },
    select: { id: true },
  });
  if (!gameType) throw new ProtocolError(`Unknown game "${key}"`);

  await abortRunningGames(controllerId);
  const controller = await db.controller.findUniqueOrThrow({
    where: { id: controllerId },
    select: { latitude: true, longitude: true },
  });
  await db.game.create({
    data: {
      controllerId,
      gameTypeId: gameType.id,
      startedAt: new Date(),
      latitude: controller.latitude,
      longitude: controller.longitude,
    },
  });
}

/**
 * `gameEnds`: marks the running game as ended.
 *
 * @param {import("ws").WebSocket} socket - The socket the message came in on.
 * @throws {ProtocolError} Before `hello` or if no game is running.
 */
export async function onGameEnds(socket) {
  const controllerId = requireController(socket);
  const { count } = await getDb().game.updateMany({
    where: { controllerId, endedAt: null },
    data: { endedAt: new Date() },
  });
  if (count === 0) throw new ProtocolError("No game is running");
}

/**
 * `change`: a panel changed its color. Updates the live view and, while a game runs, appends the
 * change to the game's cell history. The hardware counts panels from 1, the server from 0.
 *
 * @param {import("ws").WebSocket} socket - The socket the message came in on.
 * @param {Record<string, unknown>} message - The parsed message.
 * @throws {ProtocolError} Before `hello`, for a panel outside the grid or an invalid color.
 */
export async function onChange(socket, message) {
  const controllerId = requireController(socket);
  const live = getLiveController(controllerId);
  if (!live) throw new ProtocolError('Send "hello" or "reconnect" first');
  const x = parseInteger(message.x, "x", 1, live.width) - 1;
  const y = parseInteger(message.y, "y", 1, live.height) - 1;
  const colorHex = parseColor(message.color);

  setLivePanel(
    controllerId,
    x,
    y,
    colorHex === OFF_COLOR_HEX ? null : colorHex,
  );

  const running = await findRunningGame(controllerId);
  if (!running) return;
  await getDb().gameData.create({
    data: { ...createUuidV7(), gameId: running.id, x, y, colorHex },
  });
}

/**
 * @param {import("ws").WebSocket} socket
 * @returns {string} The database ID of the socket's controller.
 * @throws {ProtocolError} Before `hello`.
 */
function requireController(socket) {
  const id = controllerIdOf(socket);
  if (!id) throw new ProtocolError('Send "hello" or "reconnect" first');
  return id;
}

/**
 * Ends every running game of a controller and marks it as aborted.
 *
 * @param {string} controllerId
 */
function abortRunningGames(controllerId) {
  return getDb().game.updateMany({
    where: { controllerId, endedAt: null },
    data: { endedAt: new Date(), aborted: true },
  });
}

/** @param {string} controllerId */
function findRunningGame(controllerId) {
  return getDb().game.findFirst({
    where: { controllerId, endedAt: null },
    select: { id: true, gameTypeId: true },
  });
}

/**
 * Integers arrive as strings (`"3"`) or numbers.
 *
 * @param {unknown} value - The raw field.
 * @param {string} field - The field name for the error message.
 * @param {number} min - The smallest allowed value.
 * @param {number} max - The largest allowed value.
 * @returns {number} The integer.
 * @throws {ProtocolError} Unless it is an integer within `min` and `max`.
 */
function parseInteger(value, field, min, max) {
  const number =
    typeof value === "string" && /^\s*-?\d+\s*$/.test(value)
      ? Number(value)
      : value;
  if (
    typeof number !== "number" ||
    !Number.isInteger(number) ||
    number < min ||
    number > max
  ) {
    throw new ProtocolError(
      `"${field}" must be an integer between ${min} and ${max}`,
    );
  }
  return number;
}

/**
 * Accepts `rgb(r, g, b)` with channels 0–255 or `#RRGGBB`.
 *
 * @param {unknown} value - The raw color.
 * @returns {string} The color as uppercase `"#RRGGBB"`.
 * @throws {ProtocolError} For anything else.
 */
function parseColor(value) {
  if (typeof value === "string") {
    const hex = /^\s*#([0-9a-f]{6})\s*$/i.exec(value);
    if (hex) return `#${hex[1]}`.toUpperCase();

    const rgb =
      /^\s*rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)\s*$/i.exec(
        value,
      );
    const channels = rgb?.slice(1).map(Number);
    if (channels?.every((channel) => channel <= 255)) {
      return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
    }
  }
  throw new ProtocolError('"color" must look like "rgb(255, 255, 255)"');
}
