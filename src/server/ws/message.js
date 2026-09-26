import {
  onChange,
  onGameEnds,
  onGameStart,
  onHello,
  ProtocolError,
} from "./controller.js";

/**
 * @type {Record<string, (socket: import("ws").WebSocket, message: Record<string, unknown>) => Promise<void>>}
 */
const HANDLERS = {
  hello: onHello,
  gameStart: onGameStart,
  gameEnds: onGameEnds,
  change: onChange,
};

/** @type {WeakMap<import("ws").WebSocket, Promise<void>>} */
const queues = new WeakMap();

/**
 * Handles one message from a controller. Messages of a socket run one after another, so a
 * `change` right after `gameStart` lands in the new game. Successful messages get no answer;
 * invalid ones get `{"msgType":"error","error":"..."}`.
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
  const previous = queues.get(socket) ?? Promise.resolve();
  queues.set(
    socket,
    previous.then(() => handle(socket, data, isBinary)),
  );
}

/**
 * @param {import("ws").WebSocket} socket
 * @param {import("ws").RawData} data
 * @param {boolean} isBinary
 */
async function handle(socket, data, isBinary) {
  try {
    if (isBinary) throw new ProtocolError("Binary messages are not supported");
    const message = parseMessage(data.toString());
    const handler = Object.hasOwn(HANDLERS, message.msgType)
      ? HANDLERS[message.msgType]
      : undefined;
    if (!handler) {
      throw new ProtocolError(`Unknown msgType "${message.msgType}"`);
    }
    await handler(socket, message);
  } catch (error) {
    if (!(error instanceof ProtocolError)) {
      console.error("WebSocket message failed:", error);
    }
    sendError(
      socket,
      error instanceof ProtocolError ? error.message : "Internal error",
    );
  }
}

/**
 * @param {string} text - The raw message text.
 * @returns {Record<string, unknown> & { msgType: string }} The parsed message.
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
