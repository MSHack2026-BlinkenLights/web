import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "wbl/server/api/trpc";
import {
  getCityStats,
  getLeaderboard,
  getLeaderboardOptions,
  LEADERBOARD_PERIODS,
} from "wbl/server/services";

export const leaderboardRouter = createTRPCRouter({
  /** Games with a leaderboard (for the tabs) and locations (for the filter). */
  options: publicProcedure.query(({ ctx }) => getLeaderboardOptions(ctx.db)),

  /** Ranked entries plus the viewer's own entry, if signed in and listed. */
  list: publicProcedure
    .input(
      z.object({
        gameTypeId: z.string().uuid().optional(),
        period: z.enum(LEADERBOARD_PERIODS),
        controllerId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session?.user;
      const viewer = user ? { id: user.id, name: user.name } : null;
      return {
        viewerId: viewer?.id ?? null,
        ...(await getLeaderboard(input, viewer, new Date(), ctx.db)),
      };
    }),

  /** City-wide activity, counting rounds played without an account too. */
  stats: publicProcedure.query(({ ctx }) => getCityStats(new Date(), ctx.db)),
});
