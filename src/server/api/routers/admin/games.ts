import { z } from "zod";

import { runService } from "wbl/server/api/service-error";
import { adminProcedure, createTRPCRouter } from "wbl/server/api/trpc";
import {
  clearPixelsAdmin,
  createGameAdmin,
  deleteGame,
  getGameAdmin,
  listGamesAdmin,
  setPixelAdmin,
  turnOffPixelAdmin,
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

/** `sendToPanel`: while the game runs, also send the change to the controller. */
const sendInput = { sendToPanel: z.boolean().default(false) };

const cellInput = idInput.extend({
  x: z.number().int(),
  y: z.number().int(),
  ...sendInput,
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
      runService(() =>
        setPixelAdmin(input.id, input, input.sendToPanel, ctx.db),
      ),
    ),

  /** Records black for a cell, which turns it off but keeps its history. */
  turnOffPixel: adminProcedure
    .input(cellInput)
    .mutation(({ ctx, input }) =>
      runService(() =>
        turnOffPixelAdmin(
          input.id,
          input.x,
          input.y,
          input.sendToPanel,
          ctx.db,
        ),
      ),
    ),

  clearPixels: adminProcedure
    .input(idInput.extend(sendInput))
    .mutation(({ ctx, input }) =>
      runService(() => clearPixelsAdmin(input.id, input.sendToPanel, ctx.db)),
    ),
});
