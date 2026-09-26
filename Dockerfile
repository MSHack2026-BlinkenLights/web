# syntax=docker/dockerfile:1

ARG NODE_VERSION=24

# ---- deps: install all dependencies ----
FROM node:${NODE_VERSION}-trixie-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- builder: build the Next.js standalone output ----
FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 \
    SKIP_ENV_VALIDATION=1
RUN npm run build

# ---- migrate: one-shot job that applies pending Prisma migrations ----
FROM deps AS migrate
CMD ["sh", "prisma/migrate-deploy.sh"]

# ---- runner: minimal distroless image ----
FROM gcr.io/distroless/nodejs${NODE_VERSION}-debian13:nonroot AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    INSECURE_WEBSOCKET=

COPY --from=builder --chown=nonroot:nonroot /app/public ./public
COPY --from=builder --chown=nonroot:nonroot /app/.next/standalone ./
COPY --from=builder --chown=nonroot:nonroot /app/.next/static ./.next/static
COPY --from=builder --chown=nonroot:nonroot /app/generated ./generated
COPY --from=builder --chown=nonroot:nonroot /app/node_modules/ws ./node_modules/ws
COPY --from=builder --chown=nonroot:nonroot /app/server.js ./server.js
COPY --from=builder --chown=nonroot:nonroot /app/src/server/ws ./src/server/ws
COPY --from=builder --chown=nonroot:nonroot /app/src/server/services/uuid.ts ./src/server/services/uuid.ts

# INSECURE_WEBSOCKET=<port> opens an unencrypted ws:// endpoint on that port (e.g. 3001).
EXPOSE 3000 3001
CMD ["server.js"]
