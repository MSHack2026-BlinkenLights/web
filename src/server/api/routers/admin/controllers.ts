import { z } from "zod";

import { runService } from "wbl/server/api/service-error";
import { adminProcedure, createTRPCRouter } from "wbl/server/api/trpc";
import {
  createController,
  deleteController,
  getControllerAdmin,
  listControllersAdmin,
  updateController,
} from "wbl/server/services";
import { idInput, optionalCoordinate } from "./inputs";

const controllerInput = z.object({
  hardwareId: z.number().int(),
  name: z.string(),
  location: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  latitude: optionalCoordinate,
  longitude: optionalCoordinate,
});

export const adminControllersRouter = createTRPCRouter({
  list: adminProcedure.query(({ ctx }) => listControllersAdmin(ctx.db)),

  get: adminProcedure
    .input(idInput)
    .query(({ ctx, input }) =>
      runService(() => getControllerAdmin(input.id, ctx.db)),
    ),

  create: adminProcedure
    .input(controllerInput)
    .mutation(({ ctx, input }) =>
      runService(() => createController(input, ctx.db)),
    ),

  update: adminProcedure
    .input(idInput.extend({ data: controllerInput.partial() }))
    .mutation(({ ctx, input }) =>
      runService(() => updateController(input.id, input.data, ctx.db)),
    ),

  delete: adminProcedure
    .input(idInput)
    .mutation(({ ctx, input }) =>
      runService(() => deleteController(input.id, ctx.db)),
    ),
});
