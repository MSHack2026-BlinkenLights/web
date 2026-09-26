/**
 * In-memory live state of the controllers connected over WebSocket: which socket belongs to which
 * controller, its grid size and the last reported panel colors. Listeners get every change, so
 * browsers can follow the panels live.
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
 *   type: "state",
 *   controllerId: string,
 *   online: boolean,
 *   width: number,
 *   height: number,
 *   pixels: PanelColor[],
 * } | {
 *   type: "panel",
 *   controllerId: string,
 *   x: number,
 *   y: number,
 *   color: PanelColor,
 * } | {
 *   type: "game",
 *   controllerId: string,
 * }} LiveEvent `state` replaces the whole grid, `panel` changes one panel, `game` says a game
 * started or ended, or the pad was edited in the admin area.
 */

/** @typedef {(event: LiveEvent) => void} LiveListener */

/**
 * @typedef {{
 *   controllers: Map<string, LiveController>,
 *   bySocket: WeakMap<import("ws").WebSocket, string>,
 *   listeners: Set<LiveListener>,
 * }} LiveState
 */

/** @returns {LiveState} */
function getState() {
  const store = /** @type {{ wsLive?: LiveState }} */ (
    /** @type {unknown} */ (globalThis)
  );
  store.wsLive ??= {
    controllers: new Map(),
    bySocket: new WeakMap(),
    listeners: new Set(),
  };
  // State created by an older version of this file during a dev reload.
  store.wsLive.listeners ??= new Set();
  return store.wsLive;
}

/** @param {LiveEvent} event */
function emit(event) {
  for (const listener of getState().listeners) {
    try {
      listener(event);
    } catch (error) {
      console.error("Live listener failed:", error);
    }
  }
}

/**
 * @param {string} controllerId
 * @param {LiveController} entry
 * @returns {LiveEvent}
 */
function stateEvent(controllerId, entry) {
  return {
    type: "state",
    controllerId,
    online: entry.socket?.readyState === 1,
    width: entry.width,
    height: entry.height,
    pixels: entry.panels.flat(),
  };
}

/**
 * Calls `listener` for every live change of any controller until unsubscribed.
 *
 * @param {LiveListener} listener - Called synchronously; it must not throw.
 * @returns {() => void} Stops the calls.
 */
export function subscribeLive(listener) {
  const { listeners } = getState();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The whole grid of a controller, as a listener would get it.
 *
 * @param {string} controllerId - The controller's database ID.
 * @returns {LiveEvent | undefined} `undefined` if it has not connected since the server started.
 */
export function getLiveSnapshot(controllerId) {
  const entry = getState().controllers.get(controllerId);
  return entry && stateEvent(controllerId, entry);
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
  /** @type {LiveController} */
  const entry = {
    hardwareId: info.hardwareId,
    socket,
    width: info.width,
    height: info.height,
    panels: sameGrid
      ? existing.panels
      : Array.from({ length: info.height }, () => Array(info.width).fill(null)),
  };
  state.controllers.set(controllerId, entry);
  state.bySocket.set(socket, controllerId);
  emit(stateEvent(controllerId, entry));
}

/**
 * Creates an offline live entry for a controller that has not connected since the server
 * started, so its live view can be painted anyway. Does nothing if it has one.
 *
 * @param {string} controllerId - The controller's database ID.
 * @param {{ hardwareId: number, width: number, height: number }} info - Stored hardware ID and grid size.
 * @returns {LiveController} The controller's live entry.
 */
export function ensureLiveController(controllerId, info) {
  const state = getState();
  const existing = state.controllers.get(controllerId);
  if (existing) return existing;
  /** @type {LiveController} */
  const entry = {
    hardwareId: info.hardwareId,
    socket: null,
    width: info.width,
    height: info.height,
    panels: Array.from({ length: info.height }, () =>
      Array(info.width).fill(null),
    ),
  };
  state.controllers.set(controllerId, entry);
  emit(stateEvent(controllerId, entry));
  return entry;
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
  if (entry?.socket !== socket) return;
  entry.socket = null;
  emit(stateEvent(id, entry));
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
 * Tells listeners that a game of a controller started or ended, or the pad was edited.
 *
 * @param {string} controllerId - The controller's database ID.
 */
export function notifyGameChanged(controllerId) {
  emit({ type: "game", controllerId });
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
  if (!row) return;
  row[x] = color;
  emit({ type: "panel", controllerId, x, y, color });
}
