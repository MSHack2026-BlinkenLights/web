-- Human-readable identifiers for mapping hardware to rows: an English key per
-- game type and a manually assigned integer per controller.

-- AlterTable
ALTER TABLE "game_type" ADD COLUMN "key" VARCHAR(50);
ALTER TABLE "controller" ADD COLUMN "hardwareId" INTEGER;

-- Backfill: known seed rows get their real keys, anything else a unique fallback.
UPDATE "game_type" SET "key" = CASE "id"
    WHEN '01990000-0000-7000-8000-000000000101' THEN 'free-paint'
    WHEN '01990000-0000-7000-8000-000000000102' THEN 'tic-tac-toe'
    WHEN '01990000-0000-7000-8000-000000000103' THEN 'snake'
    WHEN '01990000-0000-7000-8000-000000000104' THEN 'whack-a-mole'
    ELSE 'game-' || "id"
END;

UPDATE "controller" AS c SET "hardwareId" = numbered.n
FROM (
    SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS n
    FROM "controller"
) AS numbered
WHERE c."id" = numbered."id";

ALTER TABLE "game_type" ALTER COLUMN "key" SET NOT NULL;
ALTER TABLE "controller" ALTER COLUMN "hardwareId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "game_type_key_key" ON "game_type"("key");

-- CreateIndex
CREATE UNIQUE INDEX "controller_hardwareId_key" ON "controller"("hardwareId");
