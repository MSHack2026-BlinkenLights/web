import {
  onChange,
  onGameEnds,
  onGameStart,
  onHello,
  onReconnect,
  ProtocolError,
} from "./controller.js";
import { controllerIdOf } from "./live.js";

/**
 * @type {Record<string, (socket: import("ws").WebSocket, message: Record<string, unknown>) => Promise<void>>}
 */
const HANDLERS = {
  hello: onHello,
  reconnect: onReconnect,
  gameStart: onGameStart,
  gameEnd: onGameEnds,
  gameEnds: onGameEnds,
  change: onChange,
};

/** Messages that identify the controller; all others wait for one of them. */
const IDENTIFY = new Set(["hello", "reconnect"]);

/** Enough for the full state of a large grid sent after a reconnect. */
const MAX_PENDING = 5000;
const PENDING_TIMEOUT_MS = 10_000;

/** @typedef {Record<string, unknown> & { msgType: string }} Message */

/** @type {WeakMap<import("ws").WebSocket, Promise<void>>} */
const queues = new WeakMap();

/**
 * Messages that arrived before `hello` or `reconnect`, oldest first.
 *
 * @type {WeakMap<import("ws").WebSocket, { messages: Message[], timer: NodeJS.Timeout }>}
 */
const pending = new WeakMap();

/**
 * Handles one message from a controller. Messages of a socket run one after another, so a
 * `change` right after `gameStart` lands in the new game. Messages that arrive before `hello` or
 * `reconnect` are held back and run right after it, so a controller may send its state before it
 * identifies itself. Successful messages get no answer; invalid ones get
 * `{"msgType":"error","error":"..."}`.
 *
 * @param {import("ws").WebSocket} socket - The socket the message came in on.
 * @param {import("ws").RawData} data - The raw message.
 * @param {boolean} isBinary - Whether it is a binary frame.
 */
export function onMessage(socket, data, isBinary) {
  if (!isBinary && data.toString() === "ping") {
    socket.send("pong");
    return;
  }
  enqueue(socket, () => handle(socket, data, isBinary));
}

/**
 * Runs a task after all earlier ones of the socket.
 *
 * @param {import("ws").WebSocket} socket
 * @param {() => Promise<void>} task - Must not throw.
 */
function enqueue(socket, task) {
  const previous = queues.get(socket) ?? Promise.resolve();
  queues.set(socket, previous.then(task));
}

/**
 * @param {import("ws").WebSocket} socket
 * @param {import("ws").RawData} data
 * @param {boolean} isBinary
 */
async function handle(socket, data, isBinary) {
  /** @type {Message} */
  let message;
  try {
    if (isBinary) throw new ProtocolError("Binary messages are not supported");
    message = parseMessage(data.toString());
  } catch (error) {
    reportError(socket, error);
    return;
  }

  if (!IDENTIFY.has(message.msgType) && !controllerIdOf(socket)) {
    hold(socket, message);
    return;
  }
  const identified = await dispatch(socket, message);
  if (identified && IDENTIFY.has(message.msgType)) {
    await releasePending(socket);
  }
}

/**
 * @param {import("ws").WebSocket} socket
 * @param {Message} message
 * @returns {Promise<boolean>} Whether the message succeeded.
 */
async function dispatch(socket, message) {
  try {
    const handler = Object.hasOwn(HANDLERS, message.msgType)
      ? HANDLERS[message.msgType]
      : undefined;
    if (!handler) {
      throw new ProtocolError(`Unknown msgType "${message.msgType}"`);
    }
    await handler(socket, message);
    return true;
  } catch (error) {
    reportError(socket, error);
    return false;
  }
}

/**
 * Holds back a message until the controller identifies itself. Gives up with an error for each
 * held message if that takes too long.
 *
 * @param {import("ws").WebSocket} socket
 * @param {Message} message
 */
function hold(socket, message) {
  let entry = pending.get(socket);
  if (!entry) {
    const timer = setTimeout(
      () => enqueue(socket, async () => dropPending(socket)),
      PENDING_TIMEOUT_MS,
    );
    socket.once("close", () => clearTimeout(timer));
    entry = { messages: [], timer };
    pending.set(socket, entry);
  }
  if (entry.messages.length >= MAX_PENDING) {
    sendError(socket, 'Too many messages before "hello" or "reconnect"');
    return;
  }
  entry.messages.push(message);
}

/**
 * Runs the held messages in the order they arrived.
 *
 * @param {import("ws").WebSocket} socket
 */
async function releasePending(socket) {
  const entry = pending.get(socket);
  if (!entry) return;
  pending.delete(socket);
  clearTimeout(entry.timer);
  for (const message of entry.messages) await dispatch(socket, message);
}

/**
 * Rejects the held messages when no `hello` or `reconnect` came in time.
 *
 * @param {import("ws").WebSocket} socket
 */
function dropPending(socket) {
  const entry = pending.get(socket);
  if (!entry) return;
  pending.delete(socket);
  for (const message of entry.messages) {
    sendError(
      socket,
      `"${message.msgType}" dropped: send "hello" or "reconnect" first`,
    );
  }
}

/**
 * @param {import("ws").WebSocket} socket
 * @param {unknown} error
 */
function reportError(socket, error) {
  if (!(error instanceof ProtocolError)) {
    console.error("WebSocket message failed:", error);
  }
  sendError(
    socket,
    error instanceof ProtocolError ? error.message : "Internal error",
  );
}

/**
 * @param {string} text - The raw message text.
 * @returns {Message} The parsed message.
 * @throws {ProtocolError} Unless it is a JSON object with a string `msgType`.
 */
function parseMessage(text) {
  /** @type {unknown} */
  let message;
  try {
    message = JSON.parse(text);
  } catch {
    throw new ProtocolError("Invalid JSON");
  }
  if (
    typeof message !== "object" ||
    message === null ||
    Array.isArray(message)
  ) {
    throw new ProtocolError("Message must be a JSON object");
  }
  const record = /** @type {Record<string, unknown>} */ (message);
  if (typeof record.msgType !== "string") {
    throw new ProtocolError('"msgType" is missing');
  }
  return { ...record, msgType: record.msgType };
}

/**
 * @param {import("ws").WebSocket} socket
 * @param {string} error
 */
function sendError(socket, error) {
  if (socket.readyState !== socket.OPEN) return;
  socket.send(JSON.stringify({ msgType: "error", error }));
}
