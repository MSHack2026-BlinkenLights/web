-- CreateTable
CREATE TABLE "game_claim" (
    "gameId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "claimedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_claim_pkey" PRIMARY KEY ("gameId","userId")
);

-- CreateIndex
CREATE INDEX "game_claim_userId_claimedAt_idx" ON "game_claim"("userId", "claimedAt");

-- AddForeignKey
ALTER TABLE "game_claim" ADD CONSTRAINT "game_claim_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_claim" ADD CONSTRAINT "game_claim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

