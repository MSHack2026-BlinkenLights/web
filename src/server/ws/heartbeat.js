const INTERVAL_MS = 30_000;

/** @type {WeakSet<import("ws").WebSocket>} */
const alive = new WeakSet();

/** @param {import("ws").WebSocket} socket */
export function markAlive(socket) {
  alive.add(socket);
}

/**
 * Drops dead connections so proxies with idle timeouts don't keep them around.
 *
 * @param {import("ws").WebSocketServer} wss
 */
export function startHeartbeat(wss) {
  const interval = setInterval(() => {
    for (const socket of wss.clients) {
      if (!alive.delete(socket)) {
        socket.terminate();
        continue;
      }
      socket.ping();
    }
  }, INTERVAL_MS);
  wss.on("close", () => clearInterval(interval));
}
