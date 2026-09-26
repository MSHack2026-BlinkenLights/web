import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "wbl/server/api/trpc";
import { getWsDebug } from "wbl/server/ws/debug.js";

export const adminWebsocketRouter = createTRPCRouter({
  /** Open connections with the controller they were matched to, if any. */
  connections: adminProcedure.query(async ({ ctx }) => {
    const connections = [...getWsDebug().connections.values()];
    const controllerIds = connections.flatMap((c) =>
      c.controller ? [c.controller.controllerId] : [],
    );
    const controllers = controllerIds.length
      ? await ctx.db.controller.findMany({
          where: { id: { in: controllerIds } },
          select: { id: true, name: true },
        })
      : [];
    const names = new Map(controllers.map((c) => [c.id, c.name]));
    return connections.map((connection) => ({
      ...connection,
      controller: connection.controller && {
        ...connection.controller,
        name: names.get(connection.controller.controllerId) ?? null,
      },
    }));
  }),

  /**
   * Buffered incoming messages newer than `after`, so the debugger can append incrementally;
   * with `controllerId` only those of that controller.
   */
  messages: adminProcedure
    .input(
      z.object({
        after: z.number().int().nonnegative().default(0),
        controllerId: z.string().optional(),
      }),
    )
    .query(({ input }) => {
      const { messages, nextSeq } = getWsDebug();
      return {
        entries: messages.filter(
          (entry) =>
            entry.direction === "in" &&
            entry.seq > input.after &&
            (!input.controllerId || entry.controllerId === input.controllerId),
        ),
        lastSeq: nextSeq - 1,
      };
    }),
});
