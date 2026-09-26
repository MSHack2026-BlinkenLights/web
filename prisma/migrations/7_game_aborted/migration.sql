-- A game ended by a controller restart (a new "hello") instead of "gameEnds".

-- AlterTable
ALTER TABLE "game" ADD COLUMN "aborted" BOOLEAN NOT NULL DEFAULT false;
