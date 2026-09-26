import { z } from "zod";

import { runService } from "wbl/server/api/service-error";
import { adminProcedure, createTRPCRouter } from "wbl/server/api/trpc";
import {
  createGameType,
  deleteGameType,
  getGameTypeAdmin,
  listGameTypesAdmin,
  updateGameType,
} from "wbl/server/services";
import { idInput } from "./inputs";

const gameTypeInput = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  requiredWidth: z.number().int(),
  requiredHeight: z.number().int(),
  minPlayers: z.number().int(),
  maxPlayers: z.number().int(),
});

export const adminGameTypesRouter = createTRPCRouter({
  list: adminProcedure.query(({ ctx }) => listGameTypesAdmin(ctx.db)),

  get: adminProcedure
    .input(idInput)
    .query(({ ctx, input }) =>
      runService(() => getGameTypeAdmin(input.id, ctx.db)),
    ),

  create: adminProcedure
    .input(gameTypeInput)
    .mutation(({ ctx, input }) =>
      runService(() => createGameType(input, ctx.db)),
    ),

  update: adminProcedure
    .input(idInput.extend({ data: gameTypeInput.partial() }))
    .mutation(({ ctx, input }) =>
      runService(() => updateGameType(input.id, input.data, ctx.db)),
    ),

  delete: adminProcedure
    .input(idInput)
    .mutation(({ ctx, input }) =>
      runService(() => deleteGameType(input.id, ctx.db)),
    ),
});
