import { adminRouter } from "wbl/server/api/routers/admin";
import { claimRouter } from "wbl/server/api/routers/claim";
import { healthRouter } from "wbl/server/api/routers/health";
import { leaderboardRouter } from "wbl/server/api/routers/leaderboard";
import { liveRouter } from "wbl/server/api/routers/live";
import { lookingToPlayRouter } from "wbl/server/api/routers/lookingToPlay";
import { createCallerFactory, createTRPCRouter } from "wbl/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  admin: adminRouter,
  claim: claimRouter,
  health: healthRouter,
  leaderboard: leaderboardRouter,
  live: liveRouter,
  lookingToPlay: lookingToPlayRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.health.ping();
 */
export const createCaller = createCallerFactory(appRouter);
