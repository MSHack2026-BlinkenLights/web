import { z } from "zod";

import { runService } from "wbl/server/api/service-error";
import { getLiveState } from "wbl/server/bridge";
import { adminProcedure, createTRPCRouter } from "wbl/server/api/trpc";
import {
  createController,
  deleteController,
  getControllerAdmin,
  listControllersAdmin,
  paintControllerAdmin,
  ServiceError,
  updateController,
} from "wbl/server/services";
import { idInput, optionalCoordinate } from "./inputs";

const controllerInput = z.object({
  hardwareId: z.number().int(),
  name: z.string(),
  location: z.string(),
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

  /** Online status and panel colors from the bridge, polled by the controller page. */
  live: adminProcedure.input(idInput).query(({ ctx, input }) =>
    runService(async () => {
      const controller = await ctx.db.controller.findUnique({
        where: { id: input.id },
      });
      if (!controller) {
        throw new ServiceError("NOT_FOUND", "Controller not found");
      }
      return getLiveState(controller);
    }),
  ),

  /**
   * Paints a panel in the live view, also without a running game; with
   * `sendToPanel` the controller shows it too.
   */
  paint: adminProcedure
    .input(
      idInput.extend({
        x: z.number().int(),
        y: z.number().int(),
        colorHex: z.string(),
        sendToPanel: z.boolean().default(false),
      }),
    )
    .mutation(({ ctx, input }) =>
      runService(() =>
        paintControllerAdmin(input.id, input, input.sendToPanel, ctx.db),
      ),
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
