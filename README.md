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

| Variable             | Description                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string, e.g. `postgresql://postgres:password@localhost:5432/web-blinkin-lights` |
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

### 5. Start the development server

```bash
npm run dev
```

The app is available at [http://localhost:3000](http://localhost:3000).

## Production build

```bash
npm run build
npm run start
```

Or build and start in one step with `npm run preview`. Make sure `BETTER_AUTH_SECRET` is set, since it is required in production.

## Docker deployment

Runs the app (distroless Node image), a one-shot schema sync (`prisma db push`) and PostgreSQL:

```bash
cp .env.example .env   # set BETTER_AUTH_SECRET, POSTGRES_PASSWORD, APP_PORT
docker compose up -d --build
```

The app is available at `http://localhost:$APP_PORT`. If port 3000 is taken on the host, change `APP_PORT`. All Docker variables are listed in `.env.example`.

## WebSocket

`server.js` is a custom Next.js server (used by `dev`, `start` and Docker) that serves a WebSocket at `/ws`. Sending `ping` answers `pong`; any other message is echoed back. Handlers live in `src/server/ws/`.

Connect with the page's protocol so it works both with and without SSL:

```ts
const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
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

| Command                | Description                                         |
| ---------------------- | --------------------------------------------------- |
| `npm run dev`          | Start the dev server (Turbopack, with `/ws`)        |
| `npm run build`        | Create a production build                           |
| `npm run start`        | Start the production server (after `build`)         |
| `npm run db:push`      | Sync the Prisma schema to the database              |
| `npm run db:generate`  | Create and apply a new migration (`prisma migrate dev`) |
| `npm run db:migrate`   | Apply existing migrations (`prisma migrate deploy`) |
| `npm run db:studio`    | Open Prisma Studio to browse the database           |
| `npm run check`        | Lint and type-check                                 |
| `npm run format:write` | Format code with Prettier                           |

## Stopping the database

```bash
docker stop web-blinkin-lights-postgres
```

(Use `podman` instead of `docker` if applicable. The container name is `<db-name>-postgres`, based on `DATABASE_URL`.)
