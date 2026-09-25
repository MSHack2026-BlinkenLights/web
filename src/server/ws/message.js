/**
 * @param {import("ws").WebSocket} socket
 * @param {import("ws").RawData} data
 * @param {boolean} isBinary
 */
export function onMessage(socket, data, isBinary) {
  if (!isBinary && data.toString() === "ping") {
    socket.send("pong");
    return;
  }
  // Echo everything else back for now.
  socket.send(data, { binary: isBinary });
}
