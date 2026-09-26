import { bridge } from "wbl/server/bridge/dummy-bridge";
import { db as defaultDb } from "wbl/server/db";
import { type DbClient } from "./common";

export type PadStatus = "free" | "playing" | "offline";

/*
 * Who plays at a pad is an ASSUMPTION: pads don't know who stands on them.
 * A "Mitspielen" entry whose time window contains `now` counts as the people
 * currently at that pad. The UI must label it as such, not as confirmed.
 */

/**
 * Pads with coordinates for the live map: status, running game and the
 * "Mitspielen" entries that are live right now. Only public user fields are selected.
 *
 * Status: `offline` only if the pad connected to the bridge before and dropped.
 * Until real pads connect, a pad that never connected is treated as online,
 * otherwise every pad would show as offline.
 */
export async function listPads(now = new Date(), db: DbClient = defaultDb) {
  const controllers = await db.controller.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      location: true,
      width: true,
      height: true,
      latitude: true,
      longitude: true,
      games: {
        where: { endedAt: null },
        orderBy: { startedAt: "desc" },
        take: 1,
        select: { gameType: { select: { name: true } } },
      },
      playRequests: {
        where: { startsAt: { lte: now }, endsAt: { gt: now } },
        orderBy: [{ startsAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          endsAt: true,
          openSlots: true,
          host: { select: { id: true, name: true } },
          gameType: { select: { name: true } },
          participants: {
            orderBy: { joinedAt: "asc" },
            select: { user: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  return controllers.map(
    ({ latitude, longitude, games, playRequests, ...controller }) => {
      const runningGame = games[0];
      const offline =
        bridge.hasConnected(controller.id) && !bridge.isOnline(controller.id);
      const status: PadStatus = offline
        ? "offline"
        : runningGame
          ? "playing"
          : "free";

      return {
        ...controller,
        // Filtered to non-null above; Prisma doesn't narrow the type.
        coordinates: [latitude!, longitude!] as [number, number],
        status,
        game: runningGame?.gameType.name ?? null,
        playRequests: playRequests.map(({ participants, ...request }) => ({
          ...request,
          participants: participants.map((p) => p.user),
          freeSlots: Math.max(0, request.openSlots - participants.length),
        })),
      };
    },
  );
}
