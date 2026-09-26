import { z } from "zod";

import { runService } from "wbl/server/api/service-error";
import { adminProcedure, createTRPCRouter } from "wbl/server/api/trpc";
import {
  addParticipantAdmin,
  deletePlayRequest,
  getPlayRequestAdmin,
  listPlayRequestsAdmin,
  removeParticipantAdmin,
  updatePlayRequestAdmin,
} from "wbl/server/services";
import { idInput } from "./inputs";

const participantInput = idInput.extend({ userId: z.string().min(1) });

export const adminPlayRequestsRouter = createTRPCRouter({
  list: adminProcedure.query(({ ctx }) => listPlayRequestsAdmin(ctx.db)),

  get: adminProcedure
    .input(idInput)
    .query(({ ctx, input }) =>
      runService(() => getPlayRequestAdmin(input.id, ctx.db)),
    ),

  update: adminProcedure
    .input(
      idInput.extend({
        data: z.object({
          controllerId: z.string().uuid(),
          gameTypeId: z.string().uuid(),
          startsAt: z.date(),
          endsAt: z.date(),
          openSlots: z.number().int(),
          note: z.string().nullable().optional(),
        }),
      }),
    )
    .mutation(({ ctx, input }) =>
      runService(() => updatePlayRequestAdmin(input.id, input.data, ctx.db)),
    ),

  delete: adminProcedure
    .input(idInput)
    .mutation(({ ctx, input }) =>
      runService(() => deletePlayRequest(input.id, ctx.db)),
    ),

  addParticipant: adminProcedure
    .input(participantInput)
    .mutation(({ ctx, input }) =>
      runService(() => addParticipantAdmin(input.id, input.userId, ctx.db)),
    ),

  removeParticipant: adminProcedure
    .input(participantInput)
    .mutation(({ ctx, input }) =>
      runService(() => removeParticipantAdmin(input.id, input.userId, ctx.db)),
    ),
});
