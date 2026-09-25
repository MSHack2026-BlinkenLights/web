-- AlterTable
ALTER TABLE "controller" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "game_data" DROP COLUMN "led";
