import { z } from "zod";

import { runService } from "wbl/server/api/service-error";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "wbl/server/api/trpc";
import {
  cancelPlayRequest,
  createPlayRequest,
  joinPlayRequest,
  leavePlayRequest,
  listPlayRequests,
  MAX_DURATION_MINUTES,
  MIN_DURATION_MINUTES,
} from "wbl/server/services";

const idInput = z.object({ id: z.string().uuid() });

export const lookingToPlayRouter = createTRPCRouter({
  /** Live and upcoming entries, plus who is asking, so the UI can mark "own" entries. */
  list: publicProcedure
    .input(
      z.object({
        controllerId: z.string().uuid().optional(),
        gameTypeId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const entries = await runService(() =>
        listPlayRequests(input, now, ctx.db),
      );
      return {
        now,
        viewerId: ctx.session?.user.id ?? null,
        entries,
      };
    }),

  /** Locations and multiplayer games to choose from in filters and the form. */
  options: publicProcedure.query(async ({ ctx }) => {
    const [controllers, gameTypes] = await Promise.all([
      ctx.db.controller.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          location: true,
          width: true,
          height: true,
        },
      }),
      ctx.db.gameType.findMany({
        where: { maxPlayers: { gte: 2 } },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          requiredWidth: true,
          requiredHeight: true,
          maxPlayers: true,
        },
      }),
    ]);
    return { controllers, gameTypes };
  }),

  create: protectedProcedure
    .input(
      z.object({
        controllerId: z.string().uuid(),
        gameTypeId: z.string().uuid(),
        startsAt: z.date(),
        durationMinutes: z
          .number()
          .int()
          .min(MIN_DURATION_MINUTES)
          .max(MAX_DURATION_MINUTES),
        openSlots: z.number().int().min(1),
        note: z.string().max(200).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      runService(() =>
        createPlayRequest(ctx.session.user.id, input, new Date(), ctx.db),
      ),
    ),

  join: protectedProcedure
    .input(idInput)
    .mutation(({ ctx, input }) =>
      runService(() =>
        joinPlayRequest(input.id, ctx.session.user.id, new Date(), ctx.db),
      ),
    ),

  leave: protectedProcedure
    .input(idInput)
    .mutation(({ ctx, input }) =>
      runService(() => leavePlayRequest(input.id, ctx.session.user.id, ctx.db)),
    ),

  cancel: protectedProcedure
    .input(idInput)
    .mutation(({ ctx, input }) =>
      runService(() =>
        cancelPlayRequest(input.id, ctx.session.user.id, ctx.db),
      ),
    ),
});
