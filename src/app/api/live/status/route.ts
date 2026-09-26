import { eventStream } from "wbl/server/sse";
import { subscribeLive } from "wbl/server/ws/live.js";

export const dynamic = "force-dynamic";

/**
 * Streams a Server-Sent Event `{"controllerId": "..."}` whenever a controller
 * connects or disconnects, a game on it starts or ends, or the admin area
 * changes its games or the controller itself, so the live map can reload the
 * pads. Panel colors are left out.
 *
 * @param request - The request; closing it ends the stream.
 * @returns The event stream.
 */
export function GET(request: Request) {
  return eventStream(request, (send) =>
    subscribeLive((event) => {
      if (event.type !== "panel") send({ controllerId: event.controllerId });
    }),
  );
}
