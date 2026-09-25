/**
 * Custom Next.js server that adds a WebSocket endpoint at `/ws`.
 *
 * TLS is expected to be terminated by a reverse proxy, which turns `wss://` into `ws://` here.
 */
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import next from "next";

import { createWebSocketServer, WS_PATH } from "./src/server/ws/index.js";

const dev = process.argv.includes("--dev");
const env = /** @type {Record<string, string | undefined>} */ (process.env);
env.NODE_ENV ??= dev ? "development" : "production";
const hostname = env.HOSTNAME ?? "0.0.0.0";
const port = parseInt(env.PORT ?? "", 10) || 3000;

/** @type {Parameters<typeof next>[0]} */
const options = { dev, hostname, port, turbopack: dev };
if (!dev) {
  // Use the config baked in at build time instead of loading next.config.js at runtime.
  const { config } = JSON.parse(
    readFileSync(
      new URL("./.next/required-server-files.json", import.meta.url),
      "utf8",
    ),
  );
  env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config);
  options.conf = config;
}

const app = next(options);
const handle = app.getRequestHandler();
await app.prepare();

const wss = createWebSocketServer();

const server = createServer((req, res) => void handle(req, res));

// Next attaches its own upgrade listener for `/_next` (dev HMR); everything else is closed.
server.on("upgrade", (req, socket, head) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");
  if (pathname.startsWith("/_next/")) return;
  if (pathname !== WS_PATH) return void socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
});

server.listen(port, hostname, () => {
  console.log(`> Ready on http://${hostname}:${port} (WebSocket at /ws)`);
});
