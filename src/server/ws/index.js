import { WebSocketServer } from "ws";

import { onConnection } from "./connection.js";
import { startHeartbeat } from "./heartbeat.js";

export const WS_PATH = "/ws";

export function createWebSocketServer() {
  const wss = new WebSocketServer({ noServer: true });
  wss.on("connection", onConnection);
  startHeartbeat(wss);
  return wss;
}
