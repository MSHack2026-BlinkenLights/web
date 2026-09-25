import { createTRPCRouter, publicProcedure } from "wbl/server/api/trpc";

export const healthRouter = createTRPCRouter({
  ping: publicProcedure.query(() => ({ ok: true })),
});
