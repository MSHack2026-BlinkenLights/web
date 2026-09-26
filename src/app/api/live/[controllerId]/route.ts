import { z } from "zod";

import { db } from "wbl/server/db";
import {
  getLiveSnapshot,
  subscribeLive,
  type LiveEvent,
} from "wbl/server/ws/live.js";

export const dynamic = "force-dynamic";

const KEEPALIVE_MS = 25_000;

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

  const encoder = new TextEncoder();
  let cleanup: () => void = () => undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(streamController) {
      const send = (text: string) => {
        try {
          streamController.enqueue(encoder.encode(text));
        } catch {
          cleanup();
        }
      };
      const sendEvent = (event: LiveEvent) =>
        send(`data: ${JSON.stringify(event)}\n\n`);

      sendEvent(
        getLiveSnapshot(controllerId) ?? {
          type: "state",
          controllerId,
          online: false,
          width: controller.width,
          height: controller.height,
          pixels: [],
        },
      );
      const unsubscribe = subscribeLive((event) => {
        if (event.controllerId === controllerId) sendEvent(event);
      });
      // Comments keep proxies from closing an idle stream.
      const keepalive = setInterval(
        () => send(": keepalive\n\n"),
        KEEPALIVE_MS,
      );

      cleanup = () => {
        clearInterval(keepalive);
        unsubscribe();
        request.signal.removeEventListener("abort", onAbort);
      };
      const onAbort = () => {
        cleanup();
        try {
          streamController.close();
        } catch {
          // Already closed.
        }
      };
      request.signal.addEventListener("abort", onAbort);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Tells nginx not to buffer the stream.
      "X-Accel-Buffering": "no",
    },
  });
}
