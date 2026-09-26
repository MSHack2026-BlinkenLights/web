/**
 * In-memory live state of the controllers connected over WebSocket: which socket belongs to which
 * controller, its grid size and the last reported panel colors.
 *
 * `server.js` loads this file unbundled while Next bundles the API routes, so the state lives on
 * `globalThis` for both module graphs to share.
 */

/** @typedef {string | null} PanelColor `"#RRGGBB"` when lit, `null` when off or unknown. */

/**
 * @typedef {{
 *   hardwareId: number,
 *   socket: import("ws").WebSocket | null,
 *   width: number,
 *   height: number,
 *   panels: PanelColor[][],
 * }} LiveController
 */

/**
 * @typedef {{
 *   controllers: Map<string, LiveController>,
 *   bySocket: WeakMap<import("ws").WebSocket, string>,
 * }} LiveState
 */

/** @returns {LiveState} */
function getState() {
  const store = /** @type {{ wsLive?: LiveState }} */ (
    /** @type {unknown} */ (globalThis)
  );
  return (store.wsLive ??= { controllers: new Map(), bySocket: new WeakMap() });
}

/**
 * Binds a socket to a controller after its `hello`. A previous socket of the same controller is
 * detached. Panel colors are kept unless the grid size changed.
 *
 * @param {import("ws").WebSocket} socket - The controller's socket.
 * @param {string} controllerId - The controller's database ID.
 * @param {{ hardwareId: number, width: number, height: number }} info - What the hardware reported.
 */
export function attachController(socket, controllerId, info) {
  const state = getState();
  const previousId = state.bySocket.get(socket);
  if (previousId && previousId !== controllerId) detachSocket(socket);

  const existing = state.controllers.get(controllerId);
  if (existing?.socket && existing.socket !== socket) {
    state.bySocket.delete(existing.socket);
  }
  const sameGrid =
    existing?.width === info.width && existing.height === info.height;
  state.controllers.set(controllerId, {
    hardwareId: info.hardwareId,
    socket,
    width: info.width,
    height: info.height,
    panels: sameGrid
      ? existing.panels
      : Array.from({ length: info.height }, () => Array(info.width).fill(null)),
  });
  state.bySocket.set(socket, controllerId);
}

/**
 * Marks the controller of a closed socket offline. Its panel colors are kept.
 *
 * @param {import("ws").WebSocket} socket - The closed socket.
 */
export function detachSocket(socket) {
  const state = getState();
  const id = state.bySocket.get(socket);
  if (!id) return;
  state.bySocket.delete(socket);
  const entry = state.controllers.get(id);
  if (entry?.socket === socket) entry.socket = null;
}

/**
 * The controller a socket said `hello` for.
 *
 * @param {import("ws").WebSocket} socket - The socket.
 * @returns {string | undefined} The controller's database ID, or `undefined` before `hello`.
 */
export function controllerIdOf(socket) {
  return getState().bySocket.get(socket);
}

/**
 * Live state of a controller.
 *
 * @param {string} controllerId - The controller's database ID.
 * @returns {LiveController | undefined} `undefined` if it has not connected since the server started.
 */
export function getLiveController(controllerId) {
  return getState().controllers.get(controllerId);
}

/**
 * Whether a controller currently has an open connection.
 *
 * @param {string} controllerId - The controller's database ID.
 * @returns {boolean} `false` if it is disconnected or never connected.
 */
export function isControllerConnected(controllerId) {
  const socket = getState().controllers.get(controllerId)?.socket;
  return socket?.readyState === 1;
}

/**
 * Sends a message to a controller over its open socket.
 *
 * @param {string} controllerId - The controller's database ID.
 * @param {Record<string, unknown>} message - The message, serialized as JSON.
 * @returns {boolean} `false` if the controller is not connected.
 */
export function sendToController(controllerId, message) {
  const socket = getState().controllers.get(controllerId)?.socket;
  if (socket?.readyState !== 1) return false;
  socket.send(JSON.stringify(message));
  return true;
}

/**
 * Stores a panel color the controller reported.
 *
 * @param {string} controllerId - The controller's database ID.
 * @param {number} x - The column, already checked against the grid.
 * @param {number} y - The row, already checked against the grid.
 * @param {PanelColor} color - The new color.
 */
export function setLivePanel(controllerId, x, y, color) {
  const row = getState().controllers.get(controllerId)?.panels[y];
  if (row) row[x] = color;
}
