import { z } from "zod";

import { runService } from "wbl/server/api/service-error";
import { adminProcedure, createTRPCRouter } from "wbl/server/api/trpc";
import {
  clearPixelsAdmin,
  createGameAdmin,
  deleteGame,
  deletePixelAdmin,
  getGameAdmin,
  listGamesAdmin,
  setPixelAdmin,
  updateGameAdmin,
} from "wbl/server/services";
import { idInput, optionalCoordinate } from "./inputs";

const gameInput = z.object({
  controllerId: z.string().uuid(),
  gameTypeId: z.string().uuid(),
  startedAt: z.date(),
  endedAt: z.date().nullable().optional(),
  latitude: optionalCoordinate,
  longitude: optionalCoordinate,
});

const cellInput = idInput.extend({
  x: z.number().int(),
  y: z.number().int(),
});

export const adminGamesRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z.object({
        controllerId: z.string().uuid().optional(),
        gameTypeId: z.string().uuid().optional(),
        status: z.enum(["running", "ended"]).optional(),
        cursor: z.string().uuid().nullish(),
      }),
    )
    .query(({ ctx, input }) =>
      runService(() =>
        listGamesAdmin({ ...input, cursor: input.cursor ?? undefined }, ctx.db),
      ),
    ),

  get: adminProcedure
    .input(idInput)
    .query(({ ctx, input }) =>
      runService(() => getGameAdmin(input.id, ctx.db)),
    ),

  create: adminProcedure
    .input(gameInput)
    .mutation(({ ctx, input }) =>
      runService(() => createGameAdmin(input, ctx.db)),
    ),

  update: adminProcedure
    .input(idInput.extend({ data: gameInput }))
    .mutation(({ ctx, input }) =>
      runService(() => updateGameAdmin(input.id, input.data, ctx.db)),
    ),

  delete: adminProcedure
    .input(idInput)
    .mutation(({ ctx, input }) =>
      runService(() => deleteGame(input.id, ctx.db)),
    ),

  setPixel: adminProcedure
    .input(cellInput.extend({ colorHex: z.string() }))
    .mutation(({ ctx, input }) =>
      runService(() => setPixelAdmin(input.id, input, ctx.db)),
    ),

  deletePixel: adminProcedure
    .input(cellInput)
    .mutation(({ ctx, input }) =>
      runService(() => deletePixelAdmin(input.id, input.x, input.y, ctx.db)),
    ),

  clearPixels: adminProcedure
    .input(idInput)
    .mutation(({ ctx, input }) =>
      runService(() => clearPixelsAdmin(input.id, ctx.db)),
    ),
});
