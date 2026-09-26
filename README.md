# web-blinkin-lights

Next.js app (T3 Stack) with tRPC, Prisma (PostgreSQL), Better Auth and Tailwind CSS.

## Prerequisites

- [Node.js](https://nodejs.org) (LTS recommended) and npm
- [Docker](https://docs.docker.com/engine/install/) or [Podman](https://podman.io/getting-started/installation) for the local PostgreSQL database
- On Windows: use `start-database.ps1` (native PowerShell) or run `start-database.sh` inside [WSL](https://learn.microsoft.com/en-us/windows/wsl/install)

## Setup

### 1. Install dependencies

```bash
npm install
```

This also runs `prisma generate` automatically (`postinstall`), which creates the Prisma client in `generated/prisma`.

### 2. Configure environment variables

Copy the example file and fill in the values:

```bash
cp .env.example .env
```

| Variable             | Description                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string, e.g. `postgresql://postgres:password@localhost:5432/web-blinkin-lights`                 |
| `BETTER_AUTH_SECRET` | Secret for Better Auth (optional in development, required in production). Generate one with `openssl rand -base64 32` |

If you add new variables, also update the schema in `src/env.js` and keep `.env.example` in sync.

### 3. Start the database

macOS / Linux (or WSL):

```bash
./start-database.sh
```

Windows (PowerShell, no WSL required):

```powershell
powershell -ExecutionPolicy Bypass -File .\start-database.ps1
```

The script reads `DATABASE_URL` from `.env` and starts a PostgreSQL container named `<db-name>-postgres` on the configured port.

- If the password in `DATABASE_URL` is still `password`, the script offers to generate a random one and writes it into `.env`.
- If the container already exists, it is simply restarted.
- The script aborts if Docker/Podman is not running or the port is already in use.

If the script is not executable, run `chmod +x start-database.sh` first. On Windows, `-ExecutionPolicy Bypass` allows the unsigned script to run without changing your system policy.

### 4. Push the schema to the database

```bash
npm run db:push
```

This syncs `prisma/schema.prisma` to the database (creates/updates tables) and regenerates the Prisma client.

Rerun this command whenever you change `prisma/schema.prisma`.

### 5. Seed dummy data (optional)

Fills every table in `prisma/schema.prisma` with dummy data from `prisma/seed.sql` (controllers around Münster, game types, games with pixels, users with nicknames of different lengths).

macOS / Linux (or WSL):

```bash
./seed-database.sh
```

Windows (PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File .\seed-database.ps1
```

- Never runs automatically: not part of `npm install`, `db:push`, `db:migrate` or Docker. Run it by hand, only against a development database.
- Rerunning is safe: rows use fixed ids and existing ones are skipped.
- All seeded users log in with the password `password123`, e.g. `jo@example.com`.

### 6. Start the development server

```bash
npm run dev
```

The app is available at [http://localhost:3000](http://localhost:3000).

## Rhythm-game prototype

Open [http://localhost:3000/rhythm-lab](http://localhost:3000/rhythm-lab) for a browser-only LED rhythm game with generated audio. Click **Start demo**, listen to the count-in, then use the arrow keys or simulated panels to step on the white cues.

See [the rhythm lab guide](docs/rhythm-lab.md) for timing, calibration, architecture, and test commands. Hardware and streaming-service integration are intentionally not included yet.

## Production build

```bash
npm run build
npm run start
```

Or build and start in one step with `npm run preview`. Make sure `BETTER_AUTH_SECRET` is set, since it is required in production.

## Docker deployment

Runs the app (distroless Node image), a one-shot migration job (`prisma/migrate-deploy.sh`, runs `prisma migrate deploy`) and PostgreSQL:

```bash
cp .env.example .env   # set BETTER_AUTH_SECRET, POSTGRES_PASSWORD, APP_PORT
docker compose up -d --build
```

The app is available at `http://localhost:$APP_PORT`. If port 3000 is taken on the host, change `APP_PORT`. All Docker variables are listed in `.env.example`.

## WebSocket

`server.js` is a custom Next.js server (used by `dev`, `start` and Docker) that serves a WebSocket at `/ws`. Controllers connect there and send JSON messages; handlers live in `src/server/ws/`. The server pings every 30 s (a text `ping` is also answered with `pong`).

| `msgType`   | Fields                                       | Effect                                                                                                                                                                        |
| ----------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hello`     | `id` (hardware ID), `x`, `y` (grid size)     | Binds the connection to the controller, creating it if unknown, and stores the grid size. Means the controller restarted, so a running game is marked as aborted. Send first. |
| `reconnect` | `id` (hardware ID)                           | Binds the connection to a known controller after a reconnect (e.g. server restart) with its stored grid size. The running game continues.                                     |
| `gameStart` | `game` (game type key)                       | Starts a game of that type; a game still running is marked as aborted first.                                                                                                  |
| `gameEnds`  | –                                            | Ends the running game.                                                                                                                                                        |
| `change`    | `x`, `y` (1-based), `color` (`rgb(r, g, b)`) | Updates the live view; while a game runs, stores the color as that cell of the game.                                                                                          |

The server sends `change` (same fields) to a controller to set a panel's color, e.g. for the claim pattern after a game (see `setColor` in `src/server/bridge/interface.ts`).

The hardware counts panels from 1, the server from 0: incoming `x`/`y` are decremented on receipt and outgoing ones incremented before sending, so everything past `src/server/ws/controller.js` and `setColor` is 0-based.

Messages of a connection are handled in the order they arrive. Anything sent before `hello` or `reconnect` (e.g. the current state as `change` messages after a reconnect) is held back and handled right after it; without one within 10 s, the held messages are dropped with an error.

Numbers may be sent as strings. Valid messages get no answer; anything invalid (bad JSON, unknown `msgType`, missing `hello`, out-of-grid panel, …) is answered with `{"msgType":"error","error":"..."}`.

Connect with the page's protocol so it works both with and without SSL:

```ts
const ws = new WebSocket(
  `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`,
);
```

For `wss://`, terminate TLS at a reverse proxy and forward the upgrade headers, e.g. nginx:

```nginx
location /ws {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

Caddy and Traefik forward WebSockets automatically.

## Useful scripts

| Command                | Description                                             |
| ---------------------- | ------------------------------------------------------- |
| `npm run dev`          | Start the dev server (Turbopack, with `/ws`)            |
| `npm run build`        | Create a production build                               |
| `npm run start`        | Start the production server (after `build`)             |
| `npm run db:push`      | Sync the Prisma schema to the database                  |
| `npm run db:generate`  | Create and apply a new migration (`prisma migrate dev`) |
| `npm run db:migrate`   | Apply existing migrations (`prisma migrate deploy`)     |
| `npm run db:studio`    | Open Prisma Studio to browse the database               |
| `npm run check`        | Lint and type-check                                     |
| `npm run format:write` | Format code with Prettier                               |

## Stopping the database

```bash
docker stop web-blinkin-lights-postgres
```

(Use `podman` instead of `docker` if applicable. The container name is `<db-name>-postgres`, based on `DATABASE_URL`.)
