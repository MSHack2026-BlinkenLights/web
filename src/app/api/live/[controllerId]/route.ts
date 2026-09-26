import { z } from "zod";

import { db } from "wbl/server/db";
import { eventStream } from "wbl/server/sse";
import {
  getLiveSnapshot,
  subscribeLive,
  type LiveEvent,
} from "wbl/server/ws/live.js";

export const dynamic = "force-dynamic";

/**
 * Streams the panels of a controller as Server-Sent Events: first the whole
 * grid, then every change as it arrives over the controller's WebSocket. Each
 * event's data is a `LiveEvent` as JSON.
 *
 * @param request - The request; closing it ends the stream.
 * @param context - Route params with the controller's database ID.
 * @returns The event stream, or 404 for an unknown controller.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ controllerId: string }> },
) {
  const { controllerId } = await context.params;
  const controller = z.string().uuid().safeParse(controllerId).success
    ? await db.controller.findUnique({
        where: { id: controllerId },
        select: { width: true, height: true },
      })
    : null;
  if (!controller) return new Response("Not found", { status: 404 });

  return eventStream(request, (send) => {
    send(
      getLiveSnapshot(controllerId) ??
        ({
          type: "state",
          controllerId,
          online: false,
          width: controller.width,
          height: controller.height,
          pixels: [],
        } satisfies LiveEvent),
    );
    return subscribeLive((event) => {
      if (event.controllerId === controllerId) send(event);
    });
  });
}
