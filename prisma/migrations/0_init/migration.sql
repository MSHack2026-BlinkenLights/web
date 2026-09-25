-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "game" (
    "id" UUID NOT NULL,
    "controllerId" UUID NOT NULL,
    "gameTypeId" UUID NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL,
    "endedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_type" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "requiredWidth" SMALLINT NOT NULL,
    "requiredHeight" SMALLINT NOT NULL,
    "minPlayers" SMALLINT NOT NULL,
    "maxPlayers" SMALLINT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "game_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_data" (
    "id" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "x" SMALLINT NOT NULL,
    "y" SMALLINT NOT NULL,
    "colorHex" CHAR(7) NOT NULL,
    "led" SMALLINT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "controller" (
    "id" UUID NOT NULL,
    "location" VARCHAR(200) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "width" SMALLINT NOT NULL,
    "height" SMALLINT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "controller_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_controllerId_idx" ON "game"("controllerId");

-- CreateIndex
CREATE INDEX "game_gameTypeId_idx" ON "game"("gameTypeId");

-- CreateIndex
CREATE INDEX "game_data_gameId_idx" ON "game_data"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "game_data_gameId_x_y_key" ON "game_data"("gameId", "x", "y");

-- AddForeignKey
ALTER TABLE "game" ADD CONSTRAINT "game_controllerId_fkey" FOREIGN KEY ("controllerId") REFERENCES "controller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game" ADD CONSTRAINT "game_gameTypeId_fkey" FOREIGN KEY ("gameTypeId") REFERENCES "game_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_data" ADD CONSTRAINT "game_data_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

