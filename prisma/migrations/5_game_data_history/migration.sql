-- Game data becomes an append-only history: every color change of a cell is a
-- new row, ordered by its UUIDv7 id. "#000000" means the cell is off.

-- DropIndex
DROP INDEX "game_data_gameId_x_y_key";

-- DropIndex
DROP INDEX "game_data_gameId_idx";

-- Backfill: give rows without a UUIDv7 id one derived from createdAt, so
-- sorting by id follows the order the cells were set in.
UPDATE "game_data" AS d SET "id" = (
    lpad(to_hex((extract(epoch FROM numbered."createdAt") * 1000)::bigint), 12, '0')
    || '7' || lpad(to_hex(numbered.n % 4096), 3, '0')
    || to_hex(8 + floor(random() * 4)::integer)
    || substr(md5(random()::text || numbered."id"::text), 1, 15)
)::uuid
FROM (
    SELECT "id", "createdAt",
           ROW_NUMBER() OVER (PARTITION BY "createdAt" ORDER BY "y", "x") AS n
    FROM "game_data"
    WHERE substr("id"::text, 15, 1) <> '7'
) AS numbered
WHERE d."id" = numbered."id";

-- CreateIndex
CREATE INDEX "game_data_gameId_id_idx" ON "game_data"("gameId", "id");
