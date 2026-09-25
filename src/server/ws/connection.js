import { markAlive } from "./heartbeat.js";
import { onMessage } from "./message.js";

/**
 * @param {import("ws").WebSocket} socket
 * @param {import("node:http").IncomingMessage} _req
 */
export function onConnection(socket, _req) {
  markAlive(socket);
  socket.on("pong", () => markAlive(socket));
  socket.on("message", (data, isBinary) => onMessage(socket, data, isBinary));
}
