import { createTRPCRouter, publicProcedure } from "wbl/server/api/trpc";
import { listPads } from "wbl/server/services";

export const liveRouter = createTRPCRouter({
  /** Pads for the live map, plus who is asking, so the UI can mark own entries. */
  pads: publicProcedure.query(async ({ ctx }) => {
    const now = new Date();
    return {
      now,
      viewerId: ctx.session?.user.id ?? null,
      pads: await listPads(now, ctx.db),
    };
  }),
});
