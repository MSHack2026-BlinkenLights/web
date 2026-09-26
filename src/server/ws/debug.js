/**
 * In-memory record of open WebSocket connections and their recent traffic for the admin debugger.
 *
 * `server.js` loads this file unbundled while Next bundles the API routes, so the state lives on
 * `globalThis` for both module graphs to share.
 */

const MAX_MESSAGES = 1000;
const MAX_TEXT_LENGTH = 4096;
const MAX_BINARY_PREVIEW = 64;

/**
 * @typedef {{ hardwareId: number, controllerId: string }} WsControllerLink
 */

/**
 * @typedef {{
 *   id: string,
 *   remoteAddress: string | null,
 *   userAgent: string | null,
 *   connectedAt: Date,
 *   controller: WsControllerLink | null,
 * }} WsConnectionInfo
 */

/**
 * @typedef {{
 *   seq: number,
 *   timestamp: Date,
 *   connectionId: string,
 *   direction: "in" | "out" | "system",
 *   binary: boolean,
 *   size: number,
 *   payload: string,
 *   truncated: boolean,
 * }} WsLogEntry
 */

/**
 * @typedef {{
 *   connections: Map<string, WsConnectionInfo>,
 *   ids: WeakMap<import("ws").WebSocket, string>,
 *   messages: WsLogEntry[],
 *   nextSeq: number,
 *   nextConnectionId: number,
 * }} WsDebugState
 */

/**
 * Shared debugger state, created on first use.
 *
 * @returns {WsDebugState} The state for this process.
 */
export function getWsDebug() {
  const store = /** @type {{ wsDebug?: WsDebugState }} */ (
    /** @type {unknown} */ (globalThis)
  );
  return (store.wsDebug ??= {
    connections: new Map(),
    ids: new WeakMap(),
    messages: [],
    nextSeq: 1,
    nextConnectionId: 1,
  });
}

/**
 * Starts tracking a new connection.
 *
 * @param {import("ws").WebSocket} socket - The accepted socket.
 * @param {import("node:http").IncomingMessage} req - The upgrade request, for address and user agent.
 * @returns {WsConnectionInfo} The connection's record.
 */
export function registerConnection(socket, req) {
  const state = getWsDebug();
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedFirst = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
    ?.split(",")[0]
    ?.trim();
  /** @type {WsConnectionInfo} */
  const info = {
    id: `c${state.nextConnectionId++}`,
    remoteAddress: forwardedFirst ?? req.socket.remoteAddress ?? null,
    userAgent: req.headers["user-agent"] ?? null,
    connectedAt: new Date(),
    controller: null,
  };
  state.connections.set(info.id, info);
  state.ids.set(socket, info.id);
  pushEntry(info.id, "system", "verbunden", false, 0, false);
  return info;
}

/**
 * Stops tracking a closed connection.
 *
 * @param {import("ws").WebSocket} socket - The closed socket.
 * @param {number} code - The close code.
 * @param {Buffer} reason - The close reason sent by the peer.
 */
export function unregisterConnection(socket, code, reason) {
  const state = getWsDebug();
  const id = state.ids.get(socket);
  if (!id) return;
  state.connections.delete(id);
  state.ids.delete(socket);
  const text = reason.toString();
  pushEntry(
    id,
    "system",
    `getrennt (${code}${text ? `: ${text}` : ""})`,
    false,
    0,
    false,
  );
}

/**
 * Marks a connection as belonging to a controller, once the hardware has identified itself.
 *
 * @param {import("ws").WebSocket} socket - The controller's socket.
 * @param {WsControllerLink} controller - The controller's hardware and database IDs.
 */
export function assignController(socket, controller) {
  const state = getWsDebug();
  const id = state.ids.get(socket);
  const info = id ? state.connections.get(id) : undefined;
  if (!info) return;
  info.controller = controller;
  pushEntry(
    info.id,
    "system",
    `Controller #${controller.hardwareId} zugeordnet`,
    false,
    0,
    false,
  );
}

/**
 * Records a message sent or received on a tracked connection.
 *
 * @param {import("ws").WebSocket} socket - The socket the message went through.
 * @param {"in" | "out"} direction - `in` for received, `out` for sent.
 * @param {unknown} data - The raw message data.
 * @param {boolean} isBinary - Whether the message is a binary frame.
 */
export function logMessage(socket, direction, data, isBinary) {
  const id = getWsDebug().ids.get(socket);
  if (!id) return;
  const buffer = toBuffer(data);
  if (isBinary) {
    const preview = buffer.subarray(0, MAX_BINARY_PREVIEW).toString("hex");
    pushEntry(
      id,
      direction,
      preview.replace(/(..)(?!$)/g, "$1 "),
      true,
      buffer.length,
      buffer.length > MAX_BINARY_PREVIEW,
    );
    return;
  }
  const text = buffer.toString("utf8");
  pushEntry(
    id,
    direction,
    text.slice(0, MAX_TEXT_LENGTH),
    false,
    buffer.length,
    text.length > MAX_TEXT_LENGTH,
  );
}

/**
 * @param {string} connectionId
 * @param {WsLogEntry["direction"]} direction
 * @param {string} payload
 * @param {boolean} binary
 * @param {number} size
 * @param {boolean} truncated
 */
function pushEntry(connectionId, direction, payload, binary, size, truncated) {
  const state = getWsDebug();
  state.messages.push({
    seq: state.nextSeq++,
    timestamp: new Date(),
    connectionId,
    direction,
    binary,
    size,
    payload,
    truncated,
  });
  if (state.messages.length > MAX_MESSAGES) {
    state.messages.splice(0, state.messages.length - MAX_MESSAGES);
  }
}

/**
 * @param {unknown} data - A string, buffer, typed array or list of buffer fragments.
 * @returns {Buffer}
 */
function toBuffer(data) {
  if (Buffer.isBuffer(data)) return data;
  if (typeof data === "string") return Buffer.from(data, "utf8");
  if (Array.isArray(data)) return Buffer.concat(data);
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  return Buffer.from(String(data), "utf8");
}
