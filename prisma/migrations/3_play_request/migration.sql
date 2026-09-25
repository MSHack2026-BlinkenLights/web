-- CreateTable
CREATE TABLE "play_request" (
    "id" UUID NOT NULL,
    "hostId" TEXT NOT NULL,
    "controllerId" UUID NOT NULL,
    "gameTypeId" UUID NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "openSlots" SMALLINT NOT NULL,
    "note" VARCHAR(200),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "play_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "play_request_participant" (
    "playRequestId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "play_request_participant_pkey" PRIMARY KEY ("playRequestId","userId")
);

-- CreateIndex
CREATE INDEX "play_request_endsAt_idx" ON "play_request"("endsAt");

-- CreateIndex
CREATE INDEX "play_request_hostId_idx" ON "play_request"("hostId");

-- CreateIndex
CREATE INDEX "play_request_controllerId_idx" ON "play_request"("controllerId");

-- CreateIndex
CREATE INDEX "play_request_gameTypeId_idx" ON "play_request"("gameTypeId");

-- CreateIndex
CREATE INDEX "play_request_participant_userId_idx" ON "play_request_participant"("userId");

-- AddForeignKey
ALTER TABLE "play_request" ADD CONSTRAINT "play_request_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_request" ADD CONSTRAINT "play_request_controllerId_fkey" FOREIGN KEY ("controllerId") REFERENCES "controller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_request" ADD CONSTRAINT "play_request_gameTypeId_fkey" FOREIGN KEY ("gameTypeId") REFERENCES "game_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_request_participant" ADD CONSTRAINT "play_request_participant_playRequestId_fkey" FOREIGN KEY ("playRequestId") REFERENCES "play_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_request_participant" ADD CONSTRAINT "play_request_participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

