import { adminProcedure, createTRPCRouter } from "wbl/server/api/trpc";
import { getAdminOptions, getAdminOverview } from "wbl/server/services";
import { adminControllersRouter } from "./controllers";
import { adminGamesRouter } from "./games";
import { adminGameTypesRouter } from "./gameTypes";
import { adminPlayRequestsRouter } from "./playRequests";
import { adminUsersRouter } from "./users";
import { adminWebsocketRouter } from "./websocket";

/** Temporary admin area; see {@link adminProcedure} for the missing role check. */
export const adminRouter = createTRPCRouter({
  overview: adminProcedure.query(({ ctx }) => getAdminOverview(ctx.db)),
  /** Controllers and game types for selects. */
  options: adminProcedure.query(({ ctx }) => getAdminOptions(ctx.db)),
  gameTypes: adminGameTypesRouter,
  controllers: adminControllersRouter,
  games: adminGamesRouter,
  playRequests: adminPlayRequestsRouter,
  users: adminUsersRouter,
  websocket: adminWebsocketRouter,
});
