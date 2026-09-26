import { z } from "zod";

import { runService } from "wbl/server/api/service-error";
import { adminProcedure, createTRPCRouter } from "wbl/server/api/trpc";
import {
  deleteUserAdmin,
  getUserAdmin,
  listUserOptions,
  listUsersAdmin,
  updateUserAdmin,
} from "wbl/server/services";
import { userIdInput } from "./inputs";

export const adminUsersRouter = createTRPCRouter({
  list: adminProcedure.query(({ ctx }) => listUsersAdmin(ctx.db)),

  options: adminProcedure.query(({ ctx }) => listUserOptions(ctx.db)),

  get: adminProcedure
    .input(userIdInput)
    .query(({ ctx, input }) =>
      runService(() => getUserAdmin(input.id, ctx.db)),
    ),

  update: adminProcedure
    .input(userIdInput.extend({ name: z.string(), email: z.string() }))
    .mutation(({ ctx, input }) =>
      runService(() => updateUserAdmin(input.id, input, ctx.db)),
    ),

  delete: adminProcedure
    .input(userIdInput)
    .mutation(({ ctx, input }) =>
      runService(() => deleteUserAdmin(input.id, ctx.db)),
    ),
});
