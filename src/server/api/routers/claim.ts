import { z } from "zod";

import { runService } from "wbl/server/api/service-error";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "wbl/server/api/trpc";
import {
  getClaimTarget,
  getPublicGame,
  listClaimedGames,
  listClaimPads,
  showClaimPattern,
  verifyClaimPattern,
} from "wbl/server/services";

const padInput = z.object({ controllerId: z.string().uuid() });

export const claimRouter = createTRPCRouter({
  /** Pads for the picker. */
  pads: publicProcedure.query(({ ctx }) => listClaimPads(ctx.db)),

  /** The round that can be claimed at a pad, or why none can. */
  target: publicProcedure
    .input(padInput)
    .query(({ ctx, input }) =>
      runService(() => getClaimTarget(input.controllerId, new Date(), ctx.db)),
    ),

  /** Shows the claim pattern on the pad. */
  show: publicProcedure
    .input(padInput)
    .mutation(({ ctx, input }) =>
      runService(() =>
        showClaimPattern(input.controllerId, new Date(), ctx.db),
      ),
    ),

  /** Checks the typed pattern; saves the round to the history when signed in. */
  verify: publicProcedure
    .input(
      padInput.extend({
        gameId: z.string().uuid(),
        pattern: z.array(z.number().int().min(0).max(1)).min(1).max(256),
      }),
    )
    .mutation(({ ctx, input }) =>
      runService(() =>
        verifyClaimPattern(
          input,
          ctx.session?.user.id ?? null,
          new Date(),
          ctx.db,
        ),
      ),
    ),

  /** An ended round for its public page. */
  game: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) =>
      runService(() =>
        getPublicGame(input.id, ctx.session?.user.id ?? null, ctx.db),
      ),
    ),

  /** The signed-in player's claimed rounds. */
  history: protectedProcedure.query(({ ctx }) =>
    listClaimedGames(ctx.session.user.id, ctx.db),
  ),
});
