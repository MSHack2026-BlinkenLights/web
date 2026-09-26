import {
  logMessage,
  registerConnection,
  unregisterConnection,
} from "./debug.js";
import { markAlive } from "./heartbeat.js";
import { onMessage } from "./message.js";

/**
 * @param {import("ws").WebSocket} socket
 * @param {import("node:http").IncomingMessage} req
 */
export function onConnection(socket, req) {
  registerConnection(socket, req);
  logOutgoing(socket);
  markAlive(socket);
  socket.on("pong", () => markAlive(socket));
  socket.on("message", (data, isBinary) => {
    logMessage(socket, "in", data, isBinary);
    onMessage(socket, data, isBinary);
  });
  socket.on("close", (code, reason) =>
    unregisterConnection(socket, code, reason),
  );
}

/**
 * Wraps `socket.send` so every outgoing message shows up in the admin debugger, whoever sends it.
 *
 * @param {import("ws").WebSocket} socket
 */
function logOutgoing(socket) {
  const send = socket.send.bind(socket);
  /** @type {typeof socket.send} */
  const loggedSend = (data, ...rest) => {
    const options = typeof rest[0] === "object" ? rest[0] : undefined;
    logMessage(
      socket,
      "out",
      data,
      options?.binary ?? typeof data !== "string",
    );
    // @ts-expect-error -- forwards the overloaded arguments unchanged
    send(data, ...rest);
  };
  socket.send = loggedSend;
}
